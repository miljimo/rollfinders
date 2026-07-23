import { Button } from "@/app/_components/Button";
import { TableStatusBadge, type TableColumn } from "@/app/_components/Table";
import { formatDate } from "@/lib/utils";
import type { PlatformAdminAcademyTableRow } from "./platformAcademyTypes";

export const platformAdminAcademyColumns: TableColumn<PlatformAdminAcademyTableRow>[] = [
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
  { key: "verificationStatus", title: "Verification", render: (value) => <TableStatusBadge status={String(value)} /> },
  { key: "createdAt", title: "Created", render: (value) => formatDate(value as Date) },
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
