import type { Metadata } from "next";
import { StaticPageShell } from "@/components/Page";

export const metadata: Metadata = {
  title: "Privacy Policy | RollFinders",
  description: "Read how RollFinders collects, uses, stores, and protects personal data, including user account information, cookies, analytics, and GDPR rights.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <StaticPageShell>
      <LegalPage title="Privacy Policy" intro="This policy explains how RollFinders handles personal data for users, academy owners, and visitors.">
        <Section title="Data We Collect">
          <p>We may collect account details such as name, email address, login activity, academy claim information, and messages sent to RollFinders.</p>
          <p>We also collect basic technical information such as device type, browser, approximate location from search input, cookies, and analytics events used to understand product performance.</p>
        </Section>
        <Section title="How We Use Data">
          <p>We use data to operate the platform, authenticate users, manage academy listings, respond to support requests, prevent abuse, and improve discovery features.</p>
        </Section>
        <Section title="Cookies and Analytics">
          <p>RollFinders may use essential cookies for authentication and security. Analytics may be used to understand aggregate usage, search demand, and map interactions.</p>
        </Section>
        <Section title="Data Retention">
          <p>Account and administrative records are kept while they are needed to operate RollFinders, meet legal obligations, resolve disputes, and protect platform integrity.</p>
        </Section>
        <Section title="Your Rights">
          <p>Users in the UK and EEA may request access, correction, deletion, restriction, portability, or objection to processing of their personal data, subject to legal limits.</p>
        </Section>
        <Section title="Contact">
          <p>For privacy requests, contact support@rollfinders.com.</p>
        </Section>
      </LegalPage>
    </StaticPageShell>
  );
}

function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-wide text-teal-800">RollFinders</p>
      <h1 className="mt-3 text-4xl font-black text-stone-950">{title}</h1>
      <p className="mt-5 text-lg leading-8 text-stone-700">{intro}</p>
      <div className="mt-8 space-y-7 text-stone-700">{children}</div>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-black text-stone-950">{title}</h2>
      <div className="mt-3 space-y-3 leading-7">{children}</div>
    </section>
  );
}
