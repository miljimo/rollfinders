import type { Metadata } from "next";
import { StaticPageShell } from "@/components/StaticPageShell";

export const metadata: Metadata = {
  title: "About RollFinders | London BJJ discovery",
  description: "Learn how RollFinders focuses on open mat discovery, nearby BJJ academies, and mobile-first training search across London.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <StaticPageShell>
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-wide text-teal-800">About RollFinders</p>
        <h1 className="mt-3 text-4xl font-black text-stone-950">Built around one question: where can I train today?</h1>
        <div className="mt-6 space-y-5 text-lg leading-8 text-stone-700">
          <p>
            RollFinders is a London-focused discovery platform for Brazilian Jiu-Jitsu practitioners looking for academies, visitor-friendly sessions, and open mats.
          </p>
          <p>
            It was created because generic maps and martial arts directories are not built around BJJ training decisions. Open mat details often live across social posts, group chats, and outdated websites. RollFinders brings the essentials into one searchable place.
          </p>
          <p>
            The mission is simple: help practitioners quickly understand where they can train today, whether they are local, visiting London, returning after time away, or trying Jiu-Jitsu for the first time.
          </p>
          <p>
            RollFinders serves students, competitors, travelling grapplers, and academy owners who want accurate public information about training options across the city.
          </p>
          <p>
            The focus is deliberately narrow: open mat discovery, location-based search, nearby academy discovery, BJJ-specific filters, and a mobile-first way to choose the next place to train.
          </p>
        </div>
      </section>
    </StaticPageShell>
  );
}
