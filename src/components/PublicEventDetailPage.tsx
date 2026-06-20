import Image from "next/image";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  MapPin,
  QrCode,
  Share2,
  Tag,
  Ticket,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { CourseActivityType, EventPricingType, GiType, type AcademyVerificationStatus, type ClaimStatus, type CourseType, type EventAudience } from "@prisma/client";
import { AnalyticsClickTracker } from "@/components/AnalyticsClickTracker";
import { Button } from "@/components/Button";
import { InlineDirectionsButton } from "@/components/InlineDirectionsButton";
import { LinkedText } from "@/components/LinkedText";
import { PageShell } from "@/components/PageShell";
import { isPublicAcademyTrusted, PublicListingWarning } from "@/components/PublicListingWarning";
import { PublicEventShareActions } from "@/components/PublicEventShareActions";
import { courseActivityTypeLabels } from "@/lib/course-activities";
import { courseLocationLabel, coursePriceLabel, courseTypeLabel } from "@/lib/courses";
import { directionsUrl, formatDate } from "@/lib/utils";

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
  permanentHref: string;
  permanentUrl: string;
  qrCodeHref: string;
  sourcePage: string;
  variant: "course" | "open-mat";
};

function formatTimeRange(event: Pick<PublicDetailEvent, "startTime" | "endTime">) {
  return `${event.startTime} - ${event.endTime}`;
}

function giTypeLabel(giType: GiType) {
  if (giType === GiType.NO_GI) return "No-Gi";
  if (giType === GiType.BOTH) return "Gi and No-Gi";
  return "Gi";
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
  trusted,
}: {
  checkoutForm?: React.ReactNode;
  event: PublicDetailEvent;
  trusted: boolean;
}) {
  const priceLabel = coursePriceLabel(event);
  const isDonation = event.pricingType === EventPricingType.DONATION;
  const isFree = event.pricingType === EventPricingType.FREE || priceLabel === "Free";
  const canCheckout = Boolean(checkoutForm);
  const primaryLabel = isDonation ? "Donate" : isFree ? "Reserve Spot" : "Book Now";
  const closed = !event.active;

  return (
    <section className="rounded-lg border border-teal-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="booking-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-teal-800">Booking</p>
          <h2 id="booking-heading" className="mt-1 text-2xl font-black text-stone-950">
            {closed ? "Booking Closed" : primaryLabel}
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-stone-700">
            {closed ? "This event is not currently accepting bookings." : priceLabel}
          </p>
        </div>
        <Ticket className="mt-1 text-teal-700" size={24} aria-hidden />
      </div>
      {!trusted ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-950">
          Online booking is hidden until this academy is claimed and verified.
        </p>
      ) : canCheckout ? (
        <div className="mt-4">{checkoutForm}</div>
      ) : (
        <Button disabled variant="primary" className="mt-4 w-full">
          {closed ? "Booking Closed" : primaryLabel}
        </Button>
      )}
    </section>
  );
}

