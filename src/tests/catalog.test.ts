/// <reference types="node" />
import 'fake-indexeddb/auto';
import { Blob as NativeBlob } from 'node:buffer';
import type Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { demoArchive } from '../domain/fixtures';
import { dateSchema } from '../domain/catalogSchemas';
import { eventHasPerson, formatDate } from '../domain/events';
import { lifeYears } from '../domain/people';
import { applyCommand } from '../services/commands';
import { CommandDispatcher } from '../services/CommandDispatcher';
import { ArchiveRepository } from '../storage/ArchiveRepository';
import { createFamilyDatabase } from '../storage/database';

const databases: Dexie[] = [];
afterEach(async () => { for (const db of databases.splice(0)) { db.close(); await db.delete(); } });

describe('normalized places and shared events', () => {
  it('creates an event and a new reusable place atomically without changing existing places', () => {
    const result = applyCommand(demoArchive, { type: 'saveEvent', details: { type: 'migration', participants: [{ personId: 'nikola', role: 'subject' }] }, newPlace: { name: 'Ново место' } });
    expect(result.archive.places).toHaveLength(demoArchive.places.length + 1);
    const event = result.archive.events.find(event => event.id === result.recordId)!;
    expect(result.archive.places.find(place => place.id === event.placeId)?.name).toBe('Ново место');
    expect(demoArchive.places).toHaveLength(2);
  });
  it('uses one shared event and place across people without inferring a partnership', () => {
    const place = applyCommand(demoArchive, { type: 'savePlace', details: { name: 'Нови Сад', coordinates: { latitude: 45.2671, longitude: 19.8335 }, alternativeNames: ['Újvidék'] } });
    const shared = applyCommand(place.archive, { type: 'saveEvent', details: { type: 'residence', title: 'Породична кућа', participants: [{ personId: 'nikola', role: 'subject' }, { personId: 'vera', role: 'participant' }], placeId: place.recordId, date: { year: 1970, endYear: 1975 } } });
    const event = shared.archive.events.find(event => event.id === shared.recordId)!;
    expect(eventHasPerson(event, 'nikola')).toBe(true); expect(eventHasPerson(event, 'vera')).toBe(true);
    expect(shared.archive.events.filter(item => item.id === event.id)).toHaveLength(1);
    expect(shared.archive.partnerships).toEqual(demoArchive.partnerships);
    const renamed = applyCommand(shared.archive, { type: 'savePlace', placeId: place.recordId, details: { name: 'Нови Сад · стари назив' } });
    expect(renamed.archive.events.find(item => item.id === event.id)?.placeId).toBe(place.recordId);
    expect(renamed.archive.places.find(item => item.id === place.recordId)?.coordinates?.latitude).toBe(45.2671);
  });
  it('validates leap days, incomplete precision, ranges and place hierarchy cycles', () => {
    expect(dateSchema.safeParse({ year: 2000, month: 2, day: 29 }).success).toBe(true);
    expect(dateSchema.safeParse({ year: 1900, month: 2, day: 29 }).success).toBe(false);
    expect(dateSchema.safeParse({ year: 2000, day: 1 }).success).toBe(false);
    expect(dateSchema.safeParse({ year: 2000, month: 6, endYear: 1999 }).success).toBe(false);
    expect(formatDate({ year: 1900, month: 2, approximate: true, endYear: 1902 })).toBe('око 2.1900. — 1902.');
    const one = applyCommand(demoArchive, { type: 'savePlace', details: { name: 'Један' } });
    const two = applyCommand(one.archive, { type: 'savePlace', details: { name: 'Два', parentPlaceId: one.recordId } });
    expect(() => applyCommand(two.archive, { type: 'savePlace', placeId: one.recordId, details: { parentPlaceId: two.recordId } })).toThrow('круг');
  });
  it('derives birth facts only from the subject and preserves precise dates on a year edit', () => {
    const archive = applyCommand(demoArchive, { type: 'saveEvent', eventId: 'b-l', details: { participants: [{ personId: 'luka', role: 'subject' }, { personId: 'ana', role: 'parent' }], date: { year: 1981, month: 5, day: 20 } } }).archive;
    expect(lifeYears(archive, 'ana')).toBe('р. 1955');
    const changed = applyCommand(archive, { type: 'updatePerson', personId: 'luka', changes: {}, birthYear: 1982 }).archive;
    expect(changed.events.find(event => event.id === 'b-l')?.date).toEqual({ year: 1982, month: 5, day: 20 });
    const cleared = applyCommand(changed, { type: 'updatePerson', personId: 'luka', changes: {}, birthYear: null }).archive;
    expect(cleared.events.find(event => event.id === 'b-l')?.participants).toHaveLength(2);
  });
});

describe('atomic original-file storage', () => {
  it('stores one original separately, retains it for undo/redo, and never serializes a blob URL', async () => {
    const db = createFamilyDatabase(`files-${crypto.randomUUID()}`); databases.push(db);
    const repository = new ArchiveRepository(db); const initial = await repository.initialize(demoArchive);
    const dispatcher = new CommandDispatcher(repository, initial);
    const original = new NativeBlob(['original document bytes'], { type: 'text/plain' }) as Blob;
    await dispatcher.execute({ type: 'addMedia', items: [{ id: 'file-1', alt: 'Писмо', originalFilename: 'pismo.txt', mimeType: 'text/plain', size: original.size, links: [{ entityType: 'person', entityId: 'nikola' }, { entityType: 'place', entityId: 'belgrade' }] }] }, [{ id: 'file-1', original }]);
    expect(await db.table('mediaFiles').count()).toBe(1);
    expect(await (await repository.getMediaBlob(initial.archive.id, 'file-1', 'original'))!.text()).toBe('original document bytes');
    expect(JSON.stringify(dispatcher.current.archive.media)).not.toContain('blob:');
    await dispatcher.undo(); expect(dispatcher.current.archive.media).toHaveLength(0);
    await dispatcher.redo(); expect(dispatcher.current.archive.media).toHaveLength(1);
    expect(await db.table('mediaFiles').count()).toBe(1);
  });
  it('rolls back files and metadata together and rejects metadata without an original', async () => {
    const db = createFamilyDatabase(`files-${crypto.randomUUID()}`); databases.push(db);
    const repository = new ArchiveRepository(db); const initial = await repository.initialize(demoArchive);
    const dispatcher = new CommandDispatcher(repository, initial);
    const original = new NativeBlob(['a'], { type: 'text/plain' }) as Blob;
    const items = [{ id: 'file-1', alt: '', originalFilename: 'one.txt', mimeType: 'text/plain', size: 1 }, { id: 'file-2', alt: '', originalFilename: 'two.txt', mimeType: 'text/plain', size: 2 }];
    await expect(dispatcher.execute({ type: 'addMedia', items }, [{ id: 'file-1', original }, { id: 'file-2', original }])).rejects.toThrow('не подударају');
    expect(await db.table('mediaFiles').count()).toBe(0); expect((await repository.load()).archive.media).toHaveLength(0);
    await expect(dispatcher.execute({ type: 'addMedia', items: [items[0]] })).rejects.toThrow('Оригинална датотека');
    expect(dispatcher.current.revision).toBe(0);
  });
});
