import { useEffect, useRef, useState, type FocusEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@xyflow/react';
import { ArrowUpRight, X } from 'lucide-react';
import { Portrait } from '../components/Portrait';
import type { FamilyArchive, Person } from '../domain/model';
import { lifeYears, personLabel } from '../domain/people';

export function usePersonPreview(trigger: RefObject<HTMLButtonElement | null>) {
  const [preview, setPreview] = useState<'pointer' | 'keyboard' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissed = useRef(false);
  const cancel = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const close = (restoreFocus = false) => {
    cancel(); dismissed.current = true; setPreview(null);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  };
  const schedule = () => { cancel(); if (!dismissed.current) timer.current = setTimeout(() => { if (!document.querySelector('dialog[open]')) setPreview('pointer'); }, 275); };
  const leave = () => { cancel(); timer.current = setTimeout(() => setPreview(null), 220); };
  return {
    preview, close, keepOpen: cancel, leave,
    openKeyboard: () => { cancel(); dismissed.current = false; setPreview('keyboard'); },
    triggerEvents: {
      onPointerEnter: (event: { pointerType: string }) => { if (event.pointerType !== 'touch') { dismissed.current = false; schedule(); } },
      onPointerLeave: leave,
      onFocus: () => { if (trigger.current?.matches(':focus-visible')) schedule(); },
      onBlur: (event: FocusEvent) => { if (!(event.relatedTarget instanceof Element && event.relatedTarget.closest('.person-hover-card'))) leave(); },
    },
  };
}

export function PersonHoverCard({ person, archive, trigger, keyboard, onClose, onEnter, onLeave, openProfile, selectPerson }: {
  person: Person; archive: FamilyArchive; trigger: RefObject<HTMLButtonElement | null>; keyboard: boolean;
  onClose: (restoreFocus?: boolean) => void; onEnter: () => void; onLeave: () => void;
  openProfile: () => void; selectPerson: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const transform = useStore(state => state.transform);
  const initialTransform = useRef(transform);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    if (keyboard) panel.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(keyboard); }
    };
    const resize = () => closeRef.current(false);
    const modal = (event: Event) => { if (event.target instanceof HTMLDialogElement) closeRef.current(false); };
    window.addEventListener('keydown', key, true);
    window.addEventListener('resize', resize);
    document.addEventListener('beforetoggle', modal, true);
    return () => { window.removeEventListener('keydown', key, true); window.removeEventListener('resize', resize); document.removeEventListener('beforetoggle', modal, true); };
  }, [keyboard]);
  useEffect(() => { if (transform !== initialTransform.current) closeRef.current(false); }, [transform]);
  const bounds = trigger.current?.getBoundingClientRect();
  if (!bounds) return null;
  const width = Math.min(300, window.innerWidth - 24);
  const left = Math.max(12, Math.min(window.innerWidth - width - 12, bounds.right + width + 14 < window.innerWidth ? bounds.right + 12 : bounds.left - width - 12));
  const top = Math.max(12, Math.min(bounds.top, window.innerHeight - 340));
  const birth = archive.events.find(event => event.personId === person.id && event.type === 'birth');
  const place = archive.places.find(place => place.id === birth?.placeId);
  return createPortal(<div ref={panel} className="person-hover-card" role="dialog" aria-label={`Кратак преглед: ${personLabel(person)}`} style={{ left, top, width }}
    onPointerEnter={onEnter} onPointerLeave={onLeave} onFocus={onEnter}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onLeave(); }}>
    <button className="icon-button hover-close" aria-label="Затвори кратак преглед" onClick={() => onClose(keyboard)}><X size={16} /></button>
    <div className="hover-person-header"><Portrait person={person} archive={archive} className="portrait--tiny" /><div><h3>{personLabel(person)}</h3>{person.nickname && <p>„{person.nickname}“</p>}{lifeYears(archive, person.id) && <small>{lifeYears(archive, person.id)}</small>}</div></div>
    {person.occupation && <p className="hover-occupation">{person.occupation}</p>}
    {place && <p className="hover-place">Место рођења: {place.name}</p>}
    {person.biography && <p className="hover-biography">{person.biography}</p>}
    <div className="hover-actions"><button className="button button--soft" onClick={selectPerson}>Подаци о особи</button><button className="button button--primary" onClick={openProfile}>Профил<ArrowUpRight size={15} /></button></div>
  </div>, document.body);
}
