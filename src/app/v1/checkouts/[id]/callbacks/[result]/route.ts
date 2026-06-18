import { NextResponse } from "next/server";
import { getEnvVariable } from "@/lib/environments";

export const dynamic = "force-dynamic";

const paymentServiceUrl = () => getEnvVariable("PAYMENT_SERVICE_URL", "http://localhost:3002").replace(/\/+$/, "");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; result: string }> },
) {
  const { id, result } = await params;
  const incoming = new URL(request.url);
  const callbackUrl = new URL(
    `/v1/checkouts/${encodeURIComponent(id)}/callbacks/${encodeURIComponent(result)}`,
    paymentServiceUrl(),
  );
  callbackUrl.search = incoming.search;

  const response = await fetch(callbackUrl, {
    method: "GET",
    cache: "no-store",
    redirect: "manual",
  });

  const location = response.headers.get("location");
  if (location && response.status >= 300 && response.status < 400) {
    return NextResponse.redirect(location, response.status);
  }

  const body = await response.text();
  return new Response(body || "Payment callback failed.", {
    status: response.status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": response.headers.get("content-type") ?? "text/plain; charset=utf-8",
    },
  });
}
