import type { Metadata } from "next";
import type { Viewport } from "next";
import type React from "react";
import Link from "next/link";
import { Bookmark, CalendarCheck, ChevronRight, CircleHelp, ExternalLink, LogIn, Map, MapPin, Search, ShieldCheck, UserRound } from "lucide-react";
import { AcademyVerificationStatus, ClaimStatus, CourseType } from "@prisma/client";
import { Button } from "@/app/_components/Button";
import { LogoutButton } from "@/app/_components/LogoutButton";
import { isMobileNavigationTab, MobileNavigation, type MobileNavigationTab } from "@/app/_components/MobileNavigation";
import { RegisterAcademySelector } from "@/app/register/RegisterAcademySelector";
import { registerPractitioner } from "@/app/register/actions";
import { MobileSignInForm } from "./MobileSignInForm";
import { getCurrentUser } from "@/lib/admin";
import { getAcademyFromAcademyService, listAcademiesFromAcademyService, type AcademyServiceRecord } from "@/lib/academyService";
import { courseHref, coursePriceLabel, courseTypeLabel } from "@/lib/courses";
import { getMapItems, getOpenMatRadar, searchAcademies } from "@/lib/data";
import { directionsUrl, formatDate, formatDistanceMiles } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders Mobile | Discover BJJ training",
  description: "A mobile-first RollFinders app surface for discovering academies, open mats, courses, bookings, and saved places.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

type MobileSearchParams = {
  academyId?: string;
  auth?: string;
  email?: string;
  error?: string;
  tab?: string;
  q?: string;
  registered?: string;
  verifyEmail?: string;
  warning?: string;
  when?: string;
  lat?: string;
  lng?: string;
};

function selectedTab(value?: string): MobileNavigationTab {
  return isMobileNavigationTab(value) ? value : "home";
}

function locationFromParams(params: MobileSearchParams) {
  const latitude = Number(params.lat);
  const longitude = Number(params.lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : undefined;
}

function mobileRegisterHref() {
  return "/mobile?tab=profile&auth=register";
}

function mobileSignInHref() {
  return "/mobile?tab=profile&auth=sign-in";
}

function webDashboardHref(path = "/dashboard") {
  return path;
}

async function mobileDataOrEmpty<T>(loader: () => Promise<T[]>): Promise<T[]> {
  try {
    return await loader();
  } catch {
    return [];
  }
}

async function mobileDataOrNull<T>(loader: () => Promise<T | null>): Promise<T | null> {
  try {
    return await loader();
  } catch {
    return null;
  }
}

function academySelectOptions(academies: AcademyServiceRecord[]) {
  return academies.map((academy) => ({
    id: academy.id,
    label: academy.name,
    description: [academy.city, academy.postcode].filter(Boolean).join(", "),
    meta: [academy.slug, academy.city, academy.postcode].filter(Boolean).join(" "),
  }));
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
  const profileAuth = params.auth === "register" ? "register" : params.auth === "sign-in" ? "sign-in" : null;

  const [events, academies, mapItems, mobileAcademyOptions, selectedMobileAcademy] = await Promise.all([
    mobileDataOrEmpty(() => getOpenMatRadar({ q: query, when: params.when, latitude: location?.latitude, longitude: location?.longitude, courseType: CourseType.OPEN_MAT })),
    mobileDataOrEmpty(() => searchAcademies(query, location)),
    activeTab === "map" ? mobileDataOrEmpty(() => getMapItems()) : Promise.resolve([]),
    activeTab === "profile" && profileAuth === "register" ? mobileDataOrEmpty(() => listAcademiesFromAcademyService({ limit: 100 })) : Promise.resolve([]),
    activeTab === "profile" && profileAuth === "register" && params.academyId ? mobileDataOrNull(() => getAcademyFromAcademyService(params.academyId ?? "")) : Promise.resolve(null),
  ]);

  return (
    <main className="min-h-dvh bg-[#f8faf7] pb-24 text-stone-950">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#f8faf7]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <Link href="/mobile" className="min-h-11 min-w-0 rounded-md text-lg font-black tracking-normal text-stone-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2">
            RollFinders
          </Link>
          <Button href={currentUser ? "/mobile?tab=profile" : mobileSignInHref()} size="icon" variant="secondary" className="size-11" aria-label={currentUser ? "Profile" : "Sign in"}>
            {currentUser ? <UserRound size={19} aria-hidden /> : <LogIn size={19} aria-hidden />}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-4">
        {activeTab === "home" ? (
          currentUser ? <DiscoverView academies={academies.slice(0, 5)} events={events.slice(0, 6)} query={query} /> : <MobileAuthHome />
        ) : null}
        {activeTab === "search" ? <DiscoverView academies={academies.slice(0, 5)} events={events.slice(0, 6)} query={query} /> : null}
        {activeTab === "map" ? <MapView academies={mapItems.slice(0, 20)} /> : null}
        {activeTab === "bookings" ? <BookingsView signedIn={Boolean(currentUser)} /> : null}
        {activeTab === "profile" ? (
          <ProfileView
            academyOptions={academySelectOptions(mobileAcademyOptions)}
            authMode={profileAuth}
            currentUser={currentUser}
            error={params.error}
            registered={params.registered === "1"}
            registeredEmail={params.email}
            selectedAcademy={selectedMobileAcademy}
            verifyEmail={params.verifyEmail === "1"}
            warning={params.warning}
          />
        ) : null}
      </div>

      <MobileNavigation activeTab={activeTab} />
    </main>
  );
}

function MobileAuthHome() {
  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-teal-700">RollFinders mobile</p>
        <h1 className="mt-2 text-3xl font-black tracking-normal text-stone-950">Find your next roll</h1>
        <p className="mt-2 text-sm leading-6 text-stone-700">Sign in to search events, manage bookings, save places, and keep your profile connected to your academy.</p>
        <div className="mt-5 grid gap-2">
          <Button href={mobileSignInHref()} variant="primary" className="min-h-12 w-full">
            Sign In
          </Button>
          <Button href={mobileRegisterHref()} variant="secondary" className="min-h-12 w-full">
            Register Account
          </Button>
        </div>
      </section>

      <section className="grid gap-3">
        <MobileSectionHeader title="Explore as guest" href="/mobile?tab=search" action="Search events" />
        <div className="grid gap-2 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <MobileLinkRow href="/mobile?tab=search" icon={Search} label="Search Open Mats" />
          <MobileLinkRow href="/mobile?tab=map" icon={Map} label="Browse Map" />
          <MobileLinkRow href="/academies" icon={Bookmark} label="Academies" webPage />
        </div>
      </section>
    </div>
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
          <input type="hidden" name="tab" value="search" />
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
      primaryHref={signedIn ? "/mobile?tab=search" : mobileSignInHref()}
      primaryLabel={signedIn ? "Find a Session" : "Sign In"}
      secondaryHref="/mobile?tab=search"
      secondaryLabel="Browse Events"
    />
  );
}

