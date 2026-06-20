import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

type PublicEventFlyerProps = {
  academyName: string;
  coverImageUrl?: string | null;
  eventTypeLabel: string;
  title: string;
  trusted: boolean;
};

const defaultEventFlyerImage = "/defaultFlyerImage.png";

export function PublicEventFlyer({
  academyName,
  coverImageUrl,
  eventTypeLabel,
  title,
  trusted,
}: PublicEventFlyerProps) {
  const coverUrl = coverImageUrl?.trim();
  const imageUrl = coverUrl || defaultEventFlyerImage;

  return (
    <section className="overflow-hidden rounded-lg bg-white" aria-labelledby="event-title">
      <div className="relative min-h-[19rem] overflow-hidden bg-stone-100">
        <Image src={imageUrl} alt="" fill priority unoptimized sizes="(min-width: 1024px) 760px, 100vw" className="object-cover object-center" />
        {coverUrl ? <div className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.97)_0%,rgba(255,255,255,0.9)_32%,rgba(255,255,255,0.3)_55%,rgba(255,255,255,0)_75%)]" /> : null}

        <div className="relative z-10 flex min-h-[19rem] max-w-2xl flex-col px-5 py-8 sm:px-8">
          <div className="pt-2">
            <span className="rounded-md bg-teal-50 px-3 py-2 text-xs font-black uppercase text-teal-800 shadow-sm">
              {eventTypeLabel}
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-center pb-2">
            <h1 id="event-title" className="max-w-xl text-5xl font-normal leading-tight text-stone-950">
              {title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xl font-medium text-stone-900">
              <span>{academyName}</span>
              {trusted ? <CheckCircle2 size={21} className="fill-blue-500 text-blue-500" aria-label="Verified academy" /> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
