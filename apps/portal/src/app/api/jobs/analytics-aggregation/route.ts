import { NextResponse } from "next/server";
import { aggregateAnalyticsForDate, analyticsAggregationDate } from "@/lib/analytics/aggregation";
import { getCurrentUser, isPlatformAdminRole } from "@/lib/admin";

function hasCronAccess(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  return Boolean(secret && header === `Bearer ${secret}`);
}

async function authorize(request: Request) {
  if (hasCronAccess(request)) return null;

  const user = await getCurrentUser();
  if (!isPlatformAdminRole(user?.role)) {
    return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });
  }

  return null;
}

export async function GET(request: Request) {
  const forbidden = await authorize(request);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const metricDate = analyticsAggregationDate(searchParams.get("date"));
  if (!metricDate) {
    return NextResponse.json({ error: "Invalid date. Use YYYY-MM-DD." }, { status: 400 });
  }

  const result = await aggregateAnalyticsForDate(metricDate);
  return NextResponse.json(result, { status: result.ok ? 200 : 202 });
}

export async function POST(request: Request) {
  return GET(request);
}
