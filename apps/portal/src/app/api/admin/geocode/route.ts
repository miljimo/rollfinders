import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/admin";
import { authorizeThroughService } from "@/lib/authorisation-service";
import { lookupCoordinates } from "@/lib/geocoding";

function param(url: URL, key: string) {
  return url.searchParams.get(key)?.trim() ?? "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.json({ error: "Sign in to manage academy locations." }, { status: 401 });
  }

  const academyId = param(url, "academyId");
  const permission = academyId ? "academy.update" : "academy.create";
  const allowed = await authorizeThroughService(actor, permission, {
    organisationId: actor.academyId ?? (academyId || undefined),
    applicationId: process.env.ROLLFINDERS_APPLICATION_ID ?? "app_rollfinders",
    resourceType: academyId ? "academy" : undefined,
    resourceId: academyId || undefined,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "You are not authorised to manage this academy location." },
      { status: 403 },
    );
  }

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
