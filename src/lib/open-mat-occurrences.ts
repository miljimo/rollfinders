import { RecurrenceType, type Academy, type Event } from "@prisma/client";

export type OpenMatOccurrenceStatus = "UPCOMING" | "IN_SESSION" | "COMPLETED";

export type OpenMatOccurrence<T extends Event & { academy?: Academy } = Event & { academy: Academy }> = T & {
  occurrenceId: string;
  occurrenceDate: Date;
  occurrenceDateParam: string;
  occurrenceStatus: OpenMatOccurrenceStatus;
  isRecurringOccurrence: boolean;
  recurrenceLabel: string;
};

const defaultOccurrenceWindowMonths = 12;
const openMatTimeZone = "Europe/London";

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number) {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const day = date.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const next = new Date(date);
  next.setFullYear(year, month, Math.min(day, lastDay));
  return next;
}

export function addYears(date: Date, years: number) {
  const next = new Date(date);
  const targetYear = date.getFullYear() + years;
  const targetMonth = date.getMonth();
  const targetDay = date.getDate();
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  next.setFullYear(targetYear, targetMonth, Math.min(targetDay, lastDay));
  return next;
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const zonedAsUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
  return zonedAsUtc - date.getTime();
}

export function combineDateAndTime(date: Date, time: string) {
  const [hours = "0", minutes = "0"] = time.split(":");
  const [year, month, day] = dateKey(date).split("-").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, Number(hours), Number(minutes), 0, 0));
  const offset = timeZoneOffsetMs(utcGuess, openMatTimeZone);
  const corrected = new Date(utcGuess.getTime() - offset);
  const correctedOffset = timeZoneOffsetMs(corrected, openMatTimeZone);
  return new Date(utcGuess.getTime() - correctedOffset);
}

export function occurrenceStatus(eventDate: Date, startTime: string, endTime: string, now = new Date()): OpenMatOccurrenceStatus {
  const start = combineDateAndTime(eventDate, startTime);
  const end = combineDateAndTime(eventDate, endTime);
  if (now >= start && now <= end) return "IN_SESSION";
  if (now > end) return "COMPLETED";
  return "UPCOMING";
}

export function isPublicOccurrenceVisible(eventDate: Date, endTime: string, now = new Date()) {
  return combineDateAndTime(eventDate, endTime) >= now;
}

export function recurrenceLabel(type: RecurrenceType) {
  if (type === RecurrenceType.WEEKLY) return "Weekly";
  if (type === RecurrenceType.MONTHLY) return "Monthly";
  if (type === RecurrenceType.YEARLY) return "Yearly";
  return "One-off";
}

export function defaultOccurrenceWindowEnd(now = new Date()) {
  return addMonths(startOfDay(now), defaultOccurrenceWindowMonths);
}

export function buildOccurrence<T extends Event & { academy?: Academy }>(
  event: T,
  occurrenceDate: Date,
  now = new Date(),
): OpenMatOccurrence<T> {
  const param = dateKey(occurrenceDate);
  const recurring = event.recurrenceType !== RecurrenceType.NONE;

  return {
    ...event,
    eventDate: occurrenceDate,
    occurrenceId: recurring ? `${event.id}:${param}` : event.id,
    occurrenceDate: occurrenceDate,
    occurrenceDateParam: param,
    occurrenceStatus: occurrenceStatus(occurrenceDate, event.startTime, event.endTime, now),
    isRecurringOccurrence: recurring,
    recurrenceLabel: recurrenceLabel(event.recurrenceType),
  };
}

function nextOccurrenceDate(sourceDate: Date, type: RecurrenceType, index: number) {
  if (type === RecurrenceType.WEEKLY) return addDays(sourceDate, index * 7);
  if (type === RecurrenceType.MONTHLY) return addMonths(sourceDate, index);
  if (type === RecurrenceType.YEARLY) return addYears(sourceDate, index);
  return sourceDate;
}

export function expandEventOccurrences<T extends Event & { academy?: Academy }>(
  event: T,
  {
    from,
    to = defaultOccurrenceWindowEnd(),
    now = new Date(),
    publicOnly = true,
  }: {
    from: Date;
    to?: Date;
    now?: Date;
    publicOnly?: boolean;
  },
) {
  const recurrenceType = event.recurrenceType;
  if (recurrenceType === RecurrenceType.NONE) {
    const inWindow = event.eventDate >= from && event.eventDate < to;
    if (!inWindow) return [];
    if (publicOnly && !isPublicOccurrenceVisible(event.eventDate, event.endTime, now)) return [];
    return [buildOccurrence(event, event.eventDate, now)];
  }

  const occurrences: OpenMatOccurrence<T>[] = [];
  const limit = event.recurrenceLimit ?? Number.POSITIVE_INFINITY;
  const recurrenceEnd = event.recurrenceEndDate ? startOfDay(event.recurrenceEndDate) : to;

  for (let index = 0; index < limit; index += 1) {
    const occurrenceDate = nextOccurrenceDate(event.eventDate, recurrenceType, index);
    if (occurrenceDate > recurrenceEnd || occurrenceDate >= to) break;
    if (occurrenceDate < from && !isSameDay(occurrenceDate, from)) continue;
    if (publicOnly && !isPublicOccurrenceVisible(occurrenceDate, event.endTime, now)) continue;
    occurrences.push(buildOccurrence(event, occurrenceDate, now));
  }

  return occurrences;
}

function isSameDay(a: Date, b: Date) {
  return dateKey(a) === dateKey(b);
}

export function dedupeOccurrences<T extends OpenMatOccurrence>(occurrences: T[]) {
  const visible = new Map<string, T>();

  for (const occurrence of occurrences) {
    const key = [
      occurrence.academyId,
      occurrence.title.trim().toLowerCase(),
      occurrence.occurrenceDateParam,
      occurrence.startTime,
    ].join("|");
    const existing = visible.get(key);
    if (!existing || (!occurrence.isRecurringOccurrence && existing.isRecurringOccurrence)) {
      visible.set(key, occurrence);
    }
  }

  return Array.from(visible.values());
}
