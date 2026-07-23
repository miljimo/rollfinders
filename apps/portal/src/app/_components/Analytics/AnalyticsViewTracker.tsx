"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent, type AnalyticsMetadata } from "./analyticsTracker";

type AnalyticsViewTrackerProps = {
  eventName: string;
  metadata?: AnalyticsMetadata;
};

export function AnalyticsViewTracker({ eventName, metadata }: AnalyticsViewTrackerProps) {
  useEffect(() => {
    trackAnalyticsEvent(eventName, metadata);
  }, [eventName, metadata]);

  return null;
}
