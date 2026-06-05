"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = {
  message: "",
  success: false,
};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, isPending] = useActionState(resetPassword.bind(null, token), initialState);

  if (state.success) {
    return (
      <div className="mt-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-teal-800">{state.message}</p>
        <Link href="/login" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-stone-950 px-4 text-sm font-bold text-white">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      {state.message ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{state.message}</p> : null}
      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        New password
        <input name="password" type="password" required minLength={8} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal" />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        Confirm password
        <input name="confirmPassword" type="password" required minLength={8} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal" />
      </label>
      <button disabled={isPending} className="min-h-11 rounded-md bg-stone-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400">
        {isPending ? "Changing..." : "Change Password"}
      </button>
    </form>
  );
}
