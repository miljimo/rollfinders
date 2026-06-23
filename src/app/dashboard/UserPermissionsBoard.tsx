"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from "lucide-react";
import type { AuthorisationPermission, AuthorisationPermissionAssignment } from "@/lib/authorisation-service";

type PermissionRow = {
  id: string;
  code: string;
  description: string;
  source: string;
  scope: string;
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

function toRows(permissions: AuthorisationPermission[], directAssignments: AuthorisationPermissionAssignment[]) {
  const directByCode = new Map(directAssignments.map((assignment) => [assignment.permission_code, assignment]));
  return permissions.map((permission) => {
    const direct = directByCode.get(permission.code);
    return {
      id: permission.id || permission.code,
      code: permission.code,
      description: permission.description || permission.name,
      source: direct ? `Direct ${direct.effect.toLowerCase()}` : "Role",
      scope: direct ? scopeLabel(direct.scope) : "Effective scope",
    };
  });
}

function rowSearchText(row: PermissionRow) {
  return `${row.code} ${row.description} ${row.source} ${row.scope}`.toLowerCase();
}

export function UserPermissionsBoard({
  directAssignments,
  permissions,
}: {
  directAssignments: AuthorisationPermissionAssignment[];
  permissions: AuthorisationPermission[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const rows = useMemo(() => toRows(permissions, directAssignments), [directAssignments, permissions]);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRows = useMemo(() => {
    if (!normalizedSearch) return rows;
    return rows.filter((row) => rowSearchText(row).includes(normalizedSearch));
  }, [normalizedSearch, rows]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <div className="border-b border-stone-100 px-5 py-4">
        <h3 className="text-lg font-black text-stone-950">Permissions You Can Access</h3>
        <p className="mt-1 text-sm text-stone-600">These are the effective permissions returned by Authorisation Service for your current scope.</p>
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
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-stone-50 text-xs font-black uppercase text-stone-500">
            <tr>
              <th className="px-5 py-3">Permission</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3">Source</th>
              <th className="px-5 py-3">Scope</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {pagedRows.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-4 font-black text-stone-950">{row.code}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{row.description}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{row.source}</td>
                <td className="px-5 py-4 font-medium text-stone-700">{row.scope}</td>
              </tr>
            ))}
            {!pagedRows.length ? (
              <tr>
                <td className="px-5 py-8 text-center font-semibold text-stone-600" colSpan={4}>
                  {rows.length ? "No permissions match your search." : "No effective permissions were returned for your current scope."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 px-5 py-4 text-sm font-medium text-stone-700">
        <span>
          Showing {filteredRows.length ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} permissions
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
    </div>
  );
}
