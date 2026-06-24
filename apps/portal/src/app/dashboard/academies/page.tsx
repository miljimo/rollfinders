import type { Metadata } from "next";
import AdminDashboardWorkspace from "../AdminDashboardWorkspace";

export const metadata: Metadata = {
  title: "RollFinders | Academies",
  description: "Manage academy records.",
};

type AcademiesDashboardParams = Record<string, string | string[] | undefined>;

export default async function AcademiesDashboardRoute({
  searchParams,
}: {
  searchParams: Promise<AcademiesDashboardParams>;
}) {
  const params = await searchParams;
  return <AdminDashboardWorkspace searchParams={Promise.resolve({ ...params, panel: "academies" })} />;
}
