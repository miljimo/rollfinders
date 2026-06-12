import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

test("academy social links migration creates relation and backfills legacy fields", () => {
  const migration = readSource("prisma/migrations/20260611171000_academy_social_links/migration.sql");
  const schema = readSource("prisma/schema.prisma");

  assert.match(schema, /model AcademySocialLink \{[\s\S]*academyId String\s+@map\("academy_id"\)[\s\S]*platform\s+AcademySocialPlatform[\s\S]*url\s+String[\s\S]*@@unique\(\[academyId, platform\]\)/);
  assert.match(schema, /model Academy \{[\s\S]*socialLinks\s+AcademySocialLink\[\]/);
  assert.match(migration, /CREATE TABLE "academy_social_links"/);
  assert.match(migration, /FOREIGN KEY \("academy_id"\) REFERENCES "academies"\("id"\)[\s\S]*ON DELETE CASCADE/);
  assert.match(migration, /SELECT 'legacy-facebook-' \|\| "id", "id", 'FACEBOOK'::"AcademySocialPlatform", "facebook_url"/);
  assert.match(migration, /SELECT 'legacy-instagram-' \|\| "id", "id", 'INSTAGRAM'::"AcademySocialPlatform", "instagram_url"/);
  assert.match(migration, /SELECT 'legacy-x-' \|\| "id", "id", 'X'::"AcademySocialPlatform", "x_url"/);
});

test("academy create and update persist relational social links plus legacy-compatible fields", () => {
  const actions = readSource("src/app/admin/academies/actions.ts");
  const createApi = readSource("src/app/api/admin/academies/route.ts");
  const updateApi = readSource("src/app/api/admin/academies/[id]/route.ts");

  for (const source of [actions, createApi, updateApi]) {
    assert.match(source, /parseAcademySocialLinksJson/);
    assert.match(source, /socialLinksFromLegacy/);
    assert.match(source, /legacySocialUrlsFromLinks/);
    assert.match(source, /facebookUrl: toNullable\(legacySocialUrls\.facebookUrl \|\| data\.facebookUrl\)/);
    assert.match(source, /instagramUrl: toNullable\(legacySocialUrls\.instagramUrl \|\| data\.instagramUrl\)/);
    assert.match(source, /xUrl: toNullable\(legacySocialUrls\.xUrl \|\| data\.xUrl\)/);
  }

  assert.match(actions, /socialLinks: socialLinks\.length \? \{ create: socialLinks \} : undefined/);
  assert.match(createApi, /socialLinks: socialLinks\.length \? \{ create: socialLinks \} : undefined/);
  assert.match(actions, /academySocialLink\.deleteMany\(\{ where: \{ academyId: id \} \}\)/);
  assert.match(actions, /academySocialLink\.createMany\(\{[\s\S]*data: socialLinks\.map\(\(link\) => \(\{ \.\.\.link, academyId: id \}\)\)/);
  assert.match(updateApi, /academySocialLink\.deleteMany\(\{ where: \{ academyId: id \} \}\)/);
  assert.match(updateApi, /academySocialLink\.createMany\(\{[\s\S]*data: socialLinks\.map\(\(link\) => \(\{ \.\.\.link, academyId: id \}\)\)/);
});

test("academy social links UI provides selector, URI input, and three-item pagination", () => {
  const form = readSource("src/app/admin/academies/AcademyForm.tsx");

  assert.match(form, /const pageSize = 3/);
  assert.match(form, /socialLinks\.slice\(\(currentPage - 1\) \* pageSize, currentPage \* pageSize\)/);
  assert.match(form, /<select value=\{platform\}[\s\S]*academySocialPlatformOptions\.map/);
  assert.match(form, /<input value=\{url\}[\s\S]*placeholder="https:\/\/\.\.\."/);
  assert.match(form, /<th className="px-3 py-2">Platform<\/th>/);
  assert.match(form, /<th className="px-3 py-2">URI<\/th>/);
  assert.match(form, /Page \{currentPage\} of \{totalPages\} · 3 items per page/);
});

test("public academy profile renders relational social links as external anchors", () => {
  const page = readSource("src/app/academies/[slug]/page.tsx");

  assert.match(page, /socialLinks: \{ orderBy: \{ platform: "asc" \} \}/);
  assert.match(page, /academy\.socialLinks\.map\(\(link\) =>/);
  assert.match(page, /href=\{link\.url\} target="_blank" rel="noreferrer"/);
  assert.match(page, /academySocialPlatformLabels\[link\.platform\]/);
});
