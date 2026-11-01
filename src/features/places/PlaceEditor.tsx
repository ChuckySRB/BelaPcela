import { useState } from 'react';
import { Modal } from '../../components/Modal';
import type { FamilyArchive, Place } from '../../domain/model';
import type { ArchiveCommand } from '../../services/commands';
import { CoordinateMap } from './CoordinateMap';

export const placeKindLabels = { settlement: 'Насеље', region: 'Област', country: 'Држава', building: 'Зграда / адреса', cemetery: 'Гробље', other: 'Друго место' };
export function placeDraft(place?: Place) { return { name: place?.name || '', alternativeNames: (place?.alternativeNames || []).join('\n'), latitude: String(place?.coordinates?.latitude ?? ''), longitude: String(place?.coordinates?.longitude ?? ''), address: place?.address || '', kind: place?.kind || '', parentPlaceId: place?.parentPlaceId || '', description: place?.description || '' }; }
export type PlaceDraft = ReturnType<typeof placeDraft>;
export function placeDetails(draft: PlaceDraft) {
  if ((draft.latitude === '') !== (draft.longitude === '')) throw new Error('Унесите обе координате или оставите обе празне.');
  return { name: draft.name.trim(), alternativeNames: draft.alternativeNames.split('\n').map(value => value.trim()).filter(Boolean), coordinates: draft.latitude !== '' ? { latitude: Number(draft.latitude), longitude: Number(draft.longitude) } : undefined, address: draft.address.trim() || undefined, kind: draft.kind ? draft.kind as Place['kind'] : undefined, parentPlaceId: draft.parentPlaceId || undefined, description: draft.description.trim() || undefined };
}
export function PlaceFields({ draft, setDraft, archive, excludeId }: { draft: PlaceDraft; setDraft: (draft: PlaceDraft) => void; archive: FamilyArchive; excludeId?: string }) {
  return <>
    <label className="editor-field">Назив места<input data-autofocus required maxLength={200} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
    <label className="editor-field">Историјски и други називи<textarea rows={2} maxLength={10000} placeholder="Један назив у сваком реду" value={draft.alternativeNames} onChange={event => setDraft({ ...draft, alternativeNames: event.target.value })} /></label>
    <div className="year-pair"><label className="editor-field">Врста места<select value={draft.kind} onChange={event => setDraft({ ...draft, kind: event.target.value })}><option value="">Није забележена</option>{Object.entries(placeKindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="editor-field">Надређено место<select value={draft.parentPlaceId} onChange={event => setDraft({ ...draft, parentPlaceId: event.target.value })}><option value="">Без надређеног места</option>{archive.places.filter(place => place.id !== excludeId).map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label></div>
    <label className="editor-field">Адреса<input maxLength={500} value={draft.address} onChange={event => setDraft({ ...draft, address: event.target.value })} /></label>
    <div className="year-pair"><label className="editor-field">Географска ширина<input type="number" min={-90} max={90} step="any" value={draft.latitude} onChange={event => setDraft({ ...draft, latitude: event.target.value })} /></label><label className="editor-field">Географска дужина<input type="number" min={-180} max={180} step="any" value={draft.longitude} onChange={event => setDraft({ ...draft, longitude: event.target.value })} /></label></div>
    <CoordinateMap value={draft.latitude !== '' && draft.longitude !== '' ? { latitude: Number(draft.latitude), longitude: Number(draft.longitude) } : undefined} onChange={value => setDraft({ ...draft, latitude: String(value.latitude), longitude: String(value.longitude) })} />
    <label className="editor-field">Опис места<textarea rows={3} maxLength={20000} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /></label>
  </>;
}
export function PlaceEditor({ place, archive, onClose, onSave, onReload }: { place?: Place; archive: FamilyArchive; onClose: () => void; onSave: (command: ArchiveCommand) => Promise<void>; onReload: () => Promise<void> }) {
  const [draft, setDraft] = useState(() => placeDraft(place)); const [initial] = useState(() => placeDetails(placeDraft(place)));
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <Modal title={place ? 'Измени место' : 'Додај место'} wide onClose={() => { if (!busy) onClose(); }}><form className="editor-form" onSubmit={event => { event.preventDefault(); setBusy(true); setError(''); void (async () => {
    try { const details = placeDetails(draft); const changes = place ? Object.fromEntries(Object.entries(details).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(initial[key as keyof typeof details]))) : details; await onSave({ type: 'savePlace', placeId: place?.id, details: changes }); }
    catch (cause) { setError((cause as Error).message); setBusy(false); }
  })(); }}><fieldset disabled={busy}><PlaceFields draft={draft} setDraft={setDraft} archive={archive} excludeId={place?.id} /></fieldset>{error && <p role="alert" className="form-error">{error}</p>}{error.includes('другом прозору') && <button type="button" className="text-button" onClick={() => void onReload()}>Освежи збирку и задржи унос</button>}<div className="editor-actions"><button type="button" className="button" disabled={busy} onClick={onClose}>Одустани</button><button className="button button--primary" disabled={busy} type="submit">{busy ? 'Чување…' : 'Сачувај место'}</button></div></form></Modal>;
}
