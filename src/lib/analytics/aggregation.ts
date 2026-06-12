import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { AnalyticsDailyMetric } from "./types";

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function analyticsAggregationDate(value?: string | null) {
  if (!value) {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return dateOnly(yesterday);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return dateOnly(parsed);
}

const aggregateMetrics = [
  ["unique_visitors", "COUNT(DISTINCT visitor_id)", "visitor_id IS NOT NULL"],
  ["unique_sessions", "COUNT(DISTINCT session_id)", "session_id IS NOT NULL"],
  ["academy_searches", "COUNT(*)", "event_name = 'academy_search_submitted'"],
  ["open_mat_searches", "COUNT(*)", "event_name = 'open_mat_search_submitted'"],
  ["course_searches", "COUNT(*)", "event_name = 'course_search_submitted'"],
  ["academy_profile_views", "COUNT(*)", "event_name = 'academy_profile_viewed'"],
  ["open_mat_views", "COUNT(*)", "event_name = 'open_mat_viewed'"],
  ["course_views", "COUNT(*)", "event_name = 'course_viewed'"],
  ["commercial_intent_clicks", "COUNT(*)", "event_name = 'commercial_intent_clicked'"],
  ["claim_starts", "COUNT(*)", "event_name = 'claim_profile_started'"],
  ["claim_submissions", "COUNT(*)", "event_name = 'claim_profile_submitted'"],
  ["claims_approved", "COUNT(*)", "event_name = 'claim_approved'"],
  ["claims_rejected", "COUNT(*)", "event_name = 'claim_rejected'"],
  ["academies_created", "COUNT(*)", "event_name = 'academy_created'"],
  ["open_mats_created", "COUNT(*)", "event_name = 'open_mat_created'"],
  ["courses_created", "COUNT(*)", "event_name = 'course_created'"],
  ["recurring_courses_created", "COUNT(*)", "event_name = 'recurring_course_created'"],
] as const;

export async function aggregateAnalyticsForDate(metricDate: string) {
  const metrics: AnalyticsDailyMetric[] = [];

  try {
    for (const [metricName, expression, predicate] of aggregateMetrics) {
      const rows = await prisma.$queryRawUnsafe<Array<{ value: bigint | number }>>(
        `SELECT ${expression} AS value FROM analytics_events WHERE created_at >= $1::date AND created_at < ($1::date + INTERVAL '1 day') AND ${predicate}`,
        metricDate,
      );
      const metricValue = Number(rows[0]?.value ?? 0);
      // Idempotent global metric upsert; Sam's schema extends the original ON CONFLICT (metric_name, metric_date) contract with dimension_key.
      await prisma.$executeRaw`
        INSERT INTO analytics_daily_metrics (id, metric_name, value, metric_date, dimension_key, dimensions, updated_at)
        VALUES (${randomUUID()}, ${metricName}, ${metricValue}, ${metricDate}::date, 'global', '{}'::jsonb, NOW())
        ON CONFLICT (metric_date, metric_name, dimension_key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
      metrics.push({ metricName, metricValue, metricDate, metadata: {} });
    }
  } catch (error) {
    console.error("[analytics] aggregation failed", error);
    return { ok: false as const, metricDate, metrics, error: "aggregation_failed" };
  }

  return { ok: true as const, metricDate, metrics };
}
