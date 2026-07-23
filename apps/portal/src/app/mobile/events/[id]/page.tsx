import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, ChevronLeft, Clock, MapPin, QrCode, ShieldCheck, Tag, UsersRound } from "lucide-react";
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
};

function safeReturnTo(value?: string) {
  const target = value?.trim() || "/mobile";
  return target.startsWith("/mobile") ? target : "/mobile";
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
    description: null,
    endTime: event.endTime,
    id: "event-session",
    name: event.title,
    startTime: event.startTime,
  }];

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,#eefaf7_0,#ffffff_36%,#f7faf8_100%)] px-4 py-5 text-slate-950">
      <div className="mx-auto grid max-w-md gap-5 pb-32">
        <Link href={closeHref} className="inline-flex min-h-12 w-fit items-center gap-3 rounded-full px-1 text-xl font-black text-slate-950">
          <ChevronLeft size={28} aria-hidden />
          Back to sessions
        </Link>

        <section className="relative min-h-[290px] overflow-hidden rounded-3xl bg-slate-900 shadow-[0_18px_46px_rgba(15,23,42,0.16)]">
          {coverImage ? (
            <Image src={coverImage} alt="" fill unoptimized className="object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#004f45,#0f172a)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
          <div className="relative flex min-h-[290px] flex-col justify-between p-5">
            <p className="inline-flex w-fit rounded-xl bg-white px-4 py-2 text-sm font-black uppercase tracking-wide text-teal-800 shadow-sm">
              {courseTypeLabel(event.courseType)}
            </p>
            <div>
              <h1 className="text-5xl font-black leading-none tracking-normal text-white">{event.title}</h1>
              <p className="mt-4 flex items-center gap-2 text-xl font-bold text-white/90">
                {event.academy.name}
                <span className="inline-block size-4 rounded-full bg-blue-500" aria-hidden />
              </p>
            </div>
          </div>
        </section>

        <section className="flex gap-4 rounded-3xl bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
            <ShieldCheck size={34} aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950">Confirm before visiting</h2>
            <p className="mt-1 text-base leading-6 text-slate-600">Session details can change. Confirm the time, price, capacity, and visitor policy with the academy before travelling.</p>
          </div>
        </section>

        <section className="grid grid-cols-2 overflow-hidden rounded-3xl bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <MobileInfoTile icon={<CalendarCheck size={27} />} label="Date" value={formatDate(event.eventDate)} />
          <MobileInfoTile icon={<Clock size={27} />} label="Time" value={`${event.startTime} - ${event.endTime}`} />
          <MobileInfoTile icon={<Tag size={27} />} label="Cost" value={priceLabel} />
          <MobileInfoTile icon={<UsersRound size={27} />} label="Capacity" value={event.capacity ? `${event.capacity} Total spots` : "Check first"} />
        </section>

        <MobileBookingAction
          canBookFree={canBookFree}
          canCheckout={canCheckout}
          checkoutMode={checkoutMode}
          eventId={event.id}
          eventKind={eventKind}
          occurrenceDate={event.occurrenceDateParam}
          priceLabel={priceLabel}
          suggestedAmount={suggestedDonationAmount}
          unavailableLabel={unavailableLabel}
        />

        <section className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-100 text-xl font-black text-slate-800">
            {event.academy.logoUrl ? <Image src={event.academy.logoUrl} alt="" width={80} height={80} unoptimized className="size-full object-cover" /> : academyInitials(event.academy.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-black text-slate-950">{event.academy.name}</h2>
            <p className="mt-1 text-base text-slate-600">{event.academy.borough ?? event.academy.city}</p>
          </div>
          <Button href={`/academies/${event.academy.slug}`} variant="secondary" className="min-h-12 shrink-0 rounded-xl px-4 text-sm">
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

        <section className="rounded-3xl bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-black text-slate-950">Outline</h2>
          <div className="mt-4 grid gap-4">
            {activities.map((activity) => (
              <div key={activity.id} className="grid grid-cols-[4rem_1fr] gap-4">
                <div className="relative text-base font-semibold text-slate-600">
                  <span className="absolute left-1 top-2 size-3 rounded-full bg-teal-700" />
                  <span className="pl-6">{activity.startTime}</span>
                </div>
                <div>
                  <p className="text-base font-black text-slate-950">{activity.name}</p>
                  <p className="text-sm font-bold uppercase text-slate-500">{courseActivityTypeLabels[activity.activityType] ?? "Activity"}</p>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-[4rem_1fr] gap-4">
              <div className="relative text-base font-semibold text-slate-600">
                <span className="absolute left-1 top-2 size-3 rounded-full bg-teal-700" />
                <span className="pl-6">{event.endTime}</span>
              </div>
              <p className="text-base font-black text-slate-950">Session End</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-3xl bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-black text-slate-950">Details</h2>
          {event.description ? <p className="whitespace-pre-line text-base leading-7 text-slate-700"><LinkedText text={event.description} /></p> : null}
          <p className="flex items-start gap-2 text-base font-semibold leading-6 text-slate-700">
            <MapPin size={19} className="mt-0.5 shrink-0 text-teal-700" aria-hidden />
            {event.academy.name}, {event.academy.borough ?? event.academy.city}
          </p>
          <Button href={eventQrCodePath(event.id)} variant="secondary" className="min-h-12 rounded-xl">
            <QrCode size={18} aria-hidden />
            Open QR Code
          </Button>
        </section>
      </div>
      <MobileNavigation activeTab="home" />
    </main>
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
      <section className="rounded-3xl bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]" aria-label="Book this session">
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
      <section className="rounded-3xl bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]" aria-label="Book this session">
        <FreeEventBookingButton action={bookFreeCourseOccurrence} courseId={eventId} occurrenceDate={occurrenceDate} priceLabel={priceLabel} className="w-full" />
      </section>
    );
  }

  return (
    <section className="grid gap-3 rounded-3xl bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]" aria-label="Book this session">
      <p className="text-center text-base font-semibold text-slate-700">{unavailableLabel}</p>
      <p className="text-center text-sm font-semibold text-slate-600">{priceLabel}</p>
      <BookEventButton disabled eventKind={eventKind} className="min-h-16 w-full rounded-2xl text-xl" />
    </section>
  );
}

function MobileInfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="grid min-h-28 grid-cols-[3.5rem_1fr] gap-3 border-b border-r border-stone-100 p-4 last:border-r-0">
      <span className="flex size-12 items-center justify-center rounded-xl bg-teal-50 text-teal-800">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-black uppercase text-teal-800">{label}</p>
        <p className="mt-1 text-base font-semibold leading-6 text-slate-950">{value}</p>
      </div>
    </div>
  );
}
