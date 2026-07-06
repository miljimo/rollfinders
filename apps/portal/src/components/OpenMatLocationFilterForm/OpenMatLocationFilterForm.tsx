"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { selectableCourseTypeOptions } from "@/lib/course-types";
import { FilterSelect } from "./FilterSelect";
import { LocationFilterInput } from "./LocationFilterInput";

const whenOptions = [
  { label: "Any upcoming", value: "" },
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "This weekend", value: "weekend" },
];

const giOptions = [
  { label: "Any style", value: "" },
  { label: "Gi", value: "GI" },
  { label: "No-Gi", value: "NO_GI" },
];

const courseTypeOptions = [
  { label: "Open Mat", value: "OPEN_MAT" },
  { label: "Any type", value: "ANY" },
  ...selectableCourseTypeOptions.filter((option) => option.value !== "OPEN_MAT"),
];

function locationValues(searchParams: URLSearchParams) {
  return {
    lat: searchParams.get("lat") ?? "",
    lng: searchParams.get("lng") ?? "",
  };
}

export function OpenMatLocationFilterForm({ action = "/open-mats", q, when, gi, courseType, variant = "default" }: {
  action?: string;
  q: string;
  when: string;
  gi: string;
  courseType: string;
  variant?: "default" | "hero";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const searchParams = new URLSearchParams(currentSearchParams?.toString());
  const { lat, lng } = locationValues(searchParams);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (lat || lng) return;
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyLocation(nextLat: string, nextLng: string) {
    const next = new URLSearchParams(searchParams);
    next.set("lat", nextLat);
    next.set("lng", nextLng);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function requestLocation() {
    if (!navigator.geolocation || locating) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyLocation(position.coords.latitude.toFixed(6), position.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  const hero = variant === "hero";

  return (
    <form action={action} className={hero ? "grid gap-4 lg:grid-cols-[1fr_180px_180px_170px_auto]" : "grid gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm lg:grid-cols-[1fr_180px_180px_210px_auto]"}>
      <input type="hidden" name="analyticsIntent" value="open_mat_search" />
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <LocationFilterInput locating={locating} q={q} requestLocation={requestLocation} />
      <FilterSelect defaultValue={when} name="when" options={whenOptions} />
      <FilterSelect defaultValue={gi} name="gi" options={giOptions} />
      <FilterSelect defaultValue={courseType} name="courseType" options={courseTypeOptions} />
      <Button type="submit" variant="primary" className={hero ? "min-h-14 rounded-md bg-teal-700 px-8 text-base font-black shadow-[inset_0_0_18px_rgba(255,255,255,0.12)]" : "min-h-12 px-5 font-semibold"}>
        <Search size={16} aria-hidden />
        Search
      </Button>
    </form>
  );
}
