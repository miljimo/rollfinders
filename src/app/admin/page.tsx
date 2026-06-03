import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { PageShell } from "@/components/shell";
import { getCurrentUser, isPlatformAdminRole, isProtectedSuperAdmin, isSuperAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { createUser, toggleUserDisabled, updateUserRole } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  if (!isPlatformAdminRole(currentUser.role)) redirect("/login");
  const isSuperAdmin = isSuperAdminRole(currentUser.role);

  const [academies, events, users] = await Promise.all([
    prisma.academy.findMany({ take: 20, orderBy: { name: "asc" } }),
    prisma.event.findMany({ take: 20, where: { active: true }, include: { academy: true }, orderBy: { eventDate: "asc" } }),
    prisma.user.findMany({ take: 20, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-stone-950">Admin Portal</h1>
            <p className="mt-2 text-stone-700">Manage academies, open mats, and users.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/academies/new" className="rounded-md bg-teal-700 px-4 py-3 text-center text-sm font-bold text-white">New Academy</Link>
            <Link href="/admin/open-mats/new" className="rounded-md bg-stone-950 px-4 py-3 text-center text-sm font-bold text-white">New Open Mat</Link>
          </div>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <AdminPanel title="Academies">
            {academies.map((academy) => <Row key={academy.id} primary={academy.name} secondary={`${academy.borough ?? academy.city}, ${academy.postcode}${academy.verified ? " · verified" : ""}`} href={`/admin/academies/${academy.id}`} />)}
          </AdminPanel>
          <AdminPanel title="Events">
            {events.map((event) => <Row key={event.id} primary={event.title} secondary={`${event.academy.name} · ${formatDate(event.eventDate)}`} href={`/admin/open-mats/${event.id}`} />)}
          </AdminPanel>
          <AdminPanel title="Users">
            {isSuperAdmin ? (
              <form action={createUser} className="mb-4 grid gap-2 rounded-md border border-stone-200 bg-stone-50 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input name="name" placeholder="Name" className="min-h-10 rounded-md border border-stone-300 px-3 text-sm" />
                  <input name="email" type="email" required placeholder="Email" className="min-h-10 rounded-md border border-stone-300 px-3 text-sm" />
                  <input name="password" type="password" placeholder="Temporary password" className="min-h-10 rounded-md border border-stone-300 px-3 text-sm" />
                  <select name="role" defaultValue={Role.STANDARD_USER} className="min-h-10 rounded-md border border-stone-300 px-3 text-sm">
                    <option value={Role.STANDARD_USER}>Standard user</option>
                    <option value={Role.PLATFORM_ADMIN}>Platform admin</option>
                  </select>
                </div>
                <button className="min-h-10 rounded-md bg-stone-950 px-3 text-sm font-bold text-white">Create User</button>
              </form>
            ) : null}
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-2 border-b border-stone-100 py-3">
                <div>
                  <p className="font-semibold text-stone-950">{user.name ?? user.email}</p>
                  <p className="text-sm text-stone-600">{user.email}</p>
                  <p className="text-xs font-semibold text-stone-500">
                    {user.role}{user.status === "DISABLED" || user.disabled ? " · disabled" : ""}{isProtectedSuperAdmin(user) ? " · protected" : ""}
                    {user.lastLoginAt ? ` · last login ${formatDate(user.lastLoginAt)}` : ""}
                  </p>
                </div>
                {isSuperAdmin && !isProtectedSuperAdmin(user) ? (
                  <div className="flex flex-col gap-2">
                    <form action={updateUserRole.bind(null, user.id)} className="flex gap-1">
                      <select name="role" defaultValue={user.role} className="rounded-md border border-stone-300 px-2 py-1 text-xs">
                        <option value={Role.STANDARD_USER}>Standard</option>
                        <option value={Role.PLATFORM_ADMIN}>Platform</option>
                      </select>
                      <button className="rounded-md border border-stone-300 px-2 py-1 text-xs font-bold">Save</button>
                    </form>
                    <form action={toggleUserDisabled.bind(null, user.id)}>
                      <button className="rounded-md border border-stone-300 px-2 py-1 text-xs font-bold">
                        {user.status === "DISABLED" || user.disabled ? "Enable" : "Disable"}
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))}
          </AdminPanel>
        </div>
      </section>
    </PageShell>
  );
}

function AdminPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm"><h2 className="text-xl font-black text-stone-950">{title}</h2><div className="mt-3">{children}</div></section>;
}

function Row({ primary, secondary, href }: { primary: string; secondary: string; href: string }) {
  return <Link href={href} className="block border-b border-stone-100 py-3"><p className="font-semibold text-stone-950">{primary}</p><p className="text-sm text-stone-600">{secondary}</p></Link>;
}
