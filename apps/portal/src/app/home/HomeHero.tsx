import type { EventAudience, EventPricingType } from "@prisma/client";

import { OpenMatLocationFilterForm } from "@/components/OpenMatLocationFilterForm";

type HomeHeroEvent = {
  id: string;
  occurrenceId?: string | null;
  occurrenceDateParam?: string;
  occurrenceStatus?: string;
  isRecurringOccurrence?: boolean;
  recurrenceLabel?: string | null;
  title: string;
  eventDate: Date;
  startTime: string;
  giType: string;
  audience: EventAudience;
  academy: {
    name: string;
  };
  pricingType?: EventPricingType;
  price: unknown;
  donationLabel?: string | null;
};

export function HomeHero({
  courseType,
  gi,
  query,
  upcomingNearYou: _upcomingNearYou,
  when,
}: {
  courseType: string;
  gi: string;
  query?: string;
  upcomingNearYou: HomeHeroEvent[];
  when: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-slate-100 bg-[radial-gradient(circle_at_left,_rgba(15,118,110,0.08),transparent_28%),radial-gradient(circle_at_right,_rgba(20,184,166,0.10),transparent_24%),linear-gradient(180deg,#ffffff_0%,#f7fbfb_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:py-24">
        <h1 className="text-5xl font-black leading-tight tracking-normal text-slate-950 sm:text-6xl">
          Where can I <span className="text-teal-700">train</span> today?
        </h1>
        <p className="mx-auto mt-5 max-w-4xl text-xl font-medium leading-8 text-slate-600">
          Find BJJ open mats, academies and training sessions near you.
        </p>
        <div className="mx-auto mt-12 max-w-6xl text-left">
          <OpenMatLocationFilterForm action="/" courseType={courseType} gi={gi} q={query ?? ""} variant="hero" when={when} />
        </div>
      </div>
    </section>
  );
}
