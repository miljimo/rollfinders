"use client";

import Link from "next/link";
import { Button } from "@/app/_components/Button";
import { useActionState } from "react";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = {
  message: "",
  success: false,
};

export function ForgotPasswordForm() {
  const [state, action, isPending] = useActionState(requestPasswordReset, initialState);

  return (
    <form action={action} className="mt-5 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      {state.message ? (
        <p role="status" className="rounded-md border border-teal-100 bg-teal-50 p-3 text-sm font-semibold leading-6 text-teal-900">
          {state.message}
        </p>
      ) : null}
      <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
        Email
        <input
          name="email"
          type="email"
          required
          disabled={isPending}
          className="min-h-12 w-full rounded-md border border-stone-300 bg-stone-50 px-3 text-base font-normal text-stone-950 transition focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20 disabled:bg-stone-100 disabled:text-stone-500"
        />
      </label>
      <Button type="submit" variant="primary" className="min-h-12 w-full" disabled={isPending}>
        {isPending ? "Sending..." : "Send reset link"}
      </Button>
      <Link href="/login" className="text-center text-sm font-semibold text-teal-800 underline-offset-4 hover:underline">
        Back to login
      </Link>
    </form>
  );
}
