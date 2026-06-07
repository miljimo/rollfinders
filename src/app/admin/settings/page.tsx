import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/PageShell";
import { elevatedAdminPrivacyAuditLogWhere, requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getEmailQueueOperationsSummary } from "@/lib/reliable-email";
import { formatDate } from "@/lib/utils";
import { processEmailQueue } from "../actions";
import { EmailOperationsPanel } from "../EmailOperationsPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Settings",
  description: "Manage email operations, audits, and application settings.",
};

type SettingsSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function selectedEmailOperationsView(value: string | undefined) {
  if (value === "attention" || value === "invalid-emails" || value === "queued" || value === "scheduled-retries") return value;
  return "runs";
}

function pageFromParams(searchParams: SettingsSearchParams, key: string) {
  const value = Number(firstParam(searchParams[key]) ?? "1");
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<SettingsSearchParams>;
}) {
  const currentUser = await requireAdminPage();
  const params = await searchParams;
  const emailOperationsView = selectedEmailOperationsView(firstParam(params.emailView));
  const emailPage = pageFromParams(params, "emailPage");
  const [emailOperations, recentAuditLogs] = await Promise.all([
    getEmailQueueOperationsSummary(),
    prisma.adminAuditLog.findMany({
      where: elevatedAdminPrivacyAuditLogWhere({ role: currentUser.role }),
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
            <p className="mt-2 text-stone-700">Manage email operations and audit activity.</p>
          </div>
          <Button href="/admin/settings" variant="secondary">
            <RefreshCw size={16} aria-hidden /> Refresh
          </Button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <EmailOperationsPanel
            action={processEmailQueue}
            activePage={emailPage}
            activeView={emailOperationsView}
            attentionHref="/admin/settings?emailView=attention"
            invalidEmailsHref="/admin/settings?emailView=invalid-emails"
            queuedHref="/admin/settings?emailView=queued"
            refreshHref="/admin/settings"
            scheduledRetriesHref="/admin/settings?emailView=scheduled-retries"
            settingsHref="/admin/settings"
            summary={emailOperations}
          />

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
        </div>
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
