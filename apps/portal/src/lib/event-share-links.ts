import { CourseType, type Event } from "@prisma/client";

export function eventPermanentPath(eventId: string) {
  return `/e/${eventId}`;
}

export function eventQrCodePath(eventId: string) {
  return `/api/events/${eventId}/qrcode`;
}

export function appBaseUrl() {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function eventPermanentUrl(eventId: string) {
  return `${appBaseUrl()}${eventPermanentPath(eventId)}`;
}

export function eventPublicPath(event: Pick<Event, "id" | "courseType">) {
  return event.courseType === CourseType.OPEN_MAT ? `/open-mats/${event.id}` : `/courses/${event.id}`;
}
