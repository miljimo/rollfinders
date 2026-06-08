export const analyticsEventNames = [
  "page_viewed",
  "academy_search_submitted",
  "open_mat_search_submitted",
  "academy_profile_viewed",
  "open_mat_viewed",
  "commercial_intent_clicked",
  "claim_profile_started",
  "claim_profile_submitted",
  "claim_approved",
  "claim_rejected",
  "academy_created",
  "open_mat_created",
] as const;

export const analyticsSources = [
  "public_academies",
  "public_academy_profile",
  "public_academy_claim",
  "public_open_mats",
  "public_open_mat_detail",
  "admin_academies",
  "admin_open_mats",
  "admin_claims",
  "analytics_api",
  "analytics_job",
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];
export type AnalyticsSource = (typeof analyticsSources)[number];

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && analyticsEventNames.includes(value as AnalyticsEventName);
}

export function isAnalyticsSource(value: unknown): value is AnalyticsSource {
  return typeof value === "string" && analyticsSources.includes(value as AnalyticsSource);
}
