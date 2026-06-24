import { redirect } from "next/navigation";

export default function AccessKeysDashboardRoute() {
  redirect("/dashboard/users?usersView=access-keys");
}
