import { Building2, Search } from "lucide-react";
import { AcademyVerificationStatus } from "@prisma/client";
import { Button } from "@/components/Button";
import { StatsPanel, type StatsPanelItem } from "@/components/StatsPanel";
import { Table, TableStatusBadge, type TableColumn } from "@/components/Table";
import { formatDate } from "@/lib/utils";

const platformAdminAcademyPageSize = 5;

type AdminSearchParams = Record<string, string | string[] | undefined>;

export type PlatformAdminAcademyRow = {
  id: string;
  name: string;
  slug: string;
  borough: string | null;
  city: string;
  postcode: string;
  verificationStatus: AcademyVerificationStatus;
  createdAt: Date;
  createdById: string | null;
};

type PlatformAdminAcademyTableRow = Record<string, unknown> & {
  id: string;
  academy: string;
  creator: string;
  creatorEmail: string;
  location: string;
  reviewLabel: string;
  reviewHref: string;
  verificationStatus: AcademyVerificationStatus;
  createdAt: Date;
  slug: string;
};

function platformAdminAcademiesHref(searchParams: AdminSearchParams, overrides: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => item && params.append(key, item));
      return;
    }
    params.set(key, value);
  });
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === 1) {
      params.delete(key);
      return;
    }
    params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `/dashboard/academy-review?${query}` : "/dashboard/academy-review";
}

const platformAdminAcademyColumns: TableColumn<PlatformAdminAcademyTableRow>[] = [
  {
    key: "academy",
    title: "Academy",
    render: (_value, row) => (
      <div>
        <p className="font-bold text-slate-950">{row.academy}</p>
        <p className="text-xs font-semibold text-slate-500">{row.location}</p>
      </div>
    ),
  },
  {
    key: "verificationStatus",
    title: "Verification",
    render: (value) => <TableStatusBadge status={String(value)} />,
  },
  {
    key: "createdAt",
    title: "Created",
    render: (value) => formatDate(value as Date),
  },
  {
    key: "creator",
    title: "Platform Admin",
    render: (_value, row) => (
      <div>
        <p className="font-bold text-slate-950">{row.creator}</p>
        <p className="break-all text-xs font-semibold text-slate-500">{row.creatorEmail}</p>
      </div>
    ),
  },
  {
    key: "reviewHref",
    title: "Actions",
    className: "text-right",
    render: (_value, row) => (
      <Button href={row.reviewHref} aria-label={row.reviewLabel} size="sm" variant="secondary" className="px-3 text-sm hover:border-teal-700 hover:text-teal-800">
        Review
      </Button>
    ),
  },
];

export function SuperAdminPlatformAcademiesPanel({
  academies,
  currentPage,
  params,
  search,
  stats,
  totalItems,
}: {
  academies: PlatformAdminAcademyRow[];
  currentPage: number;
  params: AdminSearchParams;
  search: string;
  stats: StatsPanelItem[];
  totalItems: number;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / platformAdminAcademyPageSize));
  const rows: PlatformAdminAcademyTableRow[] = academies.map((academy) => ({
    academy: academy.name,
    createdAt: academy.createdAt,
    creator: academy.createdById ?? "Unknown Platform Admin",
    creatorEmail: academy.createdById ?? "Unknown",
    id: academy.id,
    location: [academy.borough ?? academy.city, academy.postcode].filter(Boolean).join(", "),
    reviewLabel: `Review ${academy.name}`,
    reviewHref: `/admin/academies/${academy.id}`,
    slug: academy.slug,
    verificationStatus: academy.verificationStatus,
  }));

  return (
    <section id="platform-admin-created-academies" className="mt-7 rounded-lg border border-violet-100 bg-white p-5 shadow-sm" aria-labelledby="platform-admin-created-academies-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-violet-700">Super Admin review</p>
          <h2 id="platform-admin-created-academies-title" className="mt-1 text-2xl font-black text-slate-950">Academies Created By Platform Admins</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">Review Platform Admin academy creation activity without changing the global academy totals above.</p>
        </div>
        <Button href="/dashboard/academies" variant="secondary" className="border-violet-200 text-violet-800">
          <Building2 size={16} aria-hidden />
          Full Academy Management
        </Button>
      </div>

      <StatsPanel className="mt-5 hidden md:block" items={stats} />

      <form action="/dashboard/academy-review" className="mt-5 flex flex-col gap-2 sm:max-w-xl sm:flex-row">
        <input
          name="platformAcademiesSearch"
          defaultValue={search}
          placeholder="Search academy, location, postcode, or Platform Admin"
          className="min-h-12 min-w-0 flex-1 rounded-md border border-stone-300 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400"
        />
        <Button type="submit" variant="primary" className="min-h-12 sm:w-auto">
          <Search size={18} aria-hidden />
          Search
        </Button>
        {search ? (
          <Button href={platformAdminAcademiesHref(params, { platformAcademiesSearch: undefined, platformAcademiesPage: 1 })} variant="secondary" className="min-h-12 border-stone-200 text-slate-700">
            Reset
          </Button>
        ) : null}
      </form>

      <Table
        className="mt-5"
        columns={platformAdminAcademyColumns}
        data={rows}
        emptyMessage="No academies have been created by Platform Admins yet."
        getRowId={(row) => row.id}
        minWidthClassName="min-w-[920px]"
        pagination={totalItems > 0
          ? {
              page: currentPage,
              totalPages,
              previousHref: platformAdminAcademiesHref(params, { platformAcademiesPage: currentPage - 1 }),
              nextHref: platformAdminAcademiesHref(params, { platformAcademiesPage: currentPage + 1 }),
            }
          : undefined}
      />
    </section>
  );
}
