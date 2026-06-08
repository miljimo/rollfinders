import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Ban, BarChart3, Building2, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Edit3, Eye, Filter, Globe2, KeyRound, Mail, MapPinned, MousePointerClick, Plus, RefreshCw, Search, Send, ShieldCheck, Trash2, User, Users, X } from "lucide-react";
import { AcademyMap } from "@/components/AcademyMap";
import { getFounderAnalyticsReport } from "@/lib/analytics/reporting";
import { academyScopedAcademyWhere, academyScopedEventWhere, academyScopedUserWhere, elevatedAdminPrivacyAuditLogWhere, elevatedAdminPrivacyUserWhere, getCurrentUser, isAcademyAdminRole, isPlatformAdminRole, isProtectedSuperAdmin, isSuperAdminRole } from "@/lib/admin";
import { getMapItems } from "@/lib/data";
import { getPlatformAdminActivitySummary, type PlatformAdminActivitySummary } from "@/lib/platform-admin-activity";
import { prisma } from "@/lib/prisma";
import { getEmailQueueOperationsSummary } from "@/lib/reliable-email";
import { AcademyVerificationStatus, ClaimStatus, Role, UserStatus, type Prisma } from "@prisma/client";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/Button";
import { LogoutButton } from "@/components/LogoutButton";
import { QuickActionPanel, type QuickActionPanelItem } from "@/components/QuickActionPanel";
import { PlatformAdminActivitySummaryPanel } from "@/components/PlatformAdminActivitySummaryPanel";
import { SidePanelControl, type SidePanelItem } from "@/components/SidePanelControl";
import { StatsPanel, type StatsPanelItem } from "@/components/StatsPanel";
import { Table, TableStatusBadge, type TableColumn } from "@/components/Table";
import { createAcademy, sendAcademyClaimReminder, sendBulkAcademyClaimReminders } from "../admin/academies/actions";
import { AcademyForm } from "../admin/academies/AcademyForm";
import { createOpenMat } from "../admin/open-mats/actions";
import { OpenMatForm } from "../admin/open-mats/OpenMatForm";
import { createManagedUser, deleteManagedUser, toggleManagedUserDisabled, updateManagedUser } from "../admin/users/actions";
import { processEmailQueue } from "../admin/actions";
import { UserForm } from "../admin/users/UserForm";
import { ActionMenu } from "../admin/ActionMenu";
import { fetchAcademyClaims, type AcademyClaimListItem } from "../admin/academy-claims/api";
import { EmailOperationsPanel } from "../admin/EmailOperationsPanel";
import { ChangePasswordForm } from "./password/ChangePasswordForm";

export { PlatformAdminActivitySummaryPanel } from "@/components/PlatformAdminActivitySummaryPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Dashboard",
  description: "Manage RollFinders academies, open mats, users, email delivery, and platform operations.",
};

const pageSize = 8;
const platformAdminAcademyPageSize = 5;
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

function clampPlatformAcademyPage(page: number, totalItems: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / platformAdminAcademyPageSize));
  return Math.min(page, totalPages);
}

function platformAdminCreatedAcademyWhere(extra: Prisma.AcademyWhereInput = {}): Prisma.AcademyWhereInput {
  return {
    AND: [
      { createdBy: { role: Role.PLATFORM_ADMIN } },
      extra,
    ],
  };
}

function selectedPanel(value: string | undefined) {
  if (value === "open-mats" || value === "users" || value === "settings" || value === "maps" || value === "academy-claims" || value === "platform-admin-academies" || value === "analytics") return value;
  return "academies";
}

function isPlatformOnlyPanel(panel: string) {
  return panel === "settings" || panel === "maps" || panel === "academy-claims";
}

function isSuperOnlyPanel(panel: string) {
  return panel === "platform-admin-academies" || panel === "analytics";
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

function selectedSettingsAction(value: string | undefined) {
  if (value === "change-password" || value === "email-options" || value === "recent-audits" || value === "weekly-activity") return value;
  return "change-password";
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
  return query ? `/dashboard?${query}` : "/dashboard";
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
  return `/dashboard?${params.toString()}`;
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
  return `/dashboard?${params.toString()}`;
}

function platformAdminAcademiesHref(searchParams: AdminSearchParams, overrides: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => item && params.append(key, item));
      return;
    }
    params.set(key, value);
  });
  params.set("panel", "platform-admin-academies");
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === 1) {
      params.delete(key);
      return;
    }
    params.set(key, String(value));
  });
  params.set("panel", "platform-admin-academies");
  return `/dashboard?${params.toString()}`;
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

function emptyEmailOperationsSummary(): Awaited<ReturnType<typeof getEmailQueueOperationsSummary>> {
  return {
    outboundEmailCount: 0,
    dueQueueCount: 0,
    scheduledRetryCount: 0,
    attentionCount: 0,
    invalidEmailCount: 0,
    lastRun: null,
    recentRuns: [],
    dueQueueItems: [],
    scheduledRetryItems: [],
    attentionItems: [],
    invalidEmails: [],
  };
}

