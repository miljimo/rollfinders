import { NextResponse } from "next/server";
import { getCurrentUser, requireAdminApi } from "@/lib/admin";
import { createManagedUser, listManagedUsers, UserServiceError } from "@/lib/users-service";

function serviceErrorResponse(error: unknown) {
  if (error instanceof UserServiceError) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
  throw error;
}

export async function GET(request: Request) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  try {
    const url = new URL(request.url);
    return NextResponse.json(await listManagedUsers(actor, url.searchParams.toString()));
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  try {
    const body = await request.json().catch(() => null);
    return NextResponse.json(await createManagedUser(actor, body), { status: 201 });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
