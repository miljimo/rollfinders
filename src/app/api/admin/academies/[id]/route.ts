import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { academySchema } from "@/lib/validators";

async function academyExists(id: string, name: string, address: string, postcode: string) {
  return prisma.academy.findFirst({
    where: {
      id: { not: id },
      name: { equals: name.trim(), mode: "insensitive" },
      address: { equals: address.trim(), mode: "insensitive" },
      postcode: { equals: postcode.trim(), mode: "insensitive" },
    },
    select: { id: true },
  });
}

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
  const duplicate = await academyExists(id, data.name, data.address, data.postcode);
  if (duplicate) {
    return NextResponse.json({ error: "Academy already exists for this name, address, and postcode" }, { status: 409 });
  }

  await prisma.academy.update({
    where: { id },
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
