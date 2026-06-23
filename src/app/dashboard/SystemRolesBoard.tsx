"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from "lucide-react";
import { TablePagination } from "@/components/Table";
import type { AuthorisationPermission, AuthorisationRole } from "@/lib/authorisation-service";

const pageSize = 10;
const rolePermissionPageSize = 7;

function roleSearchText(role: AuthorisationRole) {
  return `${role.id} ${role.key} ${role.name} ${role.description ?? ""} ${role.level} ${role.assignable ? "assignable" : "not assignable"} ${role.system_role ? "system" : ""}`.toLowerCase();
}

function formatRoleDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(date);
}

export function SystemRolesBoard({
  rolePermissions,
  roles,
}: {
  rolePermissions: { roleId: string; permissions: AuthorisationPermission[] }[];
  roles: AuthorisationRole[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rolePermissionPage, setRolePermissionPage] = useState(1);
  const [selectedRole, setSelectedRole] = useState<AuthorisationRole | null>(null);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRoles = useMemo(() => {
    if (!normalizedSearch) return roles;
    return roles.filter((role) => roleSearchText(role).includes(normalizedSearch));
  }, [normalizedSearch, roles]);
  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRoles = filteredRoles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function permissionsForRole(roleId: string) {
    return rolePermissions.find((item) => item.roleId === roleId)?.permissions ?? [];
  }

  function openRole(role: AuthorisationRole) {
    setSelectedRole(role);
    setRolePermissionPage(1);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <div className="border-b border-stone-100 px-5 py-4">
        <h3 className="text-lg font-black text-stone-950">System Roles</h3>
        <p className="mt-1 text-sm text-stone-600">These are the role bundles configured in the Authorisation service.</p>
        <label className="relative mt-5 block max-w-xl">
          <span className="sr-only">Search roles</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={18} aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Search roles..."
            className="min-h-12 w-full rounded-md border border-stone-300 pl-12 pr-4 text-base font-medium text-stone-950 outline-none focus:border-teal-700"
          />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-stone-50 text-xs font-black uppercase text-stone-500">
            <tr>
              <th className="px-5 py-3">Role ID</th>
              <th className="px-5 py-3">Key</th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Level</th>
              <th className="px-5 py-3">Assignable</th>
              <th className="px-5 py-3">System</th>
              <th className="px-5 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {pagedRoles.map((role) => (
              <tr key={role.id} className="cursor-pointer hover:bg-stone-50" onClick={() => openRole(role)}>
                <td className="px-5 py-4 font-medium text-stone-700">{role.id}</td>
                <td className="px-5 py-4 font-black text-stone-950">{role.key}</td>
                <td className="px-5 py-4 font-medium text-stone-800">{role.name}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{role.level}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{role.assignable ? "Yes" : "No"}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{role.system_role ? "Yes" : "No"}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{formatRoleDate(role.updated_at)}</td>
              </tr>
            ))}
            {!pagedRoles.length ? (
              <tr>
                <td className="px-5 py-8 text-center font-semibold text-stone-600" colSpan={7}>
                  {roles.length ? "No roles match your search." : "No Authorisation roles were returned."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 px-5 py-4 text-sm font-medium text-stone-700">
        <span>
          Showing {filteredRoles.length ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredRoles.length)} of {filteredRoles.length} roles
        </span>
        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentPage === 1} onClick={() => setPage(1)}>
            <ChevronsLeft size={17} aria-hidden />
          </button>
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            <ChevronLeft size={17} aria-hidden />
          </button>
          <span className="inline-flex size-10 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">{currentPage}</span>
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
            <ChevronRight size={17} aria-hidden />
          </button>
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentPage === totalPages} onClick={() => setPage(totalPages)}>
            <ChevronsRight size={17} aria-hidden />
          </button>
        </div>
      </div>
      {selectedRole ? (
        (() => {
          const selectedPermissions = permissionsForRole(selectedRole.id);
          const totalPermissionPages = Math.max(1, Math.ceil(selectedPermissions.length / rolePermissionPageSize));
          const currentPermissionPage = Math.min(rolePermissionPage, totalPermissionPages);
          const pagedPermissions = selectedPermissions.slice((currentPermissionPage - 1) * rolePermissionPageSize, currentPermissionPage * rolePermissionPageSize);
          return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-4">
          <section className="w-full max-w-4xl rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-5">
              <div className="min-w-0">
                <h3 className="break-words text-xl font-black text-stone-950">{selectedRole.name}</h3>
                <p className="mt-1 break-words text-sm font-semibold text-stone-600">{selectedRole.key}</p>
              </div>
              <button type="button" onClick={() => setSelectedRole(null)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50">
                <X size={16} aria-hidden />
                <span className="sr-only">Close role details</span>
              </button>
            </div>
            <div className="grid gap-5 px-6 py-5">
              <dl className="grid gap-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="font-black uppercase text-stone-500">Role ID</dt>
                  <dd className="mt-1 break-words font-medium text-stone-800">{selectedRole.id}</dd>
                </div>
                <div>
                  <dt className="font-black uppercase text-stone-500">Level</dt>
                  <dd className="mt-1 font-medium text-stone-800">{selectedRole.level}</dd>
                </div>
                <div>
                  <dt className="font-black uppercase text-stone-500">Assignable</dt>
                  <dd className="mt-1 font-medium text-stone-800">{selectedRole.assignable ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="font-black uppercase text-stone-500">System</dt>
                  <dd className="mt-1 font-medium text-stone-800">{selectedRole.system_role ? "Yes" : "No"}</dd>
                </div>
              </dl>
              <div>
                <h4 className="text-sm font-black uppercase text-stone-500">Privileges</h4>
                <div className="mt-3 max-h-[26rem] overflow-auto rounded-lg border border-stone-200">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-stone-50 text-xs font-black uppercase text-stone-500">
                      <tr>
                        <th className="px-4 py-3">Permission</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {pagedPermissions.map((permission) => (
                        <tr key={permission.id}>
                          <td className="px-4 py-3 font-black text-stone-950">{permission.code}</td>
                          <td className="px-4 py-3 font-medium text-stone-800">{permission.name}</td>
                          <td className="px-4 py-3 font-medium text-stone-700">{permission.description || "No description"}</td>
                        </tr>
                      ))}
                      {!selectedPermissions.length ? (
                        <tr>
                          <td className="px-4 py-8 text-center font-semibold text-stone-600" colSpan={3}>No privileges are associated with this role.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  page={currentPermissionPage}
                  totalPages={totalPermissionPages}
                  onPrevious={() => setRolePermissionPage((value) => Math.max(1, value - 1))}
                  onNext={() => setRolePermissionPage((value) => Math.min(totalPermissionPages, value + 1))}
                />
              </div>
            </div>
          </section>
        </div>
          );
        })()
      ) : null}
    </div>
  );
}
