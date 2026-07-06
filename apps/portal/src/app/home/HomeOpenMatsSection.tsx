import Link from "next/link";
import type { Academy, Event } from "@prisma/client";
import { ArrowRight } from "lucide-react";

import { EventCard } from "@/components/EventCard";

type HomeOpenMatEvent = Event & {
  academy: Academy;
  distanceMiles?: number | null;
  occurrenceId?: string | null;
  occurrenceStatus?: "UPCOMING" | "IN_SESSION" | "COMPLETED";
  occurrenceDateParam?: string;
  recurrenceLabel?: string;
  isRecurringOccurrence?: boolean;
};

export function HomeOpenMatsSection({
  end,
  events,
  query = "",
  start,
  totalItems,
}: {
  end: number;
  events: HomeOpenMatEvent[];
  query?: string;
  start: number;
  totalItems: number;
}) {
  const hasQuery = Boolean(query.trim());

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-3xl font-black text-slate-950">{hasQuery ? `Results for "${query.trim()}"` : "Upcoming Open Mats"}</h2>
        <Link href="/?courseType=OPEN_MAT" className="inline-flex items-center gap-1 text-sm font-bold text-teal-800">All open mats <ArrowRight size={16} /></Link>
      </div>
      <p className="mb-4 text-sm font-semibold text-stone-600">
        {totalItems ? `Showing ${start}-${end} of ${totalItems} training sessions` : "No training sessions found"}
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => <EventCard key={event.occurrenceId ?? event.id} event={event} />)}
        {!events.length ? <p className="text-stone-600">No sessions match that search yet.</p> : null}
      </div>
    </section>
  );
}
