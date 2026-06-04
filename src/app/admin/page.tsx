import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, CalendarDays, ChevronDown, ChevronRight, HelpCircle, Home, LogOut, Mail, Map, Menu, RefreshCw, Search, Send, Settings, ShieldCheck, Users, X } from "lucide-react";
import { getCurrentUser, isPlatformAdminRole } from "@/lib/admin";
import { getMapItems } from "@/lib/data";
import { getEmailProvisioningConfig } from "@/lib/email-provisioning";
import { prisma } from "@/lib/prisma";
import { AcademyVerificationStatus, Role, UserStatus, type Prisma } from "@prisma/client";
import { formatDate } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Admin Dashboard",
  description: "Manage RollFinders academies, open mats, users, email delivery, and platform operations.",
};

const pageSize = 8;

type AdminSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageFromParams(searchParams: AdminSearchParams, key: string) {
  const value = Number(firstParam(searchParams[key]) ?? "1");
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function clampPage(page: number, totalItems: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return Math.min(page, totalPages);
}

function selectedPanel(value: string | undefined) {
  if (value === "open-mats" || value === "users" || value === "settings" || value === "maps") return value;
  return "academies";
}

function matchingAcademyVerificationStatus(search: string) {
  const value = search.trim().toUpperCase();
  return Object.values(AcademyVerificationStatus).includes(value as AcademyVerificationStatus) ? value as AcademyVerificationStatus : null;
}

function matchingRole(search: string) {
  const value = search.trim().toUpperCase().replaceAll(" ", "_").replaceAll("-", "_");
  return Object.values(Role).includes(value as Role) ? value as Role : null;
}

function matchingUserStatus(search: string) {
  const value = search.trim().toUpperCase();
  return Object.values(UserStatus).includes(value as UserStatus) ? value as UserStatus : null;
}

function pageHref(searchParams: AdminSearchParams, key: string, page: number) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([paramKey, value]) => {
    if (!value || paramKey === key) return;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(paramKey, item));
      return;
    }
    params.set(paramKey, value);
  });
  if (page > 1) params.set(key, String(page));
  if (!params.get("panel")) params.set("panel", selectedPanel(firstParam(searchParams.panel)));
  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  if (!isPlatformAdminRole(currentUser.role)) {
    redirect("/");
  }
  const account = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { name: true, email: true, role: true },
  });
  const params = await searchParams;
  const panel = selectedPanel(firstParam(params.panel));
  const search = (firstParam(params.search) ?? "").trim();
  const emailConfig = getEmailProvisioningConfig();

  const academyPage = pageFromParams(params, "academiesPage");
  const eventPage = pageFromParams(params, "eventsPage");
  const userPage = pageFromParams(params, "usersPage");
  const academyVerificationSearch = matchingAcademyVerificationStatus(search);
  const roleSearch = matchingRole(search);
  const userStatusSearch = matchingUserStatus(search);

  const academyWhere: Prisma.AcademyWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { city: { contains: search, mode: "insensitive" } },
          { borough: { contains: search, mode: "insensitive" } },
          { postcode: { contains: search, mode: "insensitive" } },
          ...(academyVerificationSearch ? [{ verificationStatus: academyVerificationSearch }] : []),
        ],
      }
    : {};
  const eventWhere: Prisma.EventWhereInput = {
    active: true,
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { startTime: { contains: search, mode: "insensitive" } },
            { endTime: { contains: search, mode: "insensitive" } },
            { academy: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const userWhere: Prisma.UserWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { academy: { name: { contains: search, mode: "insensitive" } } },
          ...(roleSearch ? [{ role: roleSearch }] : []),
          ...(userStatusSearch ? [{ status: userStatusSearch }] : []),
        ],
      }
    : {};

  const [academyCount, totalAcademyCount, verifiedAcademyCount, pendingAcademyCount, totalUserCount, activeEventCount, userCount, outboundEmailCount, failedEmailCount, invalidEmailCount] = await Promise.all([
    prisma.academy.count({ where: academyWhere }),
    prisma.academy.count(),
    prisma.academy.count({ where: { verificationStatus: AcademyVerificationStatus.VERIFIED } }),
    prisma.academy.count({ where: { verificationStatus: AcademyVerificationStatus.PENDING } }),
    prisma.user.count(),
    prisma.event.count({ where: eventWhere }),
    prisma.user.count({ where: userWhere }),
    prisma.outboundEmail.count(),
    prisma.outboundEmail.count({ where: { status: { in: ["FAILED", "RETRY_PENDING", "INVALID_EMAIL", "PERMANENTLY_FAILED"] } } }),
    prisma.invalidEmailAddress.count(),
  ]);

  const currentAcademyPage = clampPage(academyPage, academyCount);
  const currentEventPage = clampPage(eventPage, activeEventCount);
  const currentUserPage = clampPage(userPage, userCount);

  const [
    academies,
    events,
    users,
    recentAuditLogs,
    mapItems,
  ] = await Promise.all([
    prisma.academy.findMany({
      where: academyWhere,
      skip: (currentAcademyPage - 1) * pageSize,
      take: pageSize,
      orderBy: { name: "asc" },
    }),
    prisma.event.findMany({
      skip: (currentEventPage - 1) * pageSize,
      take: pageSize,
      where: eventWhere,
      include: { academy: true },
      orderBy: { eventDate: "asc" },
    }),
    prisma.user.findMany({
      where: userWhere,
      skip: (currentUserPage - 1) * pageSize,
      take: pageSize,
      include: { academy: true },
      orderBy: [{ createdAt: "desc" }, { email: "asc" }],
    }),
    prisma.adminAuditLog.findMany({
      take: 8,
      include: { actor: true, target: true },
      orderBy: { createdAt: "desc" },
    }),
    panel === "maps" ? getMapItems() : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen bg-[#f8faf7] text-slate-900">
      <input id="admin-mobile-menu" type="checkbox" className="peer sr-only" aria-hidden />
      <label htmlFor="admin-mobile-menu" className="fixed inset-0 z-40 hidden bg-slate-950/40 peer-checked:block lg:hidden" aria-label="Close admin menu" />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(22rem,88vw)] -translate-x-full flex-col border-r border-stone-200 bg-white shadow-2xl transition-transform duration-200 peer-checked:translate-x-0 lg:hidden">
        <AdminSidebar panel={panel} showClose />
      </aside>

      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-stone-200 bg-white lg:flex lg:flex-col">
        <AdminSidebar panel={panel} />
      </aside>

      <main className="lg:pl-72">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b border-stone-200 bg-white px-4 sm:px-8 lg:min-h-24 lg:justify-end">
          <label htmlFor="admin-mobile-menu" className="inline-flex size-11 items-center justify-center rounded-md border border-stone-200 text-slate-700 lg:hidden" aria-label="Open admin menu">
            <Menu size={22} aria-hidden />
          </label>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-teal-100 text-sm font-black text-teal-800" aria-hidden>{initials(account?.name ?? account?.email ?? currentUser.email)}</div>
              <div>
                <p className="font-black text-slate-950">{account?.name ?? currentUser.email}</p>
                <p className="text-sm font-semibold text-slate-500">{roleLabel(account?.role ?? currentUser.role)}</p>
              </div>
              <ChevronDown size={18} aria-hidden />
            </div>
          </div>
        </header>

        {panel === "settings" ? (
          <SettingsDashboardContent
            emailConfig={emailConfig}
            failedEmailCount={failedEmailCount}
            invalidEmailCount={invalidEmailCount}
            outboundEmailCount={outboundEmailCount}
            recentAuditLogs={recentAuditLogs}
          />
        ) : panel === "maps" ? (
          <MapDashboardContent academies={mapItems} />
        ) : (
        <section className="px-4 py-8 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-950">Admin Dashboard</h1>
              <p className="mt-2 text-slate-600">Review platform health and manage operational records.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard color="teal" icon={<Building2 size={34} aria-hidden />} label="Total Academies" trend="8% vs last 7 days" value={totalAcademyCount} />
            <StatCard color="teal" icon={<ShieldCheck size={34} aria-hidden />} label="Verified Academies" trend="15% vs last 7 days" value={verifiedAcademyCount} />
            <StatCard color="orange" icon={<CalendarDays size={34} aria-hidden />} label="Pending Verification" trend="12% vs last 7 days" value={pendingAcademyCount} />
            <StatCard color="blue" icon={<Users size={34} aria-hidden />} label="Total Users" trend="6% vs last 7 days" value={totalUserCount} />
            <StatCard color="violet" icon={<CalendarDays size={34} aria-hidden />} label="Open Mats" trend="20% vs last 7 days" value={activeEventCount} />
          </div>

          <h2 className="mt-7 text-xl font-black text-slate-950">Quick Actions</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <ActionCard active={panel === "academies"} description="Search, verify and manage academies" href="/admin?panel=academies" icon={<Building2 size={24} aria-hidden />} title="Manage Academies" />
            <ActionCard active={panel === "open-mats"} description="Create, edit and manage events" href="/admin?panel=open-mats" icon={<CalendarDays size={24} aria-hidden />} title="Manage Open Mats" />
            <ActionCard active={panel === "users"} description="Create, edit and manage users" href="/admin?panel=users" icon={<Users size={24} aria-hidden />} title="Manage Users" />
          </div>

          <div className="mt-7 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          {panel === "academies" ? (
            <AdminPanel
              description="Newest operational slice of academy records."
              id="academies"
              search={<PanelSearch panel={panel} search={search} />}
              title="Academies"
            >
              <AcademiesTable academies={academies} />
              <Pagination currentPage={currentAcademyPage} totalItems={academyCount} pageKey="academiesPage" searchParams={params} />
            </AdminPanel>
          ) : null}
          {panel === "open-mats" ? (
            <AdminPanel
              description="Active open mat events ordered by event date."
              id="open-mats"
              search={<PanelSearch panel={panel} search={search} />}
              title="Open Mats"
            >
              <OpenMatsTable events={events} />
              <Pagination currentPage={currentEventPage} totalItems={activeEventCount} pageKey="eventsPage" searchParams={params} />
            </AdminPanel>
          ) : null}
          {panel === "users" ? (
            <AdminPanel
              description="Newest operational slice of user records and role assignments."
              id="users"
              search={<PanelSearch panel={panel} search={search} />}
              title="Users & Roles"
            >
              <UsersTable users={users} />
              <Pagination currentPage={currentUserPage} totalItems={userCount} pageKey="usersPage" searchParams={params} />
            </AdminPanel>
          ) : null}
          </div>
        </section>
        )}
      </main>
    </div>
  );
}

