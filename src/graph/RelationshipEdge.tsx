import { BaseEdge, getSmoothStepPath, type Edge, type EdgeProps } from '@xyflow/react';
import type { VisualEdge } from './types';
import { useGraphActions } from './GraphActions';

export type RelationshipFlowEdge = Edge<{ relation: VisualEdge }, 'relationship'>;
export function RelationshipEdge(props: EdgeProps<RelationshipFlowEdge>) {
  const relation = props.data!.relation;
  const { inspectFamily, inspectRelationship } = useGraphActions();
  const [path, labelX, labelY] = getSmoothStepPath({ ...props, borderRadius: 12 });
  const dashed = !['biological', 'connection'].includes(relation.kind);
  const interactive = !!relation.groupId || relation.kind === 'assertion' && !!inspectRelationship;
  const open = () => { if (relation.groupId) inspectFamily(relation.groupId); else if (relation.kind === 'assertion') inspectRelationship?.({ type: 'kinship', id: relation.relationshipIds[0] }); };
  return <g role={interactive ? 'button' : undefined} tabIndex={interactive ? 0 : undefined}
    aria-label={relation.label || 'Подаци о породичној вези'}
    onClick={event => { if (interactive) { event.stopPropagation(); open(); } }}
    onKeyDown={event => { if (interactive && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); open(); } }}>
    <BaseEdge id={props.id} path={path} interactionWidth={24}
    label={relation.label} labelX={labelX} labelY={labelY} labelStyle={{ fill: 'var(--bp-text-muted)', fontSize: 12 }}
    labelBgStyle={{ fill: 'var(--bp-paper)' }} labelBgPadding={[5, 4]}
    style={{ stroke: props.selected ? 'var(--bp-forest)' : 'var(--bp-edge)', strokeWidth: 1.5, strokeDasharray: dashed ? '5 4' : undefined }} />
  </g>;
}
