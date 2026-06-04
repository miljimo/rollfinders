"use client";

import { useActionState } from "react";
import { changeSuperAdminPassword, type ChangeSuperAdminPasswordState } from "./actions";

const initialState: ChangeSuperAdminPasswordState = {
  message: "",
  success: false,
};

export function SuperAdminPasswordForm() {
  const [state, formAction, pending] = useActionState(changeSuperAdminPassword, initialState);

  return (
    <form action={formAction} className="mt-4 grid gap-3">
      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        New password
        <input
          name="password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          className="min-h-11 rounded-md border border-stone-300 px-3 text-sm font-normal"
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        Confirm password
        <input
          name="confirmPassword"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          className="min-h-11 rounded-md border border-stone-300 px-3 text-sm font-normal"
        />
      </label>
      {state.message ? (
        <p className={`text-sm font-semibold ${state.success ? "text-teal-800" : "text-red-700"}`}>
          {state.message}
        </p>
      ) : null}
      <button
        disabled={pending}
        className="min-h-11 rounded-md bg-stone-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        {pending ? "Changing..." : "Change Password"}
      </button>
    </form>
  );
}
