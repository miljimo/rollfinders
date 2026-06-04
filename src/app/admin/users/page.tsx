import Link from "next/link";
import type { Metadata } from "next";
import { Role, UserEmailStatus, UserStatus, type Prisma } from "@prisma/client";
import { PageShell } from "@/components/shell";
import { getCurrentUser, isPlatformAdminRole, isProtectedSuperAdmin, isSuperAdminRole, requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import {
  deleteManagedUser,
  toggleManagedUserDisabled,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | User Management",
  description: "Search, filter, edit, disable, delete, and send password-change emails to users.",
};

const supportedPageSizes = [20, 50, 100];

type UserSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function selectedPageSize(value: string | undefined) {
  const parsed = parsePositiveInt(value, 20);
  return supportedPageSizes.includes(parsed) ? parsed : 20;
}

function selectedRole(value: string | undefined) {
  if (!value || value === "all") return "all";
  return Object.values(Role).includes(value as Role) ? value : "all";
}

function selectedStatus(value: string | undefined) {
  if (!value || value === "all") return "all";
  return Object.values(UserStatus).includes(value as UserStatus) ? value : "all";
}

function selectedEmailStatus(value: string | undefined) {
  if (!value || value === "all") return "all";
  return Object.values(UserEmailStatus).includes(value as UserEmailStatus) ? value : "all";
}

function selectedAcademy(value: string | undefined, academyIds: Set<string>) {
  if (!value || value === "all") return "all";
  return academyIds.has(value) ? value : "all";
}

function isSuperUserRole(role: Role) {
  return role === Role.SUPER_ADMIN || role === Role.ADMIN;
}

function compactParams(params: UserSearchParams, overrides: Record<string, string | number | undefined>) {
  const next = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => item && next.append(key, item));
      return;
    }
    next.set(key, value);
  });
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === "all" || value === 1) {
      next.delete(key);
      return;
    }
    next.set(key, String(value));
  });
  const query = next.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

function paginationPages(currentPage: number, totalPages: number) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);
}

