import { listManagedUsers } from "@/lib/users-service";
import type { AnalyticsCountrySignal, AnalyticsDailyMetric, AnalyticsDailyVisit, AnalyticsLoggedInUsers } from "./types";
import { analyticsFetch } from "./service";

const activeLoginWindowMinutes = 30;

type AnalyticsActor = {
  id: string;
  role?: string;
  email?: string;
  academyId?: string | null;
  privileges?: string[];
  accessToken?: string;
};

const emptySummary = {
  marketplace: { visitorCount: 0, sessionCount: 0 },
  visitor: { uniqueVisitors: 0, uniqueSessions: 0 },
  search: { academySearches: 0, openMatSearches: 0, courseSearches: 0 },
  profile: { academyProfileViews: 0, openMatViews: 0, courseViews: 0 },
  commercial: { commercialIntentClicks: 0 },
  claim: { claimStarts: 0, claimSubmissions: 0, claimsApproved: 0, claimsRejected: 0 },
  supply: { academiesCreated: 0, openMatsCreated: 0, coursesCreated: 0, recurringCoursesCreated: 0 },
};

function cloneEmptySummary() {
  return structuredClone(emptySummary);
}

function addMetric(summary: ReturnType<typeof cloneEmptySummary>, metricName: string, value: number) {
  if (metricName === "unique_visitors") summary.visitor.uniqueVisitors += value;
  if (metricName === "unique_sessions") summary.visitor.uniqueSessions += value;
  if (metricName === "academy_searches") summary.search.academySearches += value;
  if (metricName === "open_mat_searches") summary.search.openMatSearches += value;
  if (metricName === "course_searches") summary.search.courseSearches += value;
  if (metricName === "academy_profile_views") summary.profile.academyProfileViews += value;
  if (metricName === "open_mat_views") summary.profile.openMatViews += value;
  if (metricName === "course_views") summary.profile.courseViews += value;
  if (metricName === "commercial_intent_clicks") summary.commercial.commercialIntentClicks += value;
  if (metricName === "claim_starts") summary.claim.claimStarts += value;
  if (metricName === "claim_submissions") summary.claim.claimSubmissions += value;
  if (metricName === "claims_approved") summary.claim.claimsApproved += value;
  if (metricName === "claims_rejected") summary.claim.claimsRejected += value;
  if (metricName === "academies_created") summary.supply.academiesCreated += value;
  if (metricName === "open_mats_created") summary.supply.openMatsCreated += value;
  if (metricName === "courses_created") summary.supply.coursesCreated += value;
  if (metricName === "recurring_courses_created") summary.supply.recurringCoursesCreated += value;
}

function emptyLoggedInUsers(): AnalyticsLoggedInUsers {
  return {
    activeWindowMinutes: activeLoginWindowMinutes,
    currentCount: 0,
    loggedInTodayCount: 0,
    loggedInSevenDayCount: 0,
    byRole: [],
  };
}

function isLoggedInUsers(value: unknown): value is AnalyticsLoggedInUsers {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AnalyticsLoggedInUsers>;
  return (
    typeof candidate.currentCount === "number" &&
    typeof candidate.loggedInTodayCount === "number" &&
    typeof candidate.loggedInSevenDayCount === "number" &&
    Array.isArray(candidate.byRole)
  );
}

