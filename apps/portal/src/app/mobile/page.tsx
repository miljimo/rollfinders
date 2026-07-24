import type { Metadata } from "next";
import type { Viewport } from "next";
import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, CalendarCheck, ChevronRight, Clock, HandHeart, MapPin, Search, UsersRound, UserRound } from "lucide-react";
import { CourseType } from "@prisma/client";
import { Button } from "@/app/_components/Button";
import { isMobileNavigationTab, MobileNavigation, type MobileNavigationTab } from "@/app/_components/MobileNavigation";
import { ForgotPasswordForm } from "@/app/forgot-password/ForgotPasswordForm";
import { RegisterAcademySelector } from "@/app/register/RegisterAcademySelector";
import { registerPractitioner } from "@/app/register/actions";
import { MobileSignInForm } from "./MobileSignInForm";
import { getCurrentUser } from "@/lib/admin";
import { getAcademyFromAcademyService, listAcademiesFromAcademyService, type AcademyServiceRecord } from "@/lib/academyService";
import { coursePriceLabel, courseTypeLabel } from "@/lib/courses";
import { getOpenMatRadar, searchAcademies } from "@/lib/data";
import { listBookingsPage } from "@/lib/bookings";
import { formatDate, formatDistanceMiles } from "@/lib/utils";
import { MobileAuthenticatedProfile } from "./MobileAuthenticatedProfile";
import { MobileDiscoverySearch, type MobileSearchSuggestion } from "./MobileDiscoverySearch";

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
  if (value === "search" || value === "map" || value === "bookings") return "home";
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

function navActiveTab(tab: MobileNavigationTab) {
  return tab === "profile" ? "profile" : "home";
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

export default async function MobilePage({ searchParams }: { searchParams: Promise<MobileSearchParams> }) {
  const params = await searchParams;
  const activeTab = selectedTab(params.tab);
  const location = locationFromParams(params);
  const query = params.q?.trim() ?? "";
  const currentUser = await getCurrentUser();
  const profileAuth = params.auth === "register" ? "register" : params.auth === "sign-in" ? "sign-in" : params.auth === "forgot-password" ? "forgot-password" : null;

  const [events, academies, mobileAcademyOptions, selectedMobileAcademy] = await Promise.all([
    mobileDataOrEmpty(() => getOpenMatRadar({ q: query, when: params.when, latitude: location?.latitude, longitude: location?.longitude, courseType: CourseType.OPEN_MAT })),
    mobileDataOrEmpty(() => searchAcademies(query, location)),
    activeTab === "profile" && profileAuth === "register" ? mobileDataOrEmpty(() => listAcademiesFromAcademyService({ limit: 100 })) : Promise.resolve([]),
    activeTab === "profile" && profileAuth === "register" && params.academyId ? mobileDataOrNull(() => getAcademyFromAcademyService(params.academyId ?? "")) : Promise.resolve(null),
  ]);
  const [profileAcademy, bookingCount] = currentUser && activeTab === "profile"
    ? await Promise.all([
        currentUser.academyId
          ? mobileDataOrNull(() => getAcademyFromAcademyService(currentUser.academyId ?? "", currentUser))
          : Promise.resolve(null),
        mobileBookingCount(currentUser),
      ])
    : [null, 0];

  return (
    <main className="min-h-dvh w-screen max-w-[100vw] overflow-x-hidden [overflow-x:clip] bg-[radial-gradient(circle_at_top_left,#eefaf7_0,#ffffff_34%,#f7faf8_100%)] pb-24 text-stone-950">
      <header className="w-full max-w-[100vw] border-b border-stone-200 bg-white/85 px-4 pb-5 pt-7">
        <div className="flex w-full min-w-0 items-center justify-start gap-3">
          <Link href="/mobile" className="flex min-h-12 min-w-0 items-center gap-3 rounded-md text-3xl font-black tracking-normal text-stone-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2">
            <Image src="/logo.png" alt="" width={54} height={54} className="size-12 shrink-0 object-contain" priority />
            <span>RollFinders</span>
          </Link>
        </div>
      </header>

      <div className="w-full max-w-[100vw] min-w-0 px-4 py-6">
        {activeTab === "home" ? <DiscoverView academies={academies.slice(0, 5)} events={events.slice(0, 6)} query={query} when={params.when} /> : null}
        {activeTab === "profile" ? (
          <ProfileView
            academyOptions={academySelectOptions(mobileAcademyOptions)}
            authMode={profileAuth}
            bookingCount={bookingCount}
            currentUser={currentUser}
            error={params.error}
            registered={params.registered === "1"}
            registeredEmail={params.email}
            selectedAcademy={selectedMobileAcademy}
            userAcademy={profileAcademy}
            verifyEmail={params.verifyEmail === "1"}
            warning={params.warning}
          />
        ) : null}
      </div>

      <MobileNavigation activeTab={navActiveTab(activeTab)} />
    </main>
  );
}

async function mobileBookingCount(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  try {
    const result = await listBookingsPage({
      accessToken: user.accessToken,
      actorUserId: user.id,
      customerId: user.id,
      limit: 1,
    });
    return result.pagination.count;
  } catch {
    return 0;
  }
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
  when,
}: {
  academies: Awaited<ReturnType<typeof searchAcademies>>;
  events: Awaited<ReturnType<typeof getOpenMatRadar>>;
  query: string;
  when?: string;
}) {
  const searchSuggestions: MobileSearchSuggestion[] = [
    ...events.map((event) => ({
      label: event.title,
      description: [event.academy.name, event.giType.replace("_", "-"), courseTypeLabel(event.courseType)].filter(Boolean).join(" · "),
    })),
    ...academies.map((academy) => ({
      label: academy.name,
      description: [academy.borough ?? academy.city, academy.postcode].filter(Boolean).join(", "),
    })),
  ];

  return (
    <div className="grid min-w-0 gap-7">
      <section className="min-w-0">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-teal-700">Mobile discovery</p>
        <h1 className="mt-4 max-w-full break-words text-4xl font-black leading-tight tracking-normal text-slate-950">Find your next round</h1>
        <MobileDiscoverySearch initialQuery={query} suggestions={searchSuggestions} />
        <div className="mt-4 grid min-w-0 grid-cols-3 gap-2">
          <MobileChip active={!when || when === "today"} href="/mobile?when=today" label="Today" />
          <MobileChip active={when === "tomorrow"} href="/mobile?when=tomorrow" label="Tomorrow" />
          <MobileChip active={when === "weekend"} href="/mobile?when=weekend" label="Weekend" />
        </div>
      </section>

      <MobileSectionHeader title="Upcoming" href="/mobile?tab=search" action="See all" />
      <div className="grid min-w-0 gap-5">
        {events.length ? events.map((event) => <MobileEventCard key={event.occurrenceId ?? event.id} event={event} />) : <EmptyPanel text="No upcoming sessions match that search." />}
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
  bookingCount,
  currentUser,
  error,
  registered,
  registeredEmail,
  selectedAcademy,
  userAcademy,
  verifyEmail,
  warning,
}: {
  academyOptions: ReturnType<typeof academySelectOptions>;
  authMode: "register" | "sign-in" | "forgot-password" | null;
  bookingCount: number;
  currentUser: Awaited<ReturnType<typeof getCurrentUser>>;
  error?: string;
  registered: boolean;
  registeredEmail?: string;
  selectedAcademy: AcademyServiceRecord | null;
  userAcademy: AcademyServiceRecord | null;
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
    if (authMode === "forgot-password") {
      return <MobileForgotPasswordView />;
    }
    return <MobileAuthChoice />;
  }

  const profileName = (currentUser as typeof currentUser & { name?: string | null }).name;
  return <MobileAuthenticatedProfile academyName={userAcademy?.name} bookingCount={bookingCount} email={currentUser.email} name={profileName} role={currentUser.role} />;
}

