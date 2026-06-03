import { PageShell } from "@/components/shell";
import { AcademyCard, SearchForm } from "@/components/ui";
import { searchAcademies } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AcademiesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const academies = await searchAcademies(q);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">Academies</h1>
        <p className="mt-2 text-stone-700">Search by academy, borough, postcode, affiliation, gi, no-gi, beginner, or competition.</p>
        <div className="mt-5"><SearchForm action="/academies" query={q} placeholder="e.g. Hackney, SW9, no-gi, competition" /></div>
        <p className="mt-5 text-sm font-medium text-stone-600">{academies.length} results</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {academies.map((academy) => <AcademyCard key={academy.id} academy={academy} />)}
        </div>
      </section>
    </PageShell>
  );
}
