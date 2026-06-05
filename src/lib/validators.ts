import { z } from "zod";
import { AcademyVerificationStatus, GiType } from "@prisma/client";

const checkboxSchema = z.preprocess((value) => value === "on" || value === true, z.boolean());

export const claimRequestSchema = z.object({
  academyId: z.string().min(1),
  requesterName: z.string().min(2).max(120),
  requesterEmail: z.string().email().max(160),
});

export const academySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().min(10),
  affiliation: z.string().optional().nullable(),
  website: z.string().url().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().nullable(),
  address: z.string().min(4),
  city: z.string().min(2),
  postcode: z.string().min(3),
  borough: z.string().optional().or(z.literal("")),
  country: z.string().min(2),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  categories: z.string().optional().or(z.literal("")),
  facebookUrl: z.string().url().optional().or(z.literal("")),
  instagramUrl: z.string().url().optional().or(z.literal("")),
  xUrl: z.string().url().optional().or(z.literal("")),
  dropInPrice: z.coerce.number().nonnegative().optional().or(z.literal("")),
  giAvailable: checkboxSchema,
  nogiAvailable: checkboxSchema,
  beginnerFriendly: checkboxSchema,
  competitionFocused: checkboxSchema,
  verificationStatus: z.enum(AcademyVerificationStatus).default(AcademyVerificationStatus.PENDING),
  featured: checkboxSchema,
  verified: checkboxSchema.optional().default(false),
});

export const eventSchema = z.object({
  academyId: z.string().min(1),
  title: z.string().min(2).max(160),
  description: z.string().min(10),
  eventDate: z.coerce.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  giType: z.enum(GiType),
  price: z.coerce.number().nonnegative(),
  capacity: z.coerce.number().int().positive().optional().or(z.literal("")),
  active: checkboxSchema,
});
