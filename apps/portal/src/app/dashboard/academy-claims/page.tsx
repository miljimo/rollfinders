import type { Metadata } from "next";
import AdminDashboardWorkspace from "../AdminDashboardWorkspace";

export const metadata: Metadata = {
  title: "RollFinders | Academy Claims",
  description: "Review academy ownership claims.",
};

type AcademyClaimsDashboardParams = Record<string, string | string[] | undefined>;

export default async function AcademyClaimsDashboardRoute({
  searchParams,
}: {
  searchParams: Promise<AcademyClaimsDashboardParams>;
}) {
  const params = await searchParams;
  return <AdminDashboardWorkspace searchParams={Promise.resolve({ ...params, panel: "academy-claims" })} />;
}