export default async function UserManagementPage({
  searchParams,
}: {
  searchParams: Promise<UserSearchParams>;
}) {
  await requireAdminPage();
  const currentUser = await getCurrentUser();
  const superAdmin = isSuperAdminRole(currentUser?.role);
  const platformAdmin = isPlatformAdminRole(currentUser?.role);
  const params = await searchParams;

  const page = parsePositiveInt(firstParam(params.page), 1);
  const pageSize = selectedPageSize(firstParam(params.pageSize));
  const search = (firstParam(params.search) ?? "").trim();
  const role = selectedRole(firstParam(params.role));
  const status = selectedStatus(firstParam(params.status));
  const emailStatus = selectedEmailStatus(firstParam(params.emailStatus));
  const academies = await prisma.academy.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const academy = selectedAcademy(firstParam(params.academy), new Set(academies.map((item) => item.id)));

  const where: Prisma.UserWhereInput = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(role !== "all" ? { role: role as Role } : {}),
    ...(status !== "all" ? { status: status as UserStatus } : {}),
    ...(emailStatus !== "all" ? { emailStatus: emailStatus as UserEmailStatus } : {}),
    ...(academy !== "all" ? { academyId: academy } : {}),
  };

  const [totalItems, totalUsers, activeUsers, disabledUsers, platformAdmins] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count(),
    prisma.user.count({ where: { status: UserStatus.ACTIVE, disabled: false } }),
    prisma.user.count({ where: { OR: [{ status: UserStatus.DISABLED }, { disabled: true }] } }),
    prisma.user.count({ where: { role: Role.PLATFORM_ADMIN } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const users = await prisma.user.findMany({
    where,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    orderBy: [{ createdAt: "desc" }, { email: "asc" }],
  });
  const academyNames = new Map(academies.map((item) => [item.id, item.name]));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-teal-800">User Management</p>
            <h1 className="mt-2 text-3xl font-black text-stone-950">Users</h1>
            <p className="mt-2 text-stone-700">Search, filter, edit, disable, delete, and send password-change emails.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {platformAdmin ? <Link href="/admin/users/new" className="rounded-md bg-teal-700 px-4 py-3 text-sm font-bold text-white">New User</Link> : null}
            <Link href="/admin" className="rounded-md border border-stone-300 px-4 py-3 text-sm font-bold text-stone-800">Dashboard</Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total Users" value={totalUsers} />
          <Metric label="Active Users" value={activeUsers} />
          <Metric label="Disabled Users" value={disabledUsers} />
          <Metric label="Platform Admins" value={platformAdmins} />
        </div>

        <form action="/admin/users" className="mt-6 grid min-w-0 gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-12">
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 sm:col-span-2 lg:col-span-4">
            Search
            <input name="search" placeholder="Search user by name or email..." defaultValue={search} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal" />
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 lg:col-span-2">
            Role
            <select name="role" defaultValue={role} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal">
              <option value="all">All</option>
              <option value={Role.STANDARD_USER}>Standard</option>
              <option value={Role.ACADEMY_ADMIN}>Academy admin</option>
              <option value={Role.PLATFORM_ADMIN}>Platform</option>
              <option value={Role.SUPER_ADMIN}>Super admin</option>
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 lg:col-span-2">
            Status
            <select name="status" defaultValue={status} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal">
              <option value="all">All</option>
              <option value={UserStatus.ACTIVE}>Active</option>
              <option value={UserStatus.DISABLED}>Disabled</option>
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 lg:col-span-2">
            Email status
            <select name="emailStatus" defaultValue={emailStatus} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal">
              <option value="all">All</option>
              <option value={UserEmailStatus.VALID}>Valid</option>
              <option value={UserEmailStatus.INVALID}>Invalid</option>
              <option value={UserEmailStatus.PENDING_VERIFICATION}>Pending</option>
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 lg:col-span-2">
            Academy
            <select name="academy" defaultValue={academy} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal">
              <option value="all">All</option>
              {academies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold text-stone-800 lg:col-span-2">
            Page size
            <select name="pageSize" defaultValue={pageSize} className="min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm font-normal">
              {supportedPageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <div className="flex min-w-0 items-end gap-2 sm:col-span-2 lg:col-span-10">
            <button className="min-h-11 rounded-md bg-stone-950 px-4 text-sm font-bold text-white">Apply Filters</button>
            <Link href="/admin/users" className="inline-flex min-h-11 items-center rounded-md border border-stone-300 px-4 text-sm font-bold text-stone-800">Reset</Link>
          </div>
        </form>

        <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
              <thead className="bg-stone-50 text-xs font-bold uppercase text-stone-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Academy</th>
                  <th className="px-4 py-3">Email Status</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const protectedUser = isProtectedSuperAdmin(user);
                  const canManage = superAdmin || (platformAdmin && !protectedUser && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.PLATFORM_ADMIN);
                  const superUserTarget = isSuperUserRole(user.role);
                  const canDelete = canManage && currentUser?.id !== user.id && !superUserTarget;
                  return (
                    <tr key={user.id} className="border-t border-stone-100">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-stone-950">{user.name ?? user.email}</p>
                        <p className="break-all text-stone-600">{user.email}</p>
                        {protectedUser ? <p className="mt-1 text-xs font-bold uppercase text-teal-800">Protected</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{user.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{user.status === UserStatus.DISABLED || user.disabled ? "Disabled" : "Active"}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {user.academyId ? academyNames.get(user.academyId) ?? "Unknown academy" : "None"}
                      </td>
                      <td className="px-4 py-3"><Badge>{user.emailStatus}</Badge></td>
                      <td className="px-4 py-3 text-stone-600">{user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}</td>
                      <td className="px-4 py-3 text-stone-600">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/admin/users/${user.id}`} className="rounded-md border border-stone-300 px-2 py-1 text-xs font-bold text-stone-800">Edit</Link>
                            <form action={toggleManagedUserDisabled.bind(null, user.id)}>
                              <button className="rounded-md border border-stone-300 px-2 py-1 text-xs font-bold text-stone-800">{user.status === UserStatus.DISABLED || user.disabled ? "Enable" : "Disable"}</button>
                            </form>
                            {canDelete ? (
                              <form action={deleteManagedUser.bind(null, user.id)}>
                                <button className="rounded-md border border-red-300 px-2 py-1 text-xs font-bold text-red-700">Delete</button>
                              </form>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-stone-500">Read only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!users.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-stone-600">No users match these filters.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-stone-100 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-stone-600">Showing {start}-{end} of {totalItems}</p>
            <div className="flex flex-wrap gap-2">
              <PageLink disabled={currentPage <= 1} href={compactParams(params, { page: currentPage - 1 })}>Previous</PageLink>
              {paginationPages(currentPage, totalPages).map((pageNumber) => (
                <PageLink key={pageNumber} active={pageNumber === currentPage} href={compactParams(params, { page: pageNumber })}>{pageNumber}</PageLink>
              ))}
              <PageLink disabled={currentPage >= totalPages} href={compactParams(params, { page: currentPage + 1 })}>Next</PageLink>
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

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-md border border-stone-200 px-2 py-1 text-xs font-bold text-stone-700">{children}</span>;
}

function PageLink({ href, disabled, active, children }: { href: string; disabled?: boolean; active?: boolean; children: React.ReactNode }) {
  if (disabled) {
    return <span className="inline-flex min-h-9 items-center rounded-md border border-stone-200 px-3 text-xs font-bold text-stone-400">{children}</span>;
  }
  return (
    <Link href={href} className={`inline-flex min-h-9 items-center rounded-md border px-3 text-xs font-bold ${active ? "border-teal-700 bg-teal-700 text-white" : "border-stone-300 text-stone-800"}`}>
      {children}
    </Link>
  );
}
