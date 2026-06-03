import Link from "next/link";
import { ArrowRight, MapPinned } from "lucide-react";
import { PageShell } from "@/components/shell";
import { AcademyCard, EventCard, SearchForm } from "@/components/ui";
import { getFeaturedData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { academies, events } = await getFeaturedData();

  return (
    <PageShell>
      <section className="border-b border-stone-200 bg-[#eef6ef]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-14">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold uppercase tracking-wide text-teal-800">London BJJ finder</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black text-stone-950 sm:text-5xl">
              Find an academy or open mat before your warm-up starts.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-700">
              Search Brazilian Jiu-Jitsu academies, visitor-friendly classes, and open mats across London.
            </p>
            <div className="mt-7 max-w-2xl">
              <SearchForm action="/open-mats" placeholder="Search open mats by academy, borough, postcode, gi, or no-gi" />
            </div>
          </div>
          <div className="map-grid min-h-[320px] rounded-lg border border-teal-200 bg-white p-4">
            <div className="flex h-full flex-col justify-between rounded-md bg-white/80 p-4">
              <MapPinned className="text-teal-700" size={36} aria-hidden />
              <div className="grid gap-3">
                {events.slice(0, 3).map((event) => (
                  <Link key={event.id} href={`/open-mats/${event.id}`} className="rounded-md border border-stone-200 bg-white p-3 shadow-sm">
                    <p className="text-sm font-bold text-stone-950">{event.title}</p>
                    <p className="text-sm text-stone-600">{event.academy.name} · {event.startTime}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
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
            <h2 className="text-2xl font-black">Know a London open mat?</h2>
            <p className="mt-1 text-stone-300">Send it to the RollFinder admin so the radar stays useful.</p>
          </div>
          <Link href="/open-mats" className="rounded-md bg-teal-500 px-4 py-3 text-sm font-bold text-stone-950">Open Mat Radar</Link>
        </div>
      </section>
    </PageShell>
  );
}
