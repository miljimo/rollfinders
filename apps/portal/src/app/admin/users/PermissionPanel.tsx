"use client";

import { useMemo, useState, useTransition } from "react";
import { BookOpen, CalendarDays, Check, ChevronsLeft, ChevronsRight, CreditCard, Landmark, Loader2, Search, Settings, ShieldCheck, Users, Wallet, XCircle } from "lucide-react";
import type { AssignableUserFeature } from "@/lib/users-service";
import { applyManagedUserPrivileges } from "./actions";

type Permission = AssignableUserFeature["permissions"][number];
const pageSize = 10;

function permissionText(permission: Permission) {
  return `${permission.code} ${permission.name} ${permission.description ?? ""}`.toLowerCase();
}

function featureText(feature: AssignableUserFeature) {
  return `${feature.name} ${feature.key} ${feature.permissions.map(permissionText).join(" ")}`.toLowerCase();
}

function FeatureIcon({ featureKey }: { featureKey: string }) {
  const key = featureKey.toLowerCase();
  const Icon = key.includes("course") ? BookOpen
    : key.includes("booking") ? CalendarDays
    : key.includes("payment") || key.includes("stripe") ? CreditCard
    : key.includes("withdraw") || key.includes("payout") ? Wallet
    : key.includes("user") ? Users
    : key.includes("setting") ? Settings
    : key.includes("academy") ? Landmark
    : ShieldCheck;

  return <Icon size={18} aria-hidden />;
}

