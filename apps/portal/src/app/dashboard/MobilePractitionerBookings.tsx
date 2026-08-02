import Link from "next/link";
import { CalendarCheck, ChevronRight, Clock, TicketCheck } from "lucide-react";
import type { BookingRecord } from "@/lib/bookings";
import { mobileCourseHref } from "@/lib/courses";

function metadataText(booking: BookingRecord, key: string) {
  const value = booking.metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (value) => value.toUpperCase());
}

function bookingHref(booking: BookingRecord) {
  const courseId = metadataText(booking, "course_id") ?? booking.bookableId;
  if (!courseId) return null;
  const date = metadataText(booking, "occurrence_date");
  return mobileCourseHref({ id: courseId, isRecurringOccurrence: Boolean(date), occurrenceDateParam: date }, "/mobile?tab=profile");
}

export function MobilePractitionerBookings({ bookings, error }: { bookings: BookingRecord[]; error?: string }) {
  return (
    <section className="mt-6 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-slate-950">My Bookings</h2>
        <span className="text-sm font-bold text-teal-800">{bookings.length}</span>
      </div>
      {error ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">{error}</p> : null}
      {!error && bookings.length === 0 ? (
        <p className="mt-4 rounded-lg border border-stone-200 bg-white p-5 text-center text-sm font-semibold text-slate-600 shadow-sm">You have no bookings yet.</p>
      ) : null}
      <div className="mt-4 grid gap-4">
        {bookings.map((booking) => {
          const href = bookingHref(booking);
          const title = metadataText(booking, "course_title") ?? metadataText(booking, "event_title") ?? "Training session";
          const academy = metadataText(booking, "academy_name");
          const date = metadataText(booking, "occurrence_date");
          const start = metadataText(booking, "occurrence_start_time");
          const end = metadataText(booking, "occurrence_end_time");
          const content = (
            <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-800"><TicketCheck size={22} aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-lg font-black text-slate-950">{title}</p>
                  {academy ? <p className="mt-1 break-words text-sm font-semibold text-slate-600">{academy}</p> : null}
                </div>
                {href ? <ChevronRight className="mt-2 shrink-0 text-teal-800" size={21} aria-hidden /> : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-stone-100 pt-3 text-sm font-semibold text-slate-700">
                {date ? <span className="flex items-center gap-2"><CalendarCheck size={17} className="text-teal-700" aria-hidden />{date}</span> : null}
                {start ? <span className="flex items-center gap-2"><Clock size={17} className="text-teal-700" aria-hidden />{start}{end ? `-${end}` : ""}</span> : null}
                <span className="capitalize text-teal-800">{statusLabel(booking.status)}</span>
              </div>
            </article>
          );
          return href ? <Link key={booking.id} href={href} className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal-700">{content}</Link> : <div key={booking.id}>{content}</div>;
        })}
      </div>
    </section>
  );
}
