import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { HexBadge } from '../components/HexBadge';
import type { FamilyGroup } from './types';
import { useGraphActions } from './GraphActions';

export type FamilyFlowNode = Node<{ group: FamilyGroup }, 'family'>;
export const FamilyHexHub = memo(function FamilyHexHub({ data }: NodeProps<FamilyFlowNode>) {
  const { inspectFamily, archive } = useGraphActions();
  const group = data.group;
  const names = group.parentIds.map(id => archive.people.find(person => person.id === id)?.name || 'Неименована особа').join(' и ');
  const label = `Породична веза: ${names}${group.parentIds.length === 1 ? '. Други родитељ није познат.' : ''}`;
  return <div className="family-hub">
    <Handle type="target" position={Position.Top} isConnectable={false} />
    <HexBadge label={label} variant="brass" onClick={() => inspectFamily(group.id)}><span className="hub-dot" /></HexBadge>
    <Handle type="source" position={Position.Bottom} isConnectable={false} />
  </div>;
});
