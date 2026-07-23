"use client";

import type { MouseEvent, ReactNode } from "react";
import { trackAnalyticsEvent, type AnalyticsMetadata } from "./analyticsTracker";

type AnalyticsClickTrackerProps = {
  as?: "span" | "div";
  children: ReactNode;
  className?: string;
  eventName: string;
  metadata?: AnalyticsMetadata;
};

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
