import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { academySchema } from "@/lib/validators";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  const { id } = await params;
  const formData = await request.formData();

  if (formData.get("_method") === "DELETE") {
    await prisma.academy.delete({ where: { id } });
    return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
  }

  const parsed = academySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return NextResponse.json({ error: "Invalid academy" }, { status: 400 });
  const data = parsed.data;

  await prisma.academy.update({
    where: { id },
    data: {
      ...data,
      website: data.website || null,
      email: data.email || null,
      logoUrl: data.logoUrl || null,
    },
  });

  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
