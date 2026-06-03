import { PageShell } from "@/components/shell";
import { LocationButton } from "@/components/location-button";
import { EventCard } from "@/components/ui";
import { getOpenMatRadar } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OpenMatsPage({ searchParams }: { searchParams: Promise<{ q?: string; when?: string; gi?: string; lat?: string; lng?: string }> }) {
  const { q = "", when = "", gi = "", lat, lng } = await searchParams;
  const location = lat && lng ? { latitude: Number(lat), longitude: Number(lng) } : {};
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
        <p className="mt-2 text-stone-700">Find visitor-friendly training sessions today, tomorrow, and this weekend.</p>
        <div className="mt-5 grid gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm lg:grid-cols-[1fr_180px_180px_auto_auto]">
          <form action="/open-mats" className="contents">
            <input name="q" defaultValue={q} placeholder="Search academy, borough, postcode, gi, no-gi, competition" className="min-h-12 rounded-md border border-stone-200 px-4 text-base text-stone-950 placeholder:text-stone-500" />
            <select name="when" defaultValue={when} className="min-h-12 rounded-md border border-stone-200 px-3 text-base text-stone-950">
              <option value="">Any upcoming</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="weekend">This weekend</option>
            </select>
            <select name="gi" defaultValue={gi} className="min-h-12 rounded-md border border-stone-200 px-3 text-base text-stone-950">
              <option value="">Any style</option>
              <option value="GI">Gi</option>
              <option value="NO_GI">No-Gi</option>
            </select>
            <button className="min-h-12 rounded-md bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800">Filter</button>
          </form>
          <LocationButton />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <RadarCount label="Today" count={today.length} href="/open-mats?when=today" />
          <RadarCount label="Tomorrow" count={tomorrow.length} href="/open-mats?when=tomorrow" />
          <RadarCount label="This Weekend" count={weekend.length} href="/open-mats?when=weekend" />
        </div>
        <p className="mt-5 text-sm font-medium text-stone-600">{events.length} upcoming sessions</p>
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
