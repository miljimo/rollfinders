import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { EventPricingType } from "@prisma/client";
import { AnalyticsClickTracker } from "@/components/AnalyticsClickTracker";
import { Button } from "@/components/Button";
import { InlineDirectionsButton } from "@/components/InlineDirectionsButton";
import { LinkedText } from "@/components/LinkedText";
import { PageShell } from "@/components/PageShell";
import { isPublicAcademyTrusted, PublicListingWarning } from "@/components/PublicListingWarning";
import { analyticsCountryFromHeaders } from "@/lib/analytics/country";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";
import { courseActivityTypeLabels } from "@/lib/course-activities";
import { coursePriceLabel } from "@/lib/courses";
import { getOpenMatOccurrence } from "@/lib/data";
import { eventPermanentPath, eventPermanentUrl, eventQrCodePath } from "@/lib/event-share-links";
import { publicDetailDashboardDialogPath, publicDetailReturnPath } from "@/lib/public-detail-return-path";
import { directionsUrl, formatDate } from "@/lib/utils";
import { CourseCheckoutForm } from "../../courses/[id]/CourseCheckoutForm";

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
  const dashboardDialogHref = publicDetailDashboardDialogPath(returnTo, event.id);
  if (dashboardDialogHref) redirect(dashboardDialogHref);
  const closeHref = publicDetailReturnPath(returnTo, "/open-mats");

  const address = `${event.academy.address}, ${event.academy.city} ${event.academy.postcode}`;
  const country = analyticsCountryFromHeaders(await headers());
  const priceLabel = coursePriceLabel(event);
  const payableAmount = Number(event.price);
  const academyTrusted = isPublicAcademyTrusted(event.academy);
  const canCheckout = academyTrusted && ((event.pricingType === EventPricingType.FIXED && Number.isFinite(payableAmount) && payableAmount > 0) || event.pricingType === EventPricingType.DONATION);
  const checkoutMode = event.pricingType === EventPricingType.DONATION ? "donation" : "fixed";
  const suggestedDonationAmount = Number.isFinite(payableAmount) && payableAmount > 0 ? payableAmount : undefined;
  const permanentHref = eventPermanentPath(event.id);
  const permanentUrl = eventPermanentUrl(event.id);
  const qrCodeHref = eventQrCodePath(event.id);

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
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Button href={closeHref} variant="secondary" className="mb-5 border-stone-200 text-stone-700">Back to sessions</Button>
        <div className="border-b border-stone-100 pb-5">
          <h1 className="text-4xl font-black text-slate-950">{event.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{event.academy.name}</p>
        </div>
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
          <div className="sm:col-span-2">
            <dt className="font-bold text-stone-950">Location</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <span>{address}</span>
              <InlineDirectionsButton address={address} />
            </dd>
          </div>
        </dl>
        {event.activities.length ? (
          <section className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
            <h3 className="text-lg font-black text-stone-950">Event Outline</h3>
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
        <section className="mt-4 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-stone-950">Integration Event URI</h2>
            <p className="mt-2 break-all rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-700">{permanentUrl}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button href={qrCodeHref} target="_blank" rel="noreferrer" variant="neutral">Open QR Code</Button>
            </div>
          </div>
          <a href={permanentHref} target="_blank" rel="noreferrer" className="inline-flex rounded-md border border-stone-200 bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCodeHref} alt={`QR code for ${event.title}`} className="size-32" />
          </a>
        </section>
        <p className="mt-6 whitespace-pre-wrap text-lg leading-8 text-stone-700"><LinkedText text={event.description} /></p>
        {canCheckout ? (
          <section className="mt-6 rounded-lg border border-teal-200 bg-teal-50 p-4">
            <h2 className="text-xl font-black text-stone-950">{checkoutMode === "donation" ? "Support this session" : "Secure your place"}</h2>
            <p className="mt-2 text-sm text-stone-700">{checkoutMode === "donation" ? "Choose the amount you want to donate. Payments are handled securely by Stripe." : "Pay securely through the RollFinders payment service. Card details are handled by Stripe."}</p>
            <CourseCheckoutForm courseId={event.id} occurrenceDate={event.occurrenceDateParam} mode={checkoutMode} suggestedAmount={suggestedDonationAmount} />
          </section>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "directions", academyId: event.academyId, external: true, openMatId: event.id, sourcePage: "open_mat_profile" }}>
            <Button href={directionsUrl(address)} target="_blank" rel="noreferrer" variant="neutral">Directions</Button>
          </AnalyticsClickTracker>
          <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "academy_details", academyId: event.academyId, external: false, openMatId: event.id, sourcePage: "open_mat_profile" }}>
            <Button href={`/academies/${event.academy.slug}`} variant="secondary">Academy Details</Button>
          </AnalyticsClickTracker>
        </div>
      </section>
    </PageShell>
  );
}