function MobileAuthChoice() {
  return (
    <section className="grid min-h-[calc(100dvh-13rem)] place-items-center">
      <div className="w-full max-w-full rounded-[1.45rem] bg-white px-6 py-10 text-center shadow-[0_18px_48px_rgba(15,23,42,0.10)]">
        <div className="mx-auto flex size-28 items-center justify-center rounded-full bg-teal-50 text-teal-800">
          <UserRound size={64} strokeWidth={1.8} aria-hidden />
        </div>
        <h1 className="mt-8 text-5xl font-black leading-none tracking-normal text-slate-950">Profile</h1>
        <p className="mx-auto mt-6 max-w-xs text-balance text-xl font-medium leading-9 text-slate-600">
          Sign in or register before using profile, settings, bookings, and saved places on mobile.
        </p>
        <div className="mt-9 grid gap-4">
          <Link href={mobileSignInHref()} className="flex min-h-16 w-full items-center justify-center rounded-xl bg-teal-700 px-4 text-xl font-black text-white shadow-[0_12px_26px_rgba(0,121,107,0.20)]">
            Sign In
          </Link>
          <Link href={mobileRegisterHref()} className="flex min-h-16 w-full items-center justify-center rounded-xl border-2 border-teal-700 bg-white px-4 text-xl font-black text-teal-800">
            Register Account
          </Link>
        </div>
      </div>
    </section>
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
    <section className="rounded-[1.45rem] bg-white px-6 py-8 shadow-[0_18px_48px_rgba(15,23,42,0.10)]">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h1 className="shrink-0 whitespace-nowrap text-4xl font-black leading-none tracking-normal text-slate-950">Sign in</h1>
        <Link href={mobileRegisterHref()} className="inline-flex min-h-12 shrink-0 items-center gap-1 rounded-xl px-1 text-lg font-black text-teal-800">
          Register
          <ChevronRight size={24} aria-hidden />
        </Link>
      </div>
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

function MobileForgotPasswordView() {
  return (
    <section className="pt-6">
      <h1 className="text-5xl font-black leading-tight tracking-normal text-slate-950">Forgot password</h1>
      <p className="mt-5 max-w-sm text-xl font-medium leading-9 text-slate-600">Enter your email and we will send a reset link if an account exists.</p>
      <ForgotPasswordForm loginHref={mobileSignInHref()} variant="mobile" />
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
      <h2 className="text-xl font-black tracking-normal text-slate-950">{title}</h2>
      {href && action ? <Link href={href} className="inline-flex items-center gap-1 text-sm font-black text-teal-800">{action}<ChevronRight size={16} aria-hidden /></Link> : null}
    </div>
  );
}

function MobileChip({ active = false, href, label }: { active?: boolean; href: string; label: string }) {
  return (
    <Link href={href} className={`inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full px-2 text-center text-sm font-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] ${active ? "bg-teal-700 text-white" : "border border-stone-200 bg-white text-slate-950"}`}>
      <CalendarCheck size={17} aria-hidden />
      {label}
    </Link>
  );
}

function mobileAcademyInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "RF";
}

function MobileEventCard({ event }: { event: Awaited<ReturnType<typeof getOpenMatRadar>>[number] }) {
  const detailHref = mobileEventHref(event);
  const logoUrl = (event.academy as { logoUrl?: string | null }).logoUrl?.trim();
  const giLabel = event.giType.replace("_", "-");
  const distanceLabel = event.distanceMiles != null ? formatDistanceMiles(event.distanceMiles) : null;

  return (
    <article className="w-full max-w-full min-w-0 overflow-hidden rounded-[1.35rem] border border-stone-100 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <p className="inline-flex rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-teal-800">{courseTypeLabel(event.courseType)}</p>
        <button type="button" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-800" aria-label={`Save ${event.title}`}>
          <Bookmark size={21} aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-center text-xs font-black leading-tight text-white">
          {logoUrl ? <Image src={logoUrl} alt="" width={64} height={64} unoptimized className="size-full object-cover" /> : mobileAcademyInitials(event.academy.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-3xl font-black leading-none tracking-normal text-slate-950">{event.title}</h3>
          <p className="mt-3 flex min-w-0 items-start gap-2 text-lg font-medium leading-6 text-stone-600">
            <MapPin size={19} className="mt-0.5 shrink-0 text-teal-700" aria-hidden />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{event.academy.name}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-3 divide-x divide-stone-200 border-y border-stone-200 py-4 text-center text-sm font-black leading-tight text-slate-950">
        <span className="grid min-w-0 gap-2 px-1">
          <CalendarCheck className="mx-auto text-teal-700" size={24} aria-hidden />
          <span className="min-w-0 break-words">{formatDate(event.eventDate)}</span>
        </span>
        <span className="grid min-w-0 gap-2 px-1">
          <Clock className="mx-auto text-teal-700" size={24} aria-hidden />
          <span className="min-w-0 break-words">{event.startTime}-{event.endTime}</span>
        </span>
        <span className="grid min-w-0 gap-2 px-1">
          <UsersRound className="mx-auto text-teal-700" size={24} aria-hidden />
          <span className="truncate uppercase">{giLabel}</span>
        </span>
      </div>

      <div className="mt-4 grid min-w-0 gap-3">
        <p className="flex min-w-0 items-center gap-3 text-lg font-medium leading-7 text-slate-800">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-800"><HandHeart size={22} aria-hidden /></span>
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">{coursePriceLabel(event)}</span>
        </p>
        {distanceLabel ? (
          <p className="flex min-w-0 items-center gap-3 text-lg font-black leading-7 text-teal-800">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-800"><MapPin size={22} aria-hidden /></span>
            <span>{distanceLabel}</span>
          </p>
        ) : null}
      </div>

      <Link href={detailHref} className="mt-4 flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-teal-700 px-4 text-base font-black text-white shadow-[0_12px_26px_rgba(0,121,107,0.20)]">
        View Details
        <ChevronRight size={22} aria-hidden />
      </Link>
    </article>
  );
}

function mobileEventHref(event: { id: string; isRecurringOccurrence?: boolean; occurrenceDateParam?: string }) {
  const params = new URLSearchParams({ returnTo: "/mobile" });
  if (event.isRecurringOccurrence && event.occurrenceDateParam) params.set("date", event.occurrenceDateParam);
  return `/mobile/events/${event.id}?${params.toString()}`;
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
