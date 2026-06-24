import { NextResponse } from "next/server";
import { getAcademyFromAcademyService } from "@/lib/academyService";
import { requireStandardDashboardUser } from "@/lib/standard-dashboard";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { academy } = await requireStandardDashboardUser();
  const { id } = await params;
  if (id !== academy.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const record = await getAcademyFromAcademyService(id);
  if (!record) return NextResponse.json({ error: "Academy not found" }, { status: 404 });
  return NextResponse.json({ academy: record });
}
