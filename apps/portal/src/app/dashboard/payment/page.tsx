import type { Metadata } from "next";
import AdminDashboardWorkspace from "../AdminDashboardWorkspace";

export const metadata: Metadata = {
  title: "RollFinders | Payments",
  description: "Review payment activity and payment settings.",
};

type PaymentDashboardParams = Record<string, string | string[] | undefined>;

export default async function PaymentDashboardRoute({
  searchParams,
}: {
  searchParams: Promise<PaymentDashboardParams>;
}) {
  const params = await searchParams;
  return <AdminDashboardWorkspace searchParams={Promise.resolve({ ...params, panel: "payments" })} />;
}
