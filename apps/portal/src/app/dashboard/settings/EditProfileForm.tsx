"use client";

import { useActionState } from "react";
import { Button } from "@/app/_components/Button";
import { updateStandardUserProfile, type EditProfileState } from "../DashboardActions";

type EditProfileFormProps = {
  academyName: string;
  cancelHref?: string;
  email: string;
  name: string | null;
  roleLabel: string;
  statusLabel: string;
};

const initialState: EditProfileState = {
  message: "",
  success: false,
};

export function EditProfileForm({
  academyName,
  cancelHref = "/dashboard?panel=settings",
  email,
  name,
  roleLabel,
  statusLabel,
}: EditProfileFormProps) {
  const [state, action, isPending] = useActionState(updateStandardUserProfile, initialState);

  return (
    <form action={action} className="grid gap-5 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      {state.message ? (
        <p className={`rounded-md p-3 text-sm font-semibold ${state.success ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-800"}`}>
          {state.message}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Name
          <input name="name" defaultValue={name ?? ""} maxLength={120} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal" />
        </label>
        <ReadOnlyField label="Email" value={email} />
        <ReadOnlyField label="Role" value={roleLabel} />
        <ReadOnlyField label="Status" value={statusLabel} />
        <ReadOnlyField label="Academy" value={academyName} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending} variant="neutral">
          {isPending ? "Saving..." : "Save Profile"}
        </Button>
        <Button href={cancelHref} variant="secondary">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-stone-800">
      {label}
      <input value={value} readOnly className="min-h-11 rounded-md border border-stone-200 bg-stone-50 px-3 text-base font-normal text-stone-600" />
    </label>
  );
}
