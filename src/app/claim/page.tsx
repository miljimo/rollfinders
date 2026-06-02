import { PageShell } from "@/components/shell";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ academy?: string; submitted?: string }> }) {
  const { academy: selectedAcademy = "", submitted } = await searchParams;
  const academies = await prisma.academy.findMany({ orderBy: { name: "asc" } });

  return (
    <PageShell>
      <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">Claim Academy</h1>
        <p className="mt-2 text-stone-700">Submit your details for admin review.</p>
        {submitted ? <p className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-teal-900">Claim request submitted.</p> : null}
        <form action="/api/claims" method="post" className="mt-6 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <label className="grid gap-1 text-sm font-semibold text-stone-800">
            Name
            <input name="requesterName" required className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-800">
            Email
            <input name="requesterEmail" type="email" required className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-800">
            Academy
            <select name="academyId" defaultValue={selectedAcademy} required className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal">
              <option value="">Select an academy</option>
              {academies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <button className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-bold text-white">Submit Claim</button>
        </form>
      </section>
    </PageShell>
  );
}
