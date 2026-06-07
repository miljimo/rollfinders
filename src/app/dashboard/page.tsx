import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, ChevronDown, MapPin, ShieldCheck } from "lucide-react";
import { Role, UserStatus } from "@prisma/client";
import { LogoutButton } from "@/components/LogoutButton";
import { SidePanelControl, type SidePanelItem } from "@/components/SidePanelControl";
import { requireDashboardUser } from "@/lib/standard-dashboard";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/utils";
import AdminDashboardWorkspace from "./AdminDashboardWorkspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Dashboard",
  description: "View your profile, roles, security, academy, and dashboard activity.",
};

type DashboardSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function standardPanel(value: string | undefined) {
  if (!value || value === "dashboard" || value === "rolls") return value ?? "dashboard";
  if (value === "members" || value === "password" || value === "support") return value;
  return null;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const { user, academy } = await requireDashboardUser();
  const platformAdminUser = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN || user.role === Role.PLATFORM_ADMIN;
  const academyAdminUser = user.role === Role.ACADEMY_ADMIN || user.role === Role.ACADEMY_OWNER;
  if (platformAdminUser || academyAdminUser) return <AdminDashboardWorkspace searchParams={searchParams} />;

  const params = await searchParams;
  const panel = standardPanel(firstParam(params.panel));
  if (!panel) redirect("/dashboard");

  const rolls = academy
    ? await prisma.event.findMany({
        where: { academyId: academy.id, active: true },
        include: { academy: true },
        orderBy: { createdAt: "desc" },
        take: 12,
      })
    : [];
  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();
  const active = user.status !== UserStatus.DISABLED && !user.disabled;
  const accountLabel = user.name ?? user.email;
  const activePanel = panel === "rolls" ? "rolls" : panel;
  const standardNavigationItems: SidePanelItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: "dashboard", active: activePanel === "dashboard" },
    { label: "My Academy Rolls", href: "/dashboard?panel=rolls", icon: "events", active: activePanel === "rolls" },
    { label: "Members", href: "/dashboard?panel=members", icon: "users", active: activePanel === "members" },
    { label: "Password / Account Settings", href: "/dashboard?panel=password", icon: "settings", active: activePanel === "password" },
  ];

  return (
    <div className="min-h-screen bg-[#f8faf7] text-slate-900">
      <SidePanelControl
        accountLabel={accountLabel}
        navigationItems={standardNavigationItems}
        roleLabel={roleLabel(user.role)}
        supportHref="/contact"
      />

      <main className="transition-[padding] duration-200 lg:pl-[var(--admin-side-panel-width,16rem)]">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b border-stone-200 bg-white px-4 sm:px-8 lg:min-h-24 lg:justify-end">
          <div className="size-11 lg:hidden" aria-hidden />
          <div className="inline-flex items-center gap-3 rounded-md px-2 py-1.5 text-left">
            <span className="flex size-11 items-center justify-center rounded-full bg-teal-100 text-sm font-black text-teal-800" aria-hidden>{initials}</span>
            <span className="hidden sm:block">
              <span className="block font-black text-slate-950">{accountLabel}</span>
              <span className="block text-sm font-semibold text-slate-500">{roleLabel(user.role)}</span>
            </span>
            <ChevronDown size={18} aria-hidden className="hidden text-slate-400 sm:block" />
          </div>
        </header>

        <section className="px-4 py-8 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-teal-800">Standard Dashboard</p>
              <h1 className="mt-1 text-3xl font-black text-slate-950">{academy?.name ?? "My Academy"}</h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                {academy ? "View your assigned academy, members, and active rolls in read-only mode." : "No academy is assigned to your account yet."}
              </p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-500">Account</p>
              <p className="mt-1 font-black text-slate-950">{active ? "Active" : "Disabled"}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <SummaryCard label="Active Rolls" value={String(rolls.length)} />
            <SummaryCard label="Academy Scope" value={academy?.name ?? "Not assigned"} />
            <SummaryCard label="Access" value="Read only" />
          </div>

          <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="min-w-0 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-stone-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-950">My Academy Rolls</h2>
                  <p className="mt-1 text-sm text-slate-600">Academy-scoped active rolls. Admin actions are unavailable for this role.</p>
                </div>
                <span className="text-sm font-bold text-slate-600">{rolls.length} active</span>
              </div>
              <div className="divide-y divide-stone-100">
                {rolls.map((roll) => (
                  <article key={roll.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_12rem] lg:items-center">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase text-teal-700">{roll.giType.replace("_", "-")}</p>
                      <h3 className="mt-1 text-lg font-black text-slate-950">
                        <Link href={`/open-mats/${roll.id}`}>
                          {roll.title}
                        </Link>
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">{roll.description}</p>
                    </div>
                    <dl className="grid gap-2 text-sm font-semibold text-slate-700">
                      <div className="flex items-center gap-2"><CalendarDays size={16} aria-hidden />{formatDate(roll.eventDate)}</div>
                      <div>{roll.startTime}-{roll.endTime}</div>
                      <div>{formatMoney(roll.price)}</div>
                    </dl>
                  </article>
                ))}
                {rolls.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="font-bold text-slate-950">{academy ? "No active rolls are listed yet." : "No academy assigned."}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {academy ? "Active rolls for your academy will appear here when available." : "Ask an academy administrator to assign your account before roll data can be shown."}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            <aside className="grid content-start gap-4">
              <ProfileSummary academy={academy} active={active} user={user} />
              <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-slate-950">Support</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Need access changes or account help?</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/contact" className="rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-slate-800 hover:bg-stone-50">Help & Support</Link>
                  <LogoutButton />
                </div>
              </section>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}

type DashboardUser = Awaited<ReturnType<typeof requireDashboardUser>>["user"];
type DashboardAcademy = Awaited<ReturnType<typeof requireDashboardUser>>["academy"];

function ProfileSummary({ academy, active, user }: { academy: DashboardAcademy; active: boolean; user: DashboardUser }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">Profile</h2>
      <dl className="mt-4 grid gap-4 text-sm">
        <ProfileRow label="Name" value={user.name ?? user.email} />
        <ProfileRow label="Email" value={user.email} />
        <ProfileRow label="Role" value={roleLabel(user.role)} />
        <ProfileRow label="Status" value={active ? "Active" : "Disabled"} />
        <ProfileRow label="Joined" value={formatDate(user.createdAt)} />
      </dl>

      <div className="mt-5 border-t border-stone-100 pt-5">
        <div className="flex items-start gap-3">
          <MapPin size={20} aria-hidden className="mt-0.5 shrink-0 text-teal-700" />
          <div className="min-w-0">
            <p className="font-black text-slate-950">{academy?.name ?? "No academy assigned"}</p>
            <p className="mt-1 text-sm text-slate-600">{academy ? `${academy.city}, ${academy.postcode}` : "Academy data is unavailable until assignment."}</p>
          </div>
        </div>
        {academy ? (
          <Link href={`/academies/${academy.slug}`} className="mt-4 inline-flex rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-slate-800 hover:bg-stone-50">View Academy</Link>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-md bg-teal-50 px-3 py-2 text-sm font-bold text-teal-800">
        <ShieldCheck size={18} aria-hidden />
        Read-only academy access
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 break-words text-2xl font-black text-slate-950">{value}</p>
    </section>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3">
      <dt className="text-sm font-semibold text-stone-600">{label}</dt>
      <dd className="min-w-0 break-words font-semibold text-stone-950">{value}</dd>
    </div>
  );
}

function roleLabel(role: Role) {
  if (role === Role.SUPER_ADMIN || role === Role.ADMIN) return "Super Admin";
  if (role === Role.PLATFORM_ADMIN) return "Platform Admin";
  if (role === Role.ACADEMY_ADMIN) return "Academy Admin";
  return "Standard User";
}
