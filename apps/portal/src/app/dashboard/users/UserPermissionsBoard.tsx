"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import { AutoCompleteTextField, type AutoCompleteTextFieldOption } from "@/app/_components/AutoCompleteTextField";
import type { AuthorisationPagination, AuthorisationPermission, AuthorisationPermissionAssignment, AuthorisationResource, AuthorisationRole } from "@/lib/authorisation-service";
import { ActionMenu } from "../../admin/ActionMenu";
import { createPermissionWithOptionalAssignments, loadAuthorisationPermissionsPage, removeCurrentUserPermissionAssignment, updatePermissionDescription } from "../DashboardActions";

type PermissionRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  assignmentId: string | null;
  applicationId: string;
  canRemove: boolean;
  organisationId: string;
  resourceId: string;
  resourceType: string;
  source: string;
  scope: string;
};

const menuItemClass = "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50";
const dangerMenuItemClass = "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-stone-400 disabled:hover:bg-transparent";

type UserOption = {
  id: string;
  name: string | null;
  email: string;
};

type ScopeOption = {
  id: string;
  name: string;
  slug: string;
};

type RolePermissionAssociation = {
  role: {
    id: string;
    key: string;
    name: string;
  };
  permissionCodes: string[];
  permissionIds: string[];
};

function scopeLabel(scope?: { organisation_id?: string; application_id?: string; resource_type?: string; resource_id?: string }) {
  if (!scope) return "Effective scope";
  const parts = [
    scope.organisation_id ? `Org ${scope.organisation_id}` : null,
    scope.application_id ? `App ${scope.application_id}` : null,
    scope.resource_type ? `${scope.resource_type}${scope.resource_id ? `:${scope.resource_id}` : ""}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" / ") : "Global";
}

function toRows(
  permissions: AuthorisationPermission[],
  directAssignments: AuthorisationPermissionAssignment[],
  rolePermissions: RolePermissionAssociation[],
) {
  const directByCode = new Map(directAssignments.map((assignment) => [assignment.permission_code, assignment]));
  return permissions.map((permission) => {
    const direct = directByCode.get(permission.code);
    const hasRoleAssociation = rolePermissions.some((association) =>
      association.permissionIds.includes(permission.id) || association.permissionCodes.includes(permission.code),
    );
    return {
      id: permission.id || permission.code,
      code: permission.code,
      name: permission.name,
      description: permission.description || permission.name,
      assignmentId: direct?.id ?? null,
      applicationId: permission.application_id ?? "",
      canRemove: Boolean(direct?.id),
      organisationId: permission.organisation_id ?? "",
      resourceId: permission.resource_id ?? "",
      resourceType: permission.resource_type ?? "",
      source: direct ? `Direct ${direct.effect.toLowerCase()}` : hasRoleAssociation ? "Role" : "Catalog",
      scope: direct ? scopeLabel(direct.scope) : scopeLabel({
        application_id: permission.application_id,
        organisation_id: permission.organisation_id,
      }),
    };
  });
}

function rowSearchText(row: PermissionRow) {
  return `${row.code} ${row.description} ${row.source} ${row.scope}`.toLowerCase();
}

function isValidPermissionCode(value: string) {
  return /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(value.trim());
}

export function UserPermissionsBoard({
  applications,
  directAssignments,
  effectivePermissions,
  organisations,
  permissions,
  permissionsPagination,
  resources,
  rolePermissions,
  roles,
  users,
}: {
  applications: ScopeOption[];
  directAssignments: AuthorisationPermissionAssignment[];
  effectivePermissions: AuthorisationPermission[];
  organisations: ScopeOption[];
  permissions: AuthorisationPermission[];
  permissionsPagination: AuthorisationPagination;
  resources: AuthorisationResource[];
  rolePermissions: RolePermissionAssociation[];
  roles: AuthorisationRole[];
  users: UserOption[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [permissionPages, setPermissionPages] = useState<Record<number, { pagination: AuthorisationPagination; permissions: AuthorisationPermission[] }>>({
    1: { pagination: permissionsPagination, permissions },
  });
  const [selectedRow, setSelectedRow] = useState<PermissionRow | null>(null);
  const [editingRow, setEditingRow] = useState<PermissionRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createCode, setCreateCode] = useState("");
  const [createAction, setCreateAction] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createOrganisationId, setCreateOrganisationId] = useState("");
  const [createApplicationId, setCreateApplicationId] = useState("");
  const [createRoleId, setCreateRoleId] = useState("");
  const [createUserId, setCreateUserId] = useState("");
  const [createResourceId, setCreateResourceId] = useState("");
  const [editApplicationId, setEditApplicationId] = useState("");
  const [editAction, setEditAction] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editName, setEditName] = useState("");
  const [editOrganisationId, setEditOrganisationId] = useState("");
  const [editResourceId, setEditResourceId] = useState("");
  const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const pageSize = 10;
  const currentPermissionPage = permissionPages[page] ?? { pagination: permissionsPagination, permissions: [] };
  const loadedPermissions = useMemo(
    () => Object.keys(permissionPages)
      .map((key) => Number(key))
      .sort((left, right) => left - right)
      .flatMap((key) => permissionPages[key]?.permissions ?? []),
    [permissionPages],
  );
  const visiblePermissions = search.trim() ? loadedPermissions : currentPermissionPage.permissions;
  const rows = useMemo(() => toRows(visiblePermissions, directAssignments, rolePermissions), [directAssignments, rolePermissions, visiblePermissions]);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRows = useMemo(() => {
    if (!normalizedSearch) return rows;
    return rows.filter((row) => rowSearchText(row).includes(normalizedSearch));
  }, [normalizedSearch, rows]);
  const loadedPageNumbers = Object.keys(permissionPages).map((key) => Number(key));
  const highestLoadedPage = Math.max(1, ...loadedPageNumbers);
  const hasMorePermissions = Object.values(permissionPages).some((item) => item.pagination.has_more);
  const totalPages = normalizedSearch
    ? Math.max(1, Math.ceil(filteredRows.length / pageSize), hasMorePermissions ? highestLoadedPage + 1 : highestLoadedPage)
    : Math.max(1, highestLoadedPage, currentPermissionPage.pagination.has_more ? page + 1 : page);
  const currentPage = Math.min(page, totalPages);
  const pagedRows = normalizedSearch ? filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize) : filteredRows;
  const effectivePermissionCodes = useMemo(() => new Set(effectivePermissions.map((permission) => permission.code)), [effectivePermissions]);
  const canEditPermissions = effectivePermissionCodes.has("authorisation.permission.update") || effectivePermissionCodes.has("authorisation.manage");
  const canCreatePermissions = effectivePermissionCodes.has("authorisation.permission.create") || effectivePermissionCodes.has("authorisation.manage");
  const organisationSelectOptions: AutoCompleteTextFieldOption[] = organisations.map((organisation) => ({
    id: organisation.id,
    label: organisation.name,
    meta: organisation.slug,
  }));
  const applicationSelectOptions: AutoCompleteTextFieldOption[] = applications.map((application) => ({
    id: application.id,
    label: application.name,
    meta: application.slug,
  }));
  const roleSelectOptions: AutoCompleteTextFieldOption[] = roles.map((role) => ({
    id: role.id,
    label: role.name,
    meta: role.key,
  }));
  const userSelectOptions: AutoCompleteTextFieldOption[] = users.map((user) => ({
    id: user.id,
    label: user.name || user.email,
    meta: user.email,
  }));
  const resourceSelectOptions: AutoCompleteTextFieldOption[] = resources.map((resource) => ({
    id: resource.id,
    label: resource.display_name || resource.resource_type,
    meta: resource.resource_type,
  }));
  const selectedCreateResource = resources.find((resource) => resource.id === createResourceId);
  const selectedEditResource = resources.find((resource) => resource.id === editResourceId);
  const derivedCreateCode = selectedCreateResource && createAction.trim()
    ? `${selectedCreateResource.resource_type}.${createAction.trim().toLowerCase()}`
    : createCode.trim();
  const derivedEditCode = selectedEditResource && editAction.trim()
    ? `${selectedEditResource.resource_type}.${editAction.trim().toLowerCase()}`
    : editingRow?.code ?? "";
  const createCodeIsValid = !derivedCreateCode || isValidPermissionCode(derivedCreateCode);

  function associatedRoles(row: PermissionRow) {
    return rolePermissions
      .filter((association) => association.permissionIds.includes(row.id) || association.permissionCodes.includes(row.code))
      .map((association) => association.role)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function goToPermissionPage(nextPage: number) {
    const safePage = Math.max(1, nextPage);
    if (permissionPages[safePage]) {
      setPage(safePage);
      return;
    }
    startTransition(async () => {
      const result = await loadAuthorisationPermissionsPage(safePage, pageSize);
      setPermissionPages((current) => ({
        ...current,
        [safePage]: { pagination: result.pagination, permissions: result.permissions },
      }));
      setPage(safePage);
    });
  }

  function removePermission(row: PermissionRow) {
    if (!row.assignmentId) return;
    const assignmentId = row.assignmentId;
    setMessage(null);
    setRemovingAssignmentId(assignmentId);
    startTransition(async () => {
      try {
        await removeCurrentUserPermissionAssignment(assignmentId);
        setMessage({ type: "success", text: `${row.code} removed.` });
      } catch (error) {
        setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to remove permission." });
      } finally {
        setRemovingAssignmentId(null);
      }
    });
  }

  function openEditDialog(row: PermissionRow) {
    setMessage(null);
    setEditingRow(row);
    setEditApplicationId(row.applicationId);
    setEditAction(row.code.split(".").at(-1) ?? "");
    setEditDescription(row.description);
    setEditName(row.name);
    setEditOrganisationId(row.organisationId);
    setEditResourceId(row.resourceId);
  }

  function savePermissionDescription() {
    if (!editingRow) return;
    const row = editingRow;
    setMessage(null);
    startTransition(async () => {
      const result = await updatePermissionDescription({
          permissionId: row.id,
          code: derivedEditCode,
          name: editName.trim(),
          description: editDescription,
          organisationId: editOrganisationId.trim() || undefined,
          applicationId: editApplicationId.trim() || undefined,
          resourceId: editResourceId.trim() || undefined,
      });
      if (!result.success) {
        setMessage({ type: "error", text: result.message });
        return;
      }
      const updated = result.data;
      setEditingRow(null);
      if (updated) {
        setSelectedRow((current) => current?.id === row.id ? {
          ...current,
          applicationId: updated.application_id ?? "",
          description: updated.description || updated.name,
          name: updated.name,
          organisationId: updated.organisation_id ?? "",
          resourceId: updated.resource_id ?? "",
          resourceType: updated.resource_type ?? "",
          code: updated.code,
        } : current);
      }
      setMessage({ type: "success", text: result.message });
      router.refresh();
    });
  }

  function resetCreateForm() {
    setCreateCode("");
    setCreateAction("");
    setCreateName("");
    setCreateDescription("");
    setCreateOrganisationId("");
    setCreateApplicationId("");
    setCreateRoleId("");
    setCreateUserId("");
    setCreateResourceId("");
  }

  function saveNewPermission() {
    if (!isValidPermissionCode(derivedCreateCode)) {
      setMessage({ type: "error", text: "Permission code must use resource.action naming, for example academy.archive or academy.claim.approve." });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await createPermissionWithOptionalAssignments({
        code: derivedCreateCode,
        name: createName.trim(),
        description: createDescription.trim(),
        organisationId: createOrganisationId.trim() || undefined,
        applicationId: createApplicationId.trim() || undefined,
        resourceId: createResourceId.trim() || undefined,
        roleId: createRoleId || undefined,
        userId: createUserId || undefined,
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

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <div className="border-b border-stone-100 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-stone-950">Permissions You Can Access</h3>
            <p className="mt-1 text-sm text-stone-600">These are the permission definitions returned by Authorisation Service.</p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={!canCreatePermissions || pending}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
            title={canCreatePermissions ? "Create permission" : "You do not have permission to create permission definitions"}
          >
            <Plus size={17} aria-hidden />
            New Permission
          </button>
        </div>
        <label className="relative mt-5 block max-w-xl">
          <span className="sr-only">Search permissions</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={18} aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Search permissions..."
            className="min-h-12 w-full rounded-md border border-stone-300 pl-12 pr-4 text-base font-medium text-stone-950 outline-none focus:border-teal-700"
          />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-stone-50 text-xs font-black uppercase text-stone-500">
            <tr>
              <th className="px-5 py-3">Permission</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3">Source</th>
              <th className="px-5 py-3">Scope</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {pagedRows.map((row) => (
              <tr
                key={row.id}
                onDoubleClick={() => setSelectedRow(row)}
                className="cursor-pointer hover:bg-stone-50"
                title={`Double click to view ${row.code}`}
              >
                <td className="px-5 py-4 font-black text-stone-950">{row.code}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{row.description}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{row.source}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{row.scope}</td>
                <td className="px-5 py-4 text-center">
                  <ActionMenu label={`Open actions for ${row.code}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedRow(row)}
                      className={menuItemClass}
                      role="menuitem"
                    >
                      <Eye size={18} aria-hidden />
                      View Permission
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditDialog(row)}
                      disabled={!canEditPermissions || pending}
                      className={menuItemClass}
                      role="menuitem"
                      title={canEditPermissions ? "Edit permission" : "You do not have permission to edit permission definitions"}
                    >
                      <Pencil size={18} aria-hidden />
                      Edit Permission
                    </button>
                    <button
                      type="button"
                      onClick={() => removePermission(row)}
                      disabled={!row.canRemove || pending}
                      className={dangerMenuItemClass}
                      role="menuitem"
                      title={row.canRemove ? "Remove permission" : "Role permissions must be edited through roles"}
                    >
                      <Trash2 size={18} aria-hidden />
                      Remove Permission
                    </button>
                  </ActionMenu>
                </td>
              </tr>
            ))}
            {!pagedRows.length ? (
              <tr>
                <td className="px-5 py-8 text-center font-semibold text-stone-600" colSpan={5}>
                  {rows.length ? "No permissions match your search." : "No permission definitions were returned."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 px-5 py-4 text-sm font-medium text-stone-700">
        <div className="grid gap-1">
          <span>
            Showing {pagedRows.length ? (currentPage - 1) * pageSize + 1 : 0} to {(currentPage - 1) * pageSize + pagedRows.length} of {currentPermissionPage.pagination.has_more ? `${currentPage * pageSize}+` : String((currentPage - 1) * pageSize + pagedRows.length)} permissions
          </span>
          {message ? <span className={message.type === "success" ? "font-semibold text-teal-800" : "font-semibold text-red-700"}>{message.text}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentPage === 1 || pending} onClick={() => goToPermissionPage(1)}>
            <ChevronsLeft size={17} aria-hidden />
          </button>
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentPage === 1 || pending} onClick={() => goToPermissionPage(currentPage - 1)}>
            <ChevronLeft size={17} aria-hidden />
          </button>
          <span className="inline-flex size-10 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">{currentPage}</span>
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentPage >= totalPages || pending} onClick={() => goToPermissionPage(currentPage + 1)}>
            <ChevronRight size={17} aria-hidden />
          </button>
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentPage >= totalPages || pending} onClick={() => goToPermissionPage(totalPages)}>
            <ChevronsRight size={17} aria-hidden />
          </button>
        </div>
      </div>
      {selectedRow ? (
        (() => {
          const selectedAssociatedRoles = associatedRoles(selectedRow);
          return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-4">
          <section className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-5">
              <div className="min-w-0">
                <h3 className="break-words text-xl font-black text-stone-950">{selectedRow.code}</h3>
                <p className="mt-1 text-sm font-semibold text-stone-600">Permission details</p>
              </div>
              <button type="button" onClick={() => setSelectedRow(null)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50">
                <X size={16} aria-hidden />
                <span className="sr-only">Close permission details</span>
              </button>
            </div>
            <dl className="grid gap-4 px-6 py-5 text-sm">
              <div>
                <dt className="font-black uppercase text-stone-500">Description</dt>
                <dd className="mt-1 break-words font-medium text-stone-800">{selectedRow.description}</dd>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="font-black uppercase text-stone-500">Source</dt>
                  <dd className="mt-1 font-medium text-stone-800">{selectedRow.source}</dd>
                </div>
                <div>
                  <dt className="font-black uppercase text-stone-500">Scope</dt>
                  <dd className="mt-1 break-words font-medium text-stone-800">{selectedRow.scope}</dd>
                </div>
              </div>
              <div>
                <dt className="font-black uppercase text-stone-500">Roles</dt>
                <dd className="mt-2">
                  {selectedAssociatedRoles.length ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedAssociatedRoles.map((role) => (
                        <span key={role.id} className="inline-flex min-h-8 items-center rounded-md border border-stone-200 bg-stone-50 px-3 text-xs font-black text-stone-800">
                          {role.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-stone-500">No roles are associated with this permission.</span>
                  )}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap justify-end gap-3 border-t border-stone-200 px-6 py-4">
              <button
                type="button"
                disabled={!selectedAssociatedRoles.length}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400 disabled:hover:bg-transparent"
                title={selectedAssociatedRoles.length ? "Associated roles are shown above" : "No roles are associated with this permission"}
              >
                <Users size={16} aria-hidden />
                Roles
              </button>
              <button
                type="button"
                onClick={() => removePermission(selectedRow)}
                disabled={!selectedRow.canRemove || pending || removingAssignmentId === selectedRow.assignmentId}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-red-700 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                <Trash2 size={16} aria-hidden />
                Remove
              </button>
            </div>
          </section>
        </div>
          );
        })()
      ) : null}
      {editingRow ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-4">
          <section className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-5">
              <div className="min-w-0">
                <h3 className="break-words text-xl font-black text-stone-950">Edit Permission</h3>
                <p className="mt-1 break-words text-sm font-semibold text-stone-600">{editingRow.code}</p>
              </div>
              <button type="button" onClick={() => setEditingRow(null)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50">
                <X size={16} aria-hidden />
                <span className="sr-only">Close edit permission</span>
              </button>
            </div>
            <div className="grid gap-5 px-6 py-5">
              <label className="grid gap-2 text-sm font-black text-stone-950">
                Permission
                <input value={derivedEditCode} readOnly className="min-h-11 rounded-md border border-stone-200 bg-stone-50 px-3 text-sm font-semibold text-stone-700" />
              </label>
              <label className="grid gap-2 text-sm font-black text-stone-950">
                Name
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  disabled={!canEditPermissions || pending}
                  className="min-h-11 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-950 outline-none focus:border-teal-700 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-stone-950">
                Description
                <textarea
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  disabled={!canEditPermissions || pending}
                  rows={5}
                  className="min-h-32 rounded-md border border-stone-300 px-3 py-3 text-sm font-medium text-stone-950 outline-none focus:border-teal-700 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500"
                />
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <AutoCompleteTextField
                  key={`edit-resource-${editingRow.id}-${editResourceId}`}
                  emptyMessage="No resources found."
                  label="Resource"
                  name="resourceId"
                  options={resourceSelectOptions}
                  placeholder="Search resources"
                  selectedId={editResourceId}
                  onSelectedIdChange={setEditResourceId}
                />
                <label className="grid gap-2 text-sm font-black text-stone-950">
                  Action
                  <input
                    value={editAction}
                    onChange={(event) => setEditAction(event.target.value.toLowerCase())}
                    disabled={!canEditPermissions || pending}
                    placeholder="view"
                    className="min-h-11 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-950 outline-none focus:border-teal-700 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500"
                  />
                </label>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <AutoCompleteTextField
                  key={`edit-organisation-${editingRow.id}-${editOrganisationId}`}
                  emptyMessage="No organisations found."
                  label="Organisation"
                  name="organisationId"
                  options={organisationSelectOptions}
                  placeholder="Global"
                  selectedId={editOrganisationId}
                  onSelectedIdChange={setEditOrganisationId}
                />
                <AutoCompleteTextField
                  key={`edit-application-${editingRow.id}-${editApplicationId}`}
                  emptyMessage="No applications found."
                  label="Application"
                  name="applicationId"
                  options={applicationSelectOptions}
                  placeholder="Global"
                  selectedId={editApplicationId}
                  onSelectedIdChange={setEditApplicationId}
                />
              </div>
              {!canEditPermissions ? <p className="text-sm font-semibold text-red-700">You do not have permission to edit permission definitions.</p> : null}
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-stone-200 px-6 py-4">
              <button type="button" onClick={() => setEditingRow(null)} className="inline-flex min-h-10 items-center rounded-md border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={savePermissionDescription}
                disabled={!canEditPermissions || pending || !editName.trim()}
                className="inline-flex min-h-10 items-center rounded-md bg-stone-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {pending ? "Saving..." : "Save Permission"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {createOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-4">
          <section className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-5">
              <div>
                <h3 className="text-xl font-black text-stone-950">Create Permission</h3>
                <p className="mt-1 text-sm font-semibold text-stone-600">Create a permission definition and optionally assign it.</p>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50">
                <X size={16} aria-hidden />
                <span className="sr-only">Close create permission</span>
              </button>
            </div>
            <div className="grid gap-5 px-6 py-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <AutoCompleteTextField
                  key={`create-resource-${createResourceId}`}
                  emptyMessage="No resources found."
                  label="Resource"
                  name="resourceId"
                  options={resourceSelectOptions}
                  placeholder="Search resources"
                  selectedId={createResourceId}
                  onSelectedIdChange={setCreateResourceId}
                />
                <label className="grid gap-2 text-sm font-black text-stone-950">
                  Action
                  <input value={createAction} onChange={(event) => setCreateAction(event.target.value.toLowerCase())} placeholder="view" className="min-h-11 min-w-0 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-950 outline-none focus:border-teal-700" />
                </label>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-black text-stone-950">
                  Name
                  <input value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder="Readable permission name" className="min-h-11 min-w-0 rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-950 outline-none focus:border-teal-700" />
                </label>
                <label className="grid gap-2 text-sm font-black text-stone-950">
                  Code
                  <input value={derivedCreateCode} readOnly placeholder="resource.action" className="min-h-11 min-w-0 rounded-md border border-stone-200 bg-stone-50 px-3 text-sm font-semibold text-stone-700" />
                  {!createCodeIsValid ? (
                    <span className="text-xs font-semibold text-red-700">
                      Use lowercase dot-separated code, for example academy.view.profile.
                    </span>
                  ) : null}
                </label>
              </div>
              <label className="grid gap-2 text-sm font-black text-stone-950">
                Description
                <textarea value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} rows={4} className="min-h-28 rounded-md border border-stone-300 px-3 py-3 text-sm font-medium text-stone-950 outline-none focus:border-teal-700" />
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <AutoCompleteTextField
                  key={`create-organisation-${createOrganisationId}`}
                  emptyMessage="No organisations found."
                  label="Organisation"
                  name="organisationId"
                  options={organisationSelectOptions}
                  placeholder="Global"
                  selectedId={createOrganisationId}
                  onSelectedIdChange={setCreateOrganisationId}
                />
                <AutoCompleteTextField
                  key={`create-application-${createApplicationId}`}
                  emptyMessage="No applications found."
                  label="Application"
                  name="applicationId"
                  options={applicationSelectOptions}
                  placeholder="Global"
                  selectedId={createApplicationId}
                  onSelectedIdChange={setCreateApplicationId}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <AutoCompleteTextField
                  key={`create-role-${createRoleId}`}
                  emptyMessage="No roles found."
                  label="Assign To Role"
                  name="roleId"
                  options={roleSelectOptions}
                  placeholder="Do not assign to role"
                  selectedId={createRoleId}
                  onSelectedIdChange={setCreateRoleId}
                />
                <AutoCompleteTextField
                  key={`create-user-${createUserId}`}
                  emptyMessage="No users found."
                  label="Assign To User"
                  name="userId"
                  options={userSelectOptions}
                  placeholder="Do not assign to user"
                  selectedId={createUserId}
                  onSelectedIdChange={setCreateUserId}
                />
              </div>
              {!canCreatePermissions ? <p className="text-sm font-semibold text-red-700">You do not have permission to create permission definitions.</p> : null}
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-stone-200 px-6 py-4">
              <button type="button" onClick={() => setCreateOpen(false)} className="inline-flex min-h-10 items-center rounded-md border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={saveNewPermission}
                disabled={!canCreatePermissions || pending || !derivedCreateCode || !createName.trim() || !isValidPermissionCode(derivedCreateCode)}
                className="inline-flex min-h-10 items-center rounded-md bg-stone-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {pending ? "Creating..." : "Create Permission"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
