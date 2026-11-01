import type { FamilyArchive } from '../domain/model';
import type { FamilyGroup, GraphViewState } from './types';

export interface BranchSummary { collapsed: boolean; descendantCount: number; hiddenCount: number }

/** Collapse hides only recorded descendants, never invented people or partner records.
 * The focused person and their ancestry remain visible. Nested collapse choices are retained.
 */
export function branchVisibility(archive: FamilyArchive, groups: FamilyGroup[], baseIds: Set<string>, state: GraphViewState) {
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  archive.parentChildRelationships.forEach(({ parentId, childId }) => {
    children.set(parentId, [...(children.get(parentId) || []), childId]);
    parents.set(childId, [...(parents.get(childId) || []), parentId]);
  });
  const traverse = (roots: string[], adjacency: Map<string, string[]>) => {
    const seen = new Set(roots);
    const queue = [...roots];
    for (let i = 0; i < queue.length; i++) for (const id of adjacency.get(queue[i]) || []) {
      if (!seen.has(id)) { seen.add(id); queue.push(id); }
    }
    return seen;
  };
  const protectedIds = traverse([state.focusPersonId], parents);
  const candidates = new Map(groups.map(group => [group.id,
    [...traverse(group.childIds, children)].filter(id => baseIds.has(id) && !protectedIds.has(id) && !group.parentIds.includes(id)),
  ]));
  const collapsed = new Set(state.collapsedBranches);
  const hidden = new Set<string>();
  for (const group of groups) if (collapsed.has(group.id)) candidates.get(group.id)!.forEach(id => hidden.add(id));
  const branches: Record<string, BranchSummary> = {};
  for (const group of groups) {
    const ids = candidates.get(group.id)!;
    branches[group.id] = { collapsed: collapsed.has(group.id), descendantCount: ids.length, hiddenCount: ids.filter(id => hidden.has(id)).length };
  }
  return { hidden, branches };
}
