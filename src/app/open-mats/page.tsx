import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/PageShell";
import { OpenMatLocationFilterForm } from "@/components/OpenMatLocationFilterForm";
import { EventCard } from "@/components/EventCard";
import { getOpenMatRadar } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Open Mats - Find training today",
  description: "Find today's, tomorrow's, and weekend BJJ open mats in London with gi type, drop-in cost, location, and directions.",
};

const pageSize = 12;

type OpenMatSearchParams = { q?: string; when?: string; gi?: string; lat?: string; lng?: string; page?: string };

function pageFromParam(value?: string) {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function pageHref(params: OpenMatSearchParams, page: number) {
  const next = new URLSearchParams();
  if (params.q) next.set("q", params.q);
  if (params.when) next.set("when", params.when);
  if (params.gi) next.set("gi", params.gi);
  if (params.lat) next.set("lat", params.lat);
  if (params.lng) next.set("lng", params.lng);
  if (page > 1) next.set("page", String(page));
  const query = next.toString();
  return query ? `/open-mats?${query}` : "/open-mats";
}

function paginationPages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default async function OpenMatsPage({ searchParams }: { searchParams: Promise<OpenMatSearchParams> }) {
  const params = await searchParams;
  const { q = "", when = "", gi = "", lat, lng } = params;
  const location = lat && lng ? { latitude: Number(lat), longitude: Number(lng) } : {};
  const locationQuery = lat && lng ? `&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}` : "";
  const [events, today, tomorrow, weekend] = await Promise.all([
    getOpenMatRadar({ q, when, gi, ...location }),
    getOpenMatRadar({ when: "today" }),
    getOpenMatRadar({ when: "tomorrow" }),
    getOpenMatRadar({ when: "weekend" }),
  ]);
  const totalItems = events.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(pageFromParam(params.page), totalPages);
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  const pagedEvents = events.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">Open Mats</h1>
        <p className="mt-2 max-w-3xl text-stone-700">Open Mat Radar puts visitor-friendly BJJ sessions first, with today, tomorrow, and weekend training filtered by location, gi type, and drop-in cost.</p>
        <div className="mt-5">
          <OpenMatLocationFilterForm q={q} when={when} gi={gi} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <RadarCount label="Today" count={today.length} href={`/open-mats?when=today${locationQuery}`} />
          <RadarCount label="Tomorrow" count={tomorrow.length} href={`/open-mats?when=tomorrow${locationQuery}`} />
          <RadarCount label="This Weekend" count={weekend.length} href={`/open-mats?when=weekend${locationQuery}`} />
        </div>
        <p className="mt-5 text-sm font-medium text-stone-600">
          {totalItems} upcoming sessions · showing {start}-{end} · nearest available distances shown · directions ready
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pagedEvents.map((event) => <EventCard key={event.occurrenceId ?? event.id} event={event} />)}
          {events.length === 0 ? <p className="text-stone-600">No open mats match those filters yet.</p> : null}
        </div>
        <PublicPagination currentPage={currentPage} params={params} totalPages={totalPages} />
      </section>
    </PageShell>
  );
}

function RadarCount({ label, count, href }: { label: string; count: number; href: string }) {
  return (
    <a href={href} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-stone-600">{label}</p>
      <p className="mt-1 text-2xl font-black text-stone-950">{count}</p>
    </a>
  );
}

function PublicPagination({ currentPage, params, totalPages }: { currentPage: number; params: OpenMatSearchParams; totalPages: number }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-end gap-2" aria-label="Open mats pagination">
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
