import { NextResponse } from "next/server";
import { getFounderAnalyticsReport } from "@/lib/analytics/reporting";
import { requireSuperAdminApi } from "@/lib/admin";

export async function GET(request: Request) {
  const { response } = await requireSuperAdminApi();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") ?? "30");
  const report = await getFounderAnalyticsReport(days);

  return NextResponse.json({
    marketplace: report.summary.marketplace,
    visitor: report.summary.visitor,
    search: report.summary.search,
    profile: report.summary.profile,
    commercial: report.summary.commercial,
    claim: report.summary.claim,
    supply: report.summary.supply,
    trends: report.trends,
    countries: report.countries,
    dailyVisits: report.dailyVisits,
    loggedInUsers: report.loggedInUsers,
    days: report.days,
  });
}
