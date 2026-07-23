import { Send } from "lucide-react";

import { Button } from "@/app/_components/Button";
import { DialogShell } from "@/app/_components/DialogShell";

import { sendBulkAcademyClaimReminders } from "../../admin/academies/actions";

type ReminderAcademy = {
  email: string | null;
  id: string;
  name: string;
};

export function BulkClaimReminderDialog({ academies, closeHref, returnTo }: { academies: ReminderAcademy[]; closeHref: string; returnTo: string }) {
  return (
    <DialogShell closeHref={closeHref} description="Selected academies will be checked again before any reminder is queued." title="Send claim reminders?">
      <div className="mt-6 grid gap-4">
        <p className="text-sm font-semibold leading-6 text-slate-700">
          Reminders will be attempted for {academies.length} selected {academies.length === 1 ? "academy" : "academies"}. Ineligible academies will be skipped with a reason.
        </p>
        {academies.length ? (
          <ul className="max-h-56 overflow-auto rounded-md border border-stone-200 text-sm">
            {academies.map((academy) => (
              <li key={academy.id} className="flex items-center justify-between gap-3 border-b border-stone-100 px-3 py-2 last:border-b-0">
                <span className="font-bold text-slate-900">{academy.name}</span>
                <span className="break-all text-slate-500">{academy.email ?? "No email"}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <form action={sendBulkAcademyClaimReminders} className="flex flex-wrap justify-end gap-3">
          <input type="hidden" name="returnTo" value={returnTo} />
          {academies.map((academy) => <input key={academy.id} type="hidden" name="academyIds" value={academy.id} />)}
          <Button href={closeHref} variant="secondary">Cancel</Button>
          <Button type="submit" variant="primary" disabled={!academies.length}>
            <Send size={18} aria-hidden />
            Queue {academies.length} reminders
          </Button>
        </form>
      </div>
    </DialogShell>
  );
}
