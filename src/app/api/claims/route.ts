import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { claimRequestSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = claimRequestSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid claim request" }, { status: 400 });
  }

  await prisma.claimRequest.create({ data: parsed.data });

  return NextResponse.redirect(new URL("/claim?submitted=1", request.url), { status: 303 });
}
