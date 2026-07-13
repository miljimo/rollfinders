import { z } from "zod";
import { AcademyVerificationStatus, BjjBeltRank, ClaimRequesterRole, EventAudience, EventPricingType, GiType, RecurrenceType } from "@prisma/client";
import type { CourseType } from "@prisma/client";

const checkboxSchema = z.preprocess((value) => value === "on" || value === true, z.boolean());
const stripeEligibleRanks = new Set<BjjBeltRank>([
  BjjBeltRank.WHITE,
  BjjBeltRank.BLUE,
  BjjBeltRank.PURPLE,
  BjjBeltRank.BROWN,
]);

function emptyStringToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

const optionalTrimmedString = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().optional(),
);

const allowedDescriptionUriSchemes = new Set(["http", "https", "mailto", "tel"]);
const blockedDescriptionUriSchemes = new Set(["javascript", "data", "vbscript", "file"]);
const courseTypeValues = [
  "OPEN_MAT",
  "TRAINING",
  "SEMINAR",
  "WORKSHOP",
  "COMPETITION",
  "PRIVATE_LESSON",
] as const;

function hasUnsafeUriScheme(value: string) {
  for (const match of value.matchAll(/\b([a-z][a-z0-9+.-]*):(?=\S)/gi)) {
    const scheme = match[1].toLowerCase();
    if (allowedDescriptionUriSchemes.has(scheme)) continue;
    if (blockedDescriptionUriSchemes.has(scheme)) return true;
    if (value.slice((match.index ?? 0) + match[0].length).startsWith("//")) return true;
  }
  return false;
}

const optionalHttpUrl = optionalTrimmedString.refine(
  (value) => !value || value.startsWith("http://") || value.startsWith("https://"),
  "Proof link must start with http:// or https://",
).refine(
  (value) => {
    if (!value) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  "Proof link must be a valid URL",
);

const optionalPublicHttpUrl = z.string().optional().or(z.literal("")).refine(
  (value) => !value || value.startsWith("http://") || value.startsWith("https://"),
  "URL must start with http:// or https://",
).refine(
  (value) => {
    if (!value) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  "URL must be valid",
);

export const claimRequestSchema = z.object({
  academyId: z.string().trim().min(1, "Academy is required"),
  requesterName: z.string().trim().min(2, "Requester name must be at least 2 characters").max(120, "Requester name must be 120 characters or fewer"),
  requesterEmail: z.string().trim().email("Valid email is required").max(160, "Email must be 160 characters or fewer").transform((value) => value.toLowerCase()),
  requesterRole: z.enum(ClaimRequesterRole, "Requester role is required"),
  verificationNotes: z.string().trim().min(20, "Verification notes must be at least 20 characters").max(2000, "Verification notes must be 2000 characters or fewer"),
  requesterPhone: optionalTrimmedString.refine((value) => !value || value.length <= 40, "Phone must be 40 characters or fewer"),
  publicProofLink: optionalHttpUrl,
  requesterBeltRank: z.preprocess(emptyStringToUndefined, z.enum(BjjBeltRank).optional()),
  requesterBeltStripes: z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") return undefined;
      return typeof value === "number" ? value : Number(value);
    },
    z.number().int("Belt stripes must be an integer").min(0, "Belt stripes must be between 0 and 4").max(4, "Belt stripes must be between 0 and 4").optional(),
  ),
}).superRefine((data, ctx) => {
  if (data.requesterBeltStripes === undefined) return;
  if (!data.requesterBeltRank) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["requesterBeltStripes"],
      message: "Belt stripes require a belt rank",
    });
    return;
  }
  if (!stripeEligibleRanks.has(data.requesterBeltRank)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["requesterBeltStripes"],
      message: "Belt stripes are only accepted for white, blue, purple, and brown belts",
    });
  }
});

export const claimRejectionSchema = z.object({
  rejectionReason: optionalTrimmedString.refine((value) => !value || value.length <= 1000, "Rejection reason must be 1000 characters or fewer"),
});

