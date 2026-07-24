"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";

export type MobileSearchSuggestion = {
  description?: string;
  label: string;
};

function normalized(value: string) {
  return value.trim().toLowerCase();
}

function uniqueSuggestions(suggestions: MobileSearchSuggestion[]) {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const key = normalized(`${suggestion.label} ${suggestion.description ?? ""}`);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function MobileDiscoverySearch({ initialQuery, suggestions }: { initialQuery: string; suggestions: MobileSearchSuggestion[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const options = useMemo(() => uniqueSuggestions(suggestions), [suggestions]);
  const visibleOptions = useMemo(() => {
    const value = normalized(query);
    const matched = value
      ? options.filter((option) => normalized(`${option.label} ${option.description ?? ""}`).includes(value))
      : options;
    return matched.slice(0, 6);
  }, [options, query]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    const value = query.trim();
    next.set("tab", "search");
    if (value) next.set("q", value);
    else next.delete("q");
    const href = `${pathname}?${next.toString()}`;
    const timer = window.setTimeout(() => {
      if (query.trim() !== initialQuery.trim()) router.replace(href, { scroll: false });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [initialQuery, pathname, query, router, searchParams]);

  function suggestionHref(value: string) {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    next.set("tab", "search");
    next.set("q", value);
    return `${pathname}?${next.toString()}`;
  }

  return (
    <div className="relative mt-5 min-w-0 max-w-full">
      <div className="flex min-h-14 min-w-0 items-center overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)] focus-within:border-teal-700">
        <Search className="ml-3 shrink-0 text-teal-800" size={18} aria-hidden />
        <input
          aria-autocomplete="list"
          aria-label="Search open mats and academies"
          autoComplete="off"
          name="q"
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onFocus={() => setFocused(true)}
          placeholder="Academy, postcode, gi, no-gi"
          type="search"
          value={query}
          className="min-w-0 flex-1 bg-transparent px-2 text-base text-slate-950 outline-none placeholder:text-stone-500"
        />
        <button type="button" className="mr-1 flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white shadow-[0_14px_32px_rgba(0,121,107,0.22)]" aria-label="Search filters">
          <SlidersHorizontal size={23} aria-hidden />
        </button>
      </div>
      {focused && visibleOptions.length ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.12)]">
          {visibleOptions.map((option) => (
            <Link key={`${option.label}-${option.description ?? ""}`} href={suggestionHref(option.label)} className="block px-3 py-3 text-sm hover:bg-teal-50 focus:bg-teal-50 focus:outline-none">
              <span className="block font-black text-stone-950">{option.label}</span>
              {option.description ? <span className="mt-0.5 block text-xs font-semibold text-stone-600">{option.description}</span> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
