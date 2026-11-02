import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpDown, Pencil, Trash2 } from 'lucide-react';
import { Modal } from '../../components/Modal';
import type { FamilyArchive, ParentageKind, Partnership, RelationshipRecord, RelationshipRef } from '../../domain/model';
import { describeRelationship, getRelationship, relationshipVersion } from '../../domain/relationships';
import { parentageLabels, partnershipLabels, personLabel } from '../../domain/people';
import { applyCommand, type ArchiveCommand } from '../../services/commands';

type Mode = 'view' | 'edit' | 'delete' | 'review';
type Update = Extract<ArchiveCommand, { type: 'updateRelationship' }>;
type Draft = { first: string; second: string; kind: string; fromYear: string; label: string };
function valuesFor(relationship: RelationshipRecord): Draft {
  if (relationship.type === 'parentChild') return { first: relationship.record.parentId, second: relationship.record.childId, kind: relationship.record.kind, fromYear: '', label: '' };
  return { first: relationship.record.personIds[0], second: relationship.record.personIds[1], kind: relationship.type === 'partnership' ? relationship.record.kind : '', fromYear: relationship.type === 'partnership' ? String(relationship.record.fromYear ?? '') : '', label: relationship.type === 'kinship' ? relationship.record.label : '' };
}
function updateFor(relationship: RelationshipRecord, values: Draft): Update {
  const id = relationship.record.id;
  const changed = <T extends object,>(before: T, after: T) => Object.fromEntries(Object.entries(after).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(before[key as keyof T]))) as Partial<T>;
  const pair: [string, string] = [values.first, values.second];
  const target: Update['relationship'] = relationship.type === 'parentChild'
    ? { type: relationship.type, id, changes: changed({ parentId: relationship.record.parentId, childId: relationship.record.childId, kind: relationship.record.kind }, { parentId: values.first, childId: values.second, kind: values.kind as ParentageKind }) }
    : relationship.type === 'partnership'
      ? { type: relationship.type, id, changes: changed({ personIds: relationship.record.personIds, kind: relationship.record.kind, fromYear: relationship.record.fromYear ?? null }, { personIds: pair, kind: values.kind as Partnership['kind'], fromYear: values.fromYear.trim() ? Number(values.fromYear) : null }) }
      : { type: relationship.type, id, changes: changed({ personIds: relationship.record.personIds, label: relationship.record.label }, { personIds: pair, label: values.label.trim() }) };
  return { type: 'updateRelationship', relationship: target, expectedVersion: relationshipVersion(relationship) };
}

function Summary({ archive, relationship }: { archive: FamilyArchive; relationship: RelationshipRecord }) {
  const summary = describeRelationship(archive, relationship);
  return <div className="relationship-summary"><strong>{summary.people}</strong><p>{summary.title} · {summary.detail}</p></div>;
}

