import { getEnvVariable } from "./environments";



const emailDomain = getEnvVariable("EMAIL_DOMAIN", "rollfinders.com");
const emailDeliveryProvider = getEnvVariable("EMAIL_DELIVERY_PROVIDER", "smtp");


export type SMTPConfiguration = {
  provider: string
  domain: string
  region: string
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
    provider: emailDeliveryProvider,
    domain: emailDomain,
    region: getEnvVariable("AWS_REGION", "eu-west-2"),
    fromAddress: getEnvVariable("EMAIL_FROM", `noreply@${emailDomain}`),
    replyToAddress: getEnvVariable("EMAIL_REPLY_TO", `support@${emailDomain}`),
    smtpHost: getEnvVariable("SMTP_HOST", `smtp.${emailDomain}`),
    smtpPort: getEnvVariable("SMTP_PORT", "587"),
    smtpUsername: getEnvVariable("SMTP_USERNAME", ""),
    smtpPassword: getEnvVariable("SMTP_PASSWORD", ""),
    mailboxLink: getEnvVariable("MAILBOX_LINK", `https://mail.${emailDomain}`),
  };
}
