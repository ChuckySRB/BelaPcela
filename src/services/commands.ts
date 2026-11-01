import { z } from 'zod';
import type { FamilyArchive, LifeEvent, Person } from '../domain/model';
import { DomainError, idSchema, parentageSchema, partnershipSchema, personDetailsSchema, validateArchive, yearSchema } from '../domain/validation';
import { eventDetailsSchema, placeDetailsSchema, mediaDetailsSchema } from '../domain/catalogSchemas';
import { eventHasSubject } from '../domain/events';

export const relativeKindSchema = z.enum(['parent', 'child', 'partner', 'sibling']);
export type RelativeKind = z.infer<typeof relativeKindSchema>;
const lifeYearsFields = { birthYear: yearSchema.nullable().optional(), deathYear: yearSchema.nullable().optional(), birthApproximate: z.boolean().optional(), deathApproximate: z.boolean().optional() };
const commandSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('savePlace'), placeId: idSchema.optional(), details: placeDetailsSchema.partial() }),
  z.strictObject({ type: z.literal('saveEvent'), eventId: idSchema.optional(), details: eventDetailsSchema.partial(), newPlace: placeDetailsSchema.optional() }),
  z.strictObject({ type: z.literal('addMedia'), items: z.array(z.strictObject({ id: idSchema, ...mediaDetailsSchema.omit({ src: true }).required({ originalFilename: true, mimeType: true, size: true }).shape })).min(1).max(20) }),
  z.strictObject({ type: z.literal('updateMedia'), mediaId: idSchema, details: mediaDetailsSchema.omit({ src: true, originalFilename: true, mimeType: true, size: true }).partial() }),
  z.strictObject({ type: z.literal('setPortrait'), personId: idSchema, mediaId: idSchema.nullable() }),
  z.strictObject({ type: z.literal('createPerson'), person: personDetailsSchema, ...lifeYearsFields }),
  z.strictObject({ type: z.literal('updatePerson'), personId: idSchema, changes: personDetailsSchema, ...lifeYearsFields }),
  z.strictObject({
    type: z.literal('addRelative'), anchorId: idSchema, relationship: relativeKindSchema,
    target: z.union([z.strictObject({ existingPersonId: idSchema }), z.strictObject({ newPerson: personDetailsSchema })]),
    parentageKind: parentageSchema.optional(), partnershipKind: partnershipSchema.optional(), otherParentId: idSchema.optional(),
  }),
]);
export type ArchiveCommand = z.infer<typeof commandSchema>;
export interface CommandResult { archive: FamilyArchive; personId?: string; recordId?: string }
export const commandLabels = { createPerson: 'Додавање особе', updatePerson: 'Измена особе', addRelative: 'Додавање сродника', savePlace: 'Чување места', saveEvent: 'Чување догађаја', addMedia: 'Додавање датотека', updateMedia: 'Измена описа датотеке', setPortrait: 'Избор портрета' };

function cleanDetails(details: z.infer<typeof personDetailsSchema>) {
  return Object.fromEntries(Object.entries(details).map(([key, value]) => [key,
    typeof value === 'string' ? value.trim() || undefined : Array.isArray(value) ? value.length ? value : undefined : value,
  ]));
}

