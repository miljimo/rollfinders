import Link from "next/link";
import type { Metadata } from "next";
import { AcademyVerificationStatus, type Prisma } from "@prisma/client";
import { PageShell } from "@/components/shell";
import { getCurrentUser, isSuperAdminRole, requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Academy Management",
  description: "Search, filter, paginate, and manage RollFinders academy records.",
};

const supportedPageSizes = [20, 50, 100];

type AcademySearchParams = Record<string, string | string[] | undefined>;

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

function selectedVerificationStatus(value: string | undefined) {
  if (!value || value === "all") return "all";
  return Object.values(AcademyVerificationStatus).includes(value as AcademyVerificationStatus) ? value : "all";
}

function compactParams(params: AcademySearchParams, overrides: Record<string, string | number | undefined>) {
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
  return query ? `/admin/academies?${query}` : "/admin/academies";
}

function paginationPages(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);
}

export default async function AcademyManagementPage({
  searchParams,
}: {
  searchParams: Promise<AcademySearchParams>;
}) {
  await requireAdminPage();
  const currentUser = await getCurrentUser();
  const superAdmin = isSuperAdminRole(currentUser?.role);
  const params = await searchParams;

  const page = parsePositiveInt(firstParam(params.page), 1);
  const pageSize = selectedPageSize(firstParam(params.pageSize));
  const search = (firstParam(params.search) ?? "").trim();
  const verificationStatus = selectedVerificationStatus(firstParam(params.verificationStatus));
  const featured = firstParam(params.featured) ?? "all";
  const city = (firstParam(params.city) ?? "").trim();
  const postcode = (firstParam(params.postcode) ?? "").trim();

  const where: Prisma.AcademyWhereInput = {
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    ...(verificationStatus !== "all" ? { verificationStatus: verificationStatus as AcademyVerificationStatus } : {}),
    ...(featured === "featured" ? { featured: true } : {}),
    ...(featured === "not-featured" ? { featured: false } : {}),
    ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
    ...(postcode ? { postcode: { contains: postcode, mode: "insensitive" } } : {}),
  };

  const [totalItems, totalAcademies, metrics] = await Promise.all([
    prisma.academy.count({ where }),
    prisma.academy.count(),
    prisma.academy.groupBy({
      by: ["verificationStatus", "featured"],
      _count: { _all: true },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const academies = await prisma.academy.findMany({
    where,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });

  const verifiedCount = metrics.filter((metric) => metric.verificationStatus === AcademyVerificationStatus.VERIFIED).reduce((sum, metric) => sum + metric._count._all, 0);
  const pendingCount = metrics.filter((metric) => metric.verificationStatus === AcademyVerificationStatus.PENDING).reduce((sum, metric) => sum + metric._count._all, 0);
  const featuredCount = metrics.filter((metric) => metric.featured).reduce((sum, metric) => sum + metric._count._all, 0);
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-teal-800">Academy Management</p>
            <h1 className="mt-2 text-3xl font-black text-stone-950">Academies</h1>
            <p className="mt-2 text-stone-700">Search, filter, and manage academy records without loading the full directory.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="rounded-md border border-stone-300 px-4 py-3 text-sm font-bold text-stone-800">Dashboard</Link>
            {superAdmin ? <Link href="/admin/academies/new" className="rounded-md bg-teal-700 px-4 py-3 text-sm font-bold text-white">New Academy</Link> : null}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total Academies" value={totalAcademies} />
          <Metric label="Verified Academies" value={verifiedCount} />
          <Metric label="Pending Verification" value={pendingCount} />
          <Metric label="Featured Academies" value={featuredCount} />
        </div>

        <form action="/admin/academies" className="mt-6 grid min-w-0 gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-12">
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 sm:col-span-2 lg:col-span-4">
            Search
            <input name="search" placeholder="Search academy by name..." defaultValue={search} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal" />
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 lg:col-span-2">
            Verification
            <select name="verificationStatus" defaultValue={verificationStatus} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal">
              <option value="all">All</option>
              <option value={AcademyVerificationStatus.VERIFIED}>Verified</option>
              <option value={AcademyVerificationStatus.PENDING}>Pending</option>
              <option value={AcademyVerificationStatus.REJECTED}>Rejected</option>
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 lg:col-span-2">
            Featured
            <select name="featured" defaultValue={featured} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal">
              <option value="all">All</option>
              <option value="featured">Featured</option>
              <option value="not-featured">Not Featured</option>
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 lg:col-span-2">
            City
            <input name="city" defaultValue={city} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal" />
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 lg:col-span-2">
            Postcode
            <input name="postcode" defaultValue={postcode} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal" />
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 lg:col-span-2">
            Page size
            <select name="pageSize" defaultValue={pageSize} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal">
              {supportedPageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <div className="flex min-w-0 items-end gap-2 sm:col-span-2 lg:col-span-10">
            <button className="min-h-11 rounded-md bg-stone-950 px-4 text-sm font-bold text-white">Apply Filters</button>
            <Link href="/admin/academies" className="inline-flex min-h-11 items-center rounded-md border border-stone-300 px-4 text-sm font-bold text-stone-800">Reset</Link>
          </div>
        </form>

        <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-stone-50 text-xs font-bold uppercase text-stone-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Verification Status</th>
                  <th className="px-4 py-3">Featured Status</th>
                  <th className="px-4 py-3">Created Date</th>
                  <th className="px-4 py-3">Last Updated</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {academies.map((academy) => (
                  <tr key={academy.id} className="border-t border-stone-100">
                    <td className="px-4 py-3 font-semibold text-stone-950">{academy.name}</td>
                    <td className="px-4 py-3 text-stone-700">{academy.city}, {academy.postcode}</td>
                    <td className="px-4 py-3"><Badge>{academy.verificationStatus}</Badge></td>
                    <td className="px-4 py-3"><Badge>{academy.featured ? "Featured" : "Not Featured"}</Badge></td>
                    <td className="px-4 py-3 text-stone-600">{formatDate(academy.createdAt)}</td>
                    <td className="px-4 py-3 text-stone-600">{formatDate(academy.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/academies/${academy.slug}`} className="rounded-md border border-stone-300 px-2 py-1 text-xs font-bold text-stone-800">View</Link>
                        <Link href={`/admin/academies/${academy.id}`} className="rounded-md border border-stone-300 px-2 py-1 text-xs font-bold text-stone-800">Edit</Link>
                        {superAdmin ? (
                          <form action={`/api/admin/academies/${academy.id}`} method="post">
                            <input type="hidden" name="_method" value="DELETE" />
                            <button className="rounded-md border border-red-300 px-2 py-1 text-xs font-bold text-red-700">Delete</button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!academies.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-stone-600">No academies match these filters.</td>
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
