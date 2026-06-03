import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { getEmailProvisioningConfig } from "@/lib/email-provisioning";

export async function GET() {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  return NextResponse.json(getEmailProvisioningConfig());
}
