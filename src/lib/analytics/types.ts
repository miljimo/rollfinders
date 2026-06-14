import type { AnalyticsEventName, AnalyticsSource } from "./events";

export type AnalyticsMetadataValue = string | number | boolean | null;
export type AnalyticsMetadata = Record<string, AnalyticsMetadataValue>;

export type AnalyticsPayload = {
  eventName: AnalyticsEventName;
  visitorId?: string | null;
  sessionId?: string | null;
  academyId?: string | null;
  openMatId?: string | null;
  courseId?: string | null;
  courseType?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  source?: AnalyticsSource | null;
  metadata?: AnalyticsMetadata;
};

export type AnalyticsDailyMetric = {
  metricName: string;
  metricValue: number;
  metricDate: string;
  metadata: AnalyticsMetadata;
};

export type AnalyticsCountrySignal = {
  countryCode: string | null;
  countryName: string;
  eventCount: number;
  visitorCount: number;
};

export type AnalyticsDailyVisit = {
  date: string;
  uniqueVisitors: number;
  uniqueSessions: number;
  eventCount: number;
};

export type AnalyticsLoggedInUsers = {
  activeWindowMinutes: number;
  currentCount: number;
  loggedInTodayCount: number;
  loggedInSevenDayCount: number;
  byRole: Array<{
    role: string;
    currentCount: number;
  }>;
};
