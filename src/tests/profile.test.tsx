import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { eventHasPerson } from '../domain/events';
import { demoArchive } from '../domain/fixtures';
import { applyCommand } from '../services/commands';
import { ArchiveRepository } from '../storage/ArchiveRepository';
import { archiveStores, collectionKeys, createFamilyDatabase } from '../storage/database';
import { contactHref, profileEvents } from '../domain/profile';
import { ProfileFacts, LifeTimeline } from '../features/people/ProfileSections';
import { searchPeople } from '../domain/people';

const databases: Dexie[] = [];
afterEach(async () => { for (const db of databases.splice(0)) { db.close(); await db.delete(); } });

describe('profile schema upgrade', () => {
  it('migrates an existing v1 archive without changing people, dates, order, or relationships', async () => {
    const name = `legacy-${crypto.randomUUID()}`;
    const legacy = new Dexie(name); legacy.version(1).stores(archiveStores);
    const timestamp = '2026-01-01T00:00:00.000Z';
    await legacy.table('archives').put({ id: demoArchive.id, name: 'Моја постојећа збирка', schemaVersion: 1, revision: 7, createdAt: timestamp, updatedAt: timestamp });
    for (const key of collectionKeys) {
      const records = demoArchive[key] || [];
      if (records.length) await legacy.table(key).bulkPut(records.map((record, order) => {
        const legacyRecord = key === 'events' && 'participants' in record ? (() => { const { participants, ...event } = record; return { ...event, personId: participants[0].personId }; })() : record;
        return { ...legacyRecord, archiveId: demoArchive.id, order, createdAt: timestamp, updatedAt: timestamp };
      }));
    }
    legacy.close();
    const upgraded = createFamilyDatabase(name); databases.push(upgraded);
    const snapshot = await new ArchiveRepository(upgraded).initialize(demoArchive);
    expect(snapshot.revision).toBe(9);
    expect(snapshot.archive.name).toBe('Моја постојећа збирка');
    expect(snapshot.archive.people.map(person => person.id)).toEqual(demoArchive.people.map(person => person.id));
    expect(snapshot.archive.people.every(person => person.createdAt === timestamp && person.updatedAt === timestamp)).toBe(true);
    expect(snapshot.archive.events.find(event => event.id === 'b-n')?.date?.year).toBe(1952);
    expect(snapshot.archive.parentChildRelationships).toHaveLength(demoArchive.parentChildRelationships.length);
    expect((await upgraded.table('archives').get(demoArchive.id)).schemaVersion).toBe(3);
  });
});

describe('richer profile commands and display', () => {
  it('persists optional structured fields and supports approximate dates without duplicate birth events', async () => {
    const db = createFamilyDatabase(`profile-${crypto.randomUUID()}`); databases.push(db);
    const repository = new ArchiveRepository(db);
    const initial = await repository.initialize(demoArchive);
    const result = await repository.commit(initial.revision, archive => applyCommand(archive, {
      type: 'updatePerson', personId: 'nikola', birthApproximate: true,
      changes: { maidenName: 'Николић', aliases: ['Nikola Petronić'], contacts: [{ id: 'c1', kind: 'email', value: 'nikola@example.test' }], facts: [{ id: 'f1', label: 'Слава', value: 'Никољдан' }], occupations: [{ id: 'o1', title: 'Цртач', fromYear: 1971, toYear: 1975 }], identityNote: 'Проверити породично писмо.' },
    }).archive);
    const loaded = await repository.load();
    expect(loaded.archive).toEqual(result.after.archive);
    expect(loaded.archive.events.filter(event => eventHasPerson(event, 'nikola') && event.type === 'birth')).toHaveLength(1);
    expect(loaded.archive.events.find(event => event.id === 'b-n')).toMatchObject({ placeId: 'belgrade', date: { year: 1952, approximate: true } });
    expect(searchPeople(loaded.archive.people, 'Nikola Petronić').map(person => person.id)).toEqual(['nikola']);
    expect(searchPeople(loaded.archive.people, 'Николић').map(person => person.id)).toEqual(['nikola']);
  });
  it('validates occupation ranges, safe contact links, and partially filled facts', () => {
    for (const kind of ['website', 'social'] as const) {
      expect(() => applyCommand(demoArchive, { type: 'updatePerson', personId: 'nikola', changes: { contacts: [{ id: 'x', kind, value: 'javascript:alert(1)' }] } })).toThrow('http');
    }
    expect(() => applyCommand(demoArchive, { type: 'updatePerson', personId: 'nikola', changes: { occupations: [{ id: 'x', title: 'Учитељ', fromYear: 1980, toYear: 1970 }] } })).toThrow('Почетна година');
    expect(() => applyCommand(demoArchive, { type: 'updatePerson', personId: 'nikola', changes: { facts: [{ id: 'x', label: 'Слава', value: '' }] } })).toThrow('назив и вредност');
    expect(contactHref({ id: 'x', kind: 'website', value: 'data:text/html,bad' })).toBeUndefined();
    expect(contactHref({ id: 'x', kind: 'phone', value: 'непознат' })).toBeUndefined();
  });
  it('creates person and approximate year in a single command, and retains omitted optional fields on edits', () => {
    const result = applyCommand(demoArchive, { type: 'createPerson', person: { name: 'Тест', aliases: ['Test'] }, birthYear: 1900, birthApproximate: true });
    const person = result.archive.people.find(person => person.id === result.personId)!;
    expect(result.archive.events.find(event => eventHasPerson(event, person.id))?.date).toEqual({ year: 1900, approximate: true });
    const changed = applyCommand(result.archive, { type: 'updatePerson', personId: person.id, changes: { nickname: 'Т' } });
    expect(changed.archive.people.find(item => item.id === person.id)?.aliases).toEqual(['Test']);
  });
  it('omits empty sections and shows populated facts and safe links', () => {
    const person = { id: 'empty' };
    const { container, rerender } = render(<ProfileFacts person={person} archive={demoArchive} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ProfileFacts archive={demoArchive} person={{ id: 'empty', maidenName: 'Савић', aliases: ['Друго име'], contacts: [{ id: 'c', kind: 'website', value: 'https://example.test/story' }], facts: [{ id: 'f', label: 'Слава', value: 'Никољдан' }] }} />);
    expect(screen.getByText('Савић')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://example.test/story' })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('Никољдан')).toBeInTheDocument();
  });
  it('shows only meaningful events and a chronologically sorted timeline', () => {
    expect(profileEvents({ ...demoArchive, events: [{ id: 'blank', type: 'death', participants: [{ personId: 'nikola', role: 'subject' }] }] }, 'nikola')).toEqual([]);
    render(<LifeTimeline archive={demoArchive} person={{ ...demoArchive.people.find(person => person.id === 'nikola')!, occupations: [{ id: 'o', title: 'Архитекта', fromYear: 1975, toYear: 2010 }] }} />);
    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['1952.РођењеБеоград, Србија', '1975.АрхитектаДо 2010. године']);
  });
});
