import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser, isStandardUserRole, requireAdminPage } from "@/lib/admin";

export type AuthenticationAccess = "authenticated" | "admin" | "standard-dashboard";

export type AuthenticationProviderProps = {
  access?: AuthenticationAccess;
  children: ReactNode;
};

export async function AuthenticationProvider({
  access = "authenticated",
  children,
}: AuthenticationProviderProps) {
  if (access === "admin") {
    await requireAdminPage();
    return <>{children}</>;
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (access === "standard-dashboard" && !isStandardUserRole(user.role)) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
