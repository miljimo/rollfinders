import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, Ban, Building2, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Edit3, Eye, Filter, HelpCircle, Home, LogOut, Mail, Map, Menu, Plus, RefreshCw, Search, Send, Settings, ShieldCheck, Trash2, User, Users, X } from "lucide-react";
import { AcademyMap } from "@/components/AcademyMap";
import { elevatedAdminPrivacyAuditLogWhere, elevatedAdminPrivacyUserWhere, getCurrentUser, isPlatformAdminRole, isProtectedSuperAdmin, isSuperAdminRole } from "@/lib/admin";
import { getMapItems } from "@/lib/data";
import { getPlatformAdminActivitySummary, type PlatformAdminActivitySummary } from "@/lib/platform-admin-activity";
import { prisma } from "@/lib/prisma";
import { getEmailQueueOperationsSummary } from "@/lib/reliable-email";
import { AcademyVerificationStatus, ClaimStatus, Role, UserStatus, type Prisma } from "@prisma/client";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/Button";
import { LogoutButton } from "@/components/LogoutButton";
import { StatIndicator, type StatIndicatorTone } from "@/components/StatIndicator";
import { createAcademy, sendAcademyClaimReminder, sendBulkAcademyClaimReminders } from "./academies/actions";
import { AcademyForm } from "./academies/AcademyForm";
import { createOpenMat } from "./open-mats/actions";
import { OpenMatForm } from "./open-mats/OpenMatForm";
import { createManagedUser, deleteManagedUser, toggleManagedUserDisabled, updateManagedUser } from "./users/actions";
import { processEmailQueue } from "./actions";
import { UserForm } from "./users/UserForm";
import { ActionMenu } from "./ActionMenu";
import { fetchAcademyClaims, type AcademyClaimListItem } from "./academy-claims/api";
import { EmailOperationsPanel } from "./EmailOperationsPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Dashboard",
  description: "Manage RollFinders academies, open mats, users, email delivery, and platform operations.",
};

const pageSize = 8;
const claimPageSizes = [20, 50, 100];

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
  if (value === "open-mats" || value === "users" || value === "settings" || value === "maps" || value === "academy-claims") return value;
  return "academies";
}

function selectedClaimStatus(value: string | undefined) {
  if (!value || value === "all") return "all";
  return Object.values(ClaimStatus).includes(value as ClaimStatus) ? value : "all";
}

function selectedClaimPageSize(value: string | undefined) {
  const parsed = Number(value ?? "20");
  return claimPageSizes.includes(parsed) ? parsed : 20;
}

function selectedAcademyReminderFilter(value: string | undefined) {
  if (value === "eligible" || value === "recently-sent" || value === "unavailable") return value;
  return "all";
}

function selectedEmailOperationsView(value: string | undefined) {
  if (value === "attention" || value === "invalid-emails" || value === "queued" || value === "scheduled-retries") return value;
  return "runs";
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

function adminClaimsHref(searchParams: AdminSearchParams, overrides: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => item && params.append(key, item));
      return;
    }
    params.set(key, value);
  });
  params.set("panel", "academy-claims");
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === "all" || value === 1) {
      params.delete(key);
      return;
    }
    params.set(key, String(value));
  });
  params.set("panel", "academy-claims");
  return `/admin?${params.toString()}`;
}

function adminAcademiesHref(searchParams: AdminSearchParams, overrides: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => item && params.append(key, item));
      return;
    }
    params.set(key, value);
  });
  params.set("panel", "academies");
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === "all" || value === 1) {
      params.delete(key);
      return;
    }
    params.set(key, String(value));
  });
  params.set("panel", "academies");
  return `/admin?${params.toString()}`;
}

function claimApiParams({ page, pageSize, search, status }: { page: number; pageSize: number; search: string; status: string }) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (search) params.set("search", search);
  if (status !== "all") params.set("status", status);
  return params;
}

