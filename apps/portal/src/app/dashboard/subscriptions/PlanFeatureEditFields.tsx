"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Trash2 } from "lucide-react";

type ProductOption = {
  id: string;
  name: string;
  service_id: string;
  description?: string;
  currency?: string;
  price_minor?: number;
};

type ExistingFeature = {
  id?: string;
  product_id: string;
  feature_key: string;
  name: string;
  description: string;
  subscription_controlled: boolean;
};

type SearchableProductFeature = ExistingFeature & {
  service_id?: string;
};

function searchText(value: string) {
  return value.trim().toLowerCase();
}

function productSearchText(product: ProductOption, features: SearchableProductFeature[]) {
  return [
    product.name,
    product.service_id,
    product.description ?? "",
    ...features.filter((feature) => feature.product_id === product.id).flatMap((feature) => [
      feature.name,
      feature.feature_key,
      feature.description,
      feature.service_id ?? "",
    ]),
  ].join(" ").toLowerCase();
}

function productPriceLabel(product: ProductOption) {
  const currency = product.currency || "GBP";
  const amount = product.price_minor ?? 0;
  if (currency === "Points") return `${amount.toLocaleString("en-GB")} Points`;
  return `${currency} ${(amount / 100).toFixed(2)}`;
}

function productPriceTotals(products: ProductOption[]) {
  const totals = new Map<string, number>();
  for (const product of products) {
    const currency = product.currency || "GBP";
    totals.set(currency, (totals.get(currency) ?? 0) + (product.price_minor ?? 0));
  }
  return Array.from(totals.entries()).sort(([left], [right]) => left.localeCompare(right));
}

function priceTotalLabel(currency: string, amount: number) {
  if (currency === "Points") return `${amount.toLocaleString("en-GB")} Points`;
  return `${currency} ${(amount / 100).toFixed(2)}`;
}

