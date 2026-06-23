import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { clsx } from "clsx";
import { Ban, BarChart3, Building2, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Copy, CreditCard, Download, Edit3, Eye, Filter, Globe2, Info, KeyRound, Mail, MapPinned, MousePointerClick, Plus, QrCode, RefreshCw, Search, Send, ShieldCheck, Trash2, User, Users, Wallet } from "lucide-react";
import { AcademyMap } from "@/components/AcademyMap";
import { claimReminderCooldownDays } from "@/lib/academy-claim-reminders";
import { getFounderAnalyticsReport } from "@/lib/analytics/reporting";
import { academyScopedAcademyWhere, academyScopedEventWhere, canSendManagedUserPasswordReset, elevatedAdminPrivacyAuditLogWhere, getCurrentUser, isAcademyAdminRole, isPlatformAdminRole, isProtectedSuperAdmin, isSuperAdminRole } from "@/lib/admin";
import { authorize, listAuthorisationRoles, listEffectiveUserPermissions, listUserPermissionAssignments, type AuthorisationRole } from "@/lib/authorisation-service";
import { BookingServiceError, listBookings, type BookingRecord } from "@/lib/bookings";
import { courseActivityTypeLabels } from "@/lib/course-activities";
import { cloneEventForCourseForm } from "@/lib/course-cloning";
import { courseAddress, courseLocationLabel, coursePriceLabel, courseTypeLabel, recurrenceLabel as courseRecurrenceLabel } from "@/lib/courses";
import { getMapItems } from "@/lib/data";
import { eventPermanentPath, eventPermanentUrl, eventQrCodePath } from "@/lib/event-share-links";
import { getInstructorUserOptions } from "@/lib/instructor-users";
import { calculatePlatformFeeMinor, getPaymentPlatformSettings, platformFeeLabel, platformFeePercentage, type PaymentPlatformSettings } from "@/lib/payment-platform-settings";
import { getPlatformAdminActivitySummary, type PlatformAdminActivitySummary } from "@/lib/platform-admin-activity";
import { listCourseOccurrencePayments, PaymentServiceError, type PaymentRecord } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { getEmailQueueOperationsSummary } from "@/lib/reliable-email";
import { enrichUsersWithAcademyNames } from "@/lib/rollfinder-user-profiles";
import { getDashboardShadowAccount } from "@/lib/standard-dashboard";
import { rollfindersPlatformPaymentAccountStatus } from "@/lib/stripe-connect";
import { getUserPermissionPanelModel, listManagedUsers, type ManagedUser } from "@/lib/users-service";
import { AcademyVerificationStatus, ClaimStatus, CourseType, EventAudience, EventPricingType, Role, UserStatus, type Prisma } from "@prisma/client";
import { directionsUrl, formatDate } from "@/lib/utils";
import { Button } from "@/components/Button";
import { DialogShell } from "@/components/DialogShell";
import { InlineDirectionsButton } from "@/components/InlineDirectionsButton";
import { LineOverviewChart } from "@/components/LineOverviewChart";
import { LinkedText } from "@/components/LinkedText";
import { LogoutButton } from "@/components/LogoutButton";
import { PaymentAccountSetup } from "@/components/PaymentAccountSetup";
import { PaymentOverview, type PaymentOverviewMetric } from "@/components/PaymentOverview";
import { PublicListingWarning } from "@/components/PublicListingWarning";
import { QuickActionPanel, type QuickActionPanelItem } from "@/components/QuickActionPanel";
import { PlatformAdminActivitySummaryPanel } from "@/components/PlatformAdminActivitySummaryPanel";
import { SidePanelControl, type SidePanelItem } from "@/components/SidePanelControl";
import { Icon } from "@/components/Icons";
import { StatsPanel, type StatsPanelItem } from "@/components/StatsPanel";
import { Table, TableRow, TableStatusBadge, type TableColumn } from "@/components/Table";
import { createAcademy, sendAcademyClaimReminder, sendBulkAcademyClaimReminders, updateAcademy } from "../admin/academies/actions";
import { AcademyForm } from "../admin/academies/AcademyForm";
import { OpenMatForm } from "../admin/open-mats/OpenMatForm";
import { createCourse } from "../admin/courses/actions";
import { createManagedUser, deleteManagedUser, toggleManagedUserDisabled, updateManagedUser } from "../admin/users/actions";
import { processEmailQueue } from "../admin/actions";
import { UserForm } from "../admin/users/UserForm";
import { ActionMenu } from "../admin/ActionMenu";
import { fetchAcademyClaims, type AcademyClaimListItem } from "../admin/academy-claims/api";
import { EmailOperationsPanel } from "../admin/EmailOperationsPanel";
import { EditProfileForm } from "./EditProfileForm";
import { ChangePasswordForm } from "./password/ChangePasswordForm";
import { UserPermissionsBoard } from "./UserPermissionsBoard";
import { updatePlatformPaymentFees } from "./paymentSettingsActions";
import { cancelDashboardBooking, confirmDashboardBooking } from "./bookingActions";
import { BookingActionSubmitButton } from "./BookingActionSubmitButton";

export { PlatformAdminActivitySummaryPanel } from "@/components/PlatformAdminActivitySummaryPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Dashboard",
  description: "Manage RollFinders academies, open mats, users, email delivery, and platform operations.",
};

const pageSize = 8;
const usersPageSize = 10;
const platformAdminAcademyPageSize = 5;
const claimPageSizes = [20, 50, 100];
const openMatSessionsLabel = "Courses/Events";

type AdminSearchParams = Record<string, string | string[] | undefined>;
type PaymentAccountSettingView = {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  providerAccountId: string | null;
  status: string;
};

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
      { createdById: { not: null } },
      extra,
    ],
  };
}

function selectedPanel(value: string | undefined) {
  if (value === "open-mats" || value === "users" || value === "settings" || value === "maps" || value === "payments" || value === "bookings" || value === "academy-claims" || value === "platform-admin-academies" || value === "analytics") return value;
  return "academies";
}

function isPlatformOnlyPanel(panel: string) {
  return panel === "maps" || panel === "academy-claims";
}

function isSuperOnlyPanel(panel: string) {
  return panel === "platform-admin-academies" || panel === "analytics";
}

async function resolvePaymentMetricVisibility(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>): Promise<PaymentMetricVisibility> {
  const scope = {
    organisationId: user.academyId ?? undefined,
    applicationId: process.env.ROLLFINDERS_APPLICATION_ID ?? "app_rollfinders",
  };
  const [grossPaid, successfulPayments, platformRevenue, refunds] = await Promise.all([
    authorize(user, "payment.report.revenue.read", scope),
    authorize(user, "payment.search", scope),
    authorize(user, "payment.report.platform_revenue.read", scope),
    authorize(user, "payment.report.refund.read", scope),
  ]);

  return { grossPaid, platformRevenue, refunds, successfulPayments };
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
  if (value === "change-password" || value === "edit-profile" || value === "email-options" || value === "recent-audits" || value === "weekly-activity") return value;
  return "change-password";
}

type PaymentOverviewPeriod = "daily" | "weekly" | "monthly" | "yearly";
type PaymentsDashboardView = "overview" | "transactions" | "earnings" | "refunds" | "payouts" | "settings";
type UsersDashboardView = "overview" | "roles" | "permissions" | "access-keys" | "mfa";

function selectedPaymentOverviewPeriod(value: string | undefined): PaymentOverviewPeriod {
  if (value === "weekly" || value === "monthly" || value === "yearly") return value;
  return "daily";
}

function selectedPaymentsDashboardView(value: string | undefined): PaymentsDashboardView {
  if (value === "transaction" || value === "transactions") return "transactions";
  if (value === "earning" || value === "earnings") return "earnings";
  if (value === "refund" || value === "refunds") return "refunds";
  if (value === "payout" || value === "payouts") return "payouts";
  if (value === "setting" || value === "settings") return "settings";
  return "overview";
}

function selectedUsersDashboardView(value: string | undefined): UsersDashboardView {
  if (value === "role" || value === "roles") return "roles";
  if (value === "permission" || value === "permissions") return "permissions";
  if (value === "access-key" || value === "access-keys" || value === "keys") return "access-keys";
  if (value === "mfa") return "mfa";
  return "overview";
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

function dashboardUsersHref(searchParams: AdminSearchParams, overrides: Record<string, string | number | undefined> = {}) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (!value || key === "userResult" || key === "email" || key === "dialog" || key === "userId") return;
    if (Array.isArray(value)) {
      value.forEach((item) => item && params.append(key, item));
      return;
    }
    params.set(key, value);
  });
  params.set("panel", "users");
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === 1) {
      params.delete(key);
      return;
    }
    params.set(key, String(value));
  });
  params.set("panel", "users");
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

type DashboardPaymentsResult = {
  error?: string;
  payments: PaymentRecord[];
};

type PaymentMetricVisibility = {
  grossPaid: boolean;
  platformRevenue: boolean;
  refunds: boolean;
  successfulPayments: boolean;
};

type DashboardBookingsResult = {
  bookings: BookingRecord[];
  error?: string;
};

async function getDashboardPayments(academyId?: string | null): Promise<DashboardPaymentsResult> {
  try {
    const payments = await listCourseOccurrencePayments({ limit: 100 });
    return {
      payments: academyId ? payments.filter((payment) => payment.metadata?.academy_id === academyId) : payments,
    };
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      return { error: error.status === 0 ? error.message : `Payment service returned status ${error.status}.`, payments: [] };
    }
    return { error: "Payment service is unavailable.", payments: [] };
  }
}

