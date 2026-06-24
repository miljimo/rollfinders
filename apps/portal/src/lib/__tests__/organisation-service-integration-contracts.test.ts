import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const organisationClient = readFileSync(resolve(root, "apps/portal/src/lib/organisation-service.ts"), "utf8");
const compose = readFileSync(resolve(root, "compose.yml"), "utf8");
const prismaSchema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");
const publicCleanupMigration = readFileSync(
  resolve(root, "prisma/migrations/20260623173000_remove_public_organisation_registry/migration.sql"),
  "utf8",
);
const serverRoutes = readFileSync(resolve(root, "apps/backend_api/internal/services/organisation/server/server.go"), "utf8");

describe("Organisation service RollFinders integration", () => {
  it("configures RollFinders to call Organisation Service as the organisation data source", () => {
    const apiCompose = readFileSync(resolve(root, "apps/backend_api/containers/api/compose.yml"), "utf8");
    assert.match(compose, /API_PUBLIC_BASE_URL:\s+http:\/\/api:8080/);
    assert.doesNotMatch(compose, /ORGANISATION_PUBLIC_BASE_URL:\s+http:\/\/organisation-api:8080/);
    assert.match(apiCompose, /ORGANISATION_PUBLIC_BASE_URL:\s+http:\/\/organisation-api:8080/);
    assert.match(apiCompose, /organisation-api:[\s\S]*condition: service_healthy/);
    assert.match(organisationClient, /apiGatewayUrl/);
    assert.doesNotMatch(organisationClient, /ORGANISATION_PUBLIC_BASE_URL/);
    assert.match(organisationClient, /ROLLFINDERS_APPLICATION_ID/);
    assert.match(organisationClient, /\/v1\/organisations\//);
    assert.match(organisationClient, /\/v1\/applications\//);
    assert.match(organisationClient, /\/services/);
  });

  it("exposes the read-only Organisation Service endpoints RollFinders depends on", () => {
    for (const route of [
      'GET /v1/organisations/{organisation_id}',
      'GET /v1/applications/{application_id}',
      'GET /v1/applications/{application_id}/services',
    ]) {
      assert.match(serverRoutes, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });

  it("keeps public RollFinders free of organisation registry tables", () => {
    for (const modelName of ["Organisation", "OrganisationProfile", "OrganisationSetting", "Application", "ApplicationService"]) {
      assert.doesNotMatch(prismaSchema, new RegExp(`^model\\s+${modelName}\\b`, "m"));
    }

    for (const tableName of [
      "organisations",
      "organisation_profiles",
      "organisation_settings",
      "applications",
      "application_services",
      "organisation_resource_links",
      "organisation_audit_events",
    ]) {
      assert.match(publicCleanupMigration, new RegExp(`DROP TABLE IF EXISTS public\\.${tableName} CASCADE;`));
    }
  });
});
