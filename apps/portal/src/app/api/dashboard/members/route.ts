import { NextResponse } from "next/server";
import { academyMemberProfiles } from "@/lib/rollfinder-user-profiles";
import { requireStandardDashboardUser } from "@/lib/standard-dashboard";

export async function GET(request: Request) {
  const { academy } = await requireStandardDashboardUser();
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";

  const members = await academyMemberProfiles(academy.id, q);

  return NextResponse.json({
    members: members.map((member) => ({
      id: member.id,
      name: member.user?.name ?? null,
      email: member.user?.email ?? member.userId,
      createdAt: member.createdAt,
    })),
  });
}