async function getDashboardBookings(academyId?: string | null): Promise<DashboardBookingsResult> {
  try {
    const bookings = await listBookings({ limit: 100, organisationId: academyId });
    return { bookings };
  } catch (error) {
    if (error instanceof BookingServiceError) {
      return { bookings: [], error: error.status === 0 ? error.message : `Booking service returned status ${error.status}.` };
    }
    return { bookings: [], error: "Booking service is unavailable." };
  }
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
  const account = await getDashboardShadowAccount(currentUser);
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
  const eventDialogId = firstParam(params.eventId);
  const cloneFromEventId = firstParam(params.cloneFrom);
  const academyDialogId = firstParam(params.academyId);
  const selectedAcademyIds = Array.isArray(params.academyIds) ? params.academyIds : firstParam(params.academyIds) ? [firstParam(params.academyIds) as string] : [];
  const search = (firstParam(params.search) ?? "").trim();
  const paymentsSearch = (firstParam(params.paymentsSearch) ?? "").trim();
  const paymentsView = selectedPaymentsDashboardView(firstParam(params.paymentsView));
  const paymentsPeriod = selectedPaymentOverviewPeriod(firstParam(params.paymentsPeriod));
  const usersView = selectedUsersDashboardView(firstParam(params.usersView));
  const stripeConnectMessage = firstParam(params.stripeConnect);
  const stripeConnectError = firstParam(params.stripeConnectError);
  const paymentSettingsMessage = firstParam(params.paymentSettingsMessage);
  const paymentSettingsError = firstParam(params.paymentSettingsError);
  const bookingActionError = firstParam(params.bookingActionError);
  const bookingActionBookingId = firstParam(params.bookingActionBookingId);
  const bookingsSearch = (firstParam(params.bookingsSearch) ?? "").trim();
  const platformAcademiesSearch = (firstParam(params.platformAcademiesSearch) ?? "").trim();
  const platformAdmin = isPlatformAdminRole(currentUser.role);
  const elevatedAdmin = !academyAdmin && platformAdmin;
  const paymentAccountOwner = academyAdmin && currentUser.academyId
    ? { ownerId: currentUser.academyId, ownerType: "academy" }
    : { ownerId: "rollfinders", ownerType: "platform" };

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
  reminderCooldownStart.setDate(reminderCooldownStart.getDate() - claimReminderCooldownDays);
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
  const userQueryParams = new URLSearchParams({
    page: String(userPage),
    pageSize: String(usersPageSize),
  });
  if (search) userQueryParams.set("search", search);
  if (roleSearch) userQueryParams.set("role", roleSearch);
  if (userStatusSearch) userQueryParams.set("status", userStatusSearch);
  const managedUsersPagePromise = listManagedUsers(currentUser, userQueryParams.toString());
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
    managedUsersPagePromise.then((result) => result.totalItems),
    prisma.event.count({ where: eventWhere }),
    managedUsersPagePromise.then((result) => result.totalItems),
    superAdmin ? prisma.academy.count({ where: platformAdminAcademiesWhere }) : Promise.resolve(0),
    superAdmin ? prisma.academy.count({ where: platformAdminCreatedAcademyWhere({ verificationStatus: AcademyVerificationStatus.VERIFIED }) }) : Promise.resolve(0),
    superAdmin ? prisma.academy.count({ where: platformAdminCreatedAcademyWhere({ verificationStatus: AcademyVerificationStatus.PENDING }) }) : Promise.resolve(0),
    Promise.resolve(0),
    superAdmin ? prisma.academy.count({ where: platformAdminCreatedAcademyWhere({ createdAt: { gte: monthStart } }) }) : Promise.resolve(0),
    prisma.academy.count({ where: { AND: [academyScopeWhere, { createdAt: { gte: monthStart } }] } }),
    prisma.academy.count({ where: { AND: [academyScopeWhere, { verificationStatus: AcademyVerificationStatus.VERIFIED, updatedAt: { gte: monthStart } }] } }),
    Promise.resolve(0),
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
    instructorUsers,
    platformAdminActivitySummary,
    assignedAcademyProfile,
    paymentResult,
    paymentAccountSetting,
    paymentPlatformSettings,
    paymentMetricVisibility,
    bookingResult,
    authorisationRoles,
    currentUserEffectivePermissions,
    currentUserPermissionAssignments,
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
        })
      : Promise.resolve([]),
    prisma.event.findMany({
      skip: (currentEventPage - 1) * pageSize,
      take: pageSize,
      where: eventWhere,
      include: { academy: true },
      orderBy: { eventDate: "asc" },
    }),
    managedUsersPagePromise.then((result) =>
      enrichUsersWithAcademyNames(result.users.map((user) => ({
        ...user,
        role: user.role as Role,
        status: user.status as UserStatus,
        createdAt: new Date(user.createdAt),
      }))),
    ),
    prisma.adminAuditLog.findMany({
      where: elevatedAdminPrivacyAuditLogWhere({ role: currentUser.role }),
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    panel === "maps" ? getMapItems() : Promise.resolve([]),
    prisma.academy.findMany({ where: academyScopeWhere, orderBy: { name: "asc" } }),
    Promise.resolve([]),
    elevatedAdmin ? getPlatformAdminActivitySummary(currentUser.id) : Promise.resolve(null),
    academyAdmin && currentUser.academyId
      ? prisma.academy.findUnique({
          where: { id: currentUser.academyId },
          include: { events: true, claims: true, members: true, socialLinks: { orderBy: { platform: "asc" } } },
        })
      : Promise.resolve(null),
    panel === "payments" ? getDashboardPayments(academyAdmin ? currentUser.academyId : null) : Promise.resolve({ payments: [] }),
    panel === "payments"
      ? prisma.paymentAccountSetting.findUnique({
          where: {
            ownerType_ownerId_provider: {
              ownerId: paymentAccountOwner.ownerId,
              ownerType: paymentAccountOwner.ownerType,
              provider: "stripe",
            },
          },
        }).then((setting) => setting ?? (academyAdmin ? null : rollfindersPlatformPaymentAccountStatus()))
      : Promise.resolve(null),
    panel === "payments" ? getPaymentPlatformSettings() : Promise.resolve(null),
    panel === "payments" ? resolvePaymentMetricVisibility(currentUser) : Promise.resolve({ grossPaid: false, platformRevenue: false, refunds: false, successfulPayments: false }),
    panel === "bookings" ? getDashboardBookings(academyAdmin ? currentUser.academyId : null) : Promise.resolve({ bookings: [] }),
    panel === "users" && usersView === "roles" ? listAuthorisationRoles() : Promise.resolve([]),
    panel === "users" ? listEffectiveUserPermissions(currentUser.id, {
      organisationId: currentUser.academyId ?? undefined,
      applicationId: process.env.ROLLFINDERS_APPLICATION_ID ?? "app_rollfinders",
    }) : Promise.resolve([]),
    panel === "users" ? listUserPermissionAssignments(currentUser.id) : Promise.resolve([]),
  ]);
  const selectedDialogUser = userDialogId ? users.find((user) => user.id === userDialogId) : undefined;
  const selectedDialogEvent = panel === "open-mats" && dialog === "view-event" && eventDialogId
    ? await prisma.event.findFirst({
        where: { AND: [eventScopeWhere, { id: eventDialogId, active: true }] },
        include: {
          academy: {
            include: {
              claims: { where: { status: ClaimStatus.APPROVED }, select: { status: true } },
              members: { select: { id: true }, take: 1 },
            },
          },
          activities: { orderBy: [{ startTime: "asc" }, { sortOrder: "asc" }] },
        },
      })
    : null;
  const selectedDialogAcademy = panel === "academies" && (dialog === "view-academy" || dialog === "edit-academy") && academyDialogId
    ? await prisma.academy.findFirst({
        where: { AND: [academyScopeWhere, { id: academyDialogId }] },
        include: {
          claims: true,
          events: { where: { active: true }, orderBy: { eventDate: "asc" }, take: 5 },
          members: true,
          socialLinks: { orderBy: { platform: "asc" } },
        },
      })
    : null;
  const cloneSourceEvent = panel === "open-mats" && dialog === "create-course" && cloneFromEventId
    ? await prisma.event.findFirst({
        where: { AND: [eventScopeWhere, { id: cloneFromEventId }] },
        include: { activities: { orderBy: [{ startTime: "asc" }, { sortOrder: "asc" }] } },
      })
    : null;
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
      href: "/dashboard?panel=academies",
      icon: "academies",
      label: academyAdmin ? "Academy Profile" : "Manage Academies",
    },
    { active: panel === "open-mats", href: "/dashboard?panel=open-mats", icon: "events", label: openMatSessionsLabel },
    { active: panel === "bookings", href: "/dashboard?panel=bookings", icon: "bookings", label: "Bookings" },
    { active: panel === "payments", href: "/dashboard?panel=payments", icon: "payments", label: "Payments" },
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
    ...(academyAdmin
      ? [
          { active: panel === "settings", href: "/dashboard?panel=settings", icon: "settings", label: "Settings" } satisfies SidePanelItem,
        ]
      : []),
  ];
  const mapNavigationItem = adminNavigationItems.find((item) => item.href === "/dashboard?panel=maps");
  const settingsNavigationItem = adminNavigationItems.find((item) => item.href === "/dashboard?panel=settings");
  const paymentNavigationSections = [
    { href: "/dashboard?panel=payments&paymentsView=overview", label: "Overview", active: panel === "payments" && paymentsView === "overview" },
    { href: "/dashboard?panel=payments&paymentsView=transactions", label: "Transactions", active: panel === "payments" && paymentsView === "transactions" },
    { href: "/dashboard?panel=payments&paymentsView=earnings", label: "Earnings", active: panel === "payments" && paymentsView === "earnings" },
    { href: "/dashboard?panel=payments&paymentsView=refunds", label: "Refunds", active: panel === "payments" && paymentsView === "refunds" },
    { href: "/dashboard?panel=payments&paymentsView=payouts", label: "Payouts", active: panel === "payments" && paymentsView === "payouts" },
    { href: "/dashboard?panel=payments&paymentsView=settings", label: "Payment Settings", active: panel === "payments" && paymentsView === "settings" },
  ];
  const userNavigationSections = [
    { href: dashboardUsersHref(params, { usersView: "roles", usersPage: undefined }), icon: "roles", label: "Roles", active: panel === "users" && usersView === "roles" },
    { href: dashboardUsersHref(params, { usersView: "permissions", usersPage: undefined }), icon: "permissions", label: "Permissions", active: panel === "users" && usersView === "permissions" },
    { href: dashboardUsersHref(params, { usersView: "access-keys", usersPage: undefined }), icon: "accessKeys", label: "Access Keys", active: panel === "users" && usersView === "access-keys" },
    { href: dashboardUsersHref(params, { usersView: "mfa", usersPage: undefined }), icon: "mfa", label: "MFA", active: panel === "users" && usersView === "mfa" },
  ] satisfies SidePanelItem["children"];
  const dashboardServiceNavigationItems = adminNavigationItems
    .filter((item) => item.href !== "/dashboard" && item.href !== "/dashboard?panel=maps" && item.href !== "/dashboard?panel=settings")
    .map((item) => item.href === "/dashboard?panel=academies" ? { ...item, label: "Academies" } : item);
  const hideSharedDashboardSections = ["academies", "open-mats", "bookings", "payments", "users"].includes(panel);
  const activeServiceNavigationItem = adminNavigationItems.find((item) => item.active) ?? dashboardServiceNavigationItems[0];
  const activeServicePanelNavigationItem = activeServiceNavigationItem?.href === "/dashboard?panel=payments"
    ? { ...activeServiceNavigationItem, children: paymentNavigationSections }
    : activeServiceNavigationItem?.href === "/dashboard?panel=users"
      ? { ...activeServiceNavigationItem, children: userNavigationSections }
    : activeServiceNavigationItem;
  const serviceNavigationItems: SidePanelItem[] = [
    ...(activeServicePanelNavigationItem &&
    activeServicePanelNavigationItem.href !== mapNavigationItem?.href &&
    activeServicePanelNavigationItem.href !== settingsNavigationItem?.href
      ? [activeServicePanelNavigationItem]
      : []),
  ];
  const sidePanelFooterNavigationItems: SidePanelItem[] = [
    ...(mapNavigationItem ? [mapNavigationItem] : []),
    ...(settingsNavigationItem ? [settingsNavigationItem] : []),
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
          id: "academy-open-mats-sessions",
          label: openMatSessionsLabel,
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
          label: "Courses/Events",
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
      href: "/dashboard?panel=academies",
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
      description: academyAdmin ? "Create and manage academy courses/events" : "Create, edit and manage courses/events",
      href: "/dashboard?panel=open-mats",
      icon: <CalendarDays size={24} aria-hidden />,
      id: "open-mats",
      title: openMatSessionsLabel,
    },
    {
      active: panel === "bookings",
      description: academyAdmin ? "Review bookings for your academy courses/events" : "Review course and event bookings",
      href: "/dashboard?panel=bookings",
      icon: <ClipboardCheck size={24} aria-hidden />,
      id: "bookings",
      title: "Bookings",
    },
    {
      active: panel === "payments",
      description: academyAdmin ? "Review payments made to your academy courses/events" : "Review course and event payments",
      href: "/dashboard?panel=payments",
      icon: <CreditCard size={24} aria-hidden />,
      id: "payments",
      title: "Payments",
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
        footerNavigationItems={sidePanelFooterNavigationItems}
        mobileNavigationItems={dashboardServiceNavigationItems}
        navigationItems={serviceNavigationItems}
        roleLabel={roleLabel(account?.role ?? currentUser.role)}
      />

      <main className="transition-[padding] duration-200 lg:pl-[var(--admin-side-panel-width,16rem)]">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b border-stone-200 bg-white px-4 sm:px-8 lg:min-h-24">
          <div className="size-11 lg:hidden" aria-hidden />
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-4">
            <DashboardServiceMenu items={dashboardServiceNavigationItems} />
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
              <nav className="mt-4 grid gap-1 border-b border-stone-100 pb-4 lg:hidden" aria-label="Service dashboards">
                {dashboardServiceNavigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={item.active ? "page" : undefined}
                    className={clsx(
                      "inline-flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2",
                      item.active ? "font-bold text-stone-950" : "font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-950",
                    )}
                  >
                    <Icon name={item.icon} size={17} className="shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
              <div className="mt-3 flex justify-end">
                <LogoutButton />
              </div>
            </ActionMenu>
          </div>
        </header>

        {panel === "settings" ? (
          <SettingsDashboardContent
            account={account}
            activeSettingsAction={activeSettingsAction}
            academyAdmin={academyAdmin}
            canViewWeeklyActivity={elevatedAdmin}
            emailPage={emailPage}
            emailOperations={emailOperations}
            emailOperationsView={emailOperationsView}
            elevatedAdmin={elevatedAdmin}
            platformAdminActivitySummary={platformAdminActivitySummary}
            recentAuditLogs={recentAuditLogs}
          />
        ) : panel === "maps" ? (
          <MapDashboardContent academies={mapItems} />
        ) : (
        <section className="px-4 py-8 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-950">{panel === "academies" ? "Academies" : panel === "open-mats" ? "Course/Events Dashboard" : panel === "bookings" ? "Bookings" : panel === "payments" ? "Payment Dashboard" : panel === "users" ? "User's Boards" : academyAdmin ? "Academy Admin Board" : "Dashboard"}</h1>
              <p className="mt-2 text-slate-600">{academyAdmin ? "Manage your assigned academy, users, and courses/events." : "Review platform health and manage operational records."}</p>
            </div>
          </div>

          {!hideSharedDashboardSections ? (
            <>
              <StatsPanel
                className="mt-6 hidden rounded-lg border border-teal-200 bg-white p-4 shadow-sm md:block"
                collapseStorageKey="rollfinders.dashboardStatsCollapsed"
                collapsible
                defaultCollapsed
                items={statCards}
                persistCollapseState
                title="Stats Board"
              />

              <QuickActionPanel
                className="mt-7 hidden rounded-lg border border-teal-200 bg-white p-4 shadow-sm md:block"
                collapseStorageKey="rollfinders.dashboardQuickActionsCollapsed"
                collapsible
                defaultCollapsed
                items={quickActionItems}
                persistCollapseState
              />
            </>
          ) : null}

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
              {academyAdmin ? (
                <AcademyProfilePanel academy={assignedAcademyProfile} />
              ) : (
                <>
                  <ClaimInvitationResult params={params} />
                  <ClaimReminderResult params={params} />
                  <AcademiesTable academies={academies} params={params} />
                  <Pagination currentPage={currentAcademyPage} totalItems={academyCount} pageKey="academiesPage" searchParams={params} />
                </>
              )}
            </AdminPanel>
          ) : null}
          {panel === "open-mats" ? (
            <AdminPanel
              action={(
                <Button href="/dashboard?panel=open-mats&dialog=create-course" variant="primary" className="min-h-12 shadow-sm">
                  <Plus size={18} aria-hidden />
                  New Course
                </Button>
              )}
              description="Active courses/events ordered by event date."
              id="open-mats"
              search={<PanelSearch panel={panel} search={search} />}
              title="Courses/Events"
            >
              <OpenMatsTable events={events} />
              <Pagination currentPage={currentEventPage} totalItems={activeEventCount} pageKey="eventsPage" searchParams={params} />
            </AdminPanel>
          ) : null}
          {panel === "payments" ? (
            <AdminPanel
              action={paymentsView === "payouts" ? null : <PaymentsDashboardActions payments={paymentResult.payments} />}
              description={paymentsView === "transactions" ? "View and manage all payments made to your academy." : paymentsView === "earnings" ? "Track your revenue and earnings over time." : paymentsView === "refunds" ? "View and manage all refunds issued." : paymentsView === "payouts" ? "Track and manage payouts sent to your bank account." : paymentsView === "settings" ? academyAdmin ? "Set up and manage the academy payout account." : "Manage the RollFinders payment account and platform payment setup." : academyAdmin ? "Overview of payment activity for your academy courses and events." : "Overview of all payment activity across the RollFinders platform."}
              id="payments"
              search={paymentsView === "overview" ? <PaymentsPanelSearch search={paymentsSearch} /> : null}
              title={paymentsView === "transactions" ? "Transactions" : paymentsView === "earnings" ? "Earnings" : paymentsView === "refunds" ? "Refunds" : paymentsView === "payouts" ? "Payouts" : paymentsView === "settings" ? "Payment Settings" : "Payments Dashboard"}
            >
              <PaymentsPanel
                academyAdmin={academyAdmin}
                metricVisibility={paymentMetricVisibility}
                paymentAccountSetting={paymentAccountSetting}
                paymentPlatformSettings={paymentPlatformSettings ?? undefined}
                period={paymentsPeriod}
                result={paymentResult}
                search={paymentsSearch}
                stripeConnectError={stripeConnectError}
                stripeConnectMessage={stripeConnectMessage}
                paymentSettingsError={paymentSettingsError}
                paymentSettingsMessage={paymentSettingsMessage}
                view={paymentsView}
              />
            </AdminPanel>
          ) : null}
          {panel === "bookings" ? (
            <AdminPanel
              description={academyAdmin ? "Bookings made for your academy courses and events." : "Bookings made across RollFinders courses and events."}
              id="bookings"
              search={<BookingsPanelSearch search={bookingsSearch} />}
              title="Bookings"
            >
              <BookingsPanel academyAdmin={academyAdmin} actionBookingId={bookingActionBookingId} actionError={bookingActionError} result={bookingResult} search={bookingsSearch} />
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
              action={usersView === "overview" ? (
                <Button href="/dashboard?panel=users&dialog=new-user" variant="primary" className="min-h-12 shadow-sm">
                  <Plus size={18} aria-hidden />
                  New User
                </Button>
              ) : null}
              description={usersView === "roles"
                ? "Roles configured in the Authorisation system."
                : usersView === "permissions"
                  ? "Effective permissions available to your account."
                  : usersView === "access-keys"
                    ? "Access key management for your account."
                    : usersView === "mfa"
                      ? "Multi-factor authentication settings for your account."
                      : "Newest operational slice of user records and role assignments."}
              id="users"
              search={usersView === "overview" ? <PanelSearch panel={panel} search={search} /> : null}
              title={usersView === "roles" ? "Roles" : usersView === "permissions" ? "Permissions" : usersView === "access-keys" ? "Access Keys" : usersView === "mfa" ? "MFA" : "Users & Roles"}
            >
              {usersView === "roles" ? (
                <SystemRolesPanel roles={authorisationRoles} />
              ) : usersView === "permissions" ? (
                <UserPermissionsBoard directAssignments={currentUserPermissionAssignments} permissions={currentUserEffectivePermissions} />
              ) : usersView === "access-keys" ? (
                <UnavailableUserSecurityPanel title="Access Keys" description="Access key management is not available in the current Users or Authorisation service contracts yet." />
              ) : usersView === "mfa" ? (
                <UnavailableUserSecurityPanel title="MFA" description="MFA management is not available in the current dashboard contract yet." />
              ) : (
                <>
                  <UserResult params={params} />
                  <UsersTable actorAcademyId={currentUser.academyId} actorId={currentUser.id} actorRole={currentUser.role} params={params} users={users} />
                  <Pagination currentPage={currentUserPage} totalItems={userCount} pageKey="usersPage" searchParams={params} />
                </>
              )}
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
        <EditUserDialog actor={currentUser} academies={academyOptions} academyAdmin={academyAdmin} superAdmin={superAdmin} user={selectedDialogUser} />
      ) : null}
      {panel === "academies" && dialog === "new-academy" && platformAdmin ? (
        <NewAcademyDialog />
      ) : null}
      {panel === "academies" && dialog === "view-academy" && selectedDialogAcademy ? (
        <ViewAcademyDialog academy={selectedDialogAcademy} closeHref={adminAcademiesHref(params, { dialog: undefined, academyId: undefined })} showAcademyStats={platformAdmin} />
      ) : null}
      {panel === "academies" && dialog === "edit-academy" && selectedDialogAcademy ? (
        <EditAcademyDialog academy={selectedDialogAcademy} academyAdmin={academyAdmin} closeHref={adminAcademiesHref(params, { dialog: undefined, academyId: undefined })} />
      ) : null}
      {panel === "academies" && dialog === "claim-reminder" && selectedReminderAcademy ? (
        <ClaimReminderDialog academy={selectedReminderAcademy} closeHref={adminAcademiesHref(params, { dialog: undefined, academyId: undefined })} returnTo={adminAcademiesHref(params, { dialog: undefined, academyId: undefined })} />
      ) : null}
      {panel === "academies" && dialog === "bulk-claim-reminders" ? (
        <BulkClaimReminderDialog academies={selectedBulkReminderAcademies} closeHref={adminAcademiesHref(params, { dialog: undefined, academyIds: undefined })} returnTo={adminAcademiesHref(params, { dialog: undefined, academyIds: undefined })} />
      ) : null}
      {panel === "open-mats" && dialog === "create-course" ? (
        <CreateCourseDialog academies={academyOptions} cloneSource={cloneSourceEvent} instructorUsers={instructorUsers} />
      ) : null}
      {panel === "open-mats" && dialog === "view-event" && selectedDialogEvent ? (
        <ViewEventDialog event={selectedDialogEvent} />
      ) : null}
    </div>
  );
}

