import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, ChevronLeft, ChevronRight, Clock, Info, MapPin, MessageSquare, QrCode, ShieldCheck, Tag, UsersRound } from "lucide-react";
import { EventPricingType } from "@prisma/client";
import { BookEventButton, type BookEventKind } from "@/app/_components/BookEventButton";
import { Button } from "@/app/_components/Button";
import { FreeEventBookingButton } from "@/app/_components/FreeEventBookingButton";
import { LinkedText } from "@/app/_components/LinkedText";
import { MapWithDirection } from "@/app/_components/MapWithDirection";
import { MobileNavigation } from "@/app/_components/MobileNavigation";
import { isPublicAcademyBookingVerified, isPublicAcademyPaymentsVerified, isPublicAcademyTrusted } from "@/app/_components/PublicListingWarning";
import { academyPaymentAccountReadiness } from "@/lib/academy-payment-account";
import { courseActivityTypeLabels } from "@/lib/course-activities";
import { courseAddress, courseLocationLabel, coursePriceLabel, courseTypeLabel } from "@/lib/courses";
import { getOpenMatOccurrence } from "@/lib/data";
import { eventQrCodePath } from "@/lib/event-share-links";
import { formatDate } from "@/lib/utils";
import { CourseCheckoutForm } from "../../../courses/[id]/CourseCheckoutForm";
import { bookFreeCourseOccurrence } from "../../../courses/[id]/payment-actions";

export const dynamic = "force-dynamic";

type MobileEventDetailParams = {
  date?: string;
  returnTo?: string;
  tab?: string;
};

type MobileEventTab = "events" | "details" | "venue" | "book";

function safeReturnTo(value?: string) {
  const target = value?.trim() || "/mobile";
  return target.startsWith("/mobile") ? target : "/mobile";
}

function selectedTab(value?: string): MobileEventTab {
  return value === "details" || value === "venue" || value === "book" ? value : "events";
}

function academyInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "RF";
}

function academyWalletOwnerIds(event: { academy: { members: { id: string }[] } }) {
  return event.academy.members
    .map((member) => (member as { userId?: string }).userId)
    .filter((userId): userId is string => Boolean(userId));
}

function mobileBookingUnavailableLabel({
  active,
  bookingVerified,
  paymentsReady,
  paymentsVerified,
  trusted,
}: {
  active: boolean;
  bookingVerified: boolean;
  paymentsReady: boolean;
  paymentsVerified: boolean;
  trusted: boolean;
}) {
  if (!active) return "Booking is closed for this session.";
  if (!trusted || !bookingVerified) return "Booking unavailable until this academy is verified.";
  if (!paymentsVerified || !paymentsReady) return "Payment unavailable for this session.";
  return "Booking unavailable for this session.";
}

