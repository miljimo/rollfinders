import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageShell } from "@/components/Page";
import { Pagination } from "@/components/pagination";
import { analyticsCountryFromHeaders } from "@/lib/analytics/country";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";
import { getFeaturedData, getOpenMatRadar } from "@/lib/data";
import { HomeHero } from "./home/HomeHero";
import { HomeOpenMatsSection } from "./home/HomeOpenMatsSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Find BJJ training today",
  description: "Find today's BJJ open mats, nearby academies, gi and no-gi sessions, drop-in costs, and directions near you.",
};

const pageSize = 6;

type HomeSearchParams = { analyticsIntent?: string; courseType?: string; gi?: string; lat?: string; lng?: string; page?: string; q?: string; when?: string };

function pageFromParam(value?: string) {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function pageHref(params: HomeSearchParams, page: number) {
  const next = new URLSearchParams();
  if (params.q) next.set("q", params.q);
  if (params.when) next.set("when", params.when);
  if (params.gi) next.set("gi", params.gi);
  if (params.courseType && params.courseType !== "OPEN_MAT") next.set("courseType", params.courseType);
  if (params.lat) next.set("lat", params.lat);
  if (params.lng) next.set("lng", params.lng);
  if (page > 1) next.set("page", String(page));
  const query = next.toString();
  return query ? `/?${query}` : "/";
}

export default async function Home({ searchParams }: { searchParams: Promise<HomeSearchParams> }) {
  const params = await searchParams;
  const { lat, lng, q = "", when = "", gi = "" } = params;
  const courseType = params.courseType || "OPEN_MAT";
  const location = lat && lng ? { latitude: Number(lat), longitude: Number(lng) } : undefined;
  const [{ upcomingNearYou }, events] = await Promise.all([
    getFeaturedData(location, q),
    getOpenMatRadar({ q, when, gi, courseType, latitude: location?.latitude, longitude: location?.longitude }),
  ]);
  const totalItems = events.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(pageFromParam(params.page), totalPages);
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  const pagedEvents = events.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (params.analyticsIntent === "open_mat_search" && (q.trim() || when || gi || courseType !== "OPEN_MAT" || lat || lng)) {
    const country = analyticsCountryFromHeaders(await headers());
    await recordAnalyticsEventBestEffort({
      eventName: "open_mat_search_submitted",
      source: "public_open_mats",
      countryCode: country.countryCode,
      countryName: country.countryName,
      metadata: {
        query: q.trim().toLowerCase(),
        when: when || null,
        gi: gi || null,
        courseType,
        hasCoordinates: Boolean(lat && lng),
        resultCount: totalItems,
        page: currentPage,
        zeroResults: totalItems === 0,
      },
    });
  }

  return (
    <PageShell>
      <HomeHero courseType={courseType} gi={gi} query={q} upcomingNearYou={upcomingNearYou} when={when} />
      <HomeOpenMatsSection end={end} events={pagedEvents} query={q} start={start} totalItems={totalItems} />
      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <Pagination
          ariaLabel="Training results pagination"
          currentPage={currentPage}
          totalPages={totalPages}
          getPageHref={(page) => pageHref(params, page)}
          showSummary
          summaryLabel={(page, pageCount) => `${page} of ${pageCount} pages`}
        />
      </div>
    </PageShell>
  );
}
