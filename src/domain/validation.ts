import { z } from 'zod';
import type { FamilyArchive } from './model';
import { eventHasSubject, dateBounds } from './events';
import { eventDetailsSchema, mediaDetailsSchema, placeDetailsSchema } from './catalogSchemas';

export class DomainError extends Error {}
export const idSchema = z.string().min(1).max(200);
const entity = { id: idSchema, createdAt: z.iso.datetime().optional(), updatedAt: z.iso.datetime().optional() };
const text = z.string().max(200);
export const yearSchema = z.number().int().min(-9999).max(9999);
export const occupationSchema = z.strictObject({ id: idSchema, title: text.trim().min(1), fromYear: yearSchema.optional(), toYear: yearSchema.optional() })
  .refine(item => item.fromYear === undefined || item.toYear === undefined || item.fromYear <= item.toYear, 'Почетна година занимања мора бити пре завршне.');
export const contactSchema = z.strictObject({
  id: idSchema, kind: z.enum(['email', 'phone', 'website', 'social', 'other']), label: text.trim().optional(),
  value: z.string().trim().min(1).max(500).refine(value => !/[\r\n]/.test(value)),
}).superRefine((contact, ctx) => {
  if (contact.kind === 'email' && !z.email().safeParse(contact.value).success) ctx.addIssue({ code: 'custom', message: 'Унесите исправну адресу е-поште.' });
  if (contact.kind === 'website' || contact.kind === 'social') {
    try { const url = new URL(contact.value); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error(); }
    catch { ctx.addIssue({ code: 'custom', message: 'Линк мора бити потпуна http или https адреса, без лозинке.' }); }
  }
});
export const factSchema = z.strictObject({ id: idSchema, label: text.trim().min(1), value: z.string().trim().min(1).max(1000) });
export const personDetailsSchema = z.strictObject({
  name: text.optional(), nickname: text.optional(), occupation: text.optional(), biography: z.string().max(20000).optional(),
  maidenName: text.optional(), identityNote: z.string().max(1000).optional(), preferredMediaId: idSchema.optional(),
  aliases: z.array(text.trim().min(1)).max(50).optional(),
  occupations: z.array(occupationSchema).max(100).optional(),
  contacts: z.array(contactSchema).max(100).optional(),
  facts: z.array(factSchema).max(100).optional(),
});
export type PersonDetails = z.infer<typeof personDetailsSchema>;
export const parentageSchema = z.enum(['biological', 'adoptive', 'other']);
export const partnershipSchema = z.enum(['married', 'partners', 'unspecified']);
const archiveSchema = z.strictObject({
  id: idSchema, name: text,
  people: z.array(z.strictObject({ ...entity, ...personDetailsSchema.shape, preferredMediaId: idSchema.optional() })),
  parentChildRelationships: z.array(z.strictObject({ ...entity, parentId: idSchema, childId: idSchema, kind: parentageSchema })),
  partnerships: z.array(z.strictObject({ ...entity, personIds: z.tuple([idSchema, idSchema]), kind: partnershipSchema, fromYear: yearSchema.optional() })),
  kinshipAssertions: z.array(z.strictObject({ ...entity, personIds: z.tuple([idSchema, idSchema]), label: text })),
  events: z.array(z.strictObject({ ...entity, ...eventDetailsSchema.shape })),
  places: z.array(z.strictObject({ ...entity, ...placeDetailsSchema.shape })),
  media: z.array(z.strictObject({ ...entity, ...mediaDetailsSchema.shape })),
  sources: z.array(z.strictObject({ ...entity, title: text.optional(), citation: z.string().max(20000).optional() })).optional(),
});

