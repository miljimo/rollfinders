import type { Metadata } from "next";
import { PageShell } from "@/components/Page";
import { getFeaturedData } from "@/lib/data";
import { HomeDifferentiators } from "./home/HomeDifferentiators";
import { HomeHero } from "./home/HomeHero";
import { HomeOpenMatCta } from "./home/HomeOpenMatCta";
import { HomeOpenMatsSection } from "./home/HomeOpenMatsSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Find BJJ training today",
  description: "Find today's BJJ open mats, nearby academies, gi and no-gi sessions, drop-in costs, and directions near you.",
};

export default async function Home({ searchParams }: { searchParams: Promise<{ lat?: string; lng?: string }> }) {
  const { lat, lng } = await searchParams;
  const location = lat && lng ? { latitude: Number(lat), longitude: Number(lng) } : undefined;
  const { events, upcomingNearYou } = await getFeaturedData(location);

  return (
    <PageShell>
      <HomeHero upcomingNearYou={upcomingNearYou} />
      <HomeDifferentiators />
      <HomeOpenMatsSection events={events} />
      <HomeOpenMatCta />
    </PageShell>
  );
}
