import { z } from "zod";

export const requiredString = (label: string) => z.string().trim().min(1, `${label} is required.`);
export const optionalTrimmedString = z.string().trim().optional().or(z.literal(""));
export const emailAddress = z.string().trim().email("Enter a valid email address.");
export const optionalEmailAddress = z.string().trim().email("Enter a valid email address.").optional().or(z.literal(""));

export const slug = z
  .string()
  .trim()
  .min(2, "Slug must be at least 2 characters.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only.");
