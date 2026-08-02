"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AutoCompleteTextField,
  type AutoCompleteTextFieldOption,
} from "@/app/_components/AutoCompleteTextField";

export function MobileDashboardSearch({
  activeView,
  initialQuery,
  options,
}: {
  activeView: "courses" | "bookings";
  initialQuery: string;
  options: AutoCompleteTextFieldOption[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const noun = activeView === "bookings" ? "bookings" : "courses and events";

  function updateSearch(value: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) params.set("search", value);
    else params.delete("search");
    params.delete("rollsPage");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="mt-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <AutoCompleteTextField
        emptyMessage={`No matching ${noun}.`}
        label={`Search ${noun}`}
        maxResults={8}
        name="mobileDashboardSearch"
        onSelectedIdChange={updateSearch}
        options={options}
        placeholder={`Start typing to search ${noun}`}
        selectedId={initialQuery}
        size="lg"
      />
    </div>
  );
}
