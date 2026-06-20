import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { CourseType, EventPricingType } from "@prisma/client";
import { PublicEventDetailPage } from "@/components/PublicEventDetailPage";
import { isPublicAcademyTrusted } from "@/components/PublicListingWarning";
import { analyticsCountryFromHeaders } from "@/lib/analytics/country";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";
import { coursePriceLabel, getCourseOccurrence } from "@/lib/courses";
import { eventPermanentPath, eventQrCodePath } from "@/lib/event-share-links";
import { publicDetailDashboardDialogPath, publicDetailReturnPath } from "@/lib/public-detail-return-path";
import { CourseCheckoutForm } from "./CourseCheckoutForm";

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
      images: event.academy.coverImageUrl ? [{ url: event.academy.coverImageUrl }] : undefined,
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
  const dashboardDialogHref = publicDetailDashboardDialogPath(returnTo, event.id);
  if (dashboardDialogHref) redirect(dashboardDialogHref);
  const closeHref = publicDetailReturnPath(returnTo, "/courses");
  if (event.courseType === CourseType.OPEN_MAT) {
    const query = new URLSearchParams();
    if (date) query.set("date", date);
    if (returnTo) query.set("returnTo", returnTo);
    redirect(`/open-mats/${event.id}${query.size ? `?${query.toString()}` : ""}`);
  }

  const payableAmount = Number(event.price);
  const academyTrusted = isPublicAcademyTrusted(event.academy);
  const canCheckout = event.active && academyTrusted && ((event.pricingType === EventPricingType.FIXED && Number.isFinite(payableAmount) && payableAmount > 0) || event.pricingType === EventPricingType.DONATION);
  const checkoutMode = event.pricingType === EventPricingType.DONATION ? "donation" : "fixed";
  const suggestedDonationAmount = Number.isFinite(payableAmount) && payableAmount > 0 ? payableAmount : undefined;
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
      analyticsMetadata={{ academyId: event.academyId, courseId: event.id, sourcePage: "course_profile" }}
      backHref={closeHref}
      backLabel="Back to courses"
      checkoutForm={canCheckout ? <CourseCheckoutForm courseId={event.id} occurrenceDate={event.occurrenceDateParam} mode={checkoutMode} priceLabel={coursePriceLabel(event)} suggestedAmount={suggestedDonationAmount} /> : undefined}
      event={event}
      permanentHref={permanentHref}
      qrCodeHref={qrCodeHref}
      sourcePage="course_profile"
    />
  );
}
