/// <reference types="node" />
import 'fake-indexeddb/auto';
import { Blob as NativeBlob, File as NativeFile } from 'node:buffer';
import type Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { demoArchive } from '../domain/fixtures';
import { exportDataJSON, exportFullZIP, preflightImport, type ImportPlan } from '../services/archiveTransfer';
import { readBoundedZip, MAX_ARCHIVE_BYTES } from '../services/zipArchive';
import { createFamilyDatabase } from '../storage/database';
import { ArchiveRepository } from '../storage/ArchiveRepository';
import { CommandDispatcher } from '../services/CommandDispatcher';

const databases: Dexie[] = [];
beforeEach(() => { vi.stubGlobal('Blob', NativeBlob); vi.stubGlobal('File', NativeFile); });
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); for (const db of databases.splice(0)) { db.close(); await db.delete(); } });
const input = (blob: Blob) => new NativeFile([blob as unknown as NativeBlob], 'backup.zip') as File;
const sample = () => {
  const original = new NativeBlob(['Писмо: оригинал\n'], { type: 'text/plain' }) as Blob;
  return { archive: { ...structuredClone(demoArchive), media: [{ id: 'letter', alt: 'Писмо', title: 'Успомена', originalFilename: 'ћирилица.txt', mimeType: 'text/plain', size: original.size, tags: ['породица'], links: [{ entityType: 'person' as const, entityId: 'nikola' }, { entityType: 'event' as const, entityId: 'b-n' }] }] }, files: [{ id: 'letter', original }] };
};

describe('portable archive formats and preflight', () => {
  it('round-trips normalized data, shared links, Unicode filenames and exact original bytes', async () => {
    const snapshot = sample(); const blob = await exportFullZIP(snapshot); const plan = await preflightImport(input(blob));
    expect(plan.kind).toBe('full'); expect(plan.archive).toEqual(snapshot.archive); expect(plan.files).toHaveLength(1);
    expect(await plan.files[0].original.arrayBuffer()).toEqual(await snapshot.files[0].original.arrayBuffer());
    const entries = await readBoundedZip(new Uint8Array(await blob.arrayBuffer()));
    expect([...entries.keys()]).toEqual(expect.arrayContaining(['manifest.json', 'family.json', 'data/documents/media-000001.txt']));
    expect(new TextDecoder().decode(entries.get('manifest.json'))).not.toContain('blob:');
    expect(JSON.parse(new TextDecoder().decode(entries.get('manifest.json'))).archive).toEqual({ id: snapshot.archive.id, name: snapshot.archive.name });
  });
  it('exports explicitly data-only JSON with retained media descriptions and an import warning', async () => {
    const snapshot = sample(); const plan = await preflightImport(input(exportDataJSON(snapshot.archive)));
    expect(plan.kind).toBe('data-only'); expect(plan.files).toEqual([]); expect(plan.archive).toEqual(snapshot.archive); expect(plan.warnings).toHaveLength(1);
    await expect(exportFullZIP({ archive: plan.archive, files: [] })).rejects.toThrow('недостаје');
  });
  it('migrates known legacy single-person events and rejects future versions or broken references', async () => {
    const archive = { ...structuredClone(demoArchive), events: demoArchive.events.map(({ participants, ...event }) => ({ ...event, personId: participants[0].personId })) };
    const envelope = { format: 'BelaPcela', formatVersion: 1, dataSchemaVersion: 1, exportedAt: new Date().toISOString(), kind: 'data-only', archive };
    const plan = await preflightImport(input(new NativeBlob([JSON.stringify(envelope)]) as Blob));
    expect(plan.migratedFrom).toBe(1); expect(plan.archive.events).toEqual(demoArchive.events);
    await expect(preflightImport(input(new NativeBlob([JSON.stringify({ ...envelope, dataSchemaVersion: 99 })]) as Blob))).rejects.toThrow('верзија');
    envelope.archive.events[0].personId = 'missing';
    await expect(preflightImport(input(new NativeBlob([JSON.stringify(envelope)]) as Blob))).rejects.toThrow('не постоји');
  });
  it('rejects traversal, absolute paths, backslashes, excessive declared output and damaged CRCs', async () => {
    for (const name of ['../family.json', '/family.json', 'data/photos/../bad.png', 'data\\photos\\bad.png', 'C:/family.json', 'data/photos/%2e%2e']) {
      await expect(readBoundedZip(zipSync({ [name]: strToU8('x') }))).rejects.toThrow('ZIP');
    }
    const forged = zipSync({ 'family.json': strToU8('x') });
    const view = new DataView(forged.buffer); const central = view.getUint32(forged.length - 6, true); view.setUint32(central + 24, MAX_ARCHIVE_BYTES + 1, true);
    await expect(readBoundedZip(forged)).rejects.toThrow('ZIP');
    const corrupt = zipSync({ 'family.json': strToU8('x') }, { level: 0 }); corrupt[41] ^= 1;
    await expect(readBoundedZip(corrupt)).rejects.toThrow('ZIP');
  });
  it('rejects missing, unlisted, changed and mislabeled originals before any storage mutation', async () => {
    const snapshot = sample(); const entries = await readBoundedZip(new Uint8Array(await (await exportFullZIP(snapshot)).arrayBuffer()));
    const payload = Object.fromEntries(entries); const path = 'data/documents/media-000001.txt';
    const changed = { ...payload, [path]: strToU8('changed') };
    await expect(preflightImport(input(new NativeBlob([zipSync(changed)]) as Blob))).rejects.toThrow('не подудара');
    const missing = { ...payload }; delete missing[path];
    await expect(preflightImport(input(new NativeBlob([zipSync(missing)]) as Blob))).rejects.toThrow('недостаје');
    await expect(preflightImport(input(new NativeBlob([zipSync({ ...payload, 'data/documents/unlisted.txt': strToU8('x') })]) as Blob))).rejects.toThrow('нису наведене');
  });
});

