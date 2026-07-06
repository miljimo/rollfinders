"use client";

import { LocateFixed, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";

type LocationSearchFormProps = {
  action: string;
  analyticsIntent?: string;
  query?: string;
  placeholder: string;
  autoLocate?: boolean;
  variant?: "default" | "hero";
};

function locationValues(searchParams: URLSearchParams) {
  return {
    lat: searchParams.get("lat") ?? "",
    lng: searchParams.get("lng") ?? "",
  };
}

export function LocationSearchForm({ action, analyticsIntent, query = "", placeholder, autoLocate = true, variant = "default" }: LocationSearchFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const searchParams = new URLSearchParams(currentSearchParams?.toString());
  const { lat, lng } = locationValues(searchParams);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!autoLocate || lat || lng) return;
    requestLocation();
    // Only run on initial page hydration for this search surface.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLocate]);

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
    <form action={action} className={hero ? "rounded-2xl bg-white p-2 shadow-xl shadow-stone-200/70 ring-1 ring-stone-100" : "rounded-lg border border-stone-200 bg-white p-2 shadow-sm"}>
      {analyticsIntent ? <input type="hidden" name="analyticsIntent" value={analyticsIntent} /> : null}
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <div className={hero ? "grid gap-2 sm:grid-cols-[1fr_auto]" : "grid gap-2 sm:grid-cols-[1fr_auto]"}>
        <div className={hero ? "flex min-h-16 items-center rounded-xl bg-white focus-within:ring-2 focus-within:ring-teal-700/20" : "flex min-h-12 items-center rounded-md border border-stone-200 bg-white focus-within:border-teal-700"}>
          <Button
            type="button"
            size="icon"
            variant="subtle"
            onClick={requestLocation}
            disabled={locating}
            className={hero ? "size-16 shrink-0 rounded-l-xl text-teal-800 hover:bg-teal-50" : "size-12 shrink-0 rounded-l-md text-teal-800 hover:bg-teal-50"}
            aria-label={locating ? "Finding your location" : "Use your current location"}
            title={locating ? "Finding your location" : lat && lng ? "Location enabled" : "Use your current location"}
          >
            <LocateFixed size={hero ? 28 : 18} aria-hidden />
          </Button>
          <input
            name="q"
            defaultValue={query}
            placeholder={placeholder}
            className={hero ? "min-h-16 flex-1 border-0 px-3 text-xl text-stone-950 outline-none placeholder:text-slate-500" : "min-h-12 flex-1 border-0 px-2 text-base text-stone-950 outline-none placeholder:text-stone-500"}
          />
        </div>
        <Button type="submit" variant="primary" className={hero ? "min-h-16 rounded-xl px-8 text-xl font-black shadow-inner" : "min-h-12 px-5 font-semibold"}>
          <Search size={hero ? 28 : 16} aria-hidden />
          Search
        </Button>
      </div>
    </form>
  );
}
