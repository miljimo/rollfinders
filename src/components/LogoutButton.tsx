"use client";

import { Button } from "./Button";
import { signOut } from "next-auth/react";
import type { ReactNode } from "react";

export function LogoutButton({ children = "Logout", className = "px-3 py-2 text-sm font-medium hover:bg-white", ariaLabel }: { children?: ReactNode; className?: string; ariaLabel?: string }) {
  return (
    <Button
      aria-label={ariaLabel}
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      variant="subtle"
      className={className}
    >
      {children}
    </Button>
  );
}
