import Link from "next/link";
import { type Academy, type Event } from "@prisma/client";
import { CalendarDays, Clock3, Navigation, Send, Tag } from "lucide-react";
import { Button } from "@/components/Button";
import { courseHref, coursePriceLabel, courseTypeLabel } from "@/lib/courses";
import { directionsUrl, formatDate, formatDistanceMiles } from "@/lib/utils";

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
  const priceLabel = coursePriceLabel(event);
  return (
    <article className={`group relative rounded-lg border bg-white p-5 transition hover:border-teal-500 hover:shadow-sm ${inSession ? "border-teal-700 ring-2 ring-teal-100" : "border-slate-200"}`}>
      <Link href={detailHref} className="absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2" aria-label={`View details for ${event.title}`} />
      {inSession ? (
        <div className="-mx-4 -mt-4 mb-4 rounded-t-lg bg-teal-700 px-4 py-2 text-xs font-black uppercase tracking-wide text-white">
          Session in progress now
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <p className="rounded-md bg-teal-50 px-2 py-1 text-xs font-black uppercase tracking-wide text-teal-700">{courseTypeLabel(event.courseType)}</p>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{event.giType.replace("_", "-")}</span>
        {inSession ? <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-800">Live now</span> : null}
        {event.isRecurringOccurrence ? <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{event.recurrenceLabel}</span> : null}
      </div>
      <h2 className="mt-3 text-xl font-black text-slate-950 transition group-hover:text-teal-800">{event.title}</h2>
      <p className="mt-1 text-base font-medium text-slate-700">{event.academy.name}</p>
      {event.distanceMiles != null ? (
        <p className="mt-2 flex items-center gap-2 text-sm font-black text-teal-700">
          <Send size={15} aria-hidden />
          {formatDistanceMiles(event.distanceMiles)}
        </p>
      ) : null}
      <dl className="mt-5 grid grid-cols-1 gap-3 border-b border-slate-100 pb-4 text-sm font-medium text-slate-600 sm:grid-cols-[1fr_1fr_1.4fr]">
        <div className="flex items-center gap-2"><CalendarDays size={17} aria-hidden />{formatDate(event.eventDate)}</div>
        <div className="flex items-center gap-2"><Clock3 size={17} aria-hidden />{event.startTime}-{event.endTime}</div>
        <div className="flex items-center gap-2"><Tag size={17} aria-hidden />{priceLabel}</div>
      </dl>
      <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-6 text-slate-600">{event.description}</p>
      <div className="relative z-20 mt-4 flex gap-2">
        <Button href={detailHref} size="sm" variant="primary" className="min-h-10 rounded-md bg-teal-700 px-5 text-sm font-black shadow-[inset_0_0_16px_rgba(255,255,255,0.12)]">View details</Button>
        <Button href={directionsUrl(address)} target="_blank" rel="noreferrer" size="sm" variant="secondary" className="min-h-10 rounded-md border-teal-700 px-5 text-sm font-black text-teal-700 hover:bg-teal-50">
          <Navigation size={16} aria-hidden />
          Directions
        </Button>
      </div>
    </article>
  );
}