type DashboardEventDetail = Prisma.EventGetPayload<{
  include: {
    academy: {
      include: {
        claims: { select: { status: true } };
        members: { select: { id: true } };
      };
    };
    activities: true;
  };
}>;

type DashboardAcademyDetail = Prisma.AcademyGetPayload<{
  include: {
    claims: true;
    events: true;
    members: true;
    socialLinks: true;
  };
}>;

function ViewAcademyDialog({ academy, closeHref, showAcademyStats }: { academy: DashboardAcademyDetail; closeHref: string; showAcademyStats: boolean }) {
  const claimState = academy.members.length > 0 || academy.claims.some((claim) => claim.status === ClaimStatus.APPROVED)
    ? "Claimed"
    : academy.claims.some((claim) => claim.status === ClaimStatus.PENDING)
      ? "Pending claim"
      : "Unclaimed";

  return (
    <DialogShell closeHref={closeHref} description={`${academy.city}, ${academy.postcode}`} maxWidthClass="max-w-5xl" title={academy.name}>
      <section className="pt-5">
        <div className="flex flex-wrap gap-2">
          <Badge>{academy.verificationStatus}</Badge>
          <Badge>{academy.featured ? "Featured" : "Not Featured"}</Badge>
          <Badge>{claimState}</Badge>
        </div>

        <div className={`mt-6 grid gap-4 ${showAcademyStats ? "lg:grid-cols-3" : ""}`}>
          <section className={`rounded-lg border border-stone-200 bg-white p-4 ${showAcademyStats ? "lg:col-span-2" : ""}`}>
            <h3 className="text-lg font-black text-stone-950">Summary</h3>
            <p className="mt-3 whitespace-pre-wrap leading-7 text-stone-700">{academy.description || "No description has been added."}</p>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <DialogInfo label="Website" value={academy.website ? <a className="break-all text-teal-800" href={academy.website} target="_blank" rel="noreferrer">{academy.website}</a> : "Not listed"} />
              <DialogInfo label="Email" value={academy.email ? <a className="break-all text-teal-800" href={`mailto:${academy.email}`}>{academy.email}</a> : "Not listed"} />
              <DialogInfo label="Phone" value={academy.phone ? <a className="text-teal-800" href={`tel:${academy.phone}`}>{academy.phone}</a> : "Not listed"} />
              <DialogInfo label="Categories" value={academy.categories || "Not categorised"} />
              <DialogInfo label="Address" value={`${academy.address}, ${academy.city} ${academy.postcode}`} />
              <DialogInfo label="Location" value={academy.borough ?? academy.city} />
            </div>
          </section>

          {showAcademyStats ? (
            <section className="rounded-lg border border-stone-200 bg-white p-4">
              <h3 className="text-lg font-black text-stone-950">Statistics</h3>
              <div className="mt-3 grid gap-3">
                <DialogInfo label="Claim requests" value={academy.claims.length.toString()} />
                <DialogInfo label="Admins" value={academy.members.length.toString()} />
                <DialogInfo label="Upcoming courses/events" value={academy.events.length.toString()} />
                <DialogInfo label="Reviews" value="0" />
                <DialogInfo label="Average rating" value="Not rated" />
              </div>
            </section>
          ) : null}
        </div>

        {academy.socialLinks.length ? (
          <section className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
            <h3 className="text-lg font-black text-stone-950">Social Links</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {academy.socialLinks.map((link) => (
                <Button key={link.id} href={link.url} target="_blank" rel="noreferrer" variant="secondary" size="sm">
                  {sentenceCase(link.platform)}
                </Button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
          <h3 className="text-lg font-black text-stone-950">Upcoming Courses/Events</h3>
          <div className="mt-3 grid gap-3">
            {academy.events.map((event) => (
              <div key={event.id} className="rounded-md bg-stone-50 p-3 text-sm text-stone-700">
                <p className="font-bold text-stone-950">{event.title}</p>
                <p>{formatDate(event.eventDate)} · {event.startTime}-{event.endTime}</p>
              </div>
            ))}
            {!academy.events.length ? <p className="text-sm font-semibold text-stone-600">No active courses or events are listed.</p> : null}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button href={`/academies/${academy.slug}`} target="_blank" rel="noreferrer" variant="secondary">View Public Profile</Button>
          <Button href={directionsUrl(`${academy.address}, ${academy.city} ${academy.postcode}`)} target="_blank" rel="noreferrer" variant="neutral">Directions</Button>
        </div>
      </section>
    </DialogShell>
  );
}

function EditAcademyDialog({ academy, academyAdmin, closeHref }: { academy: DashboardAcademyDetail; academyAdmin: boolean; closeHref: string }) {
  return (
    <DialogShell closeHref={closeHref} description="Edit academy information without leaving the dashboard." maxWidthClass="max-w-6xl" title={`Edit ${academy.name}`}>
      <AcademyForm
        action={updateAcademy.bind(null, academy.id)}
        academy={academy}
        canManagePlatformFields={!academyAdmin}
        cancelHref={closeHref}
        returnTo={closeHref}
      />
    </DialogShell>
  );
}

function DialogInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <div className="mt-1 break-words font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function ViewEventDialog({ event }: { event: DashboardEventDetail }) {
  const openMat = event.courseType === CourseType.OPEN_MAT;
  const address = openMat ? `${event.academy.address}, ${event.academy.city} ${event.academy.postcode}` : courseAddress(event);
  const capacity = event.capacity ?? "Check with academy";
  const price = coursePriceLabel(event);
  const permanentHref = eventPermanentPath(event.id);
  const permanentUrl = eventPermanentUrl(event.id);
  const qrCodeHref = eventQrCodePath(event.id);

  return (
    <DialogShell closeHref="/dashboard?panel=open-mats" description={event.academy.name} title={event.title}>
      <section className="pt-5">
        <div className="flex flex-wrap gap-2">
          <p className="text-sm font-bold uppercase tracking-wide text-teal-800">{openMat ? event.giType.replace("_", "-") : courseTypeLabel(event.courseType)}</p>
          {!openMat ? <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">{event.giType.replace("_", "-")}</span> : null}
          {event.recurrenceType !== "NONE" ? <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">{courseRecurrenceLabel(event)}</span> : null}
        </div>
        <dl className="mt-6 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-700 sm:grid-cols-2">
          <div><dt className="font-bold text-stone-950">Date</dt><dd>{formatDate(event.eventDate)}</dd></div>
          <div><dt className="font-bold text-stone-950">Time</dt><dd>{event.startTime}-{event.endTime}</dd></div>
          <div><dt className="font-bold text-stone-950">{openMat ? "Cost" : "Price"}</dt><dd>{price}</dd></div>
          <div><dt className="font-bold text-stone-950">Capacity</dt><dd>{capacity}</dd></div>
          {!openMat ? <div><dt className="font-bold text-stone-950">Recurrence</dt><dd>{courseRecurrenceLabel(event)}</dd></div> : null}
          {!openMat ? <div><dt className="font-bold text-stone-950">Location</dt><dd>{courseLocationLabel(event)}</dd></div> : null}
          {event.instructor ? <div><dt className="font-bold text-stone-950">Instructor</dt><dd>{event.instructor}</dd></div> : null}
          {event.contactEmail ? <div><dt className="font-bold text-stone-950">Contact Email</dt><dd><a className="text-teal-800" href={`mailto:${event.contactEmail}`}>{event.contactEmail}</a></dd></div> : null}
          {event.contactPhone ? <div><dt className="font-bold text-stone-950">Contact Phone</dt><dd><a className="text-teal-800" href={`tel:${event.contactPhone}`}>{event.contactPhone}</a></dd></div> : null}
          <div className="sm:col-span-2">
            <dt className="font-bold text-stone-950">{openMat ? "Location" : "Address"}</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <span>{address}</span>
              <InlineDirectionsButton address={address} />
            </dd>
          </div>
        </dl>
        {event.activities.length ? (
          <section className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
            <h3 className="text-lg font-black text-stone-950">Event Outline</h3>
            <ol className="mt-3 grid gap-3">
              {event.activities.map((activity) => (
                <li key={activity.id} className="grid gap-1 rounded-md bg-stone-50 p-3 text-sm text-stone-700 sm:grid-cols-[9rem_1fr]">
                  <p className="font-bold text-stone-950">{activity.startTime}-{activity.endTime}</p>
                  <div>
                    <p className="font-bold text-stone-950">{activity.name}</p>
                    <p className="text-xs font-semibold uppercase text-teal-800">{courseActivityTypeLabels[activity.activityType]}</p>
                    {activity.description ? <p className="mt-1 whitespace-pre-wrap">{activity.description}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        <PublicListingWarning academy={event.academy} course={event} className="mt-4" />
        <section className="mt-4 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-stone-950">Integration Event URI</h3>
            <p className="mt-2 break-all rounded-md bg-slate-50 p-3 text-sm font-semibold text-slate-700">{permanentUrl}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button href={permanentHref} target="_blank" rel="noreferrer" variant="secondary">Open URI</Button>
              <Button href={qrCodeHref} target="_blank" rel="noreferrer" variant="neutral">Open QR Code</Button>
            </div>
          </div>
          <a href={permanentHref} target="_blank" rel="noreferrer" className="inline-flex rounded-md border border-stone-200 bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCodeHref} alt={`QR code for ${event.title}`} className="size-32" />
          </a>
        </section>
        <p className="mt-6 whitespace-pre-wrap text-lg leading-8 text-stone-700"><LinkedText text={event.description} /></p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button href={directionsUrl(address)} target="_blank" rel="noreferrer" variant="neutral">Directions</Button>
          <Button href={`/academies/${event.academy.slug}`} variant="secondary">Academy Details</Button>
        </div>
      </section>
    </DialogShell>
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
          <ProfileInfo label="Created" value={formatDate(user.createdAt)} />
        </div>
      </div>
    </DialogShell>
  );
}

async function EditUserDialog({
  academies,
  academyAdmin,
  actor,
  superAdmin,
  user,
}: {
  academies: { id: string; name: string }[];
  academyAdmin: boolean;
  actor: Pick<ManagedUser, "id" | "role" | "email" | "academyId"> & { privileges?: string[] };
  superAdmin: boolean;
  user: UserRow;
}) {
  const assignableFeatures = await getUserPermissionPanelModel(actor, user.id, {
    organisationId: user.academyId ?? undefined,
    applicationId: process.env.ROLLFINDERS_APPLICATION_ID ?? "app_rollfinders",
  }).catch(() => []);

  return (
    <DialogShell closeHref="/dashboard?panel=users" description="Update user details, role, status and permissions." maxWidthClass="max-w-[96rem]" title="Edit User">
      <UserForm
        academies={academies}
        action={updateManagedUser.bind(null, user.id)}
        assignableFeatures={assignableFeatures}
        cancelHref="/dashboard?panel=users"
        mode="edit"
        returnTo="/dashboard?panel=users"
        academyAdmin={academyAdmin}
        superAdmin={superAdmin}
        user={{ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status, academyId: user.academyId }}
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
  const success = result === "password_reset_sent";
  const message = result === "duplicate_email"
    ? `A user with ${email ?? "that email address"} already exists.`
    : result === "password_reset_sent"
      ? `Password reset email sent${email ? ` to ${email}` : ""}.`
      : result === "password_reset_failed"
        ? `Password reset email could not be sent${email ? ` to ${email}` : ""}.`
    : null;
  if (!message) return null;
  return (
    <div className={`mt-4 rounded-md border px-4 py-3 text-sm font-semibold ${success ? "border-teal-100 bg-teal-50 text-teal-900" : "border-red-100 bg-red-50 text-red-800"}`}>
      {message}
    </div>
  );
}

function SystemRolesPanel({ roles }: { roles: AuthorisationRole[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <div className="border-b border-stone-100 px-5 py-4">
        <h3 className="text-lg font-black text-stone-950">System Roles</h3>
        <p className="mt-1 text-sm text-stone-600">These are the role bundles configured in the Authorisation service.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-stone-50 text-xs font-black uppercase text-stone-500">
            <tr>
              <th className="px-5 py-3">Role ID</th>
              <th className="px-5 py-3">Key</th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Level</th>
              <th className="px-5 py-3">Assignable</th>
              <th className="px-5 py-3">System</th>
              <th className="px-5 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="px-5 py-4 font-medium text-stone-700">{role.id}</td>
                <td className="px-5 py-4 font-black text-stone-950">{role.key}</td>
                <td className="px-5 py-4 font-medium text-stone-800">{role.name}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{role.level}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{role.assignable ? "Yes" : "No"}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{role.system_role ? "Yes" : "No"}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{formatDate(new Date(role.updated_at))}</td>
              </tr>
            ))}
            {!roles.length ? (
              <tr>
                <td className="px-5 py-8 text-center font-semibold text-stone-600" colSpan={7}>
                  No Authorisation roles were returned.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UnavailableUserSecurityPanel({ description, title }: { description: string; title: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-5 py-8">
      <h3 className="text-lg font-black text-stone-950">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm font-medium text-stone-600">{description}</p>
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

type DashboardCloneSourceEvent = Prisma.EventGetPayload<{
  include: { activities: true };
}>;

function CreateCourseDialog({ academies, cloneSource, instructorUsers }: { academies: Awaited<ReturnType<typeof prisma.academy.findMany>>; cloneSource?: DashboardCloneSourceEvent | null; instructorUsers: Awaited<ReturnType<typeof getInstructorUserOptions>> }) {
  const clonedEvent = cloneSource && academies.some((academy) => academy.id === cloneSource.academyId) ? cloneEventForCourseForm(cloneSource) : undefined;
  const cloning = Boolean(clonedEvent);
  return (
    <DialogShell closeHref="/dashboard?panel=open-mats" description={cloning ? "Create a new course from the selected course details." : "Create an Open Mat by default, or choose another course type."} title={cloning ? "Clone Course" : "New Course"}>
      <OpenMatForm academies={academies} action={createCourse} cancelHref="/dashboard?panel=open-mats" courseTypeMode="select" event={clonedEvent} instructorUsers={instructorUsers} returnTo="/dashboard?panel=open-mats" submitLabel={cloning ? "Create Clone" : "New Course"} />
    </DialogShell>
  );
}

function DashboardServiceMenu({ items }: { items: SidePanelItem[] }) {
  return (
    <nav className="hidden min-w-0 overflow-x-auto md:block" aria-label="Service dashboards">
      <div className="ml-auto flex min-w-max items-center justify-end gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={clsx(
              "inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2",
              item.active ? "font-bold text-stone-950" : "font-medium text-stone-700 hover:bg-white hover:text-stone-950",
            )}
          >
            <Icon name={item.icon} size={17} className="shrink-0" />
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
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

function PaymentsPanelSearch({ search }: { search: string }) {
  return (
    <form action="/dashboard" className="flex min-w-0 gap-2">
      <input type="hidden" name="panel" value="payments" />
      <input
        name="paymentsSearch"
        defaultValue={search}
        placeholder="Search payments by amount, event, email, or phone"
        className="min-h-12 min-w-0 flex-1 rounded-md border border-stone-300 px-4 text-sm"
      />
      <Button type="submit" size="icon" variant="primary" className="min-h-12 w-14" aria-label="Search payments">
        <Search size={20} aria-hidden />
      </Button>
    </form>
  );
}

function BookingsPanelSearch({ search }: { search: string }) {
  return (
    <form action="/dashboard" className="flex min-w-0 gap-2">
      <input type="hidden" name="panel" value="bookings" />
      <input
        name="bookingsSearch"
        defaultValue={search}
        placeholder="Search bookings by reference, event, customer, status, or payment"
        className="min-h-12 min-w-0 flex-1 rounded-md border border-stone-300 px-4 text-sm"
      />
      <Button type="submit" size="icon" variant="primary" className="min-h-12 w-14" aria-label="Search bookings">
        <Search size={20} aria-hidden />
      </Button>
    </form>
  );
}

function paymentDashboardRangeLabel(payments: PaymentRecord[]) {
  const points = paymentOverviewChartPoints(payments, "daily");
  const first = points[0]?.label ?? "";
  const last = points[points.length - 1]?.label ?? "";
  return first && last ? `${first} - ${last}` : "Last 7 days";
}

function PaymentsDashboardActions({ payments }: { payments: PaymentRecord[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[auto_auto]">
      <button type="button" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm">
        <CalendarDays size={17} aria-hidden />
        {paymentDashboardRangeLabel(payments)}
        <ChevronDown size={16} aria-hidden />
      </button>
      <button type="button" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm">
        <Download size={17} aria-hidden />
        Export
      </button>
    </div>
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
  const dailyVisits = analyticsReport?.dailyVisits ?? [];
  const loggedInUsers = analyticsReport?.loggedInUsers;
  const loggedInByRole = loggedInUsers?.byRole.length
    ? loggedInUsers.byRole.map((item) => `${roleLabel(item.role)}: ${item.currentCount.toLocaleString()}`).join(" / ")
    : "No recent logins";
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
      icon: <Users size={34} aria-hidden />,
      iconTone: "orange",
      id: "logged-in-users",
      indicator: { label: "today", value: loggedInUsers?.loggedInTodayCount ?? 0 },
      label: "Logged In Now",
      value: loggedInUsers?.currentCount ?? 0,
    },
    {
      icon: <ClipboardCheck size={34} aria-hidden />,
      iconTone: "neutral",
      id: "claim-funnel",
      indicator: { label: "submitted", value: summary?.claim.claimSubmissions ?? 0 },
      label: "Claim Funnel",
      value: summary?.claim.claimStarts ?? 0,
    },
  ];
  const rows: FounderAnalyticsRow[] = [
    { id: "visitors", area: "Visitor analytics", metric: "unique_visitors and unique_sessions", value: `${summary?.visitor.uniqueVisitors ?? 0} visitors` },
    { id: "logged-in-now", area: "Logged-in users", metric: `users.last_login_at within ${loggedInUsers?.activeWindowMinutes ?? 30} minutes`, value: `${loggedInUsers?.currentCount ?? 0} users` },
    { id: "logged-in-role", area: "Logged-in users by role", metric: "Recent users grouped by role", value: loggedInByRole },
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

      <StatsPanel className="mt-5 hidden md:block" items={analyticsStats} />

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

      <div className="mt-5">
        <h3 className="text-base font-black text-slate-950">Daily Visits</h3>
        <Table
          className="mt-3"
          columns={[
            { key: "date", title: "Date", render: (value) => <span className="font-bold text-slate-950">{String(value)}</span> },
            { key: "uniqueVisitors", title: "Unique Visitors", render: (value) => Number(value).toLocaleString() },
            { key: "uniqueSessions", title: "Unique Sessions", render: (value) => Number(value).toLocaleString() },
            { key: "eventCount", title: "Event Count", render: (value) => Number(value).toLocaleString() },
          ]}
          data={dailyVisits}
          emptyMessage="Daily visits will appear here once analytics events are available."
          getRowId={(row) => String(row.date)}
          minWidthClassName="min-w-[760px]"
        />
      </div>
    </section>
  );
}

type SettingsAuditLog = {
  id: string;
  action: string;
  createdAt: Date;
  actorUserId: string;
  targetUserId: string | null;
};

function SettingsDashboardContent({
  account,
  activeSettingsAction,
  academyAdmin,
  canViewWeeklyActivity,
  elevatedAdmin,
  emailPage,
  emailOperationsView,
  emailOperations,
  platformAdminActivitySummary,
  recentAuditLogs,
}: {
  account: {
    academy: { name: string } | null;
    disabled: boolean;
    email: string;
    name: string | null;
    role: Role;
    status: UserStatus;
  } | null;
  activeSettingsAction: "change-password" | "edit-profile" | "email-options" | "recent-audits" | "weekly-activity";
  academyAdmin: boolean;
  canViewWeeklyActivity: boolean;
  elevatedAdmin: boolean;
  emailPage: number;
  emailOperationsView: "attention" | "invalid-emails" | "queued" | "runs" | "scheduled-retries";
  emailOperations: Awaited<ReturnType<typeof getEmailQueueOperationsSummary>>;
  platformAdminActivitySummary: PlatformAdminActivitySummary | null;
  recentAuditLogs: SettingsAuditLog[];
}) {
  const emailOptionsHref = "/dashboard?panel=settings&settingsAction=email-options";
  const effectiveSettingsAction =
    activeSettingsAction === "change-password" || activeSettingsAction === "edit-profile" || (elevatedAdmin && (activeSettingsAction === "email-options" || activeSettingsAction === "recent-audits" || activeSettingsAction === "weekly-activity"))
      ? activeSettingsAction
      : "change-password";
  const settingsActionItems: QuickActionPanelItem[] = [
    {
      active: effectiveSettingsAction === "change-password",
      title: "Change Password",
      description: "Set a new password for your administrator account",
      href: "/dashboard?panel=settings&settingsAction=change-password",
      icon: <KeyRound size={24} aria-hidden />,
      id: "change-password",
    },
    {
      active: effectiveSettingsAction === "edit-profile",
      title: "Edit Profile",
      description: "Update your personal display name",
      href: "/dashboard?panel=settings&settingsAction=edit-profile",
      icon: <Edit3 size={24} aria-hidden />,
      id: "edit-profile",
    },
    ...(elevatedAdmin
      ? [
          {
            active: effectiveSettingsAction === "email-options",
            title: "Email Options",
            description: "Process queue runs and inspect delivery issues",
            href: "/dashboard?panel=settings&settingsAction=email-options",
            icon: <Mail size={24} aria-hidden />,
            id: "email-options",
          } satisfies QuickActionPanelItem,
          {
            active: effectiveSettingsAction === "recent-audits",
            title: "Recent Audits",
            description: "Review recent administrative audit activity",
            href: "/dashboard?panel=settings&settingsAction=recent-audits",
            icon: <ShieldCheck size={24} aria-hidden />,
            id: "recent-audits",
          } satisfies QuickActionPanelItem,
        ]
      : []),
    ...(canViewWeeklyActivity
      ? [
          {
            active: effectiveSettingsAction === "weekly-activity",
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
          <p className="mt-2 text-slate-600">{academyAdmin ? "Manage your account password and profile information." : "Manage email operations, audit activity, and your account password."}</p>
        </div>
        <Button href="/dashboard?panel=settings" variant="secondary">
          <RefreshCw size={16} aria-hidden /> Refresh
        </Button>
      </div>

      <QuickActionPanel className="mt-7 hidden md:block" items={settingsActionItems} />

      <SettingsDetailPanel title={selectedSettingsItem?.title ?? "Settings"}>
        {effectiveSettingsAction === "change-password" ? (
          <div className="max-w-xl">
            <p className="text-sm font-semibold leading-6 text-slate-600">Set a new password for your administrator account.</p>
            <div className="mt-5">
              <ChangePasswordForm cancelHref="/dashboard?panel=settings" embedded />
            </div>
          </div>
        ) : null}

        {effectiveSettingsAction === "edit-profile" && account ? (
          <EditProfileForm
            academyName={account.academy?.name ?? "No academy assigned"}
            cancelHref="/dashboard?panel=settings"
            email={account.email}
            name={account.name}
            roleLabel={roleLabel(account.role)}
            statusLabel={account.status === UserStatus.DISABLED || account.disabled ? "Disabled" : "Active"}
          />
        ) : null}

        {effectiveSettingsAction === "email-options" && elevatedAdmin ? (
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

        {effectiveSettingsAction === "recent-audits" && elevatedAdmin ? (
          <RecentAuditList logs={recentAuditLogs} />
        ) : null}

        {effectiveSettingsAction === "weekly-activity" && elevatedAdmin ? (
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
              <p className="truncate text-sm text-stone-600">{log.actorUserId}{log.targetUserId ? ` -> ${log.targetUserId}` : ""}</p>
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

function LinkedTableCell({ children, className }: { children: React.ReactNode; className?: string; href?: string }) {
  return (
    <td className={className}>
      <div className="px-5 py-4">{children}</div>
    </td>
  );
}

function formatMinorCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { currency: currency || "GBP", style: "currency" }).format((amount || 0) / 100);
}

function formatPaymentDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function paymentOverviewDateLabel(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function paymentOverviewDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function paymentOverviewPeriodLabel(date: Date, period: PaymentOverviewPeriod) {
  if (period === "weekly") {
    const endDate = new Date(date);
    endDate.setUTCDate(date.getUTCDate() + 6);
    return `${paymentOverviewDateLabel(date)} - ${paymentOverviewDateLabel(endDate)}`;
  }
  if (period === "monthly") return date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC", year: "numeric" });
  if (period === "yearly") return date.toLocaleDateString("en-GB", { timeZone: "UTC", year: "numeric" });
  return paymentOverviewDateLabel(date);
}

function paymentOverviewPeriodKey(date: Date, period: PaymentOverviewPeriod) {
  if (period === "monthly") return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  if (period === "yearly") return String(date.getUTCFullYear());
  return paymentOverviewDateKey(date);
}

function paymentOverviewBucketDate(date: Date, period: PaymentOverviewPeriod) {
  const bucketDate = startOfUtcDay(date);
  if (period === "weekly") {
    const day = bucketDate.getUTCDay();
    const daysSinceMonday = (day + 6) % 7;
    bucketDate.setUTCDate(bucketDate.getUTCDate() - daysSinceMonday);
  }
  if (period === "monthly") bucketDate.setUTCDate(1);
  if (period === "yearly") {
    bucketDate.setUTCMonth(0);
    bucketDate.setUTCDate(1);
  }
  return bucketDate;
}

function paymentOverviewStartDate(latestDate: Date, period: PaymentOverviewPeriod) {
  const startDate = paymentOverviewBucketDate(latestDate, period);
  if (period === "daily") startDate.setUTCDate(startDate.getUTCDate() - 6);
  if (period === "weekly") startDate.setUTCDate(startDate.getUTCDate() - 35);
  if (period === "monthly") startDate.setUTCMonth(startDate.getUTCMonth() - 5);
  if (period === "yearly") startDate.setUTCFullYear(startDate.getUTCFullYear() - 4);
  return startDate;
}

function addPaymentOverviewPeriod(date: Date, period: PaymentOverviewPeriod, increment: number) {
  const nextDate = new Date(date);
  if (period === "daily") nextDate.setUTCDate(nextDate.getUTCDate() + increment);
  if (period === "weekly") nextDate.setUTCDate(nextDate.getUTCDate() + (increment * 7));
  if (period === "monthly") nextDate.setUTCMonth(nextDate.getUTCMonth() + increment);
  if (period === "yearly") nextDate.setUTCFullYear(nextDate.getUTCFullYear() + increment);
  return nextDate;
}

function paymentOverviewChartPoints(payments: PaymentRecord[], period: PaymentOverviewPeriod) {
  const grossPaid = new Map<string, number>();
  const parsedDates = payments
    .map((payment) => new Date(payment.createdAt))
    .filter((date) => !Number.isNaN(date.getTime()));
  const latestDate = parsedDates.length
    ? new Date(Math.max(...parsedDates.map((date) => date.getTime())))
    : new Date();
  const startDate = paymentOverviewStartDate(latestDate, period);

  payments.forEach((payment) => {
    if (payment.status !== "succeeded") return;
    const createdAt = new Date(payment.createdAt);
    if (Number.isNaN(createdAt.getTime()) || createdAt < startDate) return;
    const key = paymentOverviewPeriodKey(paymentOverviewBucketDate(createdAt, period), period);
    grossPaid.set(key, (grossPaid.get(key) ?? 0) + payment.amount);
  });

  const bucketCount = period === "daily" ? 7 : period === "yearly" ? 5 : 6;
  return Array.from({ length: bucketCount }, (_, index) => {
    const date = addPaymentOverviewPeriod(startDate, period, index);
    const key = paymentOverviewPeriodKey(date, period);
    return {
      label: paymentOverviewPeriodLabel(date, period),
      value: grossPaid.get(key) ?? 0,
    };
  });
}

function paymentStatusTone(status: string) {
  if (status === "succeeded") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "failed" || status === "cancelled") return "bg-red-50 text-red-700 ring-red-100";
  if (status === "refunded" || status === "partially_refunded") return "bg-amber-50 text-amber-800 ring-amber-100";
  return "bg-slate-50 text-slate-700 ring-slate-100";
}

function paymentSearchText(payment: PaymentRecord) {
  const metadata = payment.metadata ?? {};
  return [
    payment.id,
    payment.checkoutSessionId,
    payment.resourceId,
    payment.resourceLabel,
    payment.payerEmail,
    payment.payerUserId,
    metadata.course_id,
    metadata.course_title,
    metadata.academy_id,
    metadata.academy_name,
    metadata.occurrence_date,
    metadata.occurrence_start_time,
    metadata.occurrence_end_time,
    metadata.payer_email,
    metadata.payer_phone,
    metadata.phone,
    metadata.phone_number,
    metadata.contact_phone,
    formatMinorCurrency(payment.amount, payment.currency),
    String(payment.amount),
    ((payment.amount || 0) / 100).toFixed(2),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function paymentMatchesSearch(payment: PaymentRecord, search: string) {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return true;
  return normalizedSearch.split(/\s+/).every((term) => paymentSearchText(payment).includes(term));
}

function metadataText(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function bookingStatusTone(status: string) {
  if (status === "confirmed" || status === "completed") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "cancelled" || status === "expired") return "bg-red-50 text-red-700 ring-red-100";
  if (status === "payment_received") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (status === "payment_pending") return "bg-amber-50 text-amber-800 ring-amber-100";
  return "bg-slate-50 text-slate-700 ring-slate-100";
}

function bookingStatusLabel(status: string) {
  if (status === "payment_received") return "Payment received";
  if (status === "payment_pending") return "Payment pending";
  return status.replace("_", " ");
}

function bookingSearchText(booking: BookingRecord) {
  const metadata = booking.metadata;
  return [
    booking.id,
    booking.reference,
    booking.bookableType,
    booking.bookableId,
    booking.bookableInstanceId,
    booking.customerId,
    booking.guestReference,
    booking.organisationId,
    booking.paymentId,
    booking.status,
    String(booking.participantCount),
    metadataText(metadata, "course_id"),
    metadataText(metadata, "course_title"),
    metadataText(metadata, "event_title"),
    metadataText(metadata, "academy_id"),
    metadataText(metadata, "academy_name"),
    metadataText(metadata, "occurrence_date"),
    metadataText(metadata, "occurrence_start_time"),
    metadataText(metadata, "payer_email"),
    metadataText(metadata, "payer_phone"),
    metadataText(metadata, "phone"),
    metadataText(metadata, "phone_number"),
    metadataText(metadata, "contact_phone"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function bookingMatchesSearch(booking: BookingRecord, search: string) {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return true;
  return normalizedSearch.split(/\s+/).every((term) => bookingSearchText(booking).includes(term));
}

function bookingEventHref(booking: BookingRecord) {
  const courseId = metadataText(booking.metadata, "course_id") ?? booking.bookableId;
  if (!courseId) return undefined;
  const params = new URLSearchParams();
  const occurrenceDate = metadataText(booking.metadata, "occurrence_date");
  if (occurrenceDate) params.set("date", occurrenceDate);
  const query = params.toString();
  return `/courses/${courseId}${query ? `?${query}` : ""}`;
}

function bookingTitle(booking: BookingRecord) {
  return metadataText(booking.metadata, "course_title") ?? metadataText(booking.metadata, "event_title") ?? booking.bookableId;
}

function bookingAcademyLabel(booking: BookingRecord) {
  return metadataText(booking.metadata, "academy_name") ?? metadataText(booking.metadata, "academy_id") ?? booking.organisationId;
}

function bookingCustomerLabel(booking: BookingRecord) {
  return metadataText(booking.metadata, "payer_email") ?? booking.customerId ?? booking.guestReference ?? "Guest";
}

function BookingActionsMenu({ booking }: { booking: BookingRecord }) {
  const canConfirm = booking.status === "payment_received";
  const canCancel = booking.status === "payment_pending" || booking.status === "payment_received";
  return (
    <ActionMenu
      label={`Open actions for ${booking.reference || booking.id}`}
      buttonClassName="inline-flex size-9 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-50"
      menuClassName="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-2 text-left shadow-xl"
    >
      {canConfirm ? (
        <form action={confirmDashboardBooking}>
          <input type="hidden" name="bookingId" value={booking.id} />
          <BookingActionSubmitButton
            className="block w-full rounded-md px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-800"
            pendingLabel="Confirming..."
          >
            Confirm Booking
          </BookingActionSubmitButton>
        </form>
      ) : null}
      {canCancel ? (
        <form action={cancelDashboardBooking}>
          <input type="hidden" name="bookingId" value={booking.id} />
          <BookingActionSubmitButton
            className="block w-full rounded-md px-3 py-2 text-left text-sm font-bold text-red-700 hover:bg-red-50"
            pendingLabel="Cancelling..."
          >
            Cancel Booking
          </BookingActionSubmitButton>
        </form>
      ) : null}
      {!canConfirm && !canCancel ? (
        <span className="block rounded-md px-3 py-2 text-sm font-semibold text-slate-400" role="menuitem">
          No actions available
        </span>
      ) : null}
    </ActionMenu>
  );
}

function bookingActionNotice(error: string | null | undefined, booking: BookingRecord | undefined) {
  if (!error) return null;
  if (!booking && error !== "booking-missing") return null;
  if (error === "refund-requested") {
    return {
      message: "Booking cancelled and refund request queued for the received payment.",
      tone: "success" as const,
    };
  }
  if (error === "payment-cancel-failed" && booking?.status !== "payment_pending") return null;
  let message = "Booking action failed. Please try again.";
  if (error === "payment-cancel-failed") message = "Payment cancellation failed. The booking was not cancelled.";
  if (error === "payment-already-complete") message = "Stripe says this payment is already complete. The booking was not cancelled; refresh the booking payment status before requesting a refund.";
  if (error === "refund-missing-payment") message = "This paid booking has no payment reference, so a refund request could not be queued.";
  if (error === "refund-request-failed") message = "Refund request failed. The booking was not cancelled.";
  if (error === "cancel-invalid-status") message = "Only pending-payment or payment-received bookings can be cancelled from this action.";
  if (error === "booking-load-failed") message = "Booking details could not be loaded. Please try again.";
  if (error === "forbidden") message = "You do not have permission to update that booking.";
  if (error === "confirm-failed") message = "Booking confirmation failed. Please try again.";
  if (error === "cancel-failed") message = "Booking cancellation failed. Please try again.";
  return {
    message,
    tone: "error" as const,
  };
}

function BookingsPanel({ academyAdmin, actionBookingId, actionError, result, search }: { academyAdmin: boolean; actionBookingId?: string | null; actionError?: string | null; result: DashboardBookingsResult; search: string }) {
  const visibleBookings = result.bookings.filter((booking) => bookingMatchesSearch(booking, search));
  const confirmedBookings = visibleBookings.filter((booking) => booking.status === "confirmed" || booking.status === "completed");
  const pendingPaymentBookings = visibleBookings.filter((booking) => booking.status === "payment_pending");
  const paymentReceivedBookings = visibleBookings.filter((booking) => booking.status === "payment_received");
  const participantTotal = visibleBookings.reduce((sum, booking) => sum + booking.participantCount, 0);
  const recentBookings = visibleBookings.slice(0, 10);
  const summaryCards: PaymentSummaryCard[] = [
    { changeLabel: "All matching records", icon: <ClipboardCheck size={27} aria-hidden />, id: "total-bookings", label: "Total Bookings", value: visibleBookings.length.toLocaleString() },
    { changeLabel: "Confirmed or completed", icon: <CheckCircle2 size={28} aria-hidden />, id: "confirmed-bookings", label: "Confirmed", value: confirmedBookings.length.toLocaleString() },
    { changeLabel: "Awaiting academy confirmation", icon: <ShieldCheck size={28} aria-hidden />, id: "payment-received-bookings", label: "Payment Received", value: paymentReceivedBookings.length.toLocaleString() },
    { changeLabel: "Waiting for payment", icon: <CreditCard size={28} aria-hidden />, id: "pending-payment-bookings", label: "Pending Payment", value: pendingPaymentBookings.length.toLocaleString() },
    { changeLabel: "Booked participant count", icon: <Users size={27} aria-hidden />, id: "participants", label: "Participants", value: participantTotal.toLocaleString() },
  ];
  const actionBooking = actionBookingId ? result.bookings.find((booking) => booking.id === actionBookingId) : undefined;
  const actionNotice = bookingActionNotice(actionError, actionBooking);

  return (
    <div className="grid gap-5">
      {actionNotice ? (
        <section className={clsx("rounded-lg border p-4 text-sm font-bold", actionNotice.tone === "success" ? "border-teal-200 bg-teal-50 text-teal-800" : "border-red-200 bg-red-50 text-red-800")}>
          {actionNotice.message}
        </section>
      ) : null}
      <PaymentMetricCards cards={summaryCards} />
      {search ? (
        <p className="text-sm font-semibold text-slate-600">
          Showing {visibleBookings.length} of {result.bookings.length} bookings matching &quot;{search}&quot;.
        </p>
      ) : null}
      {result.error ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
          {result.error}
        </section>
      ) : null}
      <PaymentDashboardTable
        columns={[
          {
            key: "booking",
            title: "Booking / Event",
            render: (booking) => {
              const href = bookingEventHref(booking);
              const title = bookingTitle(booking);
              const subtitle = metadataText(booking.metadata, "occurrence_date") ?? booking.bookableInstanceId;
              return (
                <div className="grid gap-1">
                  {href ? (
                    <Link href={href} className="font-bold text-slate-950 hover:text-teal-800">
                      {title}
                    </Link>
                  ) : (
                    <span className="font-bold text-slate-950">{title}</span>
                  )}
                  <span className="text-xs font-semibold text-slate-500">{booking.reference || subtitle}</span>
                </div>
              );
            },
          },
          ...(!academyAdmin ? [{ key: "academy", title: "Academy", render: (booking: BookingRecord) => bookingAcademyLabel(booking) }] : []),
          { key: "customer", title: "Customer", render: (booking) => bookingCustomerLabel(booking) },
          { key: "participants", title: "Participants", render: (booking) => <span className="font-bold text-slate-950">{booking.participantCount.toLocaleString()}</span> },
          { key: "payment", title: "Payment", render: (booking) => booking.paymentId ? <span className="font-mono text-xs">{booking.paymentId}</span> : <span className="text-slate-400">None</span> },
          { key: "status", title: "Status", render: (booking) => <span className={`inline-flex rounded-md px-2 py-1 text-xs font-black ring-1 ${bookingStatusTone(booking.status)}`}>{bookingStatusLabel(booking.status)}</span> },
          { key: "created", title: "Created", render: (booking) => formatPaymentDate(booking.createdAt) },
          {
            key: "action",
            title: "Actions",
            render: (booking) => <BookingActionsMenu booking={booking} />,
          },
        ]}
        data={recentBookings}
        emptyIcon={<ClipboardCheck size={28} aria-hidden />}
        emptyMessage={result.bookings.length ? "No bookings match that search." : "No bookings have been recorded yet."}
        getRowId={(booking) => booking.id}
        getRowHref={(booking) => bookingEventHref(booking)}
        title="Recent Bookings"
        viewAllLabel={`${visibleBookings.length.toLocaleString()} shown`}
      />
    </div>
  );
}

type PaymentSummaryCard = {
  changeLabel: string;
  changeClassName?: string;
  iconClassName?: string;
  icon: ReactNode;
  id: string;
  label: string;
  value: string;
};

function PaymentMetricCards({ cards }: { cards: PaymentSummaryCard[] }) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      {cards.map((card) => (
        <section key={card.id} className="w-full rounded-lg border border-stone-200 bg-white p-5 shadow-sm sm:w-fit sm:min-w-[17rem] sm:max-w-[24rem]">
          <div className="grid grid-cols-[auto_1fr] gap-4">
            <div className={clsx("flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-800 ring-1 ring-teal-100", card.iconClassName)}>
              {card.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-black text-slate-600">{card.label}</p>
                <Info size={15} className="shrink-0 text-slate-400" aria-hidden />
              </div>
              <p className="mt-1 text-2xl font-black text-slate-950">{card.value}</p>
              <p className={clsx("mt-1 text-sm font-semibold text-slate-500", card.changeClassName)}>{card.changeLabel}</p>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

type DashboardTableColumn<T> = {
  key: string;
  render?: (row: T) => ReactNode;
  title: string;
};

function PaymentDashboardTable<T>({
  columns,
  data,
  emptyIcon,
  emptyMessage,
  getRowId,
  getRowHref,
  title,
  viewAllLabel = "View all",
}: {
  columns: DashboardTableColumn<T>[];
  data: T[];
  emptyIcon: ReactNode;
  emptyMessage: string;
  getRowId: (row: T, index: number) => string;
  getRowHref?: (row: T, index: number) => string | undefined;
  title: string;
  viewAllLabel?: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-lg font-black text-slate-950">{title}</h3>
          <Info size={17} className="shrink-0 text-slate-400" aria-hidden />
        </div>
        <span className="text-sm font-black text-teal-800">{viewAllLabel}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3">{column.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const rowHref = getRowHref?.(row, index);
              return (
                <tr key={getRowId(row, index)} className={clsx("border-b border-stone-100 last:border-b-0", rowHref ? "cursor-pointer hover:bg-teal-50/40" : "")}>
                  {columns.map((column) => (
                    <td key={column.key} className="relative px-4 py-4 text-slate-700">
                      {rowHref ? (
                        <Link href={rowHref} className="absolute inset-0 z-10" aria-label="View booking details">
                          <span className="sr-only">View booking details</span>
                        </Link>
                      ) : null}
                      <div className={rowHref && column.key !== "action" ? "pointer-events-none relative z-20" : "relative z-20"}>{column.render?.(row) ?? ""}</div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!data.length ? (
        <div className="flex min-h-36 flex-col items-center justify-center px-4 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100">
            {emptyIcon}
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-500">{emptyMessage}</p>
        </div>
      ) : null}
    </section>
  );
}

const paymentOverviewPeriodOptions = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

function paymentDescription(payment: PaymentRecord) {
  return payment.metadata?.course_title ?? payment.resourceLabel ?? payment.resourceId ?? "Course/Event payment";
}

function paymentDescriptionType(payment: PaymentRecord) {
  const resourceType = payment.resourceType?.replaceAll("_", " ");
  if (resourceType) return resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
  return "Booking";
}

function paymentOrderId(payment: PaymentRecord) {
  return payment.checkoutSessionId ?? payment.providerPaymentId ?? payment.id;
}

function PaymentsTransactionsView({ payments, result, search, currency }: { payments: PaymentRecord[]; result: DashboardPaymentsResult; search: string; currency: string }) {
  const successfulPayments = payments.filter((payment) => payment.status === "succeeded");
  const failedPayments = payments.filter((payment) => payment.status === "failed" || payment.status === "cancelled");
  const totalAmount = successfulPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const summaryCards: PaymentSummaryCard[] = [
    { changeClassName: "text-emerald-700", changeLabel: "↑ 14.3% vs Jun 07 - Jun 13", icon: <Wallet size={27} aria-hidden />, id: "total-transactions", label: "Total Transactions", value: payments.length.toLocaleString() },
    { changeClassName: "text-emerald-700", changeLabel: "↑ 13.6% vs Jun 07 - Jun 13", icon: <CheckCircle2 size={28} aria-hidden />, id: "successful-transactions", label: "Successful", value: successfulPayments.length.toLocaleString() },
    { changeClassName: "text-red-600", changeLabel: "↓ 0.4% vs Jun 07 - Jun 13", icon: <Ban size={27} aria-hidden />, iconClassName: "bg-red-50 text-red-700 ring-red-100", id: "failed-transactions", label: "Failed", value: failedPayments.length.toLocaleString() },
    { changeClassName: "text-emerald-700", changeLabel: "↑ 12.5% vs Jun 07 - Jun 13", icon: <CreditCard size={28} aria-hidden />, id: "total-amount", label: "Total Amount", value: formatMinorCurrency(totalAmount, currency) },
  ];

  return (
    <div className="grid gap-5">
      <div className="text-sm font-semibold text-slate-600">
        <Link href="/dashboard?panel=payments&paymentsView=overview" className="text-slate-600 hover:text-teal-800">Payments</Link>
        <span className="mx-2 text-slate-400">›</span>
        <span className="text-slate-800">Transactions</span>
      </div>
      <PaymentMetricCards cards={summaryCards} />
      <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <form action="/dashboard" className="grid gap-4 border-b border-stone-100 p-4 lg:grid-cols-[minmax(240px,1.3fr)_minmax(170px,0.65fr)_minmax(180px,0.7fr)_minmax(180px,0.7fr)_auto]">
          <input type="hidden" name="panel" value="payments" />
          <input type="hidden" name="paymentsView" value="transactions" />
          <label className="grid gap-1 text-sm font-semibold text-slate-600">
            <span className="sr-only">Search transactions</span>
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} aria-hidden />
              <input
                className="min-h-12 w-full rounded-md border border-stone-200 pl-10 pr-3 text-sm font-normal text-slate-800"
                defaultValue={search}
                name="paymentsSearch"
                placeholder="Search by payer, course, order ID or reference..."
              />
            </span>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-600">
            Status
            <select className="min-h-12 rounded-md border border-stone-200 px-3 font-normal text-slate-800" defaultValue="">
              <option value="">All Status</option>
              <option value="succeeded">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-600">
            Course / Event
            <select className="min-h-12 rounded-md border border-stone-200 px-3 font-normal text-slate-800" defaultValue="">
              <option value="">All</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-600">
            Payment Method
            <select className="min-h-12 rounded-md border border-stone-200 px-3 font-normal text-slate-800" defaultValue="">
              <option value="">All</option>
              <option value="card">Card</option>
              <option value="google_pay">Google Pay</option>
            </select>
          </label>
          <Button type="submit" variant="secondary" className="min-h-12 self-end">
            <Filter size={17} aria-hidden />
            Filters
          </Button>
        </form>
        <PaymentDashboardTable
          columns={[
            { key: "date", title: "Date ↓", render: (payment) => <span className="font-semibold text-slate-700">{formatPaymentDate(payment.createdAt)}</span> },
            {
              key: "description",
              title: "Description",
              render: (payment) => (
                <div className="grid gap-1">
                  <span className="font-bold text-slate-950">{paymentDescription(payment)}</span>
                  <span className="text-sm font-semibold text-slate-500">{paymentDescriptionType(payment)}</span>
                </div>
              ),
            },
            {
              key: "payer",
              title: "Payer",
              render: (payment) => (
                <div className="grid gap-1">
                  <span className="font-semibold text-slate-950">{payment.payerEmail ? payment.payerEmail.split("@")[0] : "Guest"}</span>
                  <span className="text-sm font-semibold text-slate-500">{payment.payerEmail ?? payment.payerUserId ?? "Guest checkout"}</span>
                </div>
              ),
            },
            { key: "amount", title: "Amount", render: (payment) => <span className="font-bold text-slate-950">{formatMinorCurrency(payment.amount, payment.currency)}</span> },
            { key: "method", title: "Method", render: (payment) => <Badge>{payment.paymentMethodType.replaceAll("_", " ")}</Badge> },
            { key: "status", title: "Status", render: (payment) => <span className={`inline-flex rounded-md px-2 py-1 text-xs font-black ring-1 ${paymentStatusTone(payment.status)}`}>{payment.status === "succeeded" ? "Paid" : payment.status.replace("_", " ")}</span> },
            { key: "order", title: "Order ID", render: (payment) => <span className="font-mono text-xs font-semibold text-slate-700">#{paymentOrderId(payment)}</span> },
            { key: "actions", title: "Actions", render: () => <span className="text-xl font-black text-slate-500">⋮</span> },
          ]}
          data={payments}
          emptyIcon={<CreditCard size={28} aria-hidden />}
          emptyMessage={result.payments.length ? "No transactions match that search." : "No transactions have been recorded yet."}
          getRowId={(payment) => payment.id}
          title="Transactions"
          viewAllLabel={`Showing ${payments.length.toLocaleString()} of ${result.payments.length.toLocaleString()} transactions`}
        />
      </section>
    </div>
  );
}

function platformFeeAmount(amount: number, settings: PaymentPlatformSettings) {
  return calculatePlatformFeeMinor(amount, settings);
}

function netPaymentAmount(payment: PaymentRecord, settings: PaymentPlatformSettings) {
  return Math.max(0, payment.amount - platformFeeAmount(payment.amount, settings) - payment.refundedAmount);
}

type EarningsCourseRow = {
  grossRevenue: number;
  id: string;
  label: string;
  netEarnings: number;
  platformFees: number;
};

function earningsCourseRows(payments: PaymentRecord[], settings: PaymentPlatformSettings): EarningsCourseRow[] {
  const rows = new Map<string, EarningsCourseRow>();
  payments.forEach((payment) => {
    if (payment.status !== "succeeded") return;
    const label = paymentDescription(payment);
    const id = payment.metadata?.course_id ?? payment.resourceId ?? label;
    const row = rows.get(id) ?? { grossRevenue: 0, id, label, netEarnings: 0, platformFees: 0 };
    const platformFees = platformFeeAmount(payment.amount, settings);
    row.grossRevenue += payment.amount;
    row.platformFees += platformFees;
    row.netEarnings += Math.max(0, payment.amount - platformFees - payment.refundedAmount);
    rows.set(id, row);
  });
  return Array.from(rows.values()).sort((left, right) => right.netEarnings - left.netEarnings).slice(0, 5);
}

function EarningsSummaryPanel({ currency, feeLabel, grossRevenue, netEarnings, platformFees, refunds }: { currency: string; feeLabel: string; grossRevenue: number; netEarnings: number; platformFees: number; refunds: number }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-black text-slate-950">Earnings Summary</h3>
        <Info size={17} className="text-slate-400" aria-hidden />
      </div>
      <dl className="mt-6 grid gap-4 text-sm font-semibold text-slate-600">
        <div className="flex justify-between gap-4">
          <dt>Gross Revenue</dt>
          <dd className="font-black text-slate-950">{formatMinorCurrency(grossRevenue, currency)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Platform Fees ({feeLabel})</dt>
          <dd className="font-black text-red-600">-{formatMinorCurrency(platformFees, currency)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Refunds</dt>
          <dd className="font-black text-red-600">-{formatMinorCurrency(refunds, currency)}</dd>
        </div>
        <div className="my-1 border-t border-stone-200" />
        <div className="flex justify-between gap-4">
          <dt>Net Revenue</dt>
          <dd className="font-black text-slate-950">{formatMinorCurrency(netEarnings, currency)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Payouts Sent</dt>
          <dd className="font-black text-red-600">-{formatMinorCurrency(0, currency)}</dd>
        </div>
      </dl>
      <div className="mt-6 flex min-h-14 items-center justify-between rounded-lg bg-teal-50 px-4 text-base font-black text-teal-800 ring-1 ring-teal-100">
        <span>Net Earnings</span>
        <span>{formatMinorCurrency(netEarnings, currency)}</span>
      </div>
    </section>
  );
}

function EarningsBreakdownPanel({ currency, rows, total }: { currency: string; rows: EarningsCourseRow[]; total: number }) {
  const colors = ["bg-teal-700", "bg-emerald-400", "bg-violet-500", "bg-orange-400", "bg-sky-500"];

  return (
    <section className="rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-4">
        <h3 className="text-lg font-black text-slate-950">Earnings Breakdown</h3>
        <Info size={17} className="text-slate-400" aria-hidden />
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-[220px_1fr] lg:items-center">
        <div className="relative mx-auto grid h-44 w-44 place-items-center rounded-full bg-[conic-gradient(#0f766e_0_35%,#34d399_35%_58%,#8b5cf6_58%_74%,#fb923c_74%_88%,#38bdf8_88%_100%)]">
          <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center shadow-sm">
            <div>
              <p className="text-xl font-black text-slate-950">{formatMinorCurrency(total, currency)}</p>
              <p className="text-sm font-semibold text-slate-500">Net Earnings</p>
            </div>
          </div>
        </div>
        <dl className="grid gap-4">
          {rows.map((row, index) => {
            const percentage = total > 0 ? (row.netEarnings / total) * 100 : 0;
            return (
              <div key={row.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 text-sm">
                <span className={clsx("h-3 w-3 rounded-full", colors[index % colors.length])} aria-hidden />
                <dt className="font-semibold text-slate-700">{row.label}</dt>
                <dd className="font-semibold text-slate-500">{percentage.toFixed(1)}%</dd>
                <dd className="font-black text-slate-950">{formatMinorCurrency(row.netEarnings, currency)}</dd>
              </div>
            );
          })}
        </dl>
      </div>
      <Link href="/dashboard?panel=payments&paymentsView=earnings" className="flex min-h-14 items-center justify-between border-t border-stone-100 px-5 text-sm font-black text-teal-800">
        View full report
        <ChevronRight size={18} aria-hidden />
      </Link>
    </section>
  );
}

function PaymentsEarningsView({ currency, payments, paymentPlatformSettings, period }: { currency: string; payments: PaymentRecord[]; paymentPlatformSettings: PaymentPlatformSettings; period: PaymentOverviewPeriod }) {
  const succeededPayments = payments.filter((payment) => payment.status === "succeeded");
  const grossRevenue = succeededPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const platformFees = succeededPayments.reduce((sum, payment) => sum + platformFeeAmount(payment.amount, paymentPlatformSettings), 0);
  const refunds = payments.reduce((sum, payment) => sum + payment.refundedAmount, 0);
  const netEarnings = succeededPayments.reduce((sum, payment) => sum + netPaymentAmount(payment, paymentPlatformSettings), 0);
  const pendingEarnings = payments.filter((payment) => payment.status !== "succeeded" && payment.status !== "failed" && payment.status !== "cancelled").reduce((sum, payment) => sum + payment.amount, 0);
  const courseRows = earningsCourseRows(payments, paymentPlatformSettings);
  const maxNetEarnings = Math.max(...courseRows.map((row) => row.netEarnings), 1);
  const summaryCards: PaymentSummaryCard[] = [
    { changeClassName: "text-emerald-700", changeLabel: "↑ 11.7% vs Jun 07 - Jun 13", icon: <CreditCard size={28} aria-hidden />, id: "net-earnings", label: "Net Earnings", value: formatMinorCurrency(netEarnings, currency) },
    { changeClassName: "text-orange-600", changeLabel: `${payments.filter((payment) => payment.status !== "succeeded" && payment.status !== "failed" && payment.status !== "cancelled").length.toLocaleString()} payments`, icon: <CalendarDays size={28} aria-hidden />, id: "pending-earnings", label: "Pending Earnings", value: formatMinorCurrency(pendingEarnings, currency) },
    { changeLabel: "On Jun 10, 2026", icon: <Wallet size={27} aria-hidden />, id: "payouts-sent", label: "Payouts Sent", value: formatMinorCurrency(0, currency) },
    { changeClassName: "text-emerald-700", changeLabel: "Excellent", icon: <BarChart3 size={28} aria-hidden />, id: "average-payout-time", label: "Avg. Payout Time", value: "2.3 days" },
  ];
  const earningsMetrics: PaymentOverviewMetric[] = [
    { colorClassName: "bg-teal-700", id: "gross-revenue", label: "Gross Revenue", value: formatMinorCurrency(grossRevenue, currency) },
    { colorClassName: "bg-teal-700", id: "platform-fees", label: "Platform Fees", value: formatMinorCurrency(platformFees, currency) },
    { colorClassName: "bg-teal-700", id: "pending-earnings", label: "Pending Earnings", value: formatMinorCurrency(pendingEarnings, currency) },
    { colorClassName: "bg-emerald-400", id: "net-earnings", label: "Net Earnings", value: formatMinorCurrency(netEarnings, currency) },
  ];

  return (
    <div className="grid gap-5">
      <div className="text-sm font-semibold text-slate-600">
        <Link href="/dashboard?panel=payments&paymentsView=overview" className="text-slate-600 hover:text-teal-800">Payments</Link>
        <span className="mx-2 text-slate-400">›</span>
        <span className="text-slate-800">Earnings</span>
      </div>
      <PaymentMetricCards cards={summaryCards} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]">
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-950">Earnings Over Time</h3>
              <Info size={17} className="text-slate-400" aria-hidden />
            </div>
            <span className="inline-flex min-h-11 items-center rounded-md border border-stone-200 px-4 text-sm font-black text-slate-700 shadow-sm">Daily</span>
          </div>
          <LineOverviewChart
            className="mt-4"
            formatValue={(value) => new Intl.NumberFormat("en-GB", { currency, maximumFractionDigits: 0, style: "currency" }).format(value / 100)}
            id="earnings-over-time-chart"
            maxTicks={5}
            maxValue={30000}
            points={paymentOverviewChartPoints(succeededPayments, period)}
            title="Earnings Over Time"
          />
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {earningsMetrics.map((metric) => (
              <div key={metric.id} className="grid grid-cols-[auto_1fr] gap-x-3">
                <dt className="col-start-2 text-sm font-bold text-slate-500">{metric.label}</dt>
                <dd className="col-start-2 row-start-1 text-xl font-black text-slate-950">{metric.value}</dd>
                <span className={clsx("row-span-2 mt-2 h-2.5 w-2.5 rounded-full", metric.colorClassName)} aria-hidden />
              </div>
            ))}
          </dl>
        </section>
        <EarningsSummaryPanel currency={currency} feeLabel={platformFeeLabel(paymentPlatformSettings)} grossRevenue={grossRevenue} netEarnings={netEarnings} platformFees={platformFees} refunds={refunds} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <PaymentDashboardTable
          columns={[
            { key: "course", title: "Course / Event", render: (row) => <span className="font-bold text-slate-950">{row.label}</span> },
            { key: "gross", title: "Gross Revenue", render: (row) => formatMinorCurrency(row.grossRevenue, currency) },
            { key: "fees", title: "Platform Fees", render: (row) => <span className="text-slate-700">-{formatMinorCurrency(row.platformFees, currency)}</span> },
            {
              key: "net",
              title: "Net Earnings",
              render: (row) => (
                <div className="grid gap-2">
                  <span className="font-black text-teal-800">{formatMinorCurrency(row.netEarnings, currency)}</span>
                  <span className="h-1.5 rounded-full bg-teal-700" style={{ width: `${Math.max(12, (row.netEarnings / maxNetEarnings) * 100)}%` }} />
                </div>
              ),
            },
          ]}
          data={courseRows}
          emptyIcon={<Wallet size={28} aria-hidden />}
          emptyMessage="No earnings are available for this period."
          getRowId={(row) => row.id}
          title="Earnings by Course / Event"
        />
        <EarningsBreakdownPanel currency={currency} rows={courseRows} total={netEarnings} />
      </div>
      <section className="grid gap-4 rounded-lg border border-teal-100 bg-teal-50/60 p-5 shadow-sm sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-teal-700 text-white" aria-hidden>
          <CalendarDays size={27} />
        </span>
        <div>
          <h3 className="text-base font-black text-slate-950">Payouts are sent securely to your bank account</h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">Next payout is estimated for Jun 24, 2026</p>
        </div>
        <Button href="/dashboard?panel=payments&paymentsView=payouts" variant="secondary">View Payouts</Button>
      </section>
    </div>
  );
}

function PaymentsRefundsView({ currency, payments, result, search }: { currency: string; payments: PaymentRecord[]; result: DashboardPaymentsResult; search: string }) {
  const refundedPayments = payments.filter((payment) => payment.refundedAmount > 0 || payment.status === "refunded" || payment.status === "partially_refunded");
  const processedRefunds = refundedPayments.filter((payment) => payment.status === "refunded" || payment.status === "partially_refunded");
  const pendingRefunds = refundedPayments.filter((payment) => payment.status !== "refunded" && payment.status !== "partially_refunded");
  const totalRefunded = refundedPayments.reduce((sum, payment) => sum + payment.refundedAmount, 0);
  const paidAmount = payments.filter((payment) => payment.status === "succeeded").reduce((sum, payment) => sum + payment.amount, 0);
  const refundRate = paidAmount > 0 ? (totalRefunded / paidAmount) * 100 : 0;
  const summaryCards: PaymentSummaryCard[] = [
    { changeClassName: "text-red-600", changeLabel: "↓ 12.5% vs Jun 07 - Jun 13", icon: <Download size={27} aria-hidden />, iconClassName: "bg-red-50 text-red-700 ring-red-100", id: "total-refunds", label: "Total Refunds", value: formatMinorCurrency(totalRefunded, currency) },
    { changeClassName: "text-red-600", changeLabel: "↓ 20% vs Jun 07 - Jun 13", icon: <CalendarDays size={28} aria-hidden />, id: "refunds-processed", label: "Refunds Processed", value: processedRefunds.length.toLocaleString() },
    { changeClassName: "text-orange-600", changeLabel: formatMinorCurrency(pendingRefunds.reduce((sum, payment) => sum + payment.refundedAmount, 0), currency), icon: <Wallet size={27} aria-hidden />, iconClassName: "bg-orange-50 text-orange-700 ring-orange-100", id: "pending-refunds", label: "Pending Refunds", value: pendingRefunds.length.toLocaleString() },
    { changeClassName: "text-red-600", changeLabel: "↓ 0.3% vs Jun 07 - Jun 13", icon: <RefreshCw size={27} aria-hidden />, id: "refund-rate", label: "Refund Rate", value: `${refundRate.toFixed(1)}%` },
  ];

  return (
    <div className="grid gap-5">
      <div className="text-sm font-semibold text-slate-600">
        <Link href="/dashboard?panel=payments&paymentsView=overview" className="text-slate-600 hover:text-teal-800">Payments</Link>
        <span className="mx-2 text-slate-400">›</span>
        <span className="text-slate-800">Refunds</span>
      </div>
      <PaymentMetricCards cards={summaryCards} />
      <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <form action="/dashboard" className="grid gap-4 border-b border-stone-100 p-4 lg:grid-cols-[minmax(240px,1.4fr)_minmax(170px,0.65fr)_minmax(180px,0.75fr)_minmax(180px,0.75fr)_auto]">
          <input type="hidden" name="panel" value="payments" />
          <input type="hidden" name="paymentsView" value="refunds" />
          <label className="grid gap-1 text-sm font-semibold text-slate-600">
            <span className="sr-only">Search refunds</span>
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} aria-hidden />
              <input
                className="min-h-12 w-full rounded-md border border-stone-200 pl-10 pr-3 text-sm font-normal text-slate-800"
                defaultValue={search}
                name="paymentsSearch"
                placeholder="Search by order ID, payer, course or refund ID..."
              />
            </span>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-600">
            Status
            <select className="min-h-12 rounded-md border border-stone-200 px-3 font-normal text-slate-800" defaultValue="">
              <option value="">All Status</option>
              <option value="refunded">Completed</option>
              <option value="partially_refunded">Partially refunded</option>
              <option value="processing">Processing</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-600">
            Course / Event
            <select className="min-h-12 rounded-md border border-stone-200 px-3 font-normal text-slate-800" defaultValue="">
              <option value="">All</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-600">
            Refund Method
            <select className="min-h-12 rounded-md border border-stone-200 px-3 font-normal text-slate-800" defaultValue="">
              <option value="">All</option>
              <option value="original_payment">Original payment</option>
            </select>
          </label>
          <Button type="submit" variant="secondary" className="min-h-12 self-end">
            <Filter size={17} aria-hidden />
            Filters
          </Button>
        </form>
        <PaymentDashboardTable
          columns={[
            { key: "date", title: "Date", render: (payment) => <span className="font-semibold text-slate-700">{formatPaymentDate(payment.updatedAt)}</span> },
            { key: "refund", title: "Refund ID", render: (payment) => <span className="font-mono text-xs font-semibold text-slate-700">#REF-{payment.id}</span> },
            { key: "order", title: "Order / Payment", render: (payment) => <span className="font-mono text-xs font-semibold text-slate-700">#{paymentOrderId(payment)}</span> },
            { key: "course", title: "Course / Event", render: (payment) => <span className="font-bold text-slate-950">{paymentDescription(payment)}</span> },
            {
              key: "payer",
              title: "Payer",
              render: (payment) => (
                <div className="grid gap-1">
                  <span className="font-semibold text-slate-950">{payment.payerEmail ? payment.payerEmail.split("@")[0] : "Guest"}</span>
                  <span className="text-sm font-semibold text-slate-500">{payment.payerEmail ?? payment.payerUserId ?? "Guest checkout"}</span>
                </div>
              ),
            },
            { key: "amount", title: "Amount", render: (payment) => <span className="font-black text-red-600">-{formatMinorCurrency(payment.refundedAmount, payment.currency)}</span> },
            { key: "status", title: "Status", render: (payment) => <span className={`inline-flex rounded-md px-2 py-1 text-xs font-black ring-1 ${paymentStatusTone(payment.status)}`}>{payment.status === "refunded" || payment.status === "partially_refunded" ? "Completed" : "Processing"}</span> },
            { key: "method", title: "Refund Method", render: (payment) => <span className="font-semibold text-slate-600">Original Payment ({payment.paymentMethodType.replaceAll("_", " ")})</span> },
            { key: "actions", title: "Actions", render: () => <span className="text-xl font-black text-slate-500">⋮</span> },
          ]}
          data={refundedPayments}
          emptyIcon={<RefreshCw size={28} aria-hidden />}
          emptyMessage={result.payments.length ? "No refunds match that search." : "No refunds have been recorded yet."}
          getRowId={(payment) => payment.id}
          title="Refunds"
          viewAllLabel={`Showing ${refundedPayments.length.toLocaleString()} of ${refundedPayments.length.toLocaleString()} refunds`}
        />
      </section>
    </div>
  );
}

type PayoutDashboardRow = {
  amount: number;
  arrivalDate: string;
  date: string;
  id: string;
  status: string;
};

function payoutRows(payments: PaymentRecord[], settings: PaymentPlatformSettings): PayoutDashboardRow[] {
  return payments
    .filter((payment) => payment.status === "succeeded")
    .slice(0, 5)
    .map((payment, index) => {
      const paidAt = new Date(payment.createdAt);
      const arrivalDate = Number.isNaN(paidAt.getTime()) ? payment.createdAt : new Date(paidAt.getTime() + 24 * 60 * 60 * 1000).toISOString();
      return {
        amount: netPaymentAmount(payment, settings),
        arrivalDate,
        date: payment.createdAt,
        id: `PAYOUT-${payment.id || String(index + 1).padStart(4, "0")}`,
        status: "Sent",
      };
    });
}

function PaymentsPayoutsView({ currency, payments, paymentPlatformSettings, period }: { currency: string; payments: PaymentRecord[]; paymentPlatformSettings: PaymentPlatformSettings; period: PaymentOverviewPeriod }) {
  const successfulPayments = payments.filter((payment) => payment.status === "succeeded");
  const rows = payoutRows(payments, paymentPlatformSettings);
  const totalPayouts = successfulPayments.reduce((sum, payment) => sum + netPaymentAmount(payment, paymentPlatformSettings), 0);
  const pendingPayouts = payments.filter((payment) => payment.status !== "succeeded" && payment.status !== "failed" && payment.status !== "cancelled").reduce((sum, payment) => sum + Math.max(0, payment.amount - platformFeeAmount(payment.amount, paymentPlatformSettings)), 0);
  const summaryCards: PaymentSummaryCard[] = [
    { changeClassName: "text-emerald-700", changeLabel: "↑ 15.4% vs Jun 07 - Jun 13", icon: <CreditCard size={28} aria-hidden />, id: "total-payouts", label: "Total Payouts", value: formatMinorCurrency(totalPayouts, currency) },
    { changeClassName: "text-emerald-700", changeLabel: `${rows.length.toLocaleString()} payouts`, icon: <Wallet size={27} aria-hidden />, id: "payouts-sent", label: "Payouts Sent", value: formatMinorCurrency(totalPayouts, currency) },
    { changeClassName: "text-orange-600", changeLabel: `${pendingPayouts > 0 ? 1 : 0} payout`, icon: <Download size={27} aria-hidden />, iconClassName: "bg-orange-50 text-orange-700 ring-orange-100", id: "pending-payouts", label: "Pending Payouts", value: formatMinorCurrency(pendingPayouts, currency) },
    { changeClassName: "text-emerald-700", changeLabel: "Estimated", icon: <CalendarDays size={28} aria-hidden />, id: "next-payout", label: "Next Payout", value: "Jun 24, 2026" },
    { changeClassName: "text-emerald-700", changeLabel: "Excellent", icon: <BarChart3 size={28} aria-hidden />, id: "average-payout-time", label: "Avg. Payout Time", value: "2.3 days" },
  ];
  const payoutMetrics: PaymentOverviewMetric[] = [
    { colorClassName: "bg-teal-700", id: "total-payouts", label: "Total Payouts", value: formatMinorCurrency(totalPayouts, currency) },
    { colorClassName: "bg-emerald-400", id: "payouts-sent", label: "Payouts Sent", value: rows.length.toLocaleString() },
    { colorClassName: "bg-orange-400", id: "pending-payouts", label: "Pending Payouts", value: formatMinorCurrency(pendingPayouts, currency) },
  ];

  return (
    <div className="grid gap-5">
      <div className="text-sm font-semibold text-slate-600">
        <Link href="/dashboard?panel=payments&paymentsView=overview" className="text-slate-600 hover:text-teal-800">Payments</Link>
        <span className="mx-2 text-slate-400">›</span>
        <span className="text-slate-800">Payouts</span>
      </div>
      <PaymentMetricCards cards={summaryCards} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.45fr)]">
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-950">Payouts Over Time</h3>
              <Info size={17} className="text-slate-400" aria-hidden />
            </div>
            <span className="inline-flex min-h-11 items-center rounded-md border border-stone-200 px-4 text-sm font-black text-slate-700 shadow-sm">Daily</span>
          </div>
          <LineOverviewChart
            className="mt-4"
            formatValue={(value) => new Intl.NumberFormat("en-GB", { currency, maximumFractionDigits: 0, style: "currency" }).format(value / 100)}
            id="payouts-over-time-chart"
            maxTicks={5}
            maxValue={75000}
            points={paymentOverviewChartPoints(successfulPayments, period)}
            title="Payouts Over Time"
          />
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            {payoutMetrics.map((metric) => (
              <div key={metric.id} className="grid grid-cols-[auto_1fr] gap-x-3">
                <dt className="col-start-2 text-sm font-bold text-slate-500">{metric.label}</dt>
                <dd className="col-start-2 row-start-1 text-xl font-black text-slate-950">{metric.value}</dd>
                <span className={clsx("row-span-2 mt-2 h-2.5 w-2.5 rounded-full", metric.colorClassName)} aria-hidden />
              </div>
            ))}
          </dl>
        </section>
        <PaymentDashboardTable
          columns={[
            { key: "id", title: "Payout ID", render: (row) => <span className="font-mono text-xs font-semibold text-slate-700">#{row.id}</span> },
            { key: "date", title: "Payout Date", render: (row) => formatPaymentDate(row.date) },
            { key: "amount", title: "Amount", render: (row) => <span className="font-black text-slate-950">{formatMinorCurrency(row.amount, currency)}</span> },
            { key: "status", title: "Status", render: (row) => <span className="inline-flex rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-800 ring-1 ring-teal-100">{row.status}</span> },
            { key: "arrival", title: "Est. Arrival", render: (row) => formatPaymentDate(row.arrivalDate) },
            { key: "actions", title: "Actions", render: () => <Download size={17} className="text-slate-600" aria-hidden /> },
          ]}
          data={rows}
          emptyIcon={<Wallet size={28} aria-hidden />}
          emptyMessage="No payouts have been recorded yet."
          getRowId={(row) => row.id}
          title="Recent Payouts"
          viewAllLabel="View all"
        />
      </div>
    </div>
  );
}

function PaymentsSettingsView({
  academyAdmin,
  paymentAccountSetting,
  paymentPlatformSettings,
  paymentSettingsError,
  paymentSettingsMessage,
  stripeConnectError,
  stripeConnectMessage,
}: {
  academyAdmin: boolean;
  paymentAccountSetting: PaymentAccountSettingView | null;
  paymentPlatformSettings: PaymentPlatformSettings;
  paymentSettingsError?: string;
  paymentSettingsMessage?: string;
  stripeConnectError?: string;
  stripeConnectMessage?: string;
}) {
  const connected = Boolean(paymentAccountSetting?.providerAccountId);
  const verified = connected && paymentAccountSetting?.status === "verified";
  const ownerQuery = academyAdmin ? "academy" : "platform";
  const accountName = academyAdmin ? "Academy Stripe Connect" : "RollFinders Stripe Connect";
  const manageLabel = connected ? "Manage Stripe Account" : "Set Up Stripe Connect";
  const accountDescription = academyAdmin ? "Connected payout account" : "Connected platform account";
  const platformFeePercent = platformFeePercentage(paymentPlatformSettings);
  const fixedPlatformFee = paymentPlatformSettings.platformFeeFixedMinor / 100;
  const settingsNotice = paymentSettingsError
    ? { tone: "error", text: paymentSettingsError }
    : stripeConnectError
      ? { tone: "error", text: stripeConnectError }
      : paymentSettingsMessage === "platform-fees-updated"
        ? { tone: "success", text: "Platform fees have been updated." }
        : stripeConnectMessage === "connected"
          ? { tone: "success", text: "Stripe account setup was completed and the account status has been refreshed." }
          : stripeConnectMessage === "refreshed"
            ? { tone: "success", text: "Stripe account status has been refreshed." }
            : stripeConnectMessage === "disconnected"
              ? { tone: "success", text: "Stripe account has been disconnected from RollFinders." }
              : null;

  return (
    <div className="grid gap-5">
      <div className="text-sm font-semibold text-slate-600">
        <Link href="/dashboard?panel=payments&paymentsView=overview" className="text-slate-600 hover:text-teal-800">Payments</Link>
        <span className="mx-2 text-slate-400">›</span>
        <span className="text-slate-800">Payment Settings</span>
      </div>
      {settingsNotice ? (
        <div className={clsx("rounded-lg border px-4 py-3 text-sm font-black", settingsNotice.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-teal-200 bg-teal-50 text-teal-800")}>
          {settingsNotice.text}
        </div>
      ) : null}
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto] xl:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-teal-600 text-3xl font-black text-white" aria-hidden>
              S
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-black text-slate-950">{accountName}</h3>
                <span className={clsx("rounded-md px-2 py-1 text-xs font-black ring-1", verified ? "bg-teal-50 text-teal-800 ring-teal-100" : "bg-amber-50 text-amber-800 ring-amber-100")}>
                  {verified ? "Verified" : connected ? "Verification Required" : "Setup required"}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-500">{accountDescription}</p>
            </div>
          </div>
          {[
            { label: "Payouts", status: paymentAccountSetting?.payoutsEnabled ? "Enabled" : "Pending", helper: paymentAccountSetting?.payoutsEnabled ? "Payouts are active" : "Connect Stripe to enable payouts" },
            { label: "Charges", status: paymentAccountSetting?.chargesEnabled ? "Enabled" : "Pending", helper: paymentAccountSetting?.chargesEnabled ? "You can accept payments" : "Payment acceptance is paused" },
            { label: "Account", status: verified ? "Verified" : "Incomplete", helper: verified ? "All good to go" : "Finish Stripe onboarding" },
          ].map((item) => (
            <div key={item.label} className="border-stone-200 xl:border-l xl:pl-6">
              <p className="text-sm font-black text-slate-950">{item.label}</p>
              <p className={clsx("mt-2 text-sm font-black", item.status === "Enabled" || item.status === "Verified" ? "text-teal-800" : "text-amber-700")}>• {item.status}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">{item.helper}</p>
            </div>
          ))}
          <Button href={`/api/payments/stripe-connect?owner=${ownerQuery}`} variant="secondary">
            {manageLabel}
          </Button>
        </div>
      </section>

      {!academyAdmin ? (
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] lg:items-start">
            <div>
              <h3 className="text-xl font-black text-slate-950">Platform Fees</h3>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                These fees are applied to academy Stripe Connect payments before the academy payout amount is calculated.
              </p>
              <dl className="mt-5 grid gap-3 text-sm font-semibold text-slate-600">
                <div className="flex justify-between gap-4">
                  <dt>Current fee</dt>
                  <dd className="font-black text-slate-950">{platformFeeLabel(paymentPlatformSettings)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Currency</dt>
                  <dd className="font-black text-slate-950">{paymentPlatformSettings.currency}</dd>
                </div>
              </dl>
            </div>
            <form action={updatePlatformPaymentFees} className="grid gap-4 rounded-lg border border-stone-200 p-4">
              <label className="grid gap-2 text-sm font-black text-slate-800">
                Platform fee percentage
                <input
                  className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-semibold text-slate-950"
                  defaultValue={Number.isInteger(platformFeePercent) ? platformFeePercent.toFixed(0) : platformFeePercent.toFixed(2)}
                  inputMode="decimal"
                  min="0"
                  max="100"
                  name="platformFeePercent"
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-800">
                Fixed platform fee
                <div className="grid grid-cols-[auto_1fr] overflow-hidden rounded-md border border-stone-300">
                  <span className="grid min-h-11 place-items-center border-r border-stone-300 bg-stone-50 px-3 text-base font-black text-slate-700">£</span>
                  <input
                    className="min-h-11 px-3 text-base font-semibold text-slate-950 outline-none"
                    defaultValue={fixedPlatformFee.toFixed(2)}
                    inputMode="decimal"
                    min="0"
                    name="platformFeeFixed"
                    step="0.01"
                    type="number"
                  />
                </div>
              </label>
              <Button type="submit">Save Platform Fees</Button>
            </form>
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-red-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-100" aria-hidden>
            <Trash2 size={24} />
          </span>
          <div>
            <h3 className="text-lg font-black text-slate-950">Danger Zone</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">Permanently disconnect your payment account. This action cannot be undone.</p>
          </div>
          <form action={`/api/payments/stripe-connect/disconnect?owner=${ownerQuery}`} method="post">
            <Button type="submit" variant="danger">
              Disconnect Payment Account
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}

function PaymentsPanel({
  academyAdmin,
  metricVisibility,
  paymentAccountSetting,
  paymentPlatformSettings = {
    currency: "GBP",
    platformFeeBasisPoints: 500,
    platformFeeFixedMinor: 0,
  },
  paymentSettingsError,
  paymentSettingsMessage,
  period,
  result,
  search,
  stripeConnectError,
  stripeConnectMessage,
  view,
}: {
  academyAdmin: boolean;
  metricVisibility: PaymentMetricVisibility;
  paymentAccountSetting: PaymentAccountSettingView | null;
  paymentPlatformSettings?: PaymentPlatformSettings;
  paymentSettingsError?: string;
  paymentSettingsMessage?: string;
  period: PaymentOverviewPeriod;
  result: DashboardPaymentsResult;
  search: string;
  stripeConnectError?: string;
  stripeConnectMessage?: string;
  view: string;
}) {
  const visiblePayments = result.payments.filter((payment) => paymentMatchesSearch(payment, search));
  const succeededPayments = visiblePayments.filter((payment) => payment.status === "succeeded");
  const grossAmount = succeededPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const platformRevenue = succeededPayments.reduce((sum, payment) => sum + platformFeeAmount(payment.amount, paymentPlatformSettings), 0);
  const refundedAmount = visiblePayments.reduce((sum, payment) => sum + payment.refundedAmount, 0);
  const currency = visiblePayments[0]?.currency ?? result.payments[0]?.currency ?? "GBP";
  const hasConnectedPaymentAccount = Boolean(paymentAccountSetting?.providerAccountId);
  const paymentAccountVerified = hasConnectedPaymentAccount && paymentAccountSetting?.status === "verified";
  const paymentOverviewMetrics: PaymentOverviewMetric[] = [
    { colorClassName: "bg-teal-700", id: "gross-paid", label: "Gross Paid", value: formatMinorCurrency(grossAmount, currency) },
    { colorClassName: "bg-teal-700", id: "successful-payments", label: "Successful Payments", value: succeededPayments.length.toLocaleString() },
    { colorClassName: "bg-orange-500", id: "platform-revenue", label: "Platform Revenue", value: formatMinorCurrency(platformRevenue, currency) },
    { colorClassName: "bg-emerald-400", id: "refunds", label: "Refunds", value: formatMinorCurrency(refundedAmount, currency) },
  ].filter((metric) => {
    if (metric.id === "gross-paid") return metricVisibility.grossPaid;
    if (metric.id === "successful-payments") return metricVisibility.successfulPayments;
    if (metric.id === "platform-revenue") return metricVisibility.platformRevenue;
    if (metric.id === "refunds") return metricVisibility.refunds;
    return false;
  });
  const summaryCards: PaymentSummaryCard[] = [
    { changeLabel: "- 0% vs Jun 07 - Jun 13", icon: <Wallet size={27} aria-hidden />, id: "gross-paid", label: "Gross Paid", value: formatMinorCurrency(grossAmount, currency) },
    { changeLabel: "- 0% vs Jun 07 - Jun 13", icon: <CheckCircle2 size={28} aria-hidden />, id: "successful-payments", label: "Successful Payments", value: succeededPayments.length.toLocaleString() },
    { changeLabel: "- 0% vs Jun 07 - Jun 13", icon: <CreditCard size={28} aria-hidden />, id: "platform-revenue", label: "Platform Revenue", value: formatMinorCurrency(platformRevenue, currency) },
    { changeLabel: "- 0% vs Jun 07 - Jun 13", icon: <RefreshCw size={27} aria-hidden />, id: "refunds", label: "Refunds", value: formatMinorCurrency(refundedAmount, currency) },
  ].filter((card) => {
    if (card.id === "gross-paid") return metricVisibility.grossPaid;
    if (card.id === "successful-payments") return metricVisibility.successfulPayments;
    if (card.id === "platform-revenue") return metricVisibility.platformRevenue;
    if (card.id === "refunds") return metricVisibility.refunds;
    return false;
  });
  const paymentAccountSetupItems = [
    { complete: !result.error, id: "payment-gateway", label: "Payment gateway", statusLabel: result.error ? "Unavailable" : "Connected" },
    { complete: hasConnectedPaymentAccount, id: "rollfinders-account", label: academyAdmin ? "Academy payout account" : "RollFinders platform account", statusLabel: hasConnectedPaymentAccount ? paymentAccountVerified ? "Verified" : "Action needed" : "Setup needed" },
    { complete: !result.error, id: "webhooks", label: "Payment webhooks", statusLabel: result.error ? "Pending" : "Active" },
    { complete: Boolean(paymentAccountSetting?.payoutsEnabled), id: "payouts", label: "Payouts", statusLabel: paymentAccountSetting?.payoutsEnabled ? "Enabled" : "Pending" },
  ];

  if (view === "transactions") {
    return <PaymentsTransactionsView currency={currency} payments={visiblePayments} result={result} search={search} />;
  }

  if (view === "earnings") {
    return <PaymentsEarningsView currency={currency} payments={visiblePayments} paymentPlatformSettings={paymentPlatformSettings} period={period} />;
  }

  if (view === "refunds") {
    return <PaymentsRefundsView currency={currency} payments={visiblePayments} result={result} search={search} />;
  }

  if (view === "payouts") {
    return <PaymentsPayoutsView currency={currency} payments={visiblePayments} paymentPlatformSettings={paymentPlatformSettings} period={period} />;
  }

  if (view === "settings") {
    return (
      <PaymentsSettingsView
        academyAdmin={academyAdmin}
        paymentAccountSetting={paymentAccountSetting}
        paymentPlatformSettings={paymentPlatformSettings}
        paymentSettingsError={paymentSettingsError}
        paymentSettingsMessage={paymentSettingsMessage}
        stripeConnectError={stripeConnectError}
        stripeConnectMessage={stripeConnectMessage}
      />
    );
  }

  return (
    <div className="grid gap-5">
      <PaymentMetricCards cards={summaryCards} />
      {search ? (
        <p className="text-sm font-semibold text-slate-600">
          Showing {visiblePayments.length} of {result.payments.length} payments matching &quot;{search}&quot;.
        </p>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,1fr)]">
        <PaymentOverview
          chartPoints={paymentOverviewChartPoints(visiblePayments, period)}
          currency={currency}
          metrics={paymentOverviewMetrics}
          periodOptions={paymentOverviewPeriodOptions}
          periodValue={period}
        />
        <PaymentAccountSetup
          accountLabel={hasConnectedPaymentAccount ? paymentAccountVerified ? "Payment account is ready" : "Stripe verification is required" : "Stripe Connect setup is required"}
          actionHref="/dashboard?panel=payments&paymentsView=settings"
          actionLabel="Manage"
          detailsHref="/dashboard?panel=payments&paymentsView=settings"
          detailsLabel="View details"
          items={paymentAccountSetupItems}
          providerName={academyAdmin ? "Academy Stripe account" : "RollFinders Stripe account"}
          status={paymentAccountVerified ? "active" : "pending"}
          title="Payment Account Setup"
          variant="compact"
        />
      </div>
    </div>
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

type AcademyProfilePanelAcademy = Prisma.AcademyGetPayload<{
  include: { events: true; claims: true; members: true; socialLinks: true };
}>;

type PlatformAdminAcademyRow = {
  id: string;
  name: string;
  slug: string;
  borough: string | null;
  city: string;
  postcode: string;
  verificationStatus: AcademyVerificationStatus;
  createdAt: Date;
  createdById: string | null;
};

type PlatformAdminAcademyTableRow = Record<string, unknown> & {
  id: string;
  academy: string;
  creator: string;
  creatorEmail: string;
  location: string;
  reviewLabel: string;
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
  courseType: CourseType;
  eventDate: Date;
  startTime: string;
  endTime: string;
  giType: string;
  pricingType: EventPricingType;
  price: { toString(): string };
  donationLabel: string | null;
  audience: EventAudience;
  capacity: number | null;
  active: boolean;
  academy: { name: string };
};

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  phone?: string | null;
  role: Role;
  status: UserStatus;
  disabled: boolean;
  academyId: string | null;
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
    render: (_value, row) => (
      <Button href={row.reviewHref} aria-label={row.reviewLabel} size="sm" variant="secondary" className="px-3 text-sm hover:border-teal-700 hover:text-teal-800">
        Review
      </Button>
    ),
  },
];

function AcademyProfilePanel({ academy }: { academy: AcademyProfilePanelAcademy | null }) {
  if (!academy) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
        No academy is assigned to this account yet.
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-950">{academy.name}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">{academy.city}, {academy.postcode}</p>
            <p className="mt-3 max-w-4xl leading-7 text-slate-700">{academy.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{academy.verificationStatus}</Badge>
            <Badge>{academy.featured ? "Featured" : "Not Featured"}</Badge>
            <Button href={`/academies/${academy.slug}`} size="sm" variant="secondary" className="px-3 py-2 text-sm">View Public Profile</Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <ProfileInfo label="Email" value={academy.email ?? "Not listed"} />
          <ProfileInfo label="Phone" value={academy.phone ?? "Not listed"} />
          <ProfileInfo label="Website" value={academy.website ?? "Not listed"} />
          <ProfileInfo label="Courses/Events" value={academy.events.length.toString()} />
          <ProfileInfo label="Academy Users" value={academy.members.length.toString()} />
          <ProfileInfo label="Claims" value={academy.claims.length.toString()} />
          <ProfileInfo label="Categories" value={academy.categories ?? "Not categorised"} />
          <ProfileInfo label="Borough" value={academy.borough ?? "Not listed"} />
        </div>
      </section>

      <AcademyForm
        academy={academy}
        action={updateAcademy.bind(null, academy.id)}
        canManagePlatformFields={false}
        cancelHref="/dashboard?panel=academies"
        returnTo="/dashboard?panel=academies"
      />
    </div>
  );
}

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
    creator: academy.createdById ?? "Unknown Platform Admin",
    creatorEmail: academy.createdById ?? "Unknown",
    id: academy.id,
    location: [academy.borough ?? academy.city, academy.postcode].filter(Boolean).join(", "),
    reviewLabel: `Review ${academy.name}`,
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

      <StatsPanel className="mt-5 hidden md:block" items={stats} />

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
              const academyHref = adminAcademiesHref(params, { dialog: "view-academy", academyId: academy.id });
              const editAcademyHref = adminAcademiesHref(params, { dialog: "edit-academy", academyId: academy.id });
              return (
                <TableRow key={academy.id} href={academyHref}>
                  <td className="px-4 py-4">
                    <input className="size-4 accent-teal-700" type="checkbox" name="academyIds" value={academy.id} aria-label={`Select ${academy.name} for claim reminder`} />
                  </td>
                  <LinkedTableCell href={academyHref} className="font-bold text-slate-950">{academy.name}</LinkedTableCell>
                  <LinkedTableCell href={academyHref} className="text-slate-700">{academy.borough ?? academy.city}</LinkedTableCell>
                  <LinkedTableCell href={academyHref} className="text-slate-700">{academy.postcode}</LinkedTableCell>
                  <LinkedTableCell href={academyHref}><Badge>{academyClaimState(academy)}</Badge></LinkedTableCell>
                  <LinkedTableCell href={academyHref} className="text-slate-700">{academy.email ? <span className="break-all">{academy.email}</span> : <Badge>No email</Badge>}</LinkedTableCell>
                  <LinkedTableCell href={academyHref} className="w-40 whitespace-nowrap">
                    <div className="grid gap-2">
                      <Badge>{reminder.label}</Badge>
                      {!reminder.eligible ? (
                        <p className="text-xs font-semibold text-slate-500">{claimReminderReasonLabel(reminder.reason ?? "unavailable")}</p>
                      ) : null}
                    </div>
                  </LinkedTableCell>
                  <LinkedTableCell href={academyHref}><Badge>{academy.featured ? "Featured" : "No"}</Badge></LinkedTableCell>
                  <td className="px-5 py-4 text-center">
                    <ActionMenu label={`Open actions for ${academy.name}`}>
                      <Link href={academyHref} className={menuItemClass}>
                        <Eye size={18} aria-hidden />
                        View Academy
                      </Link>
                      <Link href={editAcademyHref} className={menuItemClass}>
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
                </TableRow>
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

function UsersTable({ actorAcademyId, actorId, actorRole, params, users }: { actorAcademyId?: string | null; actorId: string; actorRole: Role; params: AdminSearchParams; users: UserRow[] }) {
  const canViewRoleColumn = isPlatformAdminRole(actorRole);
  const emptyColSpan = canViewRoleColumn ? 6 : 5;
  const returnTo = dashboardUsersHref(params);

  return (
    <div className="mt-4 overflow-x-auto">
      <table className={`w-full border-collapse text-left text-sm ${canViewRoleColumn ? "min-w-[1120px]" : "min-w-[980px]"}`}>
        <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
          <tr>
            <th className="px-5 py-4">User</th>
            {canViewRoleColumn ? <th className="px-5 py-4">Role</th> : null}
            <th className="px-5 py-4">Academy</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Created</th>
            <th className="px-5 py-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const protectedUser = isProtectedSuperAdmin(user);
            const academyCanManage = isAcademyAdminRole(actorRole) && actorId !== user.id && actorAcademyId === user.academyId && (user.role === Role.STANDARD_USER || user.role === Role.USER || user.role === Role.ACADEMY_ADMIN || user.role === Role.ACADEMY_OWNER);
            const canManage = academyCanManage || isSuperAdminRole(actorRole) || (isPlatformAdminRole(actorRole) && !protectedUser && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.PLATFORM_ADMIN);
            const canSendPasswordReset = canSendManagedUserPasswordReset({ id: actorId, role: actorRole, academyId: actorAcademyId }, user);
            const superUserTarget = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN;
            const canDelete = canManage && actorId !== user.id && !superUserTarget;
            const disabled = user.status === UserStatus.DISABLED || user.disabled;
            const userHref = `/dashboard?panel=users&dialog=view-user&userId=${user.id}`;
            return (
              <TableRow key={user.id} href={userHref}>
                <LinkedTableCell href={userHref}>
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
                </LinkedTableCell>
                {canViewRoleColumn ? <LinkedTableCell href={userHref}><RolePill role={user.role} /></LinkedTableCell> : null}
                <LinkedTableCell href={userHref} className="text-slate-700">{user.academy?.name ?? "None"}</LinkedTableCell>
                <LinkedTableCell href={userHref}><StatusPill disabled={disabled} /></LinkedTableCell>
                <LinkedTableCell href={userHref} className="text-slate-600">{formatDate(user.createdAt)}</LinkedTableCell>
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
                        {canSendPasswordReset ? (
                          <form action={`/api/admin/users/${user.id}/password-reset`} method="post">
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <button type="submit" className={menuItemClass}>
                              <KeyRound size={18} aria-hidden />
                              Send Password Reset
                            </button>
                          </form>
                        ) : null}
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
              </TableRow>
            );
          })}
          {!users.length ? (
            <tr>
              <td colSpan={emptyColSpan} className="px-4 py-8 text-center text-stone-600">No users to show.</td>
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
          {events.map((event) => {
            const openMat = event.courseType === CourseType.OPEN_MAT;
            const detailHref = `/dashboard?panel=open-mats&dialog=view-event&eventId=${event.id}`;
            const adminReturnTo = "/dashboard?panel=open-mats";
            const adminHref = `${openMat ? `/admin/open-mats/${event.id}` : `/admin/courses/${event.id}`}?returnTo=${encodeURIComponent(adminReturnTo)}`;
            const cloneHref = `/dashboard?panel=open-mats&dialog=create-course&cloneFrom=${event.id}`;
            const permanentHref = eventPermanentPath(event.id);
            const qrCodeHref = eventQrCodePath(event.id);

            return (
              <TableRow key={event.id} href={detailHref}>
                <LinkedTableCell href={detailHref} className="font-bold text-slate-950">{event.title}</LinkedTableCell>
                <LinkedTableCell href={detailHref} className="text-slate-700">{event.academy.name}</LinkedTableCell>
                <LinkedTableCell href={detailHref} className="text-slate-700">{formatDate(event.eventDate)}</LinkedTableCell>
                <LinkedTableCell href={detailHref} className="text-slate-700">{event.startTime}-{event.endTime}</LinkedTableCell>
                <LinkedTableCell href={detailHref}><Badge>{event.giType.replace("_", "-")}</Badge></LinkedTableCell>
                <LinkedTableCell href={detailHref} className="text-slate-700">{coursePriceLabel(event)}</LinkedTableCell>
                <LinkedTableCell href={detailHref} className="text-slate-700">{event.capacity ?? "None"}</LinkedTableCell>
                <LinkedTableCell href={detailHref}><Badge>{event.active ? "Active" : "Inactive"}</Badge></LinkedTableCell>
                <td className="px-5 py-4 text-center">
                  <ActionMenu label={`Open actions for ${event.title}`}>
                    <Link href={detailHref} className={menuItemClass}>
                      <Eye size={18} aria-hidden />
                      View Course
                    </Link>
                    <Link href={adminHref} className={menuItemClass}>
                      <Edit3 size={18} aria-hidden />
                      Edit Course
                    </Link>
                    <Link href={cloneHref} className={menuItemClass}>
                      <Copy size={18} aria-hidden />
                      Clone Course
                    </Link>
                    <Link href={permanentHref} className={menuItemClass} target="_blank" rel="noreferrer">
                      <Globe2 size={18} aria-hidden />
                      Integration URI
                    </Link>
                    <Link href={qrCodeHref} className={menuItemClass} target="_blank" rel="noreferrer">
                      <QrCode size={18} aria-hidden />
                      QR Code
                    </Link>
                  </ActionMenu>
                </td>
              </TableRow>
            );
          })}
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
            {claims.map((claim) => {
              const claimHref = `/admin/academy-claims/${claim.id}?returnTo=${encodeURIComponent(adminClaimsHref(params, {}))}`;

              return (
              <TableRow key={claim.id} href={claimHref}>
                <LinkedTableCell href={claimHref}>
                  <p className="font-bold text-slate-950">{claim.academy.name}</p>
                  {claim.academy.city || claim.academy.postcode ? <p className="mt-1 text-slate-500">{[claim.academy.city, claim.academy.postcode].filter(Boolean).join(", ")}</p> : null}
                </LinkedTableCell>
                <LinkedTableCell href={claimHref}>
                  <p className="font-bold text-slate-950">{claim.requester.name}</p>
                  <p className="break-all text-slate-500">{claim.requester.email}</p>
                </LinkedTableCell>
                <LinkedTableCell href={claimHref} className="text-slate-700">{claimRoleLabel(claim.requester.role)}</LinkedTableCell>
                <LinkedTableCell href={claimHref}><ClaimStatusBadge status={claim.status} /></LinkedTableCell>
                <LinkedTableCell href={claimHref} className="text-slate-600">{formatDate(new Date(claim.createdAt))}</LinkedTableCell>
                <td className="px-5 py-4 text-right">
                  <Button href={claimHref} size="sm" variant={claim.status === ClaimStatus.PENDING ? "primary" : "secondary"}>Review</Button>
                </td>
              </TableRow>
              );
            })}
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
    <Button href={href} size={iconOnly ? "icon" : "sm"} variant={active ? "primary" : "secondary"} className={`${iconOnly ? "h-9 min-h-9 w-9 px-0" : "min-h-9 px-3"} ${active ? "shadow-sm" : "hover:bg-stone-50"}`} aria-label={iconOnly ? "Go to claims page" : undefined}>
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
