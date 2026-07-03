import type { Metadata } from "next";
import type React from "react";
import Link from "next/link";
import { Bookmark, CalendarCheck, ChevronRight, Compass, LogIn, Map, MapPin, Search, UserRound } from "lucide-react";
import { AcademyVerificationStatus, ClaimStatus, CourseType } from "@prisma/client";
import { Button } from "@/components/Button";
import { getCurrentUser } from "@/lib/admin";
import { courseHref, coursePriceLabel, courseTypeLabel } from "@/lib/courses";
import { getMapItems, getOpenMatRadar, searchAcademies } from "@/lib/data";
import { loginUrl } from "@/lib/auth-urls";
import { directionsUrl, formatDate, formatDistanceMiles } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders Mobile | Discover BJJ training",
  description: "A mobile-first RollFinders app surface for discovering academies, open mats, courses, bookings, and saved places.",
};

type MobileSearchParams = {
  tab?: string;
  q?: string;
  when?: string;
  lat?: string;
  lng?: string;
};

const tabs = [
  { href: "/mobile", icon: Compass, id: "discover", label: "Discover" },
  { href: "/mobile?tab=map", icon: Map, id: "map", label: "Map" },
  { href: "/mobile?tab=bookings", icon: CalendarCheck, id: "bookings", label: "Bookings" },
  { href: "/mobile?tab=saved", icon: Bookmark, id: "saved", label: "Saved" },
  { href: "/mobile?tab=profile", icon: UserRound, id: "profile", label: "Profile" },
] as const;

type MobileTab = typeof tabs[number]["id"];

function selectedTab(value?: string): MobileTab {
  return tabs.some((tab) => tab.id === value) ? value as MobileTab : "discover";
}

