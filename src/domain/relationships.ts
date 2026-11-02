import type { FamilyArchive, RelationshipRecord, RelationshipRef } from './model';
import { parentageLabels, partnershipLabels, personLabel } from './people';

export const relationshipCollections = { parentChild: 'parentChildRelationships', partnership: 'partnerships', kinship: 'kinshipAssertions' } as const;
export function getRelationship(archive: FamilyArchive, ref: RelationshipRef): RelationshipRecord | undefined {
  if (ref.type === 'parentChild') { const record = archive.parentChildRelationships.find(item => item.id === ref.id); return record ? { type: ref.type, record } : undefined; }
  if (ref.type === 'partnership') { const record = archive.partnerships.find(item => item.id === ref.id); return record ? { type: ref.type, record } : undefined; }
  const record = archive.kinshipAssertions.find(item => item.id === ref.id); return record ? { type: ref.type, record } : undefined;
}

/** Stable across property ordering; protects a reviewed change after a stale-window reload. */
export function relationshipVersion(relationship: RelationshipRecord): string {
  const { record } = relationship;
  const details = relationship.type === 'parentChild' ? [relationship.record.parentId, relationship.record.childId, relationship.record.kind]
    : relationship.type === 'partnership' ? [relationship.record.personIds, relationship.record.kind, relationship.record.fromYear]
      : [relationship.record.personIds, relationship.record.label];
  return JSON.stringify([relationship.type, record.id, record.createdAt, record.updatedAt, ...details]);
}

export function describeRelationship(archive: FamilyArchive, relationship: RelationshipRecord) {
  const name = (id: string) => personLabel(archive.people.find(person => person.id === id));
  if (relationship.type === 'parentChild') return { title: 'Родитељство', people: `${name(relationship.record.parentId)} → ${name(relationship.record.childId)}`, detail: parentageLabels[relationship.record.kind] };
  return {
    title: relationship.type === 'partnership' ? 'Партнерска веза' : 'Сродничка веза',
    people: relationship.record.personIds.map(name).join(' ↔ '),
    detail: relationship.type === 'kinship' ? relationship.record.label : `${partnershipLabels[relationship.record.kind]}${relationship.record.fromYear !== undefined ? ` · од ${relationship.record.fromYear}.` : ''}`,
  };
}
