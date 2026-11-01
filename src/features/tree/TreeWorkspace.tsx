import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Background, BackgroundVariant, MiniMap, Panel, ReactFlow, ReactFlowProvider, useReactFlow, type Node, type Viewport } from '@xyflow/react';
import { Crosshair, Expand, Map, Minus, Plus, RotateCcw, GitBranch, MousePointer2, UserRound } from 'lucide-react';
import type { FamilyArchive } from '../../domain/model';
import type { UiState, UiAction } from '../../app/uiState';
import { personLabel } from '../../domain/people';
import { GraphProjectionService } from '../../graph/GraphProjectionService';
import { ElkLayoutService } from '../../graph/ElkLayoutService';
import { GraphActionsContext } from '../../graph/GraphActions';
import { PortraitPersonNode, type PersonFlowNode } from '../../graph/PortraitPersonNode';
import { FamilyHexHub, type FamilyFlowNode } from '../../graph/FamilyHexHub';
import { RelationshipEdge, type RelationshipFlowEdge } from '../../graph/RelationshipEdge';
import type { PositionedNode } from '../../graph/types';
import { PersonInspector, type PersonActions } from './PersonDetails';
import { FamilyInspector } from './FamilyInspector';

const projectionService = new GraphProjectionService();
const layoutService = new ElkLayoutService();
const nodeTypes = { person: PortraitPersonNode, family: FamilyHexHub };
const edgeTypes = { relationship: RelationshipEdge };
type FlowNode = PersonFlowNode | FamilyFlowNode;
type WorkspaceProps = { archive: FamilyArchive; ui: UiState; dispatch: (action: UiAction) => void; actions: PersonActions; active: boolean };