function claimPaginationPages(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);
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
  const dialog = firstParam(params.dialog);
  const userDialogId = firstParam(params.userId);
  const academyDialogId = firstParam(params.academyId);
  const selectedAcademyIds = Array.isArray(params.academyIds) ? params.academyIds : firstParam(params.academyIds) ? [firstParam(params.academyIds) as string] : [];
  const search = (firstParam(params.search) ?? "").trim();
  const superAdmin = isSuperAdminRole(currentUser.role);
  const platformAdmin = isPlatformAdminRole(currentUser.role);

  const academyPage = pageFromParams(params, "academiesPage");
  const eventPage = pageFromParams(params, "eventsPage");
  const userPage = pageFromParams(params, "usersPage");
  const claimPage = pageFromParams(params, "claimsPage");
  const emailPage = pageFromParams(params, "emailPage");
  const claimPageSize = selectedClaimPageSize(firstParam(params.pageSize));
  const claimStatus = selectedClaimStatus(firstParam(params.status));
  const academyReminderFilter = selectedAcademyReminderFilter(firstParam(params.reminderFilter));
  const emailOperationsView = selectedEmailOperationsView(firstParam(params.emailView));
  const academyVerificationSearch = matchingAcademyVerificationStatus(search);
  const roleSearch = matchingRole(search);
  const userStatusSearch = matchingUserStatus(search);
  const reminderCooldownStart = new Date();
  reminderCooldownStart.setDate(reminderCooldownStart.getDate() - 30);
  const monthStart = startOfMonth(new Date());
  const weekStart = startOfWeek(new Date());

  const academySearchWhere: Prisma.AcademyWhereInput = search
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
  const academyReminderWhere: Prisma.AcademyWhereInput =
    academyReminderFilter === "eligible"
      ? {
          email: { not: null },
          members: { none: {} },
          claims: { none: { status: { in: [ClaimStatus.APPROVED, ClaimStatus.PENDING] } } },
          claimReminders: { none: { status: "QUEUED", createdAt: { gte: reminderCooldownStart } } },
        }
      : academyReminderFilter === "recently-sent"
        ? { claimReminders: { some: { status: "QUEUED", createdAt: { gte: reminderCooldownStart } } } }
        : academyReminderFilter === "unavailable"
          ? {
              OR: [
                { email: null },
                { email: "" },
                { members: { some: {} } },
                { claims: { some: { status: { in: [ClaimStatus.APPROVED, ClaimStatus.PENDING] } } } },
              ],
            }
          : {};
  const academyWhere: Prisma.AcademyWhereInput = { AND: [academySearchWhere, academyReminderWhere] };
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
  const userFilterWhere: Prisma.UserWhereInput = search
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
  const visibleUserWhere = elevatedAdminPrivacyUserWhere({ role: currentUser.role });
  const userWhere: Prisma.UserWhereInput = { AND: [visibleUserWhere, userFilterWhere] };

  const [
    academyCount,
    totalAcademyCount,
    verifiedAcademyCount,
    pendingAcademyCount,
    totalUserCount,
    activeEventCount,
    userCount,
    newAcademyCountThisMonth,
    verifiedAcademyCountThisMonth,
    newUserCountThisMonth,
    activeEventCountThisWeek,
    emailOperations,
  ] = await Promise.all([
    prisma.academy.count({ where: academyWhere }),
    prisma.academy.count(),
    prisma.academy.count({ where: { verificationStatus: AcademyVerificationStatus.VERIFIED } }),
    prisma.academy.count({ where: { verificationStatus: AcademyVerificationStatus.PENDING } }),
    prisma.user.count({ where: visibleUserWhere }),
    prisma.event.count({ where: eventWhere }),
    prisma.user.count({ where: userWhere }),
    prisma.academy.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.academy.count({ where: { verificationStatus: AcademyVerificationStatus.VERIFIED, updatedAt: { gte: monthStart } } }),
    prisma.user.count({ where: { AND: [visibleUserWhere, { createdAt: { gte: monthStart } }] } }),
    prisma.event.count({ where: { ...eventWhere, createdAt: { gte: weekStart } } }),
    getEmailQueueOperationsSummary(),
  ]);

  const currentAcademyPage = clampPage(academyPage, academyCount);
  const currentEventPage = clampPage(eventPage, activeEventCount);
  const currentUserPage = clampPage(userPage, userCount);
  const claimResult = panel === "academy-claims"
    ? await fetchAcademyClaims(claimApiParams({ page: claimPage, pageSize: claimPageSize, search, status: claimStatus }))
    : null;

  const [
    academies,
    events,
    users,
    recentAuditLogs,
    mapItems,
    academyOptions,
    platformAdminActivitySummary,
  ] = await Promise.all([
    prisma.academy.findMany({
      where: academyWhere,
      skip: (currentAcademyPage - 1) * pageSize,
      take: pageSize,
      orderBy: { name: "asc" },
      include: {
        claims: { select: { status: true } },
        members: { select: { id: true }, take: 1 },
        claimReminders: { orderBy: { createdAt: "desc" }, take: 1 },
      },
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
      where: elevatedAdminPrivacyAuditLogWhere({ role: currentUser.role }),
      take: 8,
      include: { actor: true, target: true },
      orderBy: { createdAt: "desc" },
    }),
    panel === "maps" ? getMapItems() : Promise.resolve([]),
    prisma.academy.findMany({ orderBy: { name: "asc" } }),
    getPlatformAdminActivitySummary(currentUser.id),
  ]);
  const selectedDialogUser = userDialogId ? users.find((user) => user.id === userDialogId) : undefined;
  const selectedReminderAcademy = academyDialogId
    ? await prisma.academy.findUnique({
        where: { id: academyDialogId },
        select: { id: true, name: true, email: true },
      })
    : null;
  const selectedBulkReminderAcademies = selectedAcademyIds.length
    ? await prisma.academy.findMany({
        where: { id: { in: selectedAcademyIds } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : [];

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
          <ActionMenu
            buttonClassName="inline-flex items-center gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50"
            label="Open account profile menu"
            menuClassName="absolute right-0 z-20 mt-3 w-80 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-xl"
            trigger={(
              <>
                <span className="flex size-11 items-center justify-center rounded-full bg-teal-100 text-sm font-black text-teal-800" aria-hidden>{initials(account?.name ?? account?.email ?? currentUser.email)}</span>
                <span className="hidden sm:block">
                  <span className="block font-black text-slate-950">{account?.name ?? currentUser.email}</span>
                  <span className="block text-sm font-semibold text-slate-500">{roleLabel(account?.role ?? currentUser.role)}</span>
                </span>
                <ChevronDown size={18} aria-hidden />
              </>
            )}
          >
            <div className="flex items-start gap-3 border-b border-stone-100 pb-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-full bg-teal-100 text-lg font-black text-teal-800" aria-hidden>{initials(account?.name ?? account?.email ?? currentUser.email)}</div>
              <div className="min-w-0">
                <p className="break-words text-lg font-black text-slate-950">{account?.name ?? currentUser.email}</p>
                <p className="mt-1 break-all text-sm font-semibold text-slate-500">{account?.email ?? currentUser.email}</p>
                <p className="mt-2 inline-flex rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-800">{roleLabel(account?.role ?? currentUser.role)}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <Link href="/admin?panel=settings" className="rounded-md px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Settings</Link>
              <LogoutButton />
            </div>
          </ActionMenu>
        </header>

        {panel === "settings" ? (
          <SettingsDashboardContent
            activeEmailPage={emailPage}
            activeEmailView={emailOperationsView}
            emailOperations={emailOperations}
            recentAuditLogs={recentAuditLogs}
          />
        ) : panel === "maps" ? (
          <MapDashboardContent academies={mapItems} />
        ) : (
        <section className="px-4 py-8 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-950">Dashboard</h1>
              <p className="mt-2 text-slate-600">Review platform health and manage operational records.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard color="teal" icon={<Building2 size={34} aria-hidden />} indicator={{ label: "new this month", value: newAcademyCountThisMonth }} label="Total Academies" value={totalAcademyCount} />
            <StatCard color="teal" icon={<ShieldCheck size={34} aria-hidden />} indicator={{ label: "verified this month", value: verifiedAcademyCountThisMonth }} label="Verified Academies" value={verifiedAcademyCount} />
            <StatCard color="orange" icon={<CalendarDays size={34} aria-hidden />} indicator={{ label: "pending review", tone: pendingAcademyCount > 0 ? "warning" : "neutral" }} label="Pending Verification" value={pendingAcademyCount} />
            <StatCard color="blue" icon={<Users size={34} aria-hidden />} indicator={{ label: "new this month", value: newUserCountThisMonth }} label="Total Users" value={totalUserCount} />
            <StatCard color="violet" icon={<CalendarDays size={34} aria-hidden />} indicator={{ label: "created this week", value: activeEventCountThisWeek }} label="Open Mats" value={activeEventCount} />
          </div>

          {platformAdminActivitySummary ? (
            <PlatformAdminActivitySummaryPanel summary={platformAdminActivitySummary} />
          ) : null}

          <h2 className="mt-7 text-xl font-black text-slate-950">Quick Actions</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <ActionCard active={panel === "academies"} description="Search, verify and manage academies" href="/admin?panel=academies" icon={<Building2 size={24} aria-hidden />} title="Manage Academies" />
            <ActionCard active={panel === "academy-claims"} description="Review ownership access requests" href="/admin?panel=academy-claims" icon={<ClipboardCheck size={24} aria-hidden />} title="Academy Claims" />
            <ActionCard active={panel === "open-mats"} description="Create, edit and manage events" href="/admin?panel=open-mats" icon={<CalendarDays size={24} aria-hidden />} title="Manage Open Mats" />
            <ActionCard active={panel === "users"} description="Create, edit and manage users" href="/admin?panel=users" icon={<Users size={24} aria-hidden />} title="Manage Users" />
          </div>

          <div className="mt-7 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          {panel === "academies" ? (
            <AdminPanel
              action={<AcademiesPanelActions params={params} reminderFilter={academyReminderFilter} />}
              description="Search academy records and send controlled claim reminders to eligible unclaimed academies."
              id="academies"
              search={<AcademiesPanelSearch reminderFilter={academyReminderFilter} search={search} />}
              title="Academies"
            >
              <ClaimInvitationResult params={params} />
              <ClaimReminderResult params={params} />
              <AcademiesTable academies={academies} params={params} />
              <Pagination currentPage={currentAcademyPage} totalItems={academyCount} pageKey="academiesPage" searchParams={params} />
            </AdminPanel>
          ) : null}
          {panel === "open-mats" ? (
            <AdminPanel
              action={(
                <Button href="/admin?panel=open-mats&dialog=new-open-mat" variant="primary" className="min-h-12 shadow-sm">
                  <Plus size={18} aria-hidden />
                  New Open Mat
                </Button>
              )}
              description="Active open mat events ordered by event date."
              id="open-mats"
              search={<PanelSearch panel={panel} search={search} />}
              title="Open Mats"
            >
              <OpenMatsTable events={events} />
              <Pagination currentPage={currentEventPage} totalItems={activeEventCount} pageKey="eventsPage" searchParams={params} />
            </AdminPanel>
          ) : null}
          {panel === "academy-claims" ? (
            <AdminPanel
              action={<ClaimsFilter status={claimStatus} pageSize={claimPageSize} search={search} />}
              description="Review academy ownership requests and grant access after evidence checks."
              id="academy-claims"
              search={<ClaimsPanelSearch pageSize={claimPageSize} search={search} status={claimStatus} />}
              title="Academy Claims"
            >
              <ClaimStatusFilters params={params} status={claimStatus} />
              {!claimResult ? null : !claimResult.ok ? (
                <ClaimsErrorState message={claimResult.message} status={claimResult.status} />
              ) : (
                <ClaimsTable claims={claimResult.data.items} page={claimResult.data.page} pageSize={claimResult.data.pageSize} params={params} totalItems={claimResult.data.totalItems} totalPages={claimResult.data.totalPages} />
              )}
            </AdminPanel>
          ) : null}
          {panel === "users" ? (
            <AdminPanel
              action={(
                <Button href="/admin?panel=users&dialog=new-user" variant="primary" className="min-h-12 shadow-sm">
                  <Plus size={18} aria-hidden />
                  New User
                </Button>
              )}
              description="Newest operational slice of user records and role assignments."
              id="users"
              search={<PanelSearch panel={panel} search={search} />}
              title="Users & Roles"
            >
              <UserResult params={params} />
              <UsersTable actorId={currentUser.id} actorRole={currentUser.role} users={users} />
              <Pagination currentPage={currentUserPage} totalItems={userCount} pageKey="usersPage" searchParams={params} />
            </AdminPanel>
          ) : null}
          </div>
        </section>
        )}
      </main>
      {panel === "users" && dialog === "new-user" ? (
        <NewUserDialog academies={academyOptions} superAdmin={superAdmin} />
      ) : null}
      {panel === "users" && dialog === "view-user" && selectedDialogUser ? (
        <ViewUserDialog user={selectedDialogUser} />
      ) : null}
      {panel === "users" && dialog === "edit-user" && selectedDialogUser ? (
        <EditUserDialog academies={academyOptions} superAdmin={superAdmin} user={selectedDialogUser} />
      ) : null}
      {panel === "academies" && dialog === "new-academy" && platformAdmin ? (
        <NewAcademyDialog />
      ) : null}
      {panel === "academies" && dialog === "claim-reminder" && selectedReminderAcademy ? (
        <ClaimReminderDialog academy={selectedReminderAcademy} closeHref={adminAcademiesHref(params, { dialog: undefined, academyId: undefined })} returnTo={adminAcademiesHref(params, { dialog: undefined, academyId: undefined })} />
      ) : null}
      {panel === "academies" && dialog === "bulk-claim-reminders" ? (
        <BulkClaimReminderDialog academies={selectedBulkReminderAcademies} closeHref={adminAcademiesHref(params, { dialog: undefined, academyIds: undefined })} returnTo={adminAcademiesHref(params, { dialog: undefined, academyIds: undefined })} />
      ) : null}
      {panel === "open-mats" && dialog === "new-open-mat" ? (
        <NewOpenMatDialog academies={academyOptions} />
      ) : null}
    </div>
  );
}

