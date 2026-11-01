import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type Dexie from 'dexie';
import { demoArchive } from '../domain/fixtures';
import { createFamilyDatabase } from '../storage/database';
import { ArchiveRepository, ConflictError } from '../storage/ArchiveRepository';
import { CommandDispatcher } from '../services/CommandDispatcher';
import { applyCommand } from '../services/commands';
import { validateArchive } from '../domain/validation';

const databases: Dexie[] = [];
afterEach(async () => { vi.restoreAllMocks(); for (const db of databases.splice(0)) { db.close(); await db.delete(); } });
async function createStore() {
  const db = createFamilyDatabase(`BelaPcela-test-${crypto.randomUUID()}`); databases.push(db);
  const repository = new ArchiveRepository(db);
  const initial = await repository.initialize(demoArchive);
  return { db, repository, dispatcher: new CommandDispatcher(repository, initial) };
}

describe('transactional local archive', () => {
  it('seeds once, stamps records, preserves order, and reloads committed edits', async () => {
    const { db, repository, dispatcher } = await createStore();
    await dispatcher.execute({ type: 'updatePerson', personId: 'nikola', changes: { name: 'Никола Петронић — унето локално' } });
    const loaded = await new ArchiveRepository(db).initialize({ ...demoArchive, name: 'Не сме да препише збирку' });
    expect(loaded.archive.name).toBe(demoArchive.name);
    expect(loaded.archive.people.map(person => person.id)).toEqual(demoArchive.people.map(person => person.id));
    expect(loaded.archive.people.find(person => person.id === 'nikola')?.name).toContain('унето локално');
    expect(loaded.archive.people.every(person => person.createdAt && person.updatedAt)).toBe(true);
    expect((await repository.load()).revision).toBe(1);
  });

  it('creates a child with only the explicit parent, then undoes and redoes the whole command', async () => {
    const { repository, dispatcher } = await createStore();
    const created = await dispatcher.execute({ type: 'addRelative', anchorId: 'nikola', relationship: 'child', target: { newPerson: { name: 'Ново дете' } } });
    const id = created.personId!;
    expect(created.archive.parentChildRelationships.filter(relation => relation.childId === id).map(relation => relation.parentId)).toEqual(['nikola']);
    expect(created.archive.partnerships).toEqual(dispatcher.current.archive.partnerships);
    await dispatcher.undo();
    expect((await repository.load()).archive.people.some(person => person.id === id)).toBe(false);
    expect(dispatcher.canRedo).toBe(true);
    await dispatcher.redo();
    const loaded = await repository.load();
    expect(loaded.archive.people.find(person => person.id === id)?.name).toBe('Ново дете');
    expect(loaded.archive.parentChildRelationships.filter(relation => relation.childId === id)).toHaveLength(1);
  });

  it('links existing people without duplicate people and allows explicit adoptive coparents', async () => {
    const { dispatcher } = await createStore();
    const result = await dispatcher.execute({ type: 'addRelative', anchorId: 'vera', relationship: 'child', target: { existingPersonId: 'danica' }, otherParentId: 'ana', parentageKind: 'adoptive' });
    expect(result.archive.people).toHaveLength(demoArchive.people.length);
    expect(result.archive.parentChildRelationships.filter(relation => relation.childId === 'danica')).toEqual(expect.arrayContaining([
      expect.objectContaining({ parentId: 'vera', kind: 'adoptive' }), expect.objectContaining({ parentId: 'ana', kind: 'adoptive' }),
    ]));
    expect(result.archive.partnerships).toHaveLength(demoArchive.partnerships.length);
  });

  it('rolls back the new person if writing the relationship fails and permits retry', async () => {
    const { db, repository, dispatcher } = await createStore();
    const before = await repository.load();
    const failure = vi.spyOn(db.table('parentChildRelationships'), 'bulkPut').mockRejectedValueOnce(new DOMException('Disk full', 'QuotaExceededError'));
    const command = { type: 'addRelative' as const, anchorId: 'nikola', relationship: 'child' as const, target: { newPerson: { name: 'Тест' } } };
    await expect(dispatcher.execute(command)).rejects.toThrow();
    expect(await repository.load()).toEqual(before);
    expect(dispatcher.canUndo).toBe(false);
    failure.mockRestore();
    await expect(dispatcher.execute(command)).resolves.toMatchObject({ revision: 1 });
  });

  it('rejects a stale window instead of overwriting its newer archive', async () => {
    const { repository, dispatcher } = await createStore();
    const stale = new CommandDispatcher(repository, await repository.load());
    await dispatcher.execute({ type: 'updatePerson', personId: 'nikola', changes: { nickname: 'Нови надимак' } });
    await expect(stale.execute({ type: 'updatePerson', personId: 'nikola', changes: { nickname: 'Застарело' } })).rejects.toBeInstanceOf(ConflictError);
    expect((await repository.load()).archive.people.find(person => person.id === 'nikola')?.nickname).toBe('Нови надимак');
  });

  it('serializes quick commands, clears redo on a new edit, and ignores no-op edits', async () => {
    const { dispatcher } = await createStore();
    await Promise.all([
      dispatcher.execute({ type: 'updatePerson', personId: 'nikola', changes: { nickname: 'Један' } }),
      dispatcher.execute({ type: 'updatePerson', personId: 'nikola', changes: { nickname: 'Два' } }),
    ]);
    expect(dispatcher.current.revision).toBe(2);
    await dispatcher.execute({ type: 'updatePerson', personId: 'nikola', changes: { nickname: 'Два' } });
    expect(dispatcher.current.revision).toBe(2);
    await dispatcher.undo(); expect(dispatcher.canRedo).toBe(true);
    await dispatcher.execute({ type: 'createPerson', person: {} });
    expect(dispatcher.canRedo).toBe(false);
    expect(dispatcher.current.archive.people.at(-1)?.name).toBeUndefined();
  });

  it('refuses a future archive schema without replacing stored data', async () => {
    const { db, repository } = await createStore();
    await db.table('archives').update(demoArchive.id, { schemaVersion: 99 });
    await expect(repository.initialize(demoArchive)).rejects.toThrow('новију верзију');
    expect(await db.table('people').count()).toBe(11);
  });
});

