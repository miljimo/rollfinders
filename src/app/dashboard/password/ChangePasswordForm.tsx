"use client";

import Link from "next/link";
import { useActionState } from "react";
import { changeStandardUserPassword, type ChangePasswordState } from "./actions";

const initialState: ChangePasswordState = {
  message: "",
  success: false,
};

export function ChangePasswordForm() {
  const [state, action, isPending] = useActionState(changeStandardUserPassword, initialState);

  return (
    <form action={action} className="mt-6 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
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
        <button disabled={isPending} className="min-h-11 rounded-md bg-stone-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400">
          {isPending ? "Changing..." : "Change Password"}
        </button>
        <Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-md border border-stone-300 px-4 text-sm font-bold text-stone-800">
          Dashboard
        </Link>
      </div>
    </form>
  );
}
