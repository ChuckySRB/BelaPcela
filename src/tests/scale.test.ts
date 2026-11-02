import { describe, expect, it } from 'vitest';
import { GraphProjectionService } from '../graph/GraphProjectionService';
import { validateArchive } from '../domain/validation';
import { largeArchive } from './largeArchive';
import { ElkLayoutService } from '../graph/ElkLayoutService';
import { layoutInput } from '../graph/layoutInput';

describe('large connected collections', () => {
  it('retains layered placement for large multi-parent networks', () => {
    const archive = largeArchive(500); archive.parentChildRelationships.push({ id: 'second-parent', parentId: 'p5', childId: 'p10', kind: 'adoptive' });
    const projection = new GraphProjectionService().project(validateArchive(archive), { mode: 'whole', focusPersonId: 'p0', collapsedBranches: [] });
    expect(layoutInput(projection).layoutOptions['elk.algorithm']).toBe('layered');
    expect(projection.visiblePersonIds).toHaveLength(500);
  });
  it('positions all 1200 people and their hubs with the production large-graph strategy', async () => {
    const projection = new GraphProjectionService().project(largeArchive(1200), { mode: 'whole', focusPersonId: 'p0', collapsedBranches: [] });
    const start = performance.now(); const positioned = await new ElkLayoutService().layout(projection);
    expect(positioned).toHaveLength(projection.nodes.length);
    expect(positioned.every(node => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
    const positions = new Map(positioned.map(node => [node.id, node]));
    expect(projection.edges.every(edge => positions.get(edge.target)!.y >= positions.get(edge.source)!.y + positions.get(edge.source)!.height)).toBe(true);
    console.info(`1200-person ELK layout: ${Math.round(performance.now() - start)} ms`);
  }, 30000);
  for (const count of [10, 100, 500, 1200]) it(`validates, focuses and collapses ${count} people without truncating data`, () => {
    const start = performance.now(); const archive = validateArchive(largeArchive(count)); const service = new GraphProjectionService();
    const projection = service.project(archive, { mode: 'focused', focusPersonId: 'p0', collapsedBranches: [] });
    expect(projection.visiblePersonIds).toHaveLength(count);
    const root = projection.groups.find(group => group.parentIds.includes('p0'))!;
    const collapsed = service.project(archive, { mode: 'focused', focusPersonId: 'p0', collapsedBranches: [root.id] });
    expect(collapsed.visiblePersonIds).toEqual(['p0']); expect(collapsed.hiddenPersonIds).toHaveLength(count - 1);
    expect(archive.people).toHaveLength(count); expect(service.project(archive, { mode: 'whole', focusPersonId: 'p0', collapsedBranches: [] }).visiblePersonIds).toHaveLength(count);
    expect(performance.now() - start).toBeLessThan(2000);
  });
});
