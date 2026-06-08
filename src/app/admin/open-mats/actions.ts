"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { RecurrenceType, type Event } from "@prisma/client";
import { requireAcademyOpenMatCreator, requireOpenMatAccess } from "@/lib/academy-access";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";
import { dateKey, defaultOccurrenceWindowEnd, expandEventOccurrences, startOfDay } from "@/lib/open-mat-occurrences";
import { recordOpenMatCreatedActivity } from "@/lib/platform-admin-activity";
import { prisma } from "@/lib/prisma";
import { eventSchema } from "@/lib/validators";

export type EventFormState = {
  message: string;
  fieldErrors: Record<string, string[] | undefined>;
  values: Record<string, string>;
};

function getFormValues(formData: FormData) {
  return Object.fromEntries(
    Array.from(formData.entries())
      .filter(([key]) => !key.startsWith("$ACTION_"))
      .map(([key, value]) => [key, String(value)]),
  );
}

function validationError(formData: FormData, fieldErrors: Record<string, string[] | undefined>): EventFormState {
  return {
    message: "Please fix the highlighted fields and try again.",
    fieldErrors,
    values: getFormValues(formData),
  };
}

function duplicateOpenMatError(formData: FormData): EventFormState {
  return {
    message: "An open mat with this academy, title, date, and start time already exists.",
    fieldErrors: {
      title: ["Use the existing open mat or choose a different title/time."],
      eventDate: ["This date already has a matching open mat."],
      startTime: ["This start time already has a matching open mat."],
    },
    values: getFormValues(formData),
  };
}

function eventData(data: {
  academyId: string;
  title: string;
  description: string;
  eventDate: Date;
  startTime: string;
  endTime: string;
  giType: "GI" | "NO_GI" | "BOTH";
  price: number;
  capacity?: number | "";
  active: boolean;
  recurrenceType: RecurrenceType;
  recurrenceEndDate?: Date;
  recurrenceLimit?: number;
}) {
  return {
    academyId: data.academyId,
    title: data.title,
    description: data.description,
    eventDate: data.eventDate,
    startTime: data.startTime,
    endTime: data.endTime,
    giType: data.giType,
    price: data.price,
    active: data.active,
    capacity: data.capacity === "" || data.capacity === undefined ? null : data.capacity,
    recurrenceType: data.recurrenceType,
    recurrenceEndDate: data.recurrenceType === RecurrenceType.NONE ? null : data.recurrenceEndDate ?? null,
    recurrenceLimit: data.recurrenceType === RecurrenceType.NONE ? null : data.recurrenceLimit ?? null,
  };
}

async function findDuplicateSourceOpenMat({
  id,
  academyId,
  title,
  eventDate,
  startTime,
}: {
  id?: string;
  academyId: string;
  title: string;
  eventDate: Date;
  startTime: string;
}) {
  return prisma.event.findFirst({
    where: {
      ...(id ? { id: { not: id } } : {}),
      academyId,
      title: { equals: title.trim(), mode: "insensitive" },
      eventDate,
      startTime,
    },
    select: { id: true },
  });
}

function occurrenceDatesFor(data: ReturnType<typeof eventData>, from = startOfDay(data.eventDate), to = defaultOccurrenceWindowEnd(from)) {
  const event = {
    id: "__candidate__",
    academyId: data.academyId,
    createdById: null,
    title: data.title,
    description: data.description,
    eventDate: data.eventDate,
    startTime: data.startTime,
    endTime: data.endTime,
    giType: data.giType,
    price: data.price,
    capacity: data.capacity,
    active: data.active,
    recurrenceType: data.recurrenceType,
    recurrenceEndDate: data.recurrenceEndDate,
    recurrenceLimit: data.recurrenceLimit,
    createdAt: new Date(),
  } as unknown as Event;

  return new Set(expandEventOccurrences(event, { from, to, publicOnly: false }).map((occurrence) => dateKey(occurrence.eventDate)));
}

