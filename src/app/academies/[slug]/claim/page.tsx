import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/PageShell";
import { analyticsCountryFromHeaders } from "@/lib/analytics/country";
import { recordAnalyticsEventBestEffort } from "@/lib/analytics/service";
import { prisma } from "@/lib/prisma";
import { AcademyClaimForm } from "./AcademyClaimForm";

export const dynamic = "force-dynamic";

export default async function AcademyClaimPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const academy = await prisma.academy.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      affiliation: true,
      verified: true,
      _count: {
        select: { members: true },
      },
    },
  });

  if (!academy) notFound();

  const academyIsManaged = academy._count.members > 0;

  if (!academyIsManaged) {
    const country = analyticsCountryFromHeaders(await headers());
    await recordAnalyticsEventBestEffort({
      eventName: "claim_profile_started",
      academyId: academy.id,
      source: "public_academy_claim",
      countryCode: country.countryCode,
      countryName: country.countryName,
      metadata: { slug: academy.slug },
    });
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-wide text-teal-800">
          {academy.verified ? "Verified academy" : academy.affiliation ?? "BJJ Academy"}
        </p>
        <h1 className="mt-2 text-4xl font-black text-stone-950">Claim {academy.name}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-700">
          Tell RollFinders how you are connected to this academy. Public users can submit a claim without logging in, and admin review happens before any academy access is granted.
        </p>

        {academyIsManaged ? (
          <div className="mt-6 rounded-lg border border-teal-200 bg-teal-50 p-5">
            <p className="text-sm font-bold uppercase tracking-wide text-teal-800">Managed listing</p>
            <h2 className="mt-2 text-2xl font-black text-stone-950">This academy is already managed.</h2>
            <p className="mt-3 leading-7 text-stone-700">
              RollFinders already has an approved academy contact for this listing, so new public ownership claims are not open from this page.
            </p>
            <Button href={`/academies/${academy.slug}`} variant="neutral" className="mt-4">Back to academy profile</Button>
          </div>
        ) : (
          <AcademyClaimForm academyId={academy.id} academyName={academy.name} academySlug={academy.slug} />
        )}
      </section>
    </PageShell>
  );
}
