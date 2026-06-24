import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/password-reset";

export async function POST(request: Request) {
  let body: { token?: unknown; password?: unknown; confirmPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid reset request." }, { status: 400 });
  }

  const token = String(body?.token ?? "");
  const password = String(body?.password ?? "");
  const confirmPassword = String(body?.confirmPassword ?? "");

  if (!token) {
    return NextResponse.json({ success: false, message: "This password reset link is invalid or expired." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ success: false, message: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ success: false, message: "Passwords do not match." }, { status: 400 });
  }

  const result = await resetPasswordWithToken(token, password);
  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.message ?? "This password reset link is invalid or expired." }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: "Your password has been reset successfully. You can now sign in.",
  });
}
