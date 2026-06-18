import { NextResponse } from "next/server";
import { memberSearchWhere, requireStandardDashboardUser } from "@/lib/standard-dashboard";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { academy } = await requireStandardDashboardUser();
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";

  const members = await prisma.academyMember.findMany({
    where: memberSearchWhere(academy.id, q),
    orderBy: [{ createdAt: "desc" }],
  });

  return NextResponse.json({
    members: members.map((member) => ({
      id: member.id,
      name: null,
      email: member.userId,
      role: member.role,
      createdAt: member.createdAt,
    })),
  });
}
