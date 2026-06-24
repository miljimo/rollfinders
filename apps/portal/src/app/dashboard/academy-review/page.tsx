import type { Metadata } from "next";
import AdminDashboardWorkspace from "../AdminDashboardWorkspace";

export const metadata: Metadata = {
  title: "RollFinders | Academy Review",
  description: "Review platform academy status.",
};

type AcademyReviewDashboardParams = Record<string, string | string[] | undefined>;

export default async function AcademyReviewDashboardRoute({
  searchParams,
}: {
  searchParams: Promise<AcademyReviewDashboardParams>;
}) {
  const params = await searchParams;
  return <AdminDashboardWorkspace searchParams={Promise.resolve({ ...params, panel: "platform-admin-academies" })} />;
}
