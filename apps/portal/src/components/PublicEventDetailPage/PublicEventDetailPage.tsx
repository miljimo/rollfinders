import Image from "next/image";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  MapPin,
  QrCode,
  Tag,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { CourseActivityType, EventPricingType, type AcademyVerificationStatus, type ClaimStatus, type CourseType, type EventAudience, type GiType } from "@prisma/client";
import { AnalyticsClickTracker } from "@/components/Analytics";
import { BookEventButton, type BookEventKind } from "@/components/BookEventButton";
import { Button } from "@/components/Button";
import { EventTimeline } from "@/components/EventTimeline";
import { FreeEventBookingButton } from "@/components/FreeEventBookingButton";
import { LinkedText } from "@/components/LinkedText";
import { MapWithDirection } from "@/components/MapWithDirection";
import { PageShell } from "@/components/Page";
import { PublicEventFlyer } from "@/components/PublicEventFlyer";
import { isPublicAcademyTrusted, PublicListingWarning } from "@/components/PublicListingWarning";
import { SummaryTile } from "@/components/SummaryTile";
import { courseActivityTypeLabels } from "@/lib/course-activities";
import { courseLocationLabel, coursePriceLabel, courseTypeLabel } from "@/lib/courses";
import { formatDate } from "@/lib/utils";
import type { CourseCheckoutState } from "@/app/courses/[id]/payment-actions";

type AcademyForDetail = {
  address: string;
  borough?: string | null;
  city: string;
  claims?: { status: ClaimStatus }[];
  coverImageUrl?: string | null;
  id: string;
  latitude: number;
  logoUrl?: string | null;
  longitude: number;
  members?: unknown[];
  name: string;
  postcode: string;
  slug: string;
  verificationStatus?: AcademyVerificationStatus;
  verified?: boolean;
};

type DetailActivity = {
  id: string;
  activityType: CourseActivityType;
  description?: string | null;
  endTime: string;
  name: string;
  startTime: string;
};

type PublicDetailEvent = {
  academy: AcademyForDetail;
  academyId: string;
  active: boolean;
  activities: DetailActivity[];
  addressOverride: string | null;
  audience: EventAudience;
  capacity?: number | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  courseType: CourseType;
  description: string;
  donationLabel?: string | null;
  endTime: string;
  eventDate: Date | string;
  giType: GiType;
  id: string;
  instructor?: string | null;
  isRecurringOccurrence?: boolean;
  locationName: string | null;
  occurrenceDateParam: string;
  occurrenceStatus?: string;
  price: unknown;
  pricingType?: EventPricingType;
  recurrenceLabel?: string;
  startTime: string;
  title: string;
};

type PublicEventDetailPageProps = {
  analyticsMetadata: Record<string, string | number | boolean | null | undefined>;
  backHref: string;
  backLabel: string;
  checkoutForm?: ReactNode;
  event: PublicDetailEvent;
  freeBookingAction?: (state: CourseCheckoutState, formData: FormData) => Promise<CourseCheckoutState>;
  permanentHref: string;
  qrCodeHref: string;
  sourcePage: string;
};

function formatTimeRange(event: Pick<PublicDetailEvent, "startTime" | "endTime">) {
  return `${event.startTime} - ${event.endTime}`;
}

function coverInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "RF";
}

function BookingAction({
  checkoutForm,
  event,
  freeBookingAction,
  trusted,
}: {
  checkoutForm?: React.ReactNode;
  event: PublicDetailEvent;
  freeBookingAction?: (state: CourseCheckoutState, formData: FormData) => Promise<CourseCheckoutState>;
  trusted: boolean;
}) {
  const priceLabel = coursePriceLabel(event);
  const isDonation = event.pricingType === EventPricingType.DONATION;
  const isFree = event.pricingType === EventPricingType.FREE || priceLabel === "Free";
  const canCheckout = Boolean(checkoutForm);
  const eventKind: BookEventKind = isDonation ? "donation" : isFree ? "free" : "paid";
  const closed = !event.active;
  const bookable = trusted && !closed && canCheckout;
  const freeBookable = trusted && !closed && isFree;

  return (
    <section aria-label="Booking action">
      {bookable ? (
        <div className="max-w-[300px]">{checkoutForm}</div>
      ) : freeBookable && freeBookingAction ? (
        <div className="max-w-[300px]">
          <FreeEventBookingButton action={freeBookingAction} courseId={event.id} occurrenceDate={event.occurrenceDateParam} priceLabel={priceLabel} className="w-full" />
        </div>
      ) : (
        <BookEventButton
          disabled
          eventKind={eventKind}
          label={closed ? "Booking Closed" : undefined}
          priceLabel={closed ? undefined : priceLabel}
          className="w-full max-w-[300px]"
        />
      )}
    </section>
  );
}

function EventOutline({ event }: { event: PublicDetailEvent }) {
  const activities = event.activities.length
    ? event.activities
    : [{
      activityType: CourseActivityType.CUSTOM,
      description: event.description ? "Full event session" : null,
      endTime: event.endTime,
      id: "event-session",
      name: event.title,
      startTime: event.startTime,
    }];

  return (
    <section className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 sm:p-5" aria-labelledby="outline-heading">
      <h2 id="outline-heading" className="text-xl font-black text-stone-950">Outlines</h2>
      <EventTimeline
        activities={activities.map((activity) => ({
          activityTypeLabel: courseActivityTypeLabels[activity.activityType] ?? "Activity",
          endTime: activity.endTime,
          id: activity.id,
          name: activity.name,
          startTime: activity.startTime,
        }))}
        className="mt-4"
        eventDate={event.eventDate}
      />
    </section>
  );
}

