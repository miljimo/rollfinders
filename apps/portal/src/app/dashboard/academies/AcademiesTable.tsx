import Link from "next/link";
import { ClaimStatus } from "@prisma/client";
import { Edit3, Eye, Send } from "lucide-react";
import { Button } from "@/components/Button";
import { TableRow } from "@/components/Table";
import { formatDate } from "@/lib/utils";
import { ActionMenu } from "../../admin/ActionMenu";

type AdminSearchParams = Record<string, string | string[] | undefined>;

export type AcademyRow = {
  id: string;
  name: string;
  slug: string;
  borough: string | null;
  city: string;
  postcode: string;
  email: string | null;
  verified: boolean;
  verificationStatus: string;
  featured: boolean;
  claims: { status: ClaimStatus }[];
  members: { id: string }[];
  claimReminders: { status: string; skipReason: string | null; createdAt: Date; recipientEmail: string | null }[];
};

const menuItemClass = "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function sentenceCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function adminAcademiesHref(searchParams: AdminSearchParams, overrides: Record<string, string | number | undefined>) {
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
    if (value === undefined || value === "" || value === "all" || value === 1) {
      params.delete(key);
      return;
    }
    params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `/dashboard/academies?${query}` : "/dashboard/academies";
}

function claimReminderReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    invalid_email: "Invalid email",
    managed: "Already claimed",
    missing_email: "No email",
    not_found: "Academy not found",
    pending_claim: "Pending claim",
    recently_sent: "Recently sent",
  };
  return labels[reason] ?? sentenceCase(reason);
}

function academyClaimState(academy: AcademyRow) {
  if (academy.members.length > 0 || academy.claims.some((claim) => claim.status === ClaimStatus.APPROVED)) return "Claimed";
  if (academy.claims.some((claim) => claim.status === ClaimStatus.PENDING)) return "Pending claim";
  return "Unclaimed";
}

function academyReminderState(academy: AcademyRow) {
  const latest = academy.claimReminders[0];
  if (latest?.status === "QUEUED") return { label: `Queued ${formatDate(latest.createdAt)}`, eligible: false, reason: "recently_sent" };
  if (latest?.status === "FAILED") return { label: "Failed", eligible: true, reason: latest.skipReason ?? "failed" };
  if (academy.members.length > 0 || academy.claims.some((claim) => claim.status === ClaimStatus.APPROVED)) return { label: "Already claimed", eligible: false, reason: "managed" };
  if (academy.claims.some((claim) => claim.status === ClaimStatus.PENDING)) return { label: "Pending claim", eligible: false, reason: "pending_claim" };
  if (!academy.email) return { label: "No email", eligible: false, reason: "missing_email" };
  return { label: "Not sent", eligible: true, reason: null };
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-md border border-stone-200 px-2 py-1 text-xs font-bold text-stone-700">{children}</span>;
}

function LinkedTableCell({ children, className, href }: { children: React.ReactNode; className?: string; href?: string }) {
  return (
    <td className={`px-5 py-4 ${className ?? ""}`}>
      {href ? <Link href={href} className="block min-h-6">{children}</Link> : children}
    </td>
  );
}

export function AcademiesTable({ academies, params }: { academies: AcademyRow[]; params: AdminSearchParams }) {
  const returnTo = adminAcademiesHref(params, { dialog: undefined, academyId: undefined, academyIds: undefined });
  return (
    <form action="/dashboard/academies" className="mt-4">
      <input type="hidden" name="dialog" value="bulk-claim-reminders" />
      {firstParam(params.search) ? <input type="hidden" name="search" value={firstParam(params.search)} /> : null}
      {firstParam(params.reminderFilter) ? <input type="hidden" name="reminderFilter" value={firstParam(params.reminderFilter)} /> : null}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
        <p className="text-sm font-semibold text-slate-600">Select academies on this page to review a bulk claim reminder.</p>
        <Button type="submit" variant="secondary" className="min-h-10 border-teal-200 text-teal-800">
          <Send size={16} aria-hidden />
          Review selected reminders
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-4 py-4">Select</th>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Location</th>
              <th className="px-5 py-4">Postcode</th>
              <th className="px-5 py-4">Claim</th>
              <th className="px-5 py-4">Email</th>
              <th className="w-40 whitespace-nowrap px-3 py-4">Claim Invite</th>
              <th className="px-5 py-4">Featured</th>
              <th className="px-5 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {academies.map((academy) => {
              const reminder = academyReminderState(academy);
              const academyHref = adminAcademiesHref(params, { dialog: "view-academy", academyId: academy.id });
              const editAcademyHref = adminAcademiesHref(params, { dialog: "edit-academy", academyId: academy.id });
              return (
                <TableRow key={academy.id} href={academyHref}>
                  <td className="px-4 py-4">
                    <input className="size-4 accent-teal-700" type="checkbox" name="academyIds" value={academy.id} aria-label={`Select ${academy.name} for claim reminder`} />
                  </td>
                  <LinkedTableCell href={academyHref} className="font-bold text-slate-950">{academy.name}</LinkedTableCell>
                  <LinkedTableCell href={academyHref} className="text-slate-700">{academy.borough ?? academy.city}</LinkedTableCell>
                  <LinkedTableCell href={academyHref} className="text-slate-700">{academy.postcode}</LinkedTableCell>
                  <LinkedTableCell href={academyHref}><Badge>{academyClaimState(academy)}</Badge></LinkedTableCell>
                  <LinkedTableCell href={academyHref} className="text-slate-700">{academy.email ? <span className="break-all">{academy.email}</span> : <Badge>No email</Badge>}</LinkedTableCell>
                  <LinkedTableCell href={academyHref} className="w-40 whitespace-nowrap">
                    <div className="grid gap-2">
                      <Badge>{reminder.label}</Badge>
                      {!reminder.eligible ? (
                        <p className="text-xs font-semibold text-slate-500">{claimReminderReasonLabel(reminder.reason ?? "unavailable")}</p>
                      ) : null}
                    </div>
                  </LinkedTableCell>
                  <LinkedTableCell href={academyHref}><Badge>{academy.featured ? "Featured" : "No"}</Badge></LinkedTableCell>
                  <td className="px-5 py-4 text-center">
                    <ActionMenu label={`Open actions for ${academy.name}`}>
                      <Link href={academyHref} className={menuItemClass}>
                        <Eye size={18} aria-hidden />
                        View Academy
                      </Link>
                      <Link href={editAcademyHref} className={menuItemClass}>
                        <Edit3 size={18} aria-hidden />
                        Edit Academy
                      </Link>
                      {reminder.eligible ? (
                        <Link href={adminAcademiesHref(params, { dialog: "claim-reminder", academyId: academy.id })} className={menuItemClass}>
                          <Send size={18} aria-hidden />
                          Send claim reminder
                        </Link>
                      ) : null}
                    </ActionMenu>
                  </td>
                </TableRow>
              );
            })}
            {!academies.length ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-stone-600">No academies match the current search and filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <input type="hidden" name="returnTo" value={returnTo} />
    </form>
  );
}
