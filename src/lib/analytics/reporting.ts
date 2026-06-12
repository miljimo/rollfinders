import { prisma } from "@/lib/prisma";
import type { AnalyticsCountrySignal, AnalyticsDailyMetric } from "./types";

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

export async function getFounderAnalyticsReport(days = 30) {
  const summary = cloneEmptySummary();
  const boundedDays = Math.min(Math.max(Math.floor(days), 1), 365);
  const trends: AnalyticsDailyMetric[] = [];
  let countries: AnalyticsCountrySignal[] = [];

  try {
    const [dailyRows, rawRows, uniqueRows, countryRows] = await Promise.all([
      prisma.$queryRaw<Array<{ metric_name: string; value: number; metric_date: Date; dimensions: unknown }>>`
      SELECT metric_name, value, metric_date, dimensions
      FROM analytics_daily_metrics
      WHERE metric_date >= (CURRENT_DATE - (${boundedDays}::int - 1))
      ORDER BY metric_date ASC, metric_name ASC
      `,
      prisma.$queryRaw<Array<{ event_name: string; value: number }>>`
        SELECT event_name, COUNT(*)::int AS value
        FROM analytics_events
        WHERE created_at >= (CURRENT_DATE - (${boundedDays}::int - 1))
        GROUP BY event_name
      `,
      prisma.$queryRaw<Array<{ unique_visitors: number; unique_sessions: number }>>`
        SELECT
          COUNT(DISTINCT visitor_id)::int AS unique_visitors,
          COUNT(DISTINCT session_id)::int AS unique_sessions
        FROM analytics_events
        WHERE created_at >= (CURRENT_DATE - (${boundedDays}::int - 1))
      `,
      prisma.$queryRaw<Array<{ country_code: string | null; country_name: string | null; event_count: number; visitor_count: number }>>`
        SELECT
          country_code,
          COALESCE(country_name, 'Unknown') AS country_name,
          COUNT(*)::int AS event_count,
          COUNT(DISTINCT visitor_id)::int AS visitor_count
        FROM analytics_events
        WHERE created_at >= (CURRENT_DATE - (${boundedDays}::int - 1))
        GROUP BY country_code, country_name
        ORDER BY COUNT(*) DESC, COALESCE(country_name, 'Unknown') ASC
        LIMIT 8
      `,
    ]);

    for (const row of dailyRows) {
      addMetric(summary, row.metric_name, Number(row.value));
      trends.push({
        metricName: row.metric_name,
        metricValue: Number(row.value),
        metricDate: row.metric_date.toISOString().slice(0, 10),
        metadata: {},
      });
    }

    const rawMetricMap: Record<string, keyof typeof summary.search | keyof typeof summary.profile | keyof typeof summary.commercial | keyof typeof summary.claim | keyof typeof summary.supply> = {
      academy_search_submitted: "academySearches",
      open_mat_search_submitted: "openMatSearches",
      course_search_submitted: "courseSearches",
      academy_profile_viewed: "academyProfileViews",
      open_mat_viewed: "openMatViews",
      course_viewed: "courseViews",
      commercial_intent_clicked: "commercialIntentClicks",
      claim_profile_started: "claimStarts",
      claim_profile_submitted: "claimSubmissions",
      claim_approved: "claimsApproved",
      claim_rejected: "claimsRejected",
      academy_created: "academiesCreated",
      open_mat_created: "openMatsCreated",
      course_created: "coursesCreated",
      recurring_course_created: "recurringCoursesCreated",
    };

    for (const row of rawRows) {
      const value = Number(row.value);
      const key = rawMetricMap[row.event_name];
      if (!key) continue;
      if (key === "academySearches") summary.search.academySearches = Math.max(summary.search.academySearches, value);
      if (key === "openMatSearches") summary.search.openMatSearches = Math.max(summary.search.openMatSearches, value);
      if (key === "courseSearches") summary.search.courseSearches = Math.max(summary.search.courseSearches, value);
      if (key === "academyProfileViews") summary.profile.academyProfileViews = Math.max(summary.profile.academyProfileViews, value);
      if (key === "openMatViews") summary.profile.openMatViews = Math.max(summary.profile.openMatViews, value);
      if (key === "courseViews") summary.profile.courseViews = Math.max(summary.profile.courseViews, value);
      if (key === "commercialIntentClicks") summary.commercial.commercialIntentClicks = Math.max(summary.commercial.commercialIntentClicks, value);
      if (key === "claimStarts") summary.claim.claimStarts = Math.max(summary.claim.claimStarts, value);
      if (key === "claimSubmissions") summary.claim.claimSubmissions = Math.max(summary.claim.claimSubmissions, value);
      if (key === "claimsApproved") summary.claim.claimsApproved = Math.max(summary.claim.claimsApproved, value);
      if (key === "claimsRejected") summary.claim.claimsRejected = Math.max(summary.claim.claimsRejected, value);
      if (key === "academiesCreated") summary.supply.academiesCreated = Math.max(summary.supply.academiesCreated, value);
      if (key === "openMatsCreated") summary.supply.openMatsCreated = Math.max(summary.supply.openMatsCreated, value);
      if (key === "coursesCreated") summary.supply.coursesCreated = Math.max(summary.supply.coursesCreated, value);
      if (key === "recurringCoursesCreated") summary.supply.recurringCoursesCreated = Math.max(summary.supply.recurringCoursesCreated, value);
    }

    summary.visitor.uniqueVisitors = Math.max(summary.visitor.uniqueVisitors, Number(uniqueRows[0]?.unique_visitors ?? 0));
    summary.visitor.uniqueSessions = Math.max(summary.visitor.uniqueSessions, Number(uniqueRows[0]?.unique_sessions ?? 0));
    const anonymousActivity = summary.search.academySearches + summary.search.openMatSearches + summary.search.courseSearches + summary.profile.academyProfileViews + summary.profile.openMatViews + summary.profile.courseViews;
    summary.marketplace.visitorCount = Math.max(summary.visitor.uniqueVisitors, anonymousActivity);
    summary.marketplace.sessionCount = Math.max(summary.visitor.uniqueSessions, summary.marketplace.visitorCount);
    countries = countryRows.map((row) => ({
      countryCode: row.country_code,
      countryName: row.country_name ?? "Unknown",
      eventCount: Number(row.event_count),
      visitorCount: Number(row.visitor_count),
    }));
  } catch (error) {
    console.error("[analytics] founder report failed", error);
  }

  return { summary, trends, countries, days: boundedDays };
}