describe('domain command rules', () => {
  it('rejects self-parentage, ancestry cycles, duplicate relationships, and missing references', () => {
    for (const id of ['nikola', 'luka', 'jovan', 'missing']) {
      expect(() => applyCommand(demoArchive, { type: 'addRelative', anchorId: 'nikola', relationship: 'parent', target: { existingPersonId: id } })).toThrow();
    }
    expect(demoArchive.people).toHaveLength(11);
  });
  it('records siblings directly without inventing parents and never infers a marriage', () => {
    const siblings = applyCommand(demoArchive, { type: 'addRelative', anchorId: 'danica', relationship: 'sibling', target: { existingPersonId: 'vera' } }).archive;
    expect(siblings.parentChildRelationships).toEqual(demoArchive.parentChildRelationships);
    expect(siblings.kinshipAssertions).toHaveLength(1);
    const partners = applyCommand(demoArchive, { type: 'addRelative', anchorId: 'danica', relationship: 'partner', target: { existingPersonId: 'vera' } }).archive;
    expect(partners.partnerships.at(-1)?.kind).toBe('unspecified');
  });
  it('edits event-derived years, preserves shared places and approximation, and clears blank optional facts', () => {
    const result = applyCommand(demoArchive, { type: 'updatePerson', personId: 'nikola', changes: { nickname: '', name: '  Никола Петронић  ' }, birthYear: null }).archive;
    expect(result.people.find(person => person.id === 'nikola')?.nickname).toBeUndefined();
    expect(result.events.find(event => event.id === 'b-n')).toMatchObject({ placeId: 'belgrade' });
    expect(result.events.find(event => event.id === 'b-n')?.date).toBeUndefined();
    expect(() => applyCommand(demoArchive, { type: 'updatePerson', personId: 'nikola', changes: {}, deathYear: 1900 })).toThrow('пре године рођења');
    const approximate = structuredClone(demoArchive);
    approximate.events.find(event => event.id === 'b-n')!.date!.approximate = true;
    expect(applyCommand(approximate, { type: 'updatePerson', personId: 'nikola', changes: {}, birthYear: 1952 }).archive.events.find(event => event.id === 'b-n')?.date?.approximate).toBe(true);
  });
  it('validates optional person fields and rejects malformed or duplicate canonical records', () => {
    expect(() => validateArchive({ ...demoArchive, people: [...demoArchive.people, demoArchive.people[0]] })).toThrow('јединствени');
    expect(() => applyCommand(demoArchive, { type: 'createPerson', person: { name: 'a'.repeat(201) } })).toThrow();
    expect(() => validateArchive({ ...demoArchive, events: [...demoArchive.events, { id: 'bad', type: 'birth', personId: 'missing' }] })).toThrow();
  });
});
