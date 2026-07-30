"use client";

import { signOut } from "next-auth/react";
import { UserAccountDropDownMenu } from "@/app/_components/UserAccountDropDownMenu";
import { logoutCallbackUrl } from "@/lib/auth-urls";

type DashboardAccountDropDownMenuProps = {
  accountEmail: string;
  accountName: string;
  accountRole: string;
  avatarLabel?: string;
  helpHref?: string;
  profileHref?: string;
  settingsHref?: string;
  signOutCallbackUrl?: string;
};

export function DashboardAccountDropDownMenu({
  accountEmail,
  accountName,
  accountRole,
  avatarLabel,
  helpHref,
  profileHref,
  settingsHref,
  signOutCallbackUrl,
}: DashboardAccountDropDownMenuProps) {
  return (
    <UserAccountDropDownMenu
      accountEmail={accountEmail}
      accountName={accountName}
      accountRole={accountRole}
      avatarLabel={avatarLabel}
      helpHref={helpHref}
      onSignOut={() => signOut({ callbackUrl: signOutCallbackUrl ?? logoutCallbackUrl() })}
      profileHref={profileHref}
      settingsHref={settingsHref}
    />
  );
}
