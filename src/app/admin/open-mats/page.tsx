import Link from "next/link";
import type { Metadata } from "next";
import { GiType, type Prisma } from "@prisma/client";
import { PageShell } from "@/components/PageShell";
import { getCurrentUser, isPlatformAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Open Mat Management",
  description: "Search, filter, paginate, and manage RollFinders open mat events.",
};

const supportedPageSizes = [20, 50, 100];

type OpenMatSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function selectedPageSize(value: string | undefined) {
  const parsed = parsePositiveInt(value, 20);
  return supportedPageSizes.includes(parsed) ? parsed : 20;
}

function selectedGiType(value: string | undefined) {
  if (!value || value === "all") return "all";
  return Object.values(GiType).includes(value as GiType) ? value : "all";
}

function selectedStatus(value: string | undefined) {
  return value === "active" || value === "inactive" ? value : "all";
}

function dateStart(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateEnd(value: string) {
  return new Date(`${value}T23:59:59.999Z`);
}

function compactParams(params: OpenMatSearchParams, overrides: Record<string, string | number | undefined>) {
  const next = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => item && next.append(key, item));
      return;
    }
    next.set(key, value);
  });
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === "all" || value === 1) {
      next.delete(key);
      return;
    }
    next.set(key, String(value));
  });
  const query = next.toString();
  return query ? `/admin/open-mats?${query}` : "/admin/open-mats";
}

function paginationPages(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);
}