/** Pure command application. IDs are created once and retained by undo/redo snapshots. */
export function applyCommand(archive: FamilyArchive, input: ArchiveCommand, newId: () => string = () => crypto.randomUUID()): CommandResult {
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue && /[А-Яа-яЂђЈјЉљЊњЋћЏџ]/.test(issue.message)) throw new DomainError(issue.message);
    if (issue?.path.includes('contacts')) throw new DomainError('За сваки контакт унесите исправну вредност. За веб-сајтове користите потпуну http или https адресу.');
    if (issue?.path.includes('facts')) throw new DomainError('Додатни податак мора имати и назив и вредност. Празан ред можете уклонити.');
    if (issue?.path.includes('occupations')) throw new DomainError('Унесите назив занимања и исправне целе године, или уклоните празан ред.');
    throw new DomainError('Проверите унесене податке. Године морају бити цели бројеви, а име највише 200 знакова.');
  }
  const command = parsed.data;
  const next: FamilyArchive = structuredClone(archive);
  let personId: string | undefined;
  let recordId: string | undefined;
  if (command.type === 'savePlace' || command.type === 'saveEvent') {
    const collection = command.type === 'savePlace' ? next.places : next.events;
    const id = command.type === 'savePlace' ? command.placeId : command.eventId;
    const old = id ? collection.find(record => record.id === id) : undefined;
    if (id && !old) throw new DomainError('Запис више није у збирци.');
    recordId = id || newId();
    const record = { ...old, ...command.details, id: recordId };
    if (command.type === 'saveEvent' && command.newPlace) {
      if (command.details.placeId) throw new DomainError('Изаберите сачувано место или унесите ново место.');
      const placeId = newId(); next.places.push({ ...command.newPlace, id: placeId }); Object.assign(record, { placeId });
    }
    if (command.type === 'savePlace') {
      if (old) next.places = next.places.map(item => item.id === recordId ? record as FamilyArchive['places'][number] : item);
      else next.places.push(record as FamilyArchive['places'][number]);
    } else {
      if (old) next.events = next.events.map(item => item.id === recordId ? record as LifeEvent : item);
      else next.events.push(record as LifeEvent);
    }
  }
  if (command.type === 'addMedia') next.media.push(...command.items);
  if (command.type === 'updateMedia') {
    const item = next.media.find(item => item.id === command.mediaId);
    if (!item) throw new DomainError('Датотека није у збирци.');
    Object.assign(item, command.details);
  }
  const requirePerson = (id: string) => {
    const person = next.people.find(person => person.id === id);
    if (!person) throw new DomainError('Особа више није у овој збирци.');
    return person;
  };
  if (command.type === 'setPortrait') {
    const person = requirePerson(command.personId);
    if (command.mediaId) {
      const item = next.media.find(item => item.id === command.mediaId);
      if (!item || !item.mimeType?.startsWith('image/')) throw new DomainError('За портрет изаберите фотографију из збирке.');
      item.links ||= [];
      if (!item.links.some(link => link.entityType === 'person' && link.entityId === person.id)) item.links.push({ entityType: 'person', entityId: person.id });
    }
    person.preferredMediaId = command.mediaId || undefined; personId = person.id;
  }
  const addPerson = (details: z.infer<typeof personDetailsSchema>) => {
    const person: Person = { id: newId(), ...cleanDetails(details) };
    next.people.push(person); return person.id;
  };
  const setYear = (personId: string, type: LifeEvent['type'], year: number | null | undefined, approximate?: boolean) => {
    if (year === undefined && approximate === undefined) return;
    const event = next.events.find(event => eventHasSubject(event, personId) && event.type === type);
    if (event) {
      if (year === null) { delete event.date; }
      else {
        if (year !== undefined && event.date?.year !== year) event.date = { ...event.date, year };
        if (approximate !== undefined) {
          if (!event.date) { if (approximate) throw new DomainError('Прво унесите годину за приближан датум.'); }
          else if (approximate) event.date.approximate = true;
          else delete event.date.approximate;
        }
      }
    } else if (year !== null && year !== undefined) next.events.push({ id: newId(), type, participants: [{ personId, role: 'subject' }], date: { year, ...(approximate ? { approximate: true } : {}) } });
    else if (approximate) throw new DomainError('Прво унесите годину за приближан датум.');
  };
  if (command.type === 'createPerson') {
    personId = addPerson(command.person);
    setYear(personId, 'birth', command.birthYear, command.birthApproximate); setYear(personId, 'death', command.deathYear, command.deathApproximate);
  }
  if (command.type === 'updatePerson') {
    const person = requirePerson(command.personId);
    Object.assign(person, cleanDetails(command.changes));
    setYear(person.id, 'birth', command.birthYear, command.birthApproximate); setYear(person.id, 'death', command.deathYear, command.deathApproximate);
    personId = person.id;
  }
  if (command.type === 'addRelative') {
    requirePerson(command.anchorId);
    personId = 'existingPersonId' in command.target ? requirePerson(command.target.existingPersonId).id : addPerson(command.target.newPerson);
    if (command.anchorId === personId) throw new DomainError('Особа не може бити сопствени сродник.');
    const parent = (parentId: string, childId: string) => next.parentChildRelationships.push({ id: newId(), parentId, childId, kind: command.parentageKind || 'biological' });
    if (command.relationship === 'parent') parent(personId, command.anchorId);
    if (command.relationship === 'child') {
      parent(command.anchorId, personId);
      if (command.otherParentId) {
        requirePerson(command.otherParentId);
        if (command.otherParentId === command.anchorId) throw new DomainError('Други родитељ мора бити друга особа.');
        parent(command.otherParentId, personId);
      }
    } else if (command.otherParentId) throw new DomainError('Други родитељ се бира само при додавању детета.');
    if (command.relationship === 'partner') next.partnerships.push({ id: newId(), personIds: [command.anchorId, personId], kind: command.partnershipKind || 'unspecified' });
    if (command.relationship === 'sibling') next.kinshipAssertions.push({ id: newId(), personIds: [command.anchorId, personId], label: 'Брат / сестра' });
  }
  return { archive: validateArchive(next), personId, recordId };
}
