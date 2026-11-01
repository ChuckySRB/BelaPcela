import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Modal } from '../../components/Modal';
import type { FamilyArchive, Person } from '../../domain/model';
import type { ArchiveCommand } from '../../services/commands';
import type { PersonDetails } from '../../domain/validation';
import { ProfileCollectionsEditor, collectionChanges, collectionDraft, type ProfileCollectionsDraft } from './ProfileCollectionsEditor';
import { eventHasSubject } from '../../domain/events';

type Field = 'name' | 'nickname' | 'occupation' | 'biography' | 'birthYear' | 'deathYear' | 'maidenName' | 'identityNote';
type Draft = Record<Field, string>;
const fields: { key: Field; label: string; kind?: string }[] = [
  { key: 'name', label: 'Име и презиме' }, { key: 'nickname', label: 'Надимак' },
  { key: 'occupation', label: 'Занимање' }, { key: 'biography', label: 'Животна прича', kind: 'textarea' },
  { key: 'birthYear', label: 'Година рођења', kind: 'number' }, { key: 'deathYear', label: 'Година смрти', kind: 'number' },
  { key: 'maidenName', label: 'Девојачко презиме' }, { key: 'identityNote', label: 'Напомена о идентитету', kind: 'textarea' },
];
interface EditorProps {
  person?: Person; archive: FamilyArchive; onClose: () => void; onSave: (command: ArchiveCommand) => Promise<void>; onReload?: () => Promise<void>;
}
export function PersonEditorDialog(props: EditorProps) {
  const [busy, setBusy] = useState(false);
  return <Modal title={props.person ? 'Измени особу' : 'Додај особу'} wide onClose={() => { if (!busy) props.onClose(); }}><PersonEditorForm {...props} onBusyChange={setBusy} /></Modal>;
}

