import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function readSource(path: string) {
  const absolutePath = resolve(root, path);
  assert.equal(existsSync(absolutePath), true, `Expected ${path} to exist`);
  return readFileSync(absolutePath, "utf8");
}

function dashboardSource() {
  return [
    readSource("apps/portal/src/app/dashboard/AdminDashboardWorkspace.tsx"),
    readSource("apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx"),
  ].join("\n");
}

function matchAny(source: string, patterns: RegExp[], message: string) {
  assert.equal(patterns.some((pattern) => pattern.test(source)), true, message);
}

describe("analytics feature contracts", () => {
  it("constrains supported analytics event names in one domain module", () => {
    const source = readSource("apps/portal/src/lib/analytics/events.ts");

    for (const eventName of [
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
    ]) {
      assert.match(source, new RegExp(`["']${eventName}["']`));
    }

    assert.match(source, /export\s+(?:const|type)\s+AnalyticsEventName/);
    assert.match(source, /["']analytics_api["']|["']public_home["']/);
    matchAny(source, [/safeParse/, /z\.enum/, /isAnalyticsEventName[\s\S]*includes/], "analytics events must reject unknown event names before persistence");
    assert.doesNotMatch(source, /\bpassword\b|\bresetToken\b|\brawIp\b|\bipAddress\b|\bevidenceText\b|\bemailBody\b/i);
  });

  it("records analytics events through a best-effort service without leaking sensitive metadata", () => {
    const source = readSource("apps/portal/src/lib/analytics/service.ts");
    const serviceSource = readSource("apps/backend_api/internal/services/analytics/server/repository.go");

    assert.match(source, /\/v1\/events/);
    assert.match(source, /ANALYTICS_SERVICE_BASE_URL/);
    assert.match(serviceSource, /INSERT INTO analytics\.events/);
    assert.match(serviceSource, /country_code/);
    assert.match(serviceSource, /country_name/);
    matchAny(source, [/try\s*\{[\s\S]*analyticsFetch[\s\S]*\}\s*catch/, /\.catch\(/], "analytics writes must be best-effort");
    matchAny(source, [/console\.(?:error|warn)/, /logger\.(?:error|warn)/], "analytics persistence failures should be logged server-side");
    assert.doesNotMatch(source, /\bthrow\s+error\b|\bthrow\s+err\b/);
    assert.doesNotMatch(source, /\bpassword\b|\bresetToken\b|\brawIp\b|\bipAddress\b|\bevidenceText\b|\bemailBody\b/i);
  });

  it("accepts valid public analytics events and rejects invalid payloads through a generic route response", () => {
    const source = readSource("apps/portal/src/app/api/analytics/events/route.ts");

    assert.match(source, /export\s+async\s+function\s+POST/);
    assert.match(source, /analyticsCountryFromRequest\(request\)/);
    assert.match(source, /countryCode:\s*parsed\.countryCode\s*\?\?\s*country\.countryCode/);
    matchAny(source, [/safeParse/, /parseAnalyticsPayload/, /parseAnalyticsEvent/, /validateAnalyticsEvent/, /isAnalyticsEventName/], "analytics route must validate the request payload");
    matchAny(source, [/recordAnalyticsEvent/, /trackAnalyticsEvent/, /createAnalyticsEvent/], "analytics route must delegate persistence to the shared service");
    matchAny(source, [/status:\s*400/, /NextResponse\.json\([^)]*\{\s*status:\s*422\s*\}/], "invalid analytics payloads must be rejected");
    matchAny(source, [/status:\s*(?:202|204)/, /NextResponse\.json\(\s*\{\s*ok:\s*true\s*\}/], "successful analytics responses must be generic");
    assert.doesNotMatch(source, /analyticsEvent|dailyMetric|visitorSession/);
  });

  it("stores and reports country attribution only as aggregate analytics", () => {
    const schemaSource = readSource("apps/backend_api/internal/services/analytics/migrations/tables/002_events.sql");
    const countrySource = readSource("apps/portal/src/lib/analytics/country.ts");
    const reportingSource = readSource("apps/portal/src/lib/analytics/reporting.ts");
    const source = dashboardSource();

    assert.match(schemaSource, /country_code text/);
    assert.match(schemaSource, /country_name text/);
    for (const header of ["x-vercel-ip-country", "cf-ipcountry", "cloudfront-viewer-country"]) {
      assert.match(countrySource, new RegExp(header));
    }
    assert.match(countrySource, /Intl\.DisplayNames/);
    assert.match(reportingSource, /\/v1\/reports\/founder-summary/);
    assert.match(reportingSource, /countries/);
    assert.match(source, /Country attribution/);
    assert.match(source, /FounderAnalyticsPanel/);
    assert.doesNotMatch(countrySource + reportingSource, /latitude|longitude|rawIp|ipAddress/i);
  });

  it("keeps founder analytics API read-only and Super Admin-only", () => {
    const source = readSource("apps/portal/src/app/api/admin/analytics/route.ts");

    assert.match(source, /export\s+async\s+function\s+GET/);
    assert.match(source, /requireSuperAdminApi\(\)/);
    assert.doesNotMatch(source, /requirePlatformAdminApi\(\)|requireAdminApi\(\)/);
    assert.doesNotMatch(source, /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)/);

    for (const metric of ["marketplace", "visitor", "search", "profile", "commercial", "claim", "supply"]) {
      assert.match(source, new RegExp(metric, "i"));
    }
  });

  it("aggregates daily analytics idempotently without deleting raw events", () => {
    const source = readSource("apps/portal/src/lib/analytics/aggregation.ts");
    const serviceSource = readSource("apps/backend_api/internal/services/analytics/server/repository.go");

    assert.match(source, /\/v1\/aggregate/);
    matchAny(serviceSource, [/ON CONFLICT\s*\(\s*metric_date,\s*metric_name,\s*dimension_key\s*\)/], "daily metrics must be upserted idempotently");
    matchAny(serviceSource, [/created_at\s*>=\s*\$1::date[\s\S]*created_at\s*<\s*\(\$1::date \+ INTERVAL '1 day'\)/], "aggregation must scope metrics to one day");
    matchAny(serviceSource, [/DO UPDATE SET/], "daily metric reruns must update existing rows");
    assert.doesNotMatch(source, /analyticsEvent\.(?:delete|deleteMany)/);

    for (const metric of ["academy_profile_viewed", "academy_search_submitted", "open_mat_search_submitted", "open_mat_viewed", "claim_profile_submitted", "academy_created", "open_mat_created"]) {
      assert.match(serviceSource, new RegExp(metric));
    }
  });

  it("exposes founder analytics dashboard UI only to Super Admins", () => {
    const source = dashboardSource();
    const superAdminOnlySource = source.match(/\.\.\.\(superAdmin[\s\S]*href:\s*"\/dashboard\/analytics"[\s\S]*:\s*\[\]\)/)?.[0] ?? "";

    assert.match(source, /value === "analytics"|panel === "analytics"|["']analytics["']/);
    assert.match(source, /isSuperOnlyPanel[\s\S]*analytics/);
    assert.match(source, /!superAdmin\s*&&\s*isSuperOnlyPanel\(requestedPanel\)/);
    assert.match(source, /href:\s*"\/dashboard\/analytics"/);
    assert.match(source, /label:\s*"Analytics"/);
    assert.match(source, /title:\s*"Analytics"/);
    assert.doesNotMatch(source, /title:\s*"Founder Analytics"/);
    assert.notEqual(superAdminOnlySource, "", "Analytics navigation or panel must be gated by the existing Super Admin boundary");

    assert.match(source, /FounderAnalyticsPanel/);
    matchAny(source, [/academySearches|academy_search_submitted/, /openMatSearches|open_mat_search_submitted/], "analytics dashboard should include search metrics");
    matchAny(source, [/profileViews|academy_profile_viewed/, /openMatViews|open_mat_viewed/], "analytics dashboard should include profile and open mat view metrics");
    matchAny(source, [/commercialIntentClicks|commercial_intent_clicked/], "analytics dashboard should include commercial intent metrics");
    matchAny(source, [/claimStarts|claim_profile_started|claimSubmissions|claim_profile_submitted/], "analytics dashboard should include claim funnel metrics");
    matchAny(source, [/academyCreated|academy_created/, /openMatsCreated|open_mat_created/], "analytics dashboard should include supply metrics");
  });

  it("reports daily visitor trends by date for unique visitors and sessions", () => {
    const reportingSource = readSource("apps/portal/src/lib/analytics/reporting.ts");
    const serviceSource = readSource("apps/backend_api/internal/services/analytics/server/repository.go");
    const source = dashboardSource();

    assert.match(reportingSource, /trends:\s*AnalyticsDailyMetric\[\]/);
    assert.match(reportingSource, /\/v1\/reports\/founder-summary/);
    assert.match(serviceSource, /metric_date/);
    assert.match(serviceSource, /ORDER BY metric_date ASC, metric_name ASC/);
    assert.match(serviceSource, /MetricDate/);
    assert.match(serviceSource, /MetricName/);
    assert.match(serviceSource, /MetricValue/);

    for (const metric of ["unique_visitors", "unique_sessions"]) {
      assert.match(reportingSource, new RegExp(`metricName\\s*===\\s*["']${metric}["']|["']${metric}["']`));
      assert.match(source, new RegExp(metric));
    }

    matchAny(source, [/analyticsReport\?\.dailyVisits/, /analyticsReport\.dailyVisits/, /const\s+\w+\s*=\s*analyticsReport\?\.dailyVisits/], "dashboard must consume daily visit rows");
    matchAny(source, [/Daily visits/i, /Visitor trends/i, /Daily visitor/i], "dashboard must label the daily visits trend section");
    matchAny(source, [/metricDate/, /date/i], "daily visit rows must expose the metric date");
    matchAny(source, [/uniqueVisitors[\s\S]*uniqueSessions|uniqueSessions[\s\S]*uniqueVisitors/], "daily visit rows must expose both visitor and session counts");
  });

  it("reports currently logged-in user stats from recent lastLoginAt values", () => {
    const reportingSource = readSource("apps/portal/src/lib/analytics/reporting.ts");
    const source = dashboardSource();

    matchAny(reportingSource, [/lastLoginAt/, /last_login_at/], "analytics reporting must query recent user login timestamps");
    matchAny(reportingSource, [/listManagedUsers\(/, /users-service/], "currently logged-in stats must be derived from the users service");
    matchAny(reportingSource, [/lastLoginAt[\s\S]*(?:gte|>=)/, /last_login_at\s*>=/i], "currently logged-in stats must use a recent lastLoginAt lower bound");
    matchAny(reportingSource, [/!user\.disabled/, /user\.status\s*===\s*["']ACTIVE["']/], "currently logged-in stats must exclude disabled or inactive users");
    matchAny(reportingSource, [/CURRENT_TIMESTAMP|CURRENT_DATE|NOW\(\)|new Date\(/], "recent login stats must be time-window based");
    matchAny(reportingSource, [/currentlyLoggedIn|loggedInUsers|activeUsers|recentLogins/i], "reporting must expose a named currently logged-in user stat");

    matchAny(source, [/currently logged-in/i, /logged-in users/i, /active users/i, /recent logins/i], "dashboard must surface currently logged-in user stats");
    assert.match(source, /lastLoginAt|currentlyLoggedIn|loggedInUsers|activeUsers|recentLogins/i);
  });

  it("records search demand only from explicit search form submissions", () => {
    const academyPageSource = readSource("apps/portal/src/app/academies/page.tsx");
    const openMatsPageSource = readSource("apps/portal/src/app/page.tsx");
    const locationSearchSource = readSource("apps/portal/src/app/_components/LocationSearchForm/LocationSearchForm.tsx");
    const openMatFilterSource = readSource("apps/portal/src/app/_components/OpenMatLocationFilterForm/OpenMatLocationFilterForm.tsx");

    assert.match(locationSearchSource, /name="analyticsIntent"/);
    assert.match(openMatFilterSource, /name="analyticsIntent"\s+value="open_mat_search"/);
    assert.match(academyPageSource, /analyticsIntent\??:\s*string/);
    assert.match(openMatsPageSource, /analyticsIntent\??:\s*string/);
    assert.match(academyPageSource, /params\.analyticsIntent\s*===\s*"academy_search"/);
    assert.match(openMatsPageSource, /params\.analyticsIntent\s*===\s*"open_mat_search"/);
    assert.match(academyPageSource, /analyticsIntent="academy_search"/);
    assert.match(openMatsPageSource, /eventName:\s*"open_mat_search_submitted"/);
    assert.doesNotMatch(academyPageSource, /if\s*\(\s*q\.trim\(\)\s*\|\|\s*lat\s*\|\|\s*lng\s*\)\s*\{/);
    assert.doesNotMatch(openMatsPageSource, /if\s*\(\s*q\.trim\(\)\s*\|\|\s*when\s*\|\|\s*gi\s*\|\|\s*lat\s*\|\|\s*lng\s*\)\s*\{/);
  });
});
