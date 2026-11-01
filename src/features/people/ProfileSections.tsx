import type { FamilyArchive, Person } from '../../domain/model';
import { contactHref, contactLabels, profileEvents } from '../../domain/profile';

export function LifeTimeline({ archive, person }: { archive: FamilyArchive; person: Person }) {
  const events = profileEvents(archive, person.id);
  if (!events.length && !person.occupations?.length) return null;
  const entries = [
    ...events.map(event => ({ id: event.id, year: event.date?.year, approximate: event.date?.approximate, title: event.type === 'birth' ? 'Рођење' : 'Смрт', detail: archive.places.find(place => place.id === event.placeId)?.name })),
    ...(person.occupations || []).map(item => ({ id: `occupation:${item.id}`, year: item.fromYear, approximate: false, title: item.title, detail: item.toYear !== undefined ? `До ${item.toYear}. године` : undefined })),
  ].sort((a, b) => (a.year ?? Infinity) - (b.year ?? Infinity));
  return <section className="profile-section"><span className="eyebrow">ЗАБЕЛЕЖЕНИ ТРАГОВИ</span><h2>Траг кроз време</h2><ol className="life-timeline">{entries.map(item => <li key={item.id}>
    {item.year !== undefined && <span className="timeline-year">{item.approximate ? 'око ' : ''}{item.year}.</span>}<div><h3>{item.title}</h3>{item.detail && <p>{item.detail}</p>}</div>
  </li>)}</ol></section>;
}

export function ProfileFacts({ person, archive }: { person: Person; archive: FamilyArchive }) {
  const aliases = (person.aliases || []).filter(alias => alias !== person.name);
  const places = archive.places.filter(place => archive.events.some(event => event.personId === person.id && event.placeId === place.id));
  const hasFacts = person.maidenName || aliases.length || person.facts?.length;
  return <>
    {hasFacts && <section className="profile-side-section"><h2>Подаци о особи</h2><dl className="profile-fact-list">
      {person.maidenName && <div><dt>Девојачко презиме</dt><dd>{person.maidenName}</dd></div>}
      {aliases.length > 0 && <div><dt>Друга забележена имена</dt><dd>{aliases.map(alias => <span className="alias-tag" key={alias}>{alias}</span>)}</dd></div>}
      {person.facts?.map(fact => <div key={fact.id}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
    </dl></section>}
    {!!person.contacts?.length && <section className="profile-side-section"><h2>Контакти и линкови</h2><dl className="profile-fact-list">{person.contacts.map(contact => {
      const href = contactHref(contact);
      return <div key={contact.id}><dt>{contact.label || contactLabels[contact.kind]}</dt><dd>{href ? <a href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{contact.value}</a> : contact.value}</dd></div>;
    })}</dl></section>}
    {places.length > 0 && <section className="profile-side-section"><h2>Забележена места</h2><ul className="profile-places">{places.map(place => <li key={place.id}>{place.name}</li>)}</ul></section>}
  </>;
}
