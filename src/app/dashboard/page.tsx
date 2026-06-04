import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, Users } from "lucide-react";
import { PageShell } from "@/components/shell";
import { requireStandardDashboardUser } from "@/lib/standard-dashboard";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Dashboard",
  description: "View your academy profile, members, and academy rolls.",
};

export default async function StandardDashboardPage() {
  const { user, academy } = await requireStandardDashboardUser();
  const rolls = await prisma.event.findMany({
    where: { academyId: academy.id, active: true },
    include: { academy: true },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-teal-700 text-lg font-black text-white" aria-hidden>
                {initials}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black text-stone-950">{user.name ?? user.email}</h1>
                <p className="truncate text-sm font-semibold text-stone-600">{user.email}</p>
              </div>
            </div>
            <dl className="mt-5 grid gap-3 text-sm">
              <ProfileRow label="Registered" value={formatDate(user.createdAt)} />
              <ProfileRow label="Academy" value={academy.name} />
              <ProfileRow label="Role" value="Standard User" />
            </dl>
            <div className="mt-5 grid gap-2">
              <Link href="/dashboard/members" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-bold text-white">
                <Users size={16} aria-hidden /> Members
              </Link>
              <Link href={`/academies/${academy.slug}`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-bold text-stone-800">
                View Academy
              </Link>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase text-teal-800">My Academy</p>
                <h2 className="mt-1 text-3xl font-black text-stone-950">{academy.name} Rolls</h2>
              </div>
              <p className="text-sm font-semibold text-stone-600">{rolls.length} active rolls</p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {rolls.map((roll) => (
                <article key={roll.id} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase text-teal-700">{roll.giType.replace("_", "-")}</p>
                  <h3 className="mt-1 text-lg font-black text-stone-950">
                    <Link href={`/open-mats/${roll.id}`}>{roll.title}</Link>
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-700">{roll.description}</p>
                  <dl className="mt-4 grid gap-2 text-sm text-stone-700 sm:grid-cols-3">
                    <div className="flex items-center gap-2"><CalendarDays size={16} aria-hidden />{formatDate(roll.eventDate)}</div>
                    <div>{roll.startTime}-{roll.endTime}</div>
                    <div>{formatMoney(roll.price)}</div>
                  </dl>
                </article>
              ))}
              {rolls.length === 0 ? <p className="text-stone-600">No academy rolls are listed yet.</p> : null}
            </div>
          </section>
        </div>
      </section>
    </PageShell>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-stone-500">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-stone-950">{value}</dd>
    </div>
  );
}
