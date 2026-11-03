import { useMemo, useState } from 'react';
import { ArrowRight, Search, Plus } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Portrait } from '../../components/Portrait';
import type { FamilyArchive } from '../../domain/model';
import { lifeYears, personLabel, searchPeople } from '../../domain/people';

export function GlobalSearchDialog({ archive, onClose, onSelect, onCreate }: { archive: FamilyArchive; onClose: () => void; onSelect: (id: string) => void; onCreate?: () => void }) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(50);
  const results = useMemo(() => searchPeople(archive.people, query), [archive, query]);
  return <Modal title="Завирите у породичну збирку" onClose={onClose} wide>
    <label className="search-input"><Search size={20} /><input data-autofocus aria-label="Претражи особе" placeholder="Име, презиме или надимак…" value={query} onChange={event => { setQuery(event.target.value); setLimit(50); }} /><kbd>Esc</kbd></label>
    <div className="search-summary" role="status">{results.length} особа · локална збирка</div>
    <div className="search-results">{results.slice(0, limit).map(person => <button className="search-result" key={person.id} onClick={() => onSelect(person.id)}><Portrait person={person} archive={archive} className="portrait--tiny" /><span><strong>{personLabel(person)}</strong>{lifeYears(archive, person.id) && <small>{lifeYears(archive, person.id)}</small>}</span><ArrowRight size={17} /></button>)}
      {!results.length && <p className="empty-note">{archive.people.length ? 'Нема особа за овај упит. Покушајте са другим именом.' : 'Збирка још нема особа. Додајте прву особу и почните своју породичну причу.'}</p>}
    </div>{results.length > limit && <button className="button" onClick={() => setLimit(value => value + 50)}>Прикажи још особа ({Math.min(limit, results.length)} од {results.length})</button>}{onCreate && <button className="button button--soft dialog-done" onClick={onCreate}><Plus size={16} />Додај особу</button>}
  </Modal>;
}

