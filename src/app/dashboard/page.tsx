import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChevronDown, Edit3, KeyRound, MapPin, Search, ShieldCheck, UserRound } from "lucide-react";
import { GiType, Role, UserStatus, type CourseType, type Prisma } from "@prisma/client";
import { SidePanelControl, type SidePanelItem } from "@/components/SidePanelControl";
import { LogoutButton } from "@/components/LogoutButton";
import { QuickActionPanel, type QuickActionPanelItem } from "@/components/QuickActionPanel";
import { Table, type TableColumn, type TableRecord } from "@/components/Table";
import { courseHref, coursePriceLabel } from "@/lib/courses";
import { requireDashboardUser } from "@/lib/standard-dashboard";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { ChangePasswordForm } from "./password/ChangePasswordForm";
import { EditProfileForm } from "./EditProfileForm";
import AdminDashboardWorkspace from "./AdminDashboardWorkspace";
import { ActionMenu } from "../admin/ActionMenu";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Dashboard",
  description: "View your profile, settings, academy, and courses/events.",
};

const standardRollsPageSize = 8;

type DashboardSearchParams = Record<string, string | string[] | undefined>;

type StandardPanel = "dashboard" | "profile" | "settings";
type SettingsAction = "change-password" | "edit-profile";

type RollRow = TableRecord & {
  id: string;
  title: string;
  date: string;
  time: string;
  giType: string;
  price: string;
  courseType: CourseType;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function standardPanel(value: string | undefined): StandardPanel | null {
  if (!value || value === "dashboard" || value === "rolls") return "dashboard";
  if (value === "profile") return "profile";
  if (value === "settings" || value === "password") return "settings";
  return null;
}

function pageFromParams(searchParams: DashboardSearchParams, key: string) {
  const value = Number(firstParam(searchParams[key]) ?? "1");
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function settingsAction(value: string | undefined): SettingsAction | null {
  if (value === "change-password" || value === "edit-profile") return value;
  return null;
}

function standardDashboardHref(searchParams: DashboardSearchParams, overrides: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => item && params.append(key, item));
      return;
    }
    params.set(key, value);
  });
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === 1) {
      params.delete(key);
      return;
    }
    params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function rollSearchWhere(academyId: string, query: string): Prisma.EventWhereInput {
  const search = query.trim();
  const giTypeSearch = search.toUpperCase().replaceAll("-", "_").replaceAll(" ", "_");
  const matchingGiType = Object.values(GiType).includes(giTypeSearch as GiType) ? giTypeSearch as GiType : null;
  return {
    academyId,
    active: true,
    eventDate: { gte: startOfToday() },
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            ...(matchingGiType ? [{ giType: matchingGiType }] : []),
          ],
        }
      : {}),
  };
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

  const search = (firstParam(params.search) ?? "").trim();
  const requestedRollsPage = pageFromParams(params, "rollsPage");
  const rollWhere = academy ? rollSearchWhere(academy.id, search) : null;
  const rollCount = rollWhere ? await prisma.event.count({ where: rollWhere }) : 0;
  const totalRollPages = Math.max(1, Math.ceil(rollCount / standardRollsPageSize));
  const rollsPage = Math.min(requestedRollsPage, totalRollPages);
  const rolls = rollWhere
    ? await prisma.event.findMany({
        where: rollWhere,
        select: {
          id: true,
          title: true,
          eventDate: true,
          startTime: true,
          endTime: true,
          giType: true,
          courseType: true,
          pricingType: true,
          price: true,
          donationLabel: true,
          audience: true,
        },
        orderBy: [{ eventDate: "asc" }, { startTime: "asc" }, { title: "asc" }],
        skip: (rollsPage - 1) * standardRollsPageSize,
        take: standardRollsPageSize,
      })
    : [];

  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();
  const active = user.status !== UserStatus.DISABLED && !user.disabled;
  const accountLabel = user.name ?? user.email;
  const standardNavigationItems: SidePanelItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: "dashboard", active: panel === "dashboard" },
    { label: "Profile", href: "/dashboard?panel=profile", icon: "users", active: panel === "profile" },
    { label: "Settings", href: "/dashboard?panel=settings", icon: "settings", active: panel === "settings" },
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
          <ActionMenu
            buttonClassName="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50"
            label="Open account profile menu"
            menuClassName="absolute right-0 z-20 mt-3 w-80 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-xl"
            trigger={(
              <>
                <span className="flex size-11 items-center justify-center rounded-full bg-teal-100 text-sm font-black text-teal-800" aria-hidden>{initials}</span>
                <ChevronDown size={18} aria-hidden className="text-slate-400" />
              </>
            )}
          >
            <div className="flex items-start gap-3 border-b border-stone-100 pb-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-full bg-teal-100 text-lg font-black text-teal-800" aria-hidden>{initials}</div>
              <div className="min-w-0">
                <p className="break-words text-lg font-black text-slate-950">{accountLabel}</p>
                <p className="mt-1 break-all text-sm font-semibold text-slate-500">{user.email}</p>
                <p className="mt-2 inline-flex rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-800">{roleLabel(user.role)}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <LogoutButton />
            </div>
          </ActionMenu>
        </header>

        <section className="px-4 py-8 sm:px-8">
          {panel === "dashboard" ? (
            <DashboardPanel academy={academy} rolls={rolls} rollsPage={rollsPage} search={search} searchParams={params} totalRollPages={totalRollPages} />
          ) : null}
          {panel === "profile" ? <ProfilePanel academy={academy} active={active} user={user} /> : null}
          {panel === "settings" ? <SettingsPanel academy={academy} searchParams={params} user={user} /> : null}
        </section>
      </main>
    </div>
  );
}

