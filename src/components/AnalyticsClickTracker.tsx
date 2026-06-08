"use client";

import { useEffect } from "react";
import type { MouseEvent, ReactNode } from "react";

type AnalyticsMetadata = Record<string, string | number | boolean | null | undefined>;

type AnalyticsClickTrackerProps = {
  as?: "span" | "div";
  children: ReactNode;
  className?: string;
  eventName: string;
  metadata?: AnalyticsMetadata;
};

type AnalyticsViewTrackerProps = {
  eventName: string;
  metadata?: AnalyticsMetadata;
};

function trackAnalyticsEvent(eventName: string, metadata?: AnalyticsMetadata) {
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

export function AnalyticsClickTracker({
  as = "span",
  children,
  className,
  eventName,
  metadata,
}: AnalyticsClickTrackerProps) {
  const Element = as;

  function handleClick(event: MouseEvent<HTMLElement>) {
    if (event.defaultPrevented) return;
    trackAnalyticsEvent(eventName, metadata);
  }

  return (
    <Element className={className} onClick={handleClick}>
      {children}
    </Element>
  );
}

export function AnalyticsViewTracker({ eventName, metadata }: AnalyticsViewTrackerProps) {
  useEffect(() => {
    trackAnalyticsEvent(eventName, metadata);
  }, [eventName, metadata]);

  return null;
}
