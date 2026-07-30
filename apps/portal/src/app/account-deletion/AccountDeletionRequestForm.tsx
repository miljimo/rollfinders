"use client";

import { useActionState } from "react";
import { Button } from "@/app/_components/Button";
import { submitPublicAccountDeletion, type AccountDeletionFormState } from "./actions";

const initialState: AccountDeletionFormState = { status: "idle" };

export function AccountDeletionRequestForm() {
  const [state, action, pending] = useActionState(submitPublicAccountDeletion, initialState);

  return (
    <form action={action} className="mt-6 grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <label className="grid gap-2 font-bold text-slate-900">
        Account email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="min-h-12 w-full rounded-md border border-stone-300 px-3 text-base font-normal"
          placeholder="you@example.com"
        />
      </label>
      {state.message ? (
        <p role="status" className={`rounded-md px-3 py-2 text-sm font-semibold ${state.status === "error" ? "bg-red-50 text-red-800" : "bg-teal-50 text-teal-800"}`}>
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="min-h-12 w-full">
        {pending ? "Submitting..." : "Send confirmation link"}
      </Button>
    </form>
  );
}
