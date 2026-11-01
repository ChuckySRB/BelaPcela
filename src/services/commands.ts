import { z } from 'zod';
import type { FamilyArchive, LifeEvent, Person } from '../domain/model';
import { DomainError, idSchema, parentageSchema, partnershipSchema, personDetailsSchema, validateArchive, yearSchema } from '../domain/validation';

export const relativeKindSchema = z.enum(['parent', 'child', 'partner', 'sibling']);
export type RelativeKind = z.infer<typeof relativeKindSchema>;
const commandSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('createPerson'), person: personDetailsSchema }),
  z.strictObject({ type: z.literal('updatePerson'), personId: idSchema, changes: personDetailsSchema, birthYear: yearSchema.nullable().optional(), deathYear: yearSchema.nullable().optional() }),
  z.strictObject({
    type: z.literal('addRelative'), anchorId: idSchema, relationship: relativeKindSchema,
    target: z.union([z.strictObject({ existingPersonId: idSchema }), z.strictObject({ newPerson: personDetailsSchema })]),
    parentageKind: parentageSchema.optional(), partnershipKind: partnershipSchema.optional(), otherParentId: idSchema.optional(),
  }),
]);
export type ArchiveCommand = z.infer<typeof commandSchema>;
export interface CommandResult { archive: FamilyArchive; personId?: string }
export const commandLabels = { createPerson: 'Додавање особе', updatePerson: 'Измена особе', addRelative: 'Додавање сродника' };

function cleanDetails(details: z.infer<typeof personDetailsSchema>) {
  return Object.fromEntries(Object.entries(details).map(([key, value]) => [key, value?.trim() || undefined]));
}

/** Pure command application. IDs are created once and retained by undo/redo snapshots. */
export function applyCommand(archive: FamilyArchive, input: ArchiveCommand, newId: () => string = () => crypto.randomUUID()): CommandResult {
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success) throw new DomainError('Проверите унесене податке. Године морају бити цели бројеви, а име највише 200 знакова.');
  const command = parsed.data;
  const next: FamilyArchive = structuredClone(archive);
  let personId: string | undefined;
  const requirePerson = (id: string) => {
    const person = next.people.find(person => person.id === id);
    if (!person) throw new DomainError('Особа више није у овој збирци.');
    return person;
  };
  const addPerson = (details: z.infer<typeof personDetailsSchema>) => {
    const person: Person = { id: newId(), ...cleanDetails(details) };
    next.people.push(person); return person.id;
  };
  const setYear = (personId: string, type: LifeEvent['type'], year: number | null | undefined) => {
    if (year === undefined) return;
    const event = next.events.find(event => event.personId === personId && event.type === type);
    if (event) {
      if (year === null) { delete event.date; if (!event.placeId) next.events = next.events.filter(item => item.id !== event.id); }
      else if (event.date?.year !== year) event.date = { year };
    } else if (year !== null) next.events.push({ id: newId(), type, personId, date: { year } });
  };
  if (command.type === 'createPerson') personId = addPerson(command.person);
  if (command.type === 'updatePerson') {
    const person = requirePerson(command.personId);
    Object.assign(person, cleanDetails(command.changes));
    setYear(person.id, 'birth', command.birthYear); setYear(person.id, 'death', command.deathYear);
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
  return { archive: validateArchive(next), personId };
}