export default async function MobileEventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<MobileEventDetailParams>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const event = await getOpenMatOccurrence(id, query.date);
  if (!event) notFound();

  const closeHref = safeReturnTo(query.returnTo);
  const activeTab = selectedTab(query.tab);
  const tabHref = (tab: MobileEventTab) => {
    const next = new URLSearchParams();
    if (query.date) next.set("date", query.date);
    next.set("returnTo", closeHref);
    next.set("tab", tab);
    return `/mobile/events/${event.id}?${next.toString()}`;
  };
  const address = courseAddress(event);
  const locationLabel = courseLocationLabel(event);
  const priceLabel = coursePriceLabel(event);
  const payableAmount = Number(event.price);
  const academyTrusted = isPublicAcademyTrusted(event.academy);
  const academyBookingVerified = isPublicAcademyBookingVerified(event.academy);
  const academyPaymentsVerified = isPublicAcademyPaymentsVerified(event.academy);
  const paymentAccount = await academyPaymentAccountReadiness(event.academyId, academyWalletOwnerIds(event));
  const canCheckout =
    event.active &&
    academyTrusted &&
    academyBookingVerified &&
    academyPaymentsVerified &&
    paymentAccount.ready &&
    ((event.pricingType === EventPricingType.FIXED && Number.isFinite(payableAmount) && payableAmount > 0) ||
      event.pricingType === EventPricingType.DONATION);
  const canBookFree =
    event.active &&
    academyTrusted &&
    academyBookingVerified &&
    event.pricingType === EventPricingType.FREE;
  const checkoutMode = event.pricingType === EventPricingType.DONATION ? "donation" : "fixed";
  const suggestedDonationAmount = Number.isFinite(payableAmount) && payableAmount > 0 ? payableAmount : undefined;
  const eventKind: BookEventKind =
    event.pricingType === EventPricingType.DONATION ? "donation" : event.pricingType === EventPricingType.FREE ? "free" : "paid";
  const unavailableLabel = mobileBookingUnavailableLabel({
    active: event.active,
    bookingVerified: academyBookingVerified,
    paymentsReady: paymentAccount.ready,
    paymentsVerified: academyPaymentsVerified,
    trusted: academyTrusted,
  });
  const coverImage = event.academy.coverImageUrl?.trim();
  const activities = event.activities.length ? event.activities : [{
    activityType: "CUSTOM" as const,
    courseId: event.id,
    description: null,
    endTime: event.endTime,
    id: "event-session",
    name: event.title,
    sortOrder: 0,
    startTime: event.startTime,
  }];

  return (
    <main className="min-h-dvh w-screen max-w-[100vw] overflow-x-hidden [overflow-x:clip] bg-[radial-gradient(circle_at_top_left,#eefaf7_0,#ffffff_36%,#f7faf8_100%)] px-3 py-5 text-slate-950">
      <div className="grid w-full max-w-full min-w-0 gap-4 pb-24">
        <Link href={closeHref} className="inline-flex min-h-11 min-w-0 items-center gap-3 rounded-full text-base font-black text-slate-950">
          <ChevronLeft size={23} aria-hidden />
          <span className="truncate">{event.title}</span>
        </Link>

        <MobileEventTabs activeTab={activeTab} hrefFor={tabHref} />

        {activeTab === "events" ? (
          <MobileEventSummary
            event={event}
            priceLabel={priceLabel}
            tabHref={tabHref}
          />
        ) : null}

        {activeTab === "details" ? (
          <MobileEventDetails
            activities={activities}
            coverImage={coverImage}
            event={event}
            priceLabel={priceLabel}
          />
        ) : null}

        {activeTab === "venue" ? (
          <MobileVenueDetails address={address} event={event} locationLabel={locationLabel} />
        ) : null}

        {activeTab === "book" ? (
          <MobileBookPanel
            canBookFree={canBookFree}
            canCheckout={canCheckout}
            checkoutMode={checkoutMode}
            event={event}
            eventKind={eventKind}
            priceLabel={priceLabel}
            suggestedAmount={suggestedDonationAmount}
            unavailableLabel={unavailableLabel}
          />
        ) : null}
      </div>
      <MobileNavigation activeTab="home" />
    </main>
  );
}

type MobileEvent = NonNullable<Awaited<ReturnType<typeof getOpenMatOccurrence>>>;
type MobileActivity = MobileEvent["activities"][number];

