import { useMemo, useState } from 'react';
import { ArrowRight, Search, UserRound, Users, Baby, GitFork, Info } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Portrait } from '../../components/Portrait';
import type { FamilyArchive } from '../../domain/model';
import { lifeYears, personLabel, searchPeople } from '../../domain/people';

export function GlobalSearchDialog({ archive, onClose, onSelect }: { archive: FamilyArchive; onClose: () => void; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchPeople(archive.people, query), [archive, query]);
  return <Modal title="Завирите у породичну збирку" onClose={onClose} wide>
    <label className="search-input"><Search size={20} /><input data-autofocus aria-label="Претражи особе" placeholder="Име, презиме или надимак…" value={query} onChange={event => setQuery(event.target.value)} /><kbd>Esc</kbd></label>
    <div className="search-summary" role="status">{results.length} особа · пробна збирка</div>
    <div className="search-results">{results.map(person => <button className="search-result" key={person.id} onClick={() => onSelect(person.id)}><Portrait person={person} archive={archive} className="portrait--tiny" /><span><strong>{personLabel(person)}</strong>{lifeYears(archive, person.id) && <small>{lifeYears(archive, person.id)}</small>}</span><ArrowRight size={17} /></button>)}
      {!results.length && <p className="empty-note">Нема особа за овај упит. Покушајте са другим именом.</p>}
    </div><p className="prototype-note">Претрага приказује податке из ове пробне збирке.</p>
  </Modal>;
}

const relativeOptions = [
  { label: 'Родитељ', icon: UserRound, detail: 'Забележите једног познатог родитеља.' },
  { label: 'Дете', icon: Baby, detail: 'Други родитељ се бира посебно, само ако је познат.' },
  { label: 'Партнер', icon: Users, detail: 'Врста партнерске везе бележиће се засебно.' },
  { label: 'Брат / сестра', icon: GitFork, detail: 'Сродство је могуће забележити и без познатих родитеља.' },
];
export function RelativeAddDialog({ name, onClose }: { name: string; onClose: () => void }) {
  const [chosen, setChosen] = useState<string | null>(null);
  return <Modal title="Додај сродника" onClose={onClose}>
    <p className="dialog-intro">Породична веза за особу <strong>{name}</strong></p>
    <div className="relative-options">{relativeOptions.map(({ label, icon: Icon, detail }) => <button key={label} aria-pressed={chosen === label} className="relative-option" onClick={() => setChosen(label)}><Icon size={21} /><span><strong>{label}</strong><small>{detail}</small></span><ArrowRight size={17} /></button>)}</div>
    <div className="callout" role="status"><Info size={18} /><span>{chosen ? `${chosen}: следећи корак ће понудити нову или постојећу особу. ` : ''}Ово је преглед поступка. Унос и чување сродника стижу у наредној фази; подаци нису промењени.</span></div>
    <button className="button button--primary dialog-done" onClick={onClose}>Назад на збирку</button>
  </Modal>;
}

export function ComingSoonDialog({ title, onClose }: { title: string; onClose: () => void }) {
  const isBackup = title === 'Резервна копија';
  return <Modal title={title} onClose={onClose}><span className="phase-pill">У ПРИПРЕМИ</span><p className="dialog-intro">{isBackup ? 'Потпуна ZIP резервна копија, са подацима и датотекама, стиже у петој фази.' : 'Овај део збирке стиже у наредним фазама пројекта.'}</p><p>Сада разгледате измишљену пробну збирку. Измене и чување података још нису доступни.</p><p className="prototype-note">Стабло, претрага, фокусирање и преглед профила су доступни.</p><button className="button button--primary dialog-done" onClick={onClose}>Разумем</button></Modal>;
}
