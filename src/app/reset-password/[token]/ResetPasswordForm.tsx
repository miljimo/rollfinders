"use client";

import { Button } from "@/components/Button";
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
        <p role="status" className="text-sm font-semibold text-teal-800">{state.message}</p>
        <Button href="/login" variant="neutral" className="mt-4">
          Go to login
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      {state.message ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{state.message}</p> : null}
      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        New password
        <input name="password" type="password" required minLength={8} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal" />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        Confirm password
        <input name="confirmPassword" type="password" required minLength={8} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal" />
      </label>
      <Button type="submit" disabled={isPending} variant="neutral">
        {isPending ? "Resetting..." : "Reset Password"}
      </Button>
    </form>
  );
}