export default async function OpenMatManagementPage({
  searchParams,
}: {
  searchParams: Promise<OpenMatSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <PageShell>
        <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <h1 className="text-3xl font-black text-stone-950">Open Mats</h1>
          <p className="mt-2 text-stone-700">Please log in to manage open mats.</p>
          <Link href="/login" className="mt-4 inline-flex rounded-md bg-stone-950 px-4 py-3 text-sm font-bold text-white">Log in</Link>
        </section>
      </PageShell>
    );
  }
  const params = await searchParams;
  const platformAdmin = isPlatformAdminRole(user.role);
  const academyMemberships = platformAdmin
    ? []
    : await prisma.academyMember.findMany({
        where: { userId: user.id },
        select: { academyId: true },
      });
  const academyIds = academyMemberships.map((membership) => membership.academyId);
  const accessWhere: Prisma.EventWhereInput = !platformAdmin
    ? {
        OR: [
          ...(academyIds.length ? [{ academyId: { in: academyIds } }] : []),
          { createdById: user.id },
        ],
      }
    : {};

  const page = parsePositiveInt(firstParam(params.page), 1);
  const pageSize = selectedPageSize(firstParam(params.pageSize));
  const search = (firstParam(params.search) ?? "").trim();
  const academy = (firstParam(params.academy) ?? "").trim();
  const giType = selectedGiType(firstParam(params.giType));
  const status = selectedStatus(firstParam(params.status));
  const dateFrom = (firstParam(params.dateFrom) ?? "").trim();
  const dateTo = (firstParam(params.dateTo) ?? "").trim();

  const where: Prisma.EventWhereInput = {
    ...accessWhere,
    ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    ...(academy ? { academy: { name: { contains: academy, mode: "insensitive" } } } : {}),
    ...(giType !== "all" ? { giType: giType as GiType } : {}),
    ...(status === "active" ? { active: true } : {}),
    ...(status === "inactive" ? { active: false } : {}),
    ...((dateFrom || dateTo)
      ? {
          eventDate: {
            ...(dateFrom ? { gte: dateStart(dateFrom) } : {}),
            ...(dateTo ? { lte: dateEnd(dateTo) } : {}),
          },
        }
      : {}),
  };

  const now = new Date();
  const [totalItems, totalOpenMats, activeOpenMats, upcomingOpenMats, inactiveOpenMats] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.count({ where: accessWhere }),
    prisma.event.count({ where: { ...accessWhere, active: true } }),
    prisma.event.count({ where: { ...accessWhere, active: true, eventDate: { gte: now } } }),
    prisma.event.count({ where: { ...accessWhere, active: false } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const events = await prisma.event.findMany({
    where,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    include: { academy: true },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
  });

  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-teal-800">Open Mat Management</p>
            <h1 className="mt-2 text-3xl font-black text-stone-950">Open Mats</h1>
            <p className="mt-2 text-stone-700">Search, filter, and manage open mat events from one operational view.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="rounded-md border border-stone-300 px-4 py-3 text-sm font-bold text-stone-800">Dashboard</Link>
            <Link href="/admin/open-mats/new" className="rounded-md bg-teal-700 px-4 py-3 text-sm font-bold text-white">New Open Mat</Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total Open Mats" value={totalOpenMats} />
          <Metric label="Active Open Mats" value={activeOpenMats} />
          <Metric label="Upcoming Active" value={upcomingOpenMats} />
          <Metric label="Inactive Open Mats" value={inactiveOpenMats} />
        </div>

        <form action="/admin/open-mats" className="mt-6 grid min-w-0 gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-12">
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 sm:col-span-2 lg:col-span-3">
            Search
            <input name="search" placeholder="Search open mat by title..." defaultValue={search} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal" />
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 sm:col-span-2 lg:col-span-3">
            Academy
            <input name="academy" placeholder="Search academy..." defaultValue={academy} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal" />
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 lg:col-span-2">
            Status
            <select name="status" defaultValue={status} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 lg:col-span-2">
            Gi Type
            <select name="giType" defaultValue={giType} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal">
              <option value="all">All</option>
              <option value={GiType.BOTH}>Both</option>
              <option value={GiType.GI}>Gi</option>
              <option value={GiType.NO_GI}>No-Gi</option>
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 lg:col-span-2">
            Page size
            <select name="pageSize" defaultValue={pageSize} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal">
              {supportedPageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 lg:col-span-2">
            Date from
            <input name="dateFrom" type="date" defaultValue={dateFrom} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal" />
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 lg:col-span-2">
            Date to
            <input name="dateTo" type="date" defaultValue={dateTo} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal" />
          </label>
          <div className="flex min-w-0 items-end gap-2 sm:col-span-2 lg:col-span-8">
            <button className="min-h-11 rounded-md bg-stone-950 px-4 text-sm font-bold text-white">Apply Filters</button>
            <Link href="/admin/open-mats" className="inline-flex min-h-11 items-center rounded-md border border-stone-300 px-4 text-sm font-bold text-stone-800">Reset</Link>
          </div>
        </form>

        <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
              <thead className="bg-stone-50 text-xs font-bold uppercase text-stone-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Academy</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Gi Type</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-stone-100">
                    <td className="px-4 py-3 font-semibold text-stone-950">{event.title}</td>
                    <td className="px-4 py-3 text-stone-700">{event.academy.name}</td>
                    <td className="px-4 py-3 text-stone-600">{formatDate(event.eventDate)}</td>
                    <td className="px-4 py-3 text-stone-600">{event.startTime}-{event.endTime}</td>
                    <td className="px-4 py-3"><Badge>{event.giType.replace("_", "-")}</Badge></td>
                    <td className="px-4 py-3 text-stone-600">£{event.price.toString()}</td>
                    <td className="px-4 py-3 text-stone-600">{event.capacity ?? "Unlimited"}</td>
                    <td className="px-4 py-3"><Badge>{event.active ? "Active" : "Inactive"}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/open-mats/${event.id}`} className="rounded-md border border-stone-300 px-2 py-1 text-xs font-bold text-stone-800">View</Link>
                        <Link href={`/admin/open-mats/${event.id}`} className="rounded-md border border-stone-300 px-2 py-1 text-xs font-bold text-stone-800">Edit</Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {!events.length ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-stone-600">No open mats match these filters.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-stone-100 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-stone-600">Showing {start}-{end} of {totalItems}</p>
            <div className="flex flex-wrap gap-2">
              <PageLink disabled={currentPage <= 1} href={compactParams(params, { page: currentPage - 1 })}>Previous</PageLink>
              {paginationPages(currentPage, totalPages).map((pageNumber) => (
                <PageLink key={pageNumber} active={pageNumber === currentPage} href={compactParams(params, { page: pageNumber })}>{pageNumber}</PageLink>
              ))}
              <PageLink disabled={currentPage >= totalPages} href={compactParams(params, { page: currentPage + 1 })}>Next</PageLink>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-stone-950">{value.toLocaleString()}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-md border border-stone-200 px-2 py-1 text-xs font-bold text-stone-700">{children}</span>;
}

function PageLink({ href, disabled, active, children }: { href: string; disabled?: boolean; active?: boolean; children: React.ReactNode }) {
  if (disabled) {
    return <span className="inline-flex min-h-9 items-center rounded-md border border-stone-200 px-3 text-xs font-bold text-stone-400">{children}</span>;
  }
  return (
    <Link href={href} className={`inline-flex min-h-9 items-center rounded-md border px-3 text-xs font-bold ${active ? "border-teal-700 bg-teal-700 text-white" : "border-stone-300 text-stone-800"}`}>
      {children}
    </Link>
  );
}
