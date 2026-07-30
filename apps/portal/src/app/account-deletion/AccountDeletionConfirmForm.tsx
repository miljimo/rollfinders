"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/app/_components/Button";
import { confirmPublicAccountDeletionAction, type AccountDeletionFormState } from "./actions";

const initialState: AccountDeletionFormState = { status: "idle" };

export function AccountDeletionConfirmForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(confirmPublicAccountDeletionAction, initialState);
  const dueLabel = state.dueAt ? new Date(state.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;

  if (state.status === "success") {
    return (
      <div className="mt-6 rounded-lg border border-teal-200 bg-teal-50 p-5">
        <h2 className="text-xl font-black text-slate-950">Request verified</h2>
        <p className="mt-2 leading-7 text-slate-700">RollFinders expects to complete the request{dueLabel ? ` by ${dueLabel}` : " within one month"}.</p>
        <Link href="/login" className="mt-4 inline-flex font-bold text-teal-800 underline">Sign in to view or cancel the request</Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="token" value={token} />
      <p className="leading-7 text-slate-700">Confirm that you want RollFinders to begin processing deletion of your account and associated personal data.</p>
      {state.message ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{state.message}</p> : null}
      <Button type="submit" disabled={pending || !token} className="min-h-12 w-full">
        {pending ? "Confirming..." : "Confirm deletion request"}
      </Button>
    </form>
  );
}
