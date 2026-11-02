import 'fake-indexeddb/auto';
import type Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoArchive } from '../domain/fixtures';
import type { FamilyArchive, RelationshipRef } from '../domain/model';
import { getRelationship, relationshipVersion } from '../domain/relationships';
import { applyCommand, type ArchiveCommand } from '../services/commands';
import { ArchiveRepository, ConflictError } from '../storage/ArchiveRepository';
import { CommandDispatcher } from '../services/CommandDispatcher';
import { createFamilyDatabase } from '../storage/database';

type Update = Extract<ArchiveCommand, { type: 'updateRelationship' }>['relationship'];
const version = (archive: FamilyArchive, ref: RelationshipRef) => relationshipVersion(getRelationship(archive, ref)!);
const edit = (archive: FamilyArchive, relationship: Update): ArchiveCommand => ({ type: 'updateRelationship', relationship, expectedVersion: version(archive, relationship) });
const remove = (archive: FamilyArchive, relationship: RelationshipRef): ArchiveCommand => ({ type: 'deleteRelationship', relationship, expectedVersion: version(archive, relationship) });
const databases: Dexie[] = [];
afterEach(async () => { vi.restoreAllMocks(); for (const db of databases.splice(0)) { db.close(); await db.delete(); } });

describe('editing and deleting canonical relationships', () => {
  it('corrects participants and parentage without changing the ID, other parent or partnerships', () => {
    const before = structuredClone(demoArchive);
    const result = applyCommand(demoArchive, edit(demoArchive, { type: 'parentChild', id: 'n-l', changes: { parentId: 'vera', kind: 'adoptive' } })).archive;
    expect(result.parentChildRelationships.find(record => record.id === 'n-l')).toMatchObject({ parentId: 'vera', childId: 'luka', kind: 'adoptive' });
    expect(result.parentChildRelationships.find(record => record.id === 'a-l')).toEqual(demoArchive.parentChildRelationships.find(record => record.id === 'a-l'));
    expect(result.partnerships).toEqual(demoArchive.partnerships); expect(result.people).toEqual(demoArchive.people); expect(demoArchive).toEqual(before);
  });
  it('rejects self-parentage, ancestry cycles, missing people and duplicate pairs when editing', () => {
    const invalid: Update[] = [
      { type: 'parentChild', id: 'n-l', changes: { parentId: 'luka' } },
      { type: 'parentChild', id: 'j-v', changes: { parentId: 'luka', childId: 'jovan' } },
      { type: 'parentChild', id: 'n-l', changes: { parentId: 'missing' } },
      { type: 'parentChild', id: 'n-l', changes: { parentId: 'ana' } },
      { type: 'partnership', id: 'nikola-ana', changes: { personIds: ['jelena', 'nikola'] } },
      { type: 'partnership', id: 'nikola-ana', changes: { personIds: ['nikola', 'nikola'] } },
    ];
    for (const relationship of invalid) expect(() => applyCommand(demoArchive, edit(demoArchive, relationship))).toThrow();
    const archive = { ...demoArchive, kinshipAssertions: [{ id: 'one', personIds: ['danica', 'vera'] as [string, string], label: 'Рођаке' }, { id: 'two', personIds: ['danica', 'ana'] as [string, string], label: 'Сестре' }] };
    expect(() => applyCommand(archive, edit(archive, { type: 'kinship', id: 'two', changes: { personIds: ['vera', 'danica'] } }))).toThrow('већ забележена');
  });
  it('edits partnership type and optional year, including zero and clearing, and kinship labels', () => {
    let archive = applyCommand(demoArchive, edit(demoArchive, { type: 'partnership', id: 'nikola-ana', changes: { kind: 'unspecified', fromYear: 0 } })).archive;
    expect(archive.partnerships.find(item => item.id === 'nikola-ana')).toMatchObject({ kind: 'unspecified', fromYear: 0 });
    archive = applyCommand(archive, edit(archive, { type: 'partnership', id: 'nikola-ana', changes: { fromYear: null } })).archive;
    expect(archive.partnerships.find(item => item.id === 'nikola-ana')?.fromYear).toBeUndefined();
    archive.kinshipAssertions.push({ id: 'sibling', personIds: ['danica', 'vera'], label: 'Брат / сестра' });
    const updated = applyCommand(archive, edit(archive, { type: 'kinship', id: 'sibling', changes: { label: '  Рођаке  ', personIds: ['danica', 'ana'] } })).archive;
    expect(updated.kinshipAssertions[0]).toMatchObject({ id: 'sibling', personIds: ['danica', 'ana'], label: 'Рођаке' });
    expect(updated.parentChildRelationships).toEqual(demoArchive.parentChildRelationships);
  });
  it('deletes only the selected typed record and retains people, events, media, coparents and other links', () => {
    const archive = structuredClone(demoArchive); archive.kinshipAssertions.push({ id: 'sibling', personIds: ['danica', 'vera'], label: 'Сестре' });
    archive.partnerships.push({ id: 'n-l', personIds: ['danica', 'ana'], kind: 'partners' });
    for (const ref of [{ type: 'parentChild', id: 'n-l' }, { type: 'partnership', id: 'nikola-ana' }, { type: 'kinship', id: 'sibling' }] as RelationshipRef[]) {
      const result = applyCommand(archive, remove(archive, ref)).archive;
      expect(getRelationship(result, ref)).toBeUndefined();
      for (const key of ['people', 'events', 'places', 'media'] as const) expect(result[key]).toEqual(archive[key]);
      expect(result.parentChildRelationships.find(item => item.id === 'a-l')).toEqual(archive.parentChildRelationships.find(item => item.id === 'a-l'));
      if (ref.type === 'parentChild') expect(result.partnerships).toEqual(archive.partnerships);
      else expect(result.parentChildRelationships).toEqual(archive.parentChildRelationships);
    }
  });
  it('requires a fresh review after the specific record changes and refuses missing targets', () => {
    const pending = remove(demoArchive, { type: 'partnership', id: 'nikola-ana' });
    const updated = applyCommand(demoArchive, edit(demoArchive, { type: 'partnership', id: 'nikola-ana', changes: { kind: 'partners' } })).archive;
    expect(() => applyCommand(updated, pending)).toThrow('Поново прегледајте');
    const deleted = applyCommand(demoArchive, pending).archive; expect(() => applyCommand(deleted, pending)).toThrow('више није');
  });
});

