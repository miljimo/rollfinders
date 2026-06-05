import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { StaticPageShell } from "@/components/StaticPageShell";

export const metadata: Metadata = {
  title: "Contact RollFinders | Support and business enquiries",
  description: "Contact RollFinders for support, academy listing updates, partnerships, and business enquiries.",
  alternates: { canonical: "/contact" },
};

const contacts = [
  ["General contact", "hello@rollfinders.com"],
  ["Support", "support@rollfinders.com"],
  ["Business enquiries", "business@rollfinders.com"],
];

export default function ContactPage() {
  return (
    <StaticPageShell>
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-wide text-teal-800">Contact</p>
        <h1 className="mt-3 text-4xl font-black text-stone-950">Get in touch with RollFinders.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">
          Send listing corrections, open mat updates, academy claim questions, partnership ideas, or support requests to the relevant inbox below.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {contacts.map(([label, email]) => (
            <a key={email} href={`mailto:${email}`} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
              <Mail className="text-teal-700" size={22} aria-hidden />
              <p className="mt-3 font-bold text-stone-950">{label}</p>
              <p className="mt-1 break-all text-sm text-stone-600">{email}</p>
            </a>
          ))}
        </div>
      </section>
    </StaticPageShell>
  );
}
