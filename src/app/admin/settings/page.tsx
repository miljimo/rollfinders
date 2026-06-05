import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { isProtectedSuperAdmin, requireSuperAdminPage } from "@/lib/admin";
import { getEmailProvisioningConfig } from "@/lib/email-provisioning";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { deleteInvalidEmailRecord, deleteInvalidEmailUser } from "../actions";
import { auditPlatformSettingsReview } from "./actions";
import { SuperAdminPasswordForm } from "./PasswordForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Platform Settings",
  description: "Super Admin platform settings and audited configuration review.",
};

const pageSize = 8;

type SettingsSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageFromParams(searchParams: SettingsSearchParams, key: string) {
  const value = Number(firstParam(searchParams[key]) ?? "1");
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function clampPage(page: number, totalItems: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return Math.min(page, totalPages);
}

function pageHref(searchParams: SettingsSearchParams, key: string, page: number) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([paramKey, value]) => {
    if (!value || paramKey === key) return;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(paramKey, item));
      return;
    }
    params.set(paramKey, value);
  });
  if (page > 1) params.set(key, String(page));
  const query = params.toString();
  return query ? `/admin/settings?${query}` : "/admin/settings";
}

export default async function PlatformSettingsPage({
  searchParams,
}: {
  searchParams: Promise<SettingsSearchParams>;
}) {
  await requireSuperAdminPage();
  const emailConfig = getEmailProvisioningConfig();
  const params = await searchParams;
  const emailPage = pageFromParams(params, "emailsPage");
  const invalidEmailPage = pageFromParams(params, "invalidEmailsPage");

  const [userCount, queuedEmailCount, failedEmailCount, invalidEmailCount] = await Promise.all([
    prisma.user.count(),
    prisma.outboundEmail.count(),
    prisma.outboundEmail.count({ where: { status: { in: ["FAILED", "RETRY_PENDING", "INVALID_EMAIL", "PERMANENTLY_FAILED"] } } }),
    prisma.invalidEmailAddress.count(),
  ]);

  const currentEmailPage = clampPage(emailPage, queuedEmailCount);
  const currentInvalidEmailPage = clampPage(invalidEmailPage, invalidEmailCount);

  const [recentEmails, invalidEmails, recentAdminLogs, recentSettingsLogs] = await Promise.all([
    prisma.outboundEmail.findMany({
      skip: (currentEmailPage - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.invalidEmailAddress.findMany({
      skip: (currentInvalidEmailPage - 1) * pageSize,
      take: pageSize,
      include: { user: true },
      orderBy: { lastFailureAt: "desc" },
    }),
    prisma.adminAuditLog.findMany({
      take: 8,
      include: { actor: true, target: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.adminAuditLog.findMany({
      where: { action: { startsWith: "PLATFORM_SETTINGS" } },
      take: 8,
      include: { actor: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-teal-800">Platform Settings</p>
            <h1 className="mt-2 text-3xl font-black text-stone-950">Settings</h1>
            <p className="mt-2 text-stone-700">Review platform-level configuration and record audited settings actions.</p>
          </div>
          <Link href="/admin" className="rounded-md border border-stone-300 px-4 py-3 text-sm font-bold text-stone-800">Dashboard</Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Users" value={userCount} />
          <Metric label="Outbound Emails" value={queuedEmailCount} />
          <Metric label="Email Attention" value={failedEmailCount} />
          <Metric label="Invalid Emails" value={invalidEmailCount} />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <SettingsPanel title="Email Provisioning" description="Backend configuration for transactional email.">
            <div className="mt-4 grid gap-3 text-sm">
              <ConfigRow label="Provider" value={emailConfig.provider} />
              <ConfigRow label="Sending domain" value={emailConfig.domain} />
              <ConfigRow label="Default sender" value={emailConfig.fromAddress} />
              <ConfigRow label="Reply-to" value={emailConfig.replyToAddress} />
              <ConfigRow label="SMTP server" value={`${emailConfig.smtpHost}:${emailConfig.smtpPort}`} />
              <ConfigRow label="AWS region" value={emailConfig.region} />
              <div className="rounded-md border border-teal-100 bg-teal-50 p-3">
                <p className="text-xs font-bold uppercase text-teal-800">Mailbox link</p>
                <a href={emailConfig.mailboxLink} className="mt-1 block break-all font-semibold text-teal-900 underline">
                  {emailConfig.mailboxLink}
                </a>
              </div>
            </div>
            <form action={auditPlatformSettingsReview} className="mt-4">
              <input type="hidden" name="setting" value="email-configuration" />
              <button className="rounded-md bg-stone-950 px-4 py-3 text-sm font-bold text-white">Record Review</button>
            </form>
          </SettingsPanel>

          <SettingsPanel title="Email Delivery" description="Recent queued, sent, failed, and retrying messages.">
            {recentEmails.length ? (
              <>
                {recentEmails.map((email) => (
                  <div key={email.id} className="border-b border-stone-100 py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-stone-950">{email.subject}</p>
                        <p className="break-all text-sm text-stone-600">{email.recipientEmail}</p>
                      </div>
                      <p className="text-xs font-bold uppercase text-stone-500">{email.status}</p>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      Attempts: {email.retryCount}{email.lastAttemptAt ? ` · last attempt ${formatDate(email.lastAttemptAt)}` : ""}{email.failureReason ? ` · ${email.failureReason}` : ""}
                    </p>
                  </div>
                ))}
                <Pagination currentPage={currentEmailPage} totalItems={queuedEmailCount} pageKey="emailsPage" searchParams={params} />
              </>
            ) : (
              <p className="text-sm text-stone-600">No outbound emails have been queued yet.</p>
            )}
          </SettingsPanel>

          <SettingsPanel title="Invalid Emails" description="Permanent delivery failures requiring account cleanup.">
            {invalidEmails.length ? (
              <>
                {invalidEmails.map((invalidEmail) => (
                  <div key={invalidEmail.id} className="border-b border-stone-100 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="break-all font-semibold text-stone-950">{invalidEmail.email}</p>
                        <p className="text-sm text-stone-600">{invalidEmail.user?.name ?? "No associated user"}</p>
                        <p className="text-xs text-stone-500">
                          {invalidEmail.failureReason} · failures: {invalidEmail.failureCount} · {formatDate(invalidEmail.lastFailureAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <form action={deleteInvalidEmailRecord.bind(null, invalidEmail.id)}>
                          <button className="rounded-md border border-stone-300 px-2 py-1 text-xs font-bold">Delete Record</button>
                        </form>
                        {invalidEmail.user && !isProtectedSuperAdmin(invalidEmail.user) ? (
                          <form action={deleteInvalidEmailUser.bind(null, invalidEmail.id)}>
                            <button className="rounded-md border border-red-300 px-2 py-1 text-xs font-bold text-red-700">Delete User</button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
                <Pagination currentPage={currentInvalidEmailPage} totalItems={invalidEmailCount} pageKey="invalidEmailsPage" searchParams={params} />
              </>
            ) : (
              <p className="text-sm text-stone-600">No invalid email addresses are recorded.</p>
            )}
          </SettingsPanel>

          <SettingsPanel title="Password" description="Change the active Super Admin password.">
            <SuperAdminPasswordForm />
          </SettingsPanel>

          <SettingsPanel title="Recent Admin Activity" description="Latest audited platform administration actions.">
            {recentAdminLogs.length ? (
              recentAdminLogs.map((log) => (
                <div key={log.id} className="border-b border-stone-100 py-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-stone-950">{log.action}</p>
                      <p className="break-all text-sm text-stone-600">
                        {log.actor.email}{log.target ? ` -> ${log.target.email}` : ""}
                      </p>
                    </div>
                    <p className="text-xs font-bold uppercase text-stone-500">{formatDate(log.createdAt)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-stone-600">No admin activity has been audited yet.</p>
            )}
          </SettingsPanel>

          <SettingsPanel title="Audit Trail" description="Latest audited settings review and password actions.">
            <div className="mt-3">
              {recentSettingsLogs.length ? recentSettingsLogs.map((log) => (
                <div key={log.id} className="border-b border-stone-100 py-3">
                  <p className="font-semibold text-stone-950">{log.action}</p>
                  <p className="text-sm text-stone-600">{log.actor.email} · {formatDate(log.createdAt)}</p>
                </div>
              )) : <p className="text-sm text-stone-600">No settings activity has been audited yet.</p>}
            </div>
          </SettingsPanel>
        </div>
      </section>
    </PageShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-stone-950">{value.toLocaleString()}</p>
    </div>
  );
}

function SettingsPanel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="border-b border-stone-100 pb-3">
        <h2 className="text-xl font-black text-stone-950">{title}</h2>
        <p className="mt-1 text-sm text-stone-600">{description}</p>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-stone-100 pb-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-bold uppercase text-stone-500">{label}</p>
      <p className="break-all font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function Pagination({
  currentPage,
  totalItems,
  pageKey,
  searchParams,
}: {
  currentPage: number;
  totalItems: number;
  pageKey: string;
  searchParams: SettingsSearchParams;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-stone-600">
        Showing {start}-{end} of {totalItems}
      </p>
      <div className="flex gap-2">
        <PaginationLink disabled={currentPage <= 1} href={pageHref(searchParams, pageKey, currentPage - 1)}>Previous</PaginationLink>
        <span className="inline-flex min-h-9 items-center rounded-md border border-stone-200 px-3 text-xs font-bold text-stone-600">
          Page {currentPage} of {totalPages}
        </span>
        <PaginationLink disabled={currentPage >= totalPages} href={pageHref(searchParams, pageKey, currentPage + 1)}>Next</PaginationLink>
      </div>
    </div>
  );
}

function PaginationLink({ disabled, href, children }: { disabled: boolean; href: string; children: React.ReactNode }) {
  if (disabled) {
    return (
      <span className="inline-flex min-h-9 items-center rounded-md border border-stone-200 px-3 text-xs font-bold text-stone-400">
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className="inline-flex min-h-9 items-center rounded-md border border-stone-300 px-3 text-xs font-bold text-stone-800">
      {children}
    </Link>
  );
}
