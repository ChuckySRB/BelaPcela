import ELK from 'elkjs/lib/elk.bundled.js';
import type { GraphProjection, LayoutService, PositionedNode } from './types';

/** ELK owns placement only; the canonical archive never receives coordinates or hubs. */
export class ElkLayoutService implements LayoutService {
  private elk = new ELK();

  async layout(projection: GraphProjection): Promise<PositionedNode[]> {
    if (!projection.nodes.length) return [];
    const result = await this.elk.layout({
      id: 'family-archive',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.spacing.nodeNode': '36',
        'elk.layered.spacing.nodeNodeBetweenLayers': '46',
        'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        'elk.separateConnectedComponents': 'true',
        'elk.spacing.componentComponent': '72',
        'elk.padding': '[top=20,left=20,bottom=20,right=20]',
      },
      children: projection.nodes.map(node => ({ id: node.id, width: node.width, height: node.height })),
      edges: projection.edges.map(edge => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })),
    });
    const positions = new Map(result.children?.map(node => [node.id, node]));
    return projection.nodes.map(node => ({ ...node, x: positions.get(node.id)?.x || 0, y: positions.get(node.id)?.y || 0 }));
  }
}
