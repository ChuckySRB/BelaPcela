import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode } from 'elkjs/lib/elk-api';
self.onmessage = (event: MessageEvent<ElkNode>) => {
  void new ELK().layout(event.data).then(result => self.postMessage({ result })).catch(() => self.postMessage({ error: true }));
};
