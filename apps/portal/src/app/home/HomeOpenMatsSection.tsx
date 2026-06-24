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

export function HomeOpenMatsSection({ events }: { events: HomeOpenMatEvent[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-stone-950">Upcoming Open Mats</h2>
        <Link href="/open-mats" className="inline-flex items-center gap-1 text-sm font-bold text-teal-800">All open mats <ArrowRight size={16} /></Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => <EventCard key={event.occurrenceId ?? event.id} event={event} />)}
      </div>
    </section>
  );
}
