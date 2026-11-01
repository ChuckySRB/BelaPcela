import { ArrowUpRight, Crosshair, MapPin, Plus, X, ArrowLeft, ChevronRight, Pencil, Leaf } from 'lucide-react';
import type { FamilyArchive, Person } from '../../domain/model';
import { lifeYears, personLabel, relatives } from '../../domain/people';
import { Portrait } from '../../components/Portrait';
import { HexBadge } from '../../components/HexBadge';
import { useEffect, useRef, useState } from 'react';
import { hasProfileDetails, profileEvents } from '../../domain/profile';
import { LifeTimeline, ProfileFacts } from '../people/ProfileSections';
import { PersonEditorForm } from '../people/PersonEditorDialog';
import type { ArchiveCommand } from '../../services/commands';
import { eventHasSubject, eventLabel, formatDate } from '../../domain/events';
import { useCatalogActions } from '../../app/CatalogContext';
import { MediaGallery } from '../media/MediaGallery';

export interface PersonActions {
  selectPerson: (id: string) => void;
  focusPerson: (id: string) => void;
  openProfile: (id: string) => void;
  addRelative: (id: string) => void;
  editPerson: (id: string) => void;
  showUnavailable: (title: string) => void;
}
type PersonDetailsProps = { person: Person; archive: FamilyArchive; actions: PersonActions };

function Facts({ person, archive }: Pick<PersonDetailsProps, 'person' | 'archive'>) {
  const events = profileEvents(archive, person.id).filter(event => ['birth', 'death'].includes(event.type) && eventHasSubject(event, person.id));
  if (!events.length && !person.occupation) return null;
  return <dl className="person-facts">
    {events.map(event => {
      const place = archive.places.find(place => place.id === event.placeId);
      return <div key={event.id}><dt>{eventLabel(event)}</dt>
        <dd>{event.date && <span>{formatDate(event.date)}</span>}{place && <span className="fact-place"><MapPin size={14} />{place.name}</span>}</dd>
      </div>;
    })}
    {person.occupation && <div><dt>Занимање</dt><dd>{person.occupation}</dd></div>}
  </dl>;
}

function Relations({ person, archive, actions }: PersonDetailsProps) {
  const relations = relatives(archive, person.id);
  if (!relations.length) return null;
  return <section className="relations-section"><div className="section-heading"><h3>Породичне везе</h3><span className="count-pill">{relations.length}</span></div>
    <div className="relations-list">{relations.map(({ person, label, key }) => <button className="relation-row" key={key} onClick={() => actions.selectPerson(person.id)}>
      <Portrait person={person} archive={archive} className="portrait--tiny" />
      <span><strong>{personLabel(person)}</strong><small>{label}</small></span><ChevronRight size={16} />
    </button>)}</div>
  </section>;
}

export function PersonInspector({ person, archive, actions, focused, onClose, hiddenInBranch, onReveal }: PersonDetailsProps & { focused: boolean; onClose: () => void; hiddenInBranch?: boolean; onReveal?: () => void }) {
  return <aside className="inspector" aria-label="Подаци о изабраној особи">
    <div className="inspector-top"><span className="eyebrow">ЛИСТ ИЗ ПОРОДИЧНОГ АЛБУМА</span><button className="icon-button" aria-label="Затвори инспектор" onClick={onClose}><X size={18} /></button></div>
    <div className="inspector-scroll">
      <div className="inspector-person-header"><Portrait person={person} archive={archive} className="portrait--inspector" />
        <span className="inspector-header-ornament"><Leaf size={22} strokeWidth={1} /></span>
        <h2>{personLabel(person)}</h2>
        {person.nickname && <p className="nickname">„{person.nickname}“</p>}
        {lifeYears(archive, person.id) && <p className="life-years">{lifeYears(archive, person.id)}</p>}
        {focused && <span className="focused-label"><HexBadge label="Централна особа" variant="brass"><Crosshair size={12} /></HexBadge>Централна особа стабла</span>}
      </div>
      <div className="inspector-primary-actions"><button className="button button--primary" onClick={() => actions.openProfile(person.id)}>Отвори профил <ArrowUpRight size={17} /></button><button className="icon-button button--outlined" aria-label="Фокусирај изабрану особу" title="Фокусирај (F)" onClick={() => actions.focusPerson(person.id)}><Crosshair size={18} /></button></div>
      <Facts person={person} archive={archive} />
      {hiddenInBranch && <div className="callout"><span>Особа је у склопљеној грани. <button className="text-button" onClick={onReveal}>Прикажи све гране</button></span></div>}
      {person.identityNote && <p className="callout identity-note">Идентитет захтева проверу: {person.identityNote}</p>}
      {person.biography && <section className="biography-preview"><h3>Животна прича</h3><p>{person.biography.split('\n\n')[0]}</p></section>}
      <Relations person={person} archive={archive} actions={actions} />
    </div>
    <div className="inspector-footer"><button className="button button--soft" onClick={() => actions.addRelative(person.id)}><Plus size={17} />Додај сродника</button><button className="icon-button" aria-label="Измени особу" title="Измени особу" onClick={() => actions.editPerson(person.id)}><Pencil size={17} /></button></div>
  </aside>;
}

