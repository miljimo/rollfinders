import { NextResponse } from "next/server";
import { getCurrentUser, isPlatformAdminRole } from "@/lib/admin";
import { backfillCoursePaymentWalletEffects, processCoursePaymentWalletOutbox } from "@/lib/payment-wallet-posting";

export const dynamic = "force-dynamic";

function hasCronAccess(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  return Boolean(secret && header === `Bearer ${secret}`);
}

async function authorize(request: Request) {
  if (hasCronAccess(request)) return null;
  const user = await getCurrentUser();
  if (!isPlatformAdminRole(user?.role)) {
    return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });
  }
  return null;
}

function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export async function GET(request: Request) {
  const forbidden = await authorize(request);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dryRun") === "1" || searchParams.get("dry_run") === "1";
  const limit = numberParam(searchParams.get("limit"), 50);
  const backfill = searchParams.get("backfill") === "1";
  const result = backfill
    ? await backfillCoursePaymentWalletEffects({
        academyId: searchParams.get("academyId") ?? searchParams.get("academy_id") ?? undefined,
        dryRun,
        limit,
        maxPages: numberParam(searchParams.get("maxPages") ?? searchParams.get("max_pages"), 20),
      })
    : await processCoursePaymentWalletOutbox({ dryRun, limit });

  return NextResponse.json({
    mode: backfill ? "backfill" : "outbox",
    dryRun,
    ...result,
  }, { status: result.failed.length > 0 ? 207 : 200 });
}

export async function POST(request: Request) {
  return GET(request);
}
