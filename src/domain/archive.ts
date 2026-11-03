import type { FamilyArchive } from './model';
import { DomainError, validateArchive } from './validation';

/** A new collection starts without demonstration records or shared references. */
export function createEmptyArchive(name: string): FamilyArchive {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 200) throw new DomainError('Унесите назив збирке од 1 до 200 знакова.');
  return validateArchive({
    id: crypto.randomUUID(), name: trimmed,
    people: [], parentChildRelationships: [], partnerships: [], kinshipAssertions: [],
    events: [], places: [], media: [], sources: [],
  });
}