export function PersonProfilePage({ person, archive, actions, onBack, onSave, onReload }: PersonDetailsProps & { onBack: () => void; onSave: (command: ArchiveCommand) => Promise<void>; onReload: () => Promise<void> }) {
  const catalog = useCatalogActions();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !editing) editButton.current?.focus({ preventScroll: true });
    wasEditing.current = editing;
  }, [editing]);
  return <main className="profile-page" aria-label={`Профил: ${personLabel(person)}`}>
    <button className="text-button" disabled={busy} onClick={onBack}><ArrowLeft size={17} />Назад на стабло</button>
    <div className="profile-hero"><Portrait person={person} archive={archive} className="portrait--profile" /><div><span className="eyebrow">ПОРОДИЧНА ХРОНИКА</span><h1 tabIndex={-1}>{personLabel(person)}</h1>{person.nickname && <p className="nickname">„{person.nickname}“</p>}{lifeYears(archive, person.id) && <p className="life-years">{lifeYears(archive, person.id)}</p>}{person.occupation && <p>{person.occupation}</p>}<div className="profile-actions"><button ref={editButton} className="button button--primary" disabled={busy} onClick={() => setEditing(value => !value)}><Pencil size={16} />{editing ? 'Затвори уређивање' : 'Измени профил'}</button><button className="button button--outlined" disabled={busy} onClick={() => actions.addRelative(person.id)}><Plus size={17} />Додај сродника</button><button className="text-button" disabled={busy} onClick={() => { actions.focusPerson(person.id); onBack(); }}><Crosshair size={16} />Фокусирај у стаблу</button></div></div></div>
    <div className="profile-columns"><div>
      {editing ? <section className="profile-edit-section" aria-label="Уређивање профила"><h2>Уређивање профила</h2><PersonEditorForm key={person.id} person={person} archive={archive} onBusyChange={setBusy} onClose={() => setEditing(false)} onReload={onReload} onSave={async command => { await onSave(command); setEditing(false); setBusy(false); }} /></section> : <>
      {person.identityNote && <p className="callout identity-note"><strong>Идентитет захтева проверу.</strong> {person.identityNote}</p>}
      {person.biography && <section className="profile-section"><span className="eyebrow">СЕЋАЊА КОЈА ОСТАЈУ</span><h2>Животна прича</h2>{person.biography.split('\n\n').map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>}
      <LifeTimeline person={person} archive={archive} />
      {catalog && <button className="button button--soft" onClick={() => catalog.editEvent(undefined, person.id)}><Plus size={16} />Додај догађај</button>}
      <MediaGallery archive={archive} link={{ entityType: 'person', entityId: person.id }} />
      {!hasProfileDetails(person) && !profileEvents(archive, person.id).length && <p className="empty-note">Ова страница хронике тек чека своју причу.</p>}
      </>}
    </div><div><ProfileFacts person={person} archive={archive} /><Relations person={person} archive={archive} actions={{ ...actions, selectPerson: actions.openProfile }} /></div></div>
    <p className="prototype-note">Подаци се чувају само у овом прегледачу.</p>
  </main>;
}
