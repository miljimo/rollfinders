import { NextResponse } from "next/server";
import { EmailDeliveryJobRunStatus } from "@prisma/client";
import { getCurrentUser, isPlatformAdminRole } from "@/lib/admin";
import { processEmailDeliveryJob } from "@/lib/reliable-email";

function hasCronAccess(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  return Boolean(secret && header === `Bearer ${secret}`);
}

async function authorize(request: Request) {
  if (hasCronAccess(request)) return { response: null, trigger: { source: "API" } };
  const user = await getCurrentUser();
  if (!isPlatformAdminRole(user?.role)) {
    return { response: NextResponse.json({ error: "Platform admin access required" }, { status: 403 }), trigger: { source: "API" } };
  }
  return { response: null, trigger: { source: "Admin Board", userId: user.id, email: user.email } };
}

export async function GET(request: Request) {
  const { response, trigger } = await authorize(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "20");
  const result = await processEmailDeliveryJob(limit, trigger);
  const success = result.run.status === EmailDeliveryJobRunStatus.SUCCESS;

  return NextResponse.json(
    {
      runId: result.run.id,
      status: result.run.status,
      processed: result.processed.length,
      ids: result.processed.filter(Boolean).map((email) => email?.id),
      queue: {
        due: result.summary.dueQueueCount,
        scheduledRetry: result.summary.scheduledRetryCount,
        attention: result.summary.attentionCount,
        invalid: result.summary.invalidEmailCount,
      },
      triggeredBy: result.run.triggeredByEmail ?? result.run.triggerSource,
      startedAt: result.run.startedAt,
      finishedAt: result.run.finishedAt,
      error: result.run.errorMessage,
    },
    { status: success ? 200 : 500 },
  );
}

export async function POST(request: Request) {
  return GET(request);
}
