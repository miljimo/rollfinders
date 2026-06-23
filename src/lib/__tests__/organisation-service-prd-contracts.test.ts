import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const prd = readFileSync(resolve(root, "services/organisation/docs/products.md"), "utf8");

function section(heading: string) {
  const marker = `## ${heading}`;
  const start = prd.indexOf(marker);
  assert.notEqual(start, -1, `Expected PRD section "${heading}" to exist`);
  const contentStart = start + marker.length;
  const next = prd.indexOf("\n## ", contentStart);
  return prd.slice(contentStart, next === -1 ? prd.length : next);
}

function subsection(source: string, heading: string) {
  const marker = `### ${heading}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Expected PRD subsection "${heading}" to exist`);
  const contentStart = start + marker.length;
  const nextSubsection = source.indexOf("\n### ", contentStart);
  const nextSection = source.indexOf("\n## ", contentStart);
  const candidates = [nextSubsection, nextSection].filter((index) => index !== -1);
  const next = candidates.length > 0 ? Math.min(...candidates) : source.length;
  return source.slice(contentStart, next);
}

function tableRows(source: string) {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !/^\|\s*-+/.test(line))
    .slice(1)
    .map((line) => line
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim().replace(/`/g, "")));
}

describe("Organisation Service PRD boundary contracts", () => {
  it("keeps Users/IAM as the owner for identities and membership writes", () => {
    const currentContext = section("Current Context");
    const nonGoals = section("Non-Goals");
    const api = section("API Requirements");

    assert.match(currentContext, /Users\/IAM Service remains the writable owner for user identity and organisation membership/);
    assert.match(nonGoals, /Organisation Service SHALL NOT own:[\s\S]*user identities[\s\S]*user authentication[\s\S]*organisation membership assignments/);
    assert.match(nonGoals, /membership writes remain outside Organisation Service/);
    assert.match(api, /Membership References[\s\S]*GET \/v1\/organisations\/\{organisation_id\}\/memberships/);
    assert.match(api, /must read from Users\/IAM or an IAM-owned projection/);
    assert.match(api, /must not write membership assignments/);
    assert.doesNotMatch(api, /\b(?:POST|PUT|PATCH|DELETE)\s+\/v1\/organisations\/\{organisation_id\}\/memberships\b/);
  });

  it("does not claim ownership of domain-service records or cross-service foreign keys", () => {
    const nonGoals = section("Non-Goals");
    const boundaries = section("Ownership Boundaries");
    const integration = section("Service Integration Rules");
    const resourceLinks = subsection(section("Concepts"), "Resource Link");

    for (const domain of [
      "roles or permissions",
      "academy/location records",
      "courses or course occurrences",
      "bookings",
      "payments, payees, payouts, or Stripe Connect state",
      "notification delivery",
      "analytics events",
    ]) {
      assert.match(nonGoals, new RegExp(domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }

    assert.match(boundaries, /Organisation Service owns:[\s\S]*organisations[\s\S]*applications[\s\S]*application-service enablement[\s\S]*organisation\/application lifecycle status/);
    assert.match(resourceLinks, /must not replace domain-service ownership/);
    assert.match(integration, /All domain services must treat `organisation_id` and `application_id` as external identifiers/);
    assert.match(integration, /Domain services must not create cross-service database foreign keys to Organisation Service tables/);
  });

  it("keeps Authorisation Service as permission owner and gateway for protected operations", () => {
    const currentContext = section("Current Context");
    const boundaries = section("Ownership Boundaries");
    const authorisation = section("Authorisation");
    const tickets = section("Implementation Tickets");
    const acceptance = section("Acceptance Criteria");

    assert.match(currentContext, /Authorisation Service owns role bundles, permission definitions, permission assignment, and permission evaluation/);
    assert.match(boundaries, /Organisation Service consumes:[\s\S]*Authorisation Service decisions for protected operations/);
    assert.match(boundaries, /Authorisation Service consumes:[\s\S]*organisation\/application scope IDs/);
    assert.doesNotMatch(boundaries, /application-service enablement projection/);
    assert.match(authorisation, /Organisation Service must not check role names directly/);
    assert.match(authorisation, /Protected operations must call Authorisation Service or receive a trusted authorisation decision/);
    assert.match(tickets, /Ticket 007 - Authorisation Integration[\s\S]*no route relies on hardcoded role names/);
    assert.match(acceptance, /Protected routes declare and enforce Authorisation Service permissions/);
  });

  it("defines the required RollFinders organisation, application, and app_rollfinders service seed", () => {
    const seed = section("RollFinders Seed And Migration");
    const acceptance = section("Acceptance Criteria");

    for (const expected of [
      "id = org_rollfinders",
      "name = RollFinders",
      "slug = rollfinders",
      "status = ACTIVE",
      "id = app_rollfinders",
      "organisation_id = org_rollfinders",
      "name = RollFinders Marketplace",
      "slug = rollfinders-marketplace",
    ]) {
      assert.match(seed, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }

    for (const serviceKey of [
      "account",
      "auth",
      "user",
      "authorisation",
      "academy",
      "course",
      "booking",
      "payment",
      "payout",
      "organisation",
    ]) {
      assert.match(seed, new RegExp(`- \`${serviceKey}\``));
    }

    assert.match(seed, /Future services may add:[\s\S]*notification[\s\S]*analytics/);
    assert.match(seed, /must not break current compatibility flows where existing academy IDs are used as organisation scopes/);
    assert.match(acceptance, /`org_rollfinders` and `app_rollfinders` are seeded idempotently/);
    assert.match(acceptance, /Application-service enablement is stored per application/);
  });

  it("keeps API requirements aligned with the route permission matrix", () => {
    const api = section("API Requirements");
    const matrixRows = tableRows(subsection(section("Authorisation"), "Route Permission Matrix"));
    const matrix = new Map(matrixRows.map(([route, permission]) => [route, permission]));

    const requiredRoutes = new Map([
      ["POST /v1/organisations", "organisation.create"],
      ["GET /v1/organisations", "organisation.search"],
      ["GET /v1/organisations/{organisation_id}", "organisation.read"],
      ["PUT /v1/organisations/{organisation_id}", "organisation.update"],
      ["DELETE /v1/organisations/{organisation_id}", "organisation.delete"],
      ["GET /v1/organisations/{organisation_id}/profile", "organisation.profile.read"],
      ["PUT /v1/organisations/{organisation_id}/profile", "organisation.profile.update"],
      ["GET /v1/organisations/{organisation_id}/settings", "organisation.settings.read"],
      ["PUT /v1/organisations/{organisation_id}/settings/{setting_key}", "organisation.settings.update"],
      ["POST /v1/organisations/{organisation_id}/applications", "organisation.application.create"],
      ["GET /v1/organisations/{organisation_id}/applications", "organisation.application.search"],
      ["GET /v1/applications/{application_id}", "organisation.application.read"],
      ["PUT /v1/applications/{application_id}", "organisation.application.update"],
      ["DELETE /v1/applications/{application_id}", "organisation.application.archive"],
      ["GET /v1/applications/{application_id}/services", "organisation.service.read"],
      ["PUT /v1/applications/{application_id}/services/{service_key}", "organisation.service.enable or organisation.service.disable"],
      ["GET /v1/organisations/{organisation_id}/memberships", "organisation.read plus IAM-backed membership read"],
    ]);

    for (const [route, permission] of requiredRoutes) {
      assert.match(api, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/, "\\s+")));
      assert.equal(matrix.get(route), permission, `Expected route matrix permission for ${route}`);
    }

    const apiRouteCount = [...api.matchAll(/^(?:POST|GET|PUT|DELETE)\s+\/v1\//gm)].length;
    assert.equal(matrix.size, requiredRoutes.size);
    assert.equal(apiRouteCount, requiredRoutes.size + 5, "Resource-link optional routes should remain documented outside the required matrix");
  });

  it("keeps implementation tickets complete enough for phased delivery", () => {
    const tickets = section("Implementation Tickets");
    const acceptance = section("Acceptance Criteria");

    for (const ticketNumber of ["001", "002", "003", "004", "005", "006", "007", "008", "009", "010"]) {
      assert.match(tickets, new RegExp(`### Ticket ${ticketNumber} - `));
    }

    for (const acceptanceClause of [
      "service starts locally and reports ready when the database is reachable",
      "migrations can run repeatedly without error",
      "API supports active/suspended/archived lifecycle without hard-deleting by default",
      "settings are per organisation and use JSON values",
      "application slugs are unique within an organisation",
      "enabled service state is visible and mutable through protected APIs",
      "existing RollFinders flows still work with `app_rollfinders`",
      "Organisation Service does not create, update, or delete memberships",
    ]) {
      assert.match(tickets, new RegExp(acceptanceClause.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }

    assert.match(acceptance, /Migrations are repeatable/);
    assert.match(acceptance, /Local compose can start Organisation Service alongside the other services once implementation tickets are complete/);
    assert.match(acceptance, /without adding new ownership overlap/);
  });
});
