import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { lookupCoordinates } from "@/lib/geocoding";

function param(url: URL, key: string) {
  return url.searchParams.get(key)?.trim() ?? "";
}

export async function GET(request: Request) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const result = await lookupCoordinates({
    address: param(url, "address"),
    city: param(url, "city"),
    postcode: param(url, "postcode"),
    country: param(url, "country"),
  });

  if (!result) return NextResponse.json({ ok: false, error: "No coordinate result found." }, { status: 404 });

  return NextResponse.json({
    ok: true,
    latitude: result.latitude,
    longitude: result.longitude,
    label: result.label ?? null,
  });
}
