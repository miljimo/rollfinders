"use client";

import { Button } from "@/app/_components/Button";
import { logoutCallbackUrl } from "@/lib/auth-urls";
import { signOut } from "next-auth/react";
import type { ReactNode } from "react";

type LogoutButtonProps = {
  children?: ReactNode;
  className?: string;
  ariaLabel?: string;
  callbackUrl?: string;
};

export function LogoutButton({
  children = "Logout",
  className = "px-3 py-2 text-sm font-medium hover:bg-white",
  ariaLabel,
  callbackUrl,
}: LogoutButtonProps) {
  return (
    <Button
      aria-label={ariaLabel}
      type="button"
      onClick={() => signOut({ callbackUrl: callbackUrl ?? logoutCallbackUrl() })}
      variant="subtle"
      className={className}
    >
      {children}
    </Button>
  );
}
