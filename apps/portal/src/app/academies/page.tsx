import type { Metadata } from "next";
import { headers } from "next/headers";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/Page";
import { LocationSearchForm } from "@/components/LocationSearchForm";
import { AcademyCard } from "@/components/AcademyCard";
import { analyticsCountryFromHeaders } from "@/lib/analytics/country";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";
import { searchAcademies } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Academies - Browse London BJJ gyms",
  description: "Search London BJJ academies by borough, postcode, distance, gi, no-gi, drop-in cost, beginner fit, and competition focus.",
};

const pageSize = 12;

type AcademySearchParams = { analyticsIntent?: string; q?: string; lat?: string; lng?: string; page?: string };

function pageFromParam(value?: string) {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function pageHref(params: AcademySearchParams, page: number) {
  const next = new URLSearchParams();
  if (params.q) next.set("q", params.q);
  if (params.lat) next.set("lat", params.lat);
  if (params.lng) next.set("lng", params.lng);
  if (page > 1) next.set("page", String(page));
  const query = next.toString();
  return query ? `/academies?${query}` : "/academies";
}

function paginationPages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default async function AcademiesPage({ searchParams }: { searchParams: Promise<AcademySearchParams> }) {
  const params = await searchParams;
  const { q = "", lat, lng } = params;
  const location = lat && lng ? { latitude: Number(lat), longitude: Number(lng) } : undefined;
  const academies = await searchAcademies(q, location);
  const totalItems = academies.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(pageFromParam(params.page), totalPages);
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  const pagedAcademies = academies.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (params.analyticsIntent === "academy_search" && (q.trim() || lat || lng)) {
    const country = analyticsCountryFromHeaders(await headers());
    await recordAnalyticsEventBestEffort({
      eventName: "academy_search_submitted",
      source: "public_academies",
      countryCode: country.countryCode,
      countryName: country.countryName,
      metadata: {
        query: q.trim().toLowerCase(),
        hasCoordinates: Boolean(lat && lng),
        resultCount: totalItems,
        page: currentPage,
        zeroResults: totalItems === 0,
      },
    });
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">Academies</h1>
        <p className="mt-2 max-w-3xl text-stone-700">Find nearby Brazilian Jiu-Jitsu academies with the details generic directories miss: gi and no-gi availability, drop-in cost, beginner fit, competition focus, and open mat activity.</p>
        <div className="mt-5">
          <LocationSearchForm action="/academies" analyticsIntent="academy_search" query={q} placeholder="e.g. Hackney, SW9, no-gi, competition" />
        </div>
        <p className="mt-5 text-sm font-medium text-stone-600">
          {totalItems} results · showing {start}-{end} · nearest first
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pagedAcademies.map((academy) => <AcademyCard key={academy.id} academy={academy} />)}
        </div>
        <PublicPagination currentPage={currentPage} params={params} totalPages={totalPages} />
      </section>
    </PageShell>
  );
}

function PublicPagination({ currentPage, params, totalPages }: { currentPage: number; params: AcademySearchParams; totalPages: number }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-end gap-2" aria-label="Academies pagination">
      <Button href={pageHref(params, currentPage - 1)} disabled={currentPage <= 1} variant="secondary" size="sm">Previous</Button>
      {paginationPages(currentPage, totalPages).map((pageNumber) => (
        <Button key={pageNumber} href={pageHref(params, pageNumber)} variant={pageNumber === currentPage ? "primary" : "secondary"} size="sm" aria-current={pageNumber === currentPage ? "page" : undefined}>
          {pageNumber}
        </Button>
      ))}
      <Button href={pageHref(params, currentPage + 1)} disabled={currentPage >= totalPages} variant="secondary" size="sm">Next</Button>
    </nav>
  );
}