export function RelationshipDialog({ target, initialMode, archive, onClose, onSave, onReload }: { target: RelationshipRef; initialMode: 'view' | 'edit' | 'delete'; archive: FamilyArchive; onClose: () => void; onSave: (command: ArchiveCommand) => Promise<void>; onReload: () => Promise<void> }) {
  const relationship = getRelationship(archive, target);
  const [mode, setMode] = useState<Mode>(initialMode); const [draft, setDraft] = useState<Partial<Draft>>({});
  const [review, setReview] = useState<{ command: Update; proposed: RelationshipRecord } | null>(null);
  const [confirmedVersion, setConfirmedVersion] = useState<string | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const heading = useRef<HTMLHeadingElement>(null); const firstParticipant = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => { if (mode === 'edit') firstParticipant.current?.focus(); else heading.current?.focus(); }); return () => cancelAnimationFrame(frame);
  }, [mode]);
  const close = () => { if (!busy) onClose(); };
  if (!relationship) return <Modal title="Породична веза" onClose={close}><p role="alert">Ова веза више није у збирци. Постојећи унос није сачуван.</p><button className="button" onClick={close}>Затвори</button></Modal>;
  const values = { ...valuesFor(relationship), ...draft }; const version = relationshipVersion(relationship);
  const reviewCurrent = review?.command.expectedVersion === version;
  const change = (key: keyof Draft, value: string) => setDraft(previous => ({ ...previous, [key]: value }));
  const participant = (key: 'first' | 'second', label: string) => <label className="editor-field">{label}<select ref={key === 'first' ? firstParticipant : undefined} data-autofocus={key === 'first' && mode === 'edit' ? true : undefined} required value={values[key]} onChange={event => change(key, event.target.value)}>{archive.people.filter(person => person.id !== values[key === 'first' ? 'second' : 'first'] || person.id === values[key]).map(person => <option key={person.id} value={person.id}>{personLabel(person)}</option>)}</select></label>;
  async function save(command: ArchiveCommand) {
    setBusy(true); setError('');
    try { await onSave(command); } catch (cause) { setError((cause as Error).message); setBusy(false); }
  }
  return <Modal title={mode === 'delete' ? 'Обриши породичну везу' : mode === 'edit' ? 'Измени породичну везу' : mode === 'review' ? 'Преглед измене везе' : 'Подаци о породичној вези'} onClose={close}>
    {mode === 'view' && <><h3 ref={heading} tabIndex={-1}>Забележена веза</h3><Summary archive={archive} relationship={relationship} /><div className="editor-actions"><button className="button" onClick={() => setMode('edit')}><Pencil size={16} />Измени везу</button><button className="button button--danger" onClick={() => setMode('delete')}><Trash2 size={16} />Обриши везу</button></div></>}
    {mode === 'edit' && <form className="editor-form" onSubmit={event => {
      event.preventDefault(); setError('');
      try {
        const command = updateFor(relationship, values);
        if (!Object.keys(command.relationship.changes).length) { setError('Нема промена за чување.'); return; }
        const next = applyCommand(archive, command).archive;
        setReview({ command, proposed: getRelationship(next, target)! }); setMode('review');
      } catch (cause) { setError((cause as Error).message); }
    }}><p className="prototype-note">Измена важи за овај запис у свим профилима и у стаблу. Остале везе се уређују засебно.</p>
      {participant('first', relationship.type === 'parentChild' ? 'Родитељ' : 'Прва особа')}{participant('second', relationship.type === 'parentChild' ? 'Дете' : 'Друга особа')}
      {relationship.type === 'parentChild' && <><button className="text-button" type="button" onClick={() => setDraft(previous => ({ ...previous, first: values.second, second: values.first }))}><ArrowUpDown size={16} />Замени родитеља и дете</button><label className="editor-field">Врста родитељства<select value={values.kind} onChange={event => change('kind', event.target.value)}>{Object.entries(parentageLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></>}
      {relationship.type === 'partnership' && <><label className="editor-field">Врста партнерске везе<select value={values.kind} onChange={event => change('kind', event.target.value)}>{Object.entries(partnershipLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="editor-field">Почетна година (необавезно)<input type="number" min={-9999} max={9999} step={1} value={values.fromYear} onChange={event => change('fromYear', event.target.value)} /></label><p className="prototype-note">Партнерска веза и родитељство су засебни записи. Догађаји венчања се уређују у одељку Догађаји.</p></>}
      {relationship.type === 'kinship' && <label className="editor-field">Назив сродства<input required maxLength={200} value={values.label} onChange={event => change('label', event.target.value)} /></label>}
      <div className="editor-actions"><button type="button" className="button" onClick={close}>Одустани</button><button type="submit" className="button button--primary">Прегледај измене</button></div>
    </form>}
    {mode === 'review' && review && <><h3 ref={heading} tabIndex={-1}>Проверите пре чувања</h3><span className="eyebrow">ТЕКУЋА ВЕЗА</span><Summary archive={archive} relationship={relationship} /><span className="eyebrow">ПОСЛЕ ИЗМЕНЕ</span><Summary archive={archive} relationship={review.proposed} />{!reviewCurrent && <p className="callout" role="alert">Текућа веза је промењена. Вратите се на измене и поново их прегледајте пре потврде.</p>}<div className="editor-actions"><button className="button" disabled={busy} onClick={() => { setMode('edit'); setError(''); }}><ArrowLeft size={16} />Назад на измене</button><button className="button button--primary" disabled={busy || !reviewCurrent} onClick={() => void save(review.command)}>{busy ? 'Чување…' : 'Потврди и сачувај везу'}</button></div></>}
    {mode === 'delete' && <><h3 ref={heading} tabIndex={-1}>Веза која ће бити обрисана</h3><Summary archive={archive} relationship={relationship} /><p>Брише се само ова веза. Особе, остале породичне везе, догађаји и датотеке остају у збирци. Брисање можете поништити командом Поништи (Ctrl+Z).</p><fieldset className="relationship-delete-fields" disabled={busy}><label className="checkbox-field"><input type="checkbox" checked={confirmedVersion === version} onChange={event => setConfirmedVersion(event.target.checked ? version : null)} />Разумем да бришем само ову везу.</label><div className="editor-actions"><button className="button" onClick={close}>Одустани</button><button className="button button--danger" disabled={confirmedVersion !== version} onClick={() => void save({ type: 'deleteRelationship', relationship: target, expectedVersion: version })}><Trash2 size={16} />{busy ? 'Брисање…' : 'Потврди брисање везе'}</button></div></fieldset></>}
    {error && <p className="form-error" role="alert">{error}</p>}{error.includes('другом прозору') && <button className="text-button" disabled={busy} onClick={() => void onReload()}>Освежи збирку и задржи унос</button>}
  </Modal>;
}
