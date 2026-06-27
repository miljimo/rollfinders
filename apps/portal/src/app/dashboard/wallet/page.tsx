import AdminDashboardWorkspace from "../AdminDashboardWorkspace";

type WalletDashboardParams = Record<string, string | string[] | undefined>;

export default async function WalletDashboardRoute({
  searchParams,
}: {
  searchParams: Promise<WalletDashboardParams>;
}) {
  const params = await searchParams;
  return <AdminDashboardWorkspace searchParams={Promise.resolve({ ...params, panel: "wallet" })} />;
}