function AcademiesView({ signedIn }: { signedIn: boolean }) {
  return (
    <ActionView
      icon={<Bookmark size={26} aria-hidden />}
      title="Saved"
      body={signedIn ? "Saved academies and courses will collect here once saving is enabled on mobile cards." : "Sign in to keep academies, courses, and open mats ready for later."}
      primaryHref={signedIn ? "/academies" : mobileSignInHref()}
      primaryLabel={signedIn ? "Browse Academies" : "Sign In"}
      secondaryHref="/open-mats"
      secondaryLabel="Browse Events"
    />
  );
}

function ProfileView({
  academyOptions,
  authMode,
  currentUser,
  error,
  registered,
  registeredEmail,
  selectedAcademy,
  verifyEmail,
  warning,
}: {
  academyOptions: ReturnType<typeof academySelectOptions>;
  authMode: "register" | "sign-in" | null;
  currentUser: Awaited<ReturnType<typeof getCurrentUser>>;
  error?: string;
  registered: boolean;
  registeredEmail?: string;
  selectedAcademy: AcademyServiceRecord | null;
  verifyEmail: boolean;
  warning?: string;
}) {
  if (!currentUser) {
    if (authMode === "sign-in") {
      return <MobileSignInView registered={registered} registeredEmail={registeredEmail} verifyEmail={verifyEmail} warning={warning} />;
    }
    if (authMode === "register") {
      return <MobileRegisterView academyOptions={academyOptions} error={error} selectedAcademy={selectedAcademy} />;
    }
    return <MobileAuthChoice />;
  }

  const accountName = currentUser.email || "RollFinders user";
  const initials = accountName
    .split(/[\s@.]+/)
    .map((part: string) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="grid gap-4">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xl font-black text-teal-900" aria-hidden>
            {initials || <UserRound size={24} aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-black text-stone-950">{accountName}</h1>
            {currentUser.email ? <p className="mt-1 truncate text-sm font-semibold text-stone-600">{currentUser.email}</p> : null}
            {currentUser.role ? <p className="mt-2 inline-flex rounded-md bg-teal-50 px-2 py-1 text-xs font-black uppercase text-teal-900">{currentUser.role.replaceAll("_", " ")}</p> : null}
          </div>
          <ChevronRight size={19} className="text-stone-500" aria-hidden />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <MobileStatCard icon={<CalendarCheck size={20} aria-hidden />} value="0" label="Bookings" />
        <MobileStatCard icon={<Bookmark size={20} aria-hidden />} value="0" label="Saved" />
        <MobileStatCard icon={<ShieldCheck size={20} aria-hidden />} value={currentUser.academyId ? "1" : "0"} label="Academies" />
      </section>

      <section>
        <MobileSectionHeader title="My Activity" />
        <div className="mt-3 grid gap-1 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <MobileLinkRow href="/mobile?tab=bookings" icon={CalendarCheck} label="My Bookings" />
          <MobileLinkRow href="/mobile?tab=search" icon={Bookmark} label="Saved Open Mats" />
          <MobileLinkRow href="/academies" icon={ShieldCheck} label="Browse Academies" webPage />
        </div>
      </section>

      <section>
        <MobileSectionHeader title="My Account" />
        <div className="mt-3 grid gap-1 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <MobileLinkRow href={webDashboardHref()} icon={ExternalLink} label="Open Web Dashboard" webPage />
          <MobileLinkRow href="/contact" icon={CircleHelp} label="Help & Support" webPage />
          <MobileLinkRow href="/privacy-policy" label="Privacy Policy" webPage />
          <MobileLinkRow href="/terms" label="Terms of Service" webPage />
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-2 shadow-sm">
        <LogoutButton className="min-h-12 w-full justify-center rounded-md px-3 py-2 text-sm font-black text-red-700 hover:bg-red-50">
          Sign Out
        </LogoutButton>
      </section>
    </div>
  );
}

function MobileAuthChoice() {
  return (
    <ActionView
      icon={<UserRound size={26} aria-hidden />}
      title="Profile"
      body="Sign in or register before using profile, settings, bookings, and saved places on mobile."
      primaryHref={mobileSignInHref()}
      primaryLabel="Sign In"
      secondaryHref={mobileRegisterHref()}
      secondaryLabel="Register Account"
    />
  );
}

function MobileSignInView({
  registered,
  registeredEmail,
  verifyEmail,
  warning,
}: {
  registered: boolean;
  registeredEmail?: string;
  verifyEmail: boolean;
  warning?: string;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <MobileSectionHeader title="Sign in" href={mobileRegisterHref()} action="Register" />
      {registered ? (
        <p className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm font-semibold leading-6 text-teal-900">
          Account created{registeredEmail ? ` for ${registeredEmail}` : ""}.{" "}
          {verifyEmail
            ? warning === "verification-email"
              ? "Your account was created, but the verification email could not be sent. Contact support before signing in."
              : "Check your inbox and verify your email before signing in."
            : "Sign in to continue."}
        </p>
      ) : null}
      <MobileSignInForm />
    </section>
  );
}

function MobileRegisterView({
  academyOptions,
  error,
  selectedAcademy,
}: {
  academyOptions: ReturnType<typeof academySelectOptions>;
  error?: string;
  selectedAcademy: AcademyServiceRecord | null;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <MobileSectionHeader title="Register account" href={mobileSignInHref()} action="Sign in" />
      <p className="mt-2 text-sm leading-6 text-stone-700">Choose your academy, then create your practitioner account.</p>
      {error ? (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold leading-6 break-words text-red-800">
          {error}
        </p>
      ) : null}
      <form action={registerPractitioner} className="mt-4 grid gap-4">
        <RegisterAcademySelector academy={selectedAcademy} options={academyOptions} />
        <input type="hidden" name="callbackUrl" value="/mobile" />
        <input type="hidden" name="mobileAuth" value="1" />
        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
            First name
            <input name="firstName" required className="min-h-12 rounded-md border border-stone-300 bg-stone-50 px-3 text-base font-normal text-stone-950 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
            Last name
            <input name="lastName" required className="min-h-12 rounded-md border border-stone-300 bg-stone-50 px-3 text-base font-normal text-stone-950 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20" />
          </label>
        </div>
        <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
          Email
          <input name="email" type="email" required className="min-h-12 rounded-md border border-stone-300 bg-stone-50 px-3 text-base font-normal text-stone-950 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20" />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
          Password
          <input name="password" type="password" minLength={5} required className="min-h-12 rounded-md border border-stone-300 bg-stone-50 px-3 text-base font-normal text-stone-950 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20" />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
          Confirm password
          <input name="confirmPassword" type="password" minLength={5} required className="min-h-12 rounded-md border border-stone-300 bg-stone-50 px-3 text-base font-normal text-stone-950 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20" />
        </label>
        <Button type="submit" variant="primary" className="min-h-12 w-full">
          Create account
        </Button>
      </form>
    </section>
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

function MobileSectionHeader({ action, href, title }: { action?: string; href?: string; title: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-black tracking-normal text-stone-950">{title}</h2>
      {href && action ? <Link href={href} className="text-sm font-black text-teal-800">{action}</Link> : null}
    </div>
  );
}

function MobileStatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 text-center shadow-sm">
      <span className="mx-auto flex size-10 items-center justify-center rounded-md bg-teal-50 text-teal-800">{icon}</span>
      <p className="mt-2 text-2xl font-black text-stone-950">{value}</p>
      <p className="text-xs font-bold text-stone-600">{label}</p>
    </div>
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

function MobileLinkRow({
  href,
  icon: Icon,
  label,
  webPage = false,
}: {
  href: string;
  icon?: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  label: string;
  webPage?: boolean;
}) {
  return (
    <Link
      href={href}
      target={webPage ? "_blank" : undefined}
      rel={webPage ? "noreferrer" : undefined}
      className="flex min-h-12 items-center justify-between rounded-md px-3 text-sm font-black text-stone-800 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
    >
      <span className="flex min-w-0 items-center gap-3">
        {Icon ? <Icon size={18} className="shrink-0 text-teal-800" aria-hidden /> : null}
        <span className="truncate">{label}</span>
      </span>
      <ChevronRight size={18} aria-hidden />
    </Link>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm font-semibold leading-6 text-stone-600 shadow-sm">{text}</p>;
}
