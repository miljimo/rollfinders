import type { Metadata } from "next";
import { StaticPageShell } from "@/components/StaticPageShell";

export const metadata: Metadata = {
  title: "Terms of Service | RollFinders",
  description: "Read the RollFinders terms covering platform usage, user responsibilities, academy listing responsibilities, content ownership, and liability limits.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <StaticPageShell>
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-wide text-teal-800">RollFinders</p>
        <h1 className="mt-3 text-4xl font-black text-stone-950">Terms of Service</h1>
        <p className="mt-5 text-lg leading-8 text-stone-700">
        These Terms describe the rules for using RollFinders and for maintaining accurate academy and Open Mat information.
         These Terms and Conditions may be updated from time to time based on new features, operational requirements, or legal obligations.
        </p>
       
        <div className="mt-8 space-y-7 text-stone-700">
          <Section title="Platform Use">
            <p>RollFinders is provided to help users discover Brazilian Jiu-Jitsu academies, open mats, and visitor-friendly training opportunities.</p>
            <p>Users must not misuse the platform, attempt unauthorized access, submit malicious content, or interfere with service operation.</p>
          </Section>
          <Section title="User Responsibilities">
            <p>Users are responsible for checking session details with academies before attending. Training times, prices, and availability may change.</p>
          </Section>
          <Section title="Academy Responsibilities">
            <p>Academy owners and admins are responsible for submitting accurate, current, and lawful listing information.</p>
          </Section>
          <Section title="Content Ownership">
            <p>Academies retain responsibility for information they submit. By submitting content, they allow RollFinders to display it publicly for discovery and platform operation.</p>
          </Section>
          <Section title="Liability">
            <p>RollFinders provides discovery information and does not control academy operations, coaching, safety procedures, or attendance decisions.</p>
          </Section>
          <Section title="Contact">
            <p>Questions about these terms can be sent to support@rollfinders.com.</p>
          </Section>
        </div>
      </section>
    </StaticPageShell>
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
