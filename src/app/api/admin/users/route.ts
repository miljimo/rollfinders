import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, disabled: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}