function PanelSearch({ panel, search }: { panel: string; search: string }) {
  return (
    <form action="/admin" className="flex min-w-0 gap-2">
      <input type="hidden" name="panel" value={panel} />
      <input
        name="search"
        defaultValue={search}
        placeholder="Search"
        className="min-h-12 min-w-0 flex-1 rounded-md border border-stone-300 px-4 text-sm"
      />
      <button className="inline-flex min-h-12 w-14 items-center justify-center rounded-md bg-teal-700 text-white" aria-label="Search">
        <Search size={20} aria-hidden />
      </button>
    </form>
  );
}

function AdminSidebar({ panel, showClose }: { panel: string; showClose?: boolean }) {
  return (
    <>
      <div className="flex h-24 items-center gap-3 border-b border-stone-200 px-7">
        <Image src="/logo.png" alt="" width={52} height={52} className="h-12 w-auto" />
        <p className="text-2xl font-black text-slate-950">RollFinders</p>
        {showClose ? (
          <label htmlFor="admin-mobile-menu" className="ml-auto inline-flex size-10 items-center justify-center rounded-md border border-stone-200 text-slate-600" aria-label="Close admin menu">
            <X size={20} aria-hidden />
          </label>
        ) : null}
      </div>
      <nav className="flex flex-1 flex-col gap-2 px-4 py-7 text-sm font-bold text-slate-600">
        <AdminNavItem active={panel !== "settings" && panel !== "maps"} href="/admin" icon={<Home size={20} aria-hidden />}>Dashboard</AdminNavItem>
        <AdminNavItem active={panel === "settings"} href="/admin?panel=settings" icon={<Settings size={20} aria-hidden />}>Settings</AdminNavItem>
        <div className="my-5 border-t border-stone-200" />
        <AdminNavItem active={panel === "maps"} href="/admin?panel=maps" icon={<Map size={20} aria-hidden />}>Map</AdminNavItem>
      </nav>
      <div className="grid gap-2 border-t border-stone-200 px-4 py-5 text-sm font-bold text-slate-600">
        <AdminNavItem href="/contact" icon={<HelpCircle size={20} aria-hidden />}>Help & Support</AdminNavItem>
        <div className="flex min-h-12 items-center gap-3 rounded-md px-3">
          <LogOut size={20} aria-hidden />
          <LogoutButton />
        </div>
      </div>
    </>
  );
}

