import { AcademyVerificationStatus, ClaimStatus, Prisma, RecurrenceType } from "@prisma/client";
import {
  addDays,
  buildOccurrence,
  combineDateAndTime,
  dedupeOccurrences,
  defaultOccurrenceWindowEnd,
  expandEventOccurrences,
  startOfDay,
} from "./open-mat-occurrences";
import { prisma } from "./prisma";
import { distanceMiles } from "./utils";

export type LocationInput = { latitude?: number; longitude?: number };

const defaultSearchLocation = {
  latitude: 51.5072,
  longitude: -0.1276,
};

function hasLocation(location?: LocationInput): location is { latitude: number; longitude: number } {
  return Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude);
}

function searchLocation(location?: LocationInput) {
  return hasLocation(location) ? location : defaultSearchLocation;
}

type TrustRankAcademy = {
  verified?: boolean;
  verificationStatus?: AcademyVerificationStatus;
  members?: unknown[];
  claims?: { status: ClaimStatus }[];
};

function academyTrustRank(academy: TrustRankAcademy) {
  const verified = academy.verificationStatus === AcademyVerificationStatus.VERIFIED || academy.verified === true;
  const managed = Boolean(academy.members?.length) || Boolean(academy.claims?.some((claim) => claim.status === ClaimStatus.APPROVED));
  if (verified && managed) return 3;
  if (managed) return 2;
  if (verified) return 1;
  return 0;
}

function eventCandidatePriority<T extends { academy: TrustRankAcademy }>(item: T) {
  return academyTrustRank(item.academy);
}

function sortByDistance<T extends { distanceMiles?: number | null; name?: string; title?: string }>(items: T[]) {
  return [...items].sort((a, b) => (
    (a.distanceMiles ?? Number.MAX_SAFE_INTEGER) - (b.distanceMiles ?? Number.MAX_SAFE_INTEGER)
    || (a.name ?? a.title ?? "").localeCompare(b.name ?? b.title ?? "")
  ));
}

function sortUpcomingNearYou<T extends { eventDate: Date; startTime: string; academy: TrustRankAcademy & { name?: string }; distanceMiles?: number | null; title?: string; occurrenceStatus?: string }>(items: T[]) {
  return [...items]
    .filter((item) => item.occurrenceStatus !== "COMPLETED")
    .sort((a, b) => (
      combineDateAndTime(a.eventDate, a.startTime).getTime() - combineDateAndTime(b.eventDate, b.startTime).getTime()
      || eventCandidatePriority(b) - eventCandidatePriority(a)
      || (a.distanceMiles ?? Number.MAX_SAFE_INTEGER) - (b.distanceMiles ?? Number.MAX_SAFE_INTEGER)
      || (a.academy.name ?? a.title ?? "").localeCompare(b.academy.name ?? b.title ?? "")
    ));
}

function selectTopCandidates<T>(items: T[], limit: number, score: (item: T) => number) {
  return [...items]
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit);
}

const academyTrustInclude = {
  members: { select: { id: true } },
  claims: { where: { status: ClaimStatus.APPROVED }, select: { status: true } },
} satisfies Prisma.AcademyInclude;

function addAcademyDistances<T extends { latitude: number; longitude: number; verified?: boolean; verificationStatus?: AcademyVerificationStatus; members?: unknown[]; claims?: { status: ClaimStatus }[]; name?: string }>(items: T[], location?: LocationInput) {
  const origin = searchLocation(location);
  return items
    .map((item) => ({
      ...item,
      distanceMiles: distanceMiles(origin, { latitude: item.latitude, longitude: item.longitude }),
    }))
    .sort((a, b) => (a.distanceMiles ?? Number.MAX_SAFE_INTEGER) - (b.distanceMiles ?? Number.MAX_SAFE_INTEGER) || academyTrustRank(b) - academyTrustRank(a) || (a.name ?? "").localeCompare(b.name ?? ""));
}

function addEventDistances<T extends { eventDate: Date; startTime: string; title?: string; academy: { latitude: number; longitude: number; verified?: boolean; verificationStatus?: AcademyVerificationStatus; members?: unknown[]; claims?: { status: ClaimStatus }[]; name?: string } }>(items: T[], location?: LocationInput) {
  const origin = searchLocation(location);
  return items
    .map((item) => ({
      ...item,
      distanceMiles: distanceMiles(origin, { latitude: item.academy.latitude, longitude: item.academy.longitude }),
    }))
    .sort((a, b) => (
      (a.distanceMiles ?? Number.MAX_SAFE_INTEGER) - (b.distanceMiles ?? Number.MAX_SAFE_INTEGER)
      || eventCandidatePriority(b) - eventCandidatePriority(a)
      || a.eventDate.getTime() - b.eventDate.getTime()
      || a.startTime.localeCompare(b.startTime)
      || (a.academy.name ?? a.title ?? "").localeCompare(b.academy.name ?? b.title ?? "")
    ));
}

export async function getFeaturedData(location?: LocationInput) {
  const events = await getOpenMatRadar({ latitude: location?.latitude, longitude: location?.longitude });
  const featuredEvents = sortByDistance(selectTopCandidates(events, 6, eventCandidatePriority));
  const upcomingNearYou = sortUpcomingNearYou(events).slice(0, 3);

  return {
    events: featuredEvents,
    upcomingNearYou,
  };
}

