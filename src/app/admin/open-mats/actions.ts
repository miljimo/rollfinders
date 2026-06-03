"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAcademyEditor } from "@/lib/academy-access";
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
}) {
  return {
    ...data,
    capacity: data.capacity === "" || data.capacity === undefined ? null : data.capacity,
  };
}

export async function createOpenMat(_state: EventFormState, formData: FormData): Promise<EventFormState> {
  const parsed = eventSchema.safeParse(getFormValues(formData));

  if (!parsed.success) {
    return validationError(formData, parsed.error.flatten().fieldErrors);
  }

  await requireAcademyEditor(parsed.data.academyId);
  await prisma.event.create({ data: eventData(parsed.data) });
  revalidatePath("/admin");
  revalidatePath("/open-mats");
  redirect("/admin");
}

export async function updateOpenMat(id: string, _state: EventFormState, formData: FormData): Promise<EventFormState> {
  const parsed = eventSchema.safeParse(getFormValues(formData));

  if (!parsed.success) {
    return validationError(formData, parsed.error.flatten().fieldErrors);
  }

  await requireAcademyEditor(parsed.data.academyId);
  await prisma.event.update({ where: { id }, data: eventData(parsed.data) });
  revalidatePath("/admin");
  revalidatePath("/open-mats");
  revalidatePath(`/open-mats/${id}`);
  redirect("/admin");
}

export async function deleteOpenMat(id: string) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return;
  await requireAcademyEditor(event.academyId);
  await prisma.event.delete({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/open-mats");
  redirect("/admin");
}
