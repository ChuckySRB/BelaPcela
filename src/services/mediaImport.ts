import type { Media, MediaLink } from '../domain/model';
import { DomainError } from '../domain/validation';
import type { MediaFileInput } from '../storage/mediaFiles';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_BATCH_BYTES = 100 * 1024 * 1024;
export const MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,audio/mpeg,audio/ogg,audio/wav,video/mp4,video/webm';
export interface ImportedMedia extends Media { originalFilename: string; mimeType: string; size: number }
export async function identifyFile(file: File): Promise<string> {
  if (!file.size || file.size > MAX_FILE_BYTES) throw new DomainError('Датотека мора имати садржај и бити мања од 25 MB.');
  const bytes = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  let mime: string | undefined;
  if (bytes[0] === 0x89 && text.slice(1, 4) === 'PNG' && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10) mime = 'image/png';
  else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) mime = 'image/jpeg';
  else if (text.startsWith('GIF87a') || text.startsWith('GIF89a')) mime = 'image/gif';
  else if (text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP') mime = 'image/webp';
  else if (text.startsWith('%PDF-')) mime = 'application/pdf';
  else if (text.startsWith('ID3') || bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) mime = 'audio/mpeg';
  else if (text.startsWith('OggS')) mime = 'audio/ogg';
  else if (text.startsWith('RIFF') && text.slice(8, 12) === 'WAVE') mime = 'audio/wav';
  else if (text.slice(4, 8) === 'ftyp') mime = 'video/mp4';
  else if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3 && text.includes('webm')) mime = 'video/webm';
  else if ((file.type === 'text/plain' || !file.type) && /\.txt$/i.test(file.name) && !bytes.includes(0) && !/<\s*(?:!doctype\s+html|html|script|svg|iframe|object|embed)\b/i.test(text)) mime = 'text/plain';
  if (!mime) throw new DomainError('Подржани су JPEG, PNG, WebP, GIF, PDF, TXT, MP3, OGG, WAV, MP4 и WebM. Датотека није препозната.');
  const declared = file.type.toLowerCase();
  const aliases: Record<string, string> = { 'image/jpg': 'image/jpeg', 'audio/x-wav': 'audio/wav', 'application/ogg': 'audio/ogg' };
  if (declared && declared !== 'application/octet-stream' && (aliases[declared] || declared) !== mime) throw new DomainError('Пријављена врста датотеке се не подудара са њеним садржајем.');
  return mime;
}
async function thumbnailFor(blob: Blob): Promise<Blob> {
  let image: ImageBitmap;
  try { image = await createImageBitmap(blob); } catch { throw new DomainError('Фотографија није могла да се прочита. Оригинал није сачуван без провере.'); }
  try {
    if (!image.width || !image.height || image.width * image.height > 40_000_000) throw new DomainError('Фотографија је превелика. Подржано је до 40 милиона пиксела.');
    const scale = Math.min(1, 320 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d'); if (!context) throw new DomainError('Прегледач не може да направи минијатуру.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new DomainError('Минијатура није направљена.')), 'image/webp', .82));
  } finally { image.close(); }
}
export async function prepareMediaFiles(files: File[], links: MediaLink[]): Promise<{ items: ImportedMedia[]; files: MediaFileInput[] }> {
  if (!files.length || files.length > 20 || files.reduce((sum, file) => sum + file.size, 0) > MAX_BATCH_BYTES) throw new DomainError('Изаберите до 20 датотека, укупно до 100 MB.');
  const items: ImportedMedia[] = []; const prepared: MediaFileInput[] = [];
  // Sequential decoding limits peak memory; no file is persisted until the entire batch is ready.
  for (const file of files) {
    const mimeType = await identifyFile(file); const id = crypto.randomUUID();
    const original = file.slice(0, file.size, mimeType);
    const thumbnail = mimeType.startsWith('image/') ? await thumbnailFor(original) : undefined;
    items.push({ id, alt: file.name, title: Array.from(file.name).slice(0, 200).join(''), originalFilename: file.name, mimeType, size: file.size, tags: [], links: structuredClone(links) });
    prepared.push({ id, original, thumbnail });
  }
  return { items, files: prepared };
}
