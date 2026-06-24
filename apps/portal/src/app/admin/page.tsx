import type { Metadata } from "next";
import { redirect } from "next/navigation";

export {
  PlatformAdminActivitySummaryPanel,
} from "../dashboard/AdminDashboardWorkspace";
export { AcademiesTable } from "../dashboard/AcademiesTable";
export { NewAcademyPanelAction } from "../dashboard/NewAcademyPanelAction";
export { SuperAdminPlatformAcademiesPanel } from "../dashboard/SuperAdminPlatformAcademiesPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Dashboard",
  description: "Legacy dashboard route. Redirects to the unified dashboard.",
};

type AdminSearchParams = Record<string, string | string[] | undefined>;

export default async function LegacyAdminPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = new URLSearchParams();
  Object.entries(await searchParams).forEach(([key, value]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => item && params.append(key, item));
      return;
    }
    params.set(key, value);
  });

  const query = params.toString();
  redirect(query ? `/dashboard?${query}` : "/dashboard");
}
