import { useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Modal } from '../../components/Modal';
import type { FamilyArchive, Person } from '../../domain/model';
import type { ArchiveCommand } from '../../services/commands';

type Field = 'name' | 'nickname' | 'occupation' | 'biography' | 'birthYear' | 'deathYear';
type Draft = Record<Field, string>;
const fields: { key: Field; label: string; kind?: string }[] = [
  { key: 'name', label: 'Име и презиме' }, { key: 'nickname', label: 'Надимак' },
  { key: 'occupation', label: 'Занимање' }, { key: 'biography', label: 'Животна прича', kind: 'textarea' },
  { key: 'birthYear', label: 'Година рођења', kind: 'number' }, { key: 'deathYear', label: 'Година смрти', kind: 'number' },
];
export function PersonEditorDialog({ person, archive, onClose, onSave, onReload }: {
  person?: Person; archive: FamilyArchive; onClose: () => void; onSave: (command: ArchiveCommand) => Promise<void>; onReload?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>(() => ({
    name: person?.name || '', nickname: person?.nickname || '', occupation: person?.occupation || '', biography: person?.biography || '',
    birthYear: String(archive.events.find(event => event.personId === person?.id && event.type === 'birth')?.date?.year ?? ''),
    deathYear: String(archive.events.find(event => event.personId === person?.id && event.type === 'death')?.date?.year ?? ''),
  }));
  const initialDraft = useRef(draft);
  const [active, setActive] = useState<Field[]>(() => fields.filter(field => field.key === 'name' || draft[field.key]).map(field => field.key));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setError(''); setBusy(true);
    const { birthYear, deathYear, ...details } = draft;
    const changes = Object.fromEntries(Object.entries(details).filter(([key, value]) => value !== initialDraft.current[key as Field]));
    try {
      await onSave(person
        ? { type: 'updatePerson', personId: person.id, changes,
          ...(birthYear !== initialDraft.current.birthYear ? { birthYear: birthYear === '' ? null : Number(birthYear) } : {}),
          ...(deathYear !== initialDraft.current.deathYear ? { deathYear: deathYear === '' ? null : Number(deathYear) } : {}),
        }
        : { type: 'createPerson', person: details });
    } catch (cause) { setError((cause as Error).message); setBusy(false); }
  };
  return <Modal title={person ? 'Измени особу' : 'Додај особу'} onClose={() => { if (!busy) onClose(); }}>
    <p className="dialog-intro">Сви подаци су необавезни. Измене се чувају у овом прегледачу када их потврдите.</p>
    <form className="editor-form" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <fieldset disabled={busy}>
        {fields.filter(field => active.includes(field.key) && (person || !field.key.endsWith('Year'))).map(field => <div className="editor-field" key={field.key}>
          <div className="field-heading"><label htmlFor={`person-${field.key}`}>{field.label}</label>{field.key !== 'name' && <button type="button" className="icon-button" aria-label={`Уклони поље: ${field.label}`} onClick={() => { setDraft({ ...draft, [field.key]: '' }); setActive(active.filter(key => key !== field.key)); }}><X size={15} /></button>}</div>
          {field.kind === 'textarea'
            ? <textarea id={`person-${field.key}`} rows={5} maxLength={20000} value={draft[field.key]} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} />
            : <input id={`person-${field.key}`} data-autofocus={field.key === 'name' ? '' : undefined} type={field.kind || 'text'} min={field.kind === 'number' ? -9999 : undefined} max={field.kind === 'number' ? 9999 : undefined} step={field.kind === 'number' ? 1 : undefined} maxLength={200} value={draft[field.key]} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} />}
        </div>)}
        <details className="add-field-menu"><summary><Plus size={16} />Додај податак</summary><div>{fields.filter(field => !active.includes(field.key) && (person || !field.key.endsWith('Year'))).map(field => <button type="button" key={field.key} onClick={() => setActive([...active, field.key])}>{field.label}</button>)}</div></details>
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      {onReload && error.includes('другом прозору') && <button type="button" className="text-button" onClick={() => void onReload()}>Освежи збирку и задржи унос</button>}
      <div className="editor-actions"><button type="button" className="button" disabled={busy} onClick={onClose}>Одустани</button><button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Чување…' : 'Сачувај измене'}</button></div>
    </form>
  </Modal>;
}
