import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = process.cwd();

function source(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

test("the retired mobile portal route and navigation are absent", () => {
  assert.equal(existsSync(resolve(root, "apps/portal/src/app/mobile")), false);
  assert.equal(existsSync(resolve(root, "apps/portal/src/app/_components/MobileNavigation")), false);
});

test("active portal code does not link or redirect to the retired mobile route", () => {
  for (const path of [
    "apps/portal/src/app/dashboard/page.tsx",
    "apps/portal/src/app/payments/status/page.tsx",
    "apps/portal/src/app/register/actions.ts",
    "apps/portal/src/app/register/page.tsx",
    "apps/portal/src/lib/courses.ts",
    "apps/portal/src/proxy.ts",
  ]) {
    assert.doesNotMatch(source(path), /["'`]\/mobile(?:[?\/"'`]|$)/, path);
  }
});
