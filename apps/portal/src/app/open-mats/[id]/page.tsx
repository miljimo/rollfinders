import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { EventPricingType } from "@prisma/client";
import { PublicEventDetailPage } from "@/components/PublicEventDetailPage";
import { isPublicAcademyBookingVerified, isPublicAcademyPaymentsVerified, isPublicAcademyTrusted } from "@/components/PublicListingWarning";
import { academyPaymentAccountReadiness } from "@/lib/academy-payment-account";
import { analyticsCountryFromHeaders } from "@/lib/analytics/country";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";
import { coursePriceLabel } from "@/lib/courses";
import { getOpenMatOccurrence } from "@/lib/data";
import { eventPermanentPath, eventQrCodePath } from "@/lib/event-share-links";
import { publicDetailDashboardDialogPath, publicDetailReturnPath } from "@/lib/public-detail-return-path";
import { CourseCheckoutForm } from "../../courses/[id]/CourseCheckoutForm";
import { bookFreeCourseOccurrence } from "../../courses/[id]/payment-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { date } = await searchParams;
  const event = await getOpenMatOccurrence(id, date);
  if (!event) return {};
  const title = `${event.title} at ${event.academy.name} | RollFinders`;
  const description = event.description.slice(0, 155);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: eventPermanentPath(event.id),
      images: event.academy.coverImageUrl ? [{ url: event.academy.coverImageUrl }] : undefined,
    },
  };
}

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

  const country = analyticsCountryFromHeaders(await headers());
  const payableAmount = Number(event.price);
  const academyTrusted = isPublicAcademyTrusted(event.academy);
  const academyBookingVerified = isPublicAcademyBookingVerified(event.academy);
  const academyPaymentsVerified = isPublicAcademyPaymentsVerified(event.academy);
  const paymentAccount = await academyPaymentAccountReadiness(event.academyId);
  const canCheckout = event.active && academyTrusted && academyBookingVerified && academyPaymentsVerified && paymentAccount.ready && ((event.pricingType === EventPricingType.FIXED && Number.isFinite(payableAmount) && payableAmount > 0) || event.pricingType === EventPricingType.DONATION);
  const canBookFree = event.active && academyTrusted && academyBookingVerified && event.pricingType === EventPricingType.FREE;
  const checkoutMode = event.pricingType === EventPricingType.DONATION ? "donation" : "fixed";
  const suggestedDonationAmount = Number.isFinite(payableAmount) && payableAmount > 0 ? payableAmount : undefined;
  const permanentHref = eventPermanentPath(event.id);
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
    <PublicEventDetailPage
      analyticsMetadata={{ academyId: event.academyId, openMatId: event.id, sourcePage: "open_mat_profile" }}
      backHref={closeHref}
      backLabel="Back to sessions"
      checkoutForm={canCheckout && !canBookFree ? <CourseCheckoutForm courseId={event.id} occurrenceDate={event.occurrenceDateParam} mode={checkoutMode} priceLabel={coursePriceLabel(event)} suggestedAmount={suggestedDonationAmount} /> : undefined}
      event={event}
      freeBookingAction={canBookFree ? bookFreeCourseOccurrence : undefined}
      permanentHref={permanentHref}
      qrCodeHref={qrCodeHref}
      sourcePage="open_mat_profile"
    />
  );
}
