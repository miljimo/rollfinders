import { parseAnalyticsPayload } from "./domain";
import type { AnalyticsPayload } from "./types";

function analyticsServiceBaseURL() {
  return (process.env.ANALYTICS_SERVICE_BASE_URL ?? "http://localhost:3017").replace(/\/+$/, "");
}

function analyticsAPIKey() {
  return process.env.ANALYTICS_API_KEY ?? "local-analytics-api-key";
}

async function analyticsFetch(path: string, init: RequestInit = {}) {
  return fetch(`${analyticsServiceBaseURL()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": analyticsAPIKey(),
      ...(init.headers ?? {}),
    },
  });
}

export async function recordAnalyticsEvent(payload: AnalyticsPayload & { ipHash?: string | null }) {
  const parsed = parseAnalyticsPayload(payload);
  if (!parsed) return { ok: false as const, skipped: true as const, reason: "invalid_payload" };

  try {
    const response = await analyticsFetch("/v1/events", {
      method: "POST",
      body: JSON.stringify({ ...parsed, ipHash: payload.ipHash ?? null }),
    });
    if (!response.ok) return { ok: false as const, skipped: true as const, reason: "write_failed" };
    return { ok: true as const };
  } catch (error) {
    console.error("[analytics] event write failed", error);
    return { ok: false as const, skipped: true as const, reason: "write_failed" };
  }
}

export async function recordAnalyticsEventBestEffort(payload: AnalyticsPayload & { ipHash?: string | null }) {
  await recordAnalyticsEvent(payload).catch((error) => {
    console.error("[analytics] best-effort event failed", error);
  });
}

export type { AnalyticsPayload };
export { parseAnalyticsPayload };
export { analyticsFetch };
