import { ClaimStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  const { id } = await params;
  const formData = await request.formData();
  const status = formData.get("status");

  if (status !== ClaimStatus.APPROVED && status !== ClaimStatus.REJECTED) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await prisma.claimRequest.update({ where: { id }, data: { status } });
  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
