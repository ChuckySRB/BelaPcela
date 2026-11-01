import { useState } from 'react';
import { ArrowLeft, MapPin, Pencil, Plus } from 'lucide-react';
import type { FamilyArchive } from '../../domain/model';
import { recordHref, useCatalogActions } from '../../app/CatalogContext';
import { EventList } from '../events/EventsPage';
import { CoordinateMap } from './CoordinateMap';
import { placeKindLabels } from './PlaceEditor';
import { personLabel } from '../../domain/people';
import { MediaGallery } from '../media/MediaGallery';

export function PlacesPage({ archive, placeId }: { archive: FamilyArchive; placeId?: string }) {
  const actions = useCatalogActions(); const [query, setQuery] = useState('');
  const place = archive.places.find(place => place.id === placeId);
  if (placeId && !place) return <main className="catalog-page"><h1>Место није пронађено</h1><a href="#/places">Сва места</a></main>;
  if (place) {
    const events = archive.events.filter(event => event.placeId === place.id);
    const ids = new Set(events.flatMap(event => event.participants.map(participant => participant.personId)));
    return <main className="catalog-page" aria-label={`Место: ${place.name}`}><a className="text-button" href="#/places"><ArrowLeft size={16} />Сва места</a><div className="catalog-heading"><div><span className="eyebrow">ПОРОДИЧНИ АТЛАС{place.kind ? ` · ${placeKindLabels[place.kind]}` : ''}</span><h1 tabIndex={-1}>{place.name}</h1>{place.address && <p>{place.address}</p>}</div><button className="button button--primary" onClick={() => actions?.editPlace(place.id)}><Pencil size={16} />Измени место</button></div><div className="detail-columns"><div>
      {place.description && <section className="profile-section"><h2>О месту</h2><p className="preserve-lines">{place.description}</p></section>}
      {place.coordinates && <section className="profile-section"><h2>Координате</h2><p>{place.coordinates.latitude}, {place.coordinates.longitude}</p><CoordinateMap places={[place]} /></section>}
      {events.length > 0 && <section className="profile-section"><h2>Догађаји на овом месту</h2><EventList events={events} archive={archive} /></section>}
      <MediaGallery archive={archive} link={{ entityType: 'place', entityId: place.id }} />
    </div><div>{place.alternativeNames?.length ? <section className="profile-side-section"><h2>Други називи</h2>{place.alternativeNames.map(name => <p key={name}>{name}</p>)}</section> : null}{place.parentPlaceId && <section className="profile-side-section"><h2>Припада месту</h2><a href={recordHref('place', place.parentPlaceId)}>{archive.places.find(item => item.id === place.parentPlaceId)?.name}</a></section>}{ids.size > 0 && <section className="profile-side-section"><h2>Повезане особе</h2>{[...ids].map(id => <a key={id} className="participant-row" href={recordHref('person', id)}>{personLabel(archive.people.find(person => person.id === id))}</a>)}</section>}</div></div></main>;
  }
  const filtered = archive.places.filter(place => `${place.name} ${(place.alternativeNames || []).join(' ')} ${place.address || ''}`.toLocaleLowerCase('sr').includes(query.toLocaleLowerCase('sr'))).sort((a, b) => a.name.localeCompare(b.name, 'sr'));
  return <main className="catalog-page" aria-label="Места"><div className="catalog-heading"><div><span className="eyebrow">ПОРОДИЧНИ АТЛАС</span><h1 tabIndex={-1}>Места</h1><p>Места која чувају породичне трагове.</p></div><button className="button button--primary" onClick={() => actions?.editPlace()}><Plus size={17} />Додај место</button></div><label className="editor-field catalog-search">Претражи места<input value={query} onChange={event => setQuery(event.target.value)} /></label>{filtered.some(place => place.coordinates) && <CoordinateMap places={filtered} />}<div className="catalog-grid">{filtered.map(place => <a className="catalog-card" key={place.id} href={recordHref('place', place.id)}><MapPin size={22} /><h2>{place.name}</h2>{place.kind && <p>{placeKindLabels[place.kind]}</p>}{place.address && <small>{place.address}</small>}<small>{archive.events.filter(event => event.placeId === place.id).length} повезаних догађаја</small></a>)}</div>{!filtered.length && <p className="empty-note">Нема места за овај упит.</p>}</main>;
}
