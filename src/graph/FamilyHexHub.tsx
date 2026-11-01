import { memo } from 'react';
import { Handle, NodeToolbar, Position, type Node, type NodeProps } from '@xyflow/react';
import { HexBadge } from '../components/HexBadge';
import type { FamilyGroup } from './types';
import { useGraphActions } from './GraphActions';
import type { BranchSummary } from './branchVisibility';

export type FamilyFlowNode = Node<{ group: FamilyGroup; branch: BranchSummary }, 'family'>;
export const FamilyHexHub = memo(function FamilyHexHub({ data }: NodeProps<FamilyFlowNode>) {
  const { inspectFamily, toggleBranch, archive } = useGraphActions();
  const group = data.group;
  const names = group.parentIds.map(id => archive.people.find(person => person.id === id)?.name || 'Неименована особа').join(' и ');
  const label = `Породична веза: ${names}${group.parentIds.length === 1 ? '. Други родитељ није познат.' : ''}`;
  return <div className="family-hub">
    <Handle type="target" position={Position.Top} isConnectable={false} />
    <HexBadge label={label} variant="brass" onClick={() => inspectFamily(group.id)}><span className="hub-dot" /></HexBadge>
    <NodeToolbar isVisible={data.branch.collapsed} position={Position.Right} offset={2}>
      <div className="collapse-badge nodrag nopan"><HexBadge label={`Прикажи потомке: ${data.branch.hiddenCount} особа`} variant="brass" onClick={() => toggleBranch(group.id)}>+</HexBadge><span aria-hidden="true">{data.branch.hiddenCount}</span></div>
    </NodeToolbar>
    <Handle type="source" position={Position.Bottom} isConnectable={false} />
  </div>;
});