function AdminNavItem({ active, children, href, icon }: { active?: boolean; children: React.ReactNode; href: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className={`flex min-h-12 items-center gap-3 rounded-md px-3 ${active ? "bg-teal-50 text-teal-800" : "hover:bg-stone-50"}`}>
      {icon}
      {children}
    </Link>
  );
}

function StatCard({ color, icon, label, trend, value }: { color: "blue" | "orange" | "teal" | "violet"; icon: React.ReactNode; label: string; trend: string; value: number }) {
  const colorClass = {
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    teal: "bg-teal-50 text-teal-700",
    violet: "bg-violet-50 text-violet-600",
  }[color];

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`flex size-16 shrink-0 items-center justify-center rounded-full ${colorClass}`}>{icon}</div>
        <div>
          <p className="text-sm font-bold text-slate-600">{label}</p>
          <p className="mt-1 text-3xl font-black text-slate-950">{value.toLocaleString()}</p>
          <p className="mt-2 text-xs font-bold text-emerald-600">↗ {trend}</p>
        </div>
      </div>
    </section>
  );
}

function ActionCard({ active, description, href, icon, title }: { active?: boolean; description: string; href: string; icon: React.ReactNode; title: string }) {
  return (
    <Link href={href} className={`flex min-h-24 items-center gap-4 rounded-lg border bg-white p-4 shadow-sm transition hover:border-teal-500 ${active ? "border-teal-500" : "border-stone-200"}`}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-black text-slate-950">{title}</span>
        <span className="mt-1 block text-sm font-semibold text-slate-500">{description}</span>
      </span>
      <ChevronRight size={20} aria-hidden />
    </Link>
  );
}

