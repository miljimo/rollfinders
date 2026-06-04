import { NextResponse } from "next/server";
import { requireStandardDashboardUser } from "@/lib/standard-dashboard";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { academy } = await requireStandardDashboardUser();
  const rolls = await prisma.event.findMany({
    where: { academyId: academy.id, active: true },
    select: {
      id: true,
      academyId: true,
      title: true,
      description: true,
      eventDate: true,
      startTime: true,
      endTime: true,
      giType: true,
      price: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ rolls });
}
