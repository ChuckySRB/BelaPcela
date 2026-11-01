import { describe, expect, it } from 'vitest';
import { demoArchive } from '../domain/fixtures';
import type { FamilyArchive } from '../domain/model';
import { GraphProjectionService } from '../graph/GraphProjectionService';
import { ElkLayoutService } from '../graph/ElkLayoutService';

const service = new GraphProjectionService();
const whole = { mode: 'whole' as const, focusPersonId: 'nikola', collapsedBranches: [] };

describe('genealogy projection', () => {
  it('includes disconnected people and keeps virtual hubs out of canonical people', () => {
    const projection = service.project(demoArchive, whole);
    expect(projection.visiblePersonIds).toHaveLength(11);
    expect(projection.disconnectedPersonIds).toEqual(['danica']);
    expect(projection.nodes.filter(node => node.kind === 'person')).toHaveLength(demoArchive.people.length);
    expect(projection.nodes.filter(node => node.kind === 'family')).toHaveLength(4);
    expect(new Set(projection.nodes.map(node => node.id)).size).toBe(projection.nodes.length);
    expect(demoArchive.people.every(person => !person.id.startsWith('family:'))).toBe(true);
  });

  it('groups children by explicit parents across multiple partnerships', () => {
    const { groups } = service.project(demoArchive, whole);
    expect(groups.find(group => group.parentIds.join(',') === 'ana,nikola')?.childIds).toEqual(['luka', 'sara']);
    expect(groups.find(group => group.parentIds.join(',') === 'jelena,nikola')?.childIds).toEqual(['mia']);
    const unknownParent = groups.find(group => group.parentIds.join(',') === 'vera')!;
    expect(unknownParent.childIds).toEqual(['iva']);
    expect(unknownParent.partnershipIds).toEqual([]);
  });

  it('does not infer marriage or assign a child to another partner', () => {
    const archive: FamilyArchive = {
      ...demoArchive,
      people: [{ id: 'a' }, { id: 'b' }, { id: 'partner' }, { id: 'child' }],
      partnerships: [{ id: 'p', personIds: ['a', 'partner'], kind: 'partners' }],
      parentChildRelationships: [
        { id: 'r1', parentId: 'a', childId: 'child', kind: 'biological' },
        { id: 'r2', parentId: 'b', childId: 'child', kind: 'biological' },
      ],
    };
    const { groups } = service.project(archive, whole);
    expect(groups.find(group => group.childIds.includes('child'))).toMatchObject({ parentIds: ['a', 'b'], partnershipIds: [] });
    expect(groups.find(group => group.partnershipIds.includes('p'))?.childIds).toEqual([]);
  });

  it('distinguishes adoptive parentage by a kind and a textual label', () => {
    const projection = service.project(demoArchive, whole);
    expect(projection.edges.find(edge => edge.target === 'person:sara')).toMatchObject({ kind: 'adoptive', label: 'Усвојитељско родитељство', relationshipIds: ['n-s', 'a-s'] });
  });

  it('traverses all connected generations, partners, and direct kinship assertions', () => {
    const archive: FamilyArchive = {
      ...demoArchive,
      people: [...Array.from({ length: 30 }, (_, i) => ({ id: `p${i}` })), { id: 'partner' }, { id: 'sibling' }, { id: 'unrelated' }],
      parentChildRelationships: Array.from({ length: 29 }, (_, i) => ({ id: `r${i}`, parentId: `p${i}`, childId: `p${i + 1}`, kind: 'biological' })),
      partnerships: [{ id: 'partnership', personIds: ['p15', 'partner'], kind: 'partners' }],
      kinshipAssertions: [{ id: 'sibling-assertion', personIds: ['p29', 'sibling'], label: 'Сродство' }],
    };
    const result = service.project(archive, { ...whole, mode: 'focused', focusPersonId: 'p15' });
    expect(result.visiblePersonIds).toHaveLength(32);
    expect(result.visiblePersonIds).toContain('p0');
    expect(result.visiblePersonIds).toContain('p29');
    expect(result.visiblePersonIds).toContain('partner');
    expect(result.visiblePersonIds).toContain('sibling');
    expect(result.visiblePersonIds).not.toContain('unrelated');
    expect(service.connectedPeople(archive, 'missing').size).toBe(0);
  });

  it('shows a disconnected focused person as a valid one-person graph', () => {
    const projection = service.project(demoArchive, { ...whole, mode: 'focused', focusPersonId: 'danica' });
    expect(projection.visiblePersonIds).toEqual(['danica']);
    expect(projection.edges).toEqual([]);
  });
});

describe('ELK layout adapter', () => {
  it('places all portraits without overlap and without mutating the projection', async () => {
    const projection = service.project(demoArchive, whole);
    const before = JSON.stringify(projection);
    const layout = await new ElkLayoutService().layout(projection);
    expect(JSON.stringify(projection)).toBe(before);
    expect(layout).toHaveLength(projection.nodes.length);
    layout.forEach(node => { expect(Number.isFinite(node.x)).toBe(true); expect(Number.isFinite(node.y)).toBe(true); });
    const people = layout.filter(node => node.kind === 'person');
    for (const a of people) for (const b of people) {
      if (a.id >= b.id) continue;
      expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
    }
  });
});
