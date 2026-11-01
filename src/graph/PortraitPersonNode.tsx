import { memo } from 'react';
import { Handle, NodeToolbar, Position, type Node, type NodeProps } from '@xyflow/react';
import { Crosshair, Plus, ArrowUpRight } from 'lucide-react';
import { HexBadge } from '../components/HexBadge';
import { Portrait } from '../components/Portrait';
import { lifeYears, personLabel } from '../domain/people';
import { useGraphActions } from './GraphActions';

export type PersonFlowNode = Node<{ personId: string; focused: boolean }, 'person'>;

export const PortraitPersonNode = memo(function PortraitPersonNode({ data, selected }: NodeProps<PersonFlowNode>) {
  const { archive, selectPerson, focusPerson, openProfile, addRelative } = useGraphActions();
  const person = archive.people.find(person => person.id === data.personId)!;
  if (!person) return null;
  const name = personLabel(person);
  const years = lifeYears(archive, person.id);
  return <>
    <Handle type="target" position={Position.Top} isConnectable={false} />
    <NodeToolbar isVisible={selected} position={Position.Top} offset={12}>
      <div className="node-toolbar nodrag nopan">
        <button className="icon-button" aria-label={`Додај сродника: ${name}`} title="Додај сродника" onClick={() => addRelative(person.id)}><Plus size={18} /></button>
        <button className="icon-button" aria-label={`Фокусирај: ${name}`} title="Фокусирај (F)" onClick={() => focusPerson(person.id)}><Crosshair size={18} /></button>
        <button className="icon-button" aria-label={`Отвори профил: ${name}`} title="Отвори профил" onClick={() => openProfile(person.id)}><ArrowUpRight size={18} /></button>
      </div>
    </NodeToolbar>
    <button className={`person-node nodrag ${selected ? 'is-selected' : ''} ${data.focused ? 'is-focused' : ''}`}
      aria-label={`${name}${years ? `, ${years}` : ''}${data.focused ? ', централна особа' : ''}`}
      aria-pressed={selected || false} onClick={() => selectPerson(person.id)} onDoubleClick={() => openProfile(person.id)}>
      {data.focused && <HexBadge variant="brass" label="Централна особа" className="person-focus-badge"><Crosshair size={13} /></HexBadge>}
      <Portrait person={person} archive={archive} />
      <span className="person-node-name">{name}</span>
      {years && <span className="person-node-years">{years}</span>}
    </button>
    <Handle type="source" position={Position.Bottom} isConnectable={false} />
  </>;
});
