import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, X } from "lucide-react";
import { Role, UserStatus } from "@prisma/client";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/PageShell";
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

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <UserProfilePanel initials={initials} user={user} academy={academy} />

          <section className="min-w-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase text-teal-800">{platformAdminUser ? "Control Panel" : "My Academy"}</p>
                <h2 className="mt-1 text-3xl font-black text-stone-950">{platformAdminUser ? "Explorer" : `${academy?.name ?? "Academy"} Rolls`}</h2>
              </div>
              <p className="text-sm font-semibold text-stone-600">{rolls.length} active rolls</p>
            </div>

            {academyAdminUser ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <DashboardAction title="Academy" description="Manage members" href="/dashboard/members" />
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {rolls.map((roll) => (
                <article key={roll.id} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase text-teal-700">{roll.giType.replace("_", "-")}</p>
                  <h3 className="mt-1 text-lg font-black text-stone-950">
                    <Link href={`/open-mats/${roll.id}`}>{roll.title}</Link>
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-700">{roll.description}</p>
                  <dl className="mt-4 grid gap-2 text-sm text-stone-700 sm:grid-cols-3">
                    <div className="flex items-center gap-2"><CalendarDays size={16} aria-hidden />{formatDate(roll.eventDate)}</div>
                    <div>{roll.startTime}-{roll.endTime}</div>
                    <div>{formatMoney(roll.price)}</div>
                  </dl>
                </article>
              ))}
              {rolls.length === 0 ? <p className="text-stone-600">No active rolls are listed yet.</p> : null}
            </div>
          </section>
        </div>
      </section>
    </PageShell>
  );
}

type DashboardUser = Awaited<ReturnType<typeof requireDashboardUser>>["user"];
type DashboardAcademy = Awaited<ReturnType<typeof requireDashboardUser>>["academy"];

function UserProfilePanel({ academy, initials, user }: { academy: DashboardAcademy; initials: string; user: DashboardUser }) {
  const active = user.status !== UserStatus.DISABLED && !user.disabled;

  return (
    <aside className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="flex min-h-14 items-center justify-between border-b border-stone-100 px-5">
        <h1 className="text-xl font-black text-stone-950">My Profile</h1>
        <span className="inline-flex size-8 items-center justify-center text-stone-500" aria-hidden><X size={18} /></span>
      </div>

      <div className="p-5">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-24 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-4xl font-black text-teal-900" aria-hidden>
            {initials}
          </div>
          <h2 className="mt-4 max-w-full truncate text-2xl font-black text-stone-950">{user.name ?? user.email}</h2>
          <span className={`mt-3 rounded-full px-4 py-2 text-sm font-bold ${active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{active ? "Active" : "Disabled"}</span>
          <p className="mt-3 max-w-full truncate text-sm font-semibold text-stone-600">{user.email}</p>
          <p className="mt-2 text-base font-bold text-stone-700">{roleLabel(user.role)}</p>
        </div>

        <section className="mt-8 py-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-black text-stone-950">Personal Information</h3>
            <Button href="/dashboard/password" size="sm" variant="secondary" className="px-3 py-2 text-sm">Edit</Button>
          </div>
          <dl className="mt-4 grid gap-4 text-sm">
            <ProfileRow label="Full Name" value={user.name ?? user.email} />
            <ProfileRow label="Email" value={user.email} />
            <ProfileRow label="Phone" value="Not provided" />
            <ProfileRow label="Joined" value={formatDate(user.createdAt)} />
          </dl>
        </section>

        <section className="border-t border-stone-100 py-4">
          <h3 className="font-black text-stone-950">Account Information</h3>
          <dl className="mt-4 grid gap-4 text-sm">
            <ProfileRow label="Status" value={active ? "Active" : "Disabled"} />
            <ProfileRow label="Last Login" value={user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"} />
          </dl>
        </section>

        <section className="border-t border-stone-100 py-4">
          <h3 className="font-black text-stone-950">Academy</h3>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold text-stone-950">{academy?.name ?? "No academy assigned"}</p>
              <p className="truncate text-sm text-stone-600">{academy ? `${academy.city}, ${academy.postcode}` : roleLabel(user.role)}</p>
            </div>
            {academy ? (
              <Link href={`/academies/${academy.slug}`} className="shrink-0 rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-stone-800">View Academy</Link>
            ) : null}
          </div>
        </section>

      </div>
    </aside>
  );
}

function DashboardAction({ description, href, title }: { description: string; href: string; title: string }) {
  return (
    <Link href={href} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-bold uppercase text-teal-800">{title}</div>
      <p className="mt-2 text-lg font-black text-stone-950">{description}</p>
    </Link>
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
