import type { Contact, FamilyArchive, Person } from './model';
import { eventHasPerson } from './events';

export const contactLabels: Record<Contact['kind'], string> = { email: 'Е-пошта', phone: 'Телефон', website: 'Веб-сајт', social: 'Друштвена мрежа', other: 'Други контакт' };
export function contactHref(contact: Contact): string | undefined {
  if (/[\r\n]/.test(contact.value)) return undefined;
  if (contact.kind === 'email') return `mailto:${encodeURIComponent(contact.value)}`;
  if (contact.kind === 'phone') {
    const number = contact.value.replace(/[^\d+#*]/g, '');
    return /\d/.test(number) ? `tel:${number}` : undefined;
  }
  if (contact.kind === 'website' || contact.kind === 'social') {
    try { const url = new URL(contact.value); if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return url.href; } catch { /* Stored invalid links remain plain text. */ }
  }
  return undefined;
}
export function profileEvents(archive: FamilyArchive, personId: string) {
  return archive.events.filter(event => eventHasPerson(event, personId) && (event.date || event.placeId || event.title || event.description || !['birth', 'death'].includes(event.type)))
    .sort((a, b) => (a.date?.year ?? Infinity) - (b.date?.year ?? Infinity) || (a.type === 'birth' ? -1 : 1));
}
export function hasProfileDetails(person: Person) {
  return !!(person.biography || person.occupation || person.maidenName || person.aliases?.length || person.occupations?.length || person.contacts?.length || person.facts?.length || person.identityNote);
}
