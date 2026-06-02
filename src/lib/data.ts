import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function getFeaturedData() {
  const [academies, events] = await Promise.all([
    prisma.academy.findMany({ take: 6, orderBy: { createdAt: "desc" } }),
    prisma.event.findMany({
      take: 6,
      where: { eventDate: { gte: new Date() } },
      include: { academy: true },
      orderBy: { eventDate: "asc" },
    }),
  ]);

  return { academies, events };
}

export async function searchAcademies(query = "") {
  const q = query.trim();
  return prisma.academy.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { postcode: { contains: q, mode: "insensitive" } },
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
  return prisma.event.findMany({
    where: {
      eventDate: { gte: new Date() },
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { academy: { name: { contains: q, mode: "insensitive" } } },
              { academy: { city: { contains: q, mode: "insensitive" } } },
              { academy: { postcode: { contains: q, mode: "insensitive" } } },
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
        where: { eventDate: { gte: new Date() } },
        orderBy: { eventDate: "asc" },
        take: 2,
      },
    },
  });
}

export type AcademyWithEvents = Prisma.PromiseReturnType<typeof searchAcademies>[number];
export type EventWithAcademy = Prisma.PromiseReturnType<typeof searchEvents>[number];
