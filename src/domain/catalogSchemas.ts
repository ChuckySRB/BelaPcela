import { z } from 'zod';
import { dateBounds } from './events';

export const recordId = z.string().min(1).max(200);
export const calendarYear = z.number().int().min(-9999).max(9999);
const text = z.string().max(200);
export const dateSchema = z.strictObject({
  year: calendarYear, month: z.number().int().min(1).max(12).optional(), day: z.number().int().min(1).max(31).optional(), approximate: z.boolean().optional(),
  endYear: calendarYear.optional(), endMonth: z.number().int().min(1).max(12).optional(), endDay: z.number().int().min(1).max(31).optional(),
}).superRefine((date, ctx) => {
  const validDay = (year: number, month: number, day: number) => day <= [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if ((date.day !== undefined && date.month === undefined) || (date.endDay !== undefined && date.endMonth === undefined) || ((date.endMonth !== undefined || date.endDay !== undefined) && date.endYear === undefined)
    || (date.day !== undefined && date.month !== undefined && !validDay(date.year, date.month, date.day))
    || (date.endDay !== undefined && date.endMonth !== undefined && date.endYear !== undefined && !validDay(date.endYear, date.endMonth, date.endDay))) {
    ctx.addIssue({ code: 'custom', message: 'Проверите дан, месец и годину. Дан захтева познат месец и годину.' });
  }
  const [start, end] = dateBounds(date);
  if (end < start) ctx.addIssue({ code: 'custom', message: 'Крај периода не може бити пре почетка.' });
});
export const placeDetailsSchema = z.strictObject({
  name: text.trim().min(1), alternativeNames: z.array(text.trim().min(1)).max(50).optional(),
  coordinates: z.strictObject({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).optional(),
  address: z.string().max(500).optional(), kind: z.enum(['settlement', 'region', 'country', 'building', 'cemetery', 'other']).optional(),
  parentPlaceId: recordId.optional(), description: z.string().max(20000).optional(),
});
export const eventDetailsSchema = z.strictObject({
  type: z.enum(['birth', 'death', 'marriage', 'residence', 'migration', 'work', 'burial', 'other']),
  title: text.optional(), participants: z.array(z.strictObject({ personId: recordId, role: z.string().trim().min(1).max(100) })).max(500),
  date: dateSchema.optional(), placeId: recordId.optional(), description: z.string().max(20000).optional(), sourceIds: z.array(recordId).max(100).optional(),
});
export const mediaLinkSchema = z.strictObject({ entityType: z.enum(['person', 'event', 'place', 'source']), entityId: recordId });
export const mediaDetailsSchema = z.strictObject({
  alt: z.string().max(1000), src: z.string().optional(), title: text.optional(), originalFilename: z.string().max(255).optional(),
  mimeType: z.string().max(100).optional(), size: z.number().int().positive().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).optional(), links: z.array(mediaLinkSchema).max(1000).optional(),
});
