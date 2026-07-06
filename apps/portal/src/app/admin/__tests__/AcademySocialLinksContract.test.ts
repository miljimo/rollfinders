import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

test("academy social links are backfilled into academy service settings before public detail tables are dropped", () => {
  const migration = readSource("prisma/migrations/20260611171000_academy_social_links/migration.sql");
  const removalMigration = readSource("prisma/migrations/20260623123000_remove_public_academy_detail_tables/migration.sql");
  const academyMirrorCleanup = readSource("apps/backend_api/internal/services/academy/migrations/triggers/009_dropLegacyPublicAcademyMirror.sql");
  const schema = readSource("prisma/schema.prisma");

  assert.match(schema, /model AcademySocialLink \{[\s\S]*academyId String\s+@map\("academy_id"\)[\s\S]*platform\s+AcademySocialPlatform[\s\S]*url\s+String[\s\S]*@@unique\(\[academyId, platform\]\)/);
  assert.match(schema, /model Academy \{[\s\S]*socialLinks\s+AcademySocialLink\[\]/);
  assert.match(migration, /CREATE TABLE "academy_social_links"/);
  assert.match(migration, /FOREIGN KEY \("academy_id"\) REFERENCES "academies"\("id"\)[\s\S]*ON DELETE CASCADE/);
  assert.match(migration, /SELECT 'legacy-facebook-' \|\| "id", "id", 'FACEBOOK'::"AcademySocialPlatform", "facebook_url"/);
  assert.match(migration, /SELECT 'legacy-instagram-' \|\| "id", "id", 'INSTAGRAM'::"AcademySocialPlatform", "instagram_url"/);
  assert.match(migration, /SELECT 'legacy-x-' \|\| "id", "id", 'X'::"AcademySocialPlatform", "x_url"/);
  assert.match(removalMigration, /'socialLinks', COALESCE\(\(/);
  assert.match(removalMigration, /DROP TABLE IF EXISTS public\.academy_social_links/);
  assert.match(removalMigration, /DROP TABLE IF EXISTS public\.academy_members/);
  assert.match(removalMigration, /DROP TABLE IF EXISTS public\.academies/);
  assert.match(academyMirrorCleanup, /DROP TRIGGER IF EXISTS rollfinders_mirror_academy ON academy\.academies/);
  assert.match(academyMirrorCleanup, /DROP FUNCTION IF EXISTS academy\."rollfindersMirrorAcademy"\(\)/);
});

test("academy create and update send social links to the academy service payload", () => {
  const actions = readSource("apps/portal/src/app/admin/academies/actions.ts");
  const createApi = readSource("apps/portal/src/app/api/admin/academies/route.ts");
  const updateApi = readSource("apps/portal/src/app/api/admin/academies/[id]/route.ts");

  for (const source of [actions, createApi, updateApi]) {
    assert.match(source, /parseAcademySocialLinksJson/);
    assert.match(source, /socialLinksFromLegacy/);
    assert.match(source, /legacySocialUrlsFromLinks/);
    assert.match(source, /facebookUrl: toNullable\(legacySocialUrls\.facebookUrl \|\| data\.facebookUrl\)/);
    assert.match(source, /instagramUrl: toNullable\(legacySocialUrls\.instagramUrl \|\| data\.instagramUrl\)/);
    assert.match(source, /xUrl: toNullable\(legacySocialUrls\.xUrl \|\| data\.xUrl\)/);
  }

  assert.match(actions, /createAcademyInAcademyService/);
  assert.match(actions, /createAcademyInAcademyService\(\{[\s\S]*createdById: actor\.id,[\s\S]*\}, actor\)/);
  assert.match(actions, /updateAcademyInAcademyService\(id,\s*\{[\s\S]*verified: nextVerificationStatus === AcademyVerificationStatus\.VERIFIED,[\s\S]*\}, actor \?\? undefined\)/);
  assert.match(createApi, /createAcademyInAcademyService/);
  assert.match(createApi, /createAcademyInAcademyService\(\{[\s\S]*createdById: actor\.id,[\s\S]*\}, actor\)/);
  assert.match(updateApi, /updateAcademyInAcademyService\(id,\s*\{[\s\S]*verified: nextVerificationStatus === AcademyVerificationStatus\.VERIFIED,[\s\S]*\}, actor \?\? undefined\)/);
  assert.match(updateApi, /deleteAcademyInAcademyService\(id, actor \?\? undefined\)/);
  assert.match(actions, /socialLinks,/);
  assert.match(createApi, /socialLinks,/);
  assert.match(updateApi, /socialLinks,/);
  assert.doesNotMatch(actions, /academySocialLink\.(createMany|deleteMany)/);
  assert.doesNotMatch(createApi, /academySocialLink\.(createMany|deleteMany)/);
  assert.doesNotMatch(updateApi, /academySocialLink\.(createMany|deleteMany)/);
});

test("academy social links UI provides selector, URI input, and three-item pagination", () => {
  const form = readSource("apps/portal/src/app/admin/academies/AcademyForm.tsx");

  assert.match(form, /const pageSize = 3/);
  assert.match(form, /socialLinks\.slice\(\(currentPage - 1\) \* pageSize, currentPage \* pageSize\)/);
  assert.match(form, /<select value=\{platform\}[\s\S]*academySocialPlatformOptions\.map/);
  assert.match(form, /<input value=\{url\}[\s\S]*placeholder="https:\/\/\.\.\."/);
  assert.match(form, /<th className="px-3 py-2">Platform<\/th>/);
  assert.match(form, /<th className="px-3 py-2">URI<\/th>/);
  assert.match(form, /Page \{currentPage\} of \{totalPages\} · 3 items per page/);
});

test("public academy profile renders relational social links as external anchors", () => {
  const page = readSource("apps/portal/src/app/academies/[slug]/page.tsx");
  const academyService = readSource("apps/portal/src/lib/academyService.ts");

  assert.match(academyService, /socialLinksFromSettings/);
  assert.match(academyService, /socialLinks: socialLinksFromSettings\(settings, item\.id, updatedAt\)/);
  assert.doesNotMatch(academyService, /prisma\.academySocialLink/);
  assert.match(page, /academy\.socialLinks\.map\(\(link\) =>/);
  assert.match(page, /href=\{link\.url\} target="_blank" rel="noreferrer"/);
  assert.match(page, /academySocialPlatformLabels\[link\.platform\]/);
});
