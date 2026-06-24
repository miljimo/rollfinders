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
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const next = new Date(date);
  next.setUTCDate(1);
  next.setUTCFullYear(year, month, Math.min(day, lastDay));
  return next;
}

export function addYears(date: Date, years: number) {
  const next = new Date(date);
  const targetYear = date.getUTCFullYear() + years;
  const targetMonth = date.getUTCMonth();
  const targetDay = date.getUTCDate();
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  next.setUTCDate(1);
  next.setUTCFullYear(targetYear, targetMonth, Math.min(targetDay, lastDay));
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

function recurrenceIntervalValue(event: Pick<Event, "recurrenceInterval">) {
  return Number.isInteger(event.recurrenceInterval) && event.recurrenceInterval > 0 ? event.recurrenceInterval : 1;
}

export function recurrenceLabel(type: RecurrenceType, interval = 1) {
  const normalizedInterval = Number.isInteger(interval) && interval > 0 ? interval : 1;
  if (type === RecurrenceType.WEEKLY) {
    if (normalizedInterval === 1) return "Weekly";
    if (normalizedInterval === 2) return "Fortnightly";
    return `Every ${normalizedInterval} weeks`;
  }
  if (type === RecurrenceType.MONTHLY) {
    if (normalizedInterval === 1) return "Monthly";
    return `Every ${normalizedInterval} months`;
  }
  if (type === RecurrenceType.YEARLY) return normalizedInterval === 1 ? "Yearly" : `Every ${normalizedInterval} years`;
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
    recurrenceLabel: recurrenceLabel(event.recurrenceType, recurrenceIntervalValue(event)),
  };
}

function nextOccurrenceDate(event: Pick<Event, "eventDate" | "recurrenceInterval">, type: RecurrenceType, index: number) {
  const interval = recurrenceIntervalValue(event);
  if (type === RecurrenceType.WEEKLY) return addDays(event.eventDate, index * 7 * interval);
  if (type === RecurrenceType.MONTHLY) return addMonths(event.eventDate, index * interval);
  if (type === RecurrenceType.YEARLY) return addYears(event.eventDate, index * interval);
  return event.eventDate;
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
    const occurrenceDate = nextOccurrenceDate(event, recurrenceType, index);
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