export function PlanFeatureEditFields({ feature, features = [], products }: { feature?: ExistingFeature; features?: SearchableProductFeature[]; products: ProductOption[] }) {
  const matchingFeatureProductIds = feature
    ? features
      .filter((item) => item.feature_key === feature.feature_key && item.name === feature.name)
      .map((item) => item.product_id)
      .filter(Boolean)
    : [];
  const initialProductIds = feature
    ? Array.from(new Set([feature.product_id, ...matchingFeatureProductIds]))
    : products[0]?.id ? [products[0].id] : [];
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(initialProductIds);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedTableOpen, setSelectedTableOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const normalizedSearch = searchText(search);
  const sortedProducts = useMemo(() => products.slice().sort((left, right) => left.name.localeCompare(right.name)), [products]);
  const filteredProducts = useMemo(() => {
    if (!normalizedSearch) return sortedProducts;
    return sortedProducts.filter((product) => productSearchText(product, features).includes(normalizedSearch));
  }, [features, normalizedSearch, sortedProducts]);
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedProducts = selectedProductIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is ProductOption => Boolean(product));
  const selectedPriceTotals = productPriceTotals(selectedProducts);
  const singleCurrencyTotal = selectedPriceTotals.length === 1 ? selectedPriceTotals[0] : null;

  useEffect(() => {
    if (!dropdownOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) setDropdownOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [dropdownOpen]);

  function toggleProduct(productId: string) {
    setSelectedProductIds((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]);
  }

  return (
    <>
      <label className="grid gap-1 text-sm font-bold text-slate-700">
        Name
        <input
          name="name"
          type="text"
          defaultValue={feature?.name ?? ""}
          placeholder="Enter plan feature display name"
          className="min-h-11 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium"
        />
      </label>

      <input type="hidden" name="featureKey" value={feature?.feature_key ?? ""} />
      {feature?.product_id ? <input type="hidden" name="currentProductId" value={feature.product_id} /> : null}
      {matchingFeatureProductIds.map((productId) => (
        <input key={`existing-${productId}`} type="hidden" name="existingProductIds" value={productId} />
      ))}
      {selectedProductIds.map((productId) => (
        <input key={productId} type="hidden" name="productIds" value={productId} />
      ))}

      <div ref={dropdownRef} className="grid gap-1 text-sm font-bold text-slate-700">
        Products
        <button
          type="button"
          onClick={() => setDropdownOpen((open) => !open)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-stone-300 bg-white px-3 py-2 text-left font-medium text-slate-800"
          aria-expanded={dropdownOpen}
        >
          <span className="truncate">{selectedProductIds.length ? `${selectedProductIds.length} selected` : "Search products, services, or permissions"}</span>
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
                  placeholder="Search products, services, or permissions"
                  className="min-h-11 w-full rounded-md border border-stone-300 pl-10 pr-3 text-sm font-medium outline-none focus:border-teal-700"
                />
              </span>
            </div>
            <div className="p-2">
              {pagedProducts.map((product) => {
                const checked = selectedProductIds.includes(product.id);
                return (
                  <label key={product.id} className="grid min-h-14 cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-md px-3 py-2 text-sm hover:bg-stone-50">
                    <input type="checkbox" checked={checked} onChange={() => toggleProduct(product.id)} className="mt-1" />
                    <span className="min-w-0">
                      <span className="block truncate font-black text-slate-900">{product.name}</span>
                      <span className="block break-words font-medium text-slate-600">{product.service_id}</span>
                      {product.description ? <span className="mt-0.5 block truncate text-slate-500">{product.description}</span> : null}
                    </span>
                  </label>
                );
              })}
              {!pagedProducts.length ? <p className="rounded-md bg-stone-50 px-3 py-4 text-sm font-semibold text-stone-600">No products match that product, service, or permission.</p> : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-3 py-3 text-sm font-semibold text-slate-600">
              <span>{selectedProductIds.length} selected</span>
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
        <p className="font-black text-slate-800">{selectedProducts.length ? `${selectedProducts.length} product${selectedProducts.length === 1 ? "" : "s"} selected` : "Select at least one product"}</p>
        <button
          type="button"
          onClick={() => setSelectedTableOpen((open) => !open)}
          disabled={!selectedProducts.length}
          className="min-h-9 rounded-md border border-stone-300 bg-white px-3 font-bold text-slate-800 disabled:cursor-not-allowed disabled:text-stone-400"
        >
          {selectedTableOpen ? "Hide selected products" : "View selected products"}
        </button>
      </div>

      {selectedTableOpen && selectedProducts.length ? (
        <section className="overflow-hidden rounded-md border border-stone-200">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-stone-50 text-xs font-black uppercase text-stone-500">
              <tr>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Service</th>
                <th className="px-3 py-3">Price</th>
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
                  <td className="px-3 py-3 align-top font-medium text-slate-700">{productPriceLabel(product)}</td>
                  <td className="px-3 py-3 text-right align-top">
                    <button type="button" onClick={() => toggleProduct(product.id)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-bold text-red-700 hover:bg-red-50">
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

      <div className="grid gap-1">
        <div className="grid items-end gap-3 sm:grid-cols-[10rem_12rem_minmax(16rem,1fr)]">
          <label className="grid min-w-0 gap-1 text-sm font-bold text-slate-700">
            Currency
            <input
              readOnly
              value={singleCurrencyTotal?.[0] ?? (selectedPriceTotals.length ? "Mixed" : "GBP")}
              className="min-h-11 w-full rounded-md border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-medium text-slate-700"
            />
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-bold text-slate-700">
            Monthly minor
            <input
              readOnly
              value={singleCurrencyTotal ? String(singleCurrencyTotal[1]) : selectedPriceTotals.length ? "Mixed" : "0"}
              className="min-h-11 w-full rounded-md border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-medium text-slate-700"
            />
          </label>
          <div className="grid min-w-0 gap-1 text-sm font-bold text-slate-700">
            Monthly total
            <div className="flex min-h-11 items-center rounded-md border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-black text-teal-800">
              {selectedPriceTotals.length ? selectedPriceTotals.map(([currency, amount]) => priceTotalLabel(currency, amount)).join(" / ") : "GBP 0.00"}
            </div>
          </div>
        </div>
        <span className="text-xs font-semibold leading-5 text-slate-500">
          Calculated from selected product prices.
        </span>
      </div>

      <input type="hidden" name="description" value={feature?.description ?? ""} />

      <label className="flex items-start gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-slate-700">
        <input
          name="subscriptionControlled"
          type="checkbox"
          defaultChecked={feature?.subscription_controlled ?? true}
          className="mt-1 h-4 w-4 rounded border-stone-300 text-teal-700"
        />
        <span>
          <span className="block font-black text-slate-800">Subscription controlled</span>
          <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
            Require an active plan with this feature before API Gateway allows the action.
          </span>
        </span>
      </label>
    </>
  );
}
