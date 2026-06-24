import { z } from "zod";
import { emailAddress, optionalTrimmedString, requiredString } from "./fields";

export const mobileProfileSchema = z.object({
  displayName: requiredString("Display name"),
  nickname: optionalTrimmedString,
  email: emailAddress,
  academyId: optionalTrimmedString,
  beltRank: z.enum(["white", "blue", "purple", "brown", "black"]).default("white"),
  yearsTraining: z.coerce.number().int().min(0).max(80).optional(),
  location: optionalTrimmedString,
});

export type MobileProfileInput = z.infer<typeof mobileProfileSchema>;
