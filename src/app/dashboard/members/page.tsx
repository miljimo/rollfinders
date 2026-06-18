import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/PageShell";
import { prisma } from "@/lib/prisma";
import { memberSearchWhere, requireStandardDashboardUser } from "@/lib/standard-dashboard";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Academy Members",
  description: "Search members from your academy.",
};

type MemberParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StandardMembersPage({ searchParams }: { searchParams: Promise<MemberParams> }) {
  const { academy } = await requireStandardDashboardUser();
  const params = await searchParams;
  const q = (firstParam(params.q) ?? "").trim();
  const members = await prisma.academyMember.findMany({
    where: memberSearchWhere(academy.id, q),
    orderBy: [{ createdAt: "desc" }],
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="text-sm font-bold text-teal-800">Dashboard</Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-teal-800">Member Directory</p>
            <h1 className="mt-1 text-3xl font-black text-stone-950">{academy.name}</h1>
          </div>
          <p className="text-sm font-semibold text-stone-600">{members.length} members</p>
        </div>

        <form action="/dashboard/members" className="mt-6 flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:flex-row">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search members by name or email..."
            className="min-h-11 min-w-0 flex-1 rounded-md border border-stone-300 px-3 text-sm"
          />
          <Button type="submit" variant="neutral">Search</Button>
          {q ? <Button href="/dashboard/members" variant="secondary">Reset</Button> : null}
        </form>

        <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead className="bg-stone-50 text-xs font-bold uppercase text-stone-500">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Registered</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-t border-stone-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-stone-950">{member.userId}</p>
                      <p className="break-all text-stone-600">User service identity</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md border border-stone-200 px-2 py-1 text-xs font-bold text-stone-700">{member.role}</span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{formatDate(member.createdAt)}</td>
                  </tr>
                ))}
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-stone-600">No members match that search.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
