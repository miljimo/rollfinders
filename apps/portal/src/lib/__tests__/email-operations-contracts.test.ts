import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function readSource(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("email operations contracts", () => {
  it("password reset emails are submitted through the notification service adapter", () => {
    const source = readSource("apps/portal/src/lib/password-reset.ts");

    assert.match(source, /const\s+outboundEmail\s*=\s*await\s+queueEmail\(/);
    assert.match(source, /await\s+sendQueuedPasswordEmail\(outboundEmail\.id\)/);
    assert.match(source, /sentEmail\?\.status\s*!==\s*OutboundEmailStatus\.SENT/);
    assert.ok(
      source.indexOf("await sendQueuedPasswordEmail(outboundEmail.id)") > source.indexOf("const outboundEmail = await queueEmail("),
      "password reset flow must acknowledge the notification after it is queued",
    );
  });

  it("password changed emails use HTML and do not send plaintext passwords", () => {
    const source = readSource("apps/portal/src/lib/password-reset.ts");
    const dashboardAction = readSource("apps/portal/src/app/dashboard/password/PasswordActions.ts");
    const adminSettingsAction = readSource("apps/portal/src/app/admin/settings/actions.ts");

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

  it("academy claim reminder emails are submitted through the notification service adapter", () => {
    const source = readSource("apps/portal/src/app/admin/academies/actions.ts");

    assert.match(source, /async\s+function\s+queueAcademyClaimReminderEmail/);
    assert.match(source, /const\s+outboundEmail\s*=\s*await\s+queueEmail\(/);
    assert.match(source, /await\s+sendQueuedEmail\(outboundEmail\.id\)/);
    assert.ok(
      source.indexOf("await sendQueuedEmail(outboundEmail.id)") > source.indexOf("const outboundEmail = await queueEmail("),
      "academy claim reminder flow must acknowledge the notification after it is queued",
    );
  });

  it("academy admin invitation emails are submitted through the notification service adapter", () => {
    const source = readSource("apps/portal/src/app/admin/academies/actions.ts");

    assert.match(source, /async\s+function\s+queueAcademyInvitationEmail/);
    assert.match(source, /const\s+outboundEmail\s*=\s*await\s+queueEmail\(/);
    assert.match(source, /await\s+sendQueuedEmail\(outboundEmail\.id\)/);
    assert.ok(
      source.indexOf("await sendQueuedEmail(outboundEmail.id)", source.indexOf("async function queueAcademyInvitationEmail")) >
        source.indexOf("const outboundEmail = await queueEmail(", source.indexOf("async function queueAcademyInvitationEmail")),
      "academy admin invitation flow must acknowledge the notification after it is queued",
    );
  });

  it("academy claim reminder cooldown is scoped to the current recipient email", () => {
    const source = readSource("apps/portal/src/app/admin/academies/actions.ts");
    const cooldownSource = readSource("apps/portal/src/lib/academy-claim-reminders.ts");
    const dashboardSource = readSource("apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx");

    assert.match(cooldownSource, /claimReminderCooldownDays\s*=\s*7/);
    assert.match(source, /import\s+\{\s*claimReminderCooldownDays\s*\}\s+from\s+"@\/lib\/academy-claim-reminders"/);
    assert.match(dashboardSource, /import\s+\{\s*claimReminderCooldownDays\s*\}\s+from\s+"@\/lib\/academy-claim-reminders"/);
    assert.match(source, /const\s+recentReminder\s*=\s*await\s+findRecentQueuedAcademyClaimReminder\(academy\.id,\s*email,\s*reminderCooldownStart\(\)\)/);
    assert.match(source, /createAcademyClaimReminder\(\{[\s\S]*recipientEmail:\s*email/);
    assert.match(source, /status:\s*"QUEUED"/);
    assert.match(source, /recently_sent/);
  });

  it("email delivery job reports the number of processed emails and returned ids", () => {
    const source = readSource("apps/portal/src/app/api/jobs/email-delivery/route.ts");

    assert.match(source, /const\s+result\s*=\s*await\s+processEmailDeliveryJob\(limit(?:,\s*trigger)?\)/);
    assert.match(source, /processed:\s*result\.processed\.length/);
    assert.match(source, /ids:\s*result\.processed\.filter\(Boolean\)\.map\(\(email\)\s*=>\s*email\?\.id\)/);
    assert.match(source, /due:\s*result\.summary\.dueQueueCount/);
    assert.match(source, /scheduledRetry:\s*result\.summary\.scheduledRetryCount/);
    assert.match(source, /attention:\s*result\.summary\.attentionCount/);
    assert.match(source, /invalid:\s*result\.summary\.invalidEmailCount/);
  });

  it("email operations dashboards use notification-service-owned summary data", () => {
    const reliableEmail = readSource("apps/portal/src/lib/reliable-email.ts");
    const schema = readSource("prisma/schema.prisma");
    const migration = readSource("prisma/migrations/20260623190000_remove_public_notification_tables/migration.sql");

    assert.match(reliableEmail, /export\s+async\s+function\s+getEmailQueueOperationsSummary/);
    assert.match(reliableEmail, /\/v1\/notifications/);
    assert.match(reliableEmail, /NOTIFICATION_SERVICE_BASE_URL/);
    assert.doesNotMatch(reliableEmail, /prisma\.outboundEmail|prisma\.invalidEmailAddress|nodemailer|sendMail\(/);
    assert.doesNotMatch(schema, /model\s+OutboundEmail|model\s+InvalidEmailAddress|model\s+EmailDeliveryJobRun|enum\s+OutboundEmailStatus|enum\s+EmailDeliveryJobRunStatus/);
    assert.match(migration, /DROP TABLE IF EXISTS "outbound_emails"/);
    assert.match(migration, /DROP TABLE IF EXISTS "invalid_email_addresses"/);

    const dashboards = ["apps/portal/src/app/dashboard/DashboardWorkspaceShell.tsx", "apps/portal/src/app/admin/settings/page.tsx"];
    for (const path of dashboards) {
      const source = readSource(path);
      assert.match(source, /getEmailQueueOperationsSummary\(\)/, `${path} must use the shared notification summary adapter`);
      assert.doesNotMatch(source, /prisma\.outboundEmail|prisma\.invalidEmailAddress/);
    }
  });

  it("notification state is not classified or persisted by the public app", () => {
    const reliableEmail = readSource("apps/portal/src/lib/reliable-email.ts");

    assert.match(reliableEmail, /fetch\(`\$\{notificationServiceBaseURL\(\)\}\/v1\/notifications`/);
    assert.match(reliableEmail, /"X-API-Key":\s*notificationAPIKey\(\)/);
    assert.doesNotMatch(reliableEmail, /isPermanentFailure|markInvalidEmail|InvalidEmailAddress|invalidEmailAddress/);
  });

  it("uses SMTP-only delivery in notification service and production infrastructure", () => {
    const provisioning = readSource("apps/portal/src/lib/email-provisioning.ts");
    const reliableEmail = readSource("apps/portal/src/lib/reliable-email.ts");
    const notificationSmtp = readSource("apps/backend_api/internal/services/notification/providers/smtp.go");
    const terraform = readSource("infrastructure/terraform/main.tf");
    const variables = readSource("infrastructure/terraform/variables.tf");
    const packageJson = readSource("package.json");

    assert.doesNotMatch(provisioning, /EMAIL_DELIVERY_PROVIDER|provider:|region:/);
    assert.doesNotMatch(reliableEmail, /@aws-sdk\/client-ses|SendEmailCommand|SESClient|config\.provider/);
    assert.doesNotMatch(reliableEmail, /import\s+nodemailer|sendMail\(/);
    assert.match(provisioning, /const\s+smtpUsername\s*=\s*getEnvVariable\("SMTP_USERNAME"/);
    assert.match(provisioning, /const\s+smtpPassword\s*=\s*getEnvVariable\("SMTP_PASSWORD"/);
    assert.match(provisioning, /smtpUsername:\s*smtpUsername\s*===\s*unsetSentinel\s*\?\s*""\s*:\s*smtpUsername/);
    assert.match(provisioning, /smtpPassword:\s*smtpPassword\s*===\s*unsetSentinel\s*\?\s*""\s*:\s*smtpPassword/);
    assert.match(notificationSmtp, /"net\/smtp"/);
    assert.match(notificationSmtp, /smtp\.NewClient/);
    assert.match(notificationSmtp, /type\s+SMTPConfig\s+struct/);
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
