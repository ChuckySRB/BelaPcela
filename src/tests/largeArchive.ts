import type { FamilyArchive } from '../domain/model';
export function largeArchive(count: number): FamilyArchive {
  return {
    id: `scale-${count}`, name: `Провера · ${count} особа`,
    people: Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `Особа ${i}` })),
    parentChildRelationships: Array.from({ length: count - 1 }, (_, i) => ({ id: `r${i + 1}`, parentId: `p${Math.floor(i / 2)}`, childId: `p${i + 1}`, kind: 'biological' as const })),
    partnerships: [], kinshipAssertions: [], events: [], places: [], media: [], sources: [],
  };
}
