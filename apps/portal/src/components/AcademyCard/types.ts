
import { ClaimStatus, type Academy, type Event } from "@prisma/client";



export type AcademyCardItem = Academy & {
  claims?: { status: ClaimStatus }[];
  events: Event[];
  members?: unknown[];
  distanceMiles?: number | null;
};
export type AcademyCardEvent = Event & {
  occurrenceId?: string;
  occurrenceDateParam?: string;
  isRecurringOccurrence?: boolean;
  occurrenceStatus?: "UPCOMING" | "IN_SESSION" | "COMPLETED";
};