type SettingsAuditLog = {
  id: string;
  action: string;
  createdAt: Date;
  actor: { email: string };
  target: { email: string } | null;
};

function SettingsDashboardContent({
  emailConfig,
  failedEmailCount,
  invalidEmailCount,
  outboundEmailCount,
  recentAuditLogs,
}: {
  emailConfig: ReturnType<typeof getEmailProvisioningConfig>;
  failedEmailCount: number;
  invalidEmailCount: number;
  outboundEmailCount: number;
  recentAuditLogs: SettingsAuditLog[];
}) {
  return (
    <section className="px-4 py-8 sm:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Settings</h1>
          <p className="mt-2 text-slate-600">Manage email operations, audit activity, and future application settings.</p>
        </div>
        <Link href="/admin?panel=settings" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-800">
          <RefreshCw size={16} aria-hidden /> Refresh
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <SettingsCard accent="teal" icon={<Mail size={22} aria-hidden />} title="Emails Overview">
          <Info label="Provider" value={emailConfig.provider} />
          <Info label="Outbound Emails" value={outboundEmailCount.toLocaleString()} />
          <Info label="Email Attention" value={failedEmailCount.toLocaleString()} />
          <Info label="Invalid Emails" value={invalidEmailCount.toLocaleString()} />
          <CardLink href="/admin?panel=settings">View email settings</CardLink>
        </SettingsCard>

        <SettingsCard accent="violet" icon={<ShieldCheck size={22} aria-hidden />} title="Recent Audits">
          {recentAuditLogs.length ? (
            recentAuditLogs.map((log) => (
              <div key={log.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-stone-100 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-stone-950">{sentenceCase(log.action)}</p>
                  <p className="truncate text-sm text-stone-600">{log.actor.email}{log.target ? ` -> ${log.target.email}` : ""}</p>
                </div>
                <p className="shrink-0 text-xs font-semibold text-stone-500">{formatDate(log.createdAt)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-stone-600">No audit activity yet.</p>
          )}
          <CardLink href="/admin?panel=settings">View all audits</CardLink>
        </SettingsCard>

        <SettingsCard accent="blue" icon={<Settings size={22} aria-hidden />} title="Application Settings">
          <p className="max-w-sm text-sm font-semibold leading-6 text-stone-700">Configure future platform behavior and system preferences.</p>
          <div className="mx-auto my-8 flex size-24 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
            <Settings size={48} aria-hidden />
          </div>
          <p className="mx-auto max-w-xs text-center text-sm font-bold leading-6 text-stone-700">Application settings will be available here when configuration requirements are ready.</p>
          <CardLink href="/admin?panel=settings">Learn more</CardLink>
        </SettingsCard>
      </div>

      <section className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-blue-950">What&apos;s coming next?</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-blue-900">More application settings and configuration controls will be available here. We&apos;re working on bringing powerful tools to manage your platform better.</p>
          </div>
          <Send className="hidden text-blue-300 sm:block" size={56} aria-hidden />
        </div>
      </section>
    </section>
  );
}

function SettingsCard({ accent, children, icon, title }: { accent: "blue" | "teal" | "violet"; children: React.ReactNode; icon: React.ReactNode; title: string }) {
  const accentClass = {
    blue: "border-blue-200 text-blue-700",
    teal: "border-teal-100 text-teal-700",
    violet: "border-violet-200 text-violet-700",
  }[accent];

  return (
    <section className={`rounded-lg border bg-white p-4 shadow-sm ${accentClass}`}>
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-md bg-current/10">{icon}</span>
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-stone-100 py-3">
      <p className="text-sm font-bold text-teal-800">{label}</p>
      <p className="mt-1 break-all font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function CardLink({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-teal-800">
      {children} <ArrowRight size={16} aria-hidden />
    </Link>
  );
}

function sentenceCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

type MapItem = Awaited<ReturnType<typeof getMapItems>>[number];

function MapDashboardContent({ academies }: { academies: MapItem[] }) {
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const center = "51.5072,-0.1276";

  return (
    <section className="px-4 py-8 sm:px-8">
      <h1 className="text-3xl font-black text-slate-950">Map</h1>
      <p className="mt-2 max-w-3xl text-slate-600">Scan London by training opportunity, not just club location. See nearby academies, upcoming open mats, and details before you travel.</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="min-h-[480px] overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          {googleKey ? (
            <iframe
              title="London BJJ academies map"
              className="h-[480px] w-full"
              loading="lazy"
              src={`https://www.google.com/maps/embed/v1/search?key=${googleKey}&q=Brazilian%20Jiu%20Jitsu%20London&center=${center}&zoom=11`}
            />
          ) : (
            <div className="map-grid flex h-[480px] items-center justify-center p-6 text-center">
              <div className="rounded-lg bg-white p-5 shadow-sm">
                <p className="font-bold text-stone-950">Google Maps key not configured</p>
                <p className="mt-2 max-w-sm text-sm text-stone-600">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the embedded map. Listings remain available below.</p>
              </div>
            </div>
          )}
        </div>
        <div className="grid max-h-[480px] gap-3 overflow-auto pr-1">
          {academies.map((academy) => (
            <Link key={academy.id} href={`/academies/${academy.slug}`} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
              <p className="font-bold text-stone-950">{academy.name}</p>
              <p className="text-sm text-stone-600">{academy.borough ?? academy.city}, {academy.postcode}</p>
              {academy.events[0] ? <p className="mt-2 text-xs font-semibold text-teal-800">{academy.events[0].title} · {formatDate(academy.events[0].eventDate)}</p> : null}
            </Link>
          ))}
          {!academies.length ? (
            <div className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600 shadow-sm">No map listings are available yet.</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function initials(value: string) {
  return value.split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function roleLabel(role: string) {
  if (role === Role.SUPER_ADMIN || role === Role.ADMIN) return "Super Admin";
  if (role === Role.PLATFORM_ADMIN) return "Platform Admin";
  if (role === Role.ACADEMY_ADMIN) return "Academy Admin";
  return "Standard User";
}

function AdminPanel({ title, description, children, id, search }: { title: string; description: string; children: React.ReactNode; id?: string; search: React.ReactNode }) {
  return (
    <section id={id}>
      <div className="grid gap-4 border-b border-stone-100 pb-4 lg:grid-cols-[minmax(240px,360px)_1fr] lg:items-start">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-black text-stone-950">{title}</h2>
          <p className="text-sm text-stone-600">{description}</p>
        </div>
        {search}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

type AcademyRow = {
  id: string;
  name: string;
  borough: string | null;
  city: string;
  postcode: string;
  verified: boolean;
  verificationStatus: string;
  featured: boolean;
};

type OpenMatRow = {
  id: string;
  title: string;
  eventDate: Date;
  startTime: string;
  endTime: string;
  giType: string;
  price: { toString(): string };
  capacity: number | null;
  active: boolean;
  academy: { name: string };
};

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  status: UserStatus;
  disabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  academy: { name: string } | null;
};

function AcademiesTable({ academies }: { academies: AcademyRow[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead className="bg-stone-50 text-xs font-bold uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Postcode</th>
            <th className="px-4 py-3">Verification</th>
            <th className="px-4 py-3">Featured</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {academies.map((academy) => (
            <tr key={academy.id} className="border-t border-stone-100">
              <td className="px-4 py-3 font-semibold text-stone-950">{academy.name}</td>
              <td className="px-4 py-3 text-stone-700">{academy.borough ?? academy.city}</td>
              <td className="px-4 py-3 text-stone-700">{academy.postcode}</td>
              <td className="px-4 py-3"><Badge>{academy.verificationStatus}</Badge></td>
              <td className="px-4 py-3"><Badge>{academy.featured ? "Featured" : "No"}</Badge></td>
              <td className="px-4 py-3">
                <Link href={`/admin/academies/${academy.id}`} className="rounded-md border border-stone-300 px-3 py-2 text-xs font-bold text-stone-800">Edit</Link>
              </td>
            </tr>
          ))}
          {!academies.length ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-stone-600">No academies to show.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function UsersTable({ users }: { users: UserRow[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse text-left text-sm">
        <thead className="bg-stone-50 text-xs font-bold uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Academy</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Last Login</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t border-stone-100">
              <td className="px-4 py-3">
                <p className="font-semibold text-stone-950">{user.name ?? user.email}</p>
                <p className="break-all text-stone-600">{user.email}</p>
              </td>
              <td className="px-4 py-3"><Badge>{user.role}</Badge></td>
              <td className="px-4 py-3 text-stone-700">{user.academy?.name ?? "None"}</td>
              <td className="px-4 py-3"><Badge>{user.status === UserStatus.DISABLED || user.disabled ? "Disabled" : "Active"}</Badge></td>
              <td className="px-4 py-3 text-stone-700">{user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}</td>
              <td className="px-4 py-3 text-stone-700">{formatDate(user.createdAt)}</td>
              <td className="px-4 py-3">
                <Link href={`/admin/users/${user.id}`} className="rounded-md border border-stone-300 px-3 py-2 text-xs font-bold text-stone-800">Edit</Link>
              </td>
            </tr>
          ))}
          {!users.length ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-stone-600">No users to show.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function OpenMatsTable({ events }: { events: OpenMatRow[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse text-left text-sm">
        <thead className="bg-stone-50 text-xs font-bold uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Academy</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Gi Type</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Capacity</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-t border-stone-100">
              <td className="px-4 py-3 font-semibold text-stone-950">{event.title}</td>
              <td className="px-4 py-3 text-stone-700">{event.academy.name}</td>
              <td className="px-4 py-3 text-stone-700">{formatDate(event.eventDate)}</td>
              <td className="px-4 py-3 text-stone-700">{event.startTime}-{event.endTime}</td>
              <td className="px-4 py-3"><Badge>{event.giType.replace("_", "-")}</Badge></td>
              <td className="px-4 py-3 text-stone-700">£{Number(event.price.toString()).toFixed(2)}</td>
              <td className="px-4 py-3 text-stone-700">{event.capacity ?? "None"}</td>
              <td className="px-4 py-3"><Badge>{event.active ? "Active" : "Inactive"}</Badge></td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link href={`/open-mats/${event.id}`} className="rounded-md border border-stone-300 px-3 py-2 text-xs font-bold text-stone-800">View</Link>
                  <Link href={`/admin/open-mats/${event.id}`} className="rounded-md border border-stone-300 px-3 py-2 text-xs font-bold text-stone-800">Edit</Link>
                </div>
              </td>
            </tr>
          ))}
          {!events.length ? (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-stone-600">No open mats to show.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-md border border-stone-200 px-2 py-1 text-xs font-bold text-stone-700">{children}</span>;
}

function Pagination({
  currentPage,
  totalItems,
  pageKey,
  searchParams,
}: {
  currentPage: number;
  totalItems: number;
  pageKey: string;
  searchParams: AdminSearchParams;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-stone-600">
        Showing {start}-{end} of {totalItems}
      </p>
      <div className="flex gap-2">
        <PaginationLink disabled={currentPage <= 1} href={pageHref(searchParams, pageKey, currentPage - 1)}>Previous</PaginationLink>
        <span className="inline-flex min-h-9 items-center rounded-md border border-stone-200 px-3 text-xs font-bold text-stone-600">
          Page {currentPage} of {totalPages}
        </span>
        <PaginationLink disabled={currentPage >= totalPages} href={pageHref(searchParams, pageKey, currentPage + 1)}>Next</PaginationLink>
      </div>
    </div>
  );
}

function PaginationLink({ disabled, href, children }: { disabled: boolean; href: string; children: React.ReactNode }) {
  if (disabled) {
    return (
      <span className="inline-flex min-h-9 items-center rounded-md border border-stone-200 px-3 text-xs font-bold text-stone-400">
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className="inline-flex min-h-9 items-center rounded-md border border-stone-300 px-3 text-xs font-bold text-stone-800">
      {children}
    </Link>
  );
}
