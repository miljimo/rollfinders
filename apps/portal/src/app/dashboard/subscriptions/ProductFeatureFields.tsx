"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Trash2 } from "lucide-react";
import { AutoCompleteTextField, type AutoCompleteTextFieldOption } from "@/components/AutoCompleteTextField";

type PermissionOption = {
  code: string;
  name: string;
  description?: string | null;
};

type AssignableFeatureOption = {
  key: string;
  name: string;
  permissions: PermissionOption[];
};

type ExistingProductFeature = {
  feature_key: string;
  name: string;
  description: string;
  metadata?: Record<string, unknown>;
};

function searchText(value: string) {
  return value.trim().toLowerCase();
}

function permissionText(permission: PermissionOption) {
  return `${permission.code} ${permission.name} ${permission.description ?? ""}`.toLowerCase();
}

function serviceOptions(features: AssignableFeatureOption[]): AutoCompleteTextFieldOption[] {
  return features
    .map((feature) => ({
      id: feature.key,
      label: feature.name,
      meta: feature.key,
      description: `${feature.permissions.length} permissions`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function resolveServiceId(features: AssignableFeatureOption[], selectedServiceId: string) {
  const normalized = searchText(selectedServiceId);
  return features.find((feature) => searchText(feature.key) === normalized || searchText(feature.name) === normalized)?.key ?? selectedServiceId;
}

function featurePermissionCode(feature: ExistingProductFeature) {
  const value = feature.metadata?.permission_code;
  return typeof value === "string" && value ? value : feature.feature_key;
}

export function ProductFeatureFields({
  assignableFeatures,
  existingFeatures,
  selectedServiceId,
}: {
  assignableFeatures: AssignableFeatureOption[];
  existingFeatures: ExistingProductFeature[];
  selectedServiceId: string;
}) {
  const initialServiceId = resolveServiceId(assignableFeatures, selectedServiceId);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const existingCodes = useMemo(() => existingFeatures.map(featurePermissionCode), [existingFeatures]);
  const [selectedPermissionCodes, setSelectedPermissionCodes] = useState<string[]>(existingCodes);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedTableOpen, setSelectedTableOpen] = useState(existingCodes.length > 0);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [permissionPage, setPermissionPage] = useState(1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedAssignableFeature = assignableFeatures.find((item) => searchText(item.key) === searchText(serviceId));
  const permissions = useMemo(() => {
    const selectedPermissions = selectedAssignableFeature?.permissions ?? [];
    return selectedPermissions.slice().sort((left, right) => (left.name || left.code).localeCompare(right.name || right.code));
  }, [selectedAssignableFeature]);
  const existingPermissionRows = useMemo(() => existingFeatures.map((feature) => ({
    code: featurePermissionCode(feature),
    name: feature.name,
    description: feature.description,
  })), [existingFeatures]);
  const mergedPermissions = useMemo(() => {
    const byCode = new Map<string, PermissionOption>();
    for (const permission of existingPermissionRows) byCode.set(permission.code, permission);
    for (const permission of permissions) byCode.set(permission.code, permission);
    return Array.from(byCode.values()).sort((left, right) => (left.name || left.code).localeCompare(right.name || right.code));
  }, [existingPermissionRows, permissions]);
  const normalizedSearch = searchText(permissionSearch);
  const filteredPermissions = useMemo(() => {
    if (!normalizedSearch) return mergedPermissions;
    return mergedPermissions.filter((permission) => permissionText(permission).includes(normalizedSearch));
  }, [mergedPermissions, normalizedSearch]);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredPermissions.length / pageSize));
  const currentPage = Math.min(permissionPage, totalPages);
  const pagedPermissions = filteredPermissions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedPermissions = selectedPermissionCodes
    .map((code) => mergedPermissions.find((permission) => permission.code === code) ?? { code, name: code, description: code })
    .filter((permission): permission is PermissionOption => Boolean(permission));
  const selectedPermissionsPayload = JSON.stringify(selectedPermissions.map((permission) => ({
    code: permission.code,
    name: permission.name || permission.code,
    description: permission.description || permission.code,
  })));

  useEffect(() => {
    if (!dropdownOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) setDropdownOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [dropdownOpen]);

  function togglePermission(permissionCode: string) {
    setSelectedPermissionCodes((current) => {
      if (current.includes(permissionCode)) return current.filter((code) => code !== permissionCode);
      return [...current, permissionCode];
    });
  }

  return (
    <div className="grid gap-3">
      <AutoCompleteTextField
        emptyMessage="No services found."
        label="Service"
        name="serviceId"
        onSelectedIdChange={(nextServiceId) => {
          setServiceId(nextServiceId);
          setSelectedPermissionCodes([]);
          setSelectedTableOpen(false);
          setPermissionSearch("");
          setPermissionPage(1);
        }}
        options={serviceOptions(assignableFeatures)}
        placeholder="Search services"
        selectedId={serviceId}
      />

      <input type="hidden" name="selectedPermissions" value={selectedPermissionsPayload} />
      {existingCodes.map((code) => <input key={code} type="hidden" name="existingFeatureCodes" value={code} />)}

      <div ref={dropdownRef} className="grid gap-1 text-sm font-bold text-slate-700">
        Service Features
        <button
          type="button"
          onClick={() => setDropdownOpen((open) => !open)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-stone-300 bg-white px-3 py-2 text-left font-medium text-slate-800"
          aria-expanded={dropdownOpen}
        >
          <span className="truncate">{selectedPermissionCodes.length ? `${selectedPermissionCodes.length} selected` : "Select one or more features"}</span>
          <ChevronDown size={18} aria-hidden />
        </button>
        {dropdownOpen ? (
          <section className="mt-1 overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-200 p-3">
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={17} aria-hidden />
                <input
                  type="search"
                  value={permissionSearch}
                  onChange={(event) => {
                    setPermissionSearch(event.target.value);
                    setPermissionPage(1);
                  }}
                  placeholder="Search service permissions"
                  className="min-h-11 w-full rounded-md border border-stone-300 pl-10 pr-3 text-sm font-medium outline-none focus:border-teal-700"
                />
              </span>
            </div>
            <div className="p-2">
              {pagedPermissions.map((permission) => {
                const checked = selectedPermissionCodes.includes(permission.code);
                return (
                  <label key={permission.code} className="grid min-h-14 cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-md px-3 py-2 text-sm hover:bg-stone-50">
                    <input type="checkbox" checked={checked} onChange={() => togglePermission(permission.code)} className="mt-1" />
                    <span className="min-w-0">
                      <span className="block truncate font-black text-slate-900">{permission.name || permission.code}</span>
                      <span className="block break-words font-medium text-slate-600">{permission.code}</span>
                      {permission.description ? <span className="mt-0.5 block truncate text-slate-500">{permission.description}</span> : null}
                    </span>
                  </label>
                );
              })}
              {!pagedPermissions.length ? <p className="rounded-md bg-stone-50 px-3 py-4 text-sm font-semibold text-stone-600">No service permissions found for this service.</p> : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-3 py-3 text-sm font-semibold text-slate-600">
              <span>{selectedPermissionCodes.length} selected</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={currentPage === 1} onClick={() => setPermissionPage((page) => Math.max(1, page - 1))} className="min-h-9 rounded-md border border-stone-300 px-3 disabled:opacity-40">Previous</button>
                <span>Page {currentPage} of {totalPages}</span>
                <button type="button" disabled={currentPage === totalPages} onClick={() => setPermissionPage((page) => Math.min(totalPages, page + 1))} className="min-h-9 rounded-md border border-stone-300 px-3 disabled:opacity-40">Next</button>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-3 text-sm">
        <p className="font-black text-slate-800">{selectedPermissionCodes.length ? `${selectedPermissionCodes.length} service feature${selectedPermissionCodes.length === 1 ? "" : "s"} selected` : "Select at least one service feature"}</p>
        <button
          type="button"
          onClick={() => setSelectedTableOpen((open) => !open)}
          disabled={!selectedPermissions.length}
          className="min-h-9 rounded-md border border-stone-300 bg-white px-3 font-bold text-slate-800 disabled:cursor-not-allowed disabled:text-stone-400"
        >
          {selectedTableOpen ? "Hide selected features" : "View selected features"}
        </button>
      </div>

      {selectedTableOpen && selectedPermissions.length ? (
        <section className="overflow-hidden rounded-md border border-stone-200">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-stone-50 text-xs font-black uppercase text-stone-500">
              <tr>
                <th className="px-3 py-3">Feature</th>
                <th className="px-3 py-3">Code</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {selectedPermissions.map((permission) => (
                <tr key={permission.code}>
                  <td className="px-3 py-3 align-top">
                    <p className="break-words font-black text-slate-900">{permission.name || permission.code}</p>
                    {permission.description ? <p className="mt-1 break-words text-xs font-medium text-slate-600">{permission.description}</p> : null}
                  </td>
                  <td className="px-3 py-3 align-top font-medium text-slate-700">{permission.code}</td>
                  <td className="px-3 py-3 text-right align-top">
                    <button
                      type="button"
                      onClick={() => togglePermission(permission.code)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-bold text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} aria-hidden />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
