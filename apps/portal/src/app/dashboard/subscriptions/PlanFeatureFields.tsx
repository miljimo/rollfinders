"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Trash2 } from "lucide-react";

type FeatureOption = {
  id: string;
  name: string;
  feature_key: string;
  product_id: string;
  service_id?: string;
  description?: string;
  status?: string;
  currency?: string;
  base_price_minor?: number;
};

type ImportPlanOption = {
  featureIds: string[];
  id: string;
  name: string;
};

function searchText(value: string) {
  return value.trim().toLowerCase();
}

function featureText(feature: FeatureOption) {
  return `${feature.name} ${feature.feature_key} ${feature.product_id} ${feature.service_id ?? ""} ${feature.description ?? ""} ${feature.status ?? ""}`.toLowerCase();
}

function priceLabel(feature: FeatureOption) {
  const currency = feature.currency || "GBP";
  const amount = feature.base_price_minor ?? 0;
  if (currency === "Points") return `${amount.toLocaleString("en-GB")} Points`;
  return `${currency} ${(amount / 100).toFixed(2)}`;
}

export function PlanFeatureFields({
  features,
  importPlans,
  selectedFeatureIds,
}: {
  features: FeatureOption[];
  importPlans: ImportPlanOption[];
  selectedFeatureIds: string[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedFeatureIds);
  const [importPlanId, setImportPlanId] = useState(importPlans[0]?.id ?? "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedTableOpen, setSelectedTableOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const normalizedSearch = searchText(search);
  const sortedFeatures = useMemo(() => features.slice().sort((left, right) => left.name.localeCompare(right.name)), [features]);
  const filteredFeatures = useMemo(() => {
    if (!normalizedSearch) return sortedFeatures;
    return sortedFeatures.filter((feature) => featureText(feature).includes(normalizedSearch));
  }, [normalizedSearch, sortedFeatures]);
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredFeatures.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedFeatures = filteredFeatures.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedFeatures = selectedIds
    .map((id) => features.find((feature) => feature.id === id))
    .filter((feature): feature is FeatureOption => Boolean(feature));

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

  function toggleFeature(featureId: string) {
    setSelectedIds((current) => current.includes(featureId) ? current.filter((id) => id !== featureId) : [...current, featureId]);
  }

  function importSelectedPlan() {
    const importPlan = importPlans.find((plan) => plan.id === importPlanId);
    if (!importPlan) return;
    setSelectedIds((current) => Array.from(new Set([...current, ...importPlan.featureIds])));
    setSelectedTableOpen(true);
  }

  return (
    <div className="grid gap-3">
      {selectedIds.map((featureId) => (
        <input key={featureId} type="hidden" name="featureIds" value={featureId} />
      ))}
      {importPlans.length ? (
        <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="grid min-w-0 gap-1 text-sm font-bold text-slate-700">
              Import Plan
              <select
                value={importPlanId}
                onChange={(event) => setImportPlanId(event.target.value)}
                className="min-h-11 rounded-md border border-stone-300 bg-white px-3 py-2 font-medium"
              >
                {importPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={importSelectedPlan}
              disabled={!importPlanId}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-teal-700 bg-white px-5 text-sm font-black text-teal-800 hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
            >
              Import
            </button>
          </div>
        </div>
      ) : null}
      <div ref={dropdownRef} className="grid gap-1 text-sm font-bold text-slate-700">
        Features
        <button
          type="button"
          onClick={() => setDropdownOpen((open) => !open)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-stone-300 bg-white px-3 py-2 text-left font-medium text-slate-800"
          aria-expanded={dropdownOpen}
        >
          <span className="truncate">{selectedIds.length ? `${selectedIds.length} selected` : "Select features"}</span>
          <ChevronDown size={18} aria-hidden />
        </button>
        {dropdownOpen ? (
          <section className="mt-1 overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-200 p-3">
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={17} aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search features"
                  className="min-h-11 w-full rounded-md border border-stone-300 pl-10 pr-3 text-sm font-medium outline-none focus:border-teal-700"
                />
              </span>
            </div>
            <div className="p-2">
              {pagedFeatures.map((feature) => {
                const checked = selectedIds.includes(feature.id);
                return (
                  <label key={feature.id} className="grid min-h-14 cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-md px-3 py-2 text-sm hover:bg-stone-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFeature(feature.id)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-black text-slate-900">{feature.name}</span>
                      <span className="block break-words font-medium text-slate-600">{feature.feature_key}</span>
                      {feature.description ? <span className="mt-0.5 block truncate text-slate-500">{feature.description}</span> : null}
                    </span>
                  </label>
                );
              })}
              {!pagedFeatures.length ? (
                <p className="rounded-md bg-stone-50 px-3 py-4 text-sm font-semibold text-stone-600">No features found.</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-3 py-3 text-sm font-semibold text-slate-600">
              <span>{selectedIds.length} selected</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="min-h-9 rounded-md border border-stone-300 px-3 disabled:opacity-40">Previous</button>
                <span>Page {currentPage} of {totalPages}</span>
                <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="min-h-9 rounded-md border border-stone-300 px-3 disabled:opacity-40">Next</button>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-3 text-sm">
        <p className="font-black text-slate-800">{selectedIds.length ? `${selectedIds.length} feature${selectedIds.length === 1 ? "" : "s"} selected` : "Select features"}</p>
        <button
          type="button"
          onClick={() => setSelectedTableOpen((open) => !open)}
          disabled={!selectedFeatures.length}
          className="min-h-9 rounded-md border border-stone-300 bg-white px-3 font-bold text-slate-800 disabled:cursor-not-allowed disabled:text-stone-400"
        >
          {selectedTableOpen ? "Hide selected" : "View selected features"}
        </button>
      </div>

      {selectedTableOpen && selectedFeatures.length ? (
        <section className="overflow-hidden rounded-md border border-stone-200">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-stone-50 text-xs font-black uppercase text-stone-500">
              <tr>
                <th className="px-3 py-3">Feature</th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Base price</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {selectedFeatures.map((feature) => (
                <tr key={feature.id}>
                  <td className="px-3 py-3 align-top">
                    <p className="break-words font-black text-slate-900">{feature.name}</p>
                    <p className="mt-1 break-words text-xs font-medium text-slate-600">{feature.feature_key}</p>
                  </td>
                  <td className="px-3 py-3 align-top font-medium text-slate-700">{feature.product_id}</td>
                  <td className="px-3 py-3 align-top font-medium text-slate-700">{priceLabel(feature)}</td>
                  <td className="px-3 py-3 align-top font-medium text-slate-700">{feature.status ?? "ACTIVE"}</td>
                  <td className="px-3 py-3 text-right align-top">
                    <button
                      type="button"
                      onClick={() => toggleFeature(feature.id)}
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