describe('transactional import and collection switching', () => {
  async function store() { const db = createFamilyDatabase(`transfer-${crypto.randomUUID()}`); databases.push(db); const repository = new ArchiveRepository(db); const initial = await repository.initialize(demoArchive); return { db, repository, initial, dispatcher: new CommandDispatcher(repository, initial) }; }
  it('opens a separate collection, retains the original, restores files, and blocks stale-window commands', async () => {
    const { repository, initial, dispatcher } = await store(); const stale = new CommandDispatcher(repository, initial);
    const snapshot = sample(); const plan: ImportPlan = { ...snapshot, kind: 'full', warnings: [] };
    const imported = await dispatcher.importArchive(plan, 'new');
    expect(imported.archive.id).not.toBe(initial.archive.id); expect(await repository.listArchives()).toHaveLength(2);
    expect(await (await repository.getMediaBlob(imported.archive.id, 'letter', 'original'))?.text()).toBe('Писмо: оригинал\n');
    await expect(stale.execute({ type: 'createPerson', person: {} })).rejects.toThrow('другом прозору');
    expect((await repository.load()).archive.id).toBe(imported.archive.id);
    await dispatcher.selectArchive(initial.archive.id); expect((await repository.load()).archive).toEqual(initial.archive);
    expect(dispatcher.canUndo).toBe(false);
  });
  it('rolls back replacement, originals and active collection if any write fails', async () => {
    const { db, repository, dispatcher } = await store(); const before = await repository.load();
    const plan: ImportPlan = { ...sample(), kind: 'full', warnings: [] };
    const fault = vi.spyOn(db.table('mediaFiles'), 'bulkAdd').mockRejectedValueOnce(new DOMException('Disk full', 'QuotaExceededError'));
    await expect(dispatcher.importArchive(plan, 'replace')).rejects.toThrow();
    expect(await repository.load()).toEqual(before); expect(await db.table('mediaFiles').count()).toBe(0);
    fault.mockRestore(); const imported = await dispatcher.importArchive(plan, 'replace');
    expect(imported.revision).toBe(before.revision + 1); expect(imported.archive.id).toBe(before.archive.id); expect(dispatcher.canUndo).toBe(false);
    expect((await repository.transferSnapshot()).files).toHaveLength(1);
  });
});
