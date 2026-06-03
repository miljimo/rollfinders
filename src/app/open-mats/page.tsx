import type { Metadata } from "next";
import { PageShell } from "@/components/shell";
import { OpenMatLocationFilterForm } from "@/components/location-search-form";
import { EventCard } from "@/components/ui";
import { getOpenMatRadar } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Open Mats - Find training today",
  description: "Find today's, tomorrow's, and weekend BJJ open mats in London with gi type, drop-in cost, location, and directions.",
};

export default async function OpenMatsPage({ searchParams }: { searchParams: Promise<{ q?: string; when?: string; gi?: string; lat?: string; lng?: string }> }) {
  const { q = "", when = "", gi = "", lat, lng } = await searchParams;
  const location = lat && lng ? { latitude: Number(lat), longitude: Number(lng) } : {};
  const locationQuery = lat && lng ? `&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}` : "";
  const [events, today, tomorrow, weekend] = await Promise.all([
    getOpenMatRadar({ q, when, gi, ...location }),
    getOpenMatRadar({ when: "today" }),
    getOpenMatRadar({ when: "tomorrow" }),
    getOpenMatRadar({ when: "weekend" }),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">Open Mats</h1>
        <p className="mt-2 max-w-3xl text-stone-700">Open Mat Radar puts visitor-friendly BJJ sessions first, with today, tomorrow, and weekend training filtered by location, gi type, and drop-in cost.</p>
        <div className="mt-5">
          <OpenMatLocationFilterForm q={q} when={when} gi={gi} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <RadarCount label="Today" count={today.length} href={`/open-mats?when=today${locationQuery}`} />
          <RadarCount label="Tomorrow" count={tomorrow.length} href={`/open-mats?when=tomorrow${locationQuery}`} />
          <RadarCount label="This Weekend" count={weekend.length} href={`/open-mats?when=weekend${locationQuery}`} />
        </div>
        <p className="mt-5 text-sm font-medium text-stone-600">{events.length} upcoming sessions · nearest available distances shown · directions ready</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => <EventCard key={event.id} event={event} />)}
          {events.length === 0 ? <p className="text-stone-600">No open mats match those filters yet.</p> : null}
        </div>
      </section>
    </PageShell>
  );
}

function RadarCount({ label, count, href }: { label: string; count: number; href: string }) {
  return (
    <a href={href} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-stone-600">{label}</p>
      <p className="mt-1 text-2xl font-black text-stone-950">{count}</p>
    </a>
  );
}
