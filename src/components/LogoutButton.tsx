"use client";

import { Button } from "./Button";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <Button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      variant="subtle"
      className="px-3 py-2 text-sm font-medium hover:bg-white"
    >
      Logout
    </Button>
  );
}