function HostAcademyCard({ event, trusted }: { event: PublicDetailEvent; trusted: boolean }) {
  const logo = event.academy.logoUrl?.trim();

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm" aria-labelledby="host-heading">
      <h2 id="host-heading" className="text-lg font-black text-stone-950">Host Academy</h2>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-stone-100 text-sm font-black text-stone-700">
          {logo ? (
            <Image src={logo} alt="" width={56} height={56} unoptimized className="size-full object-cover" />
          ) : (
            coverInitials(event.academy.name)
          )}
        </div>
        <div className="min-w-0">
          <p className="font-black text-stone-950">{event.academy.name}</p>
          <p className="text-sm font-semibold text-stone-600">{event.academy.city}</p>
          {trusted ? (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-black uppercase text-teal-800">
              <CheckCircle2 size={14} aria-hidden />
              Verified
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4">
        <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "academy_details", academyId: event.academyId, external: false, courseId: event.id, sourcePage: "public_event_detail" }}>
          <Button href={`/academies/${event.academy.slug}`} variant="secondary" className="w-full">
            View Academy Profile
          </Button>
        </AnalyticsClickTracker>
      </div>
    </section>
  );
}

function ShareCard({
  event,
  permanentHref,
  qrCodeHref,
}: {
  event: PublicDetailEvent;
  permanentHref: string;
  qrCodeHref: string;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm" aria-label="Event QR code">
      <div className="grid gap-3">
        <a href={permanentHref} target="_blank" rel="noreferrer" className="mx-auto inline-flex w-full justify-center rounded-md border border-stone-200 bg-white p-3 transition hover:bg-stone-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCodeHref} alt={`QR code for ${event.title}`} className="size-56 max-w-full" />
        </a>
        <Button href={qrCodeHref} target="_blank" rel="noreferrer" size="sm" variant="secondary" className="w-full">
          <QrCode size={15} aria-hidden />
          Open QR Code
        </Button>
      </div>
    </section>
  );
}

export function PublicEventDetailPage({
  analyticsMetadata,
  backHref,
  backLabel,
  checkoutForm,
  event,
  freeBookingAction,
  permanentHref,
  qrCodeHref,
  sourcePage,
}: PublicEventDetailPageProps) {
  const trusted = isPublicAcademyTrusted(event.academy);
  const eventTypeLabel = courseTypeLabel(event.courseType);
  const address = `${event.addressOverride?.trim() || `${event.academy.address}, ${event.academy.city} ${event.academy.postcode}`}`;
  const locationLabel = courseLocationLabel(event);
  const priceLabel = coursePriceLabel(event);

  return (
    <PageShell>
      <div className="bg-[#f8faf7]">
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Button href={backHref} variant="subtle" className="mb-4 px-0 text-stone-700">{backLabel}</Button>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
            <div className="grid min-w-0 gap-5">
              <PublicEventFlyer
                academyName={event.academy.name}
                coverImageUrl={event.academy.coverImageUrl}
                eventTypeLabel={eventTypeLabel}
                title={event.title}
                trusted={trusted}
              />

              <PublicListingWarning academy={event.academy} course={event} />

              <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryTile icon={<CalendarDays size={16} aria-hidden />} label="Date" value={formatDate(event.eventDate)} />
                <SummaryTile icon={<Clock size={16} aria-hidden />} label="Time" value={formatTimeRange(event)} />
                <SummaryTile icon={<Tag size={16} aria-hidden />} label="Cost" value={priceLabel} />
                <SummaryTile icon={<Users size={16} aria-hidden />} label="Capacity" value={event.capacity ? `${event.capacity} Total spots` : "Check first"} />
              </dl>

              <BookingAction checkoutForm={checkoutForm} event={event} freeBookingAction={freeBookingAction} trusted={trusted} />

              <EventOutline event={event} />

              <section className="rounded-lg border border-stone-200 bg-white p-4 sm:p-5" aria-labelledby="details-heading">
                <h2 id="details-heading" className="text-xl font-black text-stone-950">Details</h2>
                <p className="mt-3 whitespace-pre-wrap text-base leading-8 text-stone-700"><LinkedText text={event.description} /></p>
                <div className="mt-5 grid gap-3 text-sm font-semibold text-stone-700 sm:grid-cols-2">
                  <p className="flex items-start gap-2"><MapPin size={17} className="mt-0.5 text-teal-700" aria-hidden /> {locationLabel}</p>
                  {event.instructor ? <p className="flex items-start gap-2"><GraduationCap size={17} className="mt-0.5 text-teal-700" aria-hidden /> {event.instructor}</p> : null}
                </div>
              </section>
            </div>

            <aside className="grid gap-4 lg:sticky lg:top-24">
              <MapWithDirection
                address={address}
                analyticsMetadata={{ actionType: "directions", academyId: event.academyId, external: true, courseId: event.id, sourcePage }}
                latitude={event.academy.latitude}
                locationLabel={locationLabel}
                longitude={event.academy.longitude}
              />
              <HostAcademyCard event={event} trusted={trusted} />
              <ShareCard event={event} permanentHref={permanentHref} qrCodeHref={qrCodeHref} />
              <div className="flex flex-wrap gap-2">
                {event.contactPhone ? <Button href={`tel:${event.contactPhone}`} variant="secondary" className="flex-1">Call</Button> : null}
              </div>
            </aside>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
