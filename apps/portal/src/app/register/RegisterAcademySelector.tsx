"use client";

import { useState } from "react";
import {
  AutoCompleteTextField,
  type AutoCompleteTextFieldOption,
} from "@/components/AutoCompleteTextField";

export type RegisterAcademySelection = {
  city?: string | null;
  id: string;
  name: string;
  postcode?: string | null;
  slug?: string | null;
};

export function RegisterAcademySelector({
  academy,
  options,
}: {
  academy?: RegisterAcademySelection | null;
  options: AutoCompleteTextFieldOption[];
}) {
  const [choosing, setChoosing] = useState(!academy);

  if (academy && !choosing) {
    return (
      <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm leading-6 text-teal-950">
        <input type="hidden" name="academyId" value={academy.id} />
        <input type="hidden" name="academySlug" value={academy.slug ?? ""} />
        <p className="font-black">{academy.name}</p>
        <p>{[academy.city, academy.postcode].filter(Boolean).join(", ")}</p>
        <button
          type="button"
          onClick={() => setChoosing(true)}
          className="mt-2 inline-flex text-sm font-bold text-teal-900 underline-offset-4 hover:underline"
        >
          Choose a different academy
        </button>
      </div>
    );
  }

  return (
    <AutoCompleteTextField
      emptyMessage="No academies matched that search."
      label={academy ? "Choose a different academy" : "Find your academy"}
      name="academyId"
      options={options}
      placeholder="Search by academy name, city, or postcode"
      size="lg"
    />
  );
}
