import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { academySchema } from "@/lib/validators";

export async function POST(request: Request) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  const formData = await request.formData();
  const parsed = academySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return NextResponse.json({ error: "Invalid academy" }, { status: 400 });

  const data = parsed.data;
  await prisma.academy.create({
    data: {
      ...data,
      borough: data.borough || null,
      website: data.website || null,
      email: data.email || null,
      logoUrl: data.logoUrl || null,
      dropInPrice: data.dropInPrice === "" ? null : data.dropInPrice,
    },
  });

  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
