import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function readSource(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("email operations contracts", () => {
  it("password reset emails are sent immediately after being queued", () => {
    const source = readSource("src/lib/password-reset.ts");

    assert.match(source, /const\s+outboundEmail\s*=\s*await\s+queueEmail\(/);
    assert.match(source, /await\s+sendQueuedEmail\(outboundEmail\.id\)/);
    assert.ok(
      source.indexOf("await sendQueuedEmail(outboundEmail.id)") > source.indexOf("const outboundEmail = await queueEmail("),
      "sendQueuedEmail must stay after the password reset email is queued",
    );
  });

  it("academy claim reminder emails are sent immediately after being queued", () => {
    const source = readSource("src/app/admin/academies/actions.ts");

    assert.match(source, /async\s+function\s+queueAcademyClaimReminderEmail/);
    assert.match(source, /const\s+outboundEmail\s*=\s*await\s+queueEmail\(/);
    assert.match(source, /await\s+sendQueuedEmail\(outboundEmail\.id\)/);
    assert.ok(
      source.indexOf("await sendQueuedEmail(outboundEmail.id)") > source.indexOf("const outboundEmail = await queueEmail("),
      "sendQueuedEmail must stay after the academy claim reminder email is queued",
    );
  });

  it("email delivery job reports the number of processed emails and returned ids", () => {
    const source = readSource("src/app/api/jobs/email-delivery/route.ts");

    assert.match(source, /const\s+result\s*=\s*await\s+processEmailDeliveryJob\(limit(?:,\s*trigger)?\)/);
    assert.match(source, /processed:\s*result\.processed\.length/);
    assert.match(source, /ids:\s*result\.processed\.filter\(Boolean\)\.map\(\(email\)\s*=>\s*email\?\.id\)/);
    assert.match(source, /due:\s*result\.summary\.dueQueueCount/);
    assert.match(source, /scheduledRetry:\s*result\.summary\.scheduledRetryCount/);
    assert.match(source, /attention:\s*result\.summary\.attentionCount/);
    assert.match(source, /invalid:\s*result\.summary\.invalidEmailCount/);
  });

  it("email operations dashboards count failed and retry-pending queued emails as attention items", () => {
    const reliableEmail = readSource("src/lib/reliable-email.ts");

    assert.match(reliableEmail, /export\s+async\s+function\s+getEmailQueueOperationsSummary/);
    assert.match(reliableEmail, /prisma\.outboundEmail\.count\(\)/);
    assert.match(reliableEmail, /status:\s*\{\s*in:\s*\[OutboundEmailStatus\.PENDING,\s*OutboundEmailStatus\.RETRY_PENDING\]\s*\}/);
    assert.match(reliableEmail, /status:\s*OutboundEmailStatus\.RETRY_PENDING/);
    assert.match(reliableEmail, /nextAttemptAt:\s*\{\s*gt:\s*now\s*\}/);
    assert.match(reliableEmail, /OutboundEmailStatus\.FAILED/);
    assert.match(reliableEmail, /OutboundEmailStatus\.RETRY_PENDING/);
    assert.match(reliableEmail, /OutboundEmailStatus\.INVALID_EMAIL/);
    assert.match(reliableEmail, /OutboundEmailStatus\.PERMANENTLY_FAILED/);
    assert.match(reliableEmail, /prisma\.invalidEmailAddress\.count\(\)/);

    const dashboards = ["src/app/admin/page.tsx", "src/app/admin/settings/page.tsx"];
    for (const path of dashboards) {
      const source = readSource(path);
      const usesSharedSummary = source.includes("getEmailQueueOperationsSummary()");
      const usesLegacyCounts =
        /prisma\.outboundEmail\.count\(\)/.test(source) &&
        /status:\s*\{\s*in:\s*\["FAILED",\s*"RETRY_PENDING",\s*"INVALID_EMAIL",\s*"PERMANENTLY_FAILED"\]\s*\}/.test(source) &&
        /prisma\.invalidEmailAddress\.count\(\)/.test(source);

      assert.ok(usesSharedSummary || usesLegacyCounts, `${path} must show email operations counts from shared or equivalent queries`);
    }
  });
});
