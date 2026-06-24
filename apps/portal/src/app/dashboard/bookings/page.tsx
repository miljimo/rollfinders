import type { Metadata } from "next";
import AdminDashboardWorkspace from "../AdminDashboardWorkspace";

export const metadata: Metadata = {
  title: "RollFinders | Bookings",
  description: "Review course and event bookings.",
};

type BookingsDashboardParams = Record<string, string | string[] | undefined>;

export default async function BookingsDashboardRoute({
  searchParams,
}: {
  searchParams: Promise<BookingsDashboardParams>;
}) {
  const params = await searchParams;
  return <AdminDashboardWorkspace searchParams={Promise.resolve({ ...params, panel: "bookings" })} />;
}
