import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Role, UserStatus } from "@prisma/client";
import { PageShell } from "@/components/PageShell";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole, isProtectedSuperAdmin, isSuperAdminRole, requireAdminPage } from "@/lib/admin";
import { getManagedUser, getUserPermissionPanelModel } from "@/lib/users-service";
import { updateManagedUser } from "../actions";
import { UserForm } from "../UserForm";

export const dynamic = "force-dynamic";

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const query = await searchParams;
  const initialTab = query.tab === "permissions" ? "permissions" : "details";
  const currentUser = await getCurrentUser();
  const superAdmin = isSuperAdminRole(currentUser?.role);
  const platformAdmin = isPlatformAdminRole(currentUser?.role);
  const academyAdmin = isAcademyAdminRole(currentUser?.role);
  if (!currentUser) redirect("/admin/users");
  const { user } = await getManagedUser(currentUser, id).catch(() => ({ user: null }));

  if (!user) notFound();

  const protectedUser = isProtectedSuperAdmin(user);
  const canManage = superAdmin || (platformAdmin && !protectedUser && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN && user.role !== Role.PLATFORM_ADMIN);
  if (!canManage) redirect("/admin/users");
  const assignableFeatures = await getUserPermissionPanelModel(currentUser, id, {
    organisationId: user.academyId ?? undefined,
    applicationId: process.env.ROLLFINDERS_APPLICATION_ID ?? "app_rollfinders",
  }).catch(() => []);

  return (
    <PageShell>
      <section className="mx-auto max-w-[96rem] px-4 py-8 sm:px-6">
        <Link href="/admin/users" className="text-sm font-bold text-teal-800">User Management</Link>
        <h1 className="mt-2 text-5xl font-black text-stone-950">Edit User</h1>
        <p className="mt-3 break-all text-stone-700">Update user details, role, status and permissions.</p>
        <UserForm
          academies={[]}
          action={updateManagedUser.bind(null, user.id)}
          assignableFeatures={assignableFeatures}
          academyAdmin={academyAdmin}
          actorRole={currentUser.role}
          initialTab={initialTab}
          mode="edit"
          superAdmin={superAdmin}
          user={{ ...user, role: user.role as Role, status: user.status as UserStatus }}
        />
      </section>
    </PageShell>
  );
}
