import Image from "next/image";
import { Button } from "@/components/Button";
import { buildAcademyStaticMapUrl, getGoogleMapsApiKey } from "@/lib/google-maps";

type AcademyMapItem = {
  latitude: number;
  longitude: number;
};

function validMapMarkers(academies: AcademyMapItem[]) {
  return academies.filter((academy) => Number.isFinite(academy.latitude) && Number.isFinite(academy.longitude));
}

export function AcademyMap({ academies }: { academies: AcademyMapItem[] }) {
  const googleKey = getGoogleMapsApiKey();
  const markers = validMapMarkers(academies);
  const mapUrl = googleKey && markers.length ? buildAcademyStaticMapUrl({ apiKey: googleKey, markers }) : "";

  if (mapUrl) {
    return (
      <div className="relative h-[480px] w-full">
        <Image
          src={mapUrl}
          alt={`Map showing ${markers.length} RollFinder academies`}
          fill
          sizes="(min-width: 1024px) 60vw, 100vw"
          unoptimized
          className="object-cover"
        />
        <div className="absolute left-3 top-3">
          <Button href="https://www.google.com/maps/@51.5072,-0.1276,11z" target="_blank" rel="noreferrer" size="sm" variant="secondary">
            Open in Maps
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="map-grid flex h-[480px] items-center justify-center p-6 text-center">
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <p className="font-bold text-stone-950">{googleKey ? "No academy coordinates available" : "Google Maps key not configured"}</p>
        <p className="mt-2 max-w-sm text-sm text-stone-600">
          {googleKey ? "Add latitude and longitude to academy records to plot them on the map." : "Set GOOGLE_MAPS_API_KEY to enable the academy map. Listings remain available below."}
        </p>
      </div>
    </div>
  );
}
