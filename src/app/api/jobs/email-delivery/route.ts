import { NextResponse } from "next/server";
import { requirePlatformAdminApi } from "@/lib/admin";
import { processDueEmails } from "@/lib/reliable-email";

function hasCronAccess(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  return Boolean(secret && header === `Bearer ${secret}`);
}

async function authorize(request: Request) {
  if (hasCronAccess(request)) return null;
  return requirePlatformAdminApi();
}

export async function GET(request: Request) {
  const forbidden = await authorize(request);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "20");
  const processed = await processDueEmails(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20);

  return NextResponse.json({
    processed: processed.length,
    ids: processed.filter(Boolean).map((email) => email?.id),
  });
}

export async function POST(request: Request) {
  return GET(request);
}
