import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

test("public academy discovery loads all academy service pages before local filtering", () => {
  const source = readSource("apps/portal/src/lib/data.ts");

  assert.match(source, /listAllAcademiesFromAcademyService/);
  assert.match(source, /listAllAcademiesFromAcademyService\(\{\s*q\s*\}\)/);
  assert.match(source, /listAllAcademiesFromAcademyService\(\)/);
  assert.doesNotMatch(source, /listAcademiesFromAcademyService\(\{\s*q,\s*limit:\s*100/);
  assert.doesNotMatch(source, /listAcademiesFromAcademyService\(\{\s*limit:\s*100/);
});
