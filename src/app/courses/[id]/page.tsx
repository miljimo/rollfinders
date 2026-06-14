import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { CourseType } from "@prisma/client";
import { AnalyticsClickTracker } from "@/components/AnalyticsClickTracker";
import { Button } from "@/components/Button";
import { LinkedText } from "@/components/LinkedText";
import { PageShell } from "@/components/PageShell";
import { PublicListingWarning } from "@/components/PublicListingWarning";
import { analyticsCountryFromHeaders } from "@/lib/analytics/country";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";
import { courseActivityTypeLabels } from "@/lib/course-activities";
import { courseAddress, courseLocationLabel, coursePriceLabel, courseTypeLabel } from "@/lib/courses";
import { getCourseOccurrence } from "@/lib/courses";
import { publicDetailReturnPath } from "@/lib/public-detail-return-path";
import { directionsUrl, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; returnTo?: string }>;
}) {
  const { id } = await params;
  const { date, returnTo } = await searchParams;
  const event = await getCourseOccurrence(id, date);
  if (!event) notFound();
  const closeHref = publicDetailReturnPath(returnTo, "/courses");
  if (event.courseType === CourseType.OPEN_MAT) {
    const query = new URLSearchParams();
    if (date) query.set("date", date);
    if (returnTo) query.set("returnTo", returnTo);
    redirect(`/open-mats/${event.id}${query.size ? `?${query.toString()}` : ""}`);
  }

  const address = courseAddress(event);
  const country = analyticsCountryFromHeaders(await headers());
  await recordAnalyticsEventBestEffort({
    eventName: "course_viewed",
    academyId: event.academyId,
    openMatId: event.id,
    courseId: event.id,
    source: "public_course_detail",
    countryCode: country.countryCode,
    countryName: country.countryName,
    metadata: {
      courseType: event.courseType,
      recurrenceType: event.recurrenceType,
      active: event.active,
      occurrenceDate: date ?? null,
      city: event.academy.city,
      borough: event.academy.borough,
    },
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Button href={closeHref} variant="secondary" className="mb-5 border-stone-200 text-stone-700">Back to courses</Button>
        <div className="border-b border-stone-100 pb-5">
          <h1 className="text-4xl font-black text-slate-950">{event.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{event.academy.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <p className="text-sm font-bold uppercase tracking-wide text-teal-800">{courseTypeLabel(event.courseType)}</p>
          <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">{event.giType.replace("_", "-")}</span>
          {"occurrenceStatus" in event && event.occurrenceStatus === "IN_SESSION" ? <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-800">In session</span> : null}
          {"isRecurringOccurrence" in event && event.isRecurringOccurrence ? <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">{event.recurrenceLabel}</span> : null}
        </div>
        <dl className="mt-6 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-700 sm:grid-cols-2">
          <div><dt className="font-bold text-stone-950">Date</dt><dd>{formatDate(event.eventDate)}</dd></div>
          <div><dt className="font-bold text-stone-950">Time</dt><dd>{event.startTime}-{event.endTime}</dd></div>
          <div><dt className="font-bold text-stone-950">Price</dt><dd>{coursePriceLabel(event)}</dd></div>
          <div><dt className="font-bold text-stone-950">Capacity</dt><dd>{event.capacity ?? "Check with academy"}</dd></div>
          <div><dt className="font-bold text-stone-950">Recurrence</dt><dd>{"recurrenceLabel" in event ? event.recurrenceLabel : "One-off"}</dd></div>
          <div><dt className="font-bold text-stone-950">Location</dt><dd>{courseLocationLabel(event)}</dd></div>
          {event.instructor ? <div><dt className="font-bold text-stone-950">Instructor</dt><dd>{event.instructor}</dd></div> : null}
          {event.contactEmail ? <div><dt className="font-bold text-stone-950">Contact Email</dt><dd><a className="text-teal-800" href={`mailto:${event.contactEmail}`}>{event.contactEmail}</a></dd></div> : null}
          {event.contactPhone ? <div><dt className="font-bold text-stone-950">Contact Phone</dt><dd><a className="text-teal-800" href={`tel:${event.contactPhone}`}>{event.contactPhone}</a></dd></div> : null}
          <div className="sm:col-span-2"><dt className="font-bold text-stone-950">Address</dt><dd>{address}</dd></div>
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
          <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "directions", academyId: event.academyId, external: true, courseId: event.id, sourcePage: "course_profile" }}>
            <Button href={directionsUrl(address)} target="_blank" rel="noreferrer" variant="neutral">Directions</Button>
          </AnalyticsClickTracker>
          <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: event.academy.website ? "website" : "academy_details", academyId: event.academyId, external: Boolean(event.academy.website), courseId: event.id, sourcePage: "course_profile" }}>
            <Button href={event.academy.website ?? `/academies/${event.academy.slug}`} variant="secondary">Academy Details</Button>
          </AnalyticsClickTracker>
        </div>
      </section>
    </PageShell>
  );
}
