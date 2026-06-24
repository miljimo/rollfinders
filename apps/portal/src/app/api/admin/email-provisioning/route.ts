import { NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/lib/admin";
import { getEmailProvisioningConfig } from "@/lib/email-provisioning";

export async function GET() {
  const forbidden = await requirePlatformAdminApi();
  if (forbidden) return forbidden;

  return NextResponse.json(getEmailProvisioningConfig());
}
