import Link from "next/link";
import { Role } from "@prisma/client";
import { PageShell } from "@/components/shell";
import { requireSuperAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createPlatformAdmin, removePlatformAdmin } from "./actions";

export const dynamic = "force-dynamic";

export default async function PlatformAdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; invited?: string; error?: string }>;
}) {
  await requireSuperAdminPage();
  const { created, invited, error } = await searchParams;
  const [platformAdmins, auditLogs] = await Promise.all([
    prisma.user.findMany({
      where: { role: Role.PLATFORM_ADMIN },
      orderBy: { createdAt: "desc" },
    }),
    prisma.adminAuditLog.findMany({
      take: 30,
      include: { actor: true, target: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-teal-800">Super Admin</p>
            <h1 className="text-3xl font-black text-stone-950">Platform Admins</h1>
            <p className="mt-2 text-stone-700">Promote trusted staff, revoke platform access, and review admin audit activity.</p>
          </div>
          <Link href="/admin" className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800">
            Admin Portal
          </Link>
        </div>

        {created ? <Notice tone="success">Platform admin created.</Notice> : null}
        {invited ? <Notice tone="success">No user exists for that email yet, so an invitation audit entry was recorded.</Notice> : null}
        {error === "invalid-email" ? <Notice tone="error">Enter a valid email address.</Notice> : null}
        {error === "super-admin" ? <Notice tone="error">Super admins cannot be changed from this screen.</Notice> : null}

        <form action={createPlatformAdmin} className="mt-6 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]">
          <label className="grid gap-1 text-sm font-semibold text-stone-800">
            Platform admin email
            <input name="email" type="email" required className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal" />
          </label>
          <button className="self-end rounded-md bg-teal-700 px-4 py-3 text-sm font-bold text-white">Add Platform Admin</button>
        </form>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-stone-950">Current Platform Admins</h2>
          <div className="mt-3 divide-y divide-stone-100">
            {platformAdmins.map((user) => (
              <div key={user.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-stone-950">{user.name ?? user.email}</p>
                  <p className="text-sm text-stone-600">{user.email}{user.disabled ? " · disabled" : ""}</p>
                </div>
                <form action={removePlatformAdmin.bind(null, user.id)}>
                  <button className="rounded-md border border-red-300 px-3 py-2 text-xs font-bold text-red-700">Remove Access</button>
                </form>
              </div>
            ))}
            {platformAdmins.length === 0 ? <p className="py-3 text-sm text-stone-600">No platform admins yet.</p> : null}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-stone-950">Audit Logs</h2>
          <div className="mt-3 divide-y divide-stone-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3">
                <p className="font-semibold text-stone-950">{log.action}</p>
                <p className="text-sm text-stone-600">
                  {log.actor.email}
                  {log.target ? ` -> ${log.target.email}` : ""} · {log.createdAt.toLocaleString("en-GB")}
                </p>
              </div>
            ))}
            {auditLogs.length === 0 ? <p className="py-3 text-sm text-stone-600">No audit activity yet.</p> : null}
          </div>
        </section>
      </section>
    </PageShell>
  );
}

function Notice({ tone, children }: { tone: "success" | "error"; children: React.ReactNode }) {
  const className = tone === "success" ? "bg-teal-50 text-teal-900" : "bg-red-50 text-red-800";
  return <p className={`mt-5 rounded-md p-3 text-sm font-semibold ${className}`}>{children}</p>;
}
