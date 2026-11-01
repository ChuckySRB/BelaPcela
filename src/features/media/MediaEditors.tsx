import { useRef, useState } from 'react';
import type { FamilyArchive, Media, MediaLink } from '../../domain/model';
import { Modal } from '../../components/Modal';
import { MEDIA_ACCEPT } from '../../services/mediaImport';
import { personLabel } from '../../domain/people';
import { eventLabel } from '../../domain/events';
import type { ArchiveCommand } from '../../services/commands';

export function MediaLinksEditor({ links, setLinks, archive }: { links: MediaLink[]; setLinks: (links: MediaLink[]) => void; archive: FamilyArchive }) {
  const [query, setQuery] = useState('');
  const groups = [
    { kind: 'person' as const, label: 'Особе', records: archive.people.map(person => ({ id: person.id, label: personLabel(person) })) },
    { kind: 'event' as const, label: 'Догађаји', records: archive.events.map(event => ({ id: event.id, label: `${eventLabel(event)}${event.participants.length ? ` · ${event.participants.map(participant => personLabel(archive.people.find(person => person.id === participant.personId))).join(', ')}` : ''}` })) },
    { kind: 'place' as const, label: 'Места', records: archive.places.map(place => ({ id: place.id, label: place.name })) },
  ];
  return <section className="media-links-editor"><h3>Повежи са збирком</h3><label className="editor-field">Пронађи запис за повезивање<input value={query} onChange={event => setQuery(event.target.value)} /></label><div className="media-links-options">{groups.map(group => <fieldset key={group.kind}><legend>{group.label}</legend>{group.records.filter(record => record.label.toLocaleLowerCase('sr').includes(query.toLocaleLowerCase('sr')) || links.some(link => link.entityType === group.kind && link.entityId === record.id)).map(record => {
    const checked = links.some(link => link.entityType === group.kind && link.entityId === record.id);
    return <label className="checkbox-field" key={record.id}><input type="checkbox" checked={checked} onChange={event => setLinks(event.target.checked ? [...links, { entityType: group.kind, entityId: record.id }] : links.filter(link => !(link.entityType === group.kind && link.entityId === record.id)))} />{record.label}</label>;
  })}</fieldset>)}</div><p className="prototype-note">Једна датотека може припадати већем броју особа, догађаја и места.</p></section>;
}
export function MediaUploadDialog({ links: initialLinks, archive, onClose, onUpload }: { links: MediaLink[]; archive: FamilyArchive; onClose: () => void; onUpload: (files: File[], links: MediaLink[]) => Promise<void> }) {
  const [files, setFiles] = useState<File[]>([]); const [links, setLinks] = useState(initialLinks); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  return <Modal title="Додај фотографије и датотеке" wide onClose={() => { if (!busy) onClose(); }}><form className="editor-form" onSubmit={event => { event.preventDefault(); setBusy(true); setError(''); void onUpload(files, links).catch(cause => { setError((cause as Error).message); setBusy(false); }); }}><fieldset disabled={busy}>
    <label className="editor-field file-picker">Изабери датотеке<input type="file" multiple required accept={MEDIA_ACCEPT} onChange={event => setFiles(Array.from(event.target.files || []))} /></label><p className="prototype-note">Фотографије, PDF, TXT, звук и видео. До 25 MB по датотеци, 20 датотека и 100 MB по уносу. Оригинали остају у овом прегледачу.</p>{files.length > 0 && <ul className="file-selection">{files.map((file, index) => <li key={index}>{file.name} <small>{(file.size / 1024).toFixed(1)} KB</small></li>)}</ul>}
    <MediaLinksEditor links={links} setLinks={setLinks} archive={archive} />
  </fieldset>{error && <p className="form-error" role="alert">{error}</p>}<div className="editor-actions"><button type="button" className="button" disabled={busy} onClick={onClose}>Одустани</button><button type="submit" className="button button--primary" disabled={busy || !files.length}>{busy ? 'Припрема и чување…' : 'Сачувај датотеке'}</button></div></form></Modal>;
}
export function MediaEditor({ media, archive, onClose, onSave, onReload }: { media: Media; archive: FamilyArchive; onClose: () => void; onSave: (command: ArchiveCommand) => Promise<void>; onReload: () => Promise<void> }) {
  const [title, setTitle] = useState(media.title || ''); const [alt, setAlt] = useState(media.alt); const [tags, setTags] = useState((media.tags || []).join(', ')); const [links, setLinks] = useState(media.links || []);
  const initial = useRef({ title: title.trim() || undefined, alt: alt.trim(), tags: media.tags || [], links }); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <Modal title="Опис и везе датотеке" wide onClose={() => { if (!busy) onClose(); }}><form className="editor-form" onSubmit={event => { event.preventDefault(); setBusy(true); setError(''); const details = { title: title.trim() || undefined, alt: alt.trim(), tags: [...new Set(tags.split(',').map(tag => tag.trim()).filter(Boolean))], links };
    const changes = Object.fromEntries(Object.entries(details).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(initial.current[key as keyof typeof details])));
    void onSave({ type: 'updateMedia', mediaId: media.id, details: changes }).catch(cause => { setError((cause as Error).message); setBusy(false); });
  }}><fieldset disabled={busy}><label className="editor-field">Наслов датотеке<input data-autofocus maxLength={200} value={title} onChange={event => setTitle(event.target.value)} /></label><label className="editor-field">Опис фотографије за читање<input maxLength={1000} value={alt} onChange={event => setAlt(event.target.value)} /></label><label className="editor-field">Ознаке (одвојене зарезом)<input value={tags} maxLength={1500} onChange={event => setTags(event.target.value)} /></label><MediaLinksEditor links={links} setLinks={setLinks} archive={archive} /></fieldset>{error && <p className="form-error" role="alert">{error}</p>}{error.includes('другом прозору') && <button type="button" className="text-button" onClick={() => void onReload()}>Освежи збирку и задржи унос</button>}<div className="editor-actions"><button type="button" className="button" disabled={busy} onClick={onClose}>Одустани</button><button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Чување…' : 'Сачувај опис'}</button></div></form></Modal>;
}
