import { z } from 'zod';
import { zip, type AsyncZippable } from 'fflate';
import type { FamilyArchive } from '../domain/model';
import { DomainError, validateArchive } from '../domain/validation';
import { DATA_SCHEMA_VERSION, collectionKeys } from '../storage/database';
import type { MediaFileInput } from '../storage/mediaFiles';
import { identifyFile, thumbnailFor } from './mediaImport';
import { MAX_ARCHIVE_BYTES, MAX_ARCHIVE_FILES, MAX_JSON_BYTES, readBoundedZip } from './zipArchive';

const header = { format: z.literal('BelaPcela'), formatVersion: z.literal(1), dataSchemaVersion: z.number().int().min(1).max(DATA_SCHEMA_VERSION), exportedAt: z.iso.datetime() };
const fileSchema = z.strictObject({ mediaId: z.string().min(1), path: z.string(), mimeType: z.string(), size: z.number().int().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/) });
const manifestSchema = z.strictObject({ ...header, kind: z.literal('full'), archive: z.strictObject({ id: z.string().min(1).max(200), name: z.string().max(200) }), files: z.array(fileSchema).max(MAX_ARCHIVE_FILES - 2) });
const dataSchema = z.strictObject({ dataSchemaVersion: header.dataSchemaVersion, archive: z.unknown() });
const jsonSchema = z.strictObject({ ...header, kind: z.literal('data-only'), archive: z.unknown() });
export interface ImportPlan { archive: FamilyArchive; files: MediaFileInput[]; kind: 'full' | 'data-only'; warnings: string[]; migratedFrom?: number }
export interface TransferSnapshot { archive: FamilyArchive; files: MediaFileInput[] }
const jsonBytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value, null, 2));
const parseJSON = (bytes: Uint8Array) => {
  if (bytes.length > MAX_JSON_BYTES) throw new DomainError('JSON документ прелази 10 MB.');
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown; } catch { throw new DomainError('JSON документ није исправан UTF-8 запис.'); }
};
const digest = async (bytes: Uint8Array<ArrayBuffer>) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');

function migrate(input: unknown, version: number): FamilyArchive {
  const copy = structuredClone(input) as Record<string, unknown>;
  if (!copy || typeof copy !== 'object' || !Array.isArray(copy.events)) throw new DomainError('Породични подаци нису исправни.');
  const total = collectionKeys.reduce((sum, key) => sum + (Array.isArray(copy[key]) ? copy[key].length : 0), 0);
  if (total > 100_000) throw new DomainError('Збирка прелази ограничење од 100.000 записа.');
  if (version < 3) copy.events = copy.events.map((input: unknown) => {
    if (!input || typeof input !== 'object') return input;
    const event = { ...input } as Record<string, unknown>;
    if (event.personId !== undefined && event.participants === undefined) { event.participants = [{ personId: event.personId, role: 'subject' }]; delete event.personId; }
    return event;
  });
  return validateArchive(copy);
}
function portable(archive: FamilyArchive): FamilyArchive {
  if (collectionKeys.reduce((sum, key) => sum + (archive[key]?.length || 0), 0) > 100_000) throw new DomainError('Збирка прелази ограничење од 100.000 записа.');
  return { ...archive, media: archive.media.map(({ src: _src, ...item }) => item) };
}
const makeHeader = () => ({ format: 'BelaPcela', formatVersion: 1, dataSchemaVersion: DATA_SCHEMA_VERSION, exportedAt: new Date().toISOString() });
export function exportDataJSON(archive: FamilyArchive): Blob {
  const bytes = jsonBytes({ ...makeHeader(), kind: 'data-only', archive: portable(validateArchive(archive)) });
  if (bytes.length > MAX_JSON_BYTES) throw new DomainError('Породични подаци прелазе ограничење од 10 MB.');
  return new Blob([bytes], { type: 'application/json' });
}
const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf', 'text/plain': 'txt', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'video/mp4': 'mp4', 'video/webm': 'webm' };
export async function exportFullZIP(snapshot: TransferSnapshot): Promise<Blob> {
  const archive = portable(validateArchive(snapshot.archive));
  if (archive.media.length > MAX_ARCHIVE_FILES - 2) throw new DomainError('ZIP подржава до 2.000 оригиналних датотека.');
  const fileMap = new Map(snapshot.files.map(file => [file.id, file.original])); const files: z.infer<typeof fileSchema>[] = [];
  const payload: AsyncZippable = Object.create(null); let total = 0;
  for (const [index, item] of archive.media.entries()) {
    const original = fileMap.get(item.id);
    if (!original) throw new DomainError(`Оригинал недостаје: ${item.originalFilename || item.title || item.id}. Потпуна ZIP копија није направљена. Можете извести податке као JSON.`);
    const mimeType = await identifyFile(new File([original], item.originalFilename || `file.${extensions[original.type] || 'bin'}`, { type: original.type }));
    if (item.mimeType && item.mimeType !== mimeType || item.size !== undefined && item.size !== original.size) throw new DomainError('Оригинал и опис датотеке се не подударају.');
    const folder = mimeType.startsWith('image/') ? 'photos' : mimeType.startsWith('audio/') ? 'audio' : mimeType.startsWith('video/') ? 'videos' : 'documents';
    const path = `data/${folder}/media-${String(index + 1).padStart(6, '0')}.${extensions[mimeType]}`;
    const bytes = new Uint8Array(await original.arrayBuffer()); total += bytes.length;
    if (total > MAX_ARCHIVE_BYTES - 2 * MAX_JSON_BYTES) throw new DomainError('Оригинали прелазе ограничење ZIP копије од 250 MB.');
    payload[path] = [bytes, { level: 0 }]; files.push({ mediaId: item.id, path, mimeType, size: original.size, sha256: await digest(bytes) });
  }
  const family = jsonBytes({ dataSchemaVersion: DATA_SCHEMA_VERSION, archive });
  const manifest = jsonBytes({ ...makeHeader(), kind: 'full', archive: { id: archive.id, name: archive.name }, files });
  if (family.length > MAX_JSON_BYTES || manifest.length > MAX_JSON_BYTES) throw new DomainError('JSON документ прелази 10 MB.');
  payload['family.json'] = family; payload['manifest.json'] = manifest;
  const result = await new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => zip(payload, { level: 6 }, (error, bytes) => error ? reject(error) : resolve(bytes)));
  if (result.length > MAX_ARCHIVE_BYTES) throw new DomainError('ZIP копија прелази 250 MB.');
  return new Blob([result], { type: 'application/zip' });
}

