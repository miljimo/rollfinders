import Link from "next/link";
import type { Metadata } from "next";
import { Role, UserEmailStatus, UserStatus, type Prisma } from "@prisma/client";
import { Table, TableStatusBadge, type TableColumn } from "@/components/Table";
import { PageShell } from "@/components/shell";
import { academyScopedUserWhere, isAcademyAdminRole, isPlatformAdminRole, isProtectedSuperAdmin, isSuperAdminRole, requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import {
  deleteManagedUser,
  sendPasswordChangeEmail,
  toggleManagedUserDisabled,
  updateManagedUser,
} from "./actions";
import { CreateUserForm } from "./CreateUserForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | User Management",
  description: "Search, filter, edit, disable, delete, and send password-change emails to users.",
};

const supportedPageSizes = [20, 50, 100];
const academyAdminManageableRoles: Role[] = [Role.STANDARD_USER, Role.USER, Role.ACADEMY_ADMIN];

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

export default async function UserManagementPage({
  searchParams,
}: {
  searchParams: Promise<UserSearchParams>;
}) {
  const currentUser = await requireAdminPage();
  const superAdmin = isSuperAdminRole(currentUser?.role);
  const platformAdmin = isPlatformAdminRole(currentUser?.role);
  const academyAdmin = isAcademyAdminRole(currentUser?.role);
  const params = await searchParams;

  const page = parsePositiveInt(firstParam(params.page), 1);
  const pageSize = selectedPageSize(firstParam(params.pageSize));
  const search = (firstParam(params.search) ?? "").trim();
  const role = selectedRole(firstParam(params.role));
  const status = selectedStatus(firstParam(params.status));
  const emailStatus = selectedEmailStatus(firstParam(params.emailStatus));

  const scopeWhere = academyScopedUserWhere(currentUser);
  const filterWhere: Prisma.UserWhereInput = {
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
  };
  const where: Prisma.UserWhereInput = academyAdmin ? { AND: [scopeWhere, filterWhere] } : filterWhere;

  const [totalItems, totalUsers, activeUsers, disabledUsers, platformAdmins, academies] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({ where: scopeWhere }),
    prisma.user.count({ where: { ...scopeWhere, status: UserStatus.ACTIVE, disabled: false } }),
    prisma.user.count({ where: { ...scopeWhere, OR: [{ status: UserStatus.DISABLED }, { disabled: true }] } }),
    academyAdmin ? prisma.user.count({ where: { ...scopeWhere, role: Role.ACADEMY_ADMIN } }) : prisma.user.count({ where: { role: Role.PLATFORM_ADMIN } }),
    prisma.academy.findMany({
      where: academyAdmin ? { id: currentUser.academyId ?? "__missing_academy__" } : undefined,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const users = await prisma.user.findMany({
    where,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    orderBy: [{ createdAt: "desc" }, { email: "asc" }],
  });
  type UserRow = (typeof users)[number] & Record<string, unknown>;
  const columns: TableColumn<UserRow>[] = [
    {
      key: "user",
      title: "User / Edit",
      render: (_value, user) => {
        const protectedUser = isProtectedSuperAdmin(user);
        const canManage = superAdmin || (academyAdmin
          ? currentUser.id !== user.id && currentUser.academyId === user.academyId && academyAdminManageableRoles.includes(user.role)
          : platformAdmin && !protectedUser && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.PLATFORM_ADMIN);
        return canManage ? (
          <form action={updateManagedUser.bind(null, user.id)} className="grid min-w-72 gap-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="name" defaultValue={user.name ?? ""} placeholder="Name" className="min-h-9 rounded-md border border-stone-300 px-2 text-xs" />
              <input name="email" type="email" defaultValue={user.email} className="min-h-9 rounded-md border border-stone-300 px-2 text-xs" />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <select name="role" defaultValue={user.role} className="min-h-9 rounded-md border border-stone-300 px-2 text-xs">
                <option value={Role.STANDARD_USER}>Standard</option>
                <option value={Role.ACADEMY_ADMIN}>Academy admin</option>
                {superAdmin ? <option value={Role.PLATFORM_ADMIN}>Platform</option> : null}
              </select>
              <select name="status" defaultValue={user.status} className="min-h-9 rounded-md border border-stone-300 px-2 text-xs">
                <option value={UserStatus.ACTIVE}>Active</option>
                <option value={UserStatus.DISABLED}>Disabled</option>
              </select>
              {academyAdmin ? (
                <input type="hidden" name="academyId" value={currentUser.academyId ?? ""} />
              ) : (
                <select name="academyId" defaultValue={user.academyId ?? ""} className="min-h-9 rounded-md border border-stone-300 px-2 text-xs">
                  <option value="">No academy</option>
                  {academies.map((academy) => <option key={academy.id} value={academy.id}>{academy.name}</option>)}
                </select>
              )}
            </div>
            <button className="min-h-9 rounded-md border border-stone-300 px-2 py-1 text-xs font-bold text-stone-800">Save Changes</button>
          </form>
        ) : (
          <div>
            <p className="font-semibold text-stone-950">{user.name ?? user.email}</p>
            <p className="break-all text-stone-600">{user.email}</p>
            {protectedUser ? <p className="mt-1 text-xs font-bold uppercase text-teal-800">Protected</p> : null}
          </div>
        );
      },
    },
    {
      key: "role",
      title: "Role",
      render: (_value, user) => {
        return <TableStatusBadge status={user.role} />;
      },
    },
    {
      key: "status",
      title: "Status",
      render: (_value, user) => {
        return <TableStatusBadge status={user.status === UserStatus.DISABLED || user.disabled ? "Disabled" : "Active"} />;
      },
    },
    {
      key: "academy",
      title: "Academy",
      render: (_value, user) => {
        const academy = academies.find((item) => item.id === user.academyId);
        return academy?.name ?? "None";
      },
    },
    { key: "emailStatus", title: "Email Status", render: (value) => <TableStatusBadge status={String(value)} /> },
    { key: "lastLoginAt", title: "Last Login", className: "text-stone-600", render: (value) => value ? formatDate(value as Date) : "Never" },
    { key: "createdAt", title: "Created", className: "text-stone-600", render: (value) => formatDate(value as Date) },
    {
      key: "actions",
      title: "Actions",
      render: (_value, user) => {
        const protectedUser = isProtectedSuperAdmin(user);
        const canManage = superAdmin || (academyAdmin
          ? currentUser.id !== user.id && currentUser.academyId === user.academyId && academyAdminManageableRoles.includes(user.role)
          : platformAdmin && !protectedUser && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.PLATFORM_ADMIN);
        const canDelete = canManage && currentUser?.id !== user.id && !isSuperUserRole(user.role);
        return canManage ? (
          <div className="flex flex-wrap gap-2">
            <form action={toggleManagedUserDisabled.bind(null, user.id)}>
              <button className="rounded-md border border-stone-300 px-2 py-1 text-xs font-bold text-stone-800">{user.status === UserStatus.DISABLED || user.disabled ? "Enable" : "Disable"}</button>
            </form>
            <form action={sendPasswordChangeEmail.bind(null, user.id)}>
              <button className="rounded-md border border-teal-300 px-2 py-1 text-xs font-bold text-teal-800">Send Password Email</button>
            </form>
            {canDelete ? (
              <form action={deleteManagedUser.bind(null, user.id)}>
                <button className="rounded-md border border-red-300 px-2 py-1 text-xs font-bold text-red-700">Delete</button>
              </form>
            ) : null}
          </div>
        ) : (
          <span className="text-xs font-semibold text-stone-500">Read only</span>
        );
      },
    },
  ];

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-teal-800">User Management</p>
            <h1 className="mt-2 text-3xl font-black text-stone-950">Users</h1>
            <p className="mt-2 text-stone-700">{academyAdmin ? "Search, filter, create, edit, and disable users from your academy." : "Search, filter, edit, disable, delete, and send password-change emails."}</p>
          </div>
          <Link href="/admin" className="rounded-md border border-stone-300 px-4 py-3 text-sm font-bold text-stone-800">Dashboard</Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total Users" value={totalUsers} />
          <Metric label="Active Users" value={activeUsers} />
          <Metric label="Disabled Users" value={disabledUsers} />
          <Metric label={academyAdmin ? "Academy Admins" : "Platform Admins"} value={platformAdmins} />
        </div>

        {platformAdmin || academyAdmin ? <CreateUserForm academies={academies} academyAdmin={academyAdmin} superAdmin={superAdmin} /> : null}

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
              {!academyAdmin ? <option value={Role.PLATFORM_ADMIN}>Platform</option> : null}
              {!academyAdmin ? <option value={Role.SUPER_ADMIN}>Super admin</option> : null}
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

        <Table
          className="mt-6"
          columns={columns}
          data={users as UserRow[]}
          emptyMessage="No users match these filters."
          getRowId={(user) => user.id}
          minWidthClassName="min-w-[1120px]"
          pagination={{
            page: currentPage,
            totalPages,
            previousHref: compactParams(params, { page: currentPage - 1 }),
            nextHref: compactParams(params, { page: currentPage + 1 }),
          }}
        />
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
