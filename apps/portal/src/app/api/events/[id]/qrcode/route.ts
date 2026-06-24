import QRCode from "qrcode";
import { eventPermanentUrl } from "@/lib/event-share-links";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { active: true },
  });

  if (!event || !event.active) {
    return new Response("Event not found", { status: 404 });
  }

  const svg = await QRCode.toString(eventPermanentUrl(id), {
    errorCorrectionLevel: "M",
    margin: 2,
    type: "svg",
    width: 320,
  });

  return new Response(svg, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
