import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { getCurrentUser, isSuperAdminRole, requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createManagedUser } from "../actions";
import { UserForm } from "../UserForm";

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  await requireAdminPage();
  const currentUser = await getCurrentUser();
  const superAdmin = isSuperAdminRole(currentUser?.role);
  const academies = await prisma.academy.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/admin/users" className="text-sm font-bold text-teal-800">User Management</Link>
        <h1 className="mt-2 text-5xl font-black text-stone-950">New User</h1>
        <UserForm academies={academies} action={createManagedUser} mode="create" superAdmin={superAdmin} />
      </section>
    </PageShell>
  );
}