function SummaryCell({
  icon,
  label,
  value,
  detail,
}: {
  detail?: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <dt className="flex items-center gap-2 text-xs font-black uppercase text-stone-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-2 text-lg font-black text-stone-950">{value}</dd>
      {detail ? <dd className="mt-1 text-sm font-semibold text-stone-600">{detail}</dd> : null}
    </div>
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
    <section className="rounded-lg border border-stone-200 bg-white p-4 sm:p-5" aria-labelledby="outline-heading">
      <h2 id="outline-heading" className="text-xl font-black text-stone-950">Event Outline</h2>
      <ol className="mt-4 grid gap-3">
        {activities.map((activity) => (
          <li key={activity.id} className="grid gap-3 rounded-lg bg-stone-50 p-3 text-sm leading-6 text-stone-700 sm:grid-cols-[8.5rem_1fr]">
            <p className="font-black text-stone-950">{activity.startTime} - {activity.endTime}</p>
            <div>
              <p className="font-black text-stone-950">{activity.name}</p>
              <p className="text-xs font-black uppercase text-teal-800">{courseActivityTypeLabels[activity.activityType] ?? "Activity"}</p>
              {activity.description ? <p className="mt-1 whitespace-pre-wrap">{activity.description}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function LocationCard({ address, event }: { address: string; event: PublicDetailEvent }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm" aria-labelledby="location-heading">
      <h2 id="location-heading" className="flex items-center gap-2 text-lg font-black text-stone-950">
        <MapPin size={19} aria-hidden />
        Location
      </h2>
      <div className="mt-3 aspect-[16/9] overflow-hidden rounded-md bg-teal-50">
        <div className="flex size-full items-center justify-center bg-[linear-gradient(135deg,#ecfdf5,#f5f5f4)] text-sm font-bold text-teal-900">
          {event.academy.city}
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-stone-700">{address}</p>
      <div className="mt-3">
        <InlineDirectionsButton address={address} />
      </div>
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
  permanentUrl,
  qrCodeHref,
  metadata,
}: {
  event: PublicDetailEvent;
  metadata: Record<string, string | number | boolean | null | undefined>;
  permanentHref: string;
  permanentUrl: string;
  qrCodeHref: string;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm" aria-labelledby="share-heading">
      <h2 id="share-heading" className="flex items-center gap-2 text-lg font-black text-stone-950">
        <Share2 size={18} aria-hidden />
        Share Event
      </h2>
      <p className="mt-2 break-all rounded-md bg-stone-50 p-3 text-xs font-semibold leading-5 text-stone-700">{permanentUrl}</p>
      <div className="mt-3 grid gap-3">
        <PublicEventShareActions eventTitle={event.title} shareUrl={permanentUrl} metadata={metadata} />
        <a href={permanentHref} target="_blank" rel="noreferrer" className="mx-auto inline-flex rounded-md border border-stone-200 bg-white p-2 transition hover:bg-stone-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCodeHref} alt={`QR code for ${event.title}`} className="size-32" />
        </a>
        <Button href={qrCodeHref} target="_blank" rel="noreferrer" size="sm" variant="secondary" className="w-full">
          <QrCode size={15} aria-hidden />
          Open QR Code
        </Button>
        <p className="text-center text-xs font-semibold text-stone-500">Event ID: {event.id}</p>
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
  permanentHref,
  permanentUrl,
  qrCodeHref,
  sourcePage,
  variant,
}: PublicEventDetailPageProps) {
  const trusted = isPublicAcademyTrusted(event.academy);
  const eventTypeLabel = variant === "open-mat" ? "Open Mat" : courseTypeLabel(event.courseType);
  const address = `${event.addressOverride?.trim() || `${event.academy.address}, ${event.academy.city} ${event.academy.postcode}`}`;
  const locationLabel = courseLocationLabel(event);
  const priceLabel = coursePriceLabel(event);
  const coverUrl = event.academy.coverImageUrl?.trim();
  const tags = [
    eventTypeLabel,
    giTypeLabel(event.giType),
    event.recurrenceLabel,
    event.instructor ? `Instructor: ${event.instructor}` : null,
    event.occurrenceStatus === "IN_SESSION" ? "In Session" : null,
  ].filter(Boolean).slice(0, 20) as string[];

  return (
    <PageShell>
      <div className="bg-[#f8faf7]">
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Button href={backHref} variant="subtle" className="mb-4 px-0 text-stone-700">{backLabel}</Button>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
            <div className="grid gap-5">
              <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm" aria-labelledby="event-title">
                <div className="relative aspect-[16/9] bg-teal-950">
                  {coverUrl ? (
                    <Image src={coverUrl} alt="" fill priority unoptimized sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-[linear-gradient(135deg,#115e59,#292524)] px-8 text-center text-5xl font-black text-white">
                      {coverInitials(event.title)}
                    </div>
                  )}
                  <div className="absolute left-4 top-4 rounded-md bg-white/95 px-3 py-2 text-xs font-black uppercase text-teal-900 shadow-sm">
                    {eventTypeLabel}
                  </div>
                  {event.capacity ? (
                    <div className="absolute bottom-4 right-4 rounded-md bg-stone-950/90 px-3 py-2 text-xs font-black uppercase text-white">
                      {event.capacity} total spots
                    </div>
                  ) : null}
                </div>
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-stone-600">
                    <span>{event.academy.name}</span>
                    {trusted ? <span className="inline-flex items-center gap-1 text-teal-800"><CheckCircle2 size={15} aria-hidden /> Verified</span> : null}
                  </div>
                  <h1 id="event-title" className="mt-2 text-4xl font-black leading-tight text-stone-950 sm:text-5xl">{event.title}</h1>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span key={tag} className="rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-black uppercase text-stone-700">{tag}</span>
                    ))}
                  </div>
                </div>
              </section>

              <div className="lg:hidden">
                <BookingAction checkoutForm={checkoutForm} event={event} trusted={trusted} />
              </div>

              <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCell icon={<CalendarDays size={16} aria-hidden />} label="Date" value={formatDate(event.eventDate)} />
                <SummaryCell icon={<Clock size={16} aria-hidden />} label="Time" value={formatTimeRange(event)} />
                <SummaryCell icon={<Tag size={16} aria-hidden />} label="Cost" value={priceLabel} />
                <SummaryCell icon={<Users size={16} aria-hidden />} label="Capacity" value={event.capacity ? `${event.capacity}` : "Check first"} detail={event.capacity ? "Total spots" : undefined} />
              </dl>

              <section className="rounded-lg border border-stone-200 bg-white p-4 sm:p-5" aria-labelledby="description-heading">
                <h2 id="description-heading" className="text-xl font-black text-stone-950">About This Event</h2>
                <p className="mt-3 whitespace-pre-wrap text-base leading-8 text-stone-700"><LinkedText text={event.description} /></p>
                <div className="mt-5 grid gap-3 text-sm font-semibold text-stone-700 sm:grid-cols-2">
                  <p className="flex items-start gap-2"><MapPin size={17} className="mt-0.5 text-teal-700" aria-hidden /> {locationLabel}</p>
                  {event.instructor ? <p className="flex items-start gap-2"><GraduationCap size={17} className="mt-0.5 text-teal-700" aria-hidden /> {event.instructor}</p> : null}
                </div>
              </section>

              <EventOutline event={event} />
            </div>

            <aside className="grid gap-4 lg:sticky lg:top-24">
              <div className="hidden lg:block">
                <BookingAction checkoutForm={checkoutForm} event={event} trusted={trusted} />
              </div>
              <LocationCard address={address} event={event} />
              <HostAcademyCard event={event} trusted={trusted} />
              <PublicListingWarning academy={event.academy} course={event} />
              <ShareCard event={event} permanentHref={permanentHref} permanentUrl={permanentUrl} qrCodeHref={qrCodeHref} metadata={analyticsMetadata} />
              <div className="flex flex-wrap gap-2">
                <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "directions", academyId: event.academyId, external: true, courseId: event.id, sourcePage }}>
                  <Button href={directionsUrl(address)} target="_blank" rel="noreferrer" variant="neutral" className="flex-1">Directions</Button>
                </AnalyticsClickTracker>
                {event.contactEmail ? <Button href={`mailto:${event.contactEmail}`} variant="secondary" className="flex-1">Email</Button> : null}
                {event.contactPhone ? <Button href={`tel:${event.contactPhone}`} variant="secondary" className="flex-1">Call</Button> : null}
              </div>
            </aside>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
