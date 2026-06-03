import Link from "next/link";
import { CalendarDays, CheckCircle2, MapPin } from "lucide-react";
import type { AcademyWithEvents, EventWithAcademy } from "@/lib/data";
import { directionsUrl, formatDate, formatMoney } from "@/lib/utils";

export function SearchForm({ action, query, placeholder }: { action: string; query?: string; placeholder: string }) {
  return (
    <form action={action} className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-2 shadow-sm sm:flex-row">
      <input
        name="q"
        defaultValue={query}
        placeholder={placeholder}
        className="min-h-12 flex-1 rounded-md border border-stone-200 px-4 text-base text-stone-950 placeholder:text-stone-500"
      />
      <button className="min-h-12 rounded-md bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800">
        Search
      </button>
    </form>
  );
}

export function AcademyCard({ academy }: { academy: AcademyWithEvents }) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-stone-950">
            <Link href={`/academies/${academy.slug}`}>{academy.name}</Link>
            {academy.verified ? <CheckCircle2 size={16} className="text-teal-700" aria-label="Verified" /> : null}
          </h2>
          <p className="mt-1 flex items-center gap-1 text-sm text-stone-600">
            <MapPin size={15} aria-hidden /> {academy.borough ?? academy.city}, {academy.postcode}
          </p>
        </div>
        {academy.affiliation ? <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">{academy.affiliation}</span> : null}
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-stone-700">{academy.description}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-stone-700">
        {academy.giAvailable ? <span className="rounded-md bg-stone-100 px-2 py-1">Gi</span> : null}
        {academy.nogiAvailable ? <span className="rounded-md bg-stone-100 px-2 py-1">No-Gi</span> : null}
        {academy.beginnerFriendly ? <span className="rounded-md bg-stone-100 px-2 py-1">Beginner friendly</span> : null}
        {academy.competitionFocused ? <span className="rounded-md bg-stone-100 px-2 py-1">Competition</span> : null}
        {academy.dropInPrice !== null ? <span className="rounded-md bg-teal-50 px-2 py-1 text-teal-900">Drop-in {formatMoney(academy.dropInPrice)}</span> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {academy.events.slice(0, 2).map((event) => (
          <Link key={event.id} href={`/open-mats/${event.id}`} className="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">
            {formatDate(event.eventDate)} · {event.startTime}
          </Link>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Link href={`/academies/${academy.slug}`} className="rounded-md bg-stone-950 px-3 py-2 text-sm font-semibold text-white">Details</Link>
      </div>
    </article>
  );
}

export function EventCard({ event }: { event: EventWithAcademy }) {
  const address = `${event.academy.address}, ${event.academy.city} ${event.academy.postcode}`;
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">{event.giType.replace("_", "-")}</p>
      <h2 className="mt-1 text-lg font-bold text-stone-950">
        <Link href={`/open-mats/${event.id}`}>{event.title}</Link>
      </h2>
      <p className="mt-1 text-sm font-medium text-stone-700">{event.academy.name}</p>
      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-stone-700 sm:grid-cols-3">
        <div className="flex items-center gap-2"><CalendarDays size={16} aria-hidden />{formatDate(event.eventDate)}</div>
        <div>{event.startTime}-{event.endTime}</div>
        <div>{formatMoney(event.price)}</div>
      </dl>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-stone-700">{event.description}</p>
      <div className="mt-4 flex gap-2">
        <Link href={`/open-mats/${event.id}`} className="rounded-md bg-stone-950 px-3 py-2 text-sm font-semibold text-white">View Details</Link>
        <a href={directionsUrl(address)} target="_blank" rel="noreferrer" className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800">Directions</a>
      </div>
    </article>
  );
}
