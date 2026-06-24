import type { Metadata } from "next";
import AdminDashboardWorkspace from "../AdminDashboardWorkspace";

export const metadata: Metadata = {
  title: "RollFinders | Analytics",
  description: "Review platform analytics.",
};

type AnalyticsDashboardParams = Record<string, string | string[] | undefined>;

export default async function AnalyticsDashboardRoute({
  searchParams,
}: {
  searchParams: Promise<AnalyticsDashboardParams>;
}) {
  const params = await searchParams;
  return <AdminDashboardWorkspace searchParams={Promise.resolve({ ...params, panel: "analytics" })} />;
}
