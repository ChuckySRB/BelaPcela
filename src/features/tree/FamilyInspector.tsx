import { X, GitFork } from 'lucide-react';
import type { FamilyArchive } from '../../domain/model';
import { parentageLabels, partnershipLabels, personLabel } from '../../domain/people';
import type { FamilyGroup } from '../../graph/types';
import { HexBadge } from '../../components/HexBadge';

export function FamilyInspector({ group, archive, onClose, selectPerson }: { group: FamilyGroup; archive: FamilyArchive; onClose: () => void; selectPerson: (id: string) => void }) {
  const personName = (id: string) => personLabel(archive.people.find(person => person.id === id)!);
  return <aside className="inspector" aria-label="Подаци о породичној вези">
    <div className="inspector-top"><span className="eyebrow">ПОРОДИЧНА ВЕЗА</span><button className="icon-button" aria-label="Затвори инспектор" onClick={onClose}><X size={18} /></button></div>
    <div className="inspector-scroll family-inspector"><HexBadge label="Породична веза" variant="brass"><GitFork size={18} /></HexBadge><h2>Нити које повезују</h2><p>Овај спој приказује забележене односе. Сам по себи не означава брак.</p>
      <h3>Учесници</h3>{group.parentIds.map(id => <button key={id} className="family-person-link" onClick={() => selectPerson(id)}>{personName(id)}</button>)}
      {group.partnershipIds.map(id => {
        const partnership = archive.partnerships.find(partnership => partnership.id === id)!;
        return <p className="relationship-type" key={id}>{partnershipLabels[partnership.kind]}{partnership.fromYear ? ` · од ${partnership.fromYear}.` : ''}</p>;
      })}
      {group.parentIds.length === 1 && <p className="callout">Други родитељ није познат. У стаблу није додата претпостављена особа или партнерска веза.</p>}
      {!!group.childIds.length && <><h3>Родитељство</h3>{group.relationshipIds.map(id => {
        const relation = archive.parentChildRelationships.find(relation => relation.id === id)!;
        return <div className="relationship-record" key={id}><span>{personName(relation.parentId)} → {personName(relation.childId)}</span><small>{parentageLabels[relation.kind]}</small></div>;
      })}</>}
    </div>
  </aside>;
}