function ViewUserDialog({ user }: { user: UserRow }) {
  const disabled = user.status === UserStatus.DISABLED || user.disabled;
  return (
    <DialogShell closeHref="/admin?panel=users" description="Review this user profile and access details." title="User Profile">
      <div className="mt-6 grid gap-6">
        <div className="flex items-center gap-4">
          <div className={`grid size-16 shrink-0 place-items-center rounded-full text-xl font-black ring-1 ${avatarTone(user.email)}`}>
            {initials(user.name ?? user.email)}
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-950">{user.name ?? user.email}</h3>
            <p className="mt-1 break-all text-slate-600">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <RolePill role={user.role} />
              <StatusPill disabled={disabled} />
            </div>
          </div>
        </div>
        <div className="grid gap-4 border-t border-stone-100 pt-5 sm:grid-cols-2">
          <ProfileInfo label="Role" value={roleLabel(user.role)} />
          <ProfileInfo label="Academy" value={user.academy?.name ?? "None"} />
          <ProfileInfo label="Status" value={disabled ? "Disabled" : "Active"} />
          <ProfileInfo label="Last Login" value={user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"} />
          <ProfileInfo label="Created" value={formatDate(user.createdAt)} />
        </div>
      </div>
    </DialogShell>
  );
}

function EditUserDialog({ academies, superAdmin, user }: { academies: { id: string; name: string }[]; superAdmin: boolean; user: UserRow }) {
  return (
    <DialogShell closeHref="/admin?panel=users" description="Edit this user's details, role, status, and academy access." title="Edit User">
      <UserForm
        academies={academies}
        action={updateManagedUser.bind(null, user.id)}
        cancelHref="/admin?panel=users"
        mode="edit"
        returnTo="/admin?panel=users"
        superAdmin={superAdmin}
        user={{ name: user.name, email: user.email, role: user.role, status: user.status, academyId: user.academyId }}
      />
    </DialogShell>
  );
}

function ProfileInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function DialogShell({
  children,
  closeHref,
  description,
  maxWidthClass = "max-w-4xl",
  title,
}: {
  children: React.ReactNode;
  closeHref: string;
  description: string;
  maxWidthClass?: string;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-8 sm:py-12" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title">
      <Link href={closeHref} className="fixed inset-0" aria-label={`Close ${title} dialog`} />
      <section className={`relative z-[71] w-full rounded-lg bg-white p-5 shadow-2xl sm:p-6 ${maxWidthClass}`}>
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h2 id="admin-dialog-title" className="text-3xl font-black text-slate-950">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{description}</p>
          </div>
          <Button href={closeHref} size="icon" variant="secondary" className="shrink-0 border-stone-200 text-slate-600" aria-label={`Close ${title} dialog`}>
            <X size={20} aria-hidden />
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}

function NewAcademyDialog() {
  return (
    <DialogShell closeHref="/admin?panel=academies" description="Create an academy record without leaving the dashboard." maxWidthClass="max-w-6xl" title="New Academy">
      <AcademyForm action={createAcademy} cancelHref="/admin?panel=academies" returnTo="/admin?panel=academies" />
    </DialogShell>
  );
}

export function NewAcademyPanelAction() {
  return (
    <Button href="/admin?panel=academies&dialog=new-academy" variant="primary" className="min-h-12 shadow-sm">
      <Plus size={18} aria-hidden />
      New Academy
    </Button>
  );
}

function AcademiesPanelSearch({ reminderFilter, search }: { reminderFilter: string; search: string }) {
  return (
    <form action="/admin" className="flex min-w-0 gap-2">
      <input type="hidden" name="panel" value="academies" />
      {reminderFilter !== "all" ? <input type="hidden" name="reminderFilter" value={reminderFilter} /> : null}
      <input
        name="search"
        defaultValue={search}
        placeholder="Search academies"
        className="min-h-12 min-w-0 flex-1 rounded-md border border-stone-300 px-4 text-sm"
      />
      <Button type="submit" size="icon" variant="primary" className="min-h-12 w-14" aria-label="Search academies">
        <Search size={20} aria-hidden />
      </Button>
    </form>
  );
}

function AcademiesPanelActions({ params, reminderFilter }: { params: AdminSearchParams; reminderFilter: string }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        href={adminAcademiesHref(params, { reminderFilter: reminderFilter === "eligible" ? undefined : "eligible", academiesPage: 1 })}
        variant={reminderFilter === "eligible" ? "primary" : "secondary"}
        className="min-h-12 whitespace-nowrap"
      >
        <Mail size={18} aria-hidden />
        Unclaimed with valid email
      </Button>
      {reminderFilter !== "all" ? (
        <Button href={adminAcademiesHref(params, { reminderFilter: undefined, academiesPage: 1 })} variant="secondary" className="min-h-12 border-stone-200 text-slate-700">
          Reset filters
        </Button>
      ) : null}
      <NewAcademyPanelAction />
    </div>
  );
}

function ClaimReminderResult({ params }: { params: AdminSearchParams }) {
  const result = firstParam(params.claimReminderResult);
  if (!result) return null;
  const reason = firstParam(params.claimReminderReason);
  const queued = firstParam(params.queued) ?? "0";
  const skipped = firstParam(params.skipped) ?? "0";
  const failed = firstParam(params.failed) ?? "0";
  const message = result === "queued"
    ? "Claim reminder queued."
    : result === "skipped"
      ? `Claim reminder skipped${reason ? `: ${claimReminderReasonLabel(reason)}.` : "."}`
      : result === "failed"
        ? `Claim reminder failed${reason ? `: ${reason}.` : "."}`
        : result === "bulk"
          ? `${queued} queued. ${skipped} skipped. ${failed} failed.`
          : result === "none_selected"
            ? "Select at least one academy before sending claim reminders."
            : result === "batch_too_large"
              ? "Too many academies selected for one reminder batch."
              : result === "unauthorized"
                ? "You do not have permission to send claim reminders."
                : null;
  if (!message) return null;
  return (
    <div className="mt-4 rounded-md border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">
      {message}
    </div>
  );
}

function ClaimInvitationResult({ params }: { params: AdminSearchParams }) {
  const result = firstParam(params.claimInvitationResult);
  if (!result) return null;
  const reason = firstParam(params.claimInvitationReason);
  const message = result === "queued"
    ? "Academy saved and claim invitation queued."
    : result === "skipped"
      ? `Academy saved. Claim invitation skipped${reason ? `: ${claimReminderReasonLabel(reason)}.` : "."}`
      : result === "failed"
        ? `Academy saved. Claim invitation was not queued${reason ? `: ${reason}.` : "."}`
        : result === "not_sent"
          ? "Academy saved. Claim invitation not sent."
          : result === "unauthorized"
            ? "Academy saved. You do not have permission to send claim invitations."
            : null;
  if (!message) return null;
  return (
    <div className="mt-4 rounded-md border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">
      {message}
    </div>
  );
}

function UserResult({ params }: { params: AdminSearchParams }) {
  const result = firstParam(params.userResult);
  if (!result) return null;
  const email = firstParam(params.email);
  const message = result === "duplicate_email"
    ? `A user with ${email ?? "that email address"} already exists.`
    : null;
  if (!message) return null;
  return (
    <div className="mt-4 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
      {message}
    </div>
  );
}

function ClaimReminderDialog({ academy, closeHref, returnTo }: { academy: { id: string; name: string; email: string | null }; closeHref: string; returnTo: string }) {
  return (
    <DialogShell closeHref={closeHref} description="The backend will re-check claim status, email validity, suppression, and cooldown before queueing." title="Send claim reminder?">
      <div className="mt-6 grid gap-4">
        <p className="text-sm font-semibold leading-6 text-slate-700">
          This will queue a claim reminder for <strong>{academy.name}</strong>{academy.email ? <> at <strong>{academy.email}</strong></> : null}. The email links to the existing claim flow and does not grant access.
        </p>
        <form action={sendAcademyClaimReminder.bind(null, academy.id)} className="flex flex-wrap justify-end gap-3">
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button href={closeHref} variant="secondary">Cancel</Button>
          <Button type="submit" variant="primary">
            <Send size={18} aria-hidden />
            Queue reminder
          </Button>
        </form>
      </div>
    </DialogShell>
  );
}

function BulkClaimReminderDialog({ academies, closeHref, returnTo }: { academies: { id: string; name: string; email: string | null }[]; closeHref: string; returnTo: string }) {
  return (
    <DialogShell closeHref={closeHref} description="Selected academies will be checked again before any reminder is queued." title="Send claim reminders?">
      <div className="mt-6 grid gap-4">
        <p className="text-sm font-semibold leading-6 text-slate-700">
          Reminders will be attempted for {academies.length} selected {academies.length === 1 ? "academy" : "academies"}. Ineligible academies will be skipped with a reason.
        </p>
        {academies.length ? (
          <ul className="max-h-56 overflow-auto rounded-md border border-stone-200 text-sm">
            {academies.map((academy) => (
              <li key={academy.id} className="flex items-center justify-between gap-3 border-b border-stone-100 px-3 py-2 last:border-b-0">
                <span className="font-bold text-slate-900">{academy.name}</span>
                <span className="break-all text-slate-500">{academy.email ?? "No email"}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <form action={sendBulkAcademyClaimReminders} className="flex flex-wrap justify-end gap-3">
          <input type="hidden" name="returnTo" value={returnTo} />
          {academies.map((academy) => <input key={academy.id} type="hidden" name="academyIds" value={academy.id} />)}
          <Button href={closeHref} variant="secondary">Cancel</Button>
          <Button type="submit" variant="primary" disabled={!academies.length}>
            <Send size={18} aria-hidden />
            Queue {academies.length} reminders
          </Button>
        </form>
      </div>
    </DialogShell>
  );
}

function NewOpenMatDialog({ academies }: { academies: Awaited<ReturnType<typeof prisma.academy.findMany>> }) {
  return (
    <DialogShell closeHref="/admin?panel=open-mats" description="Create an open mat event without leaving the dashboard." title="New Open Mat">
      <OpenMatForm academies={academies} action={createOpenMat} cancelHref="/admin?panel=open-mats" returnTo="/admin?panel=open-mats" />
    </DialogShell>
  );
}

function NewUserDialog({ academies, superAdmin }: { academies: { id: string; name: string }[]; superAdmin: boolean }) {
  return (
    <DialogShell closeHref="/admin?panel=users" description="Create a user and assign role and academy access." title="New User">
      <UserForm
        academies={academies}
        action={createManagedUser}
        cancelHref="/admin?panel=users"
        mode="create"
        returnTo="/admin?panel=users"
        superAdmin={superAdmin}
      />
    </DialogShell>
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
      <Button type="submit" size="icon" variant="primary" className="min-h-12 w-14" aria-label="Search">
        <Search size={20} aria-hidden />
      </Button>
    </form>
  );
}

function ClaimsPanelSearch({ pageSize, search, status }: { pageSize: number; search: string; status: string }) {
  return (
    <form action="/admin" className="flex min-w-0 gap-2">
      <input type="hidden" name="panel" value="academy-claims" />
      {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
      {pageSize !== 20 ? <input type="hidden" name="pageSize" value={pageSize} /> : null}
      <input
        name="search"
        defaultValue={search}
        placeholder="Search by academy, requester, or email"
        className="min-h-12 min-w-0 flex-1 rounded-md border border-stone-300 px-4 text-sm"
      />
      <Button type="submit" size="icon" variant="primary" className="min-h-12 w-14" aria-label="Search claims">
        <Search size={20} aria-hidden />
      </Button>
    </form>
  );
}

function AdminSidebar({ panel, showClose }: { panel: string; showClose?: boolean }) {
  return (
    <>
      <div className="flex h-24 items-center gap-3 border-b border-stone-200 px-7">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2" aria-label="Go to RollFinders home">
          <Image src="/logo.png" alt="" width={52} height={52} className="h-12 w-auto" />
          <span className="text-2xl font-black text-slate-950">RollFinders</span>
        </Link>
        {showClose ? (
          <label htmlFor="admin-mobile-menu" className="ml-auto inline-flex size-10 items-center justify-center rounded-md border border-stone-200 text-slate-600" aria-label="Close admin menu">
            <X size={20} aria-hidden />
          </label>
        ) : null}
      </div>
      <nav className="flex flex-1 flex-col gap-2 px-4 py-7 text-sm font-bold text-slate-600">
        <AdminNavItem active={panel === "academies" || panel === "open-mats" || panel === "users"} href="/admin" icon={<Home size={20} aria-hidden />}>Dashboard</AdminNavItem>
        <AdminNavItem active={panel === "settings"} href="/admin?panel=settings" icon={<Settings size={20} aria-hidden />}>Settings</AdminNavItem>
        <div className="my-5 border-t border-stone-200" />
        <AdminNavItem active={panel === "academy-claims"} href="/admin?panel=academy-claims" icon={<ClipboardCheck size={20} aria-hidden />}>Academy Claims</AdminNavItem>
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

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function startOfWeek(date: Date) {
  const day = date.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  start.setUTCDate(start.getUTCDate() - diff);
  return start;
}

function StatCard({
  color,
  icon,
  indicator,
  label,
  value,
}: {
  color: "blue" | "orange" | "teal" | "violet";
  icon: React.ReactNode;
  indicator?: { label: string; tone?: StatIndicatorTone; value?: number | string };
  label: string;
  value: number;
}) {
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
          {indicator ? (
            <StatIndicator className="mt-2" label={indicator.label} tone={indicator.tone} value={indicator.value} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function PlatformAdminActivitySummaryPanel({ summary }: { summary: PlatformAdminActivitySummary }) {
  const goal = Math.max(summary.weeklyAcademyTarget, 0);
  const progress = goal > 0 ? Math.min(100, Math.round((summary.academiesCreated / goal) * 100)) : 100;
  const remainingLabel = summary.remainingAcademiesToTarget === 0 ? "Target reached" : `${summary.remainingAcademiesToTarget.toLocaleString()} remaining`;

  return (
    <section className="mt-7 rounded-lg border border-teal-100 bg-white p-5 shadow-sm" aria-labelledby="platform-admin-activity-title">
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-teal-800">Your contribution momentum</p>
              <h2 id="platform-admin-activity-title" className="mt-1 text-2xl font-black text-slate-950">Weekly activity summary</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">Current-week progress for your Platform Admin contribution events.</p>
            </div>
            <div className="rounded-md bg-teal-50 px-4 py-3 text-right">
              <p className="text-xs font-black uppercase text-teal-800">Academy goal</p>
              <p className="mt-1 text-2xl font-black text-teal-950">{summary.academiesCreated.toLocaleString()} / {goal.toLocaleString()}</p>
              <p className="text-sm font-bold text-teal-800">{remainingLabel}</p>
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-stone-100" aria-label={`${progress}% of weekly Academy contribution goal`}>
            <div className="h-full rounded-full bg-teal-700" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ActivityMetric label="Academies added" value={summary.academiesCreated} />
            <ActivityMetric label="Open Mats created" value={summary.openMatsCreated} />
            <ActivityMetric label="Academy Admins activated" value={summary.academyAdminsActivated} />
            <ActivityMetric label="Points this week" value={summary.pointsEarnedThisWeek} />
          </div>
        </div>

        <aside className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <p className="text-sm font-black text-slate-950">Suggested next action</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{summary.suggestedNextAction ?? "Review priority Academy coverage or add a useful Open Mat update."}</p>
          <div className="mt-4 border-t border-stone-200 pt-4">
            <p className="text-xs font-black uppercase text-slate-500">Total points</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{summary.totalPoints.toLocaleString()}</p>
          </div>
          {summary.showLowMomentumNudge ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-black text-amber-950">Contribution momentum needs attention</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-amber-900">No current-week contribution is recorded yet. Add an Academy, create an Open Mat, or review a claim to build momentum. Accounts with no recorded contribution may be reviewed manually by a Super Admin.</p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function ActivityMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-stone-100 bg-stone-50 p-4">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value.toLocaleString()}</p>
    </div>
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
  activeEmailPage,
  activeEmailView,
  emailOperations,
  recentAuditLogs,
}: {
  activeEmailPage: number;
  activeEmailView: "attention" | "invalid-emails" | "queued" | "runs" | "scheduled-retries";
  emailOperations: Awaited<ReturnType<typeof getEmailQueueOperationsSummary>>;
  recentAuditLogs: SettingsAuditLog[];
}) {
  return (
    <section className="px-4 py-8 sm:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Settings</h1>
          <p className="mt-2 text-slate-600">Manage email operations, audit activity, and future application settings.</p>
        </div>
        <Button href="/admin?panel=settings" variant="secondary">
          <RefreshCw size={16} aria-hidden /> Refresh
        </Button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <EmailOperationsPanel
          action={processEmailQueue}
          activePage={activeEmailPage}
          activeView={activeEmailView}
          attentionHref="/admin?panel=settings&emailView=attention"
          invalidEmailsHref="/admin?panel=settings&emailView=invalid-emails"
          queuedHref="/admin?panel=settings&emailView=queued"
          refreshHref="/admin?panel=settings"
          scheduledRetriesHref="/admin?panel=settings&emailView=scheduled-retries"
          settingsHref="/admin/settings"
          summary={emailOperations}
        />

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
  return (
    <section className="px-4 py-8 sm:px-8">
      <h1 className="text-3xl font-black text-slate-950">Map</h1>
      <p className="mt-2 max-w-3xl text-slate-600">Scan London by training opportunity, not just club location. See nearby academies, upcoming open mats, and details before you travel.</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="min-h-[480px] overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <AcademyMap academies={academies} />
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

function AdminPanel({ title, description, action, children, id, search }: { title: string; description: string; action?: React.ReactNode; children: React.ReactNode; id?: string; search: React.ReactNode }) {
  return (
    <section id={id}>
      <div className="grid gap-4 border-b border-stone-100 pb-4 lg:grid-cols-[minmax(240px,360px)_1fr] lg:items-start">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-black text-stone-950">{title}</h2>
          <p className="text-sm text-stone-600">{description}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          {search}
          {action}
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

type AcademyRow = {
  id: string;
  name: string;
  slug: string;
  borough: string | null;
  city: string;
  postcode: string;
  email: string | null;
  verified: boolean;
  verificationStatus: string;
  featured: boolean;
  claims: { status: ClaimStatus }[];
  members: { id: string }[];
  claimReminders: { status: string; skipReason: string | null; createdAt: Date; recipientEmail: string | null }[];
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
  academyId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  academy: { name: string } | null;
};

const menuItemClass = "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50";
const dangerMenuItemClass = "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50";

function claimReminderReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    invalid_email: "Invalid email",
    managed: "Already claimed",
    missing_email: "No email",
    not_found: "Academy not found",
    pending_claim: "Pending claim",
    recently_sent: "Recently sent",
  };
  return labels[reason] ?? sentenceCase(reason);
}

function academyClaimState(academy: AcademyRow) {
  if (academy.members.length > 0 || academy.claims.some((claim) => claim.status === ClaimStatus.APPROVED)) return "Claimed";
  if (academy.claims.some((claim) => claim.status === ClaimStatus.PENDING)) return "Pending claim";
  return "Unclaimed";
}

function academyReminderState(academy: AcademyRow) {
  const latest = academy.claimReminders[0];
  if (latest?.status === "QUEUED") return { label: `Queued ${formatDate(latest.createdAt)}`, eligible: false, reason: "recently_sent" };
  if (latest?.status === "FAILED") return { label: "Failed", eligible: true, reason: latest.skipReason ?? "failed" };
  if (academy.members.length > 0 || academy.claims.some((claim) => claim.status === ClaimStatus.APPROVED)) return { label: "Already claimed", eligible: false, reason: "managed" };
  if (academy.claims.some((claim) => claim.status === ClaimStatus.PENDING)) return { label: "Pending claim", eligible: false, reason: "pending_claim" };
  if (!academy.email) return { label: "No email", eligible: false, reason: "missing_email" };
  return { label: "Not sent", eligible: true, reason: null };
}

function AcademiesTable({ academies, params }: { academies: AcademyRow[]; params: AdminSearchParams }) {
  const returnTo = adminAcademiesHref(params, { dialog: undefined, academyId: undefined, academyIds: undefined });
  return (
    <form action="/admin" className="mt-4">
      <input type="hidden" name="panel" value="academies" />
      <input type="hidden" name="dialog" value="bulk-claim-reminders" />
      {firstParam(params.search) ? <input type="hidden" name="search" value={firstParam(params.search)} /> : null}
      {firstParam(params.reminderFilter) ? <input type="hidden" name="reminderFilter" value={firstParam(params.reminderFilter)} /> : null}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
        <p className="text-sm font-semibold text-slate-600">Select academies on this page to review a bulk claim reminder.</p>
        <Button type="submit" variant="secondary" className="min-h-10 border-teal-200 text-teal-800">
          <Send size={16} aria-hidden />
          Review selected reminders
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-4 py-4">Select</th>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Location</th>
              <th className="px-5 py-4">Postcode</th>
              <th className="px-5 py-4">Claim</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Claim reminder</th>
              <th className="px-5 py-4">Featured</th>
              <th className="px-5 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {academies.map((academy) => {
              const reminder = academyReminderState(academy);
              return (
                <tr key={academy.id} className="border-t border-stone-100">
                  <td className="px-4 py-4">
                    <input className="size-4 accent-teal-700" type="checkbox" name="academyIds" value={academy.id} aria-label={`Select ${academy.name} for claim reminder`} />
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-950">{academy.name}</td>
                  <td className="px-5 py-4 text-slate-700">{academy.borough ?? academy.city}</td>
                  <td className="px-5 py-4 text-slate-700">{academy.postcode}</td>
                  <td className="px-5 py-4"><Badge>{academyClaimState(academy)}</Badge></td>
                  <td className="px-5 py-4 text-slate-700">{academy.email ? <span className="break-all">{academy.email}</span> : <Badge>No email</Badge>}</td>
                  <td className="px-5 py-4">
                    <div className="grid gap-2">
                      <Badge>{reminder.label}</Badge>
                      {reminder.eligible ? (
                        <Button href={adminAcademiesHref(params, { dialog: "claim-reminder", academyId: academy.id })} size="sm" variant="secondary" className="w-fit border-teal-200 text-teal-800">
                          <Send size={16} aria-hidden />
                          Send claim reminder
                        </Button>
                      ) : (
                        <p className="text-xs font-semibold text-slate-500">{claimReminderReasonLabel(reminder.reason ?? "unavailable")}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4"><Badge>{academy.featured ? "Featured" : "No"}</Badge></td>
                  <td className="px-5 py-4 text-center">
                    <ActionMenu label={`Open actions for ${academy.name}`}>
                      <Link href={`/academies/${academy.slug}`} className={menuItemClass}>
                        <Eye size={18} aria-hidden />
                        View Academy
                      </Link>
                      <Link href={`/admin/academies/${academy.id}`} className={menuItemClass}>
                        <Edit3 size={18} aria-hidden />
                        Edit Academy
                      </Link>
                      {reminder.eligible ? (
                        <Link href={adminAcademiesHref(params, { dialog: "claim-reminder", academyId: academy.id })} className={menuItemClass}>
                          <Send size={18} aria-hidden />
                          Send claim reminder
                        </Link>
                      ) : null}
                    </ActionMenu>
                  </td>
                </tr>
              );
            })}
            {!academies.length ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-stone-600">No academies match the current search and filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <input type="hidden" name="returnTo" value={returnTo} />
    </form>
  );
}

function UsersTable({ actorId, actorRole, users }: { actorId: string; actorRole: Role; users: UserRow[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
          <tr>
            <th className="px-5 py-4">User</th>
            <th className="px-5 py-4">Role</th>
            <th className="px-5 py-4">Academy</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Last Login</th>
            <th className="px-5 py-4">Created</th>
            <th className="px-5 py-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const protectedUser = isProtectedSuperAdmin(user);
            const canManage = isSuperAdminRole(actorRole) || (isPlatformAdminRole(actorRole) && !protectedUser && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.PLATFORM_ADMIN);
            const superUserTarget = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
            const canDelete = canManage && actorId !== user.id && !superUserTarget;
            const disabled = user.status === UserStatus.DISABLED || user.disabled;
            return (
              <tr key={user.id} className="border-t border-stone-100">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`grid size-12 shrink-0 place-items-center rounded-full text-base font-black ring-1 ${avatarTone(user.email)}`}>
                      {initials(user.name ?? user.email)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-950">{user.name ?? user.email}</p>
                      <p className="break-all text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  {protectedUser ? <p className="mt-2 text-xs font-bold uppercase text-teal-800">Protected</p> : null}
                </td>
                <td className="px-5 py-4"><RolePill role={user.role} /></td>
                <td className="px-5 py-4 text-slate-700">{user.academy?.name ?? "None"}</td>
                <td className="px-5 py-4"><StatusPill disabled={disabled} /></td>
                <td className="px-5 py-4 text-slate-600">{user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}</td>
                <td className="px-5 py-4 text-slate-600">{formatDate(user.createdAt)}</td>
                <td className="px-5 py-4 text-center">
                  {canManage ? (
                    <ActionMenu label={`Open actions for ${user.name ?? user.email}`}>
                        <Link href={`/admin?panel=users&dialog=view-user&userId=${user.id}`} className={menuItemClass}>
                          <User size={18} aria-hidden />
                          View Profile
                        </Link>
                        <Link href={`/admin?panel=users&dialog=edit-user&userId=${user.id}`} className={menuItemClass}>
                          <Edit3 size={18} aria-hidden />
                          Edit User
                        </Link>
                        <form action={toggleManagedUserDisabled.bind(null, user.id)}>
                          <button className={dangerMenuItemClass}>
                            <Ban size={18} aria-hidden />
                            {disabled ? "Enable Account" : "Disable Account"}
                          </button>
                        </form>
                        {canDelete ? (
                          <form action={deleteManagedUser.bind(null, user.id)}>
                            <button className={dangerMenuItemClass}>
                              <Trash2 size={18} aria-hidden />
                              Delete User
                            </button>
                          </form>
                        ) : null}
                    </ActionMenu>
                  ) : (
                    <span className="text-xs font-semibold text-stone-500">Read only</span>
                  )}
                </td>
              </tr>
            );
          })}
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

function avatarTone(value: string) {
  const tones = [
    "bg-teal-50 text-teal-800 ring-teal-100",
    "bg-violet-50 text-violet-700 ring-violet-100",
    "bg-amber-50 text-amber-700 ring-amber-100",
    "bg-red-50 text-red-700 ring-red-100",
    "bg-blue-50 text-blue-700 ring-blue-100",
    "bg-orange-50 text-orange-700 ring-orange-100",
  ];
  const total = Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[total % tones.length];
}

function RolePill({ role }: { role: Role }) {
  const className =
    role === Role.PLATFORM_ADMIN || role === Role.SUPER_ADMIN || role === Role.ADMIN
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : role === Role.ACADEMY_ADMIN
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-sky-200 bg-sky-50 text-sky-700";

  return <span className={`inline-flex rounded-md border px-3 py-1 text-xs font-black uppercase ${className}`}>{role}</span>;
}

function StatusPill({ disabled }: { disabled: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${disabled ? "bg-red-50 text-red-700 ring-1 ring-red-100" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"}`}>
      <span className={`size-2.5 rounded-full ${disabled ? "bg-red-500" : "bg-emerald-500"}`} aria-hidden />
      {disabled ? "Disabled" : "Active"}
    </span>
  );
}

function OpenMatsTable({ events }: { events: OpenMatRow[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
          <tr>
            <th className="px-5 py-4">Title</th>
            <th className="px-5 py-4">Academy</th>
            <th className="px-5 py-4">Date</th>
            <th className="px-5 py-4">Time</th>
            <th className="px-5 py-4">Gi Type</th>
            <th className="px-5 py-4">Price</th>
            <th className="px-5 py-4">Capacity</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-t border-stone-100">
              <td className="px-5 py-4 font-bold text-slate-950">{event.title}</td>
              <td className="px-5 py-4 text-slate-700">{event.academy.name}</td>
              <td className="px-5 py-4 text-slate-700">{formatDate(event.eventDate)}</td>
              <td className="px-5 py-4 text-slate-700">{event.startTime}-{event.endTime}</td>
              <td className="px-5 py-4"><Badge>{event.giType.replace("_", "-")}</Badge></td>
              <td className="px-5 py-4 text-slate-700">£{Number(event.price.toString()).toFixed(2)}</td>
              <td className="px-5 py-4 text-slate-700">{event.capacity ?? "None"}</td>
              <td className="px-5 py-4"><Badge>{event.active ? "Active" : "Inactive"}</Badge></td>
              <td className="px-5 py-4 text-center">
                <ActionMenu label={`Open actions for ${event.title}`}>
                  <Link href={`/open-mats/${event.id}`} className={menuItemClass}>
                    <Eye size={18} aria-hidden />
                    View Open Mat
                  </Link>
                  <Link href={`/admin/open-mats/${event.id}`} className={menuItemClass}>
                    <Edit3 size={18} aria-hidden />
                    Edit Open Mat
                  </Link>
                </ActionMenu>
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

function ClaimsFilter({ pageSize, search, status }: { pageSize: number; search: string; status: string }) {
  return (
    <details className="group relative">
      <summary className="inline-flex min-h-12 cursor-pointer list-none items-center justify-center gap-3 rounded-md border border-stone-200 bg-white px-5 text-sm font-bold text-teal-800 shadow-sm transition hover:border-teal-600 hover:bg-teal-50 [&::-webkit-details-marker]:hidden">
        <Filter size={18} aria-hidden />
        Filters
      </summary>
      <div className="absolute right-0 z-30 mt-2 grid w-[min(24rem,calc(100vw-2rem))] gap-4 rounded-lg border border-stone-200 bg-white p-4 text-left shadow-xl sm:grid-cols-2">
        <form action="/admin" className="contents">
          <input type="hidden" name="panel" value="academy-claims" />
          {search ? <input type="hidden" name="search" value={search} /> : null}
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Status
            <select name="status" defaultValue={status} className="min-h-11 rounded-md border border-stone-200 px-3 font-normal text-slate-800">
              <option value="all">All</option>
              <option value={ClaimStatus.PENDING}>Pending</option>
              <option value={ClaimStatus.APPROVED}>Approved</option>
              <option value={ClaimStatus.REJECTED}>Rejected</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Rows
            <select name="pageSize" defaultValue={pageSize} className="min-h-11 rounded-md border border-stone-200 px-3 font-normal text-slate-800">
              {claimPageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button type="submit" variant="primary">Apply</Button>
            <Button href="/admin?panel=academy-claims" variant="secondary" className="border-stone-200 text-slate-700">Reset</Button>
          </div>
        </form>
      </div>
    </details>
  );
}

function ClaimStatusFilters({ params, status }: { params: AdminSearchParams; status: string }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <ClaimFilterPill href={adminClaimsHref(params, { status: undefined, claimsPage: 1 })} active={status === "all"} icon={<ShieldCheck size={18} aria-hidden />}>All Claims</ClaimFilterPill>
      <ClaimFilterPill href={adminClaimsHref(params, { status: ClaimStatus.PENDING, claimsPage: 1 })} active={status === ClaimStatus.PENDING} dotClassName="bg-amber-500">Pending</ClaimFilterPill>
      <ClaimFilterPill href={adminClaimsHref(params, { status: ClaimStatus.APPROVED, claimsPage: 1 })} active={status === ClaimStatus.APPROVED} dotClassName="bg-emerald-500">Approved</ClaimFilterPill>
      <ClaimFilterPill href={adminClaimsHref(params, { status: ClaimStatus.REJECTED, claimsPage: 1 })} active={status === ClaimStatus.REJECTED} dotClassName="bg-red-500">Rejected</ClaimFilterPill>
    </div>
  );
}

function ClaimFilterPill({ active, children, dotClassName, href, icon }: { active?: boolean; children: React.ReactNode; dotClassName?: string; href: string; icon?: React.ReactNode }) {
  return (
    <Link href={href} className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-bold transition ${active ? "border-teal-700 bg-teal-50 text-teal-800" : "border-stone-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50"}`}>
      {icon}
      {dotClassName ? <span className={`size-2.5 rounded-full ${dotClassName}`} aria-hidden /> : null}
      {children}
    </Link>
  );
}

function ClaimsErrorState({ message, status }: { message: string; status: number }) {
  const title = status === 403 ? "Access restricted" : "Claims unavailable";
  return (
    <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 px-5 py-10 text-center">
      <h3 className="text-xl font-black text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-slate-600">{message}</p>
      <Button href="/admin?panel=academy-claims" variant="secondary" className="mt-5">Refresh Claims</Button>
    </div>
  );
}

function ClaimsTable({ claims, page, pageSize, params, totalItems, totalPages }: { claims: AcademyClaimListItem[]; page: number; pageSize: number; params: AdminSearchParams; totalItems: number; totalPages: number }) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-5 py-4">Academy</th>
              <th className="px-5 py-4">Requester</th>
              <th className="px-5 py-4">Role</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Submitted</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.id} className="border-t border-stone-100">
                <td className="px-5 py-4">
                  <p className="font-bold text-slate-950">{claim.academy.name}</p>
                  {claim.academy.city || claim.academy.postcode ? <p className="mt-1 text-slate-500">{[claim.academy.city, claim.academy.postcode].filter(Boolean).join(", ")}</p> : null}
                </td>
                <td className="px-5 py-4">
                  <p className="font-bold text-slate-950">{claim.requester.name}</p>
                  <p className="break-all text-slate-500">{claim.requester.email}</p>
                </td>
                <td className="px-5 py-4 text-slate-700">{claimRoleLabel(claim.requester.role)}</td>
                <td className="px-5 py-4"><ClaimStatusBadge status={claim.status} /></td>
                <td className="px-5 py-4 text-slate-600">{formatDate(new Date(claim.createdAt))}</td>
                <td className="px-5 py-4 text-right">
                  <Button href={`/admin/academy-claims/${claim.id}?returnTo=${encodeURIComponent(adminClaimsHref(params, {}))}`} size="sm" variant={claim.status === ClaimStatus.PENDING ? "primary" : "secondary"}>Review</Button>
                </td>
              </tr>
            ))}
            {!claims.length ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-stone-600">No academy claims match these filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 border-t border-stone-100 px-1 py-5 text-sm lg:flex-row lg:items-center lg:justify-between">
        <p className="text-slate-700">Showing {start} to {end} of {totalItems} claims</p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ClaimPageLink disabled={page <= 1} href={adminClaimsHref(params, { claimsPage: page - 1 })} iconOnly>
            <ChevronLeft size={18} aria-hidden />
            <span className="sr-only">Previous</span>
          </ClaimPageLink>
          {claimPaginationPages(page, totalPages).map((pageNumber) => (
            <ClaimPageLink key={pageNumber} active={pageNumber === page} href={adminClaimsHref(params, { claimsPage: pageNumber })}>{pageNumber}</ClaimPageLink>
          ))}
          <ClaimPageLink disabled={page >= totalPages} href={adminClaimsHref(params, { claimsPage: page + 1 })} iconOnly>
            <ChevronRight size={18} aria-hidden />
            <span className="sr-only">Next</span>
          </ClaimPageLink>
        </div>
      </div>
    </>
  );
}

function ClaimPageLink({ active, children, disabled, href, iconOnly }: { active?: boolean; children: React.ReactNode; disabled?: boolean; href: string; iconOnly?: boolean }) {
  if (disabled) {
    return <span className={`inline-flex min-h-9 items-center justify-center rounded-md border border-stone-200 text-xs font-bold text-stone-400 ${iconOnly ? "w-9 px-0" : "px-3"}`}>{children}</span>;
  }
  return (
    <Button href={href} size={iconOnly ? "icon" : "sm"} variant={active ? "primary" : "secondary"} className={`${iconOnly ? "h-9 min-h-9 w-9 px-0" : "min-h-9 px-3"} ${active ? "shadow-sm" : "hover:bg-stone-50"}`}>
      {children}
    </Button>
  );
}

function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  const className = {
    [ClaimStatus.PENDING]: "bg-amber-50 text-amber-800 ring-amber-100",
    [ClaimStatus.APPROVED]: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    [ClaimStatus.REJECTED]: "bg-red-50 text-red-700 ring-red-100",
  }[status];

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ring-1 ${className}`}>
      <span className={`size-2.5 rounded-full ${statusDot(status)}`} aria-hidden />
      {claimStatusLabel(status)}
    </span>
  );
}

function claimRoleLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function claimStatusLabel(status: ClaimStatus) {
  return claimRoleLabel(status);
}

function statusDot(status: ClaimStatus) {
  if (status === ClaimStatus.APPROVED) return "bg-emerald-500";
  if (status === ClaimStatus.REJECTED) return "bg-red-500";
  return "bg-amber-500";
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
    <Button href={href} size="sm" variant="secondary" className="px-3">
      {children}
    </Button>
  );
}
