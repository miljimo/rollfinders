import { KeyRound } from "lucide-react";

type TemporaryPasswordPanelProps = {
  action: (formData: FormData) => Promise<void>;
  returnTo: string;
  userEmail: string;
};

export const TemporaryPasswordPanel = ({ action, returnTo, userEmail }: TemporaryPasswordPanelProps) => (
  <form action={action} className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
    <input type="hidden" name="returnTo" value={returnTo} />
    <div className="flex items-start gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-md bg-teal-50 text-teal-700">
        <KeyRound size={22} aria-hidden />
      </span>
      <div>
        <h2 className="text-xl font-black text-stone-950">Set Temporary Password</h2>
        <p className="mt-1 text-sm text-stone-600">
          Change the password for {userEmail}. All active sessions will be signed out.
        </p>
      </div>
    </div>

    <div className="mt-6 grid gap-5 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-black text-stone-950">
        Temporary Password
        <input name="temporaryPassword" type="password" minLength={8} maxLength={128} required autoComplete="new-password" className="min-h-14 rounded-md border border-stone-300 px-4 text-base font-normal" />
      </label>
      <label className="grid gap-2 text-sm font-black text-stone-950">
        Confirm Temporary Password
        <input name="confirmPassword" type="password" minLength={8} maxLength={128} required autoComplete="new-password" className="min-h-14 rounded-md border border-stone-300 px-4 text-base font-normal" />
      </label>
      <label className="grid gap-2 text-sm font-black text-stone-950 md:col-span-2">
        Reason for Change
        <textarea name="reason" required maxLength={500} rows={4} className="rounded-md border border-stone-300 px-4 py-3 text-base font-normal" />
        <span className="font-medium text-stone-600">The reason and your administrator account are recorded in the audit log.</span>
      </label>
    </div>

    <button className="mt-6 min-h-12 rounded-md bg-stone-950 px-5 text-sm font-bold text-white">
      Set Temporary Password
    </button>
    <p className="mt-3 text-sm text-stone-600">The user receives a security notification. The password is never included in that message.</p>
  </form>
);
