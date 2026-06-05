"use client";

import { useEffect, useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
}: {
  q: string;
  when: string;
  gi: string;
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
    <form action="/open-mats" className="grid gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm lg:grid-cols-[1fr_180px_180px_auto]">
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <div className="flex min-h-12 items-center rounded-md border border-stone-200 bg-white focus-within:border-teal-700">
        <button
          type="button"
          onClick={requestLocation}
          disabled={locating}
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-l-md text-teal-800 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={locating ? "Finding your location" : "Use your current location"}
          title={locating ? "Finding your location" : lat && lng ? "Location enabled" : "Use your current location"}
        >
          <LocateFixed size={18} aria-hidden />
        </button>
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
      <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800">
        <Search size={16} aria-hidden />
        Filter
      </button>
    </form>
  );
}
