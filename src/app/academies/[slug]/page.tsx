import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Button } from "@/components/Button";
import { AnalyticsClickTracker } from "@/components/AnalyticsClickTracker";
import { PageShell } from "@/components/PageShell";
import { EventCard } from "@/components/EventCard";
import { PublicListingWarning } from "@/components/PublicListingWarning";
import { analyticsCountryFromHeaders } from "@/lib/analytics/country";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";
import { getOpenMatRadar } from "@/lib/data";
import { academySocialPlatformLabels } from "@/lib/academy-social-links";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { ClaimStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AcademyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const academy = await prisma.academy.findUnique({
    where: { slug },
    include: {
      claims: { where: { status: ClaimStatus.APPROVED }, select: { status: true } },
      members: { select: { id: true } },
      socialLinks: { orderBy: { platform: "asc" } },
    },
  });

  if (!academy) notFound();
  const events = (await getOpenMatRadar()).filter((event) => event.academyId === academy.id);
  const academyIsManaged = academy.members.length > 0;
  const country = analyticsCountryFromHeaders(await headers());

  await recordAnalyticsEventBestEffort({
    eventName: "academy_profile_viewed",
    academyId: academy.id,
    source: "public_academy_profile",
    countryCode: country.countryCode,
    countryName: country.countryName,
    metadata: {
      slug: academy.slug,
      city: academy.city,
      borough: academy.borough,
      verificationStatus: academy.verificationStatus,
      featured: academy.featured,
      hasUpcomingOpenMats: events.length > 0,
    },
  });

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
            <p><strong>Email:</strong> {academy.email ? (
              <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "email", academyId: academy.id, external: true, sourcePage: "academy_profile" }}>
                <a className="text-teal-800" href={`mailto:${academy.email}`}>{academy.email}</a>
              </AnalyticsClickTracker>
            ) : "Not listed"}</p>
            <p><strong>Phone:</strong> {academy.phone ? (
              <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "phone", academyId: academy.id, external: true, sourcePage: "academy_profile" }}>
                <a className="text-teal-800" href={`tel:${academy.phone}`}>{academy.phone}</a>
              </AnalyticsClickTracker>
            ) : "Not listed"}</p>
            <p><strong>Website:</strong> {academy.website ? (
              <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "website", academyId: academy.id, external: true, sourcePage: "academy_profile" }}>
                <a className="text-teal-800" href={academy.website}>{academy.website}</a>
              </AnalyticsClickTracker>
            ) : "Not listed"}</p>
            <p><strong>Drop-in:</strong> {academy.dropInPrice !== null ? formatMoney(academy.dropInPrice) : "Check with academy"}</p>
          </div>
          {academy.socialLinks.length ? (
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
              {academy.socialLinks.map((link) => (
                <AnalyticsClickTracker key={link.id} eventName="commercial_intent_clicked" metadata={{ actionType: "social_link", academyId: academy.id, external: true, sourcePage: "academy_profile", platform: link.platform }}>
                  <a className="rounded-md border border-stone-200 bg-white px-3 py-2 text-teal-800" href={link.url} target="_blank" rel="noreferrer">
                    {academySocialPlatformLabels[link.platform]}
                  </a>
                </AnalyticsClickTracker>
              ))}
            </div>
          ) : null}
          <PublicListingWarning academy={academy} className="mt-4 max-w-3xl" />
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-stone-700">
            {academy.giAvailable ? <span className="rounded-md bg-stone-100 px-3 py-2">Gi available</span> : null}
            {academy.nogiAvailable ? <span className="rounded-md bg-stone-100 px-3 py-2">No-Gi available</span> : null}
            {academy.beginnerFriendly ? <span className="rounded-md bg-stone-100 px-3 py-2">Beginner friendly</span> : null}
            {academy.competitionFocused ? <span className="rounded-md bg-stone-100 px-3 py-2">Competition focused</span> : null}
          </div>
          <div className="mt-8">
            <h2 className="text-2xl font-black text-stone-950">Upcoming Open Mats</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {events.map((event) => <EventCard key={event.occurrenceId ?? event.id} event={event} />)}
              {events.length === 0 ? <p className="text-stone-600">No upcoming open mats listed yet.</p> : null}
            </div>
          </div>
        </div>
        <aside className="h-fit rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2">
            <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "directions", academyId: academy.id, external: true, sourcePage: "academy_profile" }}>
              <Button href={`https://www.google.com/maps/search/?api=1&query=${academy.latitude},${academy.longitude}`} target="_blank" rel="noreferrer" size="sm" variant="neutral" className="px-3 py-2 text-sm font-semibold">Open Map</Button>
            </AnalyticsClickTracker>
            {academyIsManaged ? (
              <div className="rounded-md border border-teal-100 bg-teal-50 p-3 text-sm text-teal-900">
                <p className="font-bold">{academy.verified ? "Verified and managed" : "Managed listing"}</p>
                <p className="mt-1 text-teal-800">
                  This academy listing is already managed by an approved academy contact.
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
                <p className="text-sm font-bold text-stone-950">Own or manage this academy?</p>
                <p className="mt-1 text-sm leading-6 text-stone-700">
                  Submit a claim so RollFinders can review your details before granting management access.
                </p>
                <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "claim_start", academyId: academy.id, external: false, sourcePage: "academy_profile" }}>
                  <Button href={`/academies/${academy.slug}/claim`} size="sm" variant="primary" className="mt-3 px-3 py-2 text-sm font-semibold">Claim this academy</Button>
                </AnalyticsClickTracker>
              </div>
            )}
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
