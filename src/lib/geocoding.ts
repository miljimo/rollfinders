export type CoordinateLookupInput = {
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;
};

export type CoordinateLookupResult = {
  latitude: number;
  longitude: number;
  label?: string;
};

type Fetcher = typeof fetch;

function clean(value?: string) {
  return value?.trim() ?? "";
}

function validCoordinate(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function postcodeQuery(postcode: string) {
  return postcode.replace(/\s+/g, "");
}

function fullAddressQuery(input: CoordinateLookupInput) {
  return [input.address, input.city, input.postcode, input.country].map(clean).filter(Boolean).join(", ");
}

export async function lookupCoordinates(input: CoordinateLookupInput, fetcher: Fetcher = fetch): Promise<CoordinateLookupResult | null> {
  const postcode = clean(input.postcode);
  if (postcode) {
    const postcodeResult = await lookupPostcodeCoordinates(postcode, fetcher);
    if (postcodeResult) return postcodeResult;
  }

  const query = fullAddressQuery(input);
  if (query.length < 6) return null;
  return lookupAddressCoordinates(query, fetcher);
}

async function lookupPostcodeCoordinates(postcode: string, fetcher: Fetcher): Promise<CoordinateLookupResult | null> {
  try {
    const response = await fetcher(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcodeQuery(postcode))}`, { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json() as { result?: { latitude?: unknown; longitude?: unknown; postcode?: unknown } };
    const latitude = Number(payload.result?.latitude);
    const longitude = Number(payload.result?.longitude);
    if (!validCoordinate(latitude, longitude)) return null;
    return {
      latitude,
      longitude,
      label: typeof payload.result?.postcode === "string" ? payload.result.postcode : postcode,
    };
  } catch {
    return null;
  }
}

async function lookupAddressCoordinates(query: string, fetcher: Fetcher): Promise<CoordinateLookupResult | null> {
  try {
    const params = new URLSearchParams({
      format: "json",
      limit: "1",
      q: query,
    });
    const response = await fetcher(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      cache: "no-store",
      headers: { "User-Agent": "RollFinder academy coordinate lookup" },
    });
    if (!response.ok) return null;
    const payload = await response.json() as Array<{ lat?: unknown; lon?: unknown; display_name?: unknown }>;
    const first = payload[0];
    const latitude = Number(first?.lat);
    const longitude = Number(first?.lon);
    if (!validCoordinate(latitude, longitude)) return null;
    return {
      latitude,
      longitude,
      label: typeof first.display_name === "string" ? first.display_name : query,
    };
  } catch {
    return null;
  }
}