export const academySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().min(10).refine((value) => !hasUnsafeUriScheme(value), "Description links may only use http, https, mailto, or tel."),
  affiliation: z.string().optional().nullable(),
  website: z.string().url().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().nullable(),
  address: z.string().min(4),
  city: z.string().min(2),
  postcode: z.string().min(3),
  borough: z.string().optional().or(z.literal("")),
  country: z.string().min(2),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  logoUrl: z.string().url().optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  categories: z.string().optional().or(z.literal("")),
  facebookUrl: optionalPublicHttpUrl,
  instagramUrl: optionalPublicHttpUrl,
  xUrl: optionalPublicHttpUrl,
  socialLinksJson: z.string().optional().or(z.literal("")),
  dropInPrice: z.coerce.number().nonnegative().optional().or(z.literal("")),
  giAvailable: checkboxSchema,
  nogiAvailable: checkboxSchema,
  beginnerFriendly: checkboxSchema,
  competitionFocused: checkboxSchema,
  publicListingVerified: checkboxSchema.optional().default(false),
  bookingVerified: checkboxSchema.optional().default(false),
  paymentsVerified: checkboxSchema.optional().default(false),
  verificationStatus: z.enum(AcademyVerificationStatus).default(AcademyVerificationStatus.PENDING),
  featured: checkboxSchema,
  verified: checkboxSchema.optional().default(false),
});

const eventShape = {
  academyId: z.string().min(1),
  title: z.string().min(2).max(160),
  description: z.string().min(10).refine((value) => !hasUnsafeUriScheme(value), "Description links may only use http, https, mailto, or tel."),
  eventDate: z.coerce.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  giType: z.enum(GiType),
  pricingType: z.enum(EventPricingType).default(EventPricingType.FIXED),
  price: z.coerce.number().nonnegative(),
  donationLabel: optionalTrimmedString.refine((value) => !value || value.length <= 160, "Donation text must be 160 characters or fewer"),
  audience: z.enum(EventAudience).default(EventAudience.EXTERNAL_ONLY),
  capacity: z.coerce.number().int().positive().optional().or(z.literal("")),
  active: checkboxSchema,
  recurrenceType: z.enum(RecurrenceType).default(RecurrenceType.NONE),
  recurrenceInterval: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().int().positive().max(52).default(1)),
  recurrenceEndDate: z.preprocess((value) => value === "" ? undefined : value, z.coerce.date().optional()),
  recurrenceLimit: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().int().positive().max(520).optional()),
  instructor: optionalTrimmedString.refine((value) => !value || value.length <= 400, "Instructors must be 400 characters or fewer"),
  contactEmail: optionalTrimmedString.refine((value) => !value || z.email().safeParse(value).success, "Contact email must be valid"),
  contactPhone: optionalTrimmedString.refine((value) => !value || value.length <= 40, "Contact phone must be 40 characters or fewer"),
  locationName: optionalTrimmedString.refine((value) => !value || value.length <= 160, "Location name must be 160 characters or fewer"),
  addressOverride: optionalTrimmedString.refine((value) => !value || value.length <= 240, "Location address must be 240 characters or fewer"),
};

function refineEventTimingAndRecurrence(data: z.infer<z.ZodObject<typeof eventShape>> & { courseType: CourseType }, ctx: z.RefinementCtx) {
  if (data.endTime <= data.startTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endTime"],
      message: "End time must be after start time.",
    });
  }
  if (data.pricingType === EventPricingType.FREE || data.pricingType === EventPricingType.DONATION || data.price === 0) {
    data.audience = EventAudience.EXTERNAL_ONLY;
  }
  if (data.pricingType === EventPricingType.FREE) data.price = 0;
  if (data.recurrenceType === RecurrenceType.NONE) return;
  if (data.recurrenceType === RecurrenceType.MONTHLY && data.recurrenceInterval > 24) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recurrenceInterval"],
      message: "Monthly recurrence interval must be 24 months or fewer.",
    });
  }
  if (data.recurrenceType === RecurrenceType.YEARLY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recurrenceType"],
      message: "Yearly recurrence is not supported yet.",
    });
  }
  if (data.recurrenceEndDate && data.recurrenceEndDate < data.eventDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recurrenceEndDate"],
      message: "Recurrence end date must be on or after the start date.",
    });
  }
}

export const eventSchema = z.object({
  ...eventShape,
  courseType: z.enum(courseTypeValues).default("OPEN_MAT"),
}).superRefine(refineEventTimingAndRecurrence);

export const courseSchema = z.object({
  ...eventShape,
  courseType: z.enum(courseTypeValues, "Course type is required"),
}).superRefine(refineEventTimingAndRecurrence);
