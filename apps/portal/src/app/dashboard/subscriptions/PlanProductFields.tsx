"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Trash2 } from "lucide-react";

type ProductOption = {
  id: string;
  name: string;
  service_id: string;
  description?: string;
  status?: string;
};

type ImportPlanOption = {
  id: string;
  name: string;
  productIds: string[];
};

function searchText(value: string) {
  return value.trim().toLowerCase();
}

function productText(product: ProductOption) {
  return `${product.name} ${product.service_id} ${product.description ?? ""} ${product.status ?? ""}`.toLowerCase();
}

export function PlanProductFields({
  importPlans,
  products,
  selectedProductIds,
}: {
  importPlans: ImportPlanOption[];
  products: ProductOption[];
  selectedProductIds: string[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedProductIds);
  const [importPlanId, setImportPlanId] = useState(importPlans[0]?.id ?? "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedTableOpen, setSelectedTableOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const normalizedSearch = searchText(search);
  const sortedProducts = useMemo(() => products.slice().sort((left, right) => left.name.localeCompare(right.name)), [products]);
  const filteredProducts = useMemo(() => {
    if (!normalizedSearch) return sortedProducts;
    return sortedProducts.filter((product) => productText(product).includes(normalizedSearch));
  }, [normalizedSearch, sortedProducts]);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedProducts = selectedIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is ProductOption => Boolean(product));

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

  function toggleProduct(productId: string) {
    setSelectedIds((current) => {
      if (current.includes(productId)) {
        return current.filter((id) => id !== productId);
      }
      return [...current, productId];
    });
  }

  function importSelectedPlan() {
    const importPlan = importPlans.find((plan) => plan.id === importPlanId);
    if (!importPlan) return;
    setSelectedIds((current) => Array.from(new Set([...current, ...importPlan.productIds])));
    setSelectedTableOpen(true);
  }

  return (
    <div className="grid gap-3">
      {selectedIds.map((productId) => <input key={productId} type="hidden" name="productIds" value={productId} />)}
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
        Products
        <button
          type="button"
          onClick={() => setDropdownOpen((open) => !open)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-stone-300 bg-white px-3 py-2 text-left font-medium text-slate-800"
          aria-expanded={dropdownOpen}
        >
          <span className="truncate">{selectedIds.length ? `${selectedIds.length} selected` : "Select products"}</span>
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
                  placeholder="Search products"
                  className="min-h-11 w-full rounded-md border border-stone-300 pl-10 pr-3 text-sm font-medium outline-none focus:border-teal-700"
                />
              </span>
            </div>
            <div className="p-2">
              {pagedProducts.map((product) => {
                const checked = selectedIds.includes(product.id);
                return (
                  <label key={product.id} className="grid min-h-14 cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-md px-3 py-2 text-sm hover:bg-stone-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProduct(product.id)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-black text-slate-900">{product.name}</span>
                      <span className="block break-words font-medium text-slate-600">{product.service_id}</span>
                      {product.description ? <span className="mt-0.5 block truncate text-slate-500">{product.description}</span> : null}
                    </span>
                  </label>
                );
              })}
              {!pagedProducts.length ? (
                <p className="rounded-md bg-stone-50 px-3 py-4 text-sm font-semibold text-stone-600">No products found.</p>
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
        <p className="font-black text-slate-800">{selectedIds.length ? `${selectedIds.length} product${selectedIds.length === 1 ? "" : "s"} selected` : "Select products"}</p>
        <button
          type="button"
          onClick={() => setSelectedTableOpen((open) => !open)}
          disabled={!selectedProducts.length}
          className="min-h-9 rounded-md border border-stone-300 bg-white px-3 font-bold text-slate-800 disabled:cursor-not-allowed disabled:text-stone-400"
        >
          {selectedTableOpen ? "Hide selected" : "View selected products"}
        </button>
      </div>

      {selectedTableOpen && selectedProducts.length ? (
        <section className="overflow-hidden rounded-md border border-stone-200">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-stone-50 text-xs font-black uppercase text-stone-500">
              <tr>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Service</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {selectedProducts.map((product) => (
                <tr key={product.id}>
                  <td className="px-3 py-3 align-top">
                    <p className="break-words font-black text-slate-900">{product.name}</p>
                    {product.description ? <p className="mt-1 break-words text-xs font-medium text-slate-600">{product.description}</p> : null}
                  </td>
                  <td className="px-3 py-3 align-top font-medium text-slate-700">{product.service_id}</td>
                  <td className="px-3 py-3 align-top font-medium text-slate-700">{product.status ?? "ACTIVE"}</td>
                  <td className="px-3 py-3 text-right align-top">
                    <button
                      type="button"
                      onClick={() => toggleProduct(product.id)}
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
