import Link from "next/link";
import { EventAudience, type Academy, type Event } from "@prisma/client";
import { CalendarDays } from "lucide-react";
import { Button } from "./Button";
import { courseHref, courseTypeLabel } from "@/lib/courses";
import { directionsUrl, formatDate, formatDistanceMiles, formatMoney } from "@/lib/utils";

type EventCardItem = Event & {
  academy: Academy;
  distanceMiles?: number | null;
  occurrenceStatus?: "UPCOMING" | "IN_SESSION" | "COMPLETED";
  occurrenceDateParam?: string;
  recurrenceLabel?: string;
  isRecurringOccurrence?: boolean;
};

export function EventCard({ event }: { event: EventCardItem }) {
  const address = `${event.academy.address}, ${event.academy.city} ${event.academy.postcode}`;
  const detailHref = courseHref(event);
  const inSession = event.occurrenceStatus === "IN_SESSION";
  const priceLabel = Number(event.price) === 0 ? "Free" : event.audience === EventAudience.EXTERNAL_AND_MEMBERS ? `${formatMoney(event.price)} for visitors and members` : `${formatMoney(event.price)} for visitors`;
  return (
    <article className={`rounded-lg border bg-white p-4 shadow-sm ${inSession ? "border-teal-700 ring-2 ring-teal-100" : "border-stone-200"}`}>
      {inSession ? (
        <div className="-mx-4 -mt-4 mb-4 rounded-t-lg bg-teal-700 px-4 py-2 text-xs font-black uppercase tracking-wide text-white">
          Session in progress now
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-teal-700">{courseTypeLabel(event.courseType)}</p>
        <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">{event.giType.replace("_", "-")}</span>
        {inSession ? <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-800">Live now</span> : null}
        {event.isRecurringOccurrence ? <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">{event.recurrenceLabel}</span> : null}
      </div>
      <h2 className="mt-1 text-lg font-bold text-stone-950">
        <Link href={detailHref}>{event.title}</Link>
      </h2>
      <p className="mt-1 text-sm font-medium text-stone-700">{event.academy.name}</p>
      {event.distanceMiles != null ? <p className="mt-1 text-sm font-semibold text-teal-800">{formatDistanceMiles(event.distanceMiles)}</p> : null}
      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-stone-700 sm:grid-cols-3">
        <div className="flex items-center gap-2"><CalendarDays size={16} aria-hidden />{formatDate(event.eventDate)}</div>
        <div>{event.startTime}-{event.endTime}</div>
        <div>{priceLabel}</div>
      </dl>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-stone-700">{event.description}</p>
      <div className="mt-4 flex gap-2">
        <Button href={detailHref} size="sm" variant="neutral" className="px-3 py-2 text-sm font-semibold">View Details</Button>
        <Button href={directionsUrl(address)} target="_blank" rel="noreferrer" size="sm" variant="secondary" className="px-3 py-2 text-sm font-semibold">Directions</Button>
      </div>
    </article>
  );
}
