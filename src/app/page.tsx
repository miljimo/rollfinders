import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowRight, CalendarDays, MapPin, Navigation, Search, Users } from "lucide-react";
import { LocationSearchForm } from "@/components/location-search-form";
import { PageShell } from "@/components/shell";
import { AcademyCard, EventCard } from "@/components/ui";
import { getFeaturedData } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Find BJJ training today",
  description: "Find today's BJJ open mats, nearby academies, gi and no-gi sessions, drop-in costs, and directions near you.",
};

export default async function Home({ searchParams }: { searchParams: Promise<{ lat?: string; lng?: string }> }) {
  const { lat, lng } = await searchParams;
  const location = lat && lng ? { latitude: Number(lat), longitude: Number(lng) } : undefined;
  const { academies, events } = await getFeaturedData(location);

  return (
    <PageShell>
      <section className="relative overflow-hidden border-b border-stone-200 bg-[#eef6ef]">
        <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_1px_1px,rgba(15,118,110,0.12)_1px,transparent_0)] [background-size:28px_28px]" />
        <div className="pointer-events-none absolute left-[46%] top-0 hidden h-full w-[42rem] rounded-full border border-dashed border-teal-100 lg:block" />
        <div className="mx-auto grid max-w-7xl gap-9 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
          <div className="flex flex-col justify-center">
            <p className="w-fit rounded-md bg-teal-50 px-3 py-2 text-sm font-black uppercase tracking-wide text-teal-800">BJJ training discovery</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-black leading-tight text-slate-950 sm:text-6xl">
              Where can I train today?
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              RollFinders is built for Brazilian Jiu-Jitsu practitioners, not generic gym browsing. Search open mats, nearby academies, gi and no-gi options, drop-in costs, and directions wherever you train.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold text-slate-600">
              <Link href="/open-mats?when=today" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-teal-700 px-4 text-white shadow-sm">
                <CalendarDays size={16} aria-hidden /> Today
              </Link>
              <Link href="/open-mats" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-200 bg-white px-4 shadow-sm">
                <MapPin size={16} aria-hidden /> Nearby
              </Link>
              <Link href="/open-mats" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-200 bg-white px-4 shadow-sm">
                <Users size={16} aria-hidden /> Open mats
              </Link>
              <Link href="/open-mats?gi=GI" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-200 bg-white px-4 shadow-sm">
                Gi / No-Gi
              </Link>
            </div>
            <div className="mt-8 max-w-3xl">
              <LocationSearchForm action="/open-mats" placeholder="Search open mats by borough, postcode, gi or no-gi..." />
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
              {events.slice(0, 3).map((event, index) => (
                <Link key={event.id} href={`/open-mats/${event.id}`} className="grid min-h-24 grid-cols-[4px_1fr_auto_auto] items-center gap-4 border-b border-stone-100 last:border-b-0">
                  <span className={`h-full ${index === 0 ? "bg-teal-700" : index === 1 ? "bg-orange-500" : "bg-violet-600"}`} aria-hidden />
                  <span className="min-w-0 py-4">
                    <span className="block font-black text-slate-950">{event.title}</span>
                    <span className="mt-1 block truncate text-sm font-semibold text-slate-600">{event.academy.name} · {event.giType.replace("_", "-")}</span>
                    <span className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-teal-800">
                      <span className="rounded-full bg-teal-50 px-3 py-1">{event.startTime}</span>
                      <span className="rounded-full bg-teal-50 px-3 py-1">£{Number(event.price.toString()).toFixed(0)}</span>
                      <span className="rounded-full bg-teal-50 px-3 py-1">{index === 2 ? "All levels" : "Drop-in"}</span>
                    </span>
                  </span>
                  <span className="hidden text-right text-sm font-semibold text-slate-500 sm:block">
                    <span className="block">{index === 0 || index === 1 ? "Today" : formatDate(event.eventDate)}</span>
                    <span className="mt-1 block text-base font-black text-slate-800">{event.startTime}</span>
                  </span>
                  <span className="mr-4 inline-flex size-9 items-center justify-center rounded-full border border-stone-200 text-teal-700 shadow-sm" aria-hidden>
                    <ArrowRight size={18} />
                  </span>
                </Link>
              ))}
              {!events.length ? (
                <div className="p-5 text-sm font-semibold text-slate-600">No upcoming open mats are listed yet.</div>
              ) : null}
            </div>
            <Link href="/open-mats" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-teal-800">
              View all open mats near you <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-3">
          <Differentiator icon={<CalendarDays size={20} aria-hidden />} title="Open Mat Radar" text="Today, tomorrow, and weekend sessions first." />
          <Differentiator icon={<Navigation size={20} aria-hidden />} title="Nearby Training" text="Location-aware academy and open mat discovery." />
          <Differentiator icon={<Search size={20} aria-hidden />} title="BJJ-Specific Search" text="Gi, no-gi, drop-in cost, beginner fit, and competition focus." />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black text-stone-950">Featured Open Mats</h2>
          <Link href="/open-mats" className="inline-flex items-center gap-1 text-sm font-bold text-teal-800">All open mats <ArrowRight size={16} /></Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-stone-950">Featured Academies</h2>
            <Link href="/academies" className="inline-flex items-center gap-1 text-sm font-bold text-teal-800">Browse academies <ArrowRight size={16} /></Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {academies.map((academy) => <AcademyCard key={academy.id} academy={{ ...academy, events: [] }} />)}
          </div>
        </div>
      </section>

      <section className="bg-stone-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">Know a local open mat?</h2>
            <p className="mt-1 text-stone-300">Send it to the RollFinders admin so the radar stays useful.</p>
          </div>
          <Link href="/open-mats" className="rounded-md bg-teal-500 px-4 py-3 text-sm font-bold text-stone-950">Open Mat Radar</Link>
        </div>
      </section>
    </PageShell>
  );
}

function PopularSearch({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link href={href} className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
      {children}
    </Link>
  );
}

function Differentiator({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-stone-200 bg-[#f8faf7] p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-teal-700 text-white">{icon}</div>
      <div>
        <h2 className="text-sm font-black text-stone-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-stone-600">{text}</p>
      </div>
    </div>
  );
}
