import { useState } from 'react';
import { ArrowLeft, CalendarDays, Pencil, Plus } from 'lucide-react';
import type { FamilyArchive, LifeEvent } from '../../domain/model';
import { eventLabel, eventTypeLabels, formatDate, participantRoleLabels } from '../../domain/events';
import { personLabel } from '../../domain/people';
import { recordHref, useCatalogActions } from '../../app/CatalogContext';
import { MediaGallery } from '../media/MediaGallery';

export function EventList({ events, archive }: { events: LifeEvent[]; archive: FamilyArchive }) {
  return <div className="catalog-grid">{events.map(event => <a className="catalog-card" href={recordHref('event', event.id)} key={event.id}>
    <CalendarDays size={23} /><span className="eyebrow">{eventTypeLabels[event.type]}</span><h2>{eventLabel(event)}</h2>{event.date && <p>{formatDate(event.date)}</p>}{event.placeId && <p>{archive.places.find(place => place.id === event.placeId)?.name}</p>}{event.participants.length > 0 && <small>{event.participants.map(participant => personLabel(archive.people.find(person => person.id === participant.personId))).join(' · ')}</small>}
  </a>)}</div>;
}
export function EventsPage({ archive, eventId }: { archive: FamilyArchive; eventId?: string }) {
  const actions = useCatalogActions(); const [query, setQuery] = useState(''); const [type, setType] = useState('');
  const event = archive.events.find(event => event.id === eventId);
  if (eventId && !event) return <main className="catalog-page"><h1>Догађај није пронађен</h1><a href="#/events">Сви догађаји</a></main>;
  if (event) return <main className="catalog-page" aria-label={`Догађај: ${eventLabel(event)}`}>
    <a className="text-button" href="#/events"><ArrowLeft size={16} />Сви догађаји</a><div className="catalog-heading"><div><span className="eyebrow">ПОРОДИЧНА ХРОНИКА · {eventTypeLabels[event.type]}</span><h1 tabIndex={-1}>{eventLabel(event)}</h1>{event.date && <p>{formatDate(event.date)}</p>}</div><button className="button button--primary" onClick={() => actions?.editEvent(event.id)}><Pencil size={16} />Измени догађај</button></div>
    <div className="detail-columns"><div>{event.description && <section className="profile-section"><h2>Забелешка о догађају</h2><p className="preserve-lines">{event.description}</p></section>}{event.placeId && <section className="profile-section"><h2>Место догађаја</h2><a className="record-link" href={recordHref('place', event.placeId)}>{archive.places.find(place => place.id === event.placeId)?.name}</a></section>}
      {event.sourceIds?.length ? <section className="profile-section"><h2>Извори</h2>{event.sourceIds.map(id => { const source = archive.sources?.find(source => source.id === id); return <p key={id}>{source?.title || source?.citation || id}</p>; })}</section> : null}
      <MediaGallery archive={archive} link={{ entityType: 'event', entityId: event.id }} />
    </div><div>{event.participants.length > 0 && <section className="profile-side-section"><h2>Учесници</h2>{event.participants.map(participant => <a className="participant-row" key={participant.personId} href={recordHref('person', participant.personId)}><strong>{personLabel(archive.people.find(person => person.id === participant.personId))}</strong><small>{participantRoleLabels[participant.role] || participant.role}</small></a>)}</section>}</div></div>
  </main>;
  const filtered = archive.events.filter(event => (!type || event.type === type) && `${eventLabel(event)} ${event.description || ''} ${archive.places.find(place => place.id === event.placeId)?.name || ''} ${event.participants.map(participant => personLabel(archive.people.find(person => person.id === participant.personId))).join(' ')}`.toLocaleLowerCase('sr').includes(query.toLocaleLowerCase('sr')))
    .sort((a, b) => (a.date?.year ?? Infinity) - (b.date?.year ?? Infinity));
  return <main className="catalog-page" aria-label="Догађаји"><div className="catalog-heading"><div><span className="eyebrow">ЗАБЕЛЕЖЕНИ ТРАГОВИ</span><h1 tabIndex={-1}>Догађаји</h1><p>Један догађај, више породичних прича.</p></div><button className="button button--primary" onClick={() => actions?.editEvent()}><Plus size={17} />Додај догађај</button></div><div className="catalog-filters"><label className="editor-field">Претражи догађаје<input value={query} onChange={event => setQuery(event.target.value)} /></label><label className="editor-field">Врста догађаја<select value={type} onChange={event => setType(event.target.value)}><option value="">Све врсте</option>{Object.entries(eventTypeLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label></div><EventList events={filtered} archive={archive} />{!filtered.length && <p className="empty-note">Нема догађаја за овај приказ.</p>}</main>;
}