function loggedInUsersFromManagedUsers(users: Awaited<ReturnType<typeof listManagedUsers>>["users"]): AnalyticsLoggedInUsers {
  const now = new Date();
  const activeWindowStart = new Date(now.getTime() - activeLoginWindowMinutes * 60 * 1000);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const sevenDayStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const activeUsers = users.filter((user) => !user.disabled && user.status === "ACTIVE" && user.lastLoginAt);
  const recentlyActiveUsers = activeUsers.filter((user) => new Date(user.lastLoginAt as string) >= activeWindowStart);
  const byRoleMap = new Map<string, number>();
  for (const user of recentlyActiveUsers) {
    byRoleMap.set(user.role, (byRoleMap.get(user.role) ?? 0) + 1);
  }
  return {
    activeWindowMinutes: activeLoginWindowMinutes,
    currentCount: recentlyActiveUsers.length,
    loggedInTodayCount: activeUsers.filter((user) => new Date(user.lastLoginAt as string) >= todayStart).length,
    loggedInSevenDayCount: activeUsers.filter((user) => new Date(user.lastLoginAt as string) >= sevenDayStart).length,
    byRole: Array.from(byRoleMap.entries())
      .map(([role, currentCount]) => ({ role, currentCount }))
      .sort((a, b) => b.currentCount - a.currentCount || a.role.localeCompare(b.role)),
  };
}

function mergeLoggedInUsers(primary: AnalyticsLoggedInUsers, fallback: AnalyticsLoggedInUsers): AnalyticsLoggedInUsers {
  const byRole = new Map<string, number>();
  for (const item of [...fallback.byRole, ...primary.byRole]) {
    byRole.set(item.role, Math.max(byRole.get(item.role) ?? 0, item.currentCount));
  }
  return {
    activeWindowMinutes: primary.activeWindowMinutes || fallback.activeWindowMinutes || activeLoginWindowMinutes,
    currentCount: Math.max(primary.currentCount, fallback.currentCount),
    loggedInTodayCount: Math.max(primary.loggedInTodayCount, fallback.loggedInTodayCount),
    loggedInSevenDayCount: Math.max(primary.loggedInSevenDayCount, fallback.loggedInSevenDayCount),
    byRole: Array.from(byRole.entries())
      .map(([role, currentCount]) => ({ role, currentCount }))
      .sort((a, b) => b.currentCount - a.currentCount || a.role.localeCompare(b.role)),
  };
}

export async function getFounderAnalyticsReport(days = 30, actor?: AnalyticsActor) {
  const summary = cloneEmptySummary();
  const boundedDays = Math.min(Math.max(Math.floor(days), 1), 365);
  const trends: AnalyticsDailyMetric[] = [];
  let dailyVisits: AnalyticsDailyVisit[] = [];
  let countries: AnalyticsCountrySignal[] = [];
  let loggedInUsers = emptyLoggedInUsers();

  try {
    const response = await analyticsFetch(`/v1/reports/founder-summary?days=${boundedDays}`);
    const analyticsResponse = response.ok ? await response.json() : null;
    if (analyticsResponse?.summary) Object.assign(summary, analyticsResponse.summary);
    if (Array.isArray(analyticsResponse?.trends)) trends.push(...analyticsResponse.trends);
    if (Array.isArray(analyticsResponse?.countries)) countries = analyticsResponse.countries;
    if (Array.isArray(analyticsResponse?.dailyVisits)) dailyVisits = analyticsResponse.dailyVisits;
    if (isLoggedInUsers(analyticsResponse?.loggedInUsers)) {
      loggedInUsers = { ...analyticsResponse.loggedInUsers, activeWindowMinutes: analyticsResponse.loggedInUsers.activeWindowMinutes || activeLoginWindowMinutes };
    }
  } catch (error) {
    console.error("[analytics] founder analytics service report failed", error);
  }

  try {
    const managedUsersResult = await listManagedUsers(
      actor ?? { id: "analytics-reporting", role: "SUPER_ADMIN", email: "analytics@rollfinders.internal", privileges: ["users.admin.access"] },
      "status=ACTIVE&pageSize=100",
    );
    loggedInUsers = mergeLoggedInUsers(loggedInUsers, loggedInUsersFromManagedUsers(managedUsersResult.users));
  } catch (error) {
    console.error("[analytics] logged-in user fallback failed", error);
  }

  return { summary, trends, countries, dailyVisits, loggedInUsers, days: boundedDays };
}
