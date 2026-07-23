import Link from "next/link";
import { PageShell } from "@/app/_components/Page";
import { listAcademiesForActorFromAcademyService } from "@/lib/academyService";
import { getCurrentUser, isAcademyAdminRole, isSuperAdminRole, requireAdminPage } from "@/lib/admin";
import { createManagedUser } from "../actions";
import { UserForm } from "../UserForm";

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  await requireAdminPage();
  const currentUser = await getCurrentUser();
  const superAdmin = isSuperAdminRole(currentUser?.role);
  const academyAdmin = isAcademyAdminRole(currentUser?.role);
  const academies = currentUser ? await listAcademiesForActorFromAcademyService(currentUser) : [];

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/admin/users" className="text-sm font-bold text-teal-800">User Management</Link>
        <h1 className="mt-2 text-5xl font-black text-stone-950">New User</h1>
        <UserForm academies={academies} action={createManagedUser} mode="create" academyAdmin={academyAdmin} actorRole={currentUser?.role} superAdmin={superAdmin} />
      </section>
    </PageShell>
  );
}
