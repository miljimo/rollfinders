import Link from "next/link";
import { Edit3, Eye, Send } from "lucide-react";
import { ActionMenu } from "../../admin/ActionMenu";
import type { AcademyRow } from "./AcademiesTable";
import { academyReminderState, adminAcademiesHref } from "./academyTableUtils";

type AdminSearchParams = Record<string, string | string[] | undefined>;

const menuItemClass = "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50";

export function AcademyActionMenu({ academy, params }: { academy: AcademyRow; params: AdminSearchParams }) {
  const reminder = academyReminderState(academy);
  const academyHref = adminAcademiesHref(params, { dialog: "view-academy", academyId: academy.id });
  const editAcademyHref = adminAcademiesHref(params, { dialog: "edit-academy", academyId: academy.id });

  return (
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
  );
}

