import Link from "next/link";
import {
  Bookmark,
  CalendarCheck,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  FileText,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { LogoutButton } from "@/app/_components/LogoutButton";

type MobileAuthenticatedProfileProps = {
  academyName?: string;
  bookingCount: number;
  email: string;
  name?: string | null;
  role?: string | null;
};

const activityItems = [
  { href: "/dashboard/bookings", icon: CalendarCheck, label: "My Bookings", web: true },
  { href: "/mobile", icon: Bookmark, label: "Saved Open Mats" },
  { href: "/academies", icon: ShieldCheck, label: "Browse Academies", web: true },
] as const;

const accountItems = [
  { href: "/dashboard", icon: ExternalLink, label: "Open Web Dashboard" },
  { href: "/contact", icon: CircleHelp, label: "Help & Support" },
  { href: "/privacy-policy", icon: ShieldCheck, label: "Privacy Policy" },
  { href: "/terms", icon: FileText, label: "Terms of Service" },
] as const;

export function MobileAuthenticatedProfile({
  academyName,
  bookingCount,
  email,
  name,
  role,
}: MobileAuthenticatedProfileProps) {
  const displayName = name?.trim() || email.split("@")[0] || "RollFinders user";
  const initials = displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const roleLabel = role?.replaceAll("_", " ") || "Member";

  return (
    <div className="grid min-w-0 gap-7">
      <section className="rounded-[1.35rem] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.10)]">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-teal-50 text-3xl font-black text-teal-800" aria-hidden>
            {initials || <UserRound size={42} />}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-black leading-tight tracking-normal text-slate-950">{displayName}</h1>
            <p className="mt-1 truncate text-base font-medium text-slate-600">{email}</p>
            <span className="mt-3 inline-flex max-w-full rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-black uppercase text-teal-800">{roleLabel}</span>
          </div>
          <ChevronRight className="shrink-0 text-stone-500" size={24} aria-hidden />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <ProfileStat icon={CalendarCheck} label="Bookings" value={bookingCount} />
        <ProfileStat icon={Bookmark} label="Saved" value={0} />
        <ProfileStat icon={ShieldCheck} label="Academies" value={academyName ? 1 : 0} />
      </section>

      <ProfileLinks items={activityItems} title="My Activity" />
      <ProfileLinks items={accountItems} title="My Account" web />

      {academyName ? <p className="text-center text-sm font-semibold text-slate-600">Registered with {academyName}</p> : null}
      <section className="rounded-[1.35rem] bg-white p-3 shadow-[0_14px_34px_rgba(15,23,42,0.10)]">
        <LogoutButton callbackUrl="/mobile?tab=profile&auth=sign-in" className="min-h-16 w-full justify-center gap-3 rounded-xl text-lg font-black text-red-600 hover:bg-red-50">
          <LogOut size={24} aria-hidden />
          Sign Out
        </LogoutButton>
      </section>
    </div>
  );
}

function ProfileStat({ icon: Icon, label, value }: { icon: typeof CalendarCheck; label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-[1.2rem] bg-white px-2 py-5 text-center shadow-[0_12px_28px_rgba(15,23,42,0.09)]">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-teal-50 text-teal-800"><Icon size={25} aria-hidden /></span>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="truncate text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}

function ProfileLinks({ items, title, web = false }: { items: readonly { href: string; icon: typeof CalendarCheck; label: string; web?: boolean }[]; title: string; web?: boolean }) {
  return (
    <section>
      <h2 className="text-2xl font-black tracking-normal text-slate-950">{title}</h2>
      <div className="mt-4 divide-y divide-stone-200 rounded-[1.35rem] bg-white px-4 shadow-[0_14px_34px_rgba(15,23,42,0.10)]">
        {items.map(({ href, icon: Icon, label, web: itemWeb }) => (
          <Link key={label} href={href} target={web || itemWeb ? "_blank" : undefined} rel={web || itemWeb ? "noreferrer" : undefined} className="flex min-h-16 items-center gap-4 py-3 text-base font-bold text-slate-900">
            <Icon className="shrink-0 text-teal-700" size={24} aria-hidden />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <ChevronRight className="shrink-0 text-stone-500" size={22} aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
}
