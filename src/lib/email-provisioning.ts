const emailDomain = process.env.EMAIL_DOMAIN ?? "rollfinders.com";

export function getEmailProvisioningConfig() {
  return {
    provider: "AWS SES",
    domain: emailDomain,
    region: process.env.EMAIL_REGION ?? process.env.AWS_REGION ?? "eu-west-2",
    fromAddress: process.env.EMAIL_FROM ?? `no-reply@${emailDomain}`,
    replyToAddress: process.env.EMAIL_REPLY_TO ?? `support@${emailDomain}`,
    smtpHost: process.env.SMTP_HOST ?? `smtp.${emailDomain}`,
    smtpPort: process.env.SMTP_PORT ?? "587",
    mailboxLink: process.env.MAILBOX_LINK ?? `https://mail.${emailDomain}`,
  };
}
