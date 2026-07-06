import type { Metadata } from "next";

import DashboardWorkspaceShell, {
  dynamic as shellDynamic,
  metadata as shellMetadata,
  PlatformAdminActivitySummaryPanel,
} from "./DashboardWorkspaceShell";

export { PlatformAdminActivitySummaryPanel };

export const dynamic = shellDynamic;

export const metadata: Metadata = shellMetadata;

type AdminSearchParams = Record<string, string | string[] | undefined>;

export default async function AdminDashboardWorkspaceContent({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return <DashboardWorkspaceShell searchParams={searchParams} />;
}
