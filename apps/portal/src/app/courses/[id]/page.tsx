import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { CourseType, EventPricingType } from "@prisma/client";
import { PublicEventDetailPage } from "@/app/_components/PublicEventDetailPage";
import {
  isPublicAcademyBookingVerified,
  isPublicAcademyPaymentsVerified,
  isPublicAcademyTrusted,
} from "@/app/_components/PublicListingWarning";
import { academyPaymentAccountReadiness } from "@/lib/academy-payment-account";
import { analyticsCountryFromHeaders } from "@/lib/analytics/country";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";
import { coursePriceLabel, getCourseOccurrence } from "@/lib/courses";
import { eventPermanentPath, eventQrCodePath } from "@/lib/event-share-links";
import {
  publicDetailDashboardDialogPath,
  publicDetailReturnPath,
} from "@/lib/public-detail-return-path";
import { CourseCheckoutForm } from "./CourseCheckoutForm";
import { bookFreeCourseOccurrence } from "./payment-actions";

export const dynamic = "force-dynamic";

function academyWalletOwnerIds(event: {
  academy: { members: { id: string }[] };
}) {
  return event.academy.members
    .map((member) => (member as { userId?: string }).userId)
    .filter((userId): userId is string => Boolean(userId));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { date } = await searchParams;
  const event = await getCourseOccurrence(id, date);
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
      images: event.academy.coverImageUrl
        ? [{ url: event.academy.coverImageUrl }]
        : undefined,
    },
  };
}

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
  const dashboardDialogHref = publicDetailDashboardDialogPath(
    returnTo,
    event.id,
  );
  if (dashboardDialogHref) redirect(dashboardDialogHref);
  const closeHref = publicDetailReturnPath(returnTo, "/courses");
  if (event.courseType === CourseType.OPEN_MAT) {
    const query = new URLSearchParams();
    if (date) query.set("date", date);
    if (returnTo) query.set("returnTo", returnTo);
    redirect(
      `/open-mats/${event.id}${query.size ? `?${query.toString()}` : ""}`,
    );
  }

  const payableAmount = Number(event.price);
  const academyTrusted = isPublicAcademyTrusted(event.academy);
  const academyBookingVerified = isPublicAcademyBookingVerified(event.academy);
  const academyPaymentsVerified = isPublicAcademyPaymentsVerified(
    event.academy,
  );
  const paymentAccount = await academyPaymentAccountReadiness(
    event.academyId,
    academyWalletOwnerIds(event),
  );
  const canCheckout =
    event.active &&
    academyTrusted &&
    academyBookingVerified &&
    academyPaymentsVerified &&
    paymentAccount.ready &&
    ((event.pricingType === EventPricingType.FIXED &&
      Number.isFinite(payableAmount) &&
      payableAmount > 0) ||
      event.pricingType === EventPricingType.DONATION);
  const canBookFree =
    event.active &&
    academyTrusted &&
    academyBookingVerified &&
    event.pricingType === EventPricingType.FREE;
  const checkoutMode =
    event.pricingType === EventPricingType.DONATION ? "donation" : "fixed";
  const suggestedDonationAmount =
    Number.isFinite(payableAmount) && payableAmount > 0
      ? payableAmount
      : undefined;
  const permanentHref = eventPermanentPath(event.id);
  const qrCodeHref = eventQrCodePath(event.id);
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
    <PublicEventDetailPage
      analyticsMetadata={{
        academyId: event.academyId,
        courseId: event.id,
        sourcePage: "course_profile",
      }}
      backHref={closeHref}
      backLabel="Back to courses"
      checkoutForm={
        canCheckout && !canBookFree ? (
          <CourseCheckoutForm
            courseId={event.id}
            occurrenceDate={event.occurrenceDateParam}
            mode={checkoutMode}
            priceLabel={coursePriceLabel(event)}
            suggestedAmount={suggestedDonationAmount}
          />
        ) : undefined
      }
      event={event}
      freeBookingAction={canBookFree ? bookFreeCourseOccurrence : undefined}
      permanentHref={permanentHref}
      qrCodeHref={qrCodeHref}
      sourcePage="course_profile"
    />
  );
}
