import { ArrowUpRight, Crosshair, MapPin, Plus, X, ArrowLeft, ChevronRight, Pencil, Leaf } from 'lucide-react';
import type { FamilyArchive, Person } from '../../domain/model';
import { lifeYears, personLabel, relatives } from '../../domain/people';
import { Portrait } from '../../components/Portrait';
import { HexBadge } from '../../components/HexBadge';

export interface PersonActions {
  selectPerson: (id: string) => void;
  focusPerson: (id: string) => void;
  openProfile: (id: string) => void;
  addRelative: (id: string) => void;
  showUnavailable: (title: string) => void;
}
type PersonDetailsProps = { person: Person; archive: FamilyArchive; actions: PersonActions };

function Facts({ person, archive }: Pick<PersonDetailsProps, 'person' | 'archive'>) {
  const events = archive.events.filter(event => event.personId === person.id && (event.date || event.placeId));
  if (!events.length && !person.occupation) return null;
  return <dl className="person-facts">
    {events.map(event => {
      const place = archive.places.find(place => place.id === event.placeId);
      return <div key={event.id}><dt>{event.type === 'birth' ? 'Рођење' : 'Смрт'}</dt>
        <dd>{event.date && <span>{event.date.approximate ? 'Око ' : ''}{event.date.year}.</span>}{place && <span className="fact-place"><MapPin size={14} />{place.name}</span>}</dd>
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

export function PersonInspector({ person, archive, actions, focused, onClose }: PersonDetailsProps & { focused: boolean; onClose: () => void }) {
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
      {person.biography && <section className="biography-preview"><h3>Животна прича</h3><p>{person.biography.split('\n\n')[0]}</p></section>}
      <Relations person={person} archive={archive} actions={actions} />
    </div>
    <div className="inspector-footer"><button className="button button--soft" onClick={() => actions.addRelative(person.id)}><Plus size={17} />Додај сродника</button><button className="icon-button" aria-label="Измени особу — у припреми" title="Измена · у припреми" onClick={() => actions.showUnavailable('Измена особе')}><Pencil size={17} /></button></div>
  </aside>;
}

export function PersonProfilePage({ person, archive, actions, onBack }: PersonDetailsProps & { onBack: () => void }) {
  return <main className="profile-page" aria-label={`Профил: ${personLabel(person)}`}>
    <button className="text-button" onClick={onBack}><ArrowLeft size={17} />Назад на стабло</button>
    <div className="profile-hero"><Portrait person={person} archive={archive} className="portrait--profile" /><div><span className="eyebrow">ПОРОДИЧНА ХРОНИКА · ДЕМО</span><h1 tabIndex={-1}>{personLabel(person)}</h1>{person.nickname && <p className="nickname">„{person.nickname}“</p>}{lifeYears(archive, person.id) && <p className="life-years">{lifeYears(archive, person.id)}</p>}{person.occupation && <p>{person.occupation}</p>}<button className="button button--primary" onClick={() => actions.addRelative(person.id)}><Plus size={17} />Додај сродника</button></div></div>
    <div className="profile-columns"><div>
      {person.biography && <section className="profile-section"><span className="eyebrow">СЕЋАЊА КОЈА ОСТАЈУ</span><h2>Животна прича</h2>{person.biography.split('\n\n').map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>}
      {archive.events.some(event => event.personId === person.id) && <section className="profile-section"><h2>Траг кроз време</h2><Facts person={person} archive={archive} /></section>}
      {!person.biography && !archive.events.some(event => event.personId === person.id) && <p className="empty-note">Ова страница хронике тек чека своју причу.</p>}
    </div><div><Relations person={person} archive={archive} actions={{ ...actions, selectPerson: actions.openProfile }} /></div></div>
    <p className="prototype-note">Пробни приказ профила. Сви приказани подаци су измишљени.</p>
  </main>;
}
