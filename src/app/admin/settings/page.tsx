import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Mail, RefreshCw, Send, Settings, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/shell";
import { requireAdminPage } from "@/lib/admin";
import { getEmailProvisioningConfig } from "@/lib/email-provisioning";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Settings",
  description: "Manage email operations, audits, and application settings.",
};

export default async function SettingsPage() {
  await requireAdminPage();
  const emailConfig = getEmailProvisioningConfig();
  const [outboundEmailCount, failedEmailCount, invalidEmailCount, recentAuditLogs] = await Promise.all([
    prisma.outboundEmail.count(),
    prisma.outboundEmail.count({ where: { status: { in: ["FAILED", "RETRY_PENDING", "INVALID_EMAIL", "PERMANENTLY_FAILED"] } } }),
    prisma.invalidEmailAddress.count(),
    prisma.adminAuditLog.findMany({
      take: 8,
      include: { actor: true, target: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-stone-950">Settings</h1>
            <p className="mt-2 text-stone-700">Manage email operations, audit activity, and future application settings.</p>
          </div>
          <Link href="/admin/settings" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 text-sm font-bold text-stone-800">
            <RefreshCw size={16} aria-hidden /> Refresh
          </Link>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <SettingsCard accent="teal" icon={<Mail size={22} aria-hidden />} title="Emails Overview">
            <Info label="Provider" value={emailConfig.provider} />
            <Info label="Outbound Emails" value={outboundEmailCount.toLocaleString()} />
            <Info label="Email Attention" value={failedEmailCount.toLocaleString()} />
            <Info label="Invalid Emails" value={invalidEmailCount.toLocaleString()} />
            <CardLink href="/admin/settings">View email settings</CardLink>
          </SettingsCard>

          <SettingsCard accent="violet" icon={<ShieldCheck size={22} aria-hidden />} title="Recent Audits">
            {recentAuditLogs.length ? (
              recentAuditLogs.map((log) => (
                <div key={log.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-stone-100 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-stone-950">{sentenceCase(log.action)}</p>
                    <p className="truncate text-sm text-stone-600">{log.actor.email}{log.target ? ` -> ${log.target.email}` : ""}</p>
                  </div>
                  <p className="shrink-0 text-xs font-semibold text-stone-500">{formatDate(log.createdAt)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-stone-600">No audit activity yet.</p>
            )}
            <CardLink href="/admin/settings">View all audits</CardLink>
          </SettingsCard>

          <SettingsCard accent="blue" icon={<Settings size={22} aria-hidden />} title="Application Settings">
            <p className="max-w-sm text-sm font-semibold leading-6 text-stone-700">Configure future platform behavior and system preferences.</p>
            <div className="mx-auto my-8 flex size-24 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
              <Settings size={48} aria-hidden />
            </div>
            <p className="mx-auto max-w-xs text-center text-sm font-bold leading-6 text-stone-700">Application settings will be available here when configuration requirements are ready.</p>
            <CardLink href="/admin/settings">Learn more</CardLink>
          </SettingsCard>
        </div>

        <section className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-blue-950">What&apos;s coming next?</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-blue-900">More application settings and configuration controls will be available here. We&apos;re working on bringing powerful tools to manage your platform better.</p>
            </div>
            <Send className="hidden text-blue-300 sm:block" size={56} aria-hidden />
          </div>
        </section>
      </section>
    </PageShell>
  );
}

function SettingsCard({ accent, children, icon, title }: { accent: "blue" | "teal" | "violet"; children: React.ReactNode; icon: React.ReactNode; title: string }) {
  const accentClass = {
    blue: "border-blue-200 text-blue-700",
    teal: "border-teal-100 text-teal-700",
    violet: "border-violet-200 text-violet-700",
  }[accent];

  return (
    <section className={`rounded-lg border bg-white p-4 shadow-sm ${accentClass}`}>
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-md bg-current/10">{icon}</span>
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-stone-100 py-3">
      <p className="text-sm font-bold text-teal-800">{label}</p>
      <p className="mt-1 break-all font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function CardLink({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-teal-800">
      {children} <ArrowRight size={16} aria-hidden />
    </Link>
  );
}

function sentenceCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}
