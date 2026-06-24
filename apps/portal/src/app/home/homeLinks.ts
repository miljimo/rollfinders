import { dateKey } from "@/lib/open-mat-occurrences";
import { formatDate } from "@/lib/utils";

export function openMatHref(event: { id: string; isRecurringOccurrence?: boolean; occurrenceDateParam?: string }) {
  return `/open-mats/${event.id}${event.isRecurringOccurrence && event.occurrenceDateParam ? `?date=${event.occurrenceDateParam}` : ""}`;
}

export function upcomingDateLabel(event: { eventDate: Date; occurrenceStatus?: string }) {
  if (event.occurrenceStatus === "IN_SESSION") return "Now";
  return dateKey(event.eventDate) === dateKey(new Date()) ? "Today" : formatDate(event.eventDate);
}
