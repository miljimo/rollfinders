import { MapPin } from "lucide-react";
import { Button } from "@/app/_components/Button";

export function LocationFilterInput({
  locating,
  q,
  requestLocation,
}: {
  locating: boolean;
  q: string;
  requestLocation: () => void;
}) {
  return (
    <div className="flex min-h-14 items-center rounded-md border border-slate-200 bg-white focus-within:border-teal-700">
      <Button
        type="button"
        size="icon"
        variant="subtle"
        onClick={requestLocation}
        disabled={locating}
        className="size-14 shrink-0 rounded-l-md text-slate-950 hover:bg-teal-50 hover:text-teal-700"
        aria-label={locating ? "Finding your location" : "Use your current location"}
        title={locating ? "Finding your location" : "Use your current location"}
      >
        <MapPin size={19} aria-hidden />
      </Button>
      <input
        name="q"
        defaultValue={q}
        placeholder="Search academy, borough, postcode, gi, no-gi, competition"
        className="min-h-14 flex-1 border-0 px-2 text-base text-slate-950 outline-none placeholder:text-slate-500"
      />
    </div>
  );
}
