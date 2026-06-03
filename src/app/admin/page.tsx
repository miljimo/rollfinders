import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { PageShell } from "@/components/shell";
import { getCurrentUser, isPlatformAdminRole, isProtectedSuperAdmin, isSuperAdminRole } from "@/lib/admin";
import { getEmailProvisioningConfig } from "@/lib/email-provisioning";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { createUser, deleteInvalidEmailRecord, deleteInvalidEmailUser, toggleUserDisabled, updateUserRole } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Admin Dashboard",
  description: "Manage RollFinders academies, open mats, users, email delivery, and platform operations.",
};

const pageSize = 8;

type AdminSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageFromParams(searchParams: AdminSearchParams, key: string) {
  const value = Number(firstParam(searchParams[key]) ?? "1");
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function clampPage(page: number, totalItems: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return Math.min(page, totalPages);
}

function pageHref(searchParams: AdminSearchParams, key: string, page: number) {
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
  return query ? `/admin?${query}` : "/admin";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  if (!isPlatformAdminRole(currentUser.role)) redirect("/login");
  const isSuperAdmin = isSuperAdminRole(currentUser.role);
  const emailConfig = getEmailProvisioningConfig();
  const params = await searchParams;

  const academyPage = pageFromParams(params, "academiesPage");
  const eventPage = pageFromParams(params, "eventsPage");
  const userPage = pageFromParams(params, "usersPage");
  const emailPage = pageFromParams(params, "emailsPage");
  const invalidEmailPage = pageFromParams(params, "invalidEmailsPage");

  const [academyCount, verifiedAcademyCount, pendingAcademyCount, featuredAcademyCount, eventCount, userCount, queuedEmailCount, invalidEmailCount] = await Promise.all([
    prisma.academy.count(),
    prisma.academy.count({ where: { verificationStatus: "VERIFIED" } }),
    prisma.academy.count({ where: { verificationStatus: "PENDING" } }),
    prisma.academy.count({ where: { featured: true } }),
    prisma.event.count({ where: { active: true } }),
    prisma.user.count(),
    prisma.outboundEmail.count(),
    isSuperAdmin ? prisma.invalidEmailAddress.count() : Promise.resolve(0),
  ]);

  const currentAcademyPage = clampPage(academyPage, academyCount);
  const currentEventPage = clampPage(eventPage, eventCount);
  const currentUserPage = clampPage(userPage, userCount);
  const currentEmailPage = clampPage(emailPage, queuedEmailCount);
  const currentInvalidEmailPage = clampPage(invalidEmailPage, invalidEmailCount);

  const [
    academies,
    events,
    users,
    recentEmails,
    invalidEmails,
  ] = await Promise.all([
    prisma.academy.findMany({
      skip: (currentAcademyPage - 1) * pageSize,
      take: pageSize,
      orderBy: { name: "asc" },
    }),
    prisma.event.findMany({
      skip: (currentEventPage - 1) * pageSize,
      take: pageSize,
      where: { active: true },
      include: { academy: true },
      orderBy: { eventDate: "asc" },
    }),
    prisma.user.findMany({
      skip: (currentUserPage - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.outboundEmail.findMany({
      skip: (currentEmailPage - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    isSuperAdmin
      ? prisma.invalidEmailAddress.findMany({
          skip: (currentInvalidEmailPage - 1) * pageSize,
          take: pageSize,
          include: { user: true },
          orderBy: { lastFailureAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-stone-950">Admin Dashboard</h1>
            <p className="mt-2 text-stone-700">Review platform health and manage operational records.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/academies/new" className="rounded-md bg-teal-700 px-4 py-3 text-center text-sm font-bold text-white">New Academy</Link>
            <Link href="/admin/open-mats/new" className="rounded-md bg-stone-950 px-4 py-3 text-center text-sm font-bold text-white">New Open Mat</Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Total Academies" value={academyCount} />
          <Metric label="Verified Academies" value={verifiedAcademyCount} />
          <Metric label="Pending Verification" value={pendingAcademyCount} />
          <Metric label="Featured Academies" value={featuredAcademyCount} />
          <Metric label="Active Open Mats" value={eventCount} />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <AdminPanel title="Academy Management" description="Dedicated module for academy search, filtering, pagination, and editing.">
            <div className="grid gap-3 text-sm">
              <ConfigRow label="Total academies" value={academyCount.toLocaleString()} />
              <ConfigRow label="Verified" value={verifiedAcademyCount.toLocaleString()} />
              <ConfigRow label="Pending verification" value={pendingAcademyCount.toLocaleString()} />
              <ConfigRow label="Featured" value={featuredAcademyCount.toLocaleString()} />
              <Link href="/admin/academies" className="inline-flex min-h-11 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-bold text-white">
                Open Academy Management
              </Link>
            </div>
          </AdminPanel>

          <AdminPanel title="Email Provisioning" description="Backend configuration for transactional email.">
            <div className="grid gap-3 text-sm">
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
          </AdminPanel>

          <AdminPanel title="Email Delivery" description="Recent queued, sent, failed, and retrying messages.">
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
          </AdminPanel>

          {isSuperAdmin ? (
            <AdminPanel title="Invalid Emails" description="Permanent delivery failures requiring account cleanup.">
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
            </AdminPanel>
          ) : null}

          <AdminPanel title="Academies" description="Newest operational slice of academy records.">
            {academies.map((academy) => <Row key={academy.id} primary={academy.name} secondary={`${academy.borough ?? academy.city}, ${academy.postcode}${academy.verified ? " · verified" : ""}`} href={`/admin/academies/${academy.id}`} />)}
            <Pagination currentPage={currentAcademyPage} totalItems={academyCount} pageKey="academiesPage" searchParams={params} />
          </AdminPanel>

          <AdminPanel title="Open Mats" description="Active open mat events ordered by event date.">
            {events.map((event) => <Row key={event.id} primary={event.title} secondary={`${event.academy.name} · ${formatDate(event.eventDate)}`} href={`/admin/open-mats/${event.id}`} />)}
            <Pagination currentPage={currentEventPage} totalItems={eventCount} pageKey="eventsPage" searchParams={params} />
          </AdminPanel>

          <AdminPanel title="Users" description="Recent users with account controls for super admins.">
            {isSuperAdmin ? (
              <form action={createUser} className="mb-4 grid gap-2 rounded-md border border-stone-200 bg-stone-50 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input name="name" placeholder="Name" className="min-h-10 rounded-md border border-stone-300 px-3 text-sm" />
                  <input name="email" type="email" required placeholder="Email" className="min-h-10 rounded-md border border-stone-300 px-3 text-sm" />
                  <input name="password" type="password" placeholder="Temporary password" className="min-h-10 rounded-md border border-stone-300 px-3 text-sm" />
                  <select name="role" defaultValue={Role.STANDARD_USER} className="min-h-10 rounded-md border border-stone-300 px-3 text-sm">
                    <option value={Role.STANDARD_USER}>Standard user</option>
                    <option value={Role.PLATFORM_ADMIN}>Platform admin</option>
                  </select>
                </div>
                <button className="min-h-10 rounded-md bg-stone-950 px-3 text-sm font-bold text-white">Create User</button>
              </form>
            ) : null}
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-2 border-b border-stone-100 py-3">
                <div>
                  <p className="font-semibold text-stone-950">{user.name ?? user.email}</p>
                  <p className="break-all text-sm text-stone-600">{user.email}</p>
                  <p className="text-xs font-semibold text-stone-500">
                    {user.role}{user.status === "DISABLED" || user.disabled ? " · disabled" : ""}{isProtectedSuperAdmin(user) ? " · protected" : ""}
                    {user.emailStatus === "INVALID" ? " · invalid email" : ""}
                    {user.lastLoginAt ? ` · last login ${formatDate(user.lastLoginAt)}` : ""}
                  </p>
                </div>
                {isSuperAdmin && !isProtectedSuperAdmin(user) ? (
                  <div className="flex flex-col gap-2">
                    <form action={updateUserRole.bind(null, user.id)} className="flex gap-1">
                      <select name="role" defaultValue={user.role} className="rounded-md border border-stone-300 px-2 py-1 text-xs">
                        <option value={Role.STANDARD_USER}>Standard</option>
                        <option value={Role.PLATFORM_ADMIN}>Platform</option>
                      </select>
                      <button className="rounded-md border border-stone-300 px-2 py-1 text-xs font-bold">Save</button>
                    </form>
                    <form action={toggleUserDisabled.bind(null, user.id)}>
                      <button className="rounded-md border border-stone-300 px-2 py-1 text-xs font-bold">
                        {user.status === "DISABLED" || user.disabled ? "Enable" : "Disable"}
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))}
            <Pagination currentPage={currentUserPage} totalItems={userCount} pageKey="usersPage" searchParams={params} />
          </AdminPanel>
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

function AdminPanel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1 border-b border-stone-100 pb-3">
        <h2 className="text-xl font-black text-stone-950">{title}</h2>
        <p className="text-sm text-stone-600">{description}</p>
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

function Row({ primary, secondary, href }: { primary: string; secondary: string; href: string }) {
  return <Link href={href} className="block border-b border-stone-100 py-3"><p className="font-semibold text-stone-950">{primary}</p><p className="text-sm text-stone-600">{secondary}</p></Link>;
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
  searchParams: AdminSearchParams;
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
