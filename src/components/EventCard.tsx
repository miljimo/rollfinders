import Link from "next/link";
import type { Academy, Event } from "@prisma/client";
import { CalendarDays } from "lucide-react";
import { Button } from "./Button";
import { directionsUrl, formatDate, formatDistanceMiles, formatMoney } from "@/lib/utils";

type EventCardItem = Event & { academy: Academy; distanceMiles?: number | null };

export function EventCard({ event }: { event: EventCardItem }) {
  const address = `${event.academy.address}, ${event.academy.city} ${event.academy.postcode}`;
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">{event.giType.replace("_", "-")}</p>
      <h2 className="mt-1 text-lg font-bold text-stone-950">
        <Link href={`/open-mats/${event.id}`}>{event.title}</Link>
      </h2>
      <p className="mt-1 text-sm font-medium text-stone-700">{event.academy.name}</p>
      {event.distanceMiles != null ? <p className="mt-1 text-sm font-semibold text-teal-800">{formatDistanceMiles(event.distanceMiles)}</p> : null}
      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-stone-700 sm:grid-cols-3">
        <div className="flex items-center gap-2"><CalendarDays size={16} aria-hidden />{formatDate(event.eventDate)}</div>
        <div>{event.startTime}-{event.endTime}</div>
        <div>{formatMoney(event.price)}</div>
      </dl>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-stone-700">{event.description}</p>
      <div className="mt-4 flex gap-2">
        <Button href={`/open-mats/${event.id}`} size="sm" variant="neutral" className="px-3 py-2 text-sm font-semibold">View Details</Button>
        <Button href={directionsUrl(address)} target="_blank" rel="noreferrer" size="sm" variant="secondary" className="px-3 py-2 text-sm font-semibold">Directions</Button>
      </div>
    </article>
  );
}
