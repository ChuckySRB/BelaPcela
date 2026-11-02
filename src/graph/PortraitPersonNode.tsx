import { memo, useRef } from 'react';
import { Handle, NodeToolbar, Position, useStore, type Node, type NodeProps } from '@xyflow/react';
import { Crosshair, Plus, ArrowUpRight, Eye } from 'lucide-react';
import { HexBadge } from '../components/HexBadge';
import { Portrait } from '../components/Portrait';
import { lifeYears, personLabel } from '../domain/people';
import { useGraphActions } from './GraphActions';
import { detailLevel, shortName } from './semanticZoom';
import { PersonHoverCard, usePersonPreview } from './PersonHoverCard';

export type PersonFlowNode = Node<{ personId: string; focused: boolean }, 'person'>;

export const PortraitPersonNode = memo(function PortraitPersonNode({ data, selected }: NodeProps<PersonFlowNode>) {
  const { archive, selectPerson, focusPerson, openProfile, addRelative } = useGraphActions();
  const trigger = useRef<HTMLButtonElement>(null);
  const preview = usePersonPreview(trigger);
  const zoomDetail = useStore(state => detailLevel(state.transform[2]));
  const person = archive.people.find(person => person.id === data.personId)!;
  if (!person) return null;
  const name = personLabel(person);
  const years = lifeYears(archive, person.id);
  return <>
    <Handle type="target" position={Position.Top} isConnectable={false} />
    {selected && <NodeToolbar isVisible position={Position.Top} offset={12}>
      <div className="node-toolbar nodrag nopan">
        <button className="icon-button" aria-label={`Додај сродника: ${name}`} title="Додај сродника" onClick={() => addRelative(person.id)}><Plus size={18} /></button>
        <button className="icon-button" aria-label={`Фокусирај: ${name}`} title="Фокусирај (F)" onClick={() => focusPerson(person.id)}><Crosshair size={18} /></button>
        <button className="icon-button" aria-label={`Отвори профил: ${name}`} title="Отвори профил" onClick={() => openProfile(person.id)}><ArrowUpRight size={18} /></button>
        <button className="icon-button" aria-label={`Кратак преглед: ${name}`} title="Кратак преглед" onClick={preview.openKeyboard}><Eye size={18} /></button>
      </div>
    </NodeToolbar>}
    <button ref={trigger} {...preview.triggerEvents} data-detail={selected || data.focused ? 'near' : zoomDetail} className={`person-node nodrag ${selected ? 'is-selected' : ''} ${data.focused ? 'is-focused' : ''}`}
      aria-label={`${name}${years ? `, ${years}` : ''}${data.focused ? ', централна особа' : ''}${person.identityNote ? ', идентитет захтева проверу' : ''}`}
      aria-pressed={selected || false} onClick={() => { preview.close(); selectPerson(person.id); }} onDoubleClick={() => openProfile(person.id)}>
      {data.focused && <HexBadge variant="brass" label="Централна особа" className="person-focus-badge"><Crosshair size={13} /></HexBadge>}
      {person.identityNote && <span className="identity-marker" title={`Идентитет захтева проверу: ${person.identityNote}`} aria-hidden="true">?</span>}
      <Portrait person={person} archive={archive} />
      <span className="person-node-name"><span className="full-person-name">{name}</span><span className="short-person-name" aria-hidden="true">{shortName(name)}</span></span>
      {years && <span className="person-node-years">{years}</span>}
    </button>
    {preview.preview && <PersonHoverCard person={person} archive={archive} trigger={trigger} keyboard={preview.preview === 'keyboard'} onClose={preview.close} onEnter={preview.keepOpen} onLeave={preview.leave}
      selectPerson={() => { preview.close(); selectPerson(person.id); }} openProfile={() => { preview.close(); openProfile(person.id); }} />}
    <Handle type="source" position={Position.Bottom} isConnectable={false} />
  </>;
});
