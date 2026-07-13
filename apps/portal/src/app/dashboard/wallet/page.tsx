import AdminDashboardWorkspace from "../AdminDashboardWorkspace";

type WalletDashboardParams = Record<string, string | string[] | undefined>;

export default async function WalletDashboardRoute({
  searchParams,
}: {
  searchParams: Promise<WalletDashboardParams>;
}) {

  return <AdminDashboardWorkspace searchParams={Promise.resolve({ ...(await searchParams), panel: "wallet" })} />;
}
