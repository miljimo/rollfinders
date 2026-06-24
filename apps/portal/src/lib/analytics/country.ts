type HeaderReader = {
  get(name: string): string | null;
};

const countryHeaderNames = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "cloudfront-viewer-country",
  "x-country-code",
  "x-geo-country",
];

const displayNames = typeof Intl.DisplayNames === "function"
  ? new Intl.DisplayNames(["en"], { type: "region" })
  : null;

function normalizeCountryCode(value: string | null | undefined) {
  if (!value) return null;
  const candidate = value.trim().toUpperCase();
  if (candidate === "XX" || candidate === "T1") return null;
  return /^[A-Z]{2}$/.test(candidate) ? candidate : null;
}

export function countryNameFromCode(countryCode: string | null | undefined) {
  const normalized = normalizeCountryCode(countryCode);
  if (!normalized) return null;
  return displayNames?.of(normalized) ?? normalized;
}

export function analyticsCountryFromHeaders(headers: HeaderReader) {
  for (const headerName of countryHeaderNames) {
    const countryCode = normalizeCountryCode(headers.get(headerName));
    if (!countryCode) continue;
    return {
      countryCode,
      countryName: countryNameFromCode(countryCode),
    };
  }

  return {
    countryCode: null,
    countryName: null,
  };
}

export function analyticsCountryFromRequest(request: Request) {
  return analyticsCountryFromHeaders(request.headers);
}
