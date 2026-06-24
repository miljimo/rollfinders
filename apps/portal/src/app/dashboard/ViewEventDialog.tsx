import { CourseType, type Prisma } from "@prisma/client";
import { Button } from "@/components/Button";
import { DialogShell } from "@/components/DialogShell";
import { InlineDirectionsButton } from "@/components/InlineDirectionsButton";
import { LinkedText } from "@/components/LinkedText";
import { PublicListingWarning } from "@/components/PublicListingWarning";
import { courseActivityTypeLabels } from "@/lib/course-activities";
import { courseAddress, courseLocationLabel, coursePriceLabel, courseTypeLabel, recurrenceLabel as courseRecurrenceLabel } from "@/lib/courses";
import { eventPermanentPath, eventPermanentUrl, eventQrCodePath } from "@/lib/event-share-links";
import type { AcademyServiceRecord } from "@/lib/academyService";
import { directionsUrl, formatDate } from "@/lib/utils";

export type DashboardEventDetail = Prisma.EventGetPayload<{
  include: { activities: true };
}> & { academy: AcademyServiceRecord };

export function ViewEventDialog({ event }: { event: DashboardEventDetail }) {
  const openMat = event.courseType === CourseType.OPEN_MAT;
  const address = openMat ? `${event.academy.address}, ${event.academy.city} ${event.academy.postcode}` : courseAddress(event);
  const capacity = event.capacity ?? "Check with academy";
  const price = coursePriceLabel(event);
  const permanentHref = eventPermanentPath(event.id);
  const permanentUrl = eventPermanentUrl(event.id);
  const qrCodeHref = eventQrCodePath(event.id);

  return (
    <DialogShell closeHref="/dashboard/courses" description={event.academy.name} title={event.title}>
      <section className="pt-5">
        <div className="flex flex-wrap gap-2">
          <p className="text-sm font-bold uppercase tracking-wide text-teal-800">{openMat ? event.giType.replace("_", "-") : courseTypeLabel(event.courseType)}</p>
          {!openMat ? <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">{event.giType.replace("_", "-")}</span> : null}
          {event.recurrenceType !== "NONE" ? <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">{courseRecurrenceLabel(event)}</span> : null}
        </div>
        <dl className="mt-6 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-700 sm:grid-cols-2">
          <div><dt className="font-bold text-stone-950">Date</dt><dd>{formatDate(event.eventDate)}</dd></div>
          <div><dt className="font-bold text-stone-950">Time</dt><dd>{event.startTime}-{event.endTime}</dd></div>
          <div><dt className="font-bold text-stone-950">{openMat ? "Cost" : "Price"}</dt><dd>{price}</dd></div>
          <div><dt className="font-bold text-stone-950">Capacity</dt><dd>{capacity}</dd></div>
          {!openMat ? <div><dt className="font-bold text-stone-950">Recurrence</dt><dd>{courseRecurrenceLabel(event)}</dd></div> : null}
          {!openMat ? <div><dt className="font-bold text-stone-950">Location</dt><dd>{courseLocationLabel(event)}</dd></div> : null}
          {event.instructor ? <div><dt className="font-bold text-stone-950">Instructor</dt><dd>{event.instructor}</dd></div> : null}
          {event.contactEmail ? <div><dt className="font-bold text-stone-950">Contact Email</dt><dd><a className="text-teal-800" href={`mailto:${event.contactEmail}`}>{event.contactEmail}</a></dd></div> : null}
          {event.contactPhone ? <div><dt className="font-bold text-stone-950">Contact Phone</dt><dd><a className="text-teal-800" href={`tel:${event.contactPhone}`}>{event.contactPhone}</a></dd></div> : null}
          <div className="sm:col-span-2">
            <dt className="font-bold text-stone-950">{openMat ? "Location" : "Address"}</dt>
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
            <h3 className="text-lg font-black text-stone-950">Integration Event URI</h3>
            <p className="mt-2 break-all rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-700">{permanentUrl}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button href={permanentHref} target="_blank" rel="noreferrer" variant="secondary">Open URI</Button>
              <Button href={qrCodeHref} target="_blank" rel="noreferrer" variant="neutral">Open QR Code</Button>
            </div>
          </div>
          <a href={permanentHref} target="_blank" rel="noreferrer" className="inline-flex rounded-md border border-stone-200 bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCodeHref} alt={`QR code for ${event.title}`} className="size-32" />
          </a>
        </section>
        <p className="mt-6 whitespace-pre-wrap text-lg leading-8 text-stone-700"><LinkedText text={event.description} /></p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button href={directionsUrl(address)} target="_blank" rel="noreferrer" variant="neutral">Directions</Button>
          <Button href={`/academies/${event.academy.slug}`} variant="secondary">Academy Details</Button>
        </div>
      </section>
    </DialogShell>
  );
}
