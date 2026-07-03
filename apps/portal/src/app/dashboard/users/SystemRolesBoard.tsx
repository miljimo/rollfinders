"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Plus, Search, Trash2, X } from "lucide-react";
import { AutoCompleteTextField, type AutoCompleteTextFieldOption } from "@/components/AutoCompleteTextField";
import { TablePagination } from "@/components/Table";
import type { AuthorisationPagination, AuthorisationPermission, AuthorisationRole } from "@/lib/authorisation-service";
import { ActionMenu } from "../../admin/ActionMenu";
import { addPrivilegeToRole, createRoleWithPrivileges, loadAuthorisationRolesPage, removePrivilegeFromRole } from "../DashboardActions";

const pageSize = 10;
const rolePermissionPageSize = 7;
const menuItemClass = "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50";

function roleSearchText(role: AuthorisationRole) {
  return `${role.id} ${role.key} ${role.name} ${role.description ?? ""} ${role.level} ${role.assignable ? "assignable" : "not assignable"} ${role.system_role ? "system" : ""}`.toLowerCase();
}

function formatRoleDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(date);
}

function roleCreatorLabel(role: AuthorisationRole) {
  return role.system_role ? "SYSTEM" : role.created_by || "SYSTEM";
}

export function SystemRolesBoard({
  canAddPrivileges,
  canCreateRoles,
  permissions,
  rolePermissions,
  roles,
  rolesPagination,
}: {
  canAddPrivileges: boolean;
  canCreateRoles: boolean;
  permissions: AuthorisationPermission[];
  rolePermissions: { roleId: string; permissions: AuthorisationPermission[] }[];
  roles: AuthorisationRole[];
  rolesPagination: AuthorisationPagination;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rolePages, setRolePages] = useState<Record<number, { pagination: AuthorisationPagination; roles: AuthorisationRole[] }>>({
    1: { pagination: rolesPagination, roles },
  });
  const [rolePermissionPages, setRolePermissionPages] = useState<Record<string, AuthorisationPermission[]>>(() =>
    Object.fromEntries(rolePermissions.map((item) => [item.roleId, item.permissions])),
  );
  const [rolePermissionPage, setRolePermissionPage] = useState(1);
  const [selectedRole, setSelectedRole] = useState<AuthorisationRole | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLevel, setCreateLevel] = useState("100");
  const [createAssignable, setCreateAssignable] = useState(true);
  const [createSystemRole, setCreateSystemRole] = useState(false);
  const [createPermissionId, setCreatePermissionId] = useState("");
  const [createPermissionIds, setCreatePermissionIds] = useState<string[]>([]);
  const [detailPermissionId, setDetailPermissionId] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const currentRolePage = rolePages[page] ?? { pagination: rolesPagination, roles: [] };
  const loadedRoles = useMemo(
    () => Object.keys(rolePages)
      .map((key) => Number(key))
      .sort((left, right) => left - right)
      .flatMap((key) => rolePages[key]?.roles ?? []),
    [rolePages],
  );
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRoles = useMemo(() => {
    const source = normalizedSearch ? loadedRoles : currentRolePage.roles;
    if (!normalizedSearch) return source;
    return source.filter((role) => roleSearchText(role).includes(normalizedSearch));
  }, [currentRolePage.roles, loadedRoles, normalizedSearch]);
  const loadedPageNumbers = Object.keys(rolePages).map((key) => Number(key));
  const highestLoadedPage = Math.max(1, ...loadedPageNumbers);
  const hasMoreRoles = Object.values(rolePages).some((item) => item.pagination.has_more);
  const totalPages = normalizedSearch
    ? Math.max(1, Math.ceil(filteredRoles.length / pageSize), hasMoreRoles ? highestLoadedPage + 1 : highestLoadedPage)
    : Math.max(1, highestLoadedPage, currentRolePage.pagination.has_more ? page + 1 : page);
  const currentPage = Math.min(page, totalPages);
  const pagedRoles = normalizedSearch ? filteredRoles.slice((currentPage - 1) * pageSize, currentPage * pageSize) : filteredRoles;
  const permissionOptions: AutoCompleteTextFieldOption[] = permissions.map((permission) => ({
    id: permission.id,
    label: permission.code,
    description: permission.description || permission.name,
    meta: permission.name,
  }));
  const createSelectedPermissions = createPermissionIds
    .map((permissionId) => permissions.find((permission) => permission.id === permissionId))
    .filter((permission): permission is AuthorisationPermission => Boolean(permission));

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function permissionsForRole(roleId: string) {
    return rolePermissionPages[roleId] ?? [];
  }

  function goToRolePage(nextPage: number) {
    const safePage = Math.max(1, nextPage);
    if (rolePages[safePage]) {
      setPage(safePage);
      return;
    }
    startTransition(async () => {
      const result = await loadAuthorisationRolesPage(safePage, pageSize);
      setRolePages((current) => ({
        ...current,
        [safePage]: { pagination: result.pagination, roles: result.roles },
      }));
      setRolePermissionPages((current) => ({
        ...current,
        ...Object.fromEntries(result.rolePermissions.map((item) => [item.roleId, item.permissions])),
      }));
      setPage(safePage);
    });
  }

  function resetCreateForm() {
    setCreateKey("");
    setCreateName("");
    setCreateDescription("");
    setCreateLevel("100");
    setCreateAssignable(true);
    setCreateSystemRole(false);
    setCreatePermissionId("");
    setCreatePermissionIds([]);
  }

  function openRole(role: AuthorisationRole) {
    setSelectedRole(role);
    setRolePermissionPage(1);
    setDetailPermissionId("");
    setMessage(null);
  }

  function addCreatePermission() {
    if (!createPermissionId || createPermissionIds.includes(createPermissionId)) return;
    setCreatePermissionIds((current) => [...current, createPermissionId]);
    setCreatePermissionId("");
  }

  function createRole() {
    const level = Number(createLevel);
    setMessage(null);
    startTransition(async () => {
      const result = await createRoleWithPrivileges({
        key: createKey,
        name: createName,
        description: createDescription,
        level: Number.isFinite(level) ? level : 100,
        assignable: createAssignable,
        systemRole: createSystemRole,
        permissionIds: createPermissionIds,
      });
      if (!result.success) {
        setMessage({ type: "error", text: result.message });
        return;
      }
      setCreateOpen(false);
      resetCreateForm();
      setMessage({ type: "success", text: result.message });
      router.refresh();
    });
  }

  function addPrivilege(role: AuthorisationRole) {
    const permissionId = detailPermissionId;
    if (!permissionId) {
      setMessage({ type: "error", text: "Select a privilege before adding it to the role." });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await addPrivilegeToRole({ roleId: role.id, permissionId });
      if (!result.success) {
        setMessage({ type: "error", text: result.message });
        return;
      }
      const addedPermission = permissions.find((permission) => permission.id === permissionId);
      if (addedPermission) {
        setRolePermissionPages((current) => ({
          ...current,
          [role.id]: [...(current[role.id] ?? []), addedPermission].sort((left, right) => left.code.localeCompare(right.code)),
        }));
      }
      setDetailPermissionId("");
      setMessage({ type: "success", text: result.message });
      router.refresh();
    });
  }

  function removePrivilege(role: AuthorisationRole, permission: AuthorisationPermission) {
    setMessage(null);
    startTransition(async () => {
      const result = await removePrivilegeFromRole({ roleId: role.id, permissionId: permission.id });
      if (!result.success) {
        setMessage({ type: "error", text: result.message });
        return;
      }
      setRolePermissionPages((current) => ({
        ...current,
        [role.id]: (current[role.id] ?? []).filter((item) => item.id !== permission.id),
      }));
      setMessage({ type: "success", text: result.message });
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <div className="border-b border-stone-100 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-stone-950">System Roles</h3>
            <p className="mt-1 text-sm text-stone-600">These are the role bundles configured in the Authorisation service.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCreateOpen(true);
              setMessage(null);
            }}
            disabled={!canCreateRoles || pending}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
            title={canCreateRoles ? "Create role" : "You do not have permission to create role bundles"}
          >
            <Plus size={17} aria-hidden />
            New Role
          </button>
        </div>
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
        <table className="w-full min-w-[940px] text-left text-sm">
          <thead className="bg-stone-50 text-xs font-black uppercase text-stone-500">
            <tr>
              <th className="px-5 py-3">Role ID</th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Level</th>
              <th className="px-5 py-3">Assignable</th>
              <th className="px-5 py-3">System</th>
              <th className="px-5 py-3">Created By</th>
              <th className="px-5 py-3">Updated</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {pagedRoles.map((role) => (
              <tr key={role.id} className="cursor-pointer hover:bg-stone-50" onDoubleClick={() => openRole(role)} title={`Double click to view ${role.name}`}>
                <td className="px-5 py-4 font-medium text-stone-700">{role.id}</td>
                <td className="px-5 py-4 font-medium text-stone-800">{role.name}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{role.level}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{role.assignable ? "Yes" : "No"}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{role.system_role ? "Yes" : "No"}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{roleCreatorLabel(role)}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{formatRoleDate(role.updated_at)}</td>
                <td className="px-5 py-4 text-right">
                  <ActionMenu label={`Open actions for ${role.name}`}>
                    <button
                      type="button"
                      onClick={() => openRole(role)}
                      className={menuItemClass}
                      role="menuitem"
                    >
                      <Eye size={18} aria-hidden />
                      View Role
                    </button>
                  </ActionMenu>
                </td>
              </tr>
            ))}
            {!pagedRoles.length ? (
              <tr>
                <td className="px-5 py-8 text-center font-semibold text-stone-600" colSpan={8}>
                  {roles.length ? "No roles match your search." : "No Authorisation roles were returned."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 px-5 py-4 text-sm font-medium text-stone-700">
        <div className="grid gap-1">
          <span>
            Showing {pagedRoles.length ? (currentPage - 1) * pageSize + 1 : 0} to {(currentPage - 1) * pageSize + pagedRoles.length} of {currentRolePage.pagination.has_more ? `${currentPage * pageSize}+` : String((currentPage - 1) * pageSize + pagedRoles.length)} roles
          </span>
          {message ? <span className={message.type === "success" ? "font-semibold text-teal-800" : "font-semibold text-red-700"}>{message.text}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentPage === 1 || pending} onClick={() => goToRolePage(1)}>
            <ChevronsLeft size={17} aria-hidden />
          </button>
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentPage === 1 || pending} onClick={() => goToRolePage(currentPage - 1)}>
            <ChevronLeft size={17} aria-hidden />
          </button>
          <span className="inline-flex size-10 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">{currentPage}</span>
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentPage >= totalPages || pending} onClick={() => goToRolePage(currentPage + 1)}>
            <ChevronRight size={17} aria-hidden />
          </button>
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentPage >= totalPages || pending} onClick={() => goToRolePage(totalPages)}>
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
                <div>
                  <dt className="font-black uppercase text-stone-500">Created By</dt>
                  <dd className="mt-1 break-words font-medium text-stone-800">{roleCreatorLabel(selectedRole)}</dd>
                </div>
              </dl>
              <div>
                <h4 className="text-sm font-black uppercase text-stone-500">Privileges</h4>
                <div className="mt-3 grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <AutoCompleteTextField
                    key={`detail-privilege-${selectedRole.id}-${detailPermissionId}`}
                    emptyMessage="No privileges found."
                    label="Add Privilege"
                    name="permissionId"
                    options={permissionOptions.filter((permission) => !selectedPermissions.some((item) => item.id === permission.id))}
                    placeholder="Search privileges"
                    selectedId={detailPermissionId}
                    onSelectedIdChange={setDetailPermissionId}
                  />
                  <button
                    type="button"
                    onClick={() => addPrivilege(selectedRole)}
                    disabled={!canAddPrivileges || pending || !detailPermissionId}
                    className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-md bg-stone-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
                    title={canAddPrivileges ? "Add privilege to role" : "You do not have permission to add role privileges"}
                  >
                    <Plus size={16} aria-hidden />
                    Add
                  </button>
                </div>
                <div className="mt-3 max-h-[26rem] overflow-auto rounded-lg border border-stone-200">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-stone-50 text-xs font-black uppercase text-stone-500">
                      <tr>
                        <th className="px-4 py-3">Permission</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {pagedPermissions.map((permission) => (
                        <tr key={permission.id}>
                          <td className="px-4 py-3 font-black text-stone-950">{permission.code}</td>
                          <td className="px-4 py-3 font-medium text-stone-800">{permission.name}</td>
                          <td className="px-4 py-3 font-medium text-stone-700">{permission.description || "No description"}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removePrivilege(selectedRole, permission)}
                              disabled={!canAddPrivileges || pending}
                              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-xs font-black text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
                              title={canAddPrivileges ? "Remove privilege from role" : "You do not have permission to remove role privileges"}
                            >
                              <Trash2 size={13} aria-hidden />
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!selectedPermissions.length ? (
                        <tr>
                          <td className="px-4 py-8 text-center font-semibold text-stone-600" colSpan={4}>No privileges are associated with this role.</td>
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
      {createOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-4">
          <section className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-5">
              <div className="min-w-0">
                <h3 className="break-words text-xl font-black text-stone-950">Create Role</h3>
                <p className="mt-1 text-sm font-semibold text-stone-600">Create a role bundle and add privileges.</p>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50">
                <X size={16} aria-hidden />
                <span className="sr-only">Close create role</span>
              </button>
            </div>
            <div className="grid gap-5 px-6 py-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-black text-stone-950">
                  Key
                  <input
                    value={createKey}
                    onChange={(event) => setCreateKey(event.target.value.toUpperCase())}
                    placeholder="ACADEMY_VIEWER"
                    className="min-h-11 min-w-0 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-950 outline-none focus:border-teal-700"
                  />
                </label>
                <label className="grid gap-2 text-sm font-black text-stone-950">
                  Name
                  <input
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder="Academy Viewer"
                    className="min-h-11 min-w-0 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-950 outline-none focus:border-teal-700"
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-black text-stone-950">
                Description
                <textarea
                  value={createDescription}
                  onChange={(event) => setCreateDescription(event.target.value)}
                  rows={3}
                  className="min-h-24 rounded-md border border-stone-300 px-3 py-3 text-sm font-medium text-stone-950 outline-none focus:border-teal-700"
                />
              </label>
              <div className="grid gap-5 sm:grid-cols-3">
                <label className="grid gap-2 text-sm font-black text-stone-950">
                  Level
                  <input
                    type="number"
                    min="1"
                    value={createLevel}
                    onChange={(event) => setCreateLevel(event.target.value)}
                    className="min-h-11 min-w-0 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-950 outline-none focus:border-teal-700"
                  />
                </label>
                <label className="flex min-h-11 items-center gap-3 self-end rounded-md border border-stone-300 px-3 text-sm font-bold text-stone-900">
                  <input type="checkbox" checked={createAssignable} onChange={(event) => setCreateAssignable(event.target.checked)} className="size-4 accent-teal-700" />
                  Assignable
                </label>
                <label className="flex min-h-11 items-center gap-3 self-end rounded-md border border-stone-300 px-3 text-sm font-bold text-stone-900">
                  <input type="checkbox" checked={createSystemRole} onChange={(event) => setCreateSystemRole(event.target.checked)} className="size-4 accent-teal-700" />
                  System role
                </label>
              </div>
              <div className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <AutoCompleteTextField
                    key={`create-role-privilege-${createPermissionId}`}
                    emptyMessage="No privileges found."
                    label="Privileges"
                    name="createPermissionId"
                    options={permissionOptions.filter((permission) => !createPermissionIds.includes(permission.id))}
                    placeholder="Search privileges"
                    selectedId={createPermissionId}
                    onSelectedIdChange={setCreatePermissionId}
                  />
                  <button
                    type="button"
                    onClick={addCreatePermission}
                    disabled={!createPermissionId}
                    className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-900 hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400"
                  >
                    <Plus size={16} aria-hidden />
                    Add
                  </button>
                </div>
                {createSelectedPermissions.length ? (
                  <div className="flex flex-wrap gap-2">
                    {createSelectedPermissions.map((permission) => (
                      <button
                        key={permission.id}
                        type="button"
                        onClick={() => setCreatePermissionIds((current) => current.filter((id) => id !== permission.id))}
                        className="inline-flex min-h-8 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-xs font-black text-stone-800 hover:bg-stone-50"
                        title="Remove privilege"
                      >
                        {permission.code}
                        <Trash2 size={13} aria-hidden />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-stone-600">No privileges selected.</p>
                )}
              </div>
              {!canCreateRoles ? <p className="text-sm font-semibold text-red-700">You do not have permission to create role bundles.</p> : null}
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-stone-200 px-6 py-4">
              <button type="button" onClick={() => setCreateOpen(false)} className="inline-flex min-h-10 items-center rounded-md border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={createRole}
                disabled={!canCreateRoles || pending || !createKey.trim() || !createName.trim()}
                className="inline-flex min-h-10 items-center rounded-md bg-stone-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {pending ? "Creating..." : "Create Role"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
