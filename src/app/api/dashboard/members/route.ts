import { NextResponse } from "next/server";
import { memberSearchWhere, requireStandardDashboardUser } from "@/lib/standard-dashboard";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { academy } = await requireStandardDashboardUser();
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";

  const members = await prisma.user.findMany({
    where: memberSearchWhere(academy.id, q),
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { email: "asc" }],
  });

  return NextResponse.json({
    members: members.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      createdAt: member.createdAt,
    })),
  });
}
