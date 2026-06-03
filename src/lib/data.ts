import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

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

export async function searchAcademies(query = "") {
  const q = query.trim();
  const lower = q.toLowerCase();
  return prisma.academy.findMany({
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
}

export async function searchEvents(query = "") {
  const q = query.trim();
  return getOpenMatRadar({ q });
}

export type OpenMatFilters = {
  q?: string;
  when?: string;
  gi?: string;
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

  return prisma.event.findMany({
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
