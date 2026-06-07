import type { Metadata } from "next";
import { KeyRound, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/PageShell";
import { QuickActionPanel, type QuickActionPanelItem } from "@/components/QuickActionPanel";
import { elevatedAdminPrivacyAuditLogWhere, requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getEmailQueueOperationsSummary } from "@/lib/reliable-email";
import { formatDate } from "@/lib/utils";
import { processEmailQueue } from "../actions";
import { EmailOperationsPanel } from "../EmailOperationsPanel";
import { ChangePasswordForm } from "../../dashboard/password/ChangePasswordForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Settings",
  description: "Manage email operations, audits, and your account password.",
};

type SettingsSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function selectedEmailOperationsView(value: string | undefined) {
  if (value === "attention" || value === "invalid-emails" || value === "queued" || value === "scheduled-retries") return value;
  return "runs";
}

function selectedSettingsAction(value: string | undefined) {
  if (value === "change-password" || value === "email-options" || value === "recent-audits") return value;
  return "change-password";
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
  const activeSettingsAction = selectedSettingsAction(firstParam(params.settingsAction) ?? firstParam(params.settingsView));
  const emailOperationsView = selectedEmailOperationsView(firstParam(params.emailView));
  const emailPage = pageFromParams(params, "emailPage");
  const emailOptionsHref = "/admin/settings?settingsAction=email-options";
  const settingsActionItems: QuickActionPanelItem[] = [
    {
      active: activeSettingsAction === "change-password",
      title: "Change Password",
      description: "Set a new password for your administrator account",
      href: "/admin/settings?settingsAction=change-password",
      icon: <KeyRound size={24} aria-hidden />,
      id: "change-password",
    },
    {
      active: activeSettingsAction === "email-options",
      title: "Email Options",
      description: "Process queue runs and inspect delivery issues",
      href: "/admin/settings?settingsAction=email-options",
      icon: <Mail size={24} aria-hidden />,
      id: "email-options",
    },
    {
      active: activeSettingsAction === "recent-audits",
      title: "Recent Audits",
      description: "Review recent administrative audit activity",
      href: "/admin/settings?settingsAction=recent-audits",
      icon: <ShieldCheck size={24} aria-hidden />,
      id: "recent-audits",
    },
  ];
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
            <p className="mt-2 text-stone-700">Manage email operations, audit activity, and your account password.</p>
          </div>
          <Button href="/admin/settings" variant="secondary">
            <RefreshCw size={16} aria-hidden /> Refresh
          </Button>
        </div>

        <QuickActionPanel className="mt-7" items={settingsActionItems} />

        <SettingsDetailPanel title={settingsActionItems.find((item) => item.active)?.title ?? "Settings"}>
          {activeSettingsAction === "change-password" ? (
            <div className="max-w-xl">
              <p className="text-sm font-semibold leading-6 text-slate-600">Set a new password for your administrator account.</p>
              <div className="mt-5">
                <ChangePasswordForm cancelHref="/admin/settings" embedded />
              </div>
            </div>
          ) : null}

          {activeSettingsAction === "email-options" ? (
            <EmailOperationsPanel
              action={processEmailQueue}
              activePage={emailPage}
              activeView={emailOperationsView}
              attentionHref={`${emailOptionsHref}&emailView=attention`}
              className="border-0 p-0 shadow-none sm:p-0 lg:col-span-1"
              invalidEmailsHref={`${emailOptionsHref}&emailView=invalid-emails`}
              queuedHref={`${emailOptionsHref}&emailView=queued`}
              refreshHref={emailOptionsHref}
              scheduledRetriesHref={`${emailOptionsHref}&emailView=scheduled-retries`}
              settingsHref={emailOptionsHref}
              summary={emailOperations}
            />
          ) : null}

          {activeSettingsAction === "recent-audits" ? (
            <RecentAuditList logs={recentAuditLogs} />
          ) : null}
        </SettingsDetailPanel>
      </section>
    </PageShell>
  );
}

function SettingsDetailPanel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="mt-7 rounded-lg border border-blue-300 bg-blue-50/20 p-4 shadow-sm sm:p-5" aria-labelledby="settings-detail-title">
      <h2 id="settings-detail-title" className="text-xl font-black text-blue-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function RecentAuditList({ logs }: { logs: Array<{ id: string; action: string; createdAt: Date; actor: { email: string }; target: { email: string } | null }> }) {
  return (
    <div>
      {logs.length ? (
        logs.map((log) => (
          <div key={log.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-stone-100 py-3 last:border-b-0">
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
    </div>
  );
}

function sentenceCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}
