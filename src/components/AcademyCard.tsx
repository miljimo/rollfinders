import Link from "next/link";
import type { Academy, Event } from "@prisma/client";
import { CheckCircle2, MapPin } from "lucide-react";
import { Button } from "./Button";
import { formatDate, formatDistanceMiles, formatMoney } from "@/lib/utils";

type AcademyCardItem = Academy & { events: Event[]; distanceMiles?: number | null };

export function AcademyCard({ academy }: { academy: AcademyCardItem }) {
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
          {academy.distanceMiles != null ? <p className="mt-1 text-sm font-semibold text-teal-800">{formatDistanceMiles(academy.distanceMiles)}</p> : null}
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
        <Button href={`/academies/${academy.slug}`} size="sm" variant="neutral" className="px-3 py-2 text-sm font-semibold">Details</Button>
      </div>
    </article>
  );
}
