import { Building2 } from "lucide-react";
import { Button } from "@/components/Button";
import { StatsPanel, type StatsPanelItem } from "@/components/StatsPanel";
import { Table } from "@/components/Table";
import { PlatformAcademiesSearch } from "./PlatformAcademiesSearch";
import { platformAdminAcademyColumns } from "./platformAcademyColumns";
import { platformAdminAcademiesHref, platformAdminAcademyPageSize } from "./platformAcademiesUtils";
import type { PlatformAdminAcademyRow, PlatformAdminAcademyTableRow } from "./platformAcademyTypes";

type AdminSearchParams = Record<string, string | string[] | undefined>;

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

      <PlatformAcademiesSearch params={params} search={search} />

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
