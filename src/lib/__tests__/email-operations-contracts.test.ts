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
    assert.match(source, /await\s+sendQueuedPasswordEmail\(outboundEmail\.id\)/);
    assert.match(source, /sentEmail\?\.status\s*!==\s*OutboundEmailStatus\.SENT/);
    assert.ok(
      source.indexOf("await sendQueuedPasswordEmail(outboundEmail.id)") > source.indexOf("const outboundEmail = await queueEmail("),
      "sendQueuedEmail must stay after the password reset email is queued",
    );
  });

  it("password changed emails use HTML and do not send plaintext passwords", () => {
    const source = readSource("src/lib/password-reset.ts");
    const dashboardAction = readSource("src/app/dashboard/password/PasswordActions.ts");
    const adminSettingsAction = readSource("src/app/admin/settings/actions.ts");

    assert.match(source, /export\s+async\s+function\s+queuePasswordChangedEmail/);
    assert.match(source, /subject:\s*"Your RollFinders password was changed"/);
    assert.match(source, /Username:/);
    assert.match(source, /Password:/);
    assert.match(source, /Not sent by email/);
    assert.match(source, /html:\s*passwordChangedEmailHtml/);
    assert.match(source, /await\s+sendQueuedPasswordEmail\(outboundEmail\.id\)/);
    assert.doesNotMatch(source, /password:\s*password\b|Password:\s*\$\{password\}/);
    assert.match(dashboardAction, /await\s+queuePasswordChangedEmail\(user\)/);
    assert.match(adminSettingsAction, /await\s+queuePasswordChangedEmail\(actor\)/);
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

  it("academy admin invitation emails are sent immediately after being queued", () => {
    const source = readSource("src/app/admin/academies/actions.ts");

    assert.match(source, /async\s+function\s+queueAcademyInvitationEmail/);
    assert.match(source, /const\s+outboundEmail\s*=\s*await\s+queueEmail\(/);
    assert.match(source, /await\s+sendQueuedEmail\(outboundEmail\.id\)/);
    assert.ok(
      source.indexOf("await sendQueuedEmail(outboundEmail.id)", source.indexOf("async function queueAcademyInvitationEmail")) >
        source.indexOf("const outboundEmail = await queueEmail(", source.indexOf("async function queueAcademyInvitationEmail")),
      "sendQueuedEmail must stay after the academy admin invitation email is queued",
    );
  });

  it("academy claim reminder cooldown is scoped to the current recipient email", () => {
    const source = readSource("src/app/admin/academies/actions.ts");
    const cooldownSource = readSource("src/lib/academy-claim-reminders.ts");
    const dashboardSource = readSource("src/app/dashboard/AdminDashboardWorkspace.tsx");

    assert.match(cooldownSource, /claimReminderCooldownDays\s*=\s*7/);
    assert.match(source, /import\s+\{\s*claimReminderCooldownDays\s*\}\s+from\s+"@\/lib\/academy-claim-reminders"/);
    assert.match(dashboardSource, /import\s+\{\s*claimReminderCooldownDays\s*\}\s+from\s+"@\/lib\/academy-claim-reminders"/);
    assert.match(source, /const\s+recentReminder\s*=\s*await\s+findRecentQueuedAcademyClaimReminder\(academy\.id,\s*email,\s*reminderCooldownStart\(\)\)/);
    assert.match(source, /createAcademyClaimReminder\(\{[\s\S]*recipientEmail:\s*email/);
    assert.match(source, /status:\s*"QUEUED"/);
    assert.match(source, /recently_sent/);
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

    const dashboards = ["src/app/dashboard/AdminDashboardWorkspace.tsx", "src/app/admin/settings/page.tsx"];
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

  it("provider configuration failures are not classified as invalid recipient emails", () => {
    const reliableEmail = readSource("src/lib/reliable-email.ts");

    assert.match(reliableEmail, /function\s+isProviderConfigurationFailure/);
    assert.match(reliableEmail, /email address is not verified/);
    assert.match(reliableEmail, /identity\.\*failed\.\*check/);
    assert.match(reliableEmail, /if\s*\(\s*isProviderConfigurationFailure\(error\)\s*\)\s*return\s+false/);
    assert.match(reliableEmail, /invalidAddressIsProviderConfig/);
    assert.match(reliableEmail, /userInvalidIsProviderConfig/);
    assert.match(reliableEmail, /user\?\.emailStatus\s*===\s*UserEmailStatus\.INVALID\s*&&\s*!userInvalidIsProviderConfig/);
    assert.match(reliableEmail, /async\s+function\s+clearProviderConfigurationInvalidEmail/);
    assert.match(reliableEmail, /await\s+clearProviderConfigurationInvalidEmail\(\{\s*userId:\s*email\.userId,\s*email:\s*email\.recipientEmail\s*\}\)/);
    assert.match(reliableEmail, /emailStatus:\s*UserEmailStatus\.VALID/);
  });

  it("uses SMTP-only delivery in application and production infrastructure", () => {
    const provisioning = readSource("src/lib/email-provisioning.ts");
    const reliableEmail = readSource("src/lib/reliable-email.ts");
    const terraform = readSource("terraform/main.tf");
    const variables = readSource("terraform/variables.tf");
    const packageJson = readSource("package.json");

    assert.doesNotMatch(provisioning, /EMAIL_DELIVERY_PROVIDER|provider:|region:/);
    assert.doesNotMatch(reliableEmail, /@aws-sdk\/client-ses|SendEmailCommand|SESClient|config\.provider/);
    assert.match(provisioning, /const\s+smtpUsername\s*=\s*getEnvVariable\("SMTP_USERNAME"/);
    assert.match(provisioning, /const\s+smtpPassword\s*=\s*getEnvVariable\("SMTP_PASSWORD"/);
    assert.match(provisioning, /smtpUsername:\s*smtpUsername\s*===\s*unsetSentinel\s*\?\s*""\s*:\s*smtpUsername/);
    assert.match(provisioning, /smtpPassword:\s*smtpPassword\s*===\s*unsetSentinel\s*\?\s*""\s*:\s*smtpPassword/);
    assert.match(reliableEmail, /import\s+nodemailer\s+from\s+"nodemailer"/);
    assert.match(reliableEmail, /function\s+smtpTransport/);
    assert.match(reliableEmail, /sendMail\(/);
    assert.doesNotMatch(packageJson, /@aws-sdk\/client-ses/);
    assert.doesNotMatch(variables, /variable\s+"email_delivery_provider"/);
    assert.match(variables, /variable\s+"smtp_username"/);
    assert.match(variables, /variable\s+"smtp_password"/);
    assert.match(variables, /variable\s+"smtp_host"/);
    assert.match(variables, /variable\s+"smtp_port"/);
    assert.match(variables, /variable\s+"email_from_address"/);
    assert.match(variables, /variable\s+"email_reply_to_address"/);
    assert.doesNotMatch(terraform, /EMAIL_DELIVERY_PROVIDER|EMAIL_REGION|ses:SendEmail|ses:SendRawEmail|ses:FromAddress/);
    assert.match(terraform, /EMAIL_FROM\s*=\s*var\.email_from_address\s*!=\s*""\s*\?\s*var\.email_from_address/);
    assert.match(terraform, /EMAIL_REPLY_TO\s*=\s*var\.email_reply_to_address\s*!=\s*""\s*\?\s*var\.email_reply_to_address/);
    assert.match(terraform, /var\.smtp_host\s*!=\s*""\s*\?\s*var\.smtp_host\s*:\s*module\.email\.smtp_host/);
    assert.match(terraform, /SMTP_USERNAME/);
    assert.match(terraform, /SMTP_PASSWORD/);
  });
});
