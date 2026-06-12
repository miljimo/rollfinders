import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { EventAudience } from "@prisma/client";
import { AnalyticsClickTracker } from "@/components/AnalyticsClickTracker";
import { Button } from "@/components/Button";
import { DialogShell } from "@/components/DialogShell";
import { LinkedText } from "@/components/LinkedText";
import { PageShell } from "@/components/PageShell";
import { PublicListingWarning } from "@/components/PublicListingWarning";
import { analyticsCountryFromHeaders } from "@/lib/analytics/country";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";
import { courseActivityTypeLabels } from "@/lib/course-activities";
import { getOpenMatOccurrence } from "@/lib/data";
import { publicDetailReturnPath } from "@/lib/public-detail-return-path";
import { directionsUrl, formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; returnTo?: string }>;
}) {
  const { id } = await params;
  const { date, returnTo } = await searchParams;
  const event = await getOpenMatOccurrence(id, date);
  if (!event) notFound();
  const closeHref = publicDetailReturnPath(returnTo, "/open-mats");

  const address = `${event.academy.address}, ${event.academy.city} ${event.academy.postcode}`;
  const country = analyticsCountryFromHeaders(await headers());
  const priceLabel = Number(event.price) === 0 ? "Free" : event.audience === EventAudience.EXTERNAL_AND_MEMBERS ? `${formatMoney(event.price)} for visitors and members` : `${formatMoney(event.price)} for visitors`;

  await recordAnalyticsEventBestEffort({
    eventName: "open_mat_viewed",
    academyId: event.academyId,
    openMatId: event.id,
    source: "public_open_mat_detail",
    countryCode: country.countryCode,
    countryName: country.countryName,
    metadata: {
      giType: event.giType,
      priceBand: Number(event.price) === 0 ? "free" : "paid",
      city: event.academy.city,
      borough: event.academy.borough,
      recurrenceType: event.recurrenceType,
      active: event.active,
      occurrenceDate: date ?? null,
    },
  });

  return (
    <PageShell>
      <DialogShell closeHref={closeHref} description={event.academy.name} title={event.title}>
      <section className="pt-5">
        <div className="flex flex-wrap gap-2">
          <p className="text-sm font-bold uppercase tracking-wide text-teal-800">{event.giType.replace("_", "-")}</p>
          {event.occurrenceStatus === "IN_SESSION" ? <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-800">In session</span> : null}
          {event.isRecurringOccurrence ? <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">{event.recurrenceLabel}</span> : null}
        </div>
        <dl className="mt-6 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-700 sm:grid-cols-2">
          <div><dt className="font-bold text-stone-950">Date</dt><dd>{formatDate(event.eventDate)}</dd></div>
          <div><dt className="font-bold text-stone-950">Time</dt><dd>{event.startTime}-{event.endTime}</dd></div>
          <div><dt className="font-bold text-stone-950">Cost</dt><dd>{priceLabel}</dd></div>
          <div><dt className="font-bold text-stone-950">Capacity</dt><dd>{event.capacity ?? "Check with academy"}</dd></div>
          <div className="sm:col-span-2"><dt className="font-bold text-stone-950">Location</dt><dd>{address}</dd></div>
        </dl>
        {event.activities.length ? (
          <section className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
            <h3 className="text-lg font-black text-stone-950">Course Schedule</h3>
            <ol className="mt-3 grid gap-3">
              {event.activities.map((activity) => (
                <li key={activity.id} className="grid gap-1 rounded-md bg-stone-50 p-3 text-sm text-stone-700 sm:grid-cols-[9rem_1fr]">
                  <p className="font-bold text-stone-950">{activity.startTime}-{activity.endTime}</p>
                  <div>
                    <p className="font-bold text-stone-950">{activity.name}</p>
                    <p className="text-xs font-semibold uppercase text-teal-800">{courseActivityTypeLabels[activity.activityType]}</p>
                    {activity.description ? <p className="mt-1 whitespace-pre-wrap">{activity.description}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        <PublicListingWarning academy={event.academy} course={event} className="mt-4" />
        <p className="mt-6 whitespace-pre-wrap text-lg leading-8 text-stone-700"><LinkedText text={event.description} /></p>
        <div className="mt-6 flex flex-wrap gap-2">
          <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "directions", academyId: event.academyId, external: true, openMatId: event.id, sourcePage: "open_mat_profile" }}>
            <Button href={directionsUrl(address)} target="_blank" rel="noreferrer" variant="neutral">Directions</Button>
          </AnalyticsClickTracker>
          <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: event.academy.website ? "website" : "academy_details", academyId: event.academyId, external: Boolean(event.academy.website), openMatId: event.id, sourcePage: "open_mat_profile" }}>
            <Button href={event.academy.website ?? `/academies/${event.academy.slug}`} variant="secondary">Academy Details</Button>
          </AnalyticsClickTracker>
        </div>
      </section>
      </DialogShell>
    </PageShell>
  );
}
