import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@/components/shell";
import { academyScopedAcademyWhere, academyScopedEventWhere, academyScopedUserWhere, isAcademyAdminRole, isSuperAdminRole, requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

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
  const currentUser = await requireAdminPage();
  const isSuperAdmin = isSuperAdminRole(currentUser.role);
  const isAcademyAdmin = isAcademyAdminRole(currentUser.role);
  const params = await searchParams;
  const academyWhere = academyScopedAcademyWhere(currentUser);
  const eventWhere = { active: true, ...academyScopedEventWhere(currentUser) };
  const userWhere = academyScopedUserWhere(currentUser);

  const academyPage = pageFromParams(params, "academiesPage");
  const eventPage = pageFromParams(params, "eventsPage");

  const [
    academyCount,
    verifiedAcademyCount,
    pendingAcademyCount,
    featuredAcademyCount,
    eventCount,
    userCount,
  ] = await Promise.all([
    prisma.academy.count({ where: academyWhere }),
    prisma.academy.count({ where: { ...academyWhere, verificationStatus: "VERIFIED" } }),
    prisma.academy.count({ where: { ...academyWhere, verificationStatus: "PENDING" } }),
    prisma.academy.count({ where: { ...academyWhere, featured: true } }),
    prisma.event.count({ where: eventWhere }),
    prisma.user.count({ where: userWhere }),
  ]);

  const currentAcademyPage = clampPage(academyPage, academyCount);
  const currentEventPage = clampPage(eventPage, eventCount);

  const [
    adminProfile,
    academies,
    events,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: currentUser.id },
      include: {
        academy: true,
        academyMemberships: {
          include: { academy: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.academy.findMany({
      skip: (currentAcademyPage - 1) * pageSize,
      take: pageSize,
      where: academyWhere,
      orderBy: { name: "asc" },
    }),
    prisma.event.findMany({
      skip: (currentEventPage - 1) * pageSize,
      take: pageSize,
      where: eventWhere,
      include: { academy: true },
      orderBy: { eventDate: "asc" },
    }),
  ]);

  const academyName = adminProfile?.academy?.name ?? adminProfile?.academyMemberships[0]?.academy.name ?? "Not assigned";

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-stone-950">Admin Dashboard</h1>
            <p className="mt-2 text-stone-700">
              {isAcademyAdmin ? "Review your academy, open mats, and assigned users." : "Review platform health and manage operational records."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/academies" className="rounded-md bg-teal-700 px-4 py-3 text-center text-sm font-bold text-white">{isAcademyAdmin ? "Academy" : "Academies"}</Link>
            <Link href="/admin/open-mats" className="rounded-md bg-stone-950 px-4 py-3 text-center text-sm font-bold text-white">Open Mats</Link>
            <Link href="/admin/users" className="rounded-md border border-stone-300 px-4 py-3 text-center text-sm font-bold text-stone-800">Users</Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label={isAcademyAdmin ? "Managed Academy" : "Total Academies"} value={academyCount} />
          <Metric label="Verified Academies" value={verifiedAcademyCount} />
          <Metric label="Pending Verification" value={pendingAcademyCount} />
          <Metric label="Featured Academies" value={featuredAcademyCount} />
          <Metric label="Active Open Mats" value={eventCount} />
        </div>

        <div className={adminProfile ? "mt-6 grid gap-5 lg:grid-cols-[320px_1fr]" : "mt-6"}>
          {adminProfile ? (
            <AdminProfileCard
              academyName={academyName}
              email={adminProfile.email}
              name={adminProfile.name ?? adminProfile.email}
              registeredAt={adminProfile.createdAt}
              role={adminProfile.role}
            />
          ) : null}

          <div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ModuleCard
                title={isAcademyAdmin ? "Academy Profile" : "Academy Management"}
                description={isAcademyAdmin ? "View your assigned academy record." : "Search, filter, verify, feature, and edit academy records."}
                href="/admin/academies"
                action={isAcademyAdmin ? "View academy" : "Manage academies"}
              />
              <ModuleCard title="Open Mats" description="Search, filter, edit, and maintain open mat events." href="/admin/open-mats" action="Manage open mats" />
              <ModuleCard
                title={isSuperAdmin ? "Users & Roles" : "Users"}
                description={isAcademyAdmin ? "Search, create, edit, and disable users in your academy." : "Search, edit, disable, promote, delete, and send password emails."}
                href="/admin/users"
                action="Manage users"
              />
              {isSuperAdmin ? <ModuleCard title="Settings" description="Review platform-level configuration and audit settings changes." href="/admin/settings" action="Open settings" /> : null}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Metric label={isAcademyAdmin ? "Academy Users" : "Users"} value={userCount} />
              <Metric label={isAcademyAdmin ? "Managed Academy" : "Visible Academies"} value={academyCount} />
              <Metric label="Active Open Mats" value={eventCount} />
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <AdminPanel title={isAcademyAdmin ? "Academy" : "Academies"} description="Newest operational slice of academy records." id="academies">
                {academies.map((academy) => <Row key={academy.id} primary={academy.name} secondary={`${academy.borough ?? academy.city}, ${academy.postcode}${academy.verified ? " · verified" : ""}`} href={`/admin/academies/${academy.id}`} />)}
                <Pagination currentPage={currentAcademyPage} totalItems={academyCount} pageKey="academiesPage" searchParams={params} />
              </AdminPanel>

              <AdminPanel title="Open Mats" description="Active open mat events ordered by event date." id="open-mats">
                {events.map((event) => <Row key={event.id} primary={event.title} secondary={`${event.academy.name} · ${formatDate(event.eventDate)}`} href={`/admin/open-mats/${event.id}`} />)}
                <Pagination currentPage={currentEventPage} totalItems={eventCount} pageKey="eventsPage" searchParams={params} />
              </AdminPanel>
            </div>
          </div>
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

function ModuleCard({ title, description, href, action }: { title: string; description: string; href: string; action: string }) {
  return (
    <Link href={href} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition hover:border-teal-600">
      <p className="text-base font-black text-stone-950">{title}</p>
      <p className="mt-2 min-h-12 text-sm leading-6 text-stone-600">{description}</p>
      <p className="mt-4 text-sm font-bold text-teal-800">{action}</p>
    </Link>
  );
}

function AdminProfileCard({
  academyName,
  email,
  name,
  registeredAt,
  role,
}: {
  academyName: string;
  email: string;
  name: string;
  registeredAt: Date;
  role: string;
}) {
  return (
    <aside className="rounded-lg border border-stone-200 bg-white px-6 py-8 shadow-sm">
      <div className="flex min-w-0 flex-col items-center text-center">
        <div className="flex size-32 shrink-0 items-center justify-center rounded-full bg-teal-700 text-4xl font-black text-white" aria-hidden>
          {profileInitials(name)}
        </div>
        <h2 className="mt-8 max-w-full break-words text-2xl font-black text-stone-950">{name}</h2>
        <p className="mt-2 max-w-full break-all text-sm text-stone-600">{email}</p>
      </div>

      <div className="mx-auto mt-12 grid max-w-56 gap-9 text-center">
        <ProfileInfo label="Registered" value={formatDate(registeredAt)} />
        <ProfileInfo label="Academy" value={academyName} />
        <ProfileInfo label="Role" value={displayRole(role)} />
      </div>

      <Link href="/dashboard/password" className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-bold text-white">
        Change Password
      </Link>
    </aside>
  );
}

function profileInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return value.trim().slice(0, 2).toUpperCase() || "AD";
}

function displayRole(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ProfileInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-stone-300 pt-4">
      <p className="text-xs font-bold uppercase text-stone-500">{label}</p>
      <p className="mt-2 break-words text-base font-black text-stone-950">{value}</p>
    </div>
  );
}

function AdminPanel({ title, description, children, id }: { title: string; description: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1 border-b border-stone-100 pb-3">
        <h2 className="text-xl font-black text-stone-950">{title}</h2>
        <p className="text-sm text-stone-600">{description}</p>
      </div>
      <div className="mt-3">{children}</div>
    </section>
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
