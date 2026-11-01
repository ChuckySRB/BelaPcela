import type { FamilyArchive } from '../domain/model';
import { parentageLabels } from '../domain/people';
import type { FamilyGroup, GraphProjection, GraphViewState, VisualEdge } from './types';
import { HUB_SIZE, PORTRAIT_SIZE } from './types';
import { branchVisibility } from './branchVisibility';

export class GraphProjectionService {
  /** Iterative traversal of the entire connected network; deliberately no depth limit. */
  connectedPeople(archive: FamilyArchive, focusId: string): Set<string> {
    const adjacency = this.adjacency(archive);
    if (!adjacency.has(focusId)) return new Set();
    const visited = new Set([focusId]);
    const queue = [focusId];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      for (const neighbor of adjacency.get(queue[cursor]) || []) {
        if (!visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); }
      }
    }
    return visited;
  }

  private adjacency(archive: FamilyArchive) {
    const result = new Map(archive.people.map(person => [person.id, new Set<string>()]));
    const link = (a: string, b: string) => {
      if (result.has(a) && result.has(b)) { result.get(a)!.add(b); result.get(b)!.add(a); }
    };
    archive.parentChildRelationships.forEach(relation => link(relation.parentId, relation.childId));
    archive.partnerships.forEach(relation => link(...relation.personIds));
    archive.kinshipAssertions.forEach(relation => link(...relation.personIds));
    return result;
  }

  project(archive: FamilyArchive, state: GraphViewState): GraphProjection {
    const visible = state.mode === 'whole'
      ? new Set(archive.people.map(person => person.id))
      : this.connectedPeople(archive, state.focusPersonId);
    const groupsByParents = new Map<string, FamilyGroup>();
    const ensureGroup = (parentIds: string[]) => {
      const sorted = [...parentIds].sort();
      const key = JSON.stringify(sorted);
      if (!groupsByParents.has(key)) groupsByParents.set(key, {
        id: `family:${key}`, parentIds: sorted, childIds: [], partnershipIds: [], relationshipIds: [],
      });
      return groupsByParents.get(key)!;
    };

    // A child is grouped by its explicit parents, never by a parent's current partner.
    const byChild = new Map<string, typeof archive.parentChildRelationships>();
    for (const relation of archive.parentChildRelationships) {
      if (!visible.has(relation.parentId) || !visible.has(relation.childId)) continue;
      byChild.set(relation.childId, [...(byChild.get(relation.childId) || []), relation]);
    }
    for (const [childId, relations] of byChild) {
      const group = ensureGroup([...new Set(relations.map(relation => relation.parentId))]);
      group.childIds.push(childId);
      group.relationshipIds.push(...relations.map(relation => relation.id));
    }
    for (const partnership of archive.partnerships) {
      if (partnership.personIds.every(id => visible.has(id))) {
        ensureGroup(partnership.personIds).partnershipIds.push(partnership.id);
      }
    }
    const groups = [...groupsByParents.values()];
    const { hidden, branches } = branchVisibility(archive, groups, visible, state);
    const visiblePersonIds = archive.people.filter(person => visible.has(person.id) && !hidden.has(person.id)).map(person => person.id);
    const renderedPeople = new Set(visiblePersonIds);
    const renderedGroups = groups.filter(group => group.parentIds.some(id => renderedPeople.has(id)) && (
      group.childIds.some(id => renderedPeople.has(id)) || group.partnershipIds.length || branches[group.id].collapsed
    ));
    const edges: VisualEdge[] = [];
    for (const group of groups) {
      group.parentIds.forEach(parentId => edges.push({
        id: `${group.id}:parent:${parentId}`, source: `person:${parentId}`, target: group.id,
        groupId: group.id, relationshipIds: group.relationshipIds, kind: 'connection',
      }));
      group.childIds.forEach(childId => {
        const relations = byChild.get(childId)!;
        // Mixed parentage remains explicit in the relationship inspector.
        const kinds = [...new Set(relations.map(relation => relation.kind))];
        const kind = kinds.length === 1 ? kinds[0] : 'other';
        edges.push({
          id: `${group.id}:child:${childId}`, source: group.id, target: `person:${childId}`,
          groupId: group.id, relationshipIds: relations.map(relation => relation.id), kind,
          label: kinds.some(kind => kind !== 'biological') ? kinds.map(kind => parentageLabels[kind]).join(' / ') : undefined,
        });
      });
    }
    archive.kinshipAssertions.forEach(assertion => {
      if (assertion.personIds.every(id => visible.has(id))) edges.push({
        id: `assertion:${assertion.id}`, source: `person:${assertion.personIds[0]}`, target: `person:${assertion.personIds[1]}`,
        kind: 'assertion', label: assertion.label, relationshipIds: [assertion.id],
      });
    });
    const adjacency = this.adjacency(archive);
    return {
      nodes: [
        ...visiblePersonIds.map(personId => ({ id: `person:${personId}`, kind: 'person' as const, personId, ...PORTRAIT_SIZE })),
        ...renderedGroups.map(group => ({ id: group.id, kind: 'family' as const, group, ...HUB_SIZE })),
      ], edges: edges.filter(edge => {
        const exists = (id: string) => id.startsWith('person:') ? renderedPeople.has(id.slice(7)) : renderedGroups.some(group => group.id === id);
        return exists(edge.source) && exists(edge.target);
      }), groups, visiblePersonIds, branches,
      hiddenPersonIds: archive.people.filter(person => hidden.has(person.id)).map(person => person.id),
      disconnectedPersonIds: visiblePersonIds.filter(id => adjacency.get(id)?.size === 0),
    };
  }
}
