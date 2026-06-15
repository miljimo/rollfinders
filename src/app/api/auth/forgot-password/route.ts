import { NextResponse } from "next/server";
import { requestPasswordResetForEmail } from "@/lib/password-reset";

export async function POST(request: Request) {
  let email = "";
  try {
    const body = await request.json();
    email = String(body?.email ?? "");
  } catch {
    email = "";
  }

  await requestPasswordResetForEmail(email);
  return NextResponse.json({ success: true });
}
