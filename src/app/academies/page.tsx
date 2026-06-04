import type { Metadata } from "next";
import { PageShell } from "@/components/shell";
import { LocationSearchForm } from "@/components/LocationSearchForm";
import { AcademyCard } from "@/components/ui";
import { searchAcademies } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Academies - Browse London BJJ gyms",
  description: "Search London BJJ academies by borough, postcode, distance, gi, no-gi, drop-in cost, beginner fit, and competition focus.",
};

export default async function AcademiesPage({ searchParams }: { searchParams: Promise<{ q?: string; lat?: string; lng?: string }> }) {
  const { q = "", lat, lng } = await searchParams;
  const location = lat && lng ? { latitude: Number(lat), longitude: Number(lng) } : undefined;
  const academies = await searchAcademies(q, location);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">Academies</h1>
        <p className="mt-2 max-w-3xl text-stone-700">Find nearby Brazilian Jiu-Jitsu academies with the details generic directories miss: gi and no-gi availability, drop-in cost, beginner fit, competition focus, and open mat activity.</p>
        <div className="mt-5">
          <LocationSearchForm action="/academies" query={q} placeholder="e.g. Hackney, SW9, no-gi, competition" />
        </div>
        <p className="mt-5 text-sm font-medium text-stone-600">{academies.length} results · nearest first</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {academies.map((academy) => <AcademyCard key={academy.id} academy={academy} />)}
        </div>
      </section>
    </PageShell>
  );
}