describe('relationship persistence and history', () => {
  async function store() {
    const db = createFamilyDatabase(`relationships-${crypto.randomUUID()}`); databases.push(db);
    const repository = new ArchiveRepository(db); const initial = await repository.initialize(demoArchive);
    return { db, repository, dispatcher: new CommandDispatcher(repository, initial) };
  }
  it('persists editing/deletion and restores the same ID, order and created timestamp with undo/redo', async () => {
    const { repository, dispatcher } = await store(); const initial = dispatcher.current.archive;
    await dispatcher.execute(edit(initial, { type: 'parentChild', id: 'n-l', changes: { kind: 'adoptive' } }));
    expect((await repository.load()).archive.parentChildRelationships.find(item => item.id === 'n-l')?.kind).toBe('adoptive');
    await dispatcher.execute(remove(dispatcher.current.archive, { type: 'parentChild', id: 'n-l' }));
    expect(getRelationship((await repository.load()).archive, { type: 'parentChild', id: 'n-l' })).toBeUndefined();
    await dispatcher.undo(); expect(dispatcher.current.archive.parentChildRelationships.map(item => item.id)).toEqual(initial.parentChildRelationships.map(item => item.id));
    expect(dispatcher.current.archive.parentChildRelationships.find(item => item.id === 'n-l')?.createdAt).toBe(initial.parentChildRelationships.find(item => item.id === 'n-l')?.createdAt);
    await dispatcher.undo(); expect(dispatcher.current.archive.parentChildRelationships.find(item => item.id === 'n-l')?.kind).toBe('biological');
    await dispatcher.redo(); await dispatcher.redo(); expect(getRelationship(dispatcher.current.archive, { type: 'parentChild', id: 'n-l' })).toBeUndefined();
  });
  it('rolls back a failed delete and its history, then permits retry', async () => {
    const { db, repository, dispatcher } = await store(); const before = await repository.load(); const command = remove(before.archive, { type: 'partnership', id: 'nikola-ana' });
    const fault = vi.spyOn(db.table('partnerships'), 'bulkDelete').mockRejectedValueOnce(new DOMException('Disk unavailable', 'QuotaExceededError'));
    await expect(dispatcher.execute(command)).rejects.toThrow(); expect(await repository.load()).toEqual(before); expect(dispatcher.canUndo).toBe(false);
    fault.mockRestore(); await dispatcher.execute(command); expect(dispatcher.canUndo).toBe(true);
  });
  it('blocks stale windows, then still blocks their old confirmation after reload', async () => {
    const { repository, dispatcher } = await store(); const stale = new CommandDispatcher(repository, dispatcher.current);
    const pending = remove(stale.current.archive, { type: 'partnership', id: 'nikola-ana' });
    await dispatcher.execute(edit(dispatcher.current.archive, { type: 'partnership', id: 'nikola-ana', changes: { fromYear: 1980 } }));
    await expect(stale.execute(pending)).rejects.toBeInstanceOf(ConflictError);
    const refreshed = new CommandDispatcher(repository, await repository.load()); await expect(refreshed.execute(pending)).rejects.toThrow('Поново прегледајте');
    expect((await repository.load()).archive.partnerships.find(item => item.id === 'nikola-ana')?.fromYear).toBe(1980);
  });
});
