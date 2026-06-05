"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAcademyOpenMatCreator, requireOpenMatAccess } from "@/lib/academy-access";
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
  recurring?: boolean;
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
  };
}

function addWeeks(date: Date, weeks: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

async function findDuplicateOpenMat({
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

async function createWeeklyOpenMatOccurrences({
  base,
  createdById,
  excludeId,
  weeks = 12,
}: {
  base: ReturnType<typeof eventData>;
  createdById?: string | null;
  excludeId?: string;
  weeks?: number;
}) {
  for (let week = 1; week < weeks; week += 1) {
    const eventDate = addWeeks(base.eventDate, week);
    const duplicate = await findDuplicateOpenMat({
      id: excludeId,
      academyId: base.academyId,
      title: base.title,
      eventDate,
      startTime: base.startTime,
    });

    if (!duplicate) {
      await prisma.event.create({
        data: {
          ...base,
          eventDate,
          createdById,
        },
      });
    }
  }
}

export async function createOpenMat(_state: EventFormState, formData: FormData): Promise<EventFormState> {
  const parsed = eventSchema.safeParse(getFormValues(formData));

  if (!parsed.success) {
    return validationError(formData, parsed.error.flatten().fieldErrors);
  }

  const access = await requireAcademyOpenMatCreator(parsed.data.academyId);
  const duplicate = await findDuplicateOpenMat(parsed.data);
  if (duplicate) {
    return duplicateOpenMatError(formData);
  }

  const data = eventData(parsed.data);
  await prisma.event.create({ data: { ...data, createdById: access.userId } });
  if (parsed.data.recurring) {
    await createWeeklyOpenMatOccurrences({ base: data, createdById: access.userId });
  }
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
  const duplicate = await findDuplicateOpenMat({ id, ...parsed.data });
  if (duplicate) {
    return duplicateOpenMatError(formData);
  }

  const data = eventData(parsed.data);
  await prisma.event.update({ where: { id }, data });
  if (parsed.data.recurring) {
    await createWeeklyOpenMatOccurrences({ base: data, createdById: existing.createdById, excludeId: id });
  }
  revalidatePath("/admin");
  revalidatePath("/admin/open-mats");
  revalidatePath("/open-mats");
  revalidatePath(`/open-mats/${id}`);
  redirect("/admin/open-mats");
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
