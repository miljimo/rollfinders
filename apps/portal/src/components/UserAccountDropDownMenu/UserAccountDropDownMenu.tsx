"use client";

import { CircleHelp, LogOut, Settings, UserRound } from "lucide-react";
import { UserAccountMenu, type UserAccountMenuItem } from "@/components/UserAccountMenu";

export type UserAccountDropDownMenuProps = {
  accountEmail?: string | null;
  accountName: string;
  accountRole?: string | null;
  avatarLabel?: string;
  className?: string;
  defaultOpen?: boolean;
  helpHref?: string;
  onSignOut?: () => void;
  profileHref?: string;
  settingsHref?: string;
};

export function UserAccountDropDownMenu({
  accountEmail,
  accountName,
  accountRole,
  avatarLabel,
  className,
  defaultOpen,
  helpHref = "/contact",
  onSignOut,
  profileHref = "/dashboard/profile",
  settingsHref = "/dashboard/settings",
}: UserAccountDropDownMenuProps) {
  const items: UserAccountMenuItem[] = [
    { href: profileHref, icon: UserRound, label: "Profile" },
    { href: settingsHref, icon: Settings, label: "Settings" },
    { href: helpHref, icon: CircleHelp, label: "Help & Support" },
  ];

  return (
    <UserAccountMenu
      accountEmail={accountEmail}
      accountName={accountName}
      accountRole={accountRole}
      avatarLabel={avatarLabel}
      className={className}
      defaultOpen={defaultOpen}
      items={items}
      onSignOut={onSignOut}
      showRolePill
      signOutIcon={LogOut}
      variant="account-dropdown"
    />
  );
}
