"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-md px-3 py-2 text-sm font-medium text-stone-700 hover:bg-white hover:text-stone-950"
    >
      Logout
    </button>
  );
}
