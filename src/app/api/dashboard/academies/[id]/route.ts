import { NextResponse } from "next/server";
import { requireStandardDashboardUser } from "@/lib/standard-dashboard";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { academy } = await requireStandardDashboardUser();
  const { id } = await params;
  if (id !== academy.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const record = await prisma.academy.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, city: true, postcode: true, borough: true, verified: true },
  });
  if (!record) return NextResponse.json({ error: "Academy not found" }, { status: 404 });
  return NextResponse.json({ academy: record });
}
