"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AutoCompleteTextField, type AutoCompleteTextFieldOption } from "@/app/_components/AutoCompleteTextField";

export function SubscriptionCategoryCombobox({
  categories,
  selectedCategory,
}: {
  categories: string[];
  selectedCategory: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const options: AutoCompleteTextFieldOption[] = categories.map((category) => ({
    id: category,
    label: category === "All" ? "All modules" : category,
  }));

  return (
    <div className="max-w-sm">
      <AutoCompleteTextField
        label="Filter modules"
        name="marketplaceCategory"
        options={options}
        placeholder="Search module category..."
        selectedId={selectedCategory}
        onSelectedIdChange={(category) => {
          const params = new URLSearchParams(searchParams?.toString() ?? "");
          if (!category || category === "All") {
            params.delete("marketplaceCategory");
          } else {
            params.set("marketplaceCategory", category);
          }
          router.push(`${pathname}?${params.toString()}`);
        }}
      />
    </div>
  );
}
