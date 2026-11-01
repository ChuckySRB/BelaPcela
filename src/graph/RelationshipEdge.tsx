import { BaseEdge, getSmoothStepPath, type Edge, type EdgeProps } from '@xyflow/react';
import type { VisualEdge } from './types';
import { useGraphActions } from './GraphActions';

export type RelationshipFlowEdge = Edge<{ relation: VisualEdge }, 'relationship'>;
export function RelationshipEdge(props: EdgeProps<RelationshipFlowEdge>) {
  const relation = props.data!.relation;
  const { inspectFamily } = useGraphActions();
  const [path, labelX, labelY] = getSmoothStepPath({ ...props, borderRadius: 12 });
  const dashed = !['biological', 'connection'].includes(relation.kind);
  return <g role={relation.groupId ? 'button' : undefined} tabIndex={relation.groupId ? 0 : undefined}
    aria-label={relation.label || 'Подаци о породичној вези'}
    onKeyDown={event => { if (relation.groupId && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); inspectFamily(relation.groupId); } }}>
    <BaseEdge id={props.id} path={path} interactionWidth={24}
    label={relation.label} labelX={labelX} labelY={labelY} labelStyle={{ fill: 'var(--bp-text-muted)', fontSize: 12 }}
    labelBgStyle={{ fill: 'var(--bp-paper)' }} labelBgPadding={[5, 4]}
    style={{ stroke: props.selected ? 'var(--bp-forest)' : 'var(--bp-edge)', strokeWidth: 1.5, strokeDasharray: dashed ? '5 4' : undefined }} />
  </g>;
}
