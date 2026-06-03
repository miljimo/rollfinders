import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { distanceMiles } from "./utils";

export type LocationInput = { latitude?: number; longitude?: number };

function hasLocation(location?: LocationInput): location is { latitude: number; longitude: number } {
  return Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude);
}

function addAcademyDistances<T extends { latitude: number; longitude: number; verified?: boolean }>(items: T[], location?: LocationInput) {
  if (!hasLocation(location)) return items.map((item) => ({ ...item, distanceMiles: null as number | null }));
  return items
    .map((item) => ({
      ...item,
      distanceMiles: distanceMiles(location, { latitude: item.latitude, longitude: item.longitude }),
    }))
    .sort((a, b) => (a.distanceMiles ?? Number.MAX_SAFE_INTEGER) - (b.distanceMiles ?? Number.MAX_SAFE_INTEGER) || Number(b.verified) - Number(a.verified));
}

export async function getFeaturedData() {
  const [academies, events] = await Promise.all([
    prisma.academy.findMany({ take: 6, orderBy: { createdAt: "desc" } }),
    prisma.event.findMany({
      take: 6,
      where: { active: true, eventDate: { gte: new Date() } },
      include: { academy: true },
      orderBy: { eventDate: "asc" },
    }),
  ]);

  return { academies, events };
}

export async function searchAcademies(query = "", location?: LocationInput) {
  const q = query.trim();
  const lower = q.toLowerCase();
  const academies = await prisma.academy.findMany({
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
    include: {
      events: {
        where: { eventDate: { gte: new Date() } },
        orderBy: { eventDate: "asc" },
        take: 3,
      },
    },
    orderBy: { name: "asc" },
  });
  return addAcademyDistances(academies, location);
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

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

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
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);
  const weekend = getWeekendRange(today);
  const explicitGi = filters.gi || (lower.includes("no-gi") || lower.includes("nogi") ? "NO_GI" : lower.includes("gi") ? "GI" : "");
  const dateRange =
    filters.when === "today"
      ? { gte: today, lt: tomorrow }
      : filters.when === "tomorrow"
        ? { gte: tomorrow, lt: dayAfterTomorrow }
        : filters.when === "weekend"
          ? weekend
          : { gte: today };

  const events = await prisma.event.findMany({
    where: {
      active: true,
      eventDate: dateRange,
      ...(explicitGi === "GI" ? { giType: { in: ["GI", "BOTH"] } } : {}),
      ...(explicitGi === "NO_GI" ? { giType: { in: ["NO_GI", "BOTH"] } } : {}),
      ...(q
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
        : {}),
    },
    include: { academy: true },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
  });
  const location = { latitude: filters.latitude, longitude: filters.longitude };
  if (!hasLocation(location)) return events.map((event) => ({ ...event, distanceMiles: null as number | null }));

  return events
    .map((event) => ({
      ...event,
      distanceMiles: distanceMiles(location, { latitude: event.academy.latitude, longitude: event.academy.longitude }),
    }))
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime() || (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0) || Number(b.academy.verified) - Number(a.academy.verified));
}

export async function getMapItems() {
  return prisma.academy.findMany({
    include: {
      events: {
        where: { active: true, eventDate: { gte: new Date() } },
        orderBy: { eventDate: "asc" },
        take: 2,
      },
    },
  });
}

export type AcademyWithEvents = Prisma.PromiseReturnType<typeof searchAcademies>[number];
export type EventWithAcademy = Prisma.PromiseReturnType<typeof getOpenMatRadar>[number];