function MobileEventTabs({ activeTab, hrefFor }: { activeTab: MobileEventTab; hrefFor: (tab: MobileEventTab) => string }) {
  const tabs: { id: MobileEventTab; label: string }[] = [
    { id: "events", label: "Events" },
    { id: "details", label: "Details" },
    { id: "venue", label: "Venue" },
    { id: "book", label: "Book" },
  ];

  return (
    <nav className="grid min-w-0 grid-cols-4 gap-1 rounded-xl border border-stone-200 bg-white p-1 shadow-sm" aria-label="Event detail sections">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={hrefFor(tab.id)}
          aria-current={activeTab === tab.id ? "page" : undefined}
          className={`flex min-h-10 min-w-0 items-center justify-center rounded-lg px-1 text-xs font-black ${activeTab === tab.id ? "bg-teal-700 text-white" : "text-slate-950"}`}
        >
          <span className="truncate">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MobileEventSummary({ event, priceLabel, tabHref }: { event: MobileEvent; priceLabel: string; tabHref: (tab: MobileEventTab) => string }) {
  return (
    <section className="grid min-w-0 gap-4">
      <h1 className="text-xl font-black text-slate-950">Available events</h1>
      <article className="grid min-w-0 gap-4 overflow-hidden rounded-2xl bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <p className="w-fit rounded-lg bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-teal-800">{courseTypeLabel(event.courseType)}</p>
        <div>
          <h2 className="break-words text-xl font-black leading-tight text-slate-950">{event.title}</h2>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
            {event.academy.name}
            <span className="size-3 rounded-full bg-blue-500" aria-hidden />
          </p>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-3 border-y border-stone-200 py-3 text-sm font-semibold text-slate-900">
          <span className="flex min-w-0 items-center gap-2"><CalendarCheck size={17} className="shrink-0 text-teal-700" aria-hidden /><span className="min-w-0 break-words">{formatDate(event.eventDate)}</span></span>
          <span className="flex min-w-0 items-center gap-2"><Clock size={17} className="shrink-0 text-teal-700" aria-hidden /><span className="min-w-0 break-words">{event.startTime} - {event.endTime}</span></span>
          <span className="flex min-w-0 items-center gap-2"><Tag size={17} className="shrink-0 text-teal-700" aria-hidden /><span className="min-w-0 break-words [overflow-wrap:anywhere]">{priceLabel}</span></span>
          <span className="flex min-w-0 items-center gap-2"><UsersRound size={17} className="shrink-0 text-teal-700" aria-hidden /><span className="min-w-0 break-words">{event.capacity ? `${event.capacity} spots` : "Check first"}</span></span>
        </div>
        <p className="flex items-start gap-2 rounded-xl bg-teal-50 p-3 text-sm font-semibold leading-5 text-slate-700">
          <Info size={17} className="mt-0.5 shrink-0 text-teal-700" aria-hidden />
          {priceLabel}
        </p>
        <Button href={tabHref("details")} variant="secondary" className="min-h-12 justify-between rounded-xl border-teal-700 text-teal-800">
          View Details
          <ChevronRight size={18} aria-hidden />
        </Button>
      </article>
    </section>
  );
}

function MobileEventDetails({
  activities,
  coverImage,
  event,
  priceLabel,
}: {
  activities: MobileActivity[];
  coverImage?: string;
  event: MobileEvent;
  priceLabel: string;
}) {
  return (
    <section className="grid min-w-0 gap-4">
      <div className="relative min-h-44 overflow-hidden rounded-2xl bg-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.14)]">
        {coverImage ? <Image src={coverImage} alt="" fill unoptimized className="object-cover" /> : <div className="absolute inset-0 bg-[linear-gradient(135deg,#004f45,#0f172a)]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
        <div className="relative flex min-h-44 flex-col justify-end p-4">
          <p className="mb-4 w-fit rounded-lg bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-teal-800">{courseTypeLabel(event.courseType)}</p>
          <h1 className="break-words text-2xl font-black leading-tight text-white">{event.title}</h1>
          <p className="mt-2 text-sm font-bold text-white/90">{event.academy.name}</p>
        </div>
      </div>

      <section className="flex gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800"><ShieldCheck size={25} aria-hidden /></span>
        <div>
          <h2 className="text-base font-black text-slate-950">Confirm before visiting</h2>
          <p className="mt-1 text-sm leading-5 text-slate-600">Session details can change. Confirm the time, price, capacity, and visitor policy before travelling.</p>
        </div>
      </section>

      <section className="grid min-w-0 grid-cols-2 overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <MobileInfoTile icon={<CalendarCheck size={22} />} label="Date" value={formatDate(event.eventDate)} />
        <MobileInfoTile icon={<Clock size={22} />} label="Time" value={`${event.startTime} - ${event.endTime}`} />
        <MobileInfoTile icon={<Tag size={22} />} label="Cost" value={priceLabel} />
        <MobileInfoTile icon={<UsersRound size={22} />} label="Capacity" value={event.capacity ? `${event.capacity} spots` : "Check first"} />
      </section>

      <section className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <h2 className="text-base font-black text-slate-950">What to expect</h2>
        <p className="text-sm leading-6 text-slate-700">{event.description ? <LinkedText text={event.description} /> : "Open mat for all levels. Come to train, learn and connect with the community."}</p>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <h2 className="text-base font-black text-slate-950">Outline</h2>
        <div className="mt-4 grid gap-4">
          {activities.map((activity) => <MobileTimelineRow key={activity.id} label={activity.name} meta={courseActivityTypeLabels[activity.activityType] ?? "Activity"} time={activity.startTime} />)}
          <MobileTimelineRow label="Session End" time={event.endTime} />
        </div>
      </section>
    </section>
  );
}

function MobileVenueDetails({ address, event, locationLabel }: { address: string; event: MobileEvent; locationLabel: string }) {
  return (
    <section className="grid min-w-0 gap-4">
      <section className="flex min-w-0 items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-100 text-xl font-black text-slate-800">
          {event.academy.logoUrl ? <Image src={event.academy.logoUrl} alt="" width={64} height={64} unoptimized className="size-full object-cover" /> : academyInitials(event.academy.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black text-slate-950">{event.academy.name}</h1>
          <p className="mt-1 text-sm text-slate-600">{event.academy.borough ?? event.academy.city}</p>
        </div>
        <Button href={`/academies/${event.academy.slug}`} variant="secondary" className="min-h-10 shrink-0 rounded-xl px-2 text-xs">
          Academy
        </Button>
      </section>
      <MapWithDirection
        address={address}
        analyticsMetadata={{ actionType: "directions", academyId: event.academyId, courseId: event.id, sourcePage: "mobile_event_detail" }}
        latitude={event.academy.latitude}
        locationLabel={locationLabel}
        longitude={event.academy.longitude}
      />
      <Button href="/contact" variant="secondary" className="min-h-12 rounded-xl border-teal-700 text-teal-800">
        <MessageSquare size={18} aria-hidden />
        Contact Academy
      </Button>
    </section>
  );
}

function MobileBookPanel({
  canBookFree,
  canCheckout,
  checkoutMode,
  event,
  eventKind,
  priceLabel,
  suggestedAmount,
  unavailableLabel,
}: {
  canBookFree: boolean;
  canCheckout: boolean;
  checkoutMode: "donation" | "fixed";
  event: MobileEvent;
  eventKind: BookEventKind;
  priceLabel: string;
  suggestedAmount?: number;
  unavailableLabel: string;
}) {
  return (
    <section className="grid min-w-0 gap-4">
      <section className="min-w-0 rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <h1 className="text-xl font-black text-slate-950">Booking summary</h1>
        <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-700">
          <MobileSummaryRow icon={<CalendarCheck size={18} />} label="Date" value={formatDate(event.eventDate)} />
          <MobileSummaryRow icon={<Clock size={18} />} label="Time" value={`${event.startTime} - ${event.endTime}`} />
          <MobileSummaryRow icon={<MapPin size={18} />} label="Venue" value={event.academy.name} />
          <MobileSummaryRow icon={<Tag size={18} />} label="Cost" value={priceLabel} />
        </div>
      </section>
      <MobileBookingAction
        canBookFree={canBookFree}
        canCheckout={canCheckout}
        checkoutMode={checkoutMode}
        eventId={event.id}
        eventKind={eventKind}
        occurrenceDate={event.occurrenceDateParam}
        priceLabel={priceLabel}
        suggestedAmount={suggestedAmount}
        unavailableLabel={unavailableLabel}
      />
    </section>
  );
}

function MobileBookingAction({
  canBookFree,
  canCheckout,
  checkoutMode,
  eventId,
  eventKind,
  occurrenceDate,
  priceLabel,
  suggestedAmount,
  unavailableLabel,
}: {
  canBookFree: boolean;
  canCheckout: boolean;
  checkoutMode: "donation" | "fixed";
  eventId: string;
  eventKind: BookEventKind;
  occurrenceDate: string;
  priceLabel: string;
  suggestedAmount?: number;
  unavailableLabel: string;
}) {
  if (canCheckout) {
    return (
      <section className="min-w-0 overflow-hidden rounded-3xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)]" aria-label="Book this session">
        <CourseCheckoutForm
          courseId={eventId}
          occurrenceDate={occurrenceDate}
          mode={checkoutMode}
          priceLabel={priceLabel}
          suggestedAmount={suggestedAmount}
        />
      </section>
    );
  }

  if (canBookFree) {
    return (
      <section className="min-w-0 overflow-hidden rounded-3xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)]" aria-label="Book this session">
        <FreeEventBookingButton action={bookFreeCourseOccurrence} courseId={eventId} occurrenceDate={occurrenceDate} priceLabel={priceLabel} className="w-full" />
      </section>
    );
  }

  return (
    <section className="grid min-w-0 gap-3 overflow-hidden rounded-3xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)]" aria-label="Book this session">
      <p className="text-center text-base font-semibold text-slate-700">{unavailableLabel}</p>
      <p className="text-center text-sm font-semibold text-slate-600">{priceLabel}</p>
      <BookEventButton disabled eventKind={eventKind} className="min-h-16 w-full rounded-2xl text-xl" />
    </section>
  );
}

function MobileInfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="grid min-h-28 min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] gap-2 border-b border-r border-stone-100 p-3 last:border-r-0">
      <span className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-800">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-black uppercase text-teal-800">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-950">{value}</p>
      </div>
    </div>
  );
}

function MobileTimelineRow({ label, meta, time }: { label: string; meta?: string; time: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[3.75rem_minmax(0,1fr)] gap-3">
      <div className="relative text-sm font-semibold text-slate-600">
        <span className="absolute left-1 top-2 size-3 rounded-full bg-teal-700" />
        <span className="pl-6">{time}</span>
      </div>
      <div className="min-w-0">
        <p className="break-words text-sm font-black text-slate-950">{label}</p>
        {meta ? <p className="text-xs font-bold uppercase text-teal-800">{meta}</p> : null}
      </div>
    </div>
  );
}

function MobileSummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2 text-slate-600">
        <span className="text-teal-800">{icon}</span>
        {label}
      </span>
      <span className="min-w-0 max-w-[56%] break-words text-right font-black text-slate-950">{value}</span>
    </div>
  );
}
