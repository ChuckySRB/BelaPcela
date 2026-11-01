import { useEffect, useMemo, useRef, useState } from 'react';
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
type WorkspaceProps = { archive: FamilyArchive; ui: UiState; dispatch: (action: UiAction) => void; actions: PersonActions };

function Canvas({ archive, ui, dispatch, actions }: WorkspaceProps) {
  const flow = useReactFlow<FlowNode, RelationshipFlowEdge>();
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 0.72 });
  const [positioned, setPositioned] = useState<PositionedNode[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [minimap, setMinimap] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const fittedVersion = useRef(0);
  const defaultView = useRef<Viewport | null>(null);
  const graphState = useMemo(() => ({ mode: ui.mode, focusPersonId: ui.focusPersonId, collapsedBranches: ui.collapsedBranches }), [ui.mode, ui.focusPersonId, ui.collapsedBranches]);
  const projection = useMemo(() => projectionService.project(archive, graphState), [archive, graphState]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    layoutService.layout(projection).then(nodes => {
      if (cancelled) return;
      setPositioned(nodes); setStatus('ready'); setLayoutVersion(version => version + 1);
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [projection, retry]);

  const nodes = useMemo<FlowNode[]>(() => positioned.map(node => ({
    id: node.id, type: node.kind, position: { x: node.x, y: node.y },
    width: node.width, height: node.height,
    data: node.kind === 'person' ? { personId: node.personId!, focused: node.personId === ui.focusPersonId } : { group: node.group! },
    selected: node.kind === 'person' && node.personId === ui.selectedPersonId,
    draggable: false, selectable: false, focusable: false,
    // Native child buttons own interaction inside an otherwise inert Flow wrapper.
    style: { pointerEvents: 'all' },
  } as FlowNode)), [positioned, ui.focusPersonId, ui.selectedPersonId]);
  const edges = useMemo<RelationshipFlowEdge[]>(() => projection.edges.map(edge => ({
    ...edge, type: 'relationship', data: { relation: edge },
    ariaLabel: edge.label || 'Породична веза',
    focusable: false, selectable: false,
  })), [projection]);

  // Layout changes are explicit. Selection and inspector state never trigger fitView.
  useEffect(() => {
    if (!layoutVersion || fittedVersion.current === layoutVersion || status !== 'ready') return;
    const frame = requestAnimationFrame(() => {
      void flow.fitView({ padding: 0.12, maxZoom: 0.88, duration: 0 }).then(() => {
        defaultView.current = flow.getViewport();
        fittedVersion.current = layoutVersion;
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [layoutVersion, flow, status]);

  const graphActions = useMemo(() => ({ ...actions, archive, inspectFamily: (id: string) => dispatch({ type: 'inspect-family', groupId: id }) }), [actions, archive, dispatch]);
  const fit = () => void flow.fitView({ padding: 0.12, maxZoom: 0.88, duration: 0 });
  const openEdge = (edge: RelationshipFlowEdge) => {
    if (edge.data?.relation.groupId) dispatch({ type: 'inspect-family', groupId: edge.data.relation.groupId });
  };
  return <GraphActionsContext.Provider value={graphActions}>
    <div className="graph-area" data-testid="graph-canvas" data-focus-person={ui.focusPersonId} data-mode={ui.mode}
      data-viewport={`${viewport.x.toFixed(3)},${viewport.y.toFixed(3)},${viewport.zoom.toFixed(3)}`} aria-label="Породично стабло">
      {status === 'loading' && <div className="canvas-notice" role="status">Размештамо породичне приче…</div>}
      {status === 'error' && <div className="canvas-notice" role="alert">Стабло није могло да се прикаже.<button className="button" onClick={() => setRetry(value => value + 1)}>Покушај поново</button></div>}
      <ReactFlow<FlowNode, RelationshipFlowEdge> nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        viewport={viewport} onViewportChange={setViewport} nodesDraggable={false} nodesConnectable={false}
        elementsSelectable={false} nodesFocusable={false} edgesFocusable={false} deleteKeyCode={null}
        zoomOnDoubleClick={false} minZoom={0.25} maxZoom={1.6} onEdgeClick={(_, edge) => openEdge(edge)}
        ariaLabelConfig={{ 'minimap.ariaLabel': 'Мала мапа стабла', 'edge.a11yDescription.default': 'Притисните Enter за податке о вези.' }}>
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#c8bda8" />
        <Panel position="top-left" className="canvas-context"><span className="tiny-status-dot" /><span>{projection.visiblePersonIds.length} особа у приказу</span><span className="canvas-context-divider">/</span><span>{ui.mode === 'whole' ? 'Цела збирка' : 'Повезана породица'}</span></Panel>
        <Panel position="bottom-right" className="canvas-controls"><button className="icon-button" aria-label="Увећај" onClick={() => void flow.zoomIn()}><Plus size={18} /></button><output aria-label="Увећање">{Math.round(viewport.zoom * 100)}%</output><button className="icon-button" aria-label="Умањи" onClick={() => void flow.zoomOut()}><Minus size={18} /></button><span className="control-divider" /><button className="icon-button" aria-label="Уклопи приказ" title="Уклопи приказ" onClick={fit}><Expand size={17} /></button><button className="icon-button" aria-label="Врати почетни поглед" title="Врати почетни поглед" onClick={() => { if (defaultView.current) void flow.setViewport(defaultView.current); }}><RotateCcw size={17} /></button><button className="icon-button" aria-label="Прикажи малу мапу" title="Мала мапа" aria-pressed={minimap} onClick={() => setMinimap(value => !value)}><Map size={17} /></button></Panel>
        {minimap && <MiniMap position="top-right" pannable zoomable nodeColor={(node: Node) => node.type === 'family' ? '#B59052' : '#728E77'} maskColor="rgba(247,243,234,.7)" />}
      </ReactFlow>
      {!!projection.disconnectedPersonIds.length && <div className="unconnected-note"><UserRound size={16} /><span>Неповезане особе</span>{projection.disconnectedPersonIds.map(id => <button key={id} onClick={() => actions.selectPerson(id)}>{personLabel(archive.people.find(person => person.id === id)!)}</button>)}</div>}
    </div>
  </GraphActionsContext.Provider>;
}

export function TreeWorkspace(props: WorkspaceProps) {
  const { archive, ui, dispatch, actions } = props;
  const selected = ui.inspector?.kind === 'person' ? archive.people.find(person => person.id === ui.inspector?.id) : undefined;
  // Inspector groups are independent of the currently filtered graph.
  const allGroups = useMemo(() => projectionService.project(archive, { mode: 'whole', focusPersonId: '', collapsedBranches: [] }).groups, [archive]);
  const group = ui.inspector?.kind === 'family' ? allGroups.find(group => group.id === ui.inspector?.id) : undefined;
  const focusName = personLabel(archive.people.find(person => person.id === ui.focusPersonId)!);
  return <main className={`tree-workspace ${ui.inspector ? 'has-inspector' : ''}`} id="main-content">
    <section className="tree-main" aria-labelledby="tree-title">
      <div className="workspace-heading"><div><div className="eyebrow"><span className="heading-rule" />ВАША ПОРОДИЧНА ХРОНИКА</div><h1 id="tree-title" tabIndex={-1}>Корени памте. <em>Приче трају.</em></h1><p>Свако име је једна прича. Откријте нити које вас повезују.</p></div><span className="collection-seal"><GitBranch size={23} strokeWidth={1.3} /><span>ПОРОДИЧНА<br />ЗБИРКА</span></span></div>
      <div className="tree-toolbar"><div className="mode-switch" role="group" aria-label="Режим стабла"><button aria-pressed={ui.mode === 'whole'} onClick={() => dispatch({ type: 'mode', mode: 'whole' })}><GitBranch size={16} />Цело стабло</button><button aria-pressed={ui.mode === 'focused'} onClick={() => dispatch({ type: 'mode', mode: 'focused' })}><Crosshair size={16} />Фокусирано</button></div><span className="focus-context" title={`Централна особа: ${focusName}`}><Crosshair size={14} /><span>{focusName}</span></span></div>
      <ReactFlowProvider><Canvas {...props} /></ReactFlowProvider>
      <footer className="canvas-footer"><div className="graph-legend" aria-label="Легенда веза"><span><i className="legend-line" />Родитељство</span><span><i className="legend-line legend-line--dashed" />Усвојење / друга веза</span></div><span className="canvas-hint"><MousePointer2 size={13} />Превуци за померање · точкић за увећање</span></footer>
    </section>
    {selected && <PersonInspector person={selected} archive={archive} actions={actions} focused={selected.id === ui.focusPersonId} onClose={() => dispatch({ type: 'close-inspector' })} />}
    {group && <FamilyInspector group={group} archive={archive} selectPerson={actions.selectPerson} onClose={() => dispatch({ type: 'close-inspector' })} />}
  </main>;
}