export function PermissionPanel({
  features,
  userId,
}: {
  features: AssignableUserFeature[];
  userId: string;
}) {
  const [search, setSearch] = useState("");
  const [selectedFeatureKey, setSelectedFeatureKey] = useState(features[0]?.key ?? "");
  const [assignedByFeature, setAssignedByFeature] = useState<Record<string, Set<string>>>(() => {
    return Object.fromEntries(features.map((feature) => [feature.key, new Set(feature.permissions.filter((permission) => permission.assigned).map((permission) => permission.code))]));
  });
  const [page, setPage] = useState(1);
  const [featurePage, setFeaturePage] = useState(1);
  const [showAssigned, setShowAssigned] = useState(true);
  const [showNotAssigned, setShowNotAssigned] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const normalizedSearch = search.trim().toLowerCase();

  const visibleFeatures = useMemo(() => {
    if (!normalizedSearch) return features;
    return features.filter((feature) => featureText(feature).includes(normalizedSearch));
  }, [features, normalizedSearch]);

  const selectedFeature = useMemo(() => {
    return visibleFeatures.find((feature) => feature.key === selectedFeatureKey) ?? visibleFeatures[0] ?? features[0];
  }, [features, selectedFeatureKey, visibleFeatures]);

  const selectedAssigned = selectedFeature ? assignedByFeature[selectedFeature.key] ?? new Set<string>() : new Set<string>();
  const selectedAssignableCount = selectedFeature?.permissions.filter((permission) => permission.assignable !== false).length ?? 0;
  const filteredPermissions = useMemo(() => {
    const permissions = selectedFeature?.permissions ?? [];
    const matching = normalizedSearch ? permissions.filter((permission) => permissionText(permission).includes(normalizedSearch)) : permissions;
    return matching.filter((permission) => {
      const assigned = selectedAssigned.has(permission.code);
      return assigned ? showAssigned : showNotAssigned;
    });
  }, [normalizedSearch, selectedAssigned, selectedFeature, showAssigned, showNotAssigned]);

  const totalPages = Math.max(1, Math.ceil(filteredPermissions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedPermissions = filteredPermissions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalFeaturePages = Math.max(1, Math.ceil(visibleFeatures.length / pageSize));
  const currentFeaturePage = Math.min(featurePage, totalFeaturePages);
  const pagedFeatures = visibleFeatures.slice((currentFeaturePage - 1) * pageSize, currentFeaturePage * pageSize);
  const assignedCount = selectedFeature?.permissions.filter((permission) => selectedAssigned.has(permission.code)).length ?? 0;

  function selectFeature(featureKey: string) {
    setSelectedFeatureKey(featureKey);
    setPage(1);
    setMessage(null);
  }

  function goToFeaturePage(nextPage: number) {
    const boundedPage = Math.min(totalFeaturePages, Math.max(1, nextPage));
    setFeaturePage(boundedPage);
    const nextFeature = visibleFeatures[(boundedPage - 1) * pageSize];
    if (nextFeature) selectFeature(nextFeature.key);
  }

  function togglePermission(code: string) {
    if (!selectedFeature) return;
    const permission = selectedFeature.permissions.find((item) => item.code === code);
    if (permission?.assignable === false) return;
    setMessage(null);
    setAssignedByFeature((current) => {
      const next = { ...current };
      const assigned = new Set(next[selectedFeature.key] ?? []);
      if (assigned.has(code)) assigned.delete(code);
      else assigned.add(code);
      next[selectedFeature.key] = assigned;
      return next;
    });
  }

  function clearFeaturePermissions() {
    if (!selectedFeature) return;
    setMessage(null);
    setAssignedByFeature((current) => ({ ...current, [selectedFeature.key]: new Set<string>() }));
  }

  function applyChanges() {
    if (!selectedFeature) return;
    const assigned = assignedByFeature[selectedFeature.key] ?? new Set<string>();
    const assignablePermissions = selectedFeature.permissions.filter((permission) => permission.assignable !== false);
    const initiallyAssigned = new Set(assignablePermissions.filter((permission) => permission.assigned).map((permission) => permission.code));
    const grant = assignablePermissions.map((permission) => permission.code).filter((code) => assigned.has(code) && !initiallyAssigned.has(code));
    const revoke = assignablePermissions.map((permission) => permission.code).filter((code) => !assigned.has(code) && initiallyAssigned.has(code));

    setMessage(null);
    startTransition(async () => {
      try {
        await applyManagedUserPrivileges(userId, { feature: selectedFeature.key, grant, revoke });
        setMessage({ type: "success", text: "Permissions updated." });
      } catch (error) {
        setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to update permissions." });
      }
    });
  }

  if (!features.length) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-stone-950">Permission Assignment</h2>
        <p className="mt-2 text-sm font-medium text-stone-600">No permissions are available for this user yet.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 p-6">
        <h2 className="text-xl font-black text-stone-950">Permission Assignment</h2>
        <p className="mt-2 text-sm font-medium text-stone-600">Search for a feature to view role-based permissions and manage the permissions you can assign to this user.</p>
        <label className="relative mt-7 block max-w-xl">
          <span className="sr-only">Search feature</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={18} aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
              setFeaturePage(1);
            }}
            placeholder="Search feature..."
            className="min-h-12 w-full rounded-md border border-stone-300 pl-12 pr-10 text-base font-medium text-stone-950 outline-none focus:border-teal-700"
          />
        </label>
      </div>

      <div className="grid min-h-[33rem] lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
        <aside className="border-b border-stone-200 p-6 lg:border-b-0 lg:border-r">
          <h3 className="text-lg font-black text-stone-950">Select Feature</h3>
          <p className="mt-1 text-sm font-medium text-stone-600">Select a feature.</p>
          <div className="mt-6 grid gap-2">
            {pagedFeatures.map((feature) => {
              const active = feature.key === selectedFeature?.key;
              return (
                <button
                  key={feature.key}
                  type="button"
                  onClick={() => selectFeature(feature.key)}
                  className={`grid min-h-12 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-md px-3 text-left text-sm font-bold ${
                    active ? "bg-teal-50 text-teal-900 ring-1 ring-teal-100" : "text-stone-800 hover:bg-stone-50"
                  }`}
                >
                  <FeatureIcon featureKey={feature.key} />
                  <span className="truncate">{feature.name}</span>
                </button>
              );
            })}
            {!visibleFeatures.length ? <p className="rounded-md bg-stone-50 px-3 py-4 text-sm font-semibold text-stone-600">No matching assignable features.</p> : null}
          </div>
          {visibleFeatures.length > pageSize ? (
            <div className="mt-5 flex items-center justify-between gap-2 border-t border-stone-100 pt-4 text-sm font-semibold text-stone-600">
              <span>
                {((currentFeaturePage - 1) * pageSize) + 1}-{Math.min(currentFeaturePage * pageSize, visibleFeatures.length)} of {visibleFeatures.length}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" className="inline-flex size-9 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentFeaturePage === 1} onClick={() => goToFeaturePage(currentFeaturePage - 1)}>‹</button>
                <span className="inline-flex size-9 items-center justify-center rounded-md bg-stone-950 text-white">{currentFeaturePage}</span>
                <button type="button" className="inline-flex size-9 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentFeaturePage === totalFeaturePages} onClick={() => goToFeaturePage(currentFeaturePage + 1)}>›</button>
              </div>
            </div>
          ) : null}
        </aside>

        <div className="min-w-0 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-stone-950">{selectedFeature?.name ?? "Feature"} Permissions</h3>
              <p className="mt-2 text-sm font-medium text-stone-600">Role-based permissions are shown checked by default. Only permissions returned as assignable can be changed here.</p>
            </div>
            <button
              type="button"
              onClick={clearFeaturePermissions}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50"
            >
              <XCircle size={17} aria-hidden />
              Clear All
            </button>
          </div>

          <div className="mt-7 overflow-hidden">
            <div className="grid grid-cols-[minmax(220px,280px)_minmax(240px,1fr)_110px] gap-5 border-b border-stone-200 px-3 py-3 text-sm font-black text-stone-700">
              <span>Permission</span>
              <span>Description</span>
              <span className="text-right">Assigned</span>
            </div>
            <div className="max-h-[27rem] overflow-auto">
              {pagedPermissions.map((permission) => {
                const checked = selectedAssigned.has(permission.code);
                const disabled = permission.assignable === false;
                return (
                  <label key={permission.code} className="grid grid-cols-[minmax(220px,280px)_minmax(240px,1fr)_110px] items-center gap-5 border-b border-stone-100 px-3 py-3 text-sm last:border-b-0">
                    <span className="break-words font-black text-stone-950">{permission.code}</span>
                    <span className="min-w-0 text-stone-700">{permission.description || permission.name}</span>
                    <span className="flex justify-end">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => togglePermission(permission.code)}
                        className="h-5 w-5 rounded border-stone-300 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                        title={disabled ? "Assigned by role" : undefined}
                      />
                    </span>
                  </label>
                );
              })}
              {!pagedPermissions.length ? <p className="px-4 py-10 text-center text-sm font-semibold text-stone-600">No matching assignable permissions.</p> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 px-6 py-4 text-sm font-medium text-stone-700">
        <span>Showing {filteredPermissions.length ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredPermissions.length)} of {filteredPermissions.length} permissions</span>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentPage === 1} onClick={() => setPage(1)}><ChevronsLeft size={17} aria-hidden /></button>
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>
          <span className="inline-flex size-10 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">{currentPage}</span>
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>›</button>
          <button type="button" className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 disabled:opacity-40" disabled={currentPage === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight size={17} aria-hidden /></button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 bg-stone-50 p-6">
        <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-stone-700">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={showAssigned} onChange={(event) => setShowAssigned(event.target.checked)} className="h-5 w-5 rounded border-stone-300 accent-blue-600" />
            Assigned
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={showNotAssigned} onChange={(event) => setShowNotAssigned(event.target.checked)} className="h-5 w-5 rounded border-stone-300 accent-blue-600" />
            Not Assigned
          </label>
          <span>{assignedCount} of {selectedFeature?.permissions.length ?? 0} permissions assigned</span>
          {selectedAssignableCount === 0 ? <span className="text-stone-500">Shown permissions come from the assigned role.</span> : null}
          {message ? <span className={message.type === "success" ? "text-teal-800" : "text-red-700"}>{message.text}</span> : null}
        </div>
        <button
          type="button"
          onClick={applyChanges}
          disabled={pending || !selectedFeature || selectedAssignableCount === 0}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-stone-950 px-6 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {pending ? <Loader2 className="animate-spin" size={16} aria-hidden /> : <Check size={16} aria-hidden />}
          Apply Permissions
        </button>
      </div>
    </section>
  );
}
