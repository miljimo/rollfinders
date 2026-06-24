import { createHash, randomBytes } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

export const visitorCookieName = "rf_visitor_id";
export const sessionCookieName = "rf_session_id";

const visitorMaxAgeSeconds = 60 * 60 * 24 * 365;
const sessionMaxAgeSeconds = 60 * 30;
const opaqueIdPattern = /^[a-f0-9]{32,64}$/;

export function createAnalyticsId() {
  return randomBytes(16).toString("hex");
}

export function validAnalyticsId(value: string | null | undefined) {
  return typeof value === "string" && opaqueIdPattern.test(value);
}

export function analyticsIdentityFromRequest(request: Request | NextRequest) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = new Map(
    cookieHeader
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => Boolean(key && value))
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );

  const visitorId = cookies.get(visitorCookieName);
  const sessionId = cookies.get(sessionCookieName);

  return {
    visitorId: validAnalyticsId(visitorId) ? visitorId : null,
    sessionId: validAnalyticsId(sessionId) ? sessionId : null,
  };
}

export function ensureAnalyticsIdentityCookies(response: NextResponse, identity: { visitorId?: string | null; sessionId?: string | null }) {
  const visitorCandidate = identity.visitorId;
  const sessionCandidate = identity.sessionId;
  const visitorId = typeof visitorCandidate === "string" && validAnalyticsId(visitorCandidate) ? visitorCandidate : createAnalyticsId();
  const sessionId = typeof sessionCandidate === "string" && validAnalyticsId(sessionCandidate) ? sessionCandidate : createAnalyticsId();

  response.cookies.set(visitorCookieName, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: visitorMaxAgeSeconds,
  });
  response.cookies.set(sessionCookieName, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds,
  });

  return { visitorId, sessionId };
}

export function hashRequestIp(request: Request | NextRequest) {
  const salt = process.env.ANALYTICS_IP_HASH_SALT;
  if (!salt) return null;

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = request.headers.get("x-real-ip")?.trim() || forwardedFor;
  if (!ip) return null;

  return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}
