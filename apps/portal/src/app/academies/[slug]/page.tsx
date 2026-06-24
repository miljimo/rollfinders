import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Button } from "@/components/Button";
import { AnalyticsClickTracker } from "@/components/Analytics";
import { PageShell } from "@/components/Page";
import { PublicListingWarning } from "@/components/PublicListingWarning";
import { analyticsCountryFromHeaders } from "@/lib/analytics/country";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";
import { coursePriceLabel, courseTypeLabel, getCourseDiscovery, recurrenceLabel } from "@/lib/courses";
import { academySocialPlatformLabels } from "@/lib/academy-social-links";
import { findAcademyBySlugFromAcademyService } from "@/lib/academyService";
import { formatDate, formatMoney } from "@/lib/utils";
import { CourseType } from "@prisma/client";

export const dynamic = "force-dynamic";

const upcomingCoursesPageSize = 6;

type AcademyPageSearchParams = { coursesPage?: string };

function pageFromParam(value?: string) {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function upcomingCoursesPageHref(slug: string, page: number) {
  const next = new URLSearchParams();
  if (page > 1) next.set("coursesPage", String(page));
  const query = next.toString();
  return query ? `/academies/${slug}?${query}` : `/academies/${slug}`;
}

function paginationPages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default async function AcademyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<AcademyPageSearchParams>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const academy = await findAcademyBySlugFromAcademyService(slug);

  if (!academy) notFound();
  const courses = await getCourseDiscovery({ academyId: academy.id });
  const totalUpcomingCourses = courses.length;
  const totalUpcomingCoursePages = Math.max(1, Math.ceil(totalUpcomingCourses / upcomingCoursesPageSize));
  const currentUpcomingCoursePage = Math.min(pageFromParam(query.coursesPage), totalUpcomingCoursePages);
  const pagedCourses = courses.slice(
    (currentUpcomingCoursePage - 1) * upcomingCoursesPageSize,
    currentUpcomingCoursePage * upcomingCoursesPageSize,
  );
  const upcomingCourseStart = totalUpcomingCourses === 0 ? 0 : (currentUpcomingCoursePage - 1) * upcomingCoursesPageSize + 1;
  const upcomingCourseEnd = Math.min(currentUpcomingCoursePage * upcomingCoursesPageSize, totalUpcomingCourses);
  const academyIsManaged = academy.members.length > 0;
  const country = analyticsCountryFromHeaders(await headers());

  await recordAnalyticsEventBestEffort({
    eventName: "academy_profile_viewed",
    academyId: academy.id,
    source: "public_academy_profile",
    countryCode: country.countryCode,
    countryName: country.countryName,
    metadata: {
      slug: academy.slug,
      city: academy.city,
      borough: academy.borough,
      verificationStatus: academy.verificationStatus,
      featured: academy.featured,
      hasUpcomingCourses: courses.length > 0,
    },
  });

  const address = `${academy.address}, ${academy.city} ${academy.postcode}`;

  return (
    <PageShell>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-teal-800">{academy.verified ? "Verified academy" : academy.affiliation ?? "BJJ Academy"}</p>
          <h1 className="mt-2 text-4xl font-black text-stone-950">{academy.name}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-700">{academy.description}</p>
          <div className="mt-6 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-700 sm:grid-cols-2">
            <p><strong>Address:</strong> {address}</p>
            <p><strong>Borough:</strong> {academy.borough ?? "Not listed"}</p>
            <p><strong>Email:</strong> {academy.email ? (
              <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "email", academyId: academy.id, external: true, sourcePage: "academy_profile" }}>
                <a className="text-teal-800" href={`mailto:${academy.email}`}>{academy.email}</a>
              </AnalyticsClickTracker>
            ) : "Not listed"}</p>
            <p><strong>Phone:</strong> {academy.phone ? (
              <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "phone", academyId: academy.id, external: true, sourcePage: "academy_profile" }}>
                <a className="text-teal-800" href={`tel:${academy.phone}`}>{academy.phone}</a>
              </AnalyticsClickTracker>
            ) : "Not listed"}</p>
            <p><strong>Website:</strong> {academy.website ? (
              <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "website", academyId: academy.id, external: true, sourcePage: "academy_profile" }}>
                <a className="text-teal-800" href={academy.website} target="_blank" rel="noreferrer">{academy.website}</a>
              </AnalyticsClickTracker>
            ) : "Not listed"}</p>
            <p><strong>Drop-in:</strong> {academy.dropInPrice !== null ? formatMoney(academy.dropInPrice) : "Check with academy"}</p>
          </div>
          {academy.socialLinks.length ? (
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
              {academy.socialLinks.map((link) => (
                <AnalyticsClickTracker key={link.id} eventName="commercial_intent_clicked" metadata={{ actionType: "social_link", academyId: academy.id, external: true, sourcePage: "academy_profile", platform: link.platform }}>
                  <a className="rounded-md border border-stone-200 bg-white px-3 py-2 text-teal-800" href={link.url} target="_blank" rel="noreferrer">
                    {academySocialPlatformLabels[link.platform]}
                  </a>
                </AnalyticsClickTracker>
              ))}
            </div>
          ) : null}
          <PublicListingWarning academy={academy} className="mt-4 max-w-3xl" />
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-stone-700">
            {academy.giAvailable ? <span className="rounded-md bg-stone-100 px-3 py-2">Gi available</span> : null}
            {academy.nogiAvailable ? <span className="rounded-md bg-stone-100 px-3 py-2">No-Gi available</span> : null}
            {academy.beginnerFriendly ? <span className="rounded-md bg-stone-100 px-3 py-2">Beginner friendly</span> : null}
            {academy.competitionFocused ? <span className="rounded-md bg-stone-100 px-3 py-2">Competition focused</span> : null}
          </div>
          <div className="mt-8">
            <h2 className="text-2xl font-black text-stone-950">Upcoming Courses</h2>
            {totalUpcomingCourses > 0 ? (
              <p className="mt-2 text-sm font-medium text-stone-600">
                {totalUpcomingCourses} upcoming courses · showing {upcomingCourseStart}-{upcomingCourseEnd}
              </p>
            ) : null}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {pagedCourses.map((course) => (
                <article key={course.occurrenceId ?? course.id} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-black uppercase tracking-wide text-teal-800">{courseTypeLabel(course.courseType)}</span>
                    {course.isRecurringOccurrence ? <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">{recurrenceLabel(course)}</span> : null}
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-stone-950">
                    <a href={course.courseType === CourseType.OPEN_MAT ? `/open-mats/${course.id}` : `/courses/${course.id}`}>{course.title}</a>
                  </h3>
                  <dl className="mt-3 grid gap-2 text-sm text-stone-700 sm:grid-cols-3">
                    <div><dt className="font-bold text-stone-950">Date</dt><dd>{formatDate(course.eventDate)}</dd></div>
                    <div><dt className="font-bold text-stone-950">Time</dt><dd>{course.startTime}-{course.endTime}</dd></div>
                    <div><dt className="font-bold text-stone-950">Price</dt><dd>{coursePriceLabel(course)}</dd></div>
                  </dl>
                </article>
              ))}
              {courses.length === 0 ? <p className="text-stone-600">No upcoming courses listed yet.</p> : null}
            </div>
            <UpcomingCoursesPagination currentPage={currentUpcomingCoursePage} slug={academy.slug} totalPages={totalUpcomingCoursePages} />
          </div>
        </div>
        <aside className="h-fit rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2">
            <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "directions", academyId: academy.id, external: true, sourcePage: "academy_profile" }}>
              <Button href={`https://www.google.com/maps/search/?api=1&query=${academy.latitude},${academy.longitude}`} target="_blank" rel="noreferrer" size="sm" variant="neutral" className="px-3 py-2 text-sm font-semibold">Open Map</Button>
            </AnalyticsClickTracker>
            {academyIsManaged ? (
              <div className="rounded-md border border-teal-100 bg-teal-50 p-3 text-sm text-teal-900">
                <p className="font-bold">{academy.verified ? "Verified and managed" : "Managed listing"}</p>
                <p className="mt-1 text-teal-800">
                  This academy listing is already managed by an approved academy contact.
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
                <p className="text-sm font-bold text-stone-950">Own or manage this academy?</p>
                <p className="mt-1 text-sm leading-6 text-stone-700">
                  Submit a claim so RollFinders can review your details before granting management access.
                </p>
                <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "claim_start", academyId: academy.id, external: false, sourcePage: "academy_profile" }}>
                  <Button href={`/academies/${academy.slug}/claim`} size="sm" variant="primary" className="mt-3 px-3 py-2 text-sm font-semibold">Claim this academy</Button>
                </AnalyticsClickTracker>
              </div>
            )}
          </div>
        </aside>
      </section>
    </PageShell>
  );
}

function UpcomingCoursesPagination({ currentPage, slug, totalPages }: { currentPage: number; slug: string; totalPages: number }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-end gap-2" aria-label="Upcoming courses pagination">
      <Button href={upcomingCoursesPageHref(slug, currentPage - 1)} disabled={currentPage <= 1} variant="secondary" size="sm">Previous</Button>
      {paginationPages(currentPage, totalPages).map((pageNumber) => (
        <Button key={pageNumber} href={upcomingCoursesPageHref(slug, pageNumber)} variant={pageNumber === currentPage ? "primary" : "secondary"} size="sm" aria-current={pageNumber === currentPage ? "page" : undefined}>
          {pageNumber}
        </Button>
      ))}
      <Button href={upcomingCoursesPageHref(slug, currentPage + 1)} disabled={currentPage >= totalPages} variant="secondary" size="sm">Next</Button>
    </nav>
  );
}
