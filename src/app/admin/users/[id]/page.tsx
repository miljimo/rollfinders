import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { PageShell } from "@/components/PageShell";
import { getCurrentUser, isPlatformAdminRole, isProtectedSuperAdmin, isSuperAdminRole, requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { updateManagedUser } from "../actions";
import { UserForm } from "../UserForm";

export const dynamic = "force-dynamic";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const superAdmin = isSuperAdminRole(currentUser?.role);
  const platformAdmin = isPlatformAdminRole(currentUser?.role);
  const [user, academies] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.academy.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!user) notFound();

  const protectedUser = isProtectedSuperAdmin(user);
  const canManage = superAdmin || (platformAdmin && !protectedUser && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.PLATFORM_ADMIN);
  if (!canManage) redirect("/admin/users");

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/admin/users" className="text-sm font-bold text-teal-800">User Management</Link>
        <h1 className="mt-2 text-5xl font-black text-stone-950">Edit User</h1>
        <p className="mt-3 break-all text-stone-700">{user.email}</p>
        <UserForm academies={academies} action={updateManagedUser.bind(null, user.id)} mode="edit" superAdmin={superAdmin} user={user} />
      </section>
    </PageShell>
  );
}
