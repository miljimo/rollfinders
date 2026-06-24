import type { Metadata } from "next";
import AdminDashboardWorkspace from "../AdminDashboardWorkspace";

export const metadata: Metadata = {
  title: "RollFinders | Courses/Events",
  description: "Manage courses and events.",
};

type CoursesDashboardParams = Record<string, string | string[] | undefined>;

export default async function CoursesDashboardRoute({
  searchParams,
}: {
  searchParams: Promise<CoursesDashboardParams>;
}) {
  const params = await searchParams;
  return <AdminDashboardWorkspace searchParams={Promise.resolve({ ...params, panel: "open-mats" })} />;
}
