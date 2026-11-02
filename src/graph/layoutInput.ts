import type { GraphProjection } from './types';
export const layoutInput = (projection: GraphProjection) => {
  // A tree layout is safe only when every visual node has at most one incoming edge
  // and the directed graph is acyclic. Multi-parent hubs keep layered placement.
  const incoming = new Map(projection.nodes.map(node => [node.id, 0]));
  const children = new Map<string, string[]>();
  for (const edge of projection.edges) { incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1); children.set(edge.source, [...(children.get(edge.source) || []), edge.target]); }
  const queue = [...incoming].filter(([, degree]) => degree === 0).map(([id]) => id);
  const singleParent = [...incoming.values()].every(degree => degree <= 1);
  for (let i = 0; i < queue.length; i++) for (const child of children.get(queue[i]) || []) { incoming.set(child, incoming.get(child)! - 1); if (!incoming.get(child)) queue.push(child); }
  const tree = projection.nodes.length > 250 && singleParent && queue.length === projection.nodes.length;
  return {
  id: 'family-archive',
  layoutOptions: {
    'elk.algorithm': tree ? 'mrtree' : 'layered', 'elk.direction': 'DOWN', 'elk.edgeRouting': 'ORTHOGONAL',
    'elk.spacing.nodeNode': '36', 'elk.layered.spacing.nodeNodeBetweenLayers': '46',
    'elk.layered.nodePlacement.strategy': projection.nodes.length > 250 ? 'BRANDES_KOEPF' : 'NETWORK_SIMPLEX',
    ...(projection.nodes.length > 250 ? { 'elk.layered.layering.strategy': 'LONGEST_PATH', 'elk.layered.thoroughness': '1' } : {}),
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    'elk.separateConnectedComponents': 'true', 'elk.spacing.componentComponent': '72',
    'elk.padding': '[top=20,left=20,bottom=20,right=20]',
  },
  children: projection.nodes.map(node => ({ id: node.id, width: node.width, height: node.height })),
  edges: projection.edges.map(edge => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })),
}; };