export function validateArchive(input: unknown): FamilyArchive {
  const parsed = archiveSchema.safeParse(input);
  if (!parsed.success) throw new DomainError('Подаци нису у исправном облику. Проверите дужину текста и унету годину.');
  const archive = parsed.data;
  for (const records of [archive.people, archive.parentChildRelationships, archive.partnerships, archive.kinshipAssertions, archive.events, archive.places, archive.media, archive.sources || []]) {
    if (new Set(records.map(record => record.id)).size !== records.length) throw new DomainError('Идентификатори записа морају бити јединствени.');
  }
  const people = new Set(archive.people.map(person => person.id));
  const places = new Set(archive.places.map(place => place.id));
  const media = new Set(archive.media.map(item => item.id));
  const requirePerson = (id: string) => { if (!people.has(id)) throw new DomainError('Особа у овој вези не постоји у збирци.'); };
  const seenParents = new Set<string>();
  const children = new Map(archive.people.map(person => [person.id, [] as string[]]));
  const indegree = new Map(archive.people.map(person => [person.id, 0]));
  archive.parentChildRelationships.forEach(relation => {
    requirePerson(relation.parentId); requirePerson(relation.childId);
    if (relation.parentId === relation.childId) throw new DomainError('Особа не може бити сопствени родитељ.');
    const key = JSON.stringify([relation.parentId, relation.childId]);
    if (seenParents.has(key)) throw new DomainError('Ово родитељство је већ забележено.');
    seenParents.add(key);
    children.get(relation.parentId)!.push(relation.childId);
    indegree.set(relation.childId, indegree.get(relation.childId)! + 1);
  });
  const queue = archive.people.filter(person => indegree.get(person.id) === 0).map(person => person.id);
  for (let i = 0; i < queue.length; i++) {
    for (const child of children.get(queue[i])!) {
      indegree.set(child, indegree.get(child)! - 1);
      if (indegree.get(child) === 0) queue.push(child);
    }
  }
  if (queue.length !== people.size) throw new DomainError('Ова веза би направила круг предака: особа би постала сопствени предак.');
  for (const records of [archive.partnerships, archive.kinshipAssertions]) {
    const pairs = new Set<string>();
    records.forEach(relation => {
      relation.personIds.forEach(requirePerson);
      if (relation.personIds[0] === relation.personIds[1]) throw new DomainError('Изаберите две различите особе.');
      const key = JSON.stringify([...relation.personIds].sort());
      if (pairs.has(key)) throw new DomainError('Веза између ових особа је већ забележена.');
      pairs.add(key);
    });
  }
  const eventKeys = new Set<string>();
  archive.events.forEach(event => {
    event.participants.forEach(participant => requirePerson(participant.personId));
    if (new Set(event.participants.map(participant => participant.personId)).size !== event.participants.length) throw new DomainError('Исту особу додајте једном у догађај.');
    if (event.placeId && !places.has(event.placeId)) throw new DomainError('Место догађаја не постоји у збирци.');
    if (event.sourceIds?.some(id => !archive.sources?.some(source => source.id === id))) throw new DomainError('Извор догађаја није у збирци.');
    if (event.type === 'birth' || event.type === 'death') {
      const subjects = event.participants.filter(participant => participant.role === 'subject');
      if (subjects.length !== 1) throw new DomainError('Рођење или смрт мора имати тачно једну главну особу.');
      const key = JSON.stringify([subjects[0].personId, event.type]);
      if (eventKeys.has(key)) throw new DomainError('Догађај рођења или смрти је већ забележен за ову особу.');
      eventKeys.add(key);
    }
  });
  archive.places.forEach(place => {
    const visited = new Set([place.id]);
    let parentId = place.parentPlaceId;
    while (parentId) {
      if (!places.has(parentId)) throw new DomainError('Надређено место није у збирци.');
      if (visited.has(parentId)) throw new DomainError('Хијерархија места не може да садржи круг.');
      visited.add(parentId); parentId = archive.places.find(item => item.id === parentId)?.parentPlaceId;
    }
  });
  archive.media.forEach(item => {
    const links = new Set<string>();
    for (const link of item.links || []) {
      const collection = link.entityType === 'person' ? archive.people : link.entityType === 'event' ? archive.events : link.entityType === 'place' ? archive.places : archive.sources || [];
      if (!collection.some(record => record.id === link.entityId)) throw new DomainError('Веза датотеке упућује на непостојећи запис.');
      const key = JSON.stringify(link); if (links.has(key)) throw new DomainError('Веза датотеке је већ забележена.'); links.add(key);
    }
    if (item.src && !item.src.startsWith('data:image/') && !/^\.?\/?(assets|photos)\//.test(item.src)) throw new DomainError('Спољне адресе и привремени blob линкови не могу бити сачувана датотека.');
  });
  archive.people.forEach(person => {
    for (const records of [person.occupations || [], person.contacts || [], person.facts || []]) {
      if (new Set(records.map(record => record.id)).size !== records.length) throw new DomainError('Поља исте особе морају имати јединствене идентификаторе.');
    }
    if (new Set(person.aliases || []).size !== (person.aliases || []).length) throw new DomainError('Алтернативна имена не треба понављати.');
    if (person.preferredMediaId && !media.has(person.preferredMediaId)) throw new DomainError('Изабрана фотографија не постоји у збирци.');
    const portrait = archive.media.find(item => item.id === person.preferredMediaId);
    if (portrait?.mimeType && !portrait.mimeType.startsWith('image/')) throw new DomainError('За портрет изаберите фотографију.');
    const birth = archive.events.find(event => eventHasSubject(event, person.id) && event.type === 'birth')?.date;
    const death = archive.events.find(event => eventHasSubject(event, person.id) && event.type === 'death')?.date;
    if (birth && death && dateBounds(death)[1] < dateBounds(birth)[0]) throw new DomainError('Година смрти не може бити пре године рођења.');
  });
  return archive;
}
