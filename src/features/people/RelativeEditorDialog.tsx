import { useState } from 'react';
import { ArrowLeft, ArrowRight, Baby, GitFork, UserRound, Users } from 'lucide-react';
import { Modal } from '../../components/Modal';
import type { FamilyArchive, ParentageKind, Partnership } from '../../domain/model';
import { parentageLabels, partnershipLabels, personLabel, searchPeople } from '../../domain/people';
import type { ArchiveCommand, RelativeKind } from '../../services/commands';

const options: { kind: RelativeKind; label: string; icon: typeof Users; detail: string }[] = [
  { kind: 'parent', label: 'Родитељ', icon: UserRound, detail: 'Додајте једног познатог родитеља.' },
  { kind: 'child', label: 'Дете', icon: Baby, detail: 'Други родитељ се бира посебно, само ако је познат.' },
  { kind: 'partner', label: 'Партнер', icon: Users, detail: 'Изаберите врсту забележене везе.' },
  { kind: 'sibling', label: 'Брат / сестра', icon: GitFork, detail: 'Забележите сродство и без познатих родитеља.' },
];
export function RelativeEditorDialog({ anchorId, archive, onClose, onSave, onReload }: {
  anchorId: string; archive: FamilyArchive; onClose: () => void; onSave: (command: ArchiveCommand) => Promise<void>; onReload?: () => Promise<void>;
}) {
  const [relationship, setRelationship] = useState<RelativeKind | null>(null);
  const [step, setStep] = useState<'kind' | 'details' | 'review'>('kind');
  const [targetMode, setTargetMode] = useState<'new' | 'existing'>('new');
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [targetId, setTargetId] = useState('');
  const [otherParentId, setOtherParentId] = useState('');
  const [parentageKind, setParentageKind] = useState<ParentageKind>('biological');
  const [partnershipKind, setPartnershipKind] = useState<Partnership['kind']>('unspecified');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const anchor = archive.people.find(person => person.id === anchorId)!;
  const target = archive.people.find(person => person.id === targetId);
  const otherParent = archive.people.find(person => person.id === otherParentId);
  const available = searchPeople(archive.people, query).filter(person => person.id !== anchorId);
  const targetName = targetMode === 'new' ? name.trim() || 'Неименована особа' : target ? personLabel(target) : '';
  const kindLabel = options.find(option => option.kind === relationship)?.label;
  const save = async () => {
    if (!relationship) return;
    setBusy(true); setError('');
    try {
      await onSave({
        type: 'addRelative', anchorId, relationship,
        target: targetMode === 'existing' ? { existingPersonId: targetId } : { newPerson: { name } },
        ...(relationship === 'child' || relationship === 'parent' ? { parentageKind } : {}),
        ...(relationship === 'partner' ? { partnershipKind } : {}),
        ...(relationship === 'child' && otherParentId ? { otherParentId } : {}),
      });
    } catch (cause) { setError((cause as Error).message); setBusy(false); }
  };
  return <Modal title="Додај сродника" onClose={() => { if (!busy) onClose(); }}>
    <p className="dialog-intro">Породична веза за особу <strong>{personLabel(anchor)}</strong></p>
    {step === 'kind' && <div className="relative-options">{options.map(({ kind, label, detail, icon: Icon }) => <button key={kind} className="relative-option" onClick={() => { setRelationship(kind); setStep('details'); }}><Icon size={21} /><span><strong>{label}</strong><small>{detail}</small></span><ArrowRight size={17} /></button>)}</div>}
    {step === 'details' && <form className="editor-form" onSubmit={event => { event.preventDefault(); if (targetMode === 'existing' && !target) { setError('Изаберите постојећу особу.'); return; } setError(''); setStep('review'); }}>
      <div className="mode-switch" role="group" aria-label="Избор особе за везу"><button type="button" aria-pressed={targetMode === 'new'} onClick={() => setTargetMode('new')}>Нова особа</button><button type="button" aria-pressed={targetMode === 'existing'} onClick={() => setTargetMode('existing')}>Постојећа особа</button></div>
      {targetMode === 'new' ? <label className="editor-field">Име и презиме (необавезно)<input maxLength={200} value={name} onChange={event => setName(event.target.value)} /></label>
        : <><label className="editor-field">Претражи постојеће особе<input value={query} onChange={event => setQuery(event.target.value)} /></label><label className="editor-field">Особа за повезивање<select required value={targetId} onChange={event => { setTargetId(event.target.value); if (event.target.value === otherParentId) setOtherParentId(''); }}><option value="">Изаберите особу…</option>{available.map(person => <option key={person.id} value={person.id}>{personLabel(person)}</option>)}</select></label></>}
      {(relationship === 'parent' || relationship === 'child') && <label className="editor-field">Врста родитељства<select value={parentageKind} onChange={event => setParentageKind(event.target.value as ParentageKind)}>{Object.entries(parentageLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
      {relationship === 'partner' && <label className="editor-field">Врста партнерске везе<select value={partnershipKind} onChange={event => setPartnershipKind(event.target.value as Partnership['kind'])}>{Object.entries(partnershipLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
      {relationship === 'child' && <label className="editor-field">Други родитељ (ако је познат)<select value={otherParentId} onChange={event => setOtherParentId(event.target.value)}><option value="">Није познат / не додај другог родитеља</option>{archive.people.filter(person => person.id !== anchorId && (targetMode !== 'existing' || person.id !== targetId)).map(person => <option key={person.id} value={person.id}>{personLabel(person)}</option>)}</select></label>}
      {relationship === 'sibling' && <p className="callout">Ова веза се бележи непосредно. Не додајемо претпостављене родитеље.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="editor-actions"><button type="button" className="text-button" onClick={() => setStep('kind')}><ArrowLeft size={16} />Врста везе</button><button type="submit" className="button button--primary">Прегледај везу<ArrowRight size={16} /></button></div>
    </form>}
    {step === 'review' && <><div className="relation-review"><span className="eyebrow">ПРОВЕРИТЕ ПРЕ ЧУВАЊА</span><h3>{kindLabel}: {targetName}</h3><p>Повезује се са: <strong>{personLabel(anchor)}</strong></p><p>{targetMode === 'new' ? 'Биће додата нова особа.' : 'Повезујемо постојећу особу, без прављења копије.'}</p>
      {(relationship === 'child' || relationship === 'parent') && <p>{parentageLabels[parentageKind]}</p>}
      {relationship === 'child' && <p>{otherParent ? `Други родитељ: ${personLabel(otherParent)}` : 'Други родитељ није познат. Не додаје се претпостављени партнер.'}</p>}
      {relationship === 'partner' && <p>{partnershipLabels[partnershipKind]}</p>}
    </div>{error && <p className="form-error" role="alert">{error}</p>}{onReload && error.includes('другом прозору') && <button className="text-button" onClick={() => void onReload()}>Освежи збирку и задржи унос</button>}<div className="editor-actions"><button className="button" disabled={busy} onClick={() => { setStep('details'); setError(''); }}>Назад</button><button className="button button--primary" disabled={busy} onClick={() => void save()}>{busy ? 'Чување…' : 'Потврди и сачувај'}</button></div></>}
  </Modal>;
}
