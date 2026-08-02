import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { DashboardAccountDropDownMenu } from "./DashboardAccountDropDownMenu";

export function MobileDashboardHeader({
  accountEmail,
  accountName,
  accountRole,
  avatarLabel,
  profileHref,
  settingsHref,
}: {
  accountEmail: string;
  accountName: string;
  accountRole: string;
  avatarLabel: string;
  profileHref: string;
  settingsHref: string;
}) {
  return (
    <header className="flex min-h-20 w-full items-center gap-3 border-b border-stone-200 bg-white px-4">
      <Link
        href="/mobile"
        aria-label="Return to mobile home"
        className="grid size-11 shrink-0 place-items-center rounded-md text-slate-700 hover:bg-stone-100"
      >
        <Menu size={24} aria-hidden />
      </Link>
      <Link href="/mobile" className="flex min-w-0 flex-1 items-center gap-2">
        <Image src="/logo.png" alt="" width={42} height={42} className="size-10 shrink-0 object-contain" priority />
        <span className="truncate text-xl font-black uppercase text-teal-900">RollFinders</span>
      </Link>
      <DashboardAccountDropDownMenu
        accountEmail={accountEmail}
        accountName={accountName}
        accountRole={accountRole}
        avatarLabel={avatarLabel}
        profileHref={profileHref}
        settingsHref={settingsHref}
        signOutCallbackUrl="/mobile?tab=profile&auth=sign-in"
      />
    </header>
  );
}
