import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { EventCard } from "@/components/EventCard";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";

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
          <p className="text-sm font-bold uppercase tracking-wide text-teal-800">{academy.verified ? "Verified academy" : academy.affiliation ?? "BJJ Academy"}</p>
          <h1 className="mt-2 text-4xl font-black text-stone-950">{academy.name}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-700">{academy.description}</p>
          <div className="mt-6 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-700 sm:grid-cols-2">
            <p><strong>Address:</strong> {address}</p>
            <p><strong>Borough:</strong> {academy.borough ?? "Not listed"}</p>
            <p><strong>Email:</strong> {academy.email ?? "Not listed"}</p>
            <p><strong>Phone:</strong> {academy.phone ?? "Not listed"}</p>
            <p><strong>Website:</strong> {academy.website ? <a className="text-teal-800" href={academy.website}>{academy.website}</a> : "Not listed"}</p>
            <p><strong>Drop-in:</strong> {academy.dropInPrice !== null ? formatMoney(academy.dropInPrice) : "Check with academy"}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-stone-700">
            {academy.giAvailable ? <span className="rounded-md bg-stone-100 px-3 py-2">Gi available</span> : null}
            {academy.nogiAvailable ? <span className="rounded-md bg-stone-100 px-3 py-2">No-Gi available</span> : null}
            {academy.beginnerFriendly ? <span className="rounded-md bg-stone-100 px-3 py-2">Beginner friendly</span> : null}
            {academy.competitionFocused ? <span className="rounded-md bg-stone-100 px-3 py-2">Competition focused</span> : null}
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
          <div className="flex flex-col gap-2">
            <a href={`https://www.google.com/maps/search/?api=1&query=${academy.latitude},${academy.longitude}`} target="_blank" rel="noreferrer" className="rounded-md bg-stone-950 px-3 py-2 text-center text-sm font-semibold text-white">Open Map</a>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
