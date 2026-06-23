import { AcademyVerificationStatus, ClaimStatus, CourseType, Prisma } from "@prisma/client";
import { listAcademiesFromAcademyService } from "./academyService";
import { combineDateAndTime } from "./open-mat-occurrences";
import { distanceMiles } from "./utils";
export { getCourseDiscovery, getCourseOccurrence, getCourses, searchCourses } from "./courses";
import { getCourseDiscovery, getCourseOccurrence } from "./courses";

// Compatibility marker for Course discovery contracts. Implementation lives in `src/lib/courses.ts`.
export const publicCourseDiscoveryWhere: Prisma.EventWhereInput = {
  courseType: {
    in: [
      CourseType.TRAINING,
      CourseType.SEMINAR,
      CourseType.WORKSHOP,
      CourseType.SPARRING,
      CourseType.COMPETITION,
      CourseType.PRIVATE_LESSON,
    ],
  },
};

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

function addAcademyDistances<T extends { latitude: number; longitude: number; verified?: boolean; verificationStatus?: AcademyVerificationStatus; members?: unknown[]; claims?: { status: ClaimStatus }[]; name?: string }>(items: T[], location?: LocationInput) {
  const origin = searchLocation(location);
  return items
    .map((item) => ({
      ...item,
      distanceMiles: distanceMiles(origin, { latitude: item.latitude, longitude: item.longitude }),
    }))
    .sort((a, b) => (a.distanceMiles ?? Number.MAX_SAFE_INTEGER) - (b.distanceMiles ?? Number.MAX_SAFE_INTEGER) || academyTrustRank(b) - academyTrustRank(a) || (a.name ?? "").localeCompare(b.name ?? ""));
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
    listAcademiesFromAcademyService({ q, limit: 100 }),
    getOpenMatRadar({ latitude: location?.latitude, longitude: location?.longitude }),
  ]);
  const eventsByAcademy = new Map<string, typeof events>();
  for (const event of events) {
    const existing = eventsByAcademy.get(event.academyId) ?? [];
    if (existing.length < 3) {
      eventsByAcademy.set(event.academyId, [...existing, event]);
    }
  }

  const locallyFilteredAcademies = academies.filter((academy) => (
    !q
    || academy.name.toLowerCase().includes(lower)
    || academy.city.toLowerCase().includes(lower)
    || (academy.borough ?? "").toLowerCase().includes(lower)
    || academy.postcode.toLowerCase().includes(lower)
    || (academy.affiliation ?? "").toLowerCase().includes(lower)
    || ((lower.includes("no-gi") || lower.includes("nogi")) && academy.nogiAvailable)
    || (lower.includes("gi") && !lower.includes("no-gi") && !lower.includes("nogi") && academy.giAvailable)
    || (lower.includes("beginner") && academy.beginnerFriendly)
    || (lower.includes("competition") && academy.competitionFocused)
  ));

  return addAcademyDistances(locallyFilteredAcademies.map((academy) => ({
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
  courseType?: string;
  latitude?: number;
  longitude?: number;
};

export async function getOpenMatRadar(filters: OpenMatFilters = {}) {
  return getCourseDiscovery({
    ...filters,
    courseType: filters.courseType ?? CourseType.OPEN_MAT,
  });
}

export async function getMapItems() {
  const [academies, events] = await Promise.all([
    listAcademiesFromAcademyService({ limit: 100 }),
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
  const event = await getCourseOccurrence(id, occurrenceDateParam);
  return event?.courseType === CourseType.OPEN_MAT ? event : null;
}

export type AcademyWithEvents = Prisma.PromiseReturnType<typeof searchAcademies>[number];
export type EventWithAcademy = Prisma.PromiseReturnType<typeof getOpenMatRadar>[number];
