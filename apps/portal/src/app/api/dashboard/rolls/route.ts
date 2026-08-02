import { NextResponse } from "next/server";
import { listAcademyMembershipsForUserFromAcademyService } from "@/lib/academyService";
import { getCurrentUser, isStandardUserRole } from "@/lib/admin";
import { getAcademyCourseDiscovery } from "@/lib/courses";

function pageNumber(value: string | null) {
  const parsed = Number(value ?? "1");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function pageSizeNumber(value: string | null) {
  const parsed = Number(value ?? "20");
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(Math.floor(parsed), 100);
}

async function assignedAcademyId(user: { id: string; academyId?: string | null }) {
  if (user.academyId) return user.academyId;
  const membership = (await listAcademyMembershipsForUserFromAcademyService(user.id))[0];
  return membership?.academyId ?? null;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isStandardUserRole(user.role)) {
    return NextResponse.json({ error: "Standard dashboard access required" }, { status: 403 });
  }

  const academyId = await assignedAcademyId(user);
  if (!academyId) return NextResponse.json({ rolls: [] });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const page = pageNumber(url.searchParams.get("page"));
  const pageSize = pageSizeNumber(url.searchParams.get("pageSize"));
  const academyRolls = await getAcademyCourseDiscovery({ academyId, q });
  const rolls = academyRolls.slice((page - 1) * pageSize, page * pageSize);

  return NextResponse.json({ rolls, total: academyRolls.length });
}
