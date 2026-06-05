import Link from "next/link";
import type { Metadata } from "next";
import { ClaimStatus } from "@prisma/client";
import { ChevronLeft, ChevronRight, Filter, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/PageShell";
import { getCurrentUser, isPlatformAdminRole } from "@/lib/admin";
import { formatDate } from "@/lib/utils";
import { fetchAcademyClaims, type AcademyClaimListItem } from "./api";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Academy Claims",
  description: "Review pending academy ownership claims.",
};

const supportedPageSizes = [20, 50, 100];

type ClaimSearchParams = Record<string, string | string[] | undefined>;

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

function selectedStatus(value: string | undefined) {
  if (!value || value === "all") return "all";
  return Object.values(ClaimStatus).includes(value as ClaimStatus) ? value : "all";
}

function compactParams(params: ClaimSearchParams, overrides: Record<string, string | number | undefined>) {
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
  return query ? `/admin/academy-claims?${query}` : "/admin/academy-claims";
}

function paginationPages(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);
}

function apiParams({ page, pageSize, search, status }: { page: number; pageSize: number; search: string; status: string }) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (search) params.set("search", search);
  if (status !== "all") params.set("status", status);
  return params;
}

export default async function AcademyClaimsPage({
  searchParams,
}: {
  searchParams: Promise<ClaimSearchParams>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (!isPlatformAdminRole(currentUser.role)) redirect("/");

  const params = await searchParams;
  const page = parsePositiveInt(firstParam(params.page), 1);
  const pageSize = selectedPageSize(firstParam(params.pageSize));
  const search = (firstParam(params.search) ?? "").trim();
  const status = selectedStatus(firstParam(params.status));
  const result = await fetchAcademyClaims(apiParams({ page, pageSize, search, status }));

  const allHref = compactParams(params, { status: undefined, page: 1 });
  const pendingHref = compactParams(params, { status: ClaimStatus.PENDING, page: 1 });
  const approvedHref = compactParams(params, { status: ClaimStatus.APPROVED, page: 1 });
  const rejectedHref = compactParams(params, { status: ClaimStatus.REJECTED, page: 1 });

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-teal-800">Platform Admin</p>
            <h1 className="mt-2 text-3xl font-black text-stone-950">Academy Claims</h1>
            <p className="mt-2 max-w-3xl text-stone-700">Review academy ownership requests and grant access only after operational authority evidence checks out.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button href="/admin" variant="secondary">Dashboard</Button>
            <Button href="/admin/academy-claims" variant="secondary">Refresh</Button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 p-5 sm:p-6">
            <form action="/admin/academy-claims" className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <label className="relative block">
                <span className="sr-only">Search academy claims</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={22} aria-hidden="true" />
                <input name="search" placeholder="Search by academy, requester, or email..." defaultValue={search} className="min-h-12 w-full rounded-md border border-slate-200 bg-white px-12 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100" />
              </label>
              <details className="group relative">
                <summary className="inline-flex min-h-12 cursor-pointer list-none items-center justify-center gap-3 rounded-md border border-slate-200 bg-white px-6 text-base font-bold text-teal-700 shadow-sm transition hover:border-teal-600 hover:bg-teal-50 [&::-webkit-details-marker]:hidden">
                  <Filter size={22} aria-hidden="true" />
                  Filters
                </summary>
                <div className="absolute right-0 z-30 mt-2 grid w-[min(24rem,calc(100vw-2rem))] gap-4 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-xl sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">
                    Status
                    <select name="status" defaultValue={status} className="min-h-11 rounded-md border border-slate-200 px-3 font-normal text-slate-800">
                      <option value="all">All</option>
                      <option value={ClaimStatus.PENDING}>Pending</option>
                      <option value={ClaimStatus.APPROVED}>Approved</option>
                      <option value={ClaimStatus.REJECTED}>Rejected</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">
                    Rows
                    <select name="pageSize" defaultValue={pageSize} className="min-h-11 rounded-md border border-slate-200 px-3 font-normal text-slate-800">
                      {supportedPageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </label>
                  <div className="flex items-end gap-2 sm:col-span-2">
                    <Button type="submit" variant="primary">Apply</Button>
                    <Button href="/admin/academy-claims" variant="secondary" className="border-slate-200 text-slate-700">Reset</Button>
                  </div>
                </div>
              </details>
            </form>

            <div className="mt-5 flex flex-wrap gap-3">
              <FilterPill href={allHref} active={status === "all"} icon={<ShieldCheck size={20} aria-hidden="true" />}>All Claims</FilterPill>
              <FilterPill href={pendingHref} active={status === ClaimStatus.PENDING} dotClassName="bg-amber-500">Pending</FilterPill>
              <FilterPill href={approvedHref} active={status === ClaimStatus.APPROVED} dotClassName="bg-emerald-500">Approved</FilterPill>
              <FilterPill href={rejectedHref} active={status === ClaimStatus.REJECTED} dotClassName="bg-red-500">Rejected</FilterPill>
            </div>
          </div>

          {!result.ok ? (
            <ErrorState status={result.status} message={result.message} />
          ) : (
            <ClaimsTable claims={result.data.items} page={result.data.page} pageSize={result.data.pageSize} params={params} totalItems={result.data.totalItems} totalPages={result.data.totalPages} />
          )}
        </div>
      </section>
    </PageShell>
  );
}

function ClaimsTable({ claims, page, pageSize, params, totalItems, totalPages }: { claims: AcademyClaimListItem[]; page: number; pageSize: number; params: ClaimSearchParams; totalItems: number; totalPages: number }) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-5 py-4">Academy</th>
              <th className="px-5 py-4">Requester</th>
              <th className="px-5 py-4">Role</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Submitted</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.id} className="border-t border-stone-100">
                <td className="px-5 py-4">
                  <p className="font-bold text-slate-950">{claim.academy.name}</p>
                  {claim.academy.city || claim.academy.postcode ? <p className="mt-1 text-slate-500">{[claim.academy.city, claim.academy.postcode].filter(Boolean).join(", ")}</p> : null}
                </td>
                <td className="px-5 py-4">
                  <p className="font-bold text-slate-950">{claim.requester.name}</p>
                  <p className="break-all text-slate-500">{claim.requester.email}</p>
                </td>
                <td className="px-5 py-4 text-slate-700">{claimRoleLabel(claim.requester.role)}</td>
                <td className="px-5 py-4"><StatusBadge status={claim.status} /></td>
                <td className="px-5 py-4 text-slate-600">{formatDate(new Date(claim.createdAt))}</td>
                <td className="px-5 py-4 text-right">
                  <Button href={`/admin/academy-claims/${claim.id}`} size="sm" variant={claim.status === ClaimStatus.PENDING ? "primary" : "secondary"}>Review</Button>
                </td>
              </tr>
            ))}
            {!claims.length ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-stone-600">No academy claims match these filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 border-t border-stone-100 px-5 py-5 text-sm lg:flex-row lg:items-center lg:justify-between">
        <p className="text-base text-slate-700">Showing {start} to {end} of {totalItems} claims</p>
        <div className="flex flex-wrap items-center gap-3">
          <PageLink disabled={page <= 1} href={compactParams(params, { page: page - 1 })} iconOnly>
            <ChevronLeft size={20} aria-hidden="true" />
            <span className="sr-only">Previous</span>
          </PageLink>
          {paginationPages(page, totalPages).map((pageNumber) => (
            <PageLink key={pageNumber} active={pageNumber === page} href={compactParams(params, { page: pageNumber })}>{pageNumber}</PageLink>
          ))}
          <PageLink disabled={page >= totalPages} href={compactParams(params, { page: page + 1 })} iconOnly>
            <ChevronRight size={20} aria-hidden="true" />
            <span className="sr-only">Next</span>
          </PageLink>
        </div>
      </div>
    </>
  );
}