type DashboardUser = Awaited<ReturnType<typeof requireDashboardUser>>["user"];
type DashboardAcademy = Awaited<ReturnType<typeof requireDashboardUser>>["academy"];
type DashboardRoll = Prisma.EventGetPayload<{
  select: {
    id: true;
    title: true;
    eventDate: true;
    startTime: true;
    endTime: true;
    giType: true;
    courseType: true;
    pricingType: true;
    price: true;
    donationLabel: true;
    audience: true;
  };
}>;

function DashboardPanel({
  academy,
  rolls,
  rollsPage,
  search,
  searchParams,
  totalRollPages,
}: {
  academy: DashboardAcademy;
  rolls: DashboardRoll[];
  rollsPage: number;
  search: string;
  searchParams: DashboardSearchParams;
  totalRollPages: number;
}) {
  const rows: RollRow[] = rolls.map((roll) => ({
    id: roll.id,
    title: roll.title,
    date: formatDate(roll.eventDate),
    time: `${roll.startTime}-${roll.endTime}`,
    giType: roll.giType.replace("_", "-"),
    price: coursePriceLabel(roll),
    courseType: roll.courseType,
  }));
  const columns: TableColumn<RollRow>[] = [
    {
      key: "title",
      title: "Roll",
      render: (value) => <span className="font-black text-slate-950">{String(value)}</span>,
    },
    { key: "date", title: "Date" },
    { key: "time", title: "Time" },
    { key: "giType", title: "Format" },
    { key: "price", title: "Price" },
  ];

  return (
    <div>
      <div>
        <div>
          <p className="text-sm font-bold uppercase text-teal-800">Dashboard</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">{academy?.name ?? "No Academy Assigned"}</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            {academy ? "Search and view upcoming courses/events for your assigned academy in read-only mode." : "No academy is assigned to your account yet."}
          </p>
        </div>
      </div>

      <section className="mt-6">
        <form action="/dashboard" className="mb-4 flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
          <input type="hidden" name="panel" value="dashboard" />
          <label className="grid flex-1 gap-1 text-sm font-semibold text-stone-800">
            Search Courses/Events
            <span className="relative">
              <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input name="search" defaultValue={search} placeholder={academy ? "Search by title, description, or format" : "No academy assigned"} disabled={!academy} className="min-h-11 w-full rounded-md border border-stone-300 px-10 text-base font-normal disabled:bg-stone-50" />
            </span>
          </label>
          <button className="min-h-11 rounded-md bg-stone-950 px-5 text-sm font-bold text-white disabled:bg-stone-300" disabled={!academy}>
            Search
          </button>
          {search ? (
            <Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-md border border-stone-300 px-5 text-sm font-bold text-stone-800 hover:bg-stone-50">
              Clear
            </Link>
          ) : null}
        </form>

        <Table
          title="Courses/Events"
          columns={columns}
          data={rows}
          emptyMessage={academy ? "No upcoming courses/events match this academy search." : "No academy is assigned, so no courses/events data can be shown."}
          getRowHref={(row) => courseHref(row)}
          getRowId={(row) => row.id}
          pagination={{
            page: rollsPage,
            totalPages: totalRollPages,
            previousHref: standardDashboardHref(searchParams, { panel: "dashboard", rollsPage: rollsPage - 1 }),
            nextHref: standardDashboardHref(searchParams, { panel: "dashboard", rollsPage: rollsPage + 1 }),
          }}
        />
      </section>
    </div>
  );
}