function Canvas({ archive, ui, dispatch, actions, active }: WorkspaceProps) {
  const flow = useReactFlow<FlowNode, RelationshipFlowEdge>();
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 0.72 });
  const [positioned, setPositioned] = useState<PositionedNode[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [minimap, setMinimap] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const fittedVersion = useRef(0);
  const defaultView = useRef<Viewport | null>(null);
  const layoutContext = useRef({ positioned, viewport, selectedId: ui.selectedPersonId, focusId: ui.focusPersonId });
  layoutContext.current = { positioned, viewport, selectedId: ui.selectedPersonId, focusId: ui.focusPersonId };
  const lastViewKey = useRef('');
  const pendingViewport = useRef<Viewport | null>(null);
  const graphState = useMemo(() => ({ mode: ui.mode, focusPersonId: ui.focusPersonId, collapsedBranches: ui.collapsedBranches }), [ui.mode, ui.focusPersonId, ui.collapsedBranches]);
  const projection = useMemo(() => projectionService.project(archive, graphState), [archive, graphState]);
  const layoutProjection = useMemo(() => projectionService.project(archive, { ...graphState, collapsedBranches: [] }), [archive, graphState.mode, graphState.focusPersonId]);
  const viewKey = `${ui.mode}:${ui.focusPersonId}`;
  const layoutSignature = JSON.stringify({ viewKey, nodes: layoutProjection.nodes.map(node => node.id), edges: layoutProjection.edges.map(edge => [edge.id, edge.source, edge.target]) });

  useEffect(() => {
    let cancelled = false;
    const context = layoutContext.current;
    const explicitViewChange = lastViewKey.current !== viewKey;
    lastViewKey.current = viewKey;
    setStatus('loading');
    layoutService.layout(layoutProjection).then(nodes => {
      if (cancelled) return;
      const anchorId = context.positioned.some(node => node.personId === context.selectedId) ? context.selectedId : context.focusId;
      const previousAnchor = context.positioned.find(node => node.personId === anchorId);
      const nextAnchor = nodes.find(node => node.personId === anchorId);
      pendingViewport.current = !explicitViewChange && previousAnchor && nextAnchor ? {
        ...context.viewport,
        x: context.viewport.x + (previousAnchor.x - nextAnchor.x) * context.viewport.zoom,
        y: context.viewport.y + (previousAnchor.y - nextAnchor.y) * context.viewport.zoom,
      } : null;
      setPositioned(nodes); setStatus('ready'); setLayoutVersion(version => version + 1);
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [layoutSignature, retry]);

  const nodes = useMemo<FlowNode[]>(() => positioned.filter(node => projection.nodes.some(current => current.id === node.id)).map(node => ({
    id: node.id, type: node.kind, position: { x: node.x, y: node.y },
    width: node.width, height: node.height,
    data: node.kind === 'person' ? { personId: node.personId!, focused: node.personId === ui.focusPersonId } : { group: projection.groups.find(group => group.id === node.id)!, branch: projection.branches[node.id] },
    selected: node.kind === 'person' && node.personId === ui.selectedPersonId,
    draggable: false, selectable: false, focusable: false,
    // Native child buttons own interaction inside an otherwise inert Flow wrapper.
    style: { pointerEvents: 'all' },
  } as FlowNode)), [positioned, projection, ui.focusPersonId, ui.selectedPersonId]);
  const edges = useMemo<RelationshipFlowEdge[]>(() => projection.edges.map(edge => ({
    ...edge, type: 'relationship', data: { relation: edge },
    ariaLabel: edge.label || 'Породична веза',
    focusable: false, selectable: false,
  })), [projection]);

  // Layout changes are explicit. Selection and inspector state never trigger fitView.
  useEffect(() => {
    if (!active || !layoutVersion || fittedVersion.current === layoutVersion || status !== 'ready') return;
    const frame = requestAnimationFrame(() => {
      const anchored = pendingViewport.current;
      pendingViewport.current = null;
      void (anchored ? flow.setViewport(anchored, { duration: 0 }) : flow.fitView({ padding: 0.12, maxZoom: 0.88, duration: 0 })).then(() => {
        defaultView.current = flow.getViewport();
        fittedVersion.current = layoutVersion;
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [layoutVersion, flow, status, active]);

  const graphActions = useMemo(() => ({ ...actions, archive, inspectFamily: (id: string) => dispatch({ type: 'inspect-family', groupId: id }), toggleBranch: (id: string) => dispatch({ type: 'toggle-branch', groupId: id }) }), [actions, archive, dispatch]);
  const fit = () => void flow.fitView({ padding: 0.12, maxZoom: 0.88, duration: 0 });
  const openEdge = (edge: RelationshipFlowEdge) => {
    if (edge.data?.relation.groupId) dispatch({ type: 'inspect-family', groupId: edge.data.relation.groupId });
  };
  return <GraphActionsContext.Provider value={graphActions}>
    <div className="graph-area" data-testid="graph-canvas" data-focus-person={ui.focusPersonId} data-mode={ui.mode}
      style={{ '--bp-graph-zoom': viewport.zoom } as CSSProperties}
      data-viewport={`${viewport.x.toFixed(3)},${viewport.y.toFixed(3)},${viewport.zoom.toFixed(3)}`} aria-label="Породично стабло">
      {status === 'loading' && <div className="canvas-notice" role="status">Размештамо породичне приче…</div>}
      {status === 'error' && <div className="canvas-notice" role="alert">Стабло није могло да се прикаже.<button className="button" onClick={() => setRetry(value => value + 1)}>Покушај поново</button></div>}
      <ReactFlow<FlowNode, RelationshipFlowEdge> nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        viewport={viewport} onViewportChange={setViewport} nodesDraggable={false} nodesConnectable={false}
        elementsSelectable={false} nodesFocusable={false} edgesFocusable={false} deleteKeyCode={null}
        zoomOnDoubleClick={false} minZoom={0.25} maxZoom={1.6} onEdgeClick={(_, edge) => openEdge(edge)}
        ariaLabelConfig={{ 'minimap.ariaLabel': 'Мала мапа стабла', 'edge.a11yDescription.default': 'Притисните Enter за податке о вези.' }}>
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--bp-canvas-dot)" />
        <Panel position="top-left" className="canvas-context"><span className="tiny-status-dot" /><span>{projection.visiblePersonIds.length} особа у приказу</span><span className="canvas-context-divider">/</span><span>{ui.mode === 'whole' ? 'Цела збирка' : 'Повезана породица'}</span>{projection.hiddenPersonIds.length > 0 && <span>· скривено {projection.hiddenPersonIds.length}</span>}</Panel>
        <Panel position="bottom-right" className="canvas-controls"><button className="icon-button" aria-label="Увећај" onClick={() => void flow.zoomIn()}><Plus size={18} /></button><output aria-label="Увећање">{Math.round(viewport.zoom * 100)}%</output><button className="icon-button" aria-label="Умањи" onClick={() => void flow.zoomOut()}><Minus size={18} /></button><span className="control-divider" /><button className="icon-button" aria-label="Уклопи приказ" title="Уклопи приказ" onClick={fit}><Expand size={17} /></button><button className="icon-button" aria-label="Врати почетни поглед" title="Врати почетни поглед" onClick={() => { if (defaultView.current) void flow.setViewport(defaultView.current); }}><RotateCcw size={17} /></button><button className="icon-button" aria-label="Прикажи малу мапу" title="Мала мапа" aria-pressed={minimap} onClick={() => setMinimap(value => !value)}><Map size={17} /></button></Panel>
        {minimap && <MiniMap position="top-right" pannable zoomable nodeColor={(node: Node) => node.type === 'family' ? 'var(--bp-brass)' : 'var(--bp-sage)'} maskColor="var(--bp-map-mask)" />}
      </ReactFlow>
      {!!projection.disconnectedPersonIds.length && <div className="unconnected-note"><UserRound size={16} /><span>Неповезане особе</span>{projection.disconnectedPersonIds.map(id => <button key={id} onClick={() => actions.selectPerson(id)}>{personLabel(archive.people.find(person => person.id === id)!)}</button>)}</div>}
    </div>
  </GraphActionsContext.Provider>;
}

export function TreeWorkspace(props: WorkspaceProps) {
  const { archive, ui, dispatch, actions } = props;
  const selected = ui.inspector?.kind === 'person' ? archive.people.find(person => person.id === ui.inspector?.id) : undefined;
  // Inspector groups are independent of the currently filtered graph.
  const fullProjection = useMemo(() => projectionService.project(archive, { mode: 'whole', focusPersonId: ui.focusPersonId, collapsedBranches: ui.collapsedBranches }), [archive, ui.focusPersonId, ui.collapsedBranches]);
  const group = ui.inspector?.kind === 'family' ? fullProjection.groups.find(group => group.id === ui.inspector?.id) : undefined;
  const focusName = personLabel(archive.people.find(person => person.id === ui.focusPersonId)!);
  return <main className={`tree-workspace ${selected || group ? 'has-inspector' : ''}`} id="main-content">
    <section className="tree-main" aria-labelledby="tree-title">
      <h1 id="tree-title" className="sr-only" tabIndex={-1}>Породично стабло</h1>
      <div className="tree-toolbar"><div className="mode-switch" role="group" aria-label="Режим стабла"><button aria-pressed={ui.mode === 'whole'} onClick={() => dispatch({ type: 'mode', mode: 'whole' })}><GitBranch size={16} />Цело стабло</button><button aria-pressed={ui.mode === 'focused'} onClick={() => dispatch({ type: 'mode', mode: 'focused' })}><Crosshair size={16} />Фокусирано</button></div><span className="focus-context" title={`Централна особа: ${focusName}`}><Crosshair size={14} /><span>{focusName}</span></span></div>
      <ReactFlowProvider><Canvas {...props} /></ReactFlowProvider>
      {ui.collapsedBranches.length > 0 && <div className="collapsed-branches-bar"><span>Склопљене гране: {ui.collapsedBranches.length}</span><button className="text-button" onClick={() => dispatch({ type: 'expand-all' })}>Прикажи све гране</button></div>}
      <footer className="canvas-footer"><div className="graph-legend" aria-label="Легенда веза"><span><i className="legend-line" />Родитељство</span><span><i className="legend-line legend-line--dashed" />Усвојење / друга веза</span></div><span className="canvas-hint"><MousePointer2 size={13} />Превуци за померање · точкић за увећање</span></footer>
    </section>
    {selected && <PersonInspector person={selected} archive={archive} actions={actions} hiddenInBranch={fullProjection.hiddenPersonIds.includes(selected.id)} onReveal={() => dispatch({ type: 'expand-all' })} focused={selected.id === ui.focusPersonId} onClose={() => dispatch({ type: 'close-inspector' })} />}
    {group && <FamilyInspector group={group} archive={archive} branch={fullProjection.branches[group.id]} onToggleBranch={() => dispatch({ type: 'toggle-branch', groupId: group.id })} selectPerson={actions.selectPerson} onClose={() => dispatch({ type: 'close-inspector' })} />}
  </main>;
}
