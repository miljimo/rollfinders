import { redirect } from "next/navigation";

export default function SettingsDashboardRoute() {
  redirect("/dashboard?panel=settings");
}
