import { analyticsFetch } from "./service";
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

export async function aggregateAnalyticsForDate(metricDate: string) {
  try {
    const response = await analyticsFetch(`/v1/aggregate?date=${encodeURIComponent(metricDate)}`, { method: "POST" });
    if (!response.ok) return { ok: false as const, metricDate, metrics: [] as AnalyticsDailyMetric[], error: "aggregation_failed" };
    return (await response.json()) as { ok: true; metricDate: string; metrics: AnalyticsDailyMetric[] };
  } catch (error) {
    console.error("[analytics] aggregation failed", error);
    return { ok: false as const, metricDate, metrics: [] as AnalyticsDailyMetric[], error: "aggregation_failed" };
  }
}
