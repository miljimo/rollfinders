import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { CourseType } from "@prisma/client";
import { Button } from "@/app/_components/Button";
import { PageShell } from "@/app/_components/Page";
import { Pagination } from "@/app/_components/Pagination";
import { analyticsCountryFromHeaders } from "@/lib/analytics/country";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";
import { courseHref, courseLocationLabel, coursePriceLabel, courseTypeLabel, getCourseDiscovery, recurrenceLabel } from "@/lib/courses";
import { formatDate, formatDistanceMiles } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Courses",
  description: "Find academy training courses, seminars, workshops, sparring, and open mats.",
};

const pageSize = 12;

type SearchParams = { analyticsIntent?: string; q?: string; courseType?: string; page?: string };

function pageFromParam(value?: string) {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function pageHref(params: SearchParams, page: number) {
  const next = new URLSearchParams();
  if (params.q) next.set("q", params.q);
  if (params.courseType) next.set("courseType", params.courseType);
  if (page > 1) next.set("page", String(page));
  const query = next.toString();
  return query ? `/courses?${query}` : "/courses";
}

export default async function CoursesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const q = params.q ?? "";
  const courseType = params.courseType ?? "";
  const courses = await getCourseDiscovery({ q, courseType });
  const totalItems = courses.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(pageFromParam(params.page), totalPages);
  const pagedCourses = courses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (params.analyticsIntent === "course_search" && (q.trim() || courseType)) {
    const country = analyticsCountryFromHeaders(await headers());
    await recordAnalyticsEventBestEffort({
      eventName: "course_search_submitted",
      source: "public_courses",
      countryCode: country.countryCode,
      countryName: country.countryName,
      metadata: {
        query: q.trim().toLowerCase(),
        courseType: courseType || null,
        resultCount: totalItems,
        page: currentPage,
        zeroResults: totalItems === 0,
      },
    });
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">Courses</h1>
        <p className="mt-2 max-w-3xl text-stone-700">Discover academy-led training opportunities across open mats, sparring, seminars, workshops, private lessons, and competition sessions.</p>
        <form action="/courses" className="mt-5 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_16rem_auto]">
          <input type="hidden" name="analyticsIntent" value="course_search" />
          <label className="grid gap-1 text-sm font-semibold text-stone-800">
            Search
            <input name="q" defaultValue={q} placeholder="Course, academy, city, postcode..." className="min-h-11 rounded-md border border-stone-300 px-3 text-sm font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-800">
            Type
            <select name="courseType" defaultValue={courseType} className="min-h-11 rounded-md border border-stone-300 px-3 text-sm font-normal">
              <option value="">All Course Types</option>
              {Object.values(CourseType).map((type) => <option key={type} value={type}>{courseTypeLabel(type)}</option>)}
            </select>
          </label>
          <div className="flex items-end"><Button type="submit" variant="primary">Search</Button></div>
        </form>
        <p className="mt-5 text-sm font-medium text-stone-600">{totalItems} upcoming courses</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pagedCourses.map((course) => (
            <article key={course.occurrenceId ?? course.id} className="group relative rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition hover:border-teal-500 hover:shadow-md">
              <Link href={courseHref(course)} className="absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2" aria-label={`View details for ${course.title}`} />
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-black uppercase tracking-wide text-teal-800">{courseTypeLabel(course.courseType)}</span>
                {course.isRecurringOccurrence ? <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">{recurrenceLabel(course)}</span> : null}
              </div>
              <h2 className="mt-2 text-lg font-bold text-stone-950 transition group-hover:text-teal-800">{course.title}</h2>
              <p className="mt-1 text-sm font-medium text-stone-700">{course.academy.name}</p>
              {course.distanceMiles != null ? <p className="mt-1 text-sm font-semibold text-teal-800">{formatDistanceMiles(course.distanceMiles)}</p> : null}
              <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-stone-700 sm:grid-cols-2">
                <div><dt className="font-bold text-stone-950">Date</dt><dd>{formatDate(course.eventDate)}</dd></div>
                <div><dt className="font-bold text-stone-950">Time</dt><dd>{course.startTime}-{course.endTime}</dd></div>
                <div><dt className="font-bold text-stone-950">Price</dt><dd>{coursePriceLabel(course)}</dd></div>
                <div><dt className="font-bold text-stone-950">Location</dt><dd>{courseLocationLabel(course)}</dd></div>
              </dl>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-stone-700">{course.description}</p>
              <div className="relative z-20 mt-4">
                <Button href={courseHref(course)} size="sm" variant="neutral" className="px-3 py-2 text-sm font-semibold">View Details</Button>
              </div>
            </article>
          ))}
          {pagedCourses.length === 0 ? <p className="text-stone-600">No courses match those filters yet.</p> : null}
        </div>
        <Pagination ariaLabel="Courses pagination" currentPage={currentPage} totalPages={totalPages} getPageHref={(page) => pageHref(params, page)} />
      </section>
    </PageShell>
  );
}
