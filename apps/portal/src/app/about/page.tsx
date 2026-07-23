import type { Metadata } from "next";
import { PageShell } from "@/app/_components/Page";

export const metadata: Metadata = {
  title: "About RollFinders | BJJ open mat discovery",
  description: "Learn how RollFinders helps Brazilian Jiu-Jitsu practitioners find open mats, academies, and training sessions nearby.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PageShell>
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <p className="text-sm font-black uppercase tracking-wide text-teal-800">About RollFinders</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">Find better places to train BJJ in London.</h1>
        <div className="mt-8 space-y-5 text-lg leading-8 text-slate-700">
          <p>RollFinders is a London-focused discovery platform for Brazilian Jiu-Jitsu practitioners looking for academies, visitor-friendly sessions, and open mats.</p>
          <p>It was created because generic maps and martial arts directories are not built around BJJ training decisions. Open mat details often live across social posts, group chats, and outdated websites. RollFinders brings the essentials into one searchable place.</p>
          <p>The mission is simple: help practitioners quickly understand where they can train today, whether they are local, visiting London, returning after time away, or trying Jiu-Jitsu for the first time.</p>
          <p>RollFinders serves students, competitors, travelling grapplers, and academy owners who want accurate public information about training options across the city.</p>
          <p>The focus is deliberately narrow: open mat discovery, location-based search, nearby academy discovery, BJJ-specific filters, and a mobile-first way to choose the next place to train.</p>
        </div>
      </section>
    </PageShell>
  );
}
