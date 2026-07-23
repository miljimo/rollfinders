"use client";

export type AnalyticsMetadata = Record<string, string | number | boolean | null | undefined>;

export function trackAnalyticsEvent(eventName: string, metadata?: AnalyticsMetadata) {
  const body = JSON.stringify({ eventName, metadata });

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/analytics/events", blob);
    return;
  }

  void fetch("/api/analytics/events", {
    body,
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    method: "POST",
  }).catch(() => undefined);
}