export default async function AdminDashboardWorkspace({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  if (!isPlatformAdminRole(currentUser.role) && !isAcademyAdminRole(currentUser.role)) {
    redirect("/");
  }
  if (isAcademyAdminRole(currentUser.role) && !currentUser.academyId) redirect("/");
  const account = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { name: true, email: true, role: true },
  });
  const params = await searchParams;
  const requestedPanel = selectedPanel(firstParam(params.panel));
  const academyAdmin = isAcademyAdminRole(currentUser.role);
  if (academyAdmin && isPlatformOnlyPanel(requestedPanel)) redirect("/dashboard");
  const superAdmin = isSuperAdminRole(currentUser.role);
  if (!superAdmin && isSuperOnlyPanel(requestedPanel)) redirect("/dashboard");
  const panel = requestedPanel;
  const dialog = firstParam(params.dialog);
  const activeSettingsAction = selectedSettingsAction(firstParam(params.settingsAction) ?? firstParam(params.settingsView));
  const userDialogId = firstParam(params.userId);
  const academyDialogId = firstParam(params.academyId);
  const selectedAcademyIds = Array.isArray(params.academyIds) ? params.academyIds : firstParam(params.academyIds) ? [firstParam(params.academyIds) as string] : [];
  const search = (firstParam(params.search) ?? "").trim();
  const platformAcademiesSearch = (firstParam(params.platformAcademiesSearch) ?? "").trim();
  const platformAdmin = isPlatformAdminRole(currentUser.role);
  const elevatedAdmin = !academyAdmin && platformAdmin;

  const academyPage = pageFromParams(params, "academiesPage");
  const eventPage = pageFromParams(params, "eventsPage");
  const userPage = pageFromParams(params, "usersPage");
  const platformAcademyPage = pageFromParams(params, "platformAcademiesPage");
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
  const platformAdminAcademySearchWhere: Prisma.AcademyWhereInput = platformAcademiesSearch
    ? {
        OR: [
          { name: { contains: platformAcademiesSearch, mode: "insensitive" } },
          { city: { contains: platformAcademiesSearch, mode: "insensitive" } },
          { borough: { contains: platformAcademiesSearch, mode: "insensitive" } },
          { postcode: { contains: platformAcademiesSearch, mode: "insensitive" } },
          { createdBy: { name: { contains: platformAcademiesSearch, mode: "insensitive" } } },
          { createdBy: { email: { contains: platformAcademiesSearch, mode: "insensitive" } } },
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
  const academyScopeWhere = academyScopedAcademyWhere(currentUser);
  const eventScopeWhere = academyScopedEventWhere(currentUser);
  const userScopeWhere = academyScopedUserWhere(currentUser);
  const academyWhere: Prisma.AcademyWhereInput = { AND: [academyScopeWhere, academySearchWhere, elevatedAdmin ? academyReminderWhere : {}] };
  const eventFilterWhere: Prisma.EventWhereInput = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { startTime: { contains: search, mode: "insensitive" } },
          { endTime: { contains: search, mode: "insensitive" } },
          { academy: { name: { contains: search, mode: "insensitive" } } },
        ],
      }
    : {};
  const eventWhere: Prisma.EventWhereInput = { AND: [eventScopeWhere, { active: true }, eventFilterWhere] };
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
  const scopedUserWhere: Prisma.UserWhereInput = { AND: [userScopeWhere, visibleUserWhere, userFilterWhere] };
  const platformAdminAcademiesWhere = platformAdminCreatedAcademyWhere(platformAdminAcademySearchWhere);

  const [
    academyCount,
    totalAcademyCount,
    verifiedAcademyCount,
    pendingAcademyCount,
    managedAcademyCount,
    totalUserCount,
    activeEventCount,
    userCount,
    platformAdminAcademyCount,
    verifiedPlatformAdminAcademyCount,
    pendingPlatformAdminAcademyCount,
    platformAdminCreatorCount,
    newPlatformAdminAcademyCountThisMonth,
    newAcademyCountThisMonth,
    verifiedAcademyCountThisMonth,
    newUserCountThisMonth,
    activeEventCountThisWeek,
    emailOperations,
    founderAnalyticsReport,
  ] = await Promise.all([
    prisma.academy.count({ where: academyWhere }),
    prisma.academy.count({ where: academyScopeWhere }),
    prisma.academy.count({ where: { AND: [academyScopeWhere, { verificationStatus: AcademyVerificationStatus.VERIFIED }] } }),
    prisma.academy.count({ where: { AND: [academyScopeWhere, { verificationStatus: AcademyVerificationStatus.PENDING }] } }),
    prisma.academy.count({ where: { AND: [academyScopeWhere, { members: { some: {} } }] } }),
    prisma.user.count({ where: { AND: [userScopeWhere, visibleUserWhere] } }),
    prisma.event.count({ where: eventWhere }),
    prisma.user.count({ where: scopedUserWhere }),
    superAdmin ? prisma.academy.count({ where: platformAdminAcademiesWhere }) : Promise.resolve(0),
    superAdmin ? prisma.academy.count({ where: platformAdminCreatedAcademyWhere({ verificationStatus: AcademyVerificationStatus.VERIFIED }) }) : Promise.resolve(0),
    superAdmin ? prisma.academy.count({ where: platformAdminCreatedAcademyWhere({ verificationStatus: AcademyVerificationStatus.PENDING }) }) : Promise.resolve(0),
    superAdmin ? prisma.user.count({ where: { role: Role.PLATFORM_ADMIN, createdAcademies: { some: {} } } }) : Promise.resolve(0),
    superAdmin ? prisma.academy.count({ where: platformAdminCreatedAcademyWhere({ createdAt: { gte: monthStart } }) }) : Promise.resolve(0),
    prisma.academy.count({ where: { AND: [academyScopeWhere, { createdAt: { gte: monthStart } }] } }),
    prisma.academy.count({ where: { AND: [academyScopeWhere, { verificationStatus: AcademyVerificationStatus.VERIFIED, updatedAt: { gte: monthStart } }] } }),
    prisma.user.count({ where: { AND: [userScopeWhere, visibleUserWhere, { createdAt: { gte: monthStart } }] } }),
    prisma.event.count({ where: { ...eventWhere, createdAt: { gte: weekStart } } }),
    elevatedAdmin ? getEmailQueueOperationsSummary() : Promise.resolve(emptyEmailOperationsSummary()),
    superAdmin ? getFounderAnalyticsReport() : Promise.resolve(null),
  ]);

  const currentAcademyPage = clampPage(academyPage, academyCount);
  const currentEventPage = clampPage(eventPage, activeEventCount);
  const currentUserPage = clampPage(userPage, userCount);
  const currentPlatformAcademyPage = clampPlatformAcademyPage(platformAcademyPage, platformAdminAcademyCount);
  const claimResult = panel === "academy-claims"
    ? await fetchAcademyClaims(claimApiParams({ page: claimPage, pageSize: claimPageSize, search, status: claimStatus }))
    : null;

  const [
    academies,
    platformAdminAcademies,
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
    superAdmin
      ? prisma.academy.findMany({
          where: platformAdminAcademiesWhere,
          skip: (currentPlatformAcademyPage - 1) * platformAdminAcademyPageSize,
          take: platformAdminAcademyPageSize,
          orderBy: [{ createdAt: "desc" }, { name: "asc" }],
          include: {
            createdBy: { select: { email: true, name: true } },
          },
        })
      : Promise.resolve([]),
    prisma.event.findMany({
      skip: (currentEventPage - 1) * pageSize,
      take: pageSize,
      where: eventWhere,
      include: { academy: true },
      orderBy: { eventDate: "asc" },
    }),
    prisma.user.findMany({
      where: scopedUserWhere,
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
    prisma.academy.findMany({ where: academyScopeWhere, orderBy: { name: "asc" } }),
    elevatedAdmin ? getPlatformAdminActivitySummary(currentUser.id) : Promise.resolve(null),
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
  const adminNavigationItems: SidePanelItem[] = [
    { active: !firstParam(params.panel), href: "/dashboard", icon: "dashboard", label: "Dashboard" },
    {
      active: panel === "academies",
      href: academyAdmin && currentUser.academyId ? `/admin/academies/${currentUser.academyId}` : "/dashboard?panel=academies",
      icon: "academies",
      label: academyAdmin ? "Academy Profile" : "Manage Academies",
    },
    { active: panel === "open-mats", href: "/dashboard?panel=open-mats", icon: "events", label: academyAdmin ? "Manage Rolls" : "Manage Open Mats" },
    { active: panel === "users", href: "/dashboard?panel=users", icon: "users", label: "Manage Users" },
    ...(superAdmin
      ? [
          { active: panel === "analytics", href: "/dashboard?panel=analytics", icon: "dashboard", label: "Analytics" } satisfies SidePanelItem,
          { active: panel === "platform-admin-academies", href: "/dashboard?panel=platform-admin-academies", icon: "academies", label: "Academy Review" } satisfies SidePanelItem,
        ]
      : []),
    ...(elevatedAdmin
      ? [
          { active: panel === "academy-claims", href: "/dashboard?panel=academy-claims", icon: "claims", label: "Academy Claims" } satisfies SidePanelItem,
          { active: panel === "maps", href: "/dashboard?panel=maps", icon: "map", label: "Map" } satisfies SidePanelItem,
          { active: panel === "settings", href: "/dashboard?panel=settings", icon: "settings", label: "Settings" } satisfies SidePanelItem,
        ]
      : []),
  ];
  const statCards: StatsPanelItem[] = academyAdmin
    ? [
        {
          iconTone: "blue",
          icon: <Users size={34} aria-hidden />,
          indicator: { label: "new this month", value: newUserCountThisMonth },
          id: "academy-users",
          label: "Academy Users",
          value: totalUserCount,
        },
        {
          iconTone: "violet",
          icon: <CalendarDays size={34} aria-hidden />,
          indicator: { label: "created this week", value: activeEventCountThisWeek },
          id: "academy-rolls",
          label: "Academy Rolls",
          value: activeEventCount,
        },
      ]
    : [
        {
          iconTone: "teal",
          icon: <Building2 size={34} aria-hidden />,
          indicator: { label: "new this month", value: newAcademyCountThisMonth },
          id: "total-academies",
          label: "Total Academies",
          value: totalAcademyCount,
        },
        {
          iconTone: "teal",
          icon: <ShieldCheck size={34} aria-hidden />,
          indicator: { label: "verified this month", value: verifiedAcademyCountThisMonth },
          id: "verified-academies",
          label: "Verified Academies",
          value: verifiedAcademyCount,
        },
        {
          iconTone: "orange",
          icon: <CalendarDays size={34} aria-hidden />,
          indicator: { label: "pending review", tone: pendingAcademyCount > 0 ? "warning" : "neutral" },
          id: "pending-verification",
          label: "Pending Verification",
          value: pendingAcademyCount,
        },
        {
          iconTone: "blue",
          icon: <Users size={34} aria-hidden />,
          indicator: { label: "new this month", value: newUserCountThisMonth },
          id: "total-users",
          label: "Total Users",
          value: totalUserCount,
        },
        {
          iconTone: "violet",
          icon: <CalendarDays size={34} aria-hidden />,
          indicator: { label: "created this week", value: activeEventCountThisWeek },
          id: "open-mats",
          label: "Open Mats",
          value: activeEventCount,
        },
      ];
  const platformAdminAcademyStats: StatsPanelItem[] = [
    {
      icon: <Building2 size={34} aria-hidden />,
      iconTone: "teal",
      id: "platform-admin-academies-total",
      indicator: { label: "new this month", value: newPlatformAdminAcademyCountThisMonth },
      label: "Platform Admin-Created Academies",
      value: platformAdminAcademyCount,
    },
    {
      icon: <ShieldCheck size={34} aria-hidden />,
      iconTone: "teal",
      id: "platform-admin-academies-verified",
      indicator: { label: "verified records" },
      label: "Verified",
      value: verifiedPlatformAdminAcademyCount,
    },
    {
      icon: <CalendarDays size={34} aria-hidden />,
      iconTone: "orange",
      id: "platform-admin-academies-pending",
      indicator: { label: "pending review", tone: pendingPlatformAdminAcademyCount > 0 ? "warning" : "neutral" },
      label: "Pending Verification",
      value: pendingPlatformAdminAcademyCount,
    },
    {
      icon: <Users size={34} aria-hidden />,
      iconTone: "violet",
      id: "platform-admin-academy-creators",
      indicator: { label: "with at least one academy" },
      label: "Contributing Platform Admins",
      value: platformAdminCreatorCount,
    },
    {
      icon: <Plus size={34} aria-hidden />,
      iconTone: "blue",
      id: "platform-admin-academies-new-this-month",
      indicator: { label: "new this month" },
      label: "New This Month",
      value: newPlatformAdminAcademyCountThisMonth,
    },
  ];
  const quickActionItems: QuickActionPanelItem[] = [
    {
      active: panel === "academies",
      description: academyAdmin ? "View and manage your academy profile" : "Search, verify and manage academies",
      href: academyAdmin && currentUser.academyId ? `/admin/academies/${currentUser.academyId}` : "/dashboard?panel=academies",
      icon: <Building2 size={24} aria-hidden />,
      id: "academies",
      title: academyAdmin ? "Academy Profile Summary" : "Manage Academies",
    },
    ...(elevatedAdmin
      ? [
          ...(superAdmin
            ? [
                {
                  active: panel === "analytics",
                  description: "Review marketplace, visitor, profile, and commercial intent signals",
                  href: "/dashboard?panel=analytics",
                  icon: <BarChart3 size={24} aria-hidden />,
                  id: "analytics",
                  title: "Analytics",
                } satisfies QuickActionPanelItem,
                {
                  active: panel === "platform-admin-academies",
                  description: "Review academies created by platform admins",
                  href: "/dashboard?panel=platform-admin-academies",
                  icon: <ShieldCheck size={24} aria-hidden />,
                  id: "platform-admin-created-academies",
                  title: "Academy Review",
                } satisfies QuickActionPanelItem,
              ]
            : []),
          {
            active: panel === "academy-claims",
            description: "Review ownership access requests",
            href: "/dashboard?panel=academy-claims",
            icon: <ClipboardCheck size={24} aria-hidden />,
            id: "academy-claims",
            title: "Academy Claims",
          } satisfies QuickActionPanelItem,
        ]
      : []),
    {
      active: panel === "open-mats",
      description: academyAdmin ? "Create and manage academy rolls" : "Create, edit and manage events",
      href: "/dashboard?panel=open-mats",
      icon: <CalendarDays size={24} aria-hidden />,
      id: "open-mats",
      title: academyAdmin ? "Manage Rolls" : "Manage Open Mats",
    },
    {
      active: panel === "users",
      description: academyAdmin ? "Create and manage academy users" : "Create, edit and manage users",
      href: "/dashboard?panel=users",
      icon: <Users size={24} aria-hidden />,
      id: "users",
      title: "Manage Users",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8faf7] text-slate-900">
      <SidePanelControl
        accountLabel={account?.name ?? account?.email ?? currentUser.email}
        navigationItems={adminNavigationItems}
        roleLabel={roleLabel(account?.role ?? currentUser.role)}
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
                <span className="flex size-11 items-center justify-center rounded-full bg-teal-100 text-sm font-black text-teal-800" aria-hidden>{initials(account?.name ?? account?.email ?? currentUser.email)}</span>
                <ChevronDown size={18} aria-hidden className="text-slate-400" />
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
            <div className="mt-3 flex justify-end">
              <LogoutButton />
            </div>
          </ActionMenu>
        </header>

        {panel === "settings" ? (
          <SettingsDashboardContent
            activeSettingsAction={activeSettingsAction}
            canViewWeeklyActivity={elevatedAdmin}
            emailPage={emailPage}
            emailOperations={emailOperations}
            emailOperationsView={emailOperationsView}
            platformAdminActivitySummary={platformAdminActivitySummary}
            recentAuditLogs={recentAuditLogs}
          />
        ) : panel === "maps" ? (
          <MapDashboardContent academies={mapItems} />
        ) : (
        <section className="px-4 py-8 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-950">{academyAdmin ? "Academy Admin Board" : "Dashboard"}</h1>
              <p className="mt-2 text-slate-600">{academyAdmin ? "Manage your assigned academy, users, and rolls." : "Review platform health and manage operational records."}</p>
            </div>
          </div>

          <StatsPanel
            className="mt-6 rounded-lg border border-teal-200 bg-white p-4 shadow-sm"
            collapseStorageKey="rollfinders.dashboardStatsCollapsed"
            collapsible
            defaultCollapsed
            items={statCards}
            persistCollapseState
            title="Stats Board"
          />

          <QuickActionPanel
            className="mt-7 rounded-lg border border-teal-200 bg-white p-4 shadow-sm"
            collapseStorageKey="rollfinders.dashboardQuickActionsCollapsed"
            collapsible
            defaultCollapsed
            items={quickActionItems}
            persistCollapseState
          />

          {superAdmin && panel === "analytics" ? (
            <FounderAnalyticsPanel
              activeEventCount={activeEventCount}
              academyCount={totalAcademyCount}
              analyticsReport={founderAnalyticsReport}
              claimCount={claimResult?.ok ? claimResult.data.totalItems : pendingAcademyCount}
              managedAcademyCount={managedAcademyCount}
              pendingAcademyCount={pendingAcademyCount}
              platformAdminAcademyCount={platformAdminAcademyCount}
              userCount={totalUserCount}
              verifiedAcademyCount={verifiedAcademyCount}
            />
          ) : null}

          {superAdmin && panel === "platform-admin-academies" ? (
            <SuperAdminPlatformAcademiesPanel
              academies={platformAdminAcademies}
              currentPage={currentPlatformAcademyPage}
              params={params}
              search={platformAcademiesSearch}
              stats={platformAdminAcademyStats}
              totalItems={platformAdminAcademyCount}
            />
          ) : null}

          {panel !== "platform-admin-academies" && panel !== "analytics" ? (
          <div className="mt-7 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          {panel === "academies" ? (
            <AdminPanel
              action={elevatedAdmin ? <AcademiesPanelActions params={params} reminderFilter={academyReminderFilter} /> : null}
              description={academyAdmin ? "Review your assigned academy record." : "Search academy records and send controlled claim reminders to eligible unclaimed academies."}
              id="academies"
              search={academyAdmin ? null : <AcademiesPanelSearch reminderFilter={academyReminderFilter} search={search} />}
              title={academyAdmin ? "My Academy" : "Academies"}
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
                <Button href="/dashboard?panel=open-mats&dialog=new-open-mat" variant="primary" className="min-h-12 shadow-sm">
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
                <Button href="/dashboard?panel=users&dialog=new-user" variant="primary" className="min-h-12 shadow-sm">
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
              <UsersTable actorAcademyId={currentUser.academyId} actorId={currentUser.id} actorRole={currentUser.role} users={users} />
              <Pagination currentPage={currentUserPage} totalItems={userCount} pageKey="usersPage" searchParams={params} />
            </AdminPanel>
          ) : null}
          </div>
          ) : null}
        </section>
        )}
      </main>
      {panel === "users" && dialog === "new-user" ? (
        <NewUserDialog academies={academyOptions} academyAdmin={academyAdmin} superAdmin={superAdmin} />
      ) : null}
      {panel === "users" && dialog === "view-user" && selectedDialogUser ? (
        <ViewUserDialog user={selectedDialogUser} />
      ) : null}
      {panel === "users" && dialog === "edit-user" && selectedDialogUser ? (
        <EditUserDialog academies={academyOptions} academyAdmin={academyAdmin} superAdmin={superAdmin} user={selectedDialogUser} />
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
    <DialogShell closeHref="/dashboard?panel=users" description="Review this user profile and access details." title="User Profile">
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

function EditUserDialog({ academies, academyAdmin, superAdmin, user }: { academies: { id: string; name: string }[]; academyAdmin: boolean; superAdmin: boolean; user: UserRow }) {
  return (
    <DialogShell closeHref="/dashboard?panel=users" description="Edit this user's details, role, status, and academy access." title="Edit User">
      <UserForm
        academies={academies}
        action={updateManagedUser.bind(null, user.id)}
        cancelHref="/dashboard?panel=users"
        mode="edit"
        returnTo="/dashboard?panel=users"
        academyAdmin={academyAdmin}
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
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-8 sm:py-12" role={"dialog"} aria-modal="true" aria-labelledby="admin-dialog-title">
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
    <DialogShell closeHref="/dashboard?panel=academies" description="Create an academy record without leaving the dashboard." maxWidthClass="max-w-6xl" title="New Academy">
      <AcademyForm action={createAcademy} cancelHref="/dashboard?panel=academies" returnTo="/dashboard?panel=academies" />
    </DialogShell>
  );
}

export function NewAcademyPanelAction() {
  return (
    <Button href="/dashboard?panel=academies&dialog=new-academy" variant="primary" className="min-h-12 shadow-sm">
      <Plus size={18} aria-hidden />
      New Academy
    </Button>
  );
}

function AcademiesPanelSearch({ reminderFilter, search }: { reminderFilter: string; search: string }) {
  return (
    <form action="/dashboard" className="flex min-w-0 gap-2">
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
    <DialogShell closeHref="/dashboard?panel=open-mats" description="Create an open mat event without leaving the dashboard." title="New Open Mat">
      <OpenMatForm academies={academies} action={createOpenMat} cancelHref="/dashboard?panel=open-mats" returnTo="/dashboard?panel=open-mats" />
    </DialogShell>
  );
}

function NewUserDialog({ academies, academyAdmin, superAdmin }: { academies: { id: string; name: string }[]; academyAdmin: boolean; superAdmin: boolean }) {
  return (
    <DialogShell closeHref="/dashboard?panel=users" description="Create a user and assign role and academy access." title="New User">
      <UserForm
        academies={academies}
        action={createManagedUser}
        cancelHref="/dashboard?panel=users"
        mode="create"
        returnTo="/dashboard?panel=users"
        academyAdmin={academyAdmin}
        superAdmin={superAdmin}
      />
    </DialogShell>
  );
}

function PanelSearch({ panel, search }: { panel: string; search: string }) {
  return (
    <form action="/dashboard" className="flex min-w-0 gap-2">
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
    <form action="/dashboard" className="flex min-w-0 gap-2">
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

function FounderAnalyticsPanel({
  academyCount,
  activeEventCount,
  analyticsReport,
  claimCount,
  managedAcademyCount,
  pendingAcademyCount,
  platformAdminAcademyCount,
  userCount,
  verifiedAcademyCount,
}: {
  academyCount: number;
  activeEventCount: number;
  analyticsReport: Awaited<ReturnType<typeof getFounderAnalyticsReport>> | null;
  claimCount: number;
  managedAcademyCount: number;
  pendingAcademyCount: number;
  platformAdminAcademyCount: number;
  userCount: number;
  verifiedAcademyCount: number;
}) {
  const summary = analyticsReport?.summary;
  const countrySignals = analyticsReport?.countries ?? [];
  const countrySignalSummary = countrySignals.length
    ? countrySignals.map((country) => `${country.countryName}: ${country.visitorCount} visitors / ${country.eventCount} events`).join(" · ")
    : "Unknown";
  const analyticsStats: StatsPanelItem[] = [
    {
      icon: <Globe2 size={34} aria-hidden />,
      iconTone: "teal",
      id: "marketplace-supply",
      indicator: { label: "sessions", value: summary?.marketplace.sessionCount ?? 0 },
      label: "Visitors",
      value: summary?.marketplace.visitorCount ?? 0,
    },
    {
      icon: <CalendarDays size={34} aria-hidden />,
      iconTone: "violet",
      id: "open-mat-supply",
      indicator: { label: "open mat searches", value: summary?.search.openMatSearches ?? 0 },
      label: "Academy Searches",
      value: summary?.search.academySearches ?? 0,
    },
    {
      icon: <MousePointerClick size={34} aria-hidden />,
      iconTone: "blue",
      id: "commercial-intent",
      indicator: { label: "profile views", value: (summary?.profile.academyProfileViews ?? 0) + (summary?.profile.openMatViews ?? 0) },
      label: "Commercial Intent",
      value: summary?.commercial.commercialIntentClicks ?? 0,
    },
    {
      icon: <ClipboardCheck size={34} aria-hidden />,
      iconTone: "orange",
      id: "claim-funnel",
      indicator: { label: "submitted", value: summary?.claim.claimSubmissions ?? 0 },
      label: "Claim Funnel",
      value: summary?.claim.claimStarts ?? 0,
    },
  ];
  const rows: FounderAnalyticsRow[] = [
    { id: "visitors", area: "Visitor analytics", metric: "unique_visitors and unique_sessions", value: `${summary?.visitor.uniqueVisitors ?? 0} visitors` },
    { id: "search", area: "Search demand", metric: "academy_search_submitted and open_mat_search_submitted", value: `${(summary?.search.academySearches ?? 0) + (summary?.search.openMatSearches ?? 0)} searches` },
    { id: "profiles", area: "Profile engagement", metric: "academy_profile_viewed and open_mat_viewed", value: `${(summary?.profile.academyProfileViews ?? 0) + (summary?.profile.openMatViews ?? 0)} views` },
    { id: "commercial", area: "Commercial intent", metric: "commercial_intent_clicked", value: `${summary?.commercial.commercialIntentClicks ?? 0} clicks` },
    { id: "countries", area: "Country attribution", metric: "country_code and country_name from trusted request headers", value: countrySignalSummary },
    { id: "claims", area: "Claim funnel", metric: "claim_profile_started and claim_profile_submitted", value: `${summary?.claim.claimStarts ?? 0} starts / ${summary?.claim.claimSubmissions ?? 0} submitted` },
    { id: "supply", area: "Marketplace supply", metric: "academy_created and open_mat_created", value: `${summary?.supply.academiesCreated ?? 0} academies / ${summary?.supply.openMatsCreated ?? 0} open mats` },
    { id: "platform", area: "Platform Admin supply", metric: "Academies created by Platform Admins", value: platformAdminAcademyCount.toLocaleString() },
    { id: "inventory", area: "Current inventory", metric: "Current academies, verified, open mats, users, managed", value: `${academyCount.toLocaleString()} academies / ${verifiedAcademyCount.toLocaleString()} verified / ${activeEventCount.toLocaleString()} open mats / ${userCount.toLocaleString()} users / ${managedAcademyCount.toLocaleString()} managed / ${claimCount.toLocaleString()} claims / ${pendingAcademyCount.toLocaleString()} pending` },
  ];

  return (
    <section id="founder-analytics" className="mt-7 rounded-lg border border-teal-100 bg-white p-5 shadow-sm" aria-labelledby="founder-analytics-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-teal-800">Super Admin analytics</p>
          <h2 id="founder-analytics-title" className="mt-1 text-2xl font-black text-slate-950">Analytics</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">Founder-only visibility for marketplace, visitor, search, profile, commercial intent, claim funnel, and supply metrics.</p>
        </div>
        <Button href="/dashboard" variant="secondary" className="border-teal-200 text-teal-800">
          <MapPinned size={16} aria-hidden />
          Operational Dashboard
        </Button>
      </div>

      <StatsPanel className="mt-5" items={analyticsStats} />

      <Table
        className="mt-5"
        columns={[
          { key: "area", title: "Analytics Area", render: (value) => <span className="font-bold text-slate-950">{String(value)}</span> },
          { key: "metric", title: "Tracked Metrics" },
          { key: "value", title: "Current Signal", render: (value) => <TableStatusBadge status={String(value)} /> },
        ]}
        data={rows}
        emptyMessage="Analytics metrics will appear here once events are available."
        getRowId={(row) => String(row.id)}
        minWidthClassName="min-w-[760px]"
      />
    </section>
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
  activeSettingsAction,
  canViewWeeklyActivity,
  emailPage,
  emailOperationsView,
  emailOperations,
  platformAdminActivitySummary,
  recentAuditLogs,
}: {
  activeSettingsAction: "change-password" | "email-options" | "recent-audits" | "weekly-activity";
  canViewWeeklyActivity: boolean;
  emailPage: number;
  emailOperationsView: "attention" | "invalid-emails" | "queued" | "runs" | "scheduled-retries";
  emailOperations: Awaited<ReturnType<typeof getEmailQueueOperationsSummary>>;
  platformAdminActivitySummary: PlatformAdminActivitySummary | null;
  recentAuditLogs: SettingsAuditLog[];
}) {
  const emailOptionsHref = "/dashboard?panel=settings&settingsAction=email-options";
  const settingsActionItems: QuickActionPanelItem[] = [
    {
      active: activeSettingsAction === "change-password",
      title: "Change Password",
      description: "Set a new password for your administrator account",
      href: "/dashboard?panel=settings&settingsAction=change-password",
      icon: <KeyRound size={24} aria-hidden />,
      id: "change-password",
    },
    {
      active: activeSettingsAction === "email-options",
      title: "Email Options",
      description: "Process queue runs and inspect delivery issues",
      href: "/dashboard?panel=settings&settingsAction=email-options",
      icon: <Mail size={24} aria-hidden />,
      id: "email-options",
    },
    {
      active: activeSettingsAction === "recent-audits",
      title: "Recent Audits",
      description: "Review recent administrative audit activity",
      href: "/dashboard?panel=settings&settingsAction=recent-audits",
      icon: <ShieldCheck size={24} aria-hidden />,
      id: "recent-audits",
    },
    ...(canViewWeeklyActivity
      ? [
          {
            active: activeSettingsAction === "weekly-activity",
            title: "Weekly Activity Summary",
            description: "Review current-week contribution momentum",
            href: "/dashboard?panel=settings&settingsAction=weekly-activity",
            icon: <BarChart3 size={24} aria-hidden />,
            id: "weekly-activity",
          } satisfies QuickActionPanelItem,
        ]
      : []),
  ];
  const selectedSettingsItem = settingsActionItems.find((item) => item.active);

  return (
    <section className="px-4 py-8 sm:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Settings</h1>
          <p className="mt-2 text-slate-600">Manage email operations, audit activity, and your account password.</p>
        </div>
        <Button href="/dashboard?panel=settings" variant="secondary">
          <RefreshCw size={16} aria-hidden /> Refresh
        </Button>
      </div>

      <QuickActionPanel className="mt-7" items={settingsActionItems} />

      <SettingsDetailPanel title={selectedSettingsItem?.title ?? "Settings"}>
        {activeSettingsAction === "change-password" ? (
          <div className="max-w-xl">
            <p className="text-sm font-semibold leading-6 text-slate-600">Set a new password for your administrator account.</p>
            <div className="mt-5">
              <ChangePasswordForm cancelHref="/dashboard?panel=settings" embedded />
            </div>
          </div>
        ) : null}

        {activeSettingsAction === "email-options" ? (
          <EmailOperationsPanel
            action={processEmailQueue}
            activePage={emailPage}
            activeView={emailOperationsView}
            attentionHref={`${emailOptionsHref}&emailView=attention`}
            className="border-0 p-0 shadow-none sm:p-0 lg:col-span-1"
            invalidEmailsHref={`${emailOptionsHref}&emailView=invalid-emails`}
            queuedHref={`${emailOptionsHref}&emailView=queued`}
            refreshHref={emailOptionsHref}
            scheduledRetriesHref={`${emailOptionsHref}&emailView=scheduled-retries`}
            settingsHref="/admin/settings?settingsAction=email-options"
            summary={emailOperations}
          />
        ) : null}

        {activeSettingsAction === "recent-audits" ? (
          <RecentAuditList logs={recentAuditLogs} />
        ) : null}

        {activeSettingsAction === "weekly-activity" ? (
          platformAdminActivitySummary ? (
            <PlatformAdminActivitySummaryPanel embedded summary={platformAdminActivitySummary} />
          ) : (
            <p className="text-sm font-semibold leading-6 text-slate-600">
              Weekly activity summaries are tracked for Platform Admin contribution accounts. No current weekly activity summary is available for this account.
            </p>
          )
        ) : null}
      </SettingsDetailPanel>
    </section>
  );
}

function SettingsDetailPanel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="mt-7 rounded-lg border border-blue-300 bg-blue-50/20 p-4 shadow-sm sm:p-5" aria-labelledby="settings-detail-title">
      <h2 id="settings-detail-title" className="text-xl font-black text-blue-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function RecentAuditList({ logs }: { logs: SettingsAuditLog[] }) {
  return (
    <div>
      {logs.length ? (
        logs.map((log) => (
          <div key={log.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-stone-100 py-3 last:border-b-0">
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
    </div>
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

function AdminPanel({ title, description, action, children, id, search }: { title: string; description: string; action?: React.ReactNode; children: React.ReactNode; id?: string; search?: React.ReactNode }) {
  return (
    <section id={id}>
      <div className="grid gap-4 border-b border-stone-100 pb-4 lg:grid-cols-[minmax(240px,360px)_1fr] lg:items-start">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-black text-stone-950">{title}</h2>
          <p className="text-sm text-stone-600">{description}</p>
        </div>
        {search || action ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            {search}
            {action}
          </div>
        ) : null}
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

type PlatformAdminAcademyRow = {
  id: string;
  name: string;
  slug: string;
  borough: string | null;
  city: string;
  postcode: string;
  verificationStatus: AcademyVerificationStatus;
  createdAt: Date;
  createdBy: { email: string; name: string | null } | null;
};

type PlatformAdminAcademyTableRow = Record<string, unknown> & {
  id: string;
  academy: string;
  creator: string;
  creatorEmail: string;
  location: string;
  reviewHref: string;
  verificationStatus: AcademyVerificationStatus;
  createdAt: Date;
  slug: string;
};

type FounderAnalyticsRow = Record<string, unknown> & {
  id: string;
  area: string;
  metric: string;
  value: string;
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

const platformAdminAcademyColumns: TableColumn<PlatformAdminAcademyTableRow>[] = [
  {
    key: "academy",
    title: "Academy",
    render: (_value, row) => (
      <div>
        <p className="font-bold text-slate-950">{row.academy}</p>
        <p className="text-xs font-semibold text-slate-500">{row.location}</p>
      </div>
    ),
  },
  {
    key: "verificationStatus",
    title: "Verification",
    render: (value) => <TableStatusBadge status={String(value)} />,
  },
  {
    key: "createdAt",
    title: "Created",
    render: (value) => formatDate(value as Date),
  },
  {
    key: "creator",
    title: "Platform Admin",
    render: (_value, row) => (
      <div>
        <p className="font-bold text-slate-950">{row.creator}</p>
        <p className="break-all text-xs font-semibold text-slate-500">{row.creatorEmail}</p>
      </div>
    ),
  },
  {
    key: "reviewHref",
    title: "Actions",
    className: "text-right",
    headerClassName: "text-right",
    render: (value, row) => (
      <Button href={String(value)} aria-label={`Review ${row.academy}`} size="sm" variant="secondary" className="px-3 text-sm hover:border-teal-700 hover:text-teal-800">
        Review
      </Button>
    ),
  },
];

export function SuperAdminPlatformAcademiesPanel({
  academies,
  currentPage,
  params,
  search,
  stats,
  totalItems,
}: {
  academies: PlatformAdminAcademyRow[];
  currentPage: number;
  params: AdminSearchParams;
  search: string;
  stats: StatsPanelItem[];
  totalItems: number;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / platformAdminAcademyPageSize));
  const rows: PlatformAdminAcademyTableRow[] = academies.map((academy) => ({
    academy: academy.name,
    createdAt: academy.createdAt,
    creator: academy.createdBy?.name ?? academy.createdBy?.email ?? "Unknown Platform Admin",
    creatorEmail: academy.createdBy?.email ?? "Unknown",
    id: academy.id,
    location: [academy.borough ?? academy.city, academy.postcode].filter(Boolean).join(", "),
    reviewHref: `/admin/academies/${academy.id}`,
    slug: academy.slug,
    verificationStatus: academy.verificationStatus,
  }));

  return (
    <section id="platform-admin-created-academies" className="mt-7 rounded-lg border border-violet-100 bg-white p-5 shadow-sm" aria-labelledby="platform-admin-created-academies-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-violet-700">Super Admin review</p>
          <h2 id="platform-admin-created-academies-title" className="mt-1 text-2xl font-black text-slate-950">Academies Created By Platform Admins</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">Review Platform Admin academy creation activity without changing the global academy totals above.</p>
        </div>
        <Button href="/dashboard?panel=academies" variant="secondary" className="border-violet-200 text-violet-800">
          <Building2 size={16} aria-hidden />
          Full Academy Management
        </Button>
      </div>

      <StatsPanel className="mt-5" items={stats} />

      <form action="/dashboard" className="mt-5 flex flex-col gap-2 sm:max-w-xl sm:flex-row">
        <input type="hidden" name="panel" value="platform-admin-academies" />
        <input
          name="platformAcademiesSearch"
          defaultValue={search}
          placeholder="Search academy, location, postcode, or Platform Admin"
          className="min-h-12 min-w-0 flex-1 rounded-md border border-stone-300 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400"
        />
        <Button type="submit" variant="primary" className="min-h-12 sm:w-auto">
          <Search size={18} aria-hidden />
          Search
        </Button>
        {search ? (
          <Button href={platformAdminAcademiesHref(params, { platformAcademiesSearch: undefined, platformAcademiesPage: 1 })} variant="secondary" className="min-h-12 border-stone-200 text-slate-700">
            Reset
          </Button>
        ) : null}
      </form>

      <Table
        className="mt-5"
        columns={platformAdminAcademyColumns}
        data={rows}
        emptyMessage="No academies have been created by Platform Admins yet."
        getRowId={(row) => row.id}
        minWidthClassName="min-w-[920px]"
        pagination={totalItems > 0
          ? {
              page: currentPage,
              totalPages,
              previousHref: platformAdminAcademiesHref(params, { platformAcademiesPage: currentPage - 1 }),
              nextHref: platformAdminAcademiesHref(params, { platformAcademiesPage: currentPage + 1 }),
            }
          : undefined}
      />
    </section>
  );
}

export function AcademiesTable({ academies, params }: { academies: AcademyRow[]; params: AdminSearchParams }) {
  const returnTo = adminAcademiesHref(params, { dialog: undefined, academyId: undefined, academyIds: undefined });
  return (
    <form action="/dashboard" className="mt-4">
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
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-4 py-4">Select</th>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Location</th>
              <th className="px-5 py-4">Postcode</th>
              <th className="px-5 py-4">Claim</th>
              <th className="px-5 py-4">Email</th>
              <th className="w-40 whitespace-nowrap px-3 py-4">Claim Invite</th>
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
                  <td className="w-40 whitespace-nowrap px-3 py-4">
                    <div className="grid gap-2">
                      <Badge>{reminder.label}</Badge>
                      {!reminder.eligible ? (
                        <p className="text-xs font-semibold text-slate-500">{claimReminderReasonLabel(reminder.reason ?? "unavailable")}</p>
                      ) : null}
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
                        Profile Summary
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

function UsersTable({ actorAcademyId, actorId, actorRole, users }: { actorAcademyId?: string | null; actorId: string; actorRole: Role; users: UserRow[] }) {
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
            const academyCanManage = isAcademyAdminRole(actorRole) && actorId !== user.id && actorAcademyId === user.academyId && (user.role === Role.STANDARD_USER || user.role === Role.USER || user.role === Role.ACADEMY_ADMIN || user.role === Role.ACADEMY_OWNER);
            const canManage = academyCanManage || isSuperAdminRole(actorRole) || (isPlatformAdminRole(actorRole) && !protectedUser && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.PLATFORM_ADMIN);
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
                        <Link href={`/dashboard?panel=users&dialog=view-user&userId=${user.id}`} className={menuItemClass}>
                          <User size={18} aria-hidden />
                          View Profile
                        </Link>
                        <Link href={`/dashboard?panel=users&dialog=edit-user&userId=${user.id}`} className={menuItemClass}>
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
        <form action="/dashboard" className="contents">
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
            <Button href="/dashboard?panel=academy-claims" variant="secondary" className="border-stone-200 text-slate-700">Reset</Button>
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
      <Button href="/dashboard?panel=academy-claims" variant="secondary" className="mt-5">Refresh Claims</Button>
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
