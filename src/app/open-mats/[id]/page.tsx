import { notFound } from "next/navigation";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/PageShell";
import { getOpenMatOccurrence } from "@/lib/data";
import { directionsUrl, formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const { date } = await searchParams;
  const event = await getOpenMatOccurrence(id, date);
  if (!event) notFound();

  const address = `${event.academy.address}, ${event.academy.city} ${event.academy.postcode}`;

  return (
    <PageShell>
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap gap-2">
          <p className="text-sm font-bold uppercase tracking-wide text-teal-800">{event.giType.replace("_", "-")}</p>
          {event.occurrenceStatus === "IN_SESSION" ? <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-800">In session</span> : null}
          {event.isRecurringOccurrence ? <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">{event.recurrenceLabel}</span> : null}
        </div>
        <h1 className="mt-2 text-4xl font-black text-stone-950">{event.title}</h1>
        <p className="mt-2 text-lg font-semibold text-stone-700">{event.academy.name}</p>
        <dl className="mt-6 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-700 sm:grid-cols-2">
          <div><dt className="font-bold text-stone-950">Date</dt><dd>{formatDate(event.eventDate)}</dd></div>
          <div><dt className="font-bold text-stone-950">Time</dt><dd>{event.startTime}-{event.endTime}</dd></div>
          <div><dt className="font-bold text-stone-950">Cost</dt><dd>{formatMoney(event.price)}</dd></div>
          <div><dt className="font-bold text-stone-950">Capacity</dt><dd>{event.capacity ?? "Check with academy"}</dd></div>
          <div className="sm:col-span-2"><dt className="font-bold text-stone-950">Location</dt><dd>{address}</dd></div>
        </dl>
        <p className="mt-6 text-lg leading-8 text-stone-700">{event.description}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button href={directionsUrl(address)} target="_blank" rel="noreferrer" variant="neutral">Directions</Button>
          <Button href={event.academy.website ?? `/academies/${event.academy.slug}`} variant="secondary">Academy Details</Button>
        </div>
      </section>
    </PageShell>
  );
}