export async function searchAcademies(query = "", location?: LocationInput) {
  const q = query.trim();
  const lower = q.toLowerCase();
  const [academies, events] = await Promise.all([
    prisma.academy.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { borough: { contains: q, mode: "insensitive" } },
            { postcode: { contains: q, mode: "insensitive" } },
            { affiliation: { contains: q, mode: "insensitive" } },
            ...(lower.includes("no-gi") || lower.includes("nogi") ? [{ nogiAvailable: true }] : []),
            ...(lower.includes("gi") && !lower.includes("no-gi") && !lower.includes("nogi") ? [{ giAvailable: true }] : []),
            ...(lower.includes("beginner") ? [{ beginnerFriendly: true }] : []),
            ...(lower.includes("competition") ? [{ competitionFocused: true }] : []),
          ],
        }
      : undefined,
    include: academyTrustInclude,
    orderBy: { name: "asc" },
    }),
    getOpenMatRadar({ latitude: location?.latitude, longitude: location?.longitude }),
  ]);
  const eventsByAcademy = new Map<string, typeof events>();
  for (const event of events) {
    const existing = eventsByAcademy.get(event.academyId) ?? [];
    if (existing.length < 3) {
      eventsByAcademy.set(event.academyId, [...existing, event]);
    }
  }

  return addAcademyDistances(academies.map((academy) => ({
    ...academy,
    events: eventsByAcademy.get(academy.id) ?? [],
  })), location);
}

export async function searchEvents(query = "") {
  const q = query.trim();
  return getOpenMatRadar({ q });
}

export type OpenMatFilters = {
  q?: string;
  when?: string;
  gi?: string;
  latitude?: number;
  longitude?: number;
};

function getWeekendRange(now = new Date()) {
  const today = startOfDay(now);
  const day = today.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7;
  const saturday = addDays(today, daysUntilSaturday);
  return { gte: saturday, lt: addDays(saturday, 2) };
}

export async function getOpenMatRadar(filters: OpenMatFilters = {}) {
  const q = filters.q?.trim() ?? "";
  const lower = q.toLowerCase();
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);
  const weekend = getWeekendRange(today);
  const explicitGi = filters.gi || (lower.includes("no-gi") || lower.includes("nogi") ? "NO_GI" : lower.includes("gi") ? "GI" : "");
  const occurrenceRange =
    filters.when === "today"
      ? { gte: today, lt: tomorrow }
      : filters.when === "tomorrow"
        ? { gte: tomorrow, lt: dayAfterTomorrow }
        : filters.when === "weekend"
          ? weekend
          : { gte: today, lt: defaultOccurrenceWindowEnd(now) };

  const recurrenceWhere: Prisma.EventWhereInput = {
    OR: [
      { recurrenceType: RecurrenceType.NONE, eventDate: occurrenceRange },
      {
        recurrenceType: { not: RecurrenceType.NONE },
        eventDate: { lt: occurrenceRange.lt },
        OR: [{ recurrenceEndDate: null }, { recurrenceEndDate: { gte: occurrenceRange.gte } }],
      },
    ],
  };
  const searchWhere: Prisma.EventWhereInput = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { academy: { name: { contains: q, mode: "insensitive" } } },
          { academy: { city: { contains: q, mode: "insensitive" } } },
          { academy: { borough: { contains: q, mode: "insensitive" } } },
          { academy: { postcode: { contains: q, mode: "insensitive" } } },
          { academy: { affiliation: { contains: q, mode: "insensitive" } } },
          ...(lower.includes("competition") ? [{ academy: { competitionFocused: true } }] : []),
        ],
      }
    : {};

  const events = await prisma.event.findMany({
    where: {
      active: true,
      AND: [recurrenceWhere, searchWhere],
      ...(explicitGi === "GI" ? { giType: { in: ["GI", "BOTH"] } } : {}),
      ...(explicitGi === "NO_GI" ? { giType: { in: ["NO_GI", "BOTH"] } } : {}),
    },
    include: { academy: { include: academyTrustInclude } },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
  });
  const location = { latitude: filters.latitude, longitude: filters.longitude };
  const origin = searchLocation(location);
  const occurrences = dedupeOccurrences(events.flatMap((event) => expandEventOccurrences(event, {
    from: occurrenceRange.gte,
    to: occurrenceRange.lt,
    now,
  })));

  return addEventDistances(occurrences, origin);
}

export async function getMapItems() {
  const [academies, events] = await Promise.all([
    prisma.academy.findMany({ include: academyTrustInclude, orderBy: { name: "asc" } }),
    getOpenMatRadar(),
  ]);
  const eventsByAcademy = new Map<string, typeof events>();
  for (const event of events) {
    const existing = eventsByAcademy.get(event.academyId) ?? [];
    if (existing.length < 2) {
      eventsByAcademy.set(event.academyId, [...existing, event]);
    }
  }

  return addAcademyDistances(academies.map((academy) => ({
    ...academy,
    events: eventsByAcademy.get(academy.id) ?? [],
  })));
}

export async function getOpenMatOccurrence(id: string, occurrenceDateParam?: string) {
  const event = await prisma.event.findUnique({ where: { id }, include: { academy: { include: academyTrustInclude } } });
  if (!event || !event.active) return null;

  const now = new Date();
  const from = occurrenceDateParam ? startOfDay(new Date(`${occurrenceDateParam}T00:00:00.000Z`)) : startOfDay(now);
  const to = occurrenceDateParam ? addDays(from, 1) : defaultOccurrenceWindowEnd(now);
  const occurrences = expandEventOccurrences(event, { from, to, now });

  if (occurrenceDateParam) {
    return occurrences.find((occurrence) => occurrence.occurrenceDateParam === occurrenceDateParam) ?? null;
  }

  return occurrences[0] ?? buildOccurrence(event, event.eventDate, now);
}

export type AcademyWithEvents = Prisma.PromiseReturnType<typeof searchAcademies>[number];
export type EventWithAcademy = Prisma.PromiseReturnType<typeof getOpenMatRadar>[number];
