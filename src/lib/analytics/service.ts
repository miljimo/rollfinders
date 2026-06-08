import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { parseAnalyticsPayload } from "./domain";
import type { AnalyticsPayload } from "./types";

export async function recordAnalyticsEvent(payload: AnalyticsPayload & { ipHash?: string | null }) {
  const parsed = parseAnalyticsPayload(payload);
  if (!parsed) return { ok: false as const, skipped: true as const, reason: "invalid_payload" };

  try {
    if (parsed.visitorId) {
      await prisma.$executeRaw`
        INSERT INTO analytics_visitors (visitor_id, last_session_id, ip_hash, last_seen_at, session_seen_at, metadata)
        VALUES (${parsed.visitorId}, ${parsed.sessionId}, ${payload.ipHash ?? null}, NOW(), NOW(), '{}'::jsonb)
        ON CONFLICT (visitor_id)
        DO UPDATE SET
          last_session_id = EXCLUDED.last_session_id,
          ip_hash = COALESCE(analytics_visitors.ip_hash, EXCLUDED.ip_hash),
          last_seen_at = NOW(),
          session_seen_at = NOW()
      `;
    }

    await prisma.$executeRaw`
      INSERT INTO analytics_events (
        id,
        event_name,
        visitor_id,
        session_id,
        ip_hash,
        academy_id,
        open_mat_id,
        country_code,
        country_name,
        source,
        metadata
      )
      VALUES (
        ${randomUUID()},
        ${parsed.eventName},
        ${parsed.visitorId},
        ${parsed.sessionId},
        ${payload.ipHash ?? null},
        ${parsed.academyId},
        ${parsed.openMatId},
        ${parsed.countryCode},
        ${parsed.countryName},
        ${parsed.source ?? "analytics_api"},
        ${JSON.stringify(parsed.metadata ?? {})}::jsonb
      )
    `;

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
