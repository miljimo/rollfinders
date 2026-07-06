import { ClaimStatus } from "@prisma/client";
import { Send } from "lucide-react";
import { Button } from "@/components/Button";
import { TableRow } from "@/components/Table";
import { AcademyActionMenu } from "./AcademyActionMenu";
import { AcademyBadge, LinkedTableCell } from "./AcademyTableCells";
import { academyClaimState, academyReminderState, adminAcademiesHref, claimReminderReasonLabel, firstParam } from "./academyTableUtils";

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
              return (
                <TableRow key={academy.id} href={academyHref}>
                  <td className="px-4 py-4">
                    <input className="size-4 accent-teal-700" type="checkbox" name="academyIds" value={academy.id} aria-label={`Select ${academy.name} for claim reminder`} />
                  </td>
                  <LinkedTableCell href={academyHref} className="font-bold text-slate-950">{academy.name}</LinkedTableCell>
                  <LinkedTableCell href={academyHref} className="text-slate-700">{academy.borough ?? academy.city}</LinkedTableCell>
                  <LinkedTableCell href={academyHref} className="text-slate-700">{academy.postcode}</LinkedTableCell>
                  <LinkedTableCell href={academyHref}><AcademyBadge>{academyClaimState(academy)}</AcademyBadge></LinkedTableCell>
                  <LinkedTableCell href={academyHref} className="text-slate-700">{academy.email ? <span className="break-all">{academy.email}</span> : <AcademyBadge>No email</AcademyBadge>}</LinkedTableCell>
                  <LinkedTableCell href={academyHref} className="w-40 whitespace-nowrap">
                    <div className="grid gap-2">
                      <AcademyBadge>{reminder.label}</AcademyBadge>
                      {!reminder.eligible ? (
                        <p className="text-xs font-semibold text-slate-500">{claimReminderReasonLabel(reminder.reason ?? "unavailable")}</p>
                      ) : null}
                    </div>
                  </LinkedTableCell>
                  <LinkedTableCell href={academyHref}><AcademyBadge>{academy.featured ? "Featured" : "No"}</AcademyBadge></LinkedTableCell>
                  <td className="px-5 py-4 text-center">
                    <AcademyActionMenu academy={academy} params={params} />
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
