import { getEnvVariable } from "./environments";

const emailDomain = getEnvVariable("EMAIL_DOMAIN", "rollfinders.com");

export type SMTPConfiguration = {
  domain: string
  fromAddress: string
  replyToAddress: string
  smtpHost: string
  smtpPort: string
  smtpUsername: string
  smtpPassword: string
  mailboxLink: string
}



export const getEmailProvisioningConfig = (): SMTPConfiguration => {
  return {
    domain: emailDomain,
    fromAddress: getEnvVariable("EMAIL_FROM", `noreply@${emailDomain}`),
    replyToAddress: getEnvVariable("EMAIL_REPLY_TO", `support@${emailDomain}`),
    smtpHost: getEnvVariable("SMTP_HOST", `smtp.${emailDomain}`),
    smtpPort: getEnvVariable("SMTP_PORT", "587"),
    smtpUsername: getEnvVariable("SMTP_USERNAME", ""),
    smtpPassword: getEnvVariable("SMTP_PASSWORD", ""),
    mailboxLink: getEnvVariable("MAILBOX_LINK", `https://mail.${emailDomain}`),
  };
};
