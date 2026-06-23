import { CalendarDays, Navigation, Search } from "lucide-react";

import { Differentiator } from "./Differentiator";

export function HomeDifferentiators() {
  return (
    <section className="hidden border-b border-stone-200 bg-white md:block">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-3">
        <Differentiator icon={<CalendarDays size={20} aria-hidden />} title="Open Mat Radar" text="Today, tomorrow, and weekend sessions first." />
        <Differentiator icon={<Navigation size={20} aria-hidden />} title="Nearby Training" text="Location-aware academy and open mat discovery." />
        <Differentiator icon={<Search size={20} aria-hidden />} title="BJJ-Specific Search" text="Gi, no-gi, drop-in cost, beginner fit, and competition focus." />
      </div>
    </section>
  );
}
