import { isAnalyticsEventName, isAnalyticsSource } from "./events";
import { countryNameFromCode } from "./country";
import type { AnalyticsMetadata, AnalyticsPayload } from "./types";

const metadataKeyPattern = /^[a-zA-Z0-9_:-]{1,80}$/;

export function sanitizeAnalyticsMetadata(metadata: unknown): AnalyticsMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};

  return Object.fromEntries(
    Object.entries(metadata as Record<string, unknown>)
      .filter(([key, value]) => metadataKeyPattern.test(key) && (["string", "number", "boolean"].includes(typeof value) || value === null))
      .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 500) : value as string | number | boolean | null]),
  );
}

export function parseAnalyticsPayload(payload: unknown): AnalyticsPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const input = payload as Record<string, unknown>;
  if (!isAnalyticsEventName(input.eventName)) return null;
  if (input.source !== undefined && input.source !== null && !isAnalyticsSource(input.source)) return null;

  const countryCode = typeof input.countryCode === "string" ? input.countryCode.trim().toUpperCase().slice(0, 2) : null;
  const countryName = typeof input.countryName === "string" ? input.countryName.trim().slice(0, 100) : null;

  return {
    eventName: input.eventName,
    visitorId: typeof input.visitorId === "string" ? input.visitorId.slice(0, 100) : null,
    sessionId: typeof input.sessionId === "string" ? input.sessionId.slice(0, 100) : null,
    academyId: typeof input.academyId === "string" ? input.academyId : null,
    openMatId: typeof input.openMatId === "string" ? input.openMatId : null,
    courseId: typeof input.courseId === "string" ? input.courseId : null,
    courseType: typeof input.courseType === "string" ? input.courseType : null,
    countryCode: countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : null,
    countryName: countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryName || countryNameFromCode(countryCode) : null,
    source: input.source ?? null,
    metadata: sanitizeAnalyticsMetadata(input.metadata),
  };
}
