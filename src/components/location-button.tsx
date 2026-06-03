"use client";

import { LocateFixed } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LocationButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  function useLocation() {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = new URLSearchParams(searchParams.toString());
        next.set("lat", position.coords.latitude.toFixed(6));
        next.set("lng", position.coords.longitude.toFixed(6));
        router.push(`?${next.toString()}`);
        setLoading(false);
      },
      () => setLoading(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <button type="button" onClick={useLocation} disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-800 disabled:cursor-not-allowed disabled:opacity-60">
      <LocateFixed size={16} aria-hidden />
      {loading ? "Locating..." : "Use my location"}
    </button>
  );
}