export async function preflightImport(file: File): Promise<ImportPlan> {
  if (!file.size || file.size > MAX_ARCHIVE_BYTES) throw new DomainError('Изаберите ZIP до 250 MB или JSON до 10 MB.');
  const prefix = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (prefix[0] !== 0x50 || prefix[1] !== 0x4b) {
    if (file.size > MAX_JSON_BYTES) throw new DomainError('JSON документ прелази 10 MB.');
    const parsed = jsonSchema.safeParse(parseJSON(new Uint8Array(await file.arrayBuffer())));
    if (!parsed.success) throw new DomainError('Непознат формат или новија верзија JSON збирке. Подаци нису промењени.');
    const archive = migrate(parsed.data.archive, parsed.data.dataSchemaVersion);
    if (archive.media.some(item => item.src)) throw new DomainError('JSON само са подацима не сме садржати уграђене или спољне датотеке.');
    return { archive, files: [], kind: 'data-only', warnings: archive.media.length ? [`${archive.media.length} описа датотека нема оригинале у JSON копији. Портрети и галерије ће приказати да оригинал недостаје.`] : [], migratedFrom: parsed.data.dataSchemaVersion < DATA_SCHEMA_VERSION ? parsed.data.dataSchemaVersion : undefined };
  }
  const entries = await readBoundedZip(new Uint8Array(await file.arrayBuffer()));
  if (!entries.has('manifest.json') || !entries.has('family.json')) throw new DomainError('ZIP мора садржати manifest.json и family.json.');
  const manifest = manifestSchema.safeParse(parseJSON(entries.get('manifest.json')!)); const family = dataSchema.safeParse(parseJSON(entries.get('family.json')!));
  if (!manifest.success || !family.success || manifest.data.dataSchemaVersion !== family.data.dataSchemaVersion) throw new DomainError('Манифест или верзија збирке нису подржани.');
  const archive = migrate(family.data.archive, family.data.dataSchemaVersion);
  if (archive.id !== manifest.data.archive.id || archive.name !== manifest.data.archive.name) throw new DomainError('Манифест и породични подаци описују различите збирке.');
  if (archive.media.some(item => item.src)) throw new DomainError('ZIP користи само релативне путање оригинала из манифеста.');
  const files: MediaFileInput[] = []; const used = new Set(['manifest.json', 'family.json']); const ids = new Set<string>();
  if (manifest.data.files.length !== archive.media.length) throw new DomainError('Списак оригинала се не подудара са породичним подацима.');
  for (const entry of manifest.data.files) {
    const bytes = entries.get(entry.path); const item = archive.media.find(item => item.id === entry.mediaId);
    if (!bytes || !item || ids.has(entry.mediaId) || used.has(entry.path) || entry.size !== bytes.length || item.size !== undefined && item.size !== bytes.length || item.mimeType && item.mimeType !== entry.mimeType || await digest(bytes) !== entry.sha256) throw new DomainError('Оригинал недостаје, промењен је или се не подудара са описом.');
    const original = new File([bytes], item.originalFilename || entry.path.split('/').pop()!, { type: entry.mimeType });
    if (await identifyFile(original) !== entry.mimeType) throw new DomainError('Врста оригинала није исправна.');
    const thumbnail = entry.mimeType.startsWith('image/') ? await thumbnailFor(original) : undefined;
    used.add(entry.path); ids.add(entry.mediaId); files.push({ id: entry.mediaId, original: original.slice(0, original.size, entry.mimeType), thumbnail });
  }
  if (entries.size !== used.size) throw new DomainError('ZIP садржи датотеке које нису наведене у манифесту.');
  return { archive, files, kind: 'full', warnings: [], migratedFrom: family.data.dataSchemaVersion < DATA_SCHEMA_VERSION ? family.data.dataSchemaVersion : undefined };
}

export function downloadArchive(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
