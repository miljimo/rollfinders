"use client";

import { Button } from "@/components/Button";
import { logoutCallbackUrl } from "@/lib/auth-urls";
import { signOut } from "next-auth/react";
import type { ReactNode } from "react";

type LogoutButtonProps = {
  children?: ReactNode;
  className?: string;
  ariaLabel?: string;
};

export function LogoutButton({
  children = "Logout",
  className = "px-3 py-2 text-sm font-medium hover:bg-white",
  ariaLabel,
}: LogoutButtonProps) {
  return (
    <Button
      aria-label={ariaLabel}
      type="button"
      onClick={() => signOut({ callbackUrl: logoutCallbackUrl() })}
      variant="subtle"
      className={className}
    >
      {children}
    </Button>
  );
}
