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

  try {
    await requestPasswordResetForEmail(email);
  } catch (error) {
    console.error("[forgot-password] password reset API request failed", error);
  }
  return NextResponse.json({ success: true });
}