function ProfilePanel({ academy, active, user }: { academy: DashboardAcademy; active: boolean; user: DashboardUser }) {
  return (
    <div>
      <p className="text-sm font-bold uppercase text-teal-800">Profile</p>
      <h1 className="mt-1 text-3xl font-black text-slate-950">Profile</h1>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">User Information</h2>
          <dl className="mt-4 grid gap-4 text-sm">
            <ProfileRow label="Name" value={user.name ?? user.email} />
            <ProfileRow label="Email" value={user.email} />
            <ProfileRow label="Role" value={roleLabel(user.role)} />
            <ProfileRow label="Status" value={active ? "Active" : "Disabled"} />
            <ProfileRow label="Joined" value={formatDate(user.createdAt)} />
          </dl>
          <div className="mt-5 flex items-center gap-2 rounded-md bg-teal-50 px-3 py-2 text-sm font-bold text-teal-800">
            <ShieldCheck size={18} aria-hidden />
            Read-only academy access
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Academy Information</h2>
          <div className="mt-4 flex items-start gap-3">
            <MapPin size={20} aria-hidden className="mt-0.5 shrink-0 text-teal-700" />
            <div className="min-w-0">
              <p className="font-black text-slate-950">{academy?.name ?? "No academy assigned"}</p>
              <p className="mt-1 text-sm text-slate-600">{academy ? `${academy.address}, ${academy.city}, ${academy.postcode}` : "Academy data is unavailable until assignment."}</p>
              {academy?.website ? (
                <p className="mt-2 break-words text-sm font-semibold text-slate-700">{academy.website}</p>
              ) : null}
            </div>
          </div>
          {academy ? (
            <Link href={`/academies/${academy.slug}`} className="mt-5 inline-flex rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-slate-800 hover:bg-stone-50">
              View Academy
            </Link>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function SettingsPanel({ academy, searchParams, user }: { academy: DashboardAcademy; searchParams: DashboardSearchParams; user: DashboardUser }) {
  const activeAction = settingsAction(firstParam(searchParams.settingsAction));
  const settingsItems: QuickActionPanelItem[] = [
    {
      active: activeAction === "change-password",
      id: "change-password",
      title: "Change Password",
      description: "Set a new password for your account.",
      href: "/dashboard?panel=settings&settingsAction=change-password",
      icon: <KeyRound size={22} aria-hidden />,
    },
    {
      active: activeAction === "edit-profile",
      id: "edit-profile",
      title: "Edit Profile",
      description: "Update your personal display name.",
      href: "/dashboard?panel=settings&settingsAction=edit-profile",
      icon: <Edit3 size={22} aria-hidden />,
    },
  ];
  const detailTitle = activeAction === "change-password" ? "Change Password" : activeAction === "edit-profile" ? "Edit Profile" : "Select an account action";
  const detailIcon = activeAction === "change-password" ? <KeyRound size={20} aria-hidden className="text-teal-700" /> : activeAction === "edit-profile" ? <UserRound size={20} aria-hidden className="text-teal-700" /> : null;
  const active = user.status !== UserStatus.DISABLED && !user.disabled;

  return (
    <div>
      <p className="text-sm font-bold uppercase text-teal-800">Settings</p>
      <h1 className="mt-1 text-3xl font-black text-slate-950">Settings</h1>
      <QuickActionPanel title="Account Actions" items={settingsItems} className="mt-6" />
      <section className="mt-7 min-h-72 rounded-lg border border-teal-300 bg-teal-50/20 p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          {detailIcon}
          <h2 className="text-xl font-black text-slate-950">{detailTitle}</h2>
        </div>
        {activeAction === "change-password" ? (
          <ChangePasswordForm cancelHref="/dashboard?panel=settings" embedded />
        ) : null}
        {activeAction === "edit-profile" ? (
          <EditProfileForm
            academyName={academy?.name ?? "No academy assigned"}
            cancelHref="/dashboard?panel=settings"
            email={user.email}
            name={user.name}
            roleLabel={roleLabel(user.role)}
            statusLabel={active ? "Active" : "Disabled"}
          />
        ) : null}
        {!activeAction ? (
          <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm font-semibold text-slate-600 shadow-sm">
            Choose Change Password or Edit Profile to open the form here.
          </p>
        ) : null}
      </section>
    </div>
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