export function PersonEditorForm({ person, archive, onClose, onSave, onReload, onBusyChange }: EditorProps & { onBusyChange?: (busy: boolean) => void }) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { form.current?.querySelector<HTMLInputElement>('[data-autofocus]')?.focus({ preventScroll: true }); }, []);
  const [draft, setDraft] = useState<Draft>(() => ({
    name: person?.name || '', nickname: person?.nickname || '', occupation: person?.occupation || '', biography: person?.biography || '',
    birthYear: String(archive.events.find(event => eventHasSubject(event, person?.id) && event.type === 'birth')?.date?.year ?? ''),
    deathYear: String(archive.events.find(event => eventHasSubject(event, person?.id) && event.type === 'death')?.date?.year ?? ''),
    maidenName: person?.maidenName || '', identityNote: person?.identityNote || '',
  }));
  const initialDraft = useRef(draft);
  const [approximate, setApproximate] = useState(() => ({ birth: !!archive.events.find(event => eventHasSubject(event, person?.id) && event.type === 'birth')?.date?.approximate, death: !!archive.events.find(event => eventHasSubject(event, person?.id) && event.type === 'death')?.date?.approximate }));
  const initialApproximate = useRef(approximate);
  const [portraitId, setPortraitId] = useState(person?.preferredMediaId || '');
  const initialPortrait = useRef(portraitId);
  const [collections, setCollections] = useState(() => collectionDraft(person));
  const initialCollections = useRef(collectionChanges(collections));
  const [activeCollections, setActiveCollections] = useState<(keyof ProfileCollectionsDraft)[]>(() => (Object.keys(collections) as (keyof ProfileCollectionsDraft)[]).filter(key => collections[key].length));
  const [active, setActive] = useState<Field[]>(() => fields.filter(field => field.key === 'name' || draft[field.key]).map(field => field.key));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setError(''); setBusy(true); onBusyChange?.(true);
    const { birthYear, deathYear, ...details } = draft;
    const normalized = collectionChanges(collections);
    const changedCollections = Object.fromEntries(Object.entries(normalized).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(initialCollections.current[key as keyof typeof normalized])));
    const portraitChange = portraitId !== initialPortrait.current ? { preferredMediaId: portraitId || undefined } : {};
    const changes: PersonDetails = { ...Object.fromEntries(Object.entries(details).filter(([key, value]) => value !== initialDraft.current[key as Field])), ...changedCollections, ...portraitChange };
    const years = {
      ...(birthYear !== initialDraft.current.birthYear ? { birthYear: birthYear === '' ? null : Number(birthYear) } : {}),
      ...(deathYear !== initialDraft.current.deathYear ? { deathYear: deathYear === '' ? null : Number(deathYear) } : {}),
      ...(approximate.birth !== initialApproximate.current.birth ? { birthApproximate: approximate.birth } : {}),
      ...(approximate.death !== initialApproximate.current.death ? { deathApproximate: approximate.death } : {}),
    };
    try {
      await onSave(person
        ? { type: 'updatePerson', personId: person.id, changes, ...years }
        : { type: 'createPerson', person: { ...details, ...normalized, ...portraitChange }, ...years });
    } catch (cause) { setError((cause as Error).message); setBusy(false); onBusyChange?.(false); }
  };
  return <div className="person-editor">
    <p className="dialog-intro">Сви подаци су необавезни. Измене се чувају у овом прегледачу када их потврдите.</p>
    <form ref={form} className="editor-form" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <fieldset disabled={busy}>
        {fields.filter(field => active.includes(field.key)).map(field => <div className="editor-field" key={field.key}>
          <div className="field-heading"><label htmlFor={`person-${field.key}`}>{field.label}</label>{field.key !== 'name' && <button type="button" className="icon-button" aria-label={`Уклони поље: ${field.label}`} onClick={() => { setDraft({ ...draft, [field.key]: '' }); setActive(active.filter(key => key !== field.key)); }}><X size={15} /></button>}</div>
          {field.kind === 'textarea'
            ? <textarea id={`person-${field.key}`} rows={field.key === 'identityNote' ? 3 : 5} maxLength={field.key === 'identityNote' ? 1000 : 20000} value={draft[field.key]} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} />
            : <input id={`person-${field.key}`} data-autofocus={field.key === 'name' ? '' : undefined} type={field.kind || 'text'} min={field.kind === 'number' ? -9999 : undefined} max={field.kind === 'number' ? 9999 : undefined} step={field.kind === 'number' ? 1 : undefined} maxLength={200} value={draft[field.key]} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} />}
          {field.key.endsWith('Year') && <label className="checkbox-field"><input type="checkbox" disabled={!draft[field.key]} checked={field.key === 'birthYear' ? approximate.birth : approximate.death} onChange={event => setApproximate({ ...approximate, [field.key === 'birthYear' ? 'birth' : 'death']: event.target.checked })} />{field.key === 'birthYear' ? 'Приближна година рођења' : 'Приближна година смрти'}</label>}
        </div>)}
        <details className="add-field-menu"><summary><Plus size={16} />Додај податак</summary><div>{fields.filter(field => !active.includes(field.key)).map(field => <button type="button" key={field.key} onClick={() => setActive([...active, field.key])}>{field.label}</button>)}</div></details>
        {archive.media.length > 0 && <label className="editor-field">Фотографија за приказ<select value={portraitId} onChange={event => setPortraitId(event.target.value)}><option value="">Монограм — без фотографије</option>{archive.media.map((media, index) => <option key={media.id} value={media.id}>{media.alt || `Фотографија ${index + 1}`}</option>)}</select></label>}
        <ProfileCollectionsEditor draft={collections} setDraft={setCollections} primaryName={draft.name} primaryOccupation={draft.occupation} setPrimaryName={name => setDraft({ ...draft, name })} setPrimaryOccupation={occupation => { setDraft({ ...draft, occupation }); if (!active.includes('occupation')) setActive([...active, 'occupation']); }} active={activeCollections} setActive={setActiveCollections} />
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      {onReload && error.includes('другом прозору') && <button type="button" className="text-button" onClick={() => void onReload()}>Освежи збирку и задржи унос</button>}
      <div className="editor-actions"><button type="button" className="button" disabled={busy} onClick={onClose}>Одустани</button><button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Чување…' : 'Сачувај измене'}</button></div>
    </form>
  </div>;
}
