"use client";

import { LocateFixed, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type LocationSearchFormProps = {
  action: string;
  query?: string;
  placeholder: string;
  autoLocate?: boolean;
};

function locationValues(searchParams: URLSearchParams) {
  return {
    lat: searchParams.get("lat") ?? "",
    lng: searchParams.get("lng") ?? "",
  };
}

export function LocationSearchForm({ action, query = "", placeholder, autoLocate = true }: LocationSearchFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lat, lng } = locationValues(searchParams);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!autoLocate || lat || lng) return;
    requestLocation();
    // Only run on initial page hydration for this search surface.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLocate]);

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
    <form action={action} className="rounded-lg border border-stone-200 bg-white p-2 shadow-sm">
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
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
            defaultValue={query}
            placeholder={placeholder}
            className="min-h-12 flex-1 border-0 px-2 text-base text-stone-950 outline-none placeholder:text-stone-500"
          />
        </div>
        <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800">
          <Search size={16} aria-hidden />
          Search
        </button>
      </div>
    </form>
  );
}
