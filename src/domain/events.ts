import type { EventType, GenealogyDate, LifeEvent } from './model';

export const eventTypeLabels: Record<EventType, string> = {
  birth: 'Рођење', death: 'Смрт', marriage: 'Венчање', residence: 'Боравак', migration: 'Сеоба', work: 'Запослење', burial: 'Сахрана', other: 'Други догађај',
};
export const participantRoleLabels: Record<string, string> = { subject: 'Главна особа', partner: 'Партнер', parent: 'Родитељ', witness: 'Сведок', participant: 'Учесник' };
export const eventLabel = (event: LifeEvent) => event.title?.trim() || eventTypeLabels[event.type];
export const eventHasPerson = (event: LifeEvent, id?: string) => !!id && event.participants.some(participant => participant.personId === id);
export const eventHasSubject = (event: LifeEvent, id?: string) => !!id && event.participants.some(participant => participant.personId === id && participant.role === 'subject');
export function formatDate(date?: GenealogyDate): string | undefined {
  if (!date) return undefined;
  const point = (year: number, month?: number, day?: number) => `${day !== undefined ? `${day}.` : ''}${month !== undefined ? `${month}.` : ''}${year}.`;
  return `${date.approximate ? 'око ' : ''}${point(date.year, date.month, date.day)}${date.endYear !== undefined ? ` — ${point(date.endYear, date.endMonth, date.endDay)}` : ''}`;
}
export function dateBounds(date: GenealogyDate): [number, number] {
  return [date.year * 10000 + (date.month ?? 1) * 100 + (date.day ?? 1),
    (date.endYear ?? date.year) * 10000 + (date.endMonth ?? (date.endYear === undefined ? date.month : undefined) ?? 12) * 100 + (date.endDay ?? (date.endYear === undefined ? date.day : undefined) ?? 31)];
}
