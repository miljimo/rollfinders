import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/shell";
import { getCurrentUser, isPlatformAdminRole, isSuperAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  if (!isPlatformAdminRole(currentUser.role)) {
    const memberships = await prisma.academyMember.findMany({
      where: { userId: currentUser.id },
      include: { academy: true },
      orderBy: { createdAt: "asc" },
    });

    return (
      <PageShell>
        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <h1 className="text-3xl font-black text-stone-950">Academy Admin</h1>
          <p className="mt-2 text-stone-700">Manage academy profiles and team access assigned to your account.</p>
          <div className="mt-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-black text-stone-950">Your Academies</h2>
            <div className="mt-3 divide-y divide-stone-100">
              {memberships.map((membership) => (
                <Link key={membership.id} href={`/admin/academies/${membership.academyId}`} className="block py-3">
                  <p className="font-semibold text-stone-950">{membership.academy.name}</p>
                  <p className="text-sm text-stone-600">{membership.role} · {membership.academy.borough ?? membership.academy.city}</p>
                </Link>
              ))}
              {memberships.length === 0 ? <p className="py-3 text-sm text-stone-600">No academy access has been assigned yet.</p> : null}
            </div>
          </div>
        </section>
      </PageShell>
    );
  }

  const superAdmin = isSuperAdminRole(currentUser.role);
  const [academies, events, claims, users, members] = await Promise.all([
    prisma.academy.findMany({ take: 20, orderBy: { name: "asc" } }),
    prisma.event.findMany({ take: 20, where: { active: true }, include: { academy: true }, orderBy: { eventDate: "asc" } }),
    prisma.claimRequest.findMany({ take: 20, include: { academy: true }, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ take: 20, orderBy: { createdAt: "desc" } }),
    prisma.academyMember.findMany({ take: 20, include: { academy: true, user: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-stone-950">Admin Portal</h1>
            <p className="mt-2 text-stone-700">Manage academies, open mats, claims, and users.</p>
          </div>
          <Link href="/admin/academies/new" className="rounded-md bg-teal-700 px-4 py-3 text-center text-sm font-bold text-white">New Academy</Link>
          {superAdmin ? <Link href="/admin/platform-admins" className="rounded-md border border-stone-300 px-4 py-3 text-center text-sm font-bold text-stone-800">Platform Admins</Link> : null}
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <AdminPanel title="Academies">
            {academies.map((academy) => <Row key={academy.id} primary={academy.name} secondary={`${academy.borough ?? academy.city}, ${academy.postcode}${academy.verified ? " · verified" : ""}`} href={`/admin/academies/${academy.id}`} />)}
          </AdminPanel>
          <AdminPanel title="Events">
            {events.map((event) => <Row key={event.id} primary={event.title} secondary={`${event.academy.name} · ${formatDate(event.eventDate)}`} href={`/open-mats/${event.id}`} />)}
          </AdminPanel>
          <AdminPanel title="Claims">
            {claims.map((claim) => (
              <form key={claim.id} action={`/api/admin/claims/${claim.id}`} method="post" className="flex items-center justify-between gap-2 border-b border-stone-100 py-3">
                <div><p className="font-semibold text-stone-950">{claim.academy.name}</p><p className="text-sm text-stone-600">{claim.requesterName} · {claim.status}</p></div>
                <div className="flex gap-1">
                  <button name="status" value="APPROVED" className="rounded-md bg-teal-700 px-2 py-1 text-xs font-bold text-white">Approve</button>
                  <button name="status" value="REJECTED" className="rounded-md border border-stone-300 px-2 py-1 text-xs font-bold">Reject</button>
                </div>
              </form>
            ))}
          </AdminPanel>
          <AdminPanel title="Users">
            {users.map((user) => <Row key={user.id} primary={user.email} secondary={`${user.role}${user.disabled ? " · disabled" : ""}`} href="#" />)}
          </AdminPanel>
          {superAdmin ? (
            <AdminPanel title="Academy Memberships">
              {members.map((member) => <Row key={member.id} primary={member.user.email} secondary={`${member.academy.name} · ${member.role}`} href={`/admin/academies/${member.academyId}/team`} />)}
            </AdminPanel>
          ) : null}
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
