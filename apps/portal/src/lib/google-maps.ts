function stripWrappingQuotes(value: string) {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === "\"" && last === "\"") || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
}

export function getGoogleMapsApiKey() {
  const value = process.env.GOOGLE_MAPS_API_KEY?.trim();
  return value ? stripWrappingQuotes(value).trim() : "";
}

export type GoogleMapMarker = {
  latitude: number;
  longitude: number;
};

export function buildAcademyStaticMapUrl({
  apiKey,
  center = "51.5072,-0.1276",
  height = 480,
  markers,
  width = 900,
  zoom = 11,
}: {
  apiKey: string;
  center?: string;
  height?: number;
  markers: GoogleMapMarker[];
  width?: number;
  zoom?: number;
}) {
  const params = new URLSearchParams({
    key: apiKey,
    center,
    zoom: String(zoom),
    size: `${width}x${height}`,
    scale: "2",
    maptype: "roadmap",
  });

  markers.forEach((marker) => {
    params.append("markers", `color:red|${marker.latitude},${marker.longitude}`);
  });

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
