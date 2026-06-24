import type { Metadata } from "next";
import AdminDashboardWorkspace from "../AdminDashboardWorkspace";

export const metadata: Metadata = {
  title: "RollFinders | Manage Users",
  description: "Manage users, roles, permissions, access keys and MFA.",
};

type UsersDashboardParams = Record<string, string | string[] | undefined>;

export default async function UsersDashboardRoute({
  searchParams,
}: {
  searchParams: Promise<UsersDashboardParams>;
}) {
  const params = await searchParams;
  return <AdminDashboardWorkspace searchParams={Promise.resolve({ ...params, panel: "users" })} />;
}
