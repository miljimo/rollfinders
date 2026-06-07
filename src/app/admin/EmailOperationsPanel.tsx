import Link from "next/link";
import { AlertTriangle, Clock3, Mail, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/Button";
import { StatIndicator, type StatIndicatorTone } from "@/components/StatIndicator";
import { Table, type TableColumn } from "@/components/Table";
import type { getEmailQueueOperationsSummary } from "@/lib/reliable-email";
import { formatDate } from "@/lib/utils";

type EmailOperationsSummary = Awaited<ReturnType<typeof getEmailQueueOperationsSummary>>;
type EmailOperationsView = "attention" | "invalid-emails" | "queued" | "runs" | "scheduled-retries";

type EmailOperationsPanelProps = {
  action: (formData: FormData) => void | Promise<void>;
  activeView?: EmailOperationsView;
  attentionHref: string;
  invalidEmailsHref: string;
  queuedHref: string;
  refreshHref: string;
  scheduledRetriesHref: string;
  settingsHref: string;
  summary: EmailOperationsSummary;
};

export function EmailOperationsPanel({
  action,
  activeView = "runs",
  attentionHref,
  invalidEmailsHref,
  queuedHref,
  refreshHref,
  scheduledRetriesHref,
  settingsHref,
  summary,
}: EmailOperationsPanelProps) {
  const lastRun = summary.lastRun;
  const queueRows = {
    queued: queueItemsToRows(summary.dueQueueItems),
    "scheduled-retries": queueItemsToRows(summary.scheduledRetryItems),
    attention: queueItemsToRows(summary.attentionItems),
  };
  const invalidEmailRows = summary.invalidEmails.map((email) => {
    const target = email.user
      ? {
          href: `/admin/users/${email.user.id}`,
          label: email.user.name ?? email.user.email,
          detail: email.user.academy ? `${email.user.role.replaceAll("_", " ")} · ${email.user.academy.name}` : email.user.role.replaceAll("_", " "),
        }
      : email.academy
        ? {
            href: `/academies/${email.academy.slug}`,
            label: email.academy.name,
            detail: "Academy claim contact",
          }
        : email.latestOutboundEmail?.user
          ? {
              href: `/admin/users/${email.latestOutboundEmail.user.id}`,
              label: email.latestOutboundEmail.user.name ?? email.latestOutboundEmail.user.email,
              detail: email.latestOutboundEmail.user.role.replaceAll("_", " "),
            }
          : {
              href: null,
              label: "Unlinked recipient",
              detail: email.latestOutboundEmail?.subject ?? "No target record found",
            };

    return {
      id: email.id,
      email: email.email,
      targetDetail: target.detail,
      targetHref: target.href,
      targetLabel: target.label,
      reason: email.failureReason,
      failureCount: email.failureCount,
      lastFailureAt: formatDate(email.lastFailureAt),
      latestSubject: email.latestOutboundEmail?.subject ?? "No outbound email found",
    };
  });
  const runRows = summary.recentRuns.map((run) => ({
    id: run.id,
    status: run.status.toLowerCase(),
    processed: run.processedCount,
    sent: run.sentCount,
    failed: run.failedCount + run.invalidCount,
    triggeredBy: run.triggeredByEmail ?? run.triggerSource,
    startedAt: formatDate(run.startedAt),
  }));
  const queueColumns: TableColumn<ReturnType<typeof queueItemsToRows>[number]>[] = [
    {
      key: "recipient",
      title: "Recipient",
      render: (_value, row) => (
        <div>
          <p className="font-black text-slate-950">{row.recipient}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{row.subject}</p>
        </div>
      ),
    },
    {
      key: "targetLabel",
      title: "Target audience",
      render: (_value, row) => (
        <div>
          {row.targetHref ? (
            <Link href={row.targetHref} className="font-black text-teal-800 hover:text-teal-950">
              {row.targetLabel}
            </Link>
          ) : (
            <span className="font-black text-slate-950">{row.targetLabel}</span>
          )}
          <p className="mt-1 text-xs font-semibold text-slate-500">{row.targetDetail}</p>
        </div>
      ),
    },
    { key: "status", title: "Status" },
    { key: "retry", title: "Retry" },
    { key: "nextAttemptAt", title: "Next attempt" },
    { key: "lastAttemptAt", title: "Last attempt" },
    {
      key: "failureReason",
      title: "Failure reason",
      render: (value) => <span className="line-clamp-2 max-w-sm text-slate-700">{String(value)}</span>,
    },
  ];
  const invalidEmailColumns: TableColumn<(typeof invalidEmailRows)[number]>[] = [
    {
      key: "email",
      title: "Email",
      render: (value) => <span className="font-black text-slate-950">{String(value)}</span>,
    },
    {
      key: "targetLabel",
      title: "Target audience",
      render: (_value, row) => (
        <div>
          {row.targetHref ? (
            <Link href={row.targetHref} className="font-black text-teal-800 hover:text-teal-950">
              {row.targetLabel}
            </Link>
          ) : (
            <span className="font-black text-slate-950">{row.targetLabel}</span>
          )}
          <p className="mt-1 text-xs font-semibold text-slate-500">{row.targetDetail}</p>
        </div>
      ),
    },
    { key: "latestSubject", title: "Last email" },
    {
      key: "reason",
      title: "Reason",
      render: (value) => <span className="line-clamp-2 max-w-sm text-slate-700">{String(value)}</span>,
    },
    { key: "failureCount", title: "Failures" },
    { key: "lastFailureAt", title: "Last failure" },
  ];
  const runColumns: TableColumn<(typeof runRows)[number]>[] = [
    {
      key: "status",
      title: "Status",
      render: (value, row) => <span className="font-black text-slate-950">{String(value)} · {row.processed} processed</span>,
    },
    { key: "sent", title: "Sent" },
    { key: "failed", title: "Failed" },
    { key: "triggeredBy", title: "Triggered by" },
    { key: "startedAt", title: "Started" },
  ];

  return (
    <section className="rounded-lg border border-teal-100 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700">
            <Mail size={22} aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-black text-teal-900">Email Operations</h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              Process queued outbound emails and review the latest delivery job state.
            </p>
          </div>
        </div>
        <Button href={refreshHref} variant="secondary">
          <RefreshCw size={16} aria-hidden /> Refresh
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric active={activeView === "queued"} href={queuedHref} label="Queued now" tone="teal" value={summary.dueQueueCount} />
        <Metric active={activeView === "scheduled-retries"} href={scheduledRetriesHref} label="Scheduled retry" tone="blue" value={summary.scheduledRetryCount} />
        <Metric active={activeView === "attention"} href={attentionHref} label="Needs attention" tone="amber" value={summary.attentionCount} />
        <Metric active={activeView === "invalid-emails"} href={invalidEmailsHref} label="Invalid emails" tone="red" value={summary.invalidEmailCount} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="rounded-md border border-stone-100 bg-stone-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Total outbound" value={summary.outboundEmailCount.toLocaleString()} />
            <Info label="Last triggered" value={lastRun ? formatDate(lastRun.startedAt) : "Never"} />
            <Info label="Triggered by" value={lastRun?.triggeredByEmail ?? lastRun?.triggerSource ?? "Not yet triggered"} />
          </div>
          <div className="mt-4 rounded-md border border-white bg-white p-3">
            <p className="text-xs font-black uppercase text-slate-500">Last result</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
              {lastRun
                ? `${lastRun.status.toLowerCase()} · ${lastRun.processedCount} processed · ${lastRun.sentCount} sent · ${lastRun.failedCount + lastRun.invalidCount} failed`
                : "No email delivery job has been run yet."}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-md border border-teal-100 bg-teal-50 p-4">
          <div>
            <p className="text-sm font-black text-teal-900">Manual delivery job</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-teal-900">
              Runs the same queue processor used by the delivery API, limited to 20 due emails.
            </p>
          </div>
          <form action={action} className="mt-4 grid gap-3">
            <input type="hidden" name="limit" value="20" />
            <Button type="submit">
              <Send size={16} aria-hidden /> Process queue
            </Button>
            <Button href={settingsHref} variant="secondary">
              View email settings
            </Button>
          </form>
        </div>
      </div>

      <div className="mt-5">
        {activeView === "queued" ? (
          <Table
            columns={queueColumns}
            data={queueRows.queued}
            emptyMessage="No emails are currently due for delivery."
            getRowId={(row) => row.id}
            minWidthClassName="min-w-[980px]"
            title="Queued email items"
          />
        ) : activeView === "scheduled-retries" ? (
          <Table
            columns={queueColumns}
            data={queueRows["scheduled-retries"]}
            emptyMessage="No emails are scheduled for retry."
            getRowId={(row) => row.id}
            minWidthClassName="min-w-[980px]"
            title="Scheduled retry items"
          />
        ) : activeView === "attention" ? (
          <Table
            columns={queueColumns}
            data={queueRows.attention}
            emptyMessage="No email queue items need attention."
            getRowId={(row) => row.id}
            minWidthClassName="min-w-[980px]"
            title="Email items needing attention"
          />
        ) : activeView === "invalid-emails" ? (
          <Table
            columns={invalidEmailColumns}
            data={invalidEmailRows}
            emptyMessage="No invalid email addresses are recorded."
            getRowId={(row) => row.id}
            minWidthClassName="min-w-[920px]"
            title="Invalid email audience"
          />
        ) : (
          <Table
            columns={runColumns}
            data={runRows}
            emptyMessage="No email delivery job has been run yet."
            getRowId={(row) => row.id}
            title={(
              <span className="inline-flex items-center gap-2">
                <Clock3 size={18} aria-hidden /> Recent runs
              </span>
            )}
          />
        )}
      </div>
    </section>
  );
}

function queueItemsToRows(items: EmailOperationsSummary["dueQueueItems"]) {
  return items.map((email) => {
    const target = email.user
      ? {
          href: `/admin/users/${email.user.id}`,
          label: email.user.name ?? email.user.email,
          detail: email.user.academy ? `${email.user.role.replaceAll("_", " ")} · ${email.user.academy.name}` : email.user.role.replaceAll("_", " "),
        }
      : email.academy
        ? {
            href: `/academies/${email.academy.slug}`,
            label: email.academy.name,
            detail: "Academy claim contact",
          }
        : {
            href: null,
            label: "Unlinked recipient",
            detail: "No target record found",
          };

    return {
      id: email.id,
      recipient: email.recipientEmail,
      subject: email.subject,
      targetDetail: target.detail,
      targetHref: target.href,
      targetLabel: target.label,
      status: email.status.replaceAll("_", " ").toLowerCase(),
      retry: `${email.retryCount}/${email.maxRetries}`,
      nextAttemptAt: formatDate(email.nextAttemptAt),
      lastAttemptAt: email.lastAttemptAt ? formatDate(email.lastAttemptAt) : "Not attempted",
      failureReason: email.failureReason ?? "None",
    };
  });
}

function Metric({
  active = false,
  href,
  label,
  tone,
  value,
}: {
  active?: boolean;
  href: string;
  label: string;
  tone: "amber" | "blue" | "red" | "teal";
  value: number;
}) {
  const toneClass: Record<typeof tone, string> = {
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    blue: "border-blue-100 bg-blue-50 text-blue-800",
    red: "border-red-100 bg-red-50 text-red-800",
    teal: "border-teal-100 bg-teal-50 text-teal-800",
  };
  const indicatorTone: Record<typeof tone, StatIndicatorTone> = {
    amber: "warning",
    blue: "neutral",
    red: "negative",
    teal: "neutral",
  };

  return (
    <Link href={href} className={`rounded-md border p-4 transition hover:border-slate-400 ${toneClass[tone]} ${active ? "ring-2 ring-slate-950/10" : ""}`}>
      <p className="flex items-center gap-2 text-sm font-black">
        {tone === "amber" || tone === "red" ? <AlertTriangle size={15} aria-hidden /> : null}
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value.toLocaleString()}</p>
      <StatIndicator className="mt-2" label={value === 1 ? "email item" : "email items"} tone={indicatorTone[tone]} value={value} />
    </Link>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-950">{value}</p>
    </div>
  );
}
