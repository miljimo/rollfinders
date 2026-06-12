"use client";

import { useEffect, useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "./Button";
import { selectableCourseTypeOptions } from "@/lib/course-types";

function locationValues(searchParams: URLSearchParams) {
  return {
    lat: searchParams.get("lat") ?? "",
    lng: searchParams.get("lng") ?? "",
  };
}

export function OpenMatLocationFilterForm({
  q,
  when,
  gi,
  courseType,
}: {
  q: string;
  when: string;
  gi: string;
  courseType: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lat, lng } = locationValues(searchParams);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (lat || lng) return;
    requestLocation();
    // Only run on initial page hydration for open mat filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyLocation(nextLat: string, nextLng: string) {
    const next = new URLSearchParams(searchParams.toString());
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

  return (
    <form action="/open-mats" className="grid gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm lg:grid-cols-[1fr_180px_180px_210px_auto]">
      <input type="hidden" name="analyticsIntent" value="open_mat_search" />
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <div className="flex min-h-12 items-center rounded-md border border-stone-200 bg-white focus-within:border-teal-700">
        <Button
          type="button"
          size="icon"
          variant="subtle"
          onClick={requestLocation}
          disabled={locating}
          className="size-12 shrink-0 rounded-l-md text-teal-800 hover:bg-teal-50"
          aria-label={locating ? "Finding your location" : "Use your current location"}
          title={locating ? "Finding your location" : lat && lng ? "Location enabled" : "Use your current location"}
        >
          <LocateFixed size={18} aria-hidden />
        </Button>
        <input
          name="q"
          defaultValue={q}
          placeholder="Search academy, borough, postcode, gi, no-gi, competition"
          className="min-h-12 flex-1 border-0 px-2 text-base text-stone-950 outline-none placeholder:text-stone-500"
        />
      </div>
      <select name="when" defaultValue={when} className="min-h-12 rounded-md border border-stone-200 px-3 text-base text-stone-950">
        <option value="">Any upcoming</option>
        <option value="today">Today</option>
        <option value="tomorrow">Tomorrow</option>
        <option value="weekend">This weekend</option>
      </select>
      <select name="gi" defaultValue={gi} className="min-h-12 rounded-md border border-stone-200 px-3 text-base text-stone-950">
        <option value="">Any style</option>
        <option value="GI">Gi</option>
        <option value="NO_GI">No-Gi</option>
      </select>
      <select name="courseType" defaultValue={courseType} className="min-h-12 rounded-md border border-stone-200 px-3 text-base text-stone-950">
        <option value="OPEN_MAT">Open Mat</option>
        <option value="ANY">Any type</option>
        {selectableCourseTypeOptions.filter((option) => option.value !== "OPEN_MAT").map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <Button type="submit" variant="primary" className="min-h-12 px-5 font-semibold">
        <Search size={16} aria-hidden />
        Filter
      </Button>
    </form>
  );
}
