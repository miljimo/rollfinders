"use client";

import { Button } from "@/components/Button";
import { clsx } from "clsx";
import { useActionState } from "react";
import { changeStandardUserPassword, type ChangePasswordState } from "./PasswordActions";

const initialState: ChangePasswordState = {
  message: "",
  success: false,
};

export function ChangePasswordForm({ cancelHref = "/dashboard", embedded = false }: { cancelHref?: string; embedded?: boolean }) {
  const [state, action, isPending] = useActionState(changeStandardUserPassword, initialState);

  return (
    <form action={action} className={clsx("grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm", !embedded && "mt-6")}>
      {state.message ? (
        <p className={`rounded-md p-3 text-sm font-semibold ${state.success ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-800"}`}>
          {state.message}
        </p>
      ) : null}
      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        New password
        <input name="password" type="password" required minLength={8} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal" />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        Confirm password
        <input name="confirmPassword" type="password" required minLength={8} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal" />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending} variant="neutral">
          {isPending ? "Changing..." : "Change Password"}
        </Button>
        <Button href={cancelHref} variant="secondary">
          Cancel
        </Button>
      </div>
    </form>
  );
}
