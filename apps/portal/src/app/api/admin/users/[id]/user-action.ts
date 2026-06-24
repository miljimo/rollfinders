import { NextResponse } from "next/server";
import { getCurrentUser, requireAdminApi } from "@/lib/admin";
import { mutateManagedUser, UserServiceError } from "@/lib/users-service";

export async function mutateUser(
  id: string,
  mutation: "disable" | "enable" | "promote" | "demote",
  role?: string,
) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  try {
    return NextResponse.json(await mutateManagedUser(actor, id, mutation, role));
  } catch (error) {
    if (error instanceof UserServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    throw error;
  }
}
