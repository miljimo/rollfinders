import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/shell";
import { EventCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AcademyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const academy = await prisma.academy.findUnique({
    where: { slug },
    include: {
      events: {
        where: { eventDate: { gte: new Date() } },
        include: { academy: true },
        orderBy: { eventDate: "asc" },
      },
    },
  });

  if (!academy) notFound();

  const address = `${academy.address}, ${academy.city} ${academy.postcode}`;

  return (
    <PageShell>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-teal-800">{academy.affiliation ?? "BJJ Academy"}</p>
          <h1 className="mt-2 text-4xl font-black text-stone-950">{academy.name}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-700">{academy.description}</p>
          <div className="mt-6 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-700 sm:grid-cols-2">
            <p><strong>Address:</strong> {address}</p>
            <p><strong>Email:</strong> {academy.email ?? "Not listed"}</p>
            <p><strong>Phone:</strong> {academy.phone ?? "Not listed"}</p>
            <p><strong>Website:</strong> {academy.website ? <a className="text-teal-800" href={academy.website}>{academy.website}</a> : "Not listed"}</p>
          </div>
          <div className="mt-8">
            <h2 className="text-2xl font-black text-stone-950">Upcoming Open Mats</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {academy.events.map((event) => <EventCard key={event.id} event={event} />)}
              {academy.events.length === 0 ? <p className="text-stone-600">No upcoming open mats listed yet.</p> : null}
            </div>
          </div>
        </div>
        <aside className="h-fit rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="map-grid flex aspect-square items-center justify-center rounded-md border border-teal-100 bg-[#eef6ef] text-center text-sm font-semibold text-teal-900">
            {academy.latitude}, {academy.longitude}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <a href={`https://www.google.com/maps/search/?api=1&query=${academy.latitude},${academy.longitude}`} target="_blank" rel="noreferrer" className="rounded-md bg-stone-950 px-3 py-2 text-center text-sm font-semibold text-white">Open Map</a>
            <Link href={`/claim?academy=${academy.id}`} className="rounded-md border border-stone-300 px-3 py-2 text-center text-sm font-semibold text-stone-800">Claim Academy</Link>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
