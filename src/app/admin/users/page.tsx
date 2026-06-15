import Link from "next/link";
import type { Metadata } from "next";
import { Role, UserEmailStatus, UserStatus, type Prisma } from "@prisma/client";
import { Ban, ChevronLeft, ChevronRight, Edit3, Filter, KeyRound, MoreVertical, Search, Shield, Trash2, User, Users } from "lucide-react";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/PageShell";
import { TableRow } from "@/components/Table";
import { canSendManagedUserPasswordReset, elevatedAdminPrivacyUserWhere, getCurrentUser, isPlatformAdminRole, isProtectedSuperAdmin, isSuperAdminRole, requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import {
  deleteManagedUser,
  sendPasswordChangeEmail,
  toggleManagedUserDisabled,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | User Management",
  description: "Search, filter, edit, disable, delete, and manage users.",
};

const supportedPageSizes = [10, 20, 50, 100];

type UserSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function selectedPageSize(value: string | undefined) {
  const parsed = parsePositiveInt(value, 10);
  return supportedPageSizes.includes(parsed) ? parsed : 10;
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

function roleLabel(role: Role) {
  return role.replaceAll("_", " ");
}

function initialsFor(name: string | null, email: string) {
  const source = name || email.split("@")[0] || "User";
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
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

function UserResult({ params }: { params: UserSearchParams }) {
  const result = firstParam(params.userResult);
  if (!result) return null;
  const email = firstParam(params.email);
  const success = result === "password_reset_sent";
  const message = result === "duplicate_email"
    ? `A user with ${email ?? "that email address"} already exists.`
    : result === "password_reset_sent"
      ? `Password reset email sent${email ? ` to ${email}` : ""}.`
      : result === "password_reset_failed"
        ? `Password reset email could not be sent${email ? ` to ${email}` : ""}.`
        : null;
  if (!message) return null;
  return (
    <div className={`mt-4 rounded-md border px-4 py-3 text-sm font-semibold ${success ? "border-teal-100 bg-teal-50 text-teal-900" : "border-red-100 bg-red-50 text-red-800"}`}>
      {message}
    </div>
  );
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

  const filterWhere: Prisma.UserWhereInput = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { academy: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(role !== "all" ? { role: role as Role } : {}),
    ...(status !== "all" ? { status: status as UserStatus } : {}),
    ...(emailStatus !== "all" ? { emailStatus: emailStatus as UserEmailStatus } : {}),
    ...(academy !== "all" ? { academyId: academy } : {}),
  };
  const where: Prisma.UserWhereInput = {
    AND: [elevatedAdminPrivacyUserWhere({ role: currentUser?.role }), filterWhere],
  };

  const totalItems = await prisma.user.count({ where });
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
  const allUsersHref = compactParams(params, { role: undefined, status: undefined, page: 1 });
  const activeHref = compactParams(params, { role: undefined, status: UserStatus.ACTIVE, page: 1 });
  const disabledHref = compactParams(params, { role: undefined, status: UserStatus.DISABLED, page: 1 });
  const academyAdminHref = compactParams(params, { role: Role.ACADEMY_ADMIN, status: undefined, page: 1 });
  const standardHref = compactParams(params, { role: Role.STANDARD_USER, status: undefined, page: 1 });

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-black text-slate-950">Users &amp; Roles</h1>
                <p className="mt-2 text-base text-slate-500">Manage users, roles and academy access.</p>
              </div>
            </div>

            <form action="/admin/users" className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
              <label className="relative block">
                <span className="sr-only">Search users</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={22} aria-hidden="true" />
                <input name="search" placeholder="Search users by name, email or academy..." defaultValue={search} className="min-h-12 w-full rounded-md border border-slate-200 bg-white px-12 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100" />
              </label>
              <details className="group relative">
                <summary className="inline-flex min-h-12 cursor-pointer list-none items-center justify-center gap-3 rounded-md border border-slate-200 bg-white px-6 text-base font-bold text-teal-700 shadow-sm transition hover:border-teal-600 hover:bg-teal-50 [&::-webkit-details-marker]:hidden">
                  <Filter size={22} aria-hidden="true" />
                  Filters
                </summary>
                <div className="absolute right-0 z-30 mt-2 grid w-[min(28rem,calc(100vw-2rem))] gap-4 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-xl sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">
                    Role
                    <select name="role" defaultValue={role} className="min-h-11 rounded-md border border-slate-200 px-3 font-normal text-slate-800">
                      <option value="all">All</option>
                      <option value={Role.STANDARD_USER}>Standard user</option>
                      <option value={Role.ACADEMY_ADMIN}>Academy admin</option>
                      {superAdmin ? <option value={Role.PLATFORM_ADMIN}>Platform admin</option> : null}
                      {superAdmin ? <option value={Role.SUPER_ADMIN}>Super admin</option> : null}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">
                    Status
                    <select name="status" defaultValue={status} className="min-h-11 rounded-md border border-slate-200 px-3 font-normal text-slate-800">
                      <option value="all">All</option>
                      <option value={UserStatus.ACTIVE}>Active</option>
                      <option value={UserStatus.DISABLED}>Disabled</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">
                    Email status
                    <select name="emailStatus" defaultValue={emailStatus} className="min-h-11 rounded-md border border-slate-200 px-3 font-normal text-slate-800">
                      <option value="all">All</option>
                      <option value={UserEmailStatus.VALID}>Valid</option>
                      <option value={UserEmailStatus.INVALID}>Invalid</option>
                      <option value={UserEmailStatus.PENDING_VERIFICATION}>Pending</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">
                    Academy
                    <select name="academy" defaultValue={academy} className="min-h-11 rounded-md border border-slate-200 px-3 font-normal text-slate-800">
                      <option value="all">All</option>
                      {academies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">
                    Rows
                    <select name="pageSize" defaultValue={pageSize} className="min-h-11 rounded-md border border-slate-200 px-3 font-normal text-slate-800">
                      {supportedPageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </label>
                  <div className="flex items-end gap-2">
                    <Button type="submit" variant="primary">Apply</Button>
                    <Button href="/admin/users" variant="secondary" className="border-slate-200 text-slate-700">Reset</Button>
                  </div>
                </div>
              </details>
            </form>

            <div className="mt-5 flex flex-wrap gap-3">
              <FilterPill href={allUsersHref} active={role === "all" && status === "all"} icon={<Users size={20} aria-hidden="true" />}>All Users</FilterPill>
              <FilterPill href={activeHref} active={status === UserStatus.ACTIVE} dotClassName="bg-emerald-500">Active</FilterPill>
              <FilterPill href={disabledHref} active={status === UserStatus.DISABLED} dotClassName="bg-red-500">Disabled</FilterPill>
              <FilterPill href={academyAdminHref} active={role === Role.ACADEMY_ADMIN} icon={<Shield size={20} aria-hidden="true" />}>Academy Admin</FilterPill>
              <FilterPill href={standardHref} active={role === Role.STANDARD_USER} icon={<User size={20} aria-hidden="true" />}>Standard User</FilterPill>
            </div>
            <UserResult params={params} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Academy</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Last Login</th>
                  <th className="px-5 py-4">Created</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const protectedUser = isProtectedSuperAdmin(user);
                  const canManage = superAdmin || (platformAdmin && !protectedUser && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.PLATFORM_ADMIN);
                  const canSendPasswordReset = currentUser ? canSendManagedUserPasswordReset(currentUser, user) : false;
                  const superUserTarget = isSuperUserRole(user.role);
                  const canDelete = canManage && currentUser?.id !== user.id && !superUserTarget;
                  const disabled = user.status === UserStatus.DISABLED || user.disabled;
                  const userHref = `/admin/users/${user.id}`;
                  return (
                    <TableRow key={user.id} href={userHref}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-4">
                          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-teal-50 text-base font-black text-teal-800 ring-1 ring-teal-100">
                            {initialsFor(user.name, user.email)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-950">{user.name ?? user.email}</p>
                            <p className="break-all text-slate-500">{user.email}</p>
                          </div>
                        </div>
                        {protectedUser ? <p className="mt-2 text-xs font-bold uppercase text-teal-800">Protected</p> : null}
                      </td>
                      <td className="px-5 py-4">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {user.academyId ? academyNames.get(user.academyId) ?? "Unknown academy" : "None"}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge disabled={disabled} />
                      </td>
                      <td className="px-5 py-4 text-slate-600">{user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}</td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(user.createdAt)}</td>
                      <td className="px-5 py-4 text-right">
                        {canManage ? (
                          <details className="group relative inline-block text-left">
                            <summary className="inline-flex size-10 cursor-pointer list-none items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                              <MoreVertical size={22} aria-hidden="true" />
                              <span className="sr-only">Open actions for {user.name ?? user.email}</span>
                            </summary>
                            <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 text-left shadow-xl">
                              <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                <User size={18} aria-hidden="true" />
                                View Profile
                              </Link>
                              <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                <Edit3 size={18} aria-hidden="true" />
                                Edit User
                              </Link>
                              {canSendPasswordReset ? (
                                <form action={sendPasswordChangeEmail.bind(null, user.id)}>
                                  <input type="hidden" name="returnTo" value={compactParams(params, {})} />
                                  <button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                    <KeyRound size={18} aria-hidden="true" />
                                    Send Password Reset
                                  </button>
                                </form>
                              ) : null}
                              <form action={toggleManagedUserDisabled.bind(null, user.id)}>
                                <button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
                                  <Ban size={18} aria-hidden="true" />
                                  {disabled ? "Enable Account" : "Disable Account"}
                                </button>
                              </form>
                              {canDelete ? (
                                <form action={deleteManagedUser.bind(null, user.id)}>
                                  <button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
                                    <Trash2 size={18} aria-hidden="true" />
                                    Delete User
                                  </button>
                                </form>
                              ) : null}
                            </div>
                          </details>
                        ) : (
                          <span className="text-xs font-semibold text-stone-500">Read only</span>
                        )}
                      </td>
                    </TableRow>
                  );
                })}
                {!users.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-stone-600">No users match these filters.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-stone-100 px-5 py-5 text-sm lg:flex-row lg:items-center lg:justify-between">
            <p className="text-base text-slate-700">Showing {start} to {end} of {totalItems} users</p>
            <div className="flex flex-wrap items-center gap-3">
              <form action="/admin/users" className="flex min-h-11 items-center rounded-md border border-slate-200 bg-white">
                <span className="px-4 text-sm font-semibold text-slate-600">Rows per page</span>
                <select name="pageSize" defaultValue={pageSize} className="min-h-11 rounded-r-md border-l border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none">
                  {supportedPageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
                <input type="hidden" name="search" value={search} />
                <input type="hidden" name="role" value={role} />
                <input type="hidden" name="status" value={status} />
                <input type="hidden" name="emailStatus" value={emailStatus} />
                <input type="hidden" name="academy" value={academy} />
              </form>
              <PageLink disabled={currentPage <= 1} href={compactParams(params, { page: currentPage - 1 })} iconOnly>
                <ChevronLeft size={20} aria-hidden="true" />
                <span className="sr-only">Previous</span>
              </PageLink>
              {paginationPages(currentPage, totalPages).map((pageNumber) => (
                <PageLink key={pageNumber} active={pageNumber === currentPage} href={compactParams(params, { page: pageNumber })}>{pageNumber}</PageLink>
              ))}
              <PageLink disabled={currentPage >= totalPages} href={compactParams(params, { page: currentPage + 1 })} iconOnly>
                <ChevronRight size={20} aria-hidden="true" />
                <span className="sr-only">Next</span>
              </PageLink>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function FilterPill({ href, active, icon, dotClassName, children }: { href: string; active?: boolean; icon?: React.ReactNode; dotClassName?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`inline-flex min-h-11 items-center gap-3 rounded-md border px-4 text-base font-bold transition ${active ? "border-teal-700 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50"}`}>
      {icon}
      {dotClassName ? <span className={`size-2.5 rounded-full ${dotClassName}`} aria-hidden="true" /> : null}
      {children}
    </Link>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const className =
    role === Role.PLATFORM_ADMIN || role === Role.SUPER_ADMIN || role === Role.ADMIN
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : role === Role.ACADEMY_ADMIN
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-sky-200 bg-sky-50 text-sky-700";

  return <span className={`inline-flex rounded-md border px-3 py-1 text-xs font-black uppercase ${className}`}>{roleLabel(role)}</span>;
}

function StatusBadge({ disabled }: { disabled: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${disabled ? "bg-red-50 text-red-700 ring-1 ring-red-100" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"}`}>
      <span className={`size-2.5 rounded-full ${disabled ? "bg-red-500" : "bg-emerald-500"}`} aria-hidden="true" />
      {disabled ? "Disabled" : "Active"}
    </span>
  );
}

function PageLink({ href, disabled, active, iconOnly, children }: { href: string; disabled?: boolean; active?: boolean; iconOnly?: boolean; children: React.ReactNode }) {
  if (disabled) {
    return <span className={`inline-flex min-h-11 items-center justify-center rounded-md border border-stone-200 text-sm font-bold text-stone-400 ${iconOnly ? "w-11 px-0" : "px-4"}`}>{children}</span>;
  }
  return (
    <Button href={href} size={iconOnly ? "icon" : "md"} variant={active ? "primary" : "secondary"} className={`${iconOnly ? "w-11 px-0" : "px-4"} ${active ? "shadow-sm" : "hover:bg-stone-50"}`} aria-label={iconOnly ? "Go to page" : undefined}>
      {children}
    </Button>
  );
}
