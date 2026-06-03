import type { Metadata } from "next";
import { StaticPageShell } from "@/components/shell";

export const metadata: Metadata = {
  title: "About RollFinder | London BJJ discovery",
  description: "Learn what RollFinder is, why it exists, and how it helps Brazilian Jiu-Jitsu practitioners find academies and open mats in London.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <StaticPageShell>
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-wide text-teal-800">About RollFinder</p>
        <h1 className="mt-3 text-4xl font-black text-stone-950">Helping grapplers find their next round.</h1>
        <div className="mt-6 space-y-5 text-lg leading-8 text-stone-700">
          <p>
            RollFinder is a London-focused discovery platform for Brazilian Jiu-Jitsu practitioners looking for academies, visitor-friendly sessions, and open mats.
          </p>
          <p>
            It was created to make training information easier to find. Open mat details often live across social posts, group chats, and outdated websites. RollFinder brings the essentials into one searchable place.
          </p>
          <p>
            The mission is simple: help practitioners quickly understand where they can train today, whether they are local, visiting London, returning after time away, or trying Jiu-Jitsu for the first time.
          </p>
          <p>
            RollFinder serves students, competitors, travelling grapplers, and academy owners who want accurate public information about training options across the city.
          </p>
        </div>
      </section>
    </StaticPageShell>
  );
}
