import { NextResponse } from "next/server";
import { getCurrentUser, isSuperAdminRole, writeAdminAuditLog } from "@/lib/admin";
import { ensurePlatformAdminProfile } from "@/lib/platform-admin-activity";
import { createManagedUser, listManagedUsers } from "@/lib/users-service";

type PlatformAdminRequest = {
  name?: unknown;
  email?: unknown;
};

function forbiddenResponse() {
  return NextResponse.json({ error: "Not authorized" }, { status: 403 });
}

async function requireSuperAdminForPlatformAdmins() {
  const user = await getCurrentUser();
  if (!isSuperAdminRole(user?.role)) {
    return { response: forbiddenResponse(), user: null };
  }
  return { response: null, user };
}

function normaliseString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET() {
  const { response, user } = await requireSuperAdminForPlatformAdmins();
  if (response) return response;

  const result = await listManagedUsers(user, "role=PLATFORM_ADMIN&pageSize=100");

  return NextResponse.json({ platformAdmins: result.users });
}

export async function POST(request: Request) {
  const { response, user: actor } = await requireSuperAdminForPlatformAdmins();
  if (response) return response;

  const body = await request.json().catch(() => null) as PlatformAdminRequest | null;
  const email = normaliseString(body?.email).toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const name = normaliseString(body?.name);
  const { user: platformAdmin } = await createManagedUser(actor, {
    name,
    email,
    role: "PLATFORM_ADMIN",
  });

  await ensurePlatformAdminProfile(platformAdmin.id);

  await writeAdminAuditLog({
    actorUserId: actor.id,
    targetUserId: platformAdmin.id,
    action: "PLATFORM_ADMIN_CREATED",
    metadata: { email },
  });

  return NextResponse.json({ platformAdmin }, { status: 201 });
}
