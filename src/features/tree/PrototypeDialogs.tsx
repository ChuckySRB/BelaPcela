import { useMemo, useState } from 'react';
import { ArrowRight, Search, Plus } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Portrait } from '../../components/Portrait';
import type { FamilyArchive } from '../../domain/model';
import { lifeYears, personLabel, searchPeople } from '../../domain/people';

export function GlobalSearchDialog({ archive, onClose, onSelect, onCreate }: { archive: FamilyArchive; onClose: () => void; onSelect: (id: string) => void; onCreate?: () => void }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchPeople(archive.people, query), [archive, query]);
  return <Modal title="Завирите у породичну збирку" onClose={onClose} wide>
    <label className="search-input"><Search size={20} /><input data-autofocus aria-label="Претражи особе" placeholder="Име, презиме или надимак…" value={query} onChange={event => setQuery(event.target.value)} /><kbd>Esc</kbd></label>
    <div className="search-summary" role="status">{results.length} особа · локална збирка</div>
    <div className="search-results">{results.map(person => <button className="search-result" key={person.id} onClick={() => onSelect(person.id)}><Portrait person={person} archive={archive} className="portrait--tiny" /><span><strong>{personLabel(person)}</strong>{lifeYears(archive, person.id) && <small>{lifeYears(archive, person.id)}</small>}</span><ArrowRight size={17} /></button>)}
      {!results.length && <p className="empty-note">Нема особа за овај упит. Покушајте са другим именом.</p>}
    </div>{onCreate && <button className="button button--soft dialog-done" onClick={onCreate}><Plus size={16} />Додај особу</button>}
  </Modal>;
}

export function ComingSoonDialog({ title, onClose }: { title: string; onClose: () => void }) {
  const isBackup = title === 'Резервна копија';
  return <Modal title={title} onClose={onClose}><span className="phase-pill">У ПРИПРЕМИ</span><p className="dialog-intro">{isBackup ? 'Потпуна ZIP резервна копија, са подацима и датотекама, стиже у петој фази.' : 'Овај део збирке стиже у наредним фазама пројекта.'}</p><p>Подаци се чувају само у овом прегледачу. Брисање података сајта или профила прегледача може обрисати збирку.</p><p className="prototype-note">Доступни су унос и повезивање особа, измене, поништавање и поновно извршавање.</p><button className="button button--primary dialog-done" onClick={onClose}>Разумем</button></Modal>;
}