function ErrorState({ status, message }: { status: number; message: string }) {
  const title = status === 403 ? "Access restricted" : "Claims unavailable";
  return (
    <div className="border-t border-stone-100 px-5 py-12 text-center">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-slate-600">{message}</p>
      <Button href="/admin" variant="secondary" className="mt-5">Back to Dashboard</Button>
    </div>
  );
}

function FilterPill({ href, active, icon, dotClassName, children }: { href: string; active?: boolean; icon?: React.ReactNode; dotClassName?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`inline-flex min-h-11 items-center gap-3 rounded-md border px-4 text-base font-bold transition ${active ? "border-teal-700 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50"}`}>
      {icon}
      {dotClassName ? <span className={`size-2.5 rounded-full ${dotClassName}`} aria-hidden="true" /> : null}
      {children}
    </Link>
  );
}

function StatusBadge({ status }: { status: ClaimStatus }) {
  const className = {
    [ClaimStatus.PENDING]: "bg-amber-50 text-amber-800 ring-amber-100",
    [ClaimStatus.APPROVED]: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    [ClaimStatus.REJECTED]: "bg-red-50 text-red-700 ring-red-100",
  }[status];

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ring-1 ${className}`}>
      <span className={`size-2.5 rounded-full ${statusDot(status)}`} aria-hidden="true" />
      {claimStatusLabel(status)}
    </span>
  );
}

function PageLink({ href, disabled, active, iconOnly, children }: { href: string; disabled?: boolean; active?: boolean; iconOnly?: boolean; children: React.ReactNode }) {
  if (disabled) {
    return <span className={`inline-flex min-h-11 items-center justify-center rounded-md border border-stone-200 text-sm font-bold text-stone-400 ${iconOnly ? "w-11 px-0" : "px-4"}`}>{children}</span>;
  }
  return (
    <Button href={href} size={iconOnly ? "icon" : "md"} variant={active ? "primary" : "secondary"} className={`${iconOnly ? "w-11 px-0" : "px-4"} ${active ? "shadow-sm" : "hover:bg-stone-50"}`}>
      {children}
    </Button>
  );
}

function claimRoleLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function claimStatusLabel(status: ClaimStatus) {
  return claimRoleLabel(status);
}

function statusDot(status: ClaimStatus) {
  if (status === ClaimStatus.APPROVED) return "bg-emerald-500";
  if (status === ClaimStatus.REJECTED) return "bg-red-500";
  return "bg-amber-500";
}
