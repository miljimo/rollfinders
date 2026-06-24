import { NextResponse } from "next/server";
import { getCurrentUser, requireAdminApi } from "@/lib/admin";
import { deleteManagedUser, getManagedUser, updateManagedUser, UserServiceError } from "@/lib/users-service";

function serviceErrorResponse(error: unknown) {
  if (error instanceof UserServiceError) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
  throw error;
}

async function requireActor() {
  const forbidden = await requireAdminApi();
  if (forbidden) return { response: forbidden, actor: null };
  const actor = await getCurrentUser();
  if (!actor) return { response: NextResponse.json({ error: "Admin access required" }, { status: 403 }), actor: null };
  return { response: null, actor };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response, actor } = await requireActor();
  if (response) return response;
  const { id } = await params;
  try {
    return NextResponse.json(await getManagedUser(actor, id));
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response, actor } = await requireActor();
  if (response) return response;
  const { id } = await params;
  try {
    const body = await request.json().catch(() => null);
    return NextResponse.json(await updateManagedUser(actor, id, body));
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response, actor } = await requireActor();
  if (response) return response;
  const { id } = await params;
  try {
    return NextResponse.json(await deleteManagedUser(actor, id));
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
