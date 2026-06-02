import { PageShell } from "@/components/shell";
import { EventCard, SearchForm } from "@/components/ui";
import { searchEvents } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OpenMatsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const events = await searchEvents(q);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">Open Mats</h1>
        <p className="mt-2 text-stone-700">Find visitor-friendly training sessions around London.</p>
        <div className="mt-5"><SearchForm action="/open-mats" query={q} placeholder="Search academy, city, postcode, or session" /></div>
        <p className="mt-5 text-sm font-medium text-stone-600">{events.length} upcoming sessions</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
      </section>
    </PageShell>
  );
}
