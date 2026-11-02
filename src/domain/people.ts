import type { FamilyArchive, Person, RelationshipRef } from './model';
import { eventHasSubject } from './events';

export const personLabel = (person?: Person) => person?.name?.trim() || 'Неименована особа';
export function initials(person: Person) {
  return person.name?.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]).join('') || '·';
}

export function lifeYears(archive: FamilyArchive, personId: string): string | undefined {
  const year = (type: 'birth' | 'death') => {
    const date = archive.events.find(event => eventHasSubject(event, personId) && event.type === type)?.date;
    return date ? `${date.approximate ? 'око ' : ''}${date.year}${date.endYear !== undefined ? `–${date.endYear}` : ''}` : undefined;
  };
  const birth = year('birth');
  const death = year('death');
  if (birth && death) return `${birth} — ${death}`;
  if (birth) return `р. ${birth}`;
  if (death) return `прем. ${death}`;
  return undefined;
}

export const parentageLabels = {
  biological: 'Биолошко родитељство',
  adoptive: 'Усвојитељско родитељство',
  other: 'Друго родитељство',
} as const;
export const partnershipLabels = {
  married: 'Брак', partners: 'Партнерство', unspecified: 'Забележена веза',
} as const;

export function relatives(archive: FamilyArchive, personId: string) {
  const result: { person: Person; label: string; key: string; relationship: RelationshipRef }[] = [];
  const add = (id: string, label: string, ref: RelationshipRef) => {
    const person = archive.people.find(person => person.id === id);
    if (person) result.push({ person, label, key: `${ref.type}:${ref.id}`, relationship: ref });
  };
  archive.parentChildRelationships.forEach(relation => {
    const suffix = relation.kind === 'adoptive' ? ' · усвојење' : relation.kind === 'other' ? ' · друга веза' : '';
    if (relation.childId === personId) add(relation.parentId, `Родитељ${suffix}`, { type: 'parentChild', id: relation.id });
    if (relation.parentId === personId) add(relation.childId, `Дете${suffix}`, { type: 'parentChild', id: relation.id });
  });
  archive.partnerships.forEach(partnership => {
    if (partnership.personIds.includes(personId)) {
      add(partnership.personIds.find(id => id !== personId)!, partnershipLabels[partnership.kind], { type: 'partnership', id: partnership.id });
    }
  });
  archive.kinshipAssertions.forEach(relation => {
    if (relation.personIds.includes(personId)) add(relation.personIds.find(id => id !== personId)!, relation.label, { type: 'kinship', id: relation.id });
  });
  return result;
}

export function searchPeople(people: Person[], query: string) {
  const normalize = (value: string) => value.normalize('NFC').toLocaleLowerCase('sr').trim();
  const needle = normalize(query);
  return people.filter(person => normalize(`${personLabel(person)} ${person.nickname || ''} ${person.maidenName || ''} ${(person.aliases || []).join(' ')}`).includes(needle));
}
