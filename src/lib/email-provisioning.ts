const emailDomain = process.env.EMAIL_DOMAIN ?? "rollfinders.com";
const emailDeliveryProvider = process.env.EMAIL_DELIVERY_PROVIDER?.trim().toLowerCase() === "smtp" ? "SMTP" : "AWS SES";

export function getEmailProvisioningConfig() {
  return {
    provider: emailDeliveryProvider,
    domain: emailDomain,
    region: process.env.EMAIL_REGION ?? process.env.AWS_REGION ?? "eu-west-2",
    fromAddress: process.env.EMAIL_FROM ?? `support@${emailDomain}`,
    replyToAddress: process.env.EMAIL_REPLY_TO ?? `support@${emailDomain}`,
    smtpHost: process.env.SMTP_HOST ?? `smtp.${emailDomain}`,
    smtpPort: process.env.SMTP_PORT ?? "587",
    smtpUsername: process.env.SMTP_USERNAME ?? "",
    smtpPassword: process.env.SMTP_PASSWORD ?? "",
    mailboxLink: process.env.MAILBOX_LINK ?? `https://mail.${emailDomain}`,
  };
}
