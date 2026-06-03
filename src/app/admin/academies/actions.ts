"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { academySchema } from "@/lib/validators";

export type AcademyFormState = {
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

function toNullable(value: string | null | undefined) {
  return value ? value : null;
}

function toNullableNumber(value: number | "" | undefined) {
  return value === "" || value === undefined ? null : value;
}

function validationError(formData: FormData, fieldErrors: Record<string, string[] | undefined>): AcademyFormState {
  return {
    message: "Please fix the highlighted fields and try again.",
    fieldErrors,
    values: getFormValues(formData),
  };
}

function duplicateSlugError(formData: FormData): AcademyFormState {
  return {
    message: "An academy with this slug already exists.",
    fieldErrors: { slug: ["Use a unique slug for this academy."] },
    values: getFormValues(formData),
  };
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function createAcademy(_state: AcademyFormState, formData: FormData): Promise<AcademyFormState> {
  await requireAdminPage();

  const parsed = academySchema.safeParse(getFormValues(formData));
  if (!parsed.success) {
    return validationError(formData, parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;

  try {
    await prisma.academy.create({
      data: {
        ...data,
        borough: toNullable(data.borough),
        website: toNullable(data.website),
        email: toNullable(data.email),
        logoUrl: toNullable(data.logoUrl),
        dropInPrice: toNullableNumber(data.dropInPrice),
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return duplicateSlugError(formData);
    }
    throw error;
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateAcademy(
  id: string,
  _state: AcademyFormState,
  formData: FormData,
): Promise<AcademyFormState> {
  await requireAdminPage();

  const parsed = academySchema.safeParse(getFormValues(formData));
  if (!parsed.success) {
    return validationError(formData, parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;

  try {
    await prisma.academy.update({
      where: { id },
      data: {
        ...data,
        borough: toNullable(data.borough),
        website: toNullable(data.website),
        email: toNullable(data.email),
        logoUrl: toNullable(data.logoUrl),
        dropInPrice: toNullableNumber(data.dropInPrice),
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return duplicateSlugError(formData);
    }
    throw error;
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/academies/${id}`);
  redirect("/admin");
}
