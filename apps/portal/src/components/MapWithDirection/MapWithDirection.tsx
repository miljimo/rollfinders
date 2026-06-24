import { MapPin } from "lucide-react";
import { AnalyticsClickTracker } from "@/components/Analytics";
import { InlineDirectionsButton } from "@/components/InlineDirectionsButton";

type MapWithDirectionProps = {
  address: string;
  analyticsMetadata?: Record<string, string | number | boolean | null | undefined>;
  latitude?: number | null;
  locationLabel?: string | null;
  longitude?: number | null;
};

function validCoordinate(latitude?: number | null, longitude?: number | null) {
  return typeof latitude === "number"
    && Number.isFinite(latitude)
    && latitude >= -90
    && latitude <= 90
    && typeof longitude === "number"
    && Number.isFinite(longitude)
    && longitude >= -180
    && longitude <= 180;
}

function mapEmbedUrl({ address, latitude, longitude }: Pick<MapWithDirectionProps, "address" | "latitude" | "longitude">) {
  const query = validCoordinate(latitude, longitude) ? `${latitude},${longitude}` : address;
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export function MapWithDirection({
  address,
  analyticsMetadata,
  latitude,
  locationLabel,
  longitude,
}: MapWithDirectionProps) {
  const trimmedAddress = address.trim();
  if (!trimmedAddress) return null;

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm" aria-labelledby="location-heading">
      <h2 id="location-heading" className="flex items-center gap-2 text-lg font-black text-stone-950">
        <MapPin size={19} aria-hidden />
        Location
      </h2>
      {locationLabel ? <p className="mt-2 text-sm font-semibold text-stone-600">{locationLabel}</p> : null}
      <div className="mt-3 aspect-[16/9] overflow-hidden rounded-md border border-stone-200 bg-stone-100">
        <iframe
          src={mapEmbedUrl({ address: trimmedAddress, latitude, longitude })}
          title={`Map for ${locationLabel || trimmedAddress}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="size-full border-0"
        />
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-stone-700">{trimmedAddress}</p>
      <div className="mt-3">
        {analyticsMetadata ? (
          <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={analyticsMetadata}>
            <InlineDirectionsButton address={trimmedAddress} />
          </AnalyticsClickTracker>
        ) : (
          <InlineDirectionsButton address={trimmedAddress} />
        )}
      </div>
    </section>
  );
}