function locationFromParams(params: MobileSearchParams) {
  const latitude = Number(params.lat);
  const longitude = Number(params.lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : undefined;
}

function mobileLoginHref(target = "/mobile?tab=profile") {
  return loginUrl(target);
}

function isVerified(academy: { verificationStatus?: AcademyVerificationStatus | null; verified?: boolean | null }) {
  return academy.verified === true || academy.verificationStatus === AcademyVerificationStatus.VERIFIED;
}

function isClaimed(academy: { claims?: { status: ClaimStatus }[]; members?: unknown[] }) {
  return Boolean(academy.members?.length) || Boolean(academy.claims?.some((claim) => claim.status === ClaimStatus.APPROVED));
}

export default async function MobilePage({ searchParams }: { searchParams: Promise<MobileSearchParams> }) {
  const params = await searchParams;
  const activeTab = selectedTab(params.tab);
  const location = locationFromParams(params);
  const query = params.q?.trim() ?? "";
  const currentUser = await getCurrentUser();

  const [events, academies, mapItems] = await Promise.all([
    getOpenMatRadar({ q: query, when: params.when, latitude: location?.latitude, longitude: location?.longitude, courseType: CourseType.OPEN_MAT }),
    searchAcademies(query, location),
    activeTab === "map" ? getMapItems() : Promise.resolve([]),
  ]);

  return (
    <main className="min-h-dvh bg-[#f8faf7] pb-24 text-stone-950">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#f8faf7]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <Link href="/mobile" className="min-h-11 min-w-0 rounded-md text-lg font-black tracking-normal text-stone-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2">
            RollFinders
          </Link>
          <Button href={currentUser ? "/mobile?tab=profile" : mobileLoginHref("/mobile?tab=profile")} size="icon" variant="secondary" className="size-11" aria-label={currentUser ? "Profile" : "Sign in"}>
            {currentUser ? <UserRound size={19} aria-hidden /> : <LogIn size={19} aria-hidden />}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-4">
        {activeTab === "discover" ? <DiscoverView academies={academies.slice(0, 5)} events={events.slice(0, 6)} query={query} /> : null}
        {activeTab === "map" ? <MapView academies={mapItems.slice(0, 20)} /> : null}
        {activeTab === "bookings" ? <BookingsView signedIn={Boolean(currentUser)} /> : null}
        {activeTab === "saved" ? <SavedView signedIn={Boolean(currentUser)} /> : null}
        {activeTab === "profile" ? <ProfileView currentUser={currentUser} /> : null}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-8px_28px_rgba(15,23,42,0.08)] backdrop-blur" aria-label="Mobile app navigation">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-black leading-tight transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${active ? "bg-teal-700 text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"}`}
              >
                <Icon size={19} aria-hidden />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

function DiscoverView({
  academies,
  events,
  query,
}: {
  academies: Awaited<ReturnType<typeof searchAcademies>>;
  events: Awaited<ReturnType<typeof getOpenMatRadar>>;
  query: string;
}) {
  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-teal-700">Mobile discovery</p>
        <h1 className="mt-2 text-3xl font-black tracking-normal text-stone-950">Find your next round</h1>
        <form action="/mobile" className="mt-4 flex min-h-12 overflow-hidden rounded-md border border-stone-200 bg-stone-50 focus-within:border-teal-700">
          <input type="hidden" name="tab" value="discover" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Academy, postcode, gi, no-gi"
            className="min-w-0 flex-1 bg-transparent px-3 text-base text-stone-950 outline-none placeholder:text-stone-500"
          />
          <button type="submit" className="inline-flex w-12 items-center justify-center bg-teal-700 text-white" aria-label="Search">
            <Search size={18} aria-hidden />
          </button>
        </form>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MobileChip href="/mobile?when=today" label="Today" />
          <MobileChip href="/mobile?when=tomorrow" label="Tomorrow" />
          <MobileChip href="/mobile?when=weekend" label="Weekend" />
        </div>
      </section>

      <MobileSection title="Upcoming">
        {events.length ? events.map((event) => <MobileEventCard key={event.occurrenceId ?? event.id} event={event} />) : <EmptyPanel text="No upcoming sessions match that search." />}
      </MobileSection>

      <MobileSection title="Academies">
        {academies.length ? academies.map((academy) => <MobileAcademyCard key={academy.id} academy={academy} />) : <EmptyPanel text="No academies match that search." />}
      </MobileSection>
    </div>
  );
}

function MapView({ academies }: { academies: Awaited<ReturnType<typeof getMapItems>> }) {
  return (
    <div className="grid gap-4">
      <section>
        <p className="text-xs font-black uppercase tracking-wide text-teal-700">Map</p>
        <h1 className="mt-1 text-3xl font-black tracking-normal text-stone-950">Nearby training spots</h1>
      </section>
      <div className="grid gap-3">
        {academies.map((academy) => {
          const address = `${academy.address}, ${academy.city} ${academy.postcode}`;
          return (
            <article key={academy.id} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-black text-stone-950">{academy.name}</h2>
                  <p className="mt-1 flex items-center gap-1 text-sm text-stone-600"><MapPin size={14} aria-hidden />{academy.borough ?? academy.city}, {academy.postcode}</p>
                  {academy.distanceMiles != null ? <p className="mt-1 text-sm font-bold text-teal-800">{formatDistanceMiles(academy.distanceMiles)}</p> : null}
                </div>
                <Link href={`/academies/${academy.slug}`} className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-stone-200 text-stone-700" aria-label={`Open ${academy.name}`}>
                  <ChevronRight size={18} aria-hidden />
                </Link>
              </div>
              {academy.events[0] ? <p className="mt-3 rounded-md bg-teal-50 px-3 py-2 text-xs font-bold leading-5 text-teal-900">{academy.events[0].title} · {formatDate(academy.events[0].eventDate)}</p> : null}
              <div className="mt-3 flex gap-2">
                <Button href={`/academies/${academy.slug}`} size="sm" variant="neutral" className="min-h-10 flex-1">Details</Button>
                <Button href={directionsUrl(address)} target="_blank" rel="noreferrer" size="sm" variant="secondary" className="min-h-10 flex-1">Directions</Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function BookingsView({ signedIn }: { signedIn: boolean }) {
  return (
    <ActionView
      icon={<CalendarCheck size={26} aria-hidden />}
      title="Bookings"
      body={signedIn ? "Your booking history will appear here as mobile booking records become available." : "Sign in before booking so confirmations and payment status can stay attached to your account."}
      primaryHref={signedIn ? "/open-mats" : mobileLoginHref("/mobile?tab=bookings")}
      primaryLabel={signedIn ? "Find a Session" : "Sign In"}
      secondaryHref="/open-mats"
      secondaryLabel="Browse Events"
    />
  );
}

function SavedView({ signedIn }: { signedIn: boolean }) {
  return (
    <ActionView
      icon={<Bookmark size={26} aria-hidden />}
      title="Saved"
      body={signedIn ? "Saved academies and courses will collect here once saving is enabled on mobile cards." : "Sign in to keep academies, courses, and open mats ready for later."}
      primaryHref={signedIn ? "/academies" : mobileLoginHref("/mobile?tab=saved")}
      primaryLabel={signedIn ? "Browse Academies" : "Sign In"}
      secondaryHref="/open-mats"
      secondaryLabel="Browse Events"
    />
  );
}

function ProfileView({ currentUser }: { currentUser: Awaited<ReturnType<typeof getCurrentUser>> }) {
  return (
    <div className="grid gap-4">
      <ActionView
        icon={<UserRound size={26} aria-hidden />}
        title={currentUser ? "Profile" : "Profile"}
        body={currentUser ? `Signed in as ${currentUser.email}.` : "Sign in for bookings, saved places, and profile settings."}
        primaryHref={currentUser ? "/mobile" : mobileLoginHref("/mobile?tab=profile")}
        primaryLabel={currentUser ? "Discover Sessions" : "Sign In"}
        secondaryHref="/contact"
        secondaryLabel="Support"
      />
      <section className="grid gap-2 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <MobileLinkRow href="/privacy-policy" label="Privacy Policy" />
        <MobileLinkRow href="/terms" label="Terms of Service" />
        <MobileLinkRow href="/contact" label="Support and Account Help" />
      </section>
    </div>
  );
}

function ActionView({
  body,
  icon,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  title,
}: {
  body: string;
  icon: React.ReactNode;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex size-12 items-center justify-center rounded-md bg-teal-50 text-teal-800">{icon}</div>
      <h1 className="mt-4 text-3xl font-black tracking-normal text-stone-950">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-stone-700">{body}</p>
      <div className="mt-5 grid gap-2">
        <Button href={primaryHref} variant="primary" className="min-h-12 w-full">{primaryLabel}</Button>
        <Button href={secondaryHref} variant="secondary" className="min-h-12 w-full">{secondaryLabel}</Button>
      </div>
    </section>
  );
}

function MobileSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section>
      <h2 className="text-xl font-black tracking-normal text-stone-950">{title}</h2>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

function MobileChip({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex min-h-10 items-center justify-center rounded-md bg-stone-100 px-2 text-center text-xs font-black text-stone-800">
      {label}
    </Link>
  );
}

function MobileEventCard({ event }: { event: Awaited<ReturnType<typeof getOpenMatRadar>>[number] }) {
  const detailHref = courseHref(event);
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-teal-700">{courseTypeLabel(event.courseType)}</p>
          <h3 className="mt-1 text-lg font-black leading-tight text-stone-950">{event.title}</h3>
          <p className="mt-1 text-sm font-semibold text-stone-700">{event.academy.name}</p>
        </div>
        <Link href={detailHref} className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-stone-200 text-stone-700" aria-label={`Open ${event.title}`}>
          <ChevronRight size={18} aria-hidden />
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold text-stone-700">
        <span>{formatDate(event.eventDate)}</span>
        <span>{event.startTime}-{event.endTime}</span>
        <span>{event.giType.replace("_", "-")}</span>
        <span>{coursePriceLabel(event)}</span>
      </div>
      {event.distanceMiles != null ? <p className="mt-2 text-sm font-bold text-teal-800">{formatDistanceMiles(event.distanceMiles)}</p> : null}
      <Button href={detailHref} size="sm" variant="neutral" className="mt-3 min-h-10 w-full">View Details</Button>
    </article>
  );
}

function MobileAcademyCard({ academy }: { academy: Awaited<ReturnType<typeof searchAcademies>>[number] }) {
  const trusted = isVerified(academy) && isClaimed(academy);
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-black leading-tight text-stone-950">{academy.name}</h3>
          <p className="mt-1 text-sm text-stone-600">{academy.borough ?? academy.city}, {academy.postcode}</p>
          {academy.distanceMiles != null ? <p className="mt-1 text-sm font-bold text-teal-800">{formatDistanceMiles(academy.distanceMiles)}</p> : null}
        </div>
        <Link href={`/academies/${academy.slug}`} className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-stone-200 text-stone-700" aria-label={`Open ${academy.name}`}>
          <ChevronRight size={18} aria-hidden />
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-stone-700">
        {academy.giAvailable ? <span className="rounded-md bg-stone-100 px-2 py-1">Gi</span> : null}
        {academy.nogiAvailable ? <span className="rounded-md bg-stone-100 px-2 py-1">No-Gi</span> : null}
        {academy.beginnerFriendly ? <span className="rounded-md bg-stone-100 px-2 py-1">Beginner</span> : null}
        {trusted ? <span className="rounded-md bg-teal-50 px-2 py-1 text-teal-900">Verified</span> : null}
      </div>
      {academy.events[0] ? <p className="mt-3 rounded-md bg-stone-50 px-3 py-2 text-xs font-bold leading-5 text-stone-700">{academy.events[0].title} · {formatDate(academy.events[0].eventDate)}</p> : null}
      <Button href={`/academies/${academy.slug}`} size="sm" variant="neutral" className="mt-3 min-h-10 w-full">Academy Details</Button>
    </article>
  );
}

function MobileLinkRow({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex min-h-12 items-center justify-between rounded-md px-1 text-sm font-black text-stone-800">
      <span>{label}</span>
      <ChevronRight size={18} aria-hidden />
    </Link>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm font-semibold leading-6 text-stone-600 shadow-sm">{text}</p>;
}
