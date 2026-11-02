import type { ElkNode } from 'elkjs/lib/elk-api';
import type { GraphProjection, LayoutService, PositionedNode } from './types';
import { layoutInput } from './layoutInput';

/** ELK owns placement only; the canonical archive never receives coordinates or hubs. */
export class ElkLayoutService implements LayoutService {
  private cancel?: () => void;

  async layout(projection: GraphProjection): Promise<PositionedNode[]> {
    this.cancel?.();
    if (!projection.nodes.length) return [];
    const input = layoutInput(projection);
    let result: ElkNode;
    if (typeof Worker === 'undefined') {
      const { default: ELK } = await import('elkjs/lib/elk.bundled.js'); result = await new ELK().layout(input);
    } else result = await new Promise<ElkNode>((resolve, reject) => {
      const worker = new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' });
      const finish = () => { clearTimeout(timer); worker.terminate(); if (this.cancel === cancel) this.cancel = undefined; };
      const cancel = () => { finish(); reject(new Error('Layout superseded.')); };
      const timer = setTimeout(() => { finish(); reject(new Error('Layout timed out.')); }, 60_000);
      this.cancel = cancel;
      worker.onmessage = (event: MessageEvent<{ result?: ElkNode }>) => { finish(); if (event.data.result) resolve(event.data.result); else reject(new Error('Layout failed.')); };
      worker.onerror = () => { finish(); reject(new Error('Layout worker failed.')); };
      worker.postMessage(input);
    });
    const positions = new Map(result.children?.map(node => [node.id, node]));
    return projection.nodes.map(node => ({ ...node, x: positions.get(node.id)?.x || 0, y: positions.get(node.id)?.y || 0 }));
  }
}
