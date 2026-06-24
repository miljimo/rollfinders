import { notFound, redirect } from "next/navigation";
import { eventPublicPath } from "@/lib/event-share-links";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PermanentEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, active: true, courseType: true },
  });

  if (!event || !event.active) notFound();
  redirect(eventPublicPath(event));
}
