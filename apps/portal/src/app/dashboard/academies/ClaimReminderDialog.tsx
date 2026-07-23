import { Send } from "lucide-react";

import { Button } from "@/app/_components/Button";
import { DialogShell } from "@/app/_components/DialogShell";

import { sendAcademyClaimReminder } from "../../admin/academies/actions";

type ReminderAcademy = {
  email: string | null;
  id: string;
  name: string;
};

export function ClaimReminderDialog({ academy, closeHref, returnTo }: { academy: ReminderAcademy; closeHref: string; returnTo: string }) {
  return (
    <DialogShell closeHref={closeHref} description="The backend will re-check claim status, email validity, suppression, and cooldown before queueing." title="Send claim reminder?">
      <div className="mt-6 grid gap-4">
        <p className="text-sm font-semibold leading-6 text-slate-700">
          This will queue a claim reminder for <strong>{academy.name}</strong>{academy.email ? <> at <strong>{academy.email}</strong></> : null}. The email links to the existing claim flow and does not grant access.
        </p>
        <form action={sendAcademyClaimReminder.bind(null, academy.id)} className="flex flex-wrap justify-end gap-3">
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button href={closeHref} variant="secondary">Cancel</Button>
          <Button type="submit" variant="primary">
            <Send size={18} aria-hidden />
            Queue reminder
          </Button>
        </form>
      </div>
    </DialogShell>
  );
}
