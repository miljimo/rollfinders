import Link from "next/link";
import type { EventAudience, EventPricingType } from "@prisma/client";
import { ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";

import { Button } from "@/components/Button";
import { LocationSearchForm } from "@/components/LocationSearchForm";
import { coursePriceLabel } from "@/lib/courses";
import { openMatHref, upcomingDateLabel } from "./homeLinks";
import { PopularSearch } from "./PopularSearch";

type HomeHeroEvent = {
  id: string;
  occurrenceId?: string | null;
  occurrenceDateParam?: string;
  occurrenceStatus?: string;
  isRecurringOccurrence?: boolean;
  recurrenceLabel?: string | null;
  title: string;
  eventDate: Date;
  startTime: string;
  giType: string;
  audience: EventAudience;
  academy: {
    name: string;
  };
  pricingType?: EventPricingType;
  price: unknown;
  donationLabel?: string | null;
};

export function HomeHero({ upcomingNearYou }: { upcomingNearYou: HomeHeroEvent[] }) {
  return (
    <section className="relative overflow-hidden border-b border-stone-200 bg-[#eef6ef]">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_1px_1px,rgba(15,118,110,0.12)_1px,transparent_0)] [background-size:28px_28px]" />
      <div className="pointer-events-none absolute left-[46%] top-0 hidden h-full w-[42rem] rounded-full border border-dashed border-teal-100 lg:block" />
      <div className="mx-auto grid max-w-7xl gap-9 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
        <div className="flex flex-col justify-center">
          <p className="w-fit rounded-md bg-teal-50 px-3 py-2 text-sm font-black uppercase tracking-wide text-teal-800">BJJ training discovery</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Where can I train today?
          </h1>
          <p className="mt-5 hidden max-w-2xl text-lg leading-8 text-slate-600 md:block">
            RollFinders is built for Brazilian Jiu-Jitsu practitioners, not generic gym browsing. Search open mats, nearby academies, gi and no-gi options, drop-in costs, and directions wherever you train.
          </p>
          <div className="mt-6 hidden flex-wrap gap-3 text-sm font-bold text-slate-600 md:flex">
            <Button href="/open-mats?when=today" variant="primary" className="shadow-sm">
              <CalendarDays size={16} aria-hidden /> Today
            </Button>
            <Button href="/open-mats" variant="secondary" className="border-stone-200 shadow-sm">
              <MapPin size={16} aria-hidden /> Nearby
            </Button>
            <Button href="/open-mats" variant="secondary" className="border-stone-200 shadow-sm">
              <Users size={16} aria-hidden /> Open mats
            </Button>
            <Button href="/open-mats?gi=GI" variant="secondary" className="border-stone-200 shadow-sm">
              Gi / No-Gi
            </Button>
          </div>
          <div className="mt-8 max-w-3xl">
            <LocationSearchForm action="/open-mats" analyticsIntent="open_mat_search" placeholder="Search open mats by borough, postcode, gi or no-gi..." />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
            <span>Popular searches:</span>
            <PopularSearch href="/open-mats?q=nearby">Nearby</PopularSearch>
            <PopularSearch href="/open-mats?q=beginner">Beginner friendly</PopularSearch>
            <PopularSearch href="/open-mats?gi=NO_GI">No-Gi</PopularSearch>
            <PopularSearch href="/open-mats?when=weekend">Weekend</PopularSearch>
          </div>
        </div>
        <div className="relative rounded-lg border border-stone-200 bg-white p-4 shadow-lg shadow-stone-200/70">
          <div className="mb-3 flex items-center gap-3 px-1 text-sm font-black text-slate-600">
            <MapPin className="text-teal-700" size={20} aria-hidden />
            Upcoming Near You
          </div>
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
            {upcomingNearYou.map((event) => (
              <Link key={event.occurrenceId ?? event.id} href={openMatHref(event)} className={`grid min-h-24 grid-cols-[4px_1fr_auto_auto] items-center gap-4 border-b border-stone-100 last:border-b-0 ${event.occurrenceStatus === "IN_SESSION" ? "bg-teal-50/70" : ""}`}>
                <span className={`h-full ${event.occurrenceStatus === "IN_SESSION" ? "bg-teal-700" : "bg-stone-300"}`} aria-hidden />
                <span className="min-w-0 py-4">
                  {event.occurrenceStatus === "IN_SESSION" ? <span className="mb-1 inline-flex rounded-full bg-teal-700 px-3 py-1 text-xs font-black uppercase tracking-wide text-white">In progress now</span> : null}
                  <span className="block font-black text-slate-950">{event.title}</span>
                  <span className="mt-1 block truncate text-sm font-semibold text-slate-600">{event.academy.name} · {event.giType.replace("_", "-")}</span>
                  <span className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-teal-800">
                    <span className="rounded-full bg-teal-50 px-3 py-1">{event.startTime}</span>
                    <span className="rounded-full bg-teal-50 px-3 py-1">{coursePriceLabel(event)}</span>
                    {event.occurrenceStatus === "IN_SESSION" ? <span className="rounded-full bg-teal-700 px-3 py-1 text-white">Live</span> : null}
                    {event.isRecurringOccurrence ? <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-700">{event.recurrenceLabel}</span> : null}
                  </span>
                </span>
                <span className="hidden text-right text-sm font-semibold text-slate-500 sm:block">
                  <span className={`block ${event.occurrenceStatus === "IN_SESSION" ? "font-black text-teal-800" : ""}`}>{upcomingDateLabel(event)}</span>
                  <span className="mt-1 block text-base font-black text-slate-800">{event.startTime}</span>
                </span>
                <span className="mr-4 inline-flex size-9 items-center justify-center rounded-full border border-stone-200 text-teal-700 shadow-sm" aria-hidden>
                  <ArrowRight size={18} />
                </span>
              </Link>
            ))}
            {!upcomingNearYou.length ? (
              <div className="p-5 text-sm font-semibold text-slate-600">No upcoming open mats are listed yet.</div>
            ) : null}
          </div>
          <Link href="/open-mats" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-teal-800">
            View all open mats near you <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