async function findDuplicateOpenMat({
  id,
  data,
}: {
  id?: string;
  data: ReturnType<typeof eventData>;
}) {
  const sourceDuplicate = await findDuplicateSourceOpenMat({
    id,
    academyId: data.academyId,
    title: data.title,
    eventDate: data.eventDate,
    startTime: data.startTime,
  });
  if (sourceDuplicate) return sourceDuplicate;

  const from = startOfDay(data.eventDate);
  const to = data.recurrenceEndDate ?? defaultOccurrenceWindowEnd(from);
  const candidateDates = occurrenceDatesFor(data, from, to);
  const existingEvents = await prisma.event.findMany({
    where: {
      ...(id ? { id: { not: id } } : {}),
      academyId: data.academyId,
      title: { equals: data.title.trim(), mode: "insensitive" },
      startTime: data.startTime,
      OR: [
        { eventDate: { gte: from, lt: to } },
        {
          recurrenceType: { not: RecurrenceType.NONE },
          eventDate: { lt: to },
          OR: [{ recurrenceEndDate: null }, { recurrenceEndDate: { gte: from } }],
        },
      ],
    },
  });

  for (const existing of existingEvents) {
    const existingDates = occurrenceDatesFor({
      academyId: existing.academyId,
      title: existing.title,
      description: existing.description,
      eventDate: existing.eventDate,
      startTime: existing.startTime,
      endTime: existing.endTime,
      giType: existing.giType,
      price: Number(existing.price),
      active: existing.active,
      capacity: existing.capacity,
      recurrenceType: existing.recurrenceType,
      recurrenceEndDate: existing.recurrenceEndDate,
      recurrenceLimit: existing.recurrenceLimit,
    }, from, to);

    for (const existingDate of existingDates) {
      if (candidateDates.has(existingDate)) return { id: existing.id };
    }
  }

  return null;
}

export async function createOpenMat(_state: EventFormState, formData: FormData): Promise<EventFormState> {
  const parsed = eventSchema.safeParse(getFormValues(formData));

  if (!parsed.success) {
    return validationError(formData, parsed.error.flatten().fieldErrors);
  }

  const access = await requireAcademyOpenMatCreator(parsed.data.academyId);
  const data = eventData(parsed.data);
  const duplicate = await findDuplicateOpenMat({ data });
  if (duplicate) {
    return duplicateOpenMatError(formData);
  }

  const event = await prisma.event.create({ data: { ...data, createdById: access.userId } });
  await recordOpenMatCreatedActivity(access.userId, event.id);
  await recordAnalyticsEventBestEffort({
    eventName: "open_mat_created",
    academyId: event.academyId,
    openMatId: event.id,
    source: "admin_open_mats",
    metadata: {
      actorUserId: access.userId,
      recurrenceType: event.recurrenceType,
    },
  });

  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const redirectTo = returnTo.startsWith("/admin") ? returnTo : "/admin/open-mats";
  revalidatePath("/admin");
  revalidatePath("/admin/open-mats");
  revalidatePath("/open-mats");
  redirect(redirectTo);
}

export async function updateOpenMat(id: string, _state: EventFormState, formData: FormData): Promise<EventFormState> {
  const parsed = eventSchema.safeParse(getFormValues(formData));

  if (!parsed.success) {
    return validationError(formData, parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.event.findUnique({ where: { id }, select: { academyId: true, createdById: true } });
  if (!existing) redirect("/admin/open-mats");
  await requireOpenMatAccess(existing, "edit");
  if (parsed.data.academyId !== existing.academyId) {
    await requireAcademyOpenMatCreator(parsed.data.academyId);
  }
  const data = eventData(parsed.data);
  const duplicate = await findDuplicateOpenMat({ id, data });
  if (duplicate) {
    return duplicateOpenMatError(formData);
  }

  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const redirectTo = returnTo.startsWith("/admin?panel=open-mats") ? returnTo : "/admin?panel=open-mats";
  await prisma.event.update({ where: { id }, data });
  revalidatePath("/admin");
  revalidatePath("/admin/open-mats");
  revalidatePath("/open-mats");
  revalidatePath(`/open-mats/${id}`);
  redirect(redirectTo);
}

export async function deleteOpenMat(id: string) {
  const event = await prisma.event.findUnique({ where: { id }, select: { academyId: true, createdById: true } });
  if (!event) return;
  await requireOpenMatAccess(event, "delete");
  await prisma.event.delete({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/admin/open-mats");
  revalidatePath("/open-mats");
  redirect("/admin/open-mats");
}
