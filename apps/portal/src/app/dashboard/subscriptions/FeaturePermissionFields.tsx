"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Trash2 } from "lucide-react";

type ProductOption = {
  id: string;
  name: string;
  service_id: string;
};

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

type ExistingFeature = {
  product_id: string;
  name: string;
  description: string;
  metadata?: Record<string, unknown>;
};

function featurePermissionCode(feature?: ExistingFeature) {
  const value = feature?.metadata?.permission_code;
  return typeof value === "string" ? value : "";
}

function searchText(value: string) {
  return value.trim().toLowerCase();
}

function permissionText(permission: PermissionOption) {
  return `${permission.code} ${permission.name} ${permission.description ?? ""}`.toLowerCase();
}

export function FeaturePermissionFields({
  assignableFeatures,
  feature,
  products,
}: {
  assignableFeatures: AssignableFeatureOption[];
  feature?: ExistingFeature;
  products: ProductOption[];
}) {
  const initialProductId = feature?.product_id || products[0]?.id || "";
  const [selectedProductId, setSelectedProductId] = useState(initialProductId);
  const [featureName, setFeatureName] = useState(feature?.name ?? "");
  const [selectedPermissionCodes, setSelectedPermissionCodes] = useState<string[]>(() => {
    const code = featurePermissionCode(feature);
    return code ? [code] : [];
  });
  const [displayNamesByCode, setDisplayNamesByCode] = useState<Record<string, string>>(() => {
    const code = featurePermissionCode(feature);
    return code && feature?.name ? { [code]: feature.name } : {};
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedTableOpen, setSelectedTableOpen] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [permissionPage, setPermissionPage] = useState(1);
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const serviceKey = searchText(selectedProduct?.service_id ?? "");
  const selectedAssignableFeature = assignableFeatures.find((item) => searchText(item.key) === serviceKey);
  const permissions = useMemo(() => {
    const permissions = selectedAssignableFeature?.permissions ?? [];
    return permissions.slice().sort((left, right) => (left.name || left.code).localeCompare(right.name || right.code));
  }, [selectedAssignableFeature]);
  const normalizedSearch = searchText(permissionSearch);
  const filteredPermissions = useMemo(() => {
    if (!normalizedSearch) return permissions;
    return permissions.filter((permission) => permissionText(permission).includes(normalizedSearch));
  }, [normalizedSearch, permissions]);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredPermissions.length / pageSize));
  const currentPage = Math.min(permissionPage, totalPages);
  const pagedPermissions = filteredPermissions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedPermissions = selectedPermissionCodes
    .map((code) => permissions.find((permission) => permission.code === code))
    .filter((permission): permission is PermissionOption => Boolean(permission));
  const selectedDisplayName = (permission: PermissionOption) => displayNamesByCode[permission.code]?.trim() || (selectedPermissionCodes.length === 1 ? featureName.trim() : "") || permission.name || permission.code;
  const primaryPermission = selectedPermissions[0];
  const submittedName = primaryPermission ? selectedDisplayName(primaryPermission) : featureName.trim();
  const submittedDescription = primaryPermission?.description || feature?.description || primaryPermission?.code || "";
  const selectedPermissionsPayload = JSON.stringify(selectedPermissions.map((permission) => ({
    code: permission.code,
    name: selectedDisplayName(permission),
    description: permission.description || permission.code,
  })));
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [dropdownOpen]);

  function togglePermission(permissionCode: string) {
    setSelectedPermissionCodes((current) => {
      if (current.includes(permissionCode)) {
        setDisplayNamesByCode((names) => {
          const next = { ...names };
          delete next[permissionCode];
          return next;
        });
        return current.filter((code) => code !== permissionCode);
      }
      const permission = permissions.find((item) => item.code === permissionCode);
      setDisplayNamesByCode((names) => ({
        ...names,
        [permissionCode]: names[permissionCode] || featureName.trim() || permission?.name || permissionCode,
      }));
      return [...current, permissionCode];
    });
  }

  return (
    <>
      <label className="grid gap-1 text-sm font-bold text-slate-700">
        Name
        <input
          type="text"
          value={featureName}
          onChange={(event) => {
            const nextName = event.target.value;
            setFeatureName(nextName);
            if (selectedPermissionCodes.length === 1) {
              const [permissionCode] = selectedPermissionCodes;
              setDisplayNamesByCode((names) => ({ ...names, [permissionCode]: nextName }));
            }
          }}
          placeholder="Enter feature display name"
          className="min-h-11 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium"
        />
      </label>

      <label className="grid gap-1 text-sm font-bold text-slate-700">
        Product Service
        <select
          name="productId"
          value={selectedProductId}
          onChange={(event) => {
            setSelectedProductId(event.target.value);
            setSelectedPermissionCodes([]);
            setDisplayNamesByCode({});
            setPermissionSearch("");
            setPermissionPage(1);
          }}
          className="min-h-11 rounded-md border border-stone-300 bg-white px-3 py-2"
        >
          {products.map((product) => (
            <option key={product.id} value={product.id}>{product.name}</option>
          ))}
        </select>
      </label>

      <div ref={dropdownRef} className="grid gap-1 text-sm font-bold text-slate-700">
        Permission Features
        <button
          type="button"
          onClick={() => setDropdownOpen((open) => !open)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-stone-300 bg-white px-3 py-2 text-left font-medium text-slate-800"
          aria-expanded={dropdownOpen}
        >
          <span className="truncate">{selectedPermissionCodes.length ? `${selectedPermissionCodes.length} selected` : "Select permission features"}</span>
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
                  placeholder="Search permissions"
                  className="min-h-11 w-full rounded-md border border-stone-300 pl-10 pr-3 text-sm font-medium outline-none focus:border-teal-700"
                />
              </span>
            </div>
            <div className="p-2">
              {pagedPermissions.map((permission) => {
                const checked = selectedPermissionCodes.includes(permission.code);
                return (
                  <label key={permission.code} className="grid min-h-14 cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-md px-3 py-2 text-sm hover:bg-stone-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePermission(permission.code)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-black text-slate-900">{permission.name || permission.code}</span>
                      <span className="block break-words font-medium text-slate-600">{permission.code}</span>
                      {permission.description ? <span className="mt-0.5 block truncate text-slate-500">{permission.description}</span> : null}
                    </span>
                  </label>
                );
              })}
              {!pagedPermissions.length ? (
                <p className="rounded-md bg-stone-50 px-3 py-4 text-sm font-semibold text-stone-600">
                  {selectedProduct ? "No permissions found for this product service." : "Select a product service first."}
                </p>
              ) : null}
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

      <input type="hidden" name="name" value={submittedName} />
      <input type="hidden" name="description" value={submittedDescription} />
      <input type="hidden" name="permissionCode" value={primaryPermission?.code ?? ""} />
      <input type="hidden" name="selectedPermissions" value={selectedPermissionsPayload} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-3 text-sm">
        <p className="font-black text-slate-800">{selectedPermissionCodes.length ? `${selectedPermissionCodes.length} permission feature${selectedPermissionCodes.length === 1 ? "" : "s"} selected` : "Select permission features"}</p>
        <button
          type="button"
          onClick={() => setSelectedTableOpen((open) => !open)}
          disabled={!selectedPermissions.length}
          className="min-h-9 rounded-md border border-stone-300 bg-white px-3 font-bold text-slate-800 disabled:cursor-not-allowed disabled:text-stone-400"
        >
          {selectedTableOpen ? "Hide selected" : "View selected permissions"}
        </button>
      </div>

      {selectedTableOpen && selectedPermissions.length ? (
        <section className="overflow-hidden rounded-md border border-stone-200">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-stone-50 text-xs font-black uppercase text-stone-500">
              <tr>
                <th className="px-3 py-3">Permission</th>
                <th className="px-3 py-3">Display Name</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {selectedPermissions.map((permission) => (
                <tr key={permission.code}>
                  <td className="px-3 py-3 align-top">
                    <p className="break-words font-black text-slate-900">{permission.code}</p>
                    {permission.description ? <p className="mt-1 break-words text-xs font-medium text-slate-600">{permission.description}</p> : null}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <input
                      type="text"
                      value={displayNamesByCode[permission.code] ?? permission.name ?? permission.code}
                      onChange={(event) => setDisplayNamesByCode((names) => ({ ...names, [permission.code]: event.target.value }))}
                      className="min-h-10 w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-medium"
                    />
                  </td>
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
    </>
  );
}
