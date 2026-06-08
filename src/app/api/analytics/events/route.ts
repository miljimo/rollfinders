import { NextResponse, type NextRequest } from "next/server";
import { analyticsCountryFromRequest } from "@/lib/analytics/country";
import { analyticsIdentityFromRequest, ensureAnalyticsIdentityCookies, hashRequestIp } from "@/lib/analytics/identity";
import { parseAnalyticsPayload, recordAnalyticsEvent } from "@/lib/analytics/service";

const maxBodyBytes = 8_000;

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBodyBytes) {
    return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseAnalyticsPayload(body);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid analytics event" }, { status: 400 });
  }

  const identity = analyticsIdentityFromRequest(request);
  const country = analyticsCountryFromRequest(request);
  const response = NextResponse.json({ ok: true }, { status: 202 });
  const ensured = ensureAnalyticsIdentityCookies(response, {
    visitorId: parsed.visitorId ?? identity.visitorId,
    sessionId: parsed.sessionId ?? identity.sessionId,
  });

  await recordAnalyticsEvent({
    ...parsed,
    visitorId: parsed.visitorId ?? ensured.visitorId,
    sessionId: parsed.sessionId ?? ensured.sessionId,
    source: parsed.source ?? "analytics_api",
    countryCode: parsed.countryCode ?? country.countryCode,
    countryName: parsed.countryName ?? country.countryName,
    ipHash: hashRequestIp(request),
  });

  return response;
}
