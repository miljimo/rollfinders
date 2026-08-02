import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Edit3, KeyRound, MapPin, Search, ShieldCheck, UserRound } from "lucide-react";
import { Role, UserStatus } from "@prisma/client";
import { SidePanelControl, type SidePanelItem } from "@/app/_components/SidePanelControl";
import { MobileNavigation } from "@/app/_components/MobileNavigation";
import { QuickActionPanel, type QuickActionPanelItem } from "@/app/_components/QuickActionPanel";
import { TabControl } from "@/app/_components/tab-control";
import { courseHref, coursePriceLabel, getAcademyCourseDiscovery, mobileCourseHref } from "@/lib/courses";
import { academyMemberProfiles } from "@/lib/rollfinder-user-profiles";
import { requireDashboardUser } from "@/lib/standard-dashboard";
import { formatDate } from "@/lib/utils";
import { ChangePasswordForm } from "./password/ChangePasswordForm";
import { EditProfileForm } from "./settings/EditProfileForm";
import { DashboardAccountDropDownMenu } from "./DashboardAccountDropDownMenu";
import { AccountDeletionPanel } from "./settings/AccountDeletionPanel";
import { getCurrentAccountDeletionRequest, type AccountDeletionRequest } from "@/lib/users-service";
import AdminDashboardWorkspace from "./AdminDashboardWorkspace";
import { MobileDashboardHeader } from "./MobileDashboardHeader";
import { MobileDashboardSearch } from "./MobileDashboardSearch";
import { MobilePractitionerBookings } from "./MobilePractitionerBookings";
import { StandardDashboardRollsTable, type StandardDashboardRollRow } from "./StandardDashboardRollsTable";
import { BookingServiceError, listPractitionerBookings, type BookingRecord } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Dashboard",
  description: "View your profile, settings, academy, and courses/events.",
};

const standardRollsPageSize = 8;

type DashboardSearchParams = Record<string, string | string[] | undefined>;

type StandardPanel = "dashboard" | "members" | "profile" | "settings";
type SettingsAction = "change-password" | "edit-profile";
type MobileDashboardView = "courses" | "bookings";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function standardPanel(value: string | undefined): StandardPanel | null {
  if (!value || value === "dashboard" || value === "rolls") return "dashboard";
  if (value === "members") return "members";
  if (value === "profile") return "profile";
  if (value === "settings" || value === "password") return "settings";
  return null;
}

function pageFromParams(searchParams: DashboardSearchParams, key: string) {
  const value = Number(firstParam(searchParams[key]) ?? "1");
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function settingsAction(value: string | undefined): SettingsAction | null {
  if (value === "change-password" || value === "edit-profile") return value;
  return null;
}

function mobileDashboardView(value: string | undefined): MobileDashboardView {
  return value === "bookings" ? "bookings" : "courses";
}

function normalizedSearch(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function bookingSearchValue(booking: BookingRecord) {
  return [
    booking.reference,
    booking.status,
    booking.metadata?.course_title,
    booking.metadata?.event_title,
    booking.metadata?.academy_name,
    booking.metadata?.occurrence_date,
  ].map(normalizedSearch).join(" ");
}

function uniqueSearchOptions(options: { id: string; label: string; description?: string; meta?: string }[]) {
  return Array.from(new Map(options.filter((option) => option.id.trim()).map((option) => [option.id.toLowerCase(), option])).values());
}

function standardDashboardHref(searchParams: DashboardSearchParams, overrides: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => item && params.append(key, item));
      return;
    }
    params.set(key, value);
  });
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === 1) {
      params.delete(key);
      return;
    }
    params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

function dashboardCourseHref(
  course: Pick<DashboardRoll, "id" | "courseType" | "isRecurringOccurrence" | "occurrenceDateParam">,
  returnTo: string,
  mobileSurface: boolean,
) {
  if (mobileSurface) return mobileCourseHref(course, "/mobile?tab=profile");
  const href = courseHref(course);
  const [pathname, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("returnTo", returnTo);
  return `${pathname}?${params.toString()}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const { user, academy, actor } = await requireDashboardUser();
  const params = await searchParams;
  const mobileSurface = firstParam(params.surface) === "mobile";
  const routePanelRedirects: Record<string, string> = {
    academies: "/dashboard/academies",
    "academy-claims": "/dashboard/academy-claims",
    analytics: "/dashboard/analytics",
    bookings: "/dashboard/bookings",
    "open-mats": "/dashboard/courses",
    payments: "/dashboard/payment",
    "platform-admin-academies": "/dashboard/academy-review",
    subscriptions: "/dashboard/subscriptions",
    users: "/dashboard/users",
  };
  const routePanel = firstParam(params.panel);
  const routePanelRedirect = routePanel ? routePanelRedirects[routePanel] : undefined;
  if (mobileSurface && routePanelRedirect) redirect("/dashboard?surface=mobile");
  if (routePanelRedirect) {
    const nextParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (!value || key === "panel") return;
      if (Array.isArray(value)) {
        value.forEach((item) => item && nextParams.append(key, item));
        return;
      }
      nextParams.set(key, value);
    });
    const query = nextParams.toString();
    redirect(query ? `${routePanelRedirect}?${query}` : routePanelRedirect);
  }
  const platformAdminUser = user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN || user.role === Role.PLATFORM_ADMIN;
  const academyAdminUser = user.role === Role.ACADEMY_ADMIN || user.role === Role.ACADEMY_OWNER;
  if (!mobileSurface && (platformAdminUser || academyAdminUser)) {
    return <AdminDashboardWorkspace searchParams={Promise.resolve(params)} />;
  }

  const panel = standardPanel(firstParam(params.panel));
  if (!panel || (mobileSurface && panel === "members")) {
    redirect(mobileSurface ? "/dashboard?surface=mobile" : "/dashboard");
  }
  const mobileView = mobileDashboardView(firstParam(params.mobileView));

  const search = (firstParam(params.search) ?? "").trim();
  const requestedRollsPage = pageFromParams(params, "rollsPage");
  const [allAcademyRolls, practitionerBookings] = await Promise.all([
    academy ? getAcademyCourseDiscovery({ academyId: academy.id, q: mobileSurface ? undefined : search }) : Promise.resolve([]),
    mobileSurface && panel === "dashboard" ? getMobilePractitionerBookings(actor) : Promise.resolve({ bookings: [] }),
  ]);
  const normalizedQuery = normalizedSearch(search);
  const academyRolls = mobileSurface && normalizedQuery
    ? allAcademyRolls.filter((roll) => [roll.title, roll.description, roll.giType, roll.courseType, roll.instructor]
      .map(normalizedSearch).join(" ").includes(normalizedQuery))
    : allAcademyRolls;
  const rollCount = academyRolls.length;
  const totalRollPages = Math.max(1, Math.ceil(rollCount / standardRollsPageSize));
  const rollsPage = Math.min(requestedRollsPage, totalRollPages);
  const rolls = academyRolls.slice(
    (rollsPage - 1) * standardRollsPageSize,
    rollsPage * standardRollsPageSize,
  );
  const members = panel === "members" && academy ? await academyMemberProfiles(academy.id, search) : [];
  const deletionRequest = panel === "settings"
    ? (await getCurrentAccountDeletionRequest(actor)).request
    : null;

  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();
  const active = String(user.status) !== UserStatus.DISABLED && !user.disabled;
  const accountLabel = user.name ?? user.email;
  const standardNavigationItems: SidePanelItem[] = [
    { label: "Dashboard", href: standardDashboardHref(params, { panel: "dashboard" }), icon: "dashboard", active: panel === "dashboard" },
    { label: "Members", href: standardDashboardHref(params, { panel: "members" }), icon: "users", active: panel === "members" },
    { label: "Profile", href: standardDashboardHref(params, { panel: "profile" }), icon: "users", active: panel === "profile" },
    { label: "Settings", href: standardDashboardHref(params, { panel: "settings" }), icon: "settings", active: panel === "settings" },
  ];

  return (
    <div className="min-h-dvh max-w-[100vw] overflow-x-hidden bg-[#f8faf7] text-slate-900">
      {!mobileSurface ? (
        <SidePanelControl
          accountLabel={accountLabel}
          navigationItems={standardNavigationItems}
          roleLabel={roleLabel(user.role)}
          supportHref="/contact"
        />
      ) : null}

      <main className={`min-w-0 transition-[padding] duration-200 ${mobileSurface ? "pb-24" : "lg:pl-[var(--admin-side-panel-width,16rem)]"}`}>
        {mobileSurface ? (
          <MobileDashboardHeader
            accountEmail={user.email}
            accountName={accountLabel}
            accountRole={roleLabel(user.role)}
            avatarLabel={initials}
            profileHref={standardDashboardHref(params, { panel: "profile" })}
            settingsHref={standardDashboardHref(params, { panel: "settings" })}
          />
        ) : (
          <header className="flex min-h-20 items-center justify-between gap-4 border-b border-stone-200 bg-white px-4 sm:px-8 lg:min-h-24 lg:justify-end">
            <div className="size-11 lg:hidden" aria-hidden />
          <DashboardAccountDropDownMenu
            accountEmail={user.email}
            accountName={accountLabel}
            accountRole={roleLabel(user.role)}
            avatarLabel={initials}
            profileHref={standardDashboardHref(params, { panel: "profile" })}
            settingsHref={standardDashboardHref(params, { panel: "settings" })}
          />
          </header>
        )}

        <section className={`min-w-0 px-4 py-8 sm:px-8 ${mobileSurface ? "mx-auto w-full max-w-3xl" : ""}`}>
          {panel === "dashboard" ? (
            <DashboardPanel academy={academy} mobileSurface={mobileSurface} mobileView={mobileView} practitionerBookings={practitionerBookings} rolls={rolls} searchRolls={allAcademyRolls} rollsPage={rollsPage} search={search} searchParams={params} totalRollPages={totalRollPages} />
          ) : null}
          {panel === "members" ? <MembersPanel academy={academy} members={members} search={search} /> : null}
          {panel === "profile" ? <ProfilePanel academy={academy} active={active} user={user} /> : null}
          {panel === "settings" ? (
            <SettingsPanel
              academy={academy}
              deletionRequest={deletionRequest}
              searchParams={params}
              user={user}
            />
          ) : null}
        </section>
      </main>
      {mobileSurface ? <MobileNavigation activeTab="profile" /> : null}
    </div>
  );
}

type DashboardUser = Awaited<ReturnType<typeof requireDashboardUser>>["user"];
type DashboardAcademy = Awaited<ReturnType<typeof requireDashboardUser>>["academy"];
type DashboardRoll = Awaited<ReturnType<typeof getAcademyCourseDiscovery>>[number];
type PractitionerBookingsResult = { bookings: BookingRecord[]; error?: string };

async function getMobilePractitionerBookings(actor: { id: string; email: string; accessToken?: string }): Promise<PractitionerBookingsResult> {
  try {
    return { bookings: await listPractitionerBookings({ accessToken: actor.accessToken, email: actor.email, userId: actor.id }) };
  } catch (error) {
    const message = error instanceof BookingServiceError && error.status === 403
      ? "You do not have permission to view your bookings."
      : "Your bookings are temporarily unavailable.";
    return { bookings: [], error: message };
  }
}

function DashboardPanel({
  academy,
  mobileSurface,
  mobileView,
  practitionerBookings,
  rolls,
  searchRolls,
  rollsPage,
  search,
  searchParams,
  totalRollPages,
}: {
  academy: DashboardAcademy;
  mobileSurface: boolean;
  mobileView: MobileDashboardView;
  practitionerBookings: PractitionerBookingsResult;
  rolls: DashboardRoll[];
  searchRolls: DashboardRoll[];
  rollsPage: number;
  search: string;
  searchParams: DashboardSearchParams;
  totalRollPages: number;
}) {
  const returnTo = standardDashboardHref(searchParams, { panel: "dashboard" });
  const filteredBookings = search
    ? practitionerBookings.bookings.filter((booking) => bookingSearchValue(booking).includes(normalizedSearch(search)))
    : practitionerBookings.bookings;
  const courseSearchOptions = uniqueSearchOptions(searchRolls.map((roll) => ({
    id: roll.title,
    label: roll.title,
    description: `${roll.giType.replace("_", "-")} · ${formatDate(roll.eventDate)}`,
    meta: `${roll.description ?? ""} ${roll.courseType} ${roll.instructor ?? ""}`,
  })));
  const bookingSearchOptions = uniqueSearchOptions(practitionerBookings.bookings.map((booking) => ({
    id: normalizedSearch(booking.metadata?.course_title ?? booking.metadata?.event_title) || booking.reference,
    label: String(booking.metadata?.course_title ?? booking.metadata?.event_title ?? "Training session"),
    description: String(booking.metadata?.academy_name ?? booking.status),
    meta: bookingSearchValue(booking),
  })));
  const rows: StandardDashboardRollRow[] = rolls.map((roll) => ({
    id: roll.occurrenceId,
    title: roll.title,
    date: formatDate(roll.eventDate),
    time: `${roll.startTime}-${roll.endTime}`,
    giType: roll.giType.replace("_", "-"),
    price: coursePriceLabel(roll),
    href: dashboardCourseHref(roll, returnTo, mobileSurface),
  }));

  return (
    <div>
      <div>
        <div>
          <p className="text-sm font-bold uppercase text-teal-800">Dashboard</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">{academy?.name ?? "No Academy Assigned"}</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            {academy ? "Search and view upcoming courses/events for your assigned academy in read-only mode." : "No academy is assigned to your account yet."}
          </p>
        </div>
      </div>

      {mobileSurface ? (
        <TabControl
          activeValue={mobileView}
          ariaLabel="Practitioner dashboard"
          className="mt-6 [&_[role=tablist]]:!grid-cols-2"
          items={[
            {
              value: "courses",
              label: "Courses/Events",
              href: standardDashboardHref(searchParams, {
                panel: "dashboard",
                mobileView: "courses",
                rollsPage: undefined,
                search: undefined,
              }),
            },
            {
              value: "bookings",
              label: `My Bookings (${practitionerBookings.bookings.length})`,
              href: standardDashboardHref(searchParams, {
                panel: "dashboard",
                mobileView: "bookings",
                rollsPage: undefined,
                search: undefined,
              }),
            },
          ]}
        />
      ) : null}

      {mobileSurface ? (
        <MobileDashboardSearch
          key={mobileView}
          activeView={mobileView}
          initialQuery={search}
          options={mobileView === "bookings" ? bookingSearchOptions : courseSearchOptions}
        />
      ) : null}

      {mobileSurface && mobileView === "bookings" ? (
        <MobilePractitionerBookings bookings={filteredBookings} error={practitionerBookings.error} />
      ) : null}

      {!mobileSurface || mobileView === "courses" ? <section className="mt-6">
        {!mobileSurface ? <form action="/dashboard" className="mb-4 flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
          <input type="hidden" name="panel" value="dashboard" />
          <label className="grid flex-1 gap-1 text-sm font-semibold text-stone-800">
            Search Courses/Events
            <span className="relative">
              <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input name="search" defaultValue={search} placeholder={academy ? "Search by title, description, or format" : "No academy assigned"} disabled={!academy} className="min-h-11 w-full rounded-md border border-stone-300 px-10 text-base font-normal disabled:bg-stone-50" />
            </span>
          </label>
          <button className="min-h-11 rounded-md bg-stone-950 px-5 text-sm font-bold text-white disabled:bg-stone-300" disabled={!academy}>
            Search
          </button>
          {search ? (
            <Link href={standardDashboardHref(searchParams, { panel: "dashboard", search: undefined })} className="inline-flex min-h-11 items-center rounded-md border border-stone-300 px-5 text-sm font-bold text-stone-800 hover:bg-stone-50">
              Clear
            </Link>
          ) : null}
        </form> : null}

        <StandardDashboardRollsTable
          rows={rows}
          emptyMessage={academy ? "No upcoming courses/events match this academy search." : "No academy is assigned, so no courses/events data can be shown."}
          page={rollsPage}
          totalPages={totalRollPages}
          previousHref={standardDashboardHref(searchParams, { panel: "dashboard", rollsPage: rollsPage - 1 })}
          nextHref={standardDashboardHref(searchParams, { panel: "dashboard", rollsPage: rollsPage + 1 })}
        />
      </section> : null}
    </div>
  );
}

function MembersPanel({
  academy,
  members,
  search,
}: {
  academy: DashboardAcademy;
  members: Awaited<ReturnType<typeof academyMemberProfiles>>;
  search: string;
}) {
  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase text-teal-800">Member Directory</p>
          <h1 className="mt-1 text-3xl font-black text-stone-950">{academy?.name ?? "Academy Members"}</h1>
          <p className="mt-2 text-stone-600">Search members associated with your academy.</p>
        </div>
        <p className="text-sm font-semibold text-stone-600">{members.length} members</p>
      </div>

      <form action="/dashboard" className="mt-6 flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:flex-row">
        <input type="hidden" name="panel" value="members" />
        <input
          name="search"
          defaultValue={search}
          placeholder="Search members by name or email..."
          className="min-h-11 min-w-0 flex-1 rounded-md border border-stone-300 px-3 text-sm"
        />
        <button type="submit" className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-bold text-white transition hover:bg-teal-800">
          Search
        </button>
        {search ? (
          <Link href="/dashboard?panel=members" className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-800 transition hover:bg-stone-50">
            Reset
          </Link>
        ) : null}
      </form>

      <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead className="bg-stone-50 text-xs font-bold uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Registered</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-t border-stone-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-stone-950">{member.user?.name ?? member.user?.email ?? member.userId}</p>
                    <p className="break-all text-stone-600">{member.user?.email ?? member.userId}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{formatDate(member.createdAt)}</td>
                </tr>
              ))}
              {members.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-stone-600">No members match that search.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ProfilePanel({ academy, active, user }: { academy: DashboardAcademy; active: boolean; user: DashboardUser }) {
  return (
    <div>
      <p className="text-sm font-bold uppercase text-teal-800">Profile</p>
      <h1 className="mt-1 text-3xl font-black text-slate-950">Profile</h1>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">User Information</h2>
          <dl className="mt-4 grid gap-4 text-sm">
            <ProfileRow label="Name" value={user.name ?? user.email} />
            <ProfileRow label="Email" value={user.email} />
            <ProfileRow label="Role" value={roleLabel(user.role)} />
            <ProfileRow label="Status" value={active ? "Active" : "Disabled"} />
            <ProfileRow label="Joined" value={formatDate(user.createdAt)} />
          </dl>
          <div className="mt-5 flex items-center gap-2 rounded-md bg-teal-50 px-3 py-2 text-sm font-bold text-teal-800">
            <ShieldCheck size={18} aria-hidden />
            Read-only academy access
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Academy Information</h2>
          <div className="mt-4 flex items-start gap-3">
            <MapPin size={20} aria-hidden className="mt-0.5 shrink-0 text-teal-700" />
            <div className="min-w-0">
              <p className="font-black text-slate-950">{academy?.name ?? "No academy assigned"}</p>
              <p className="mt-1 text-sm text-slate-600">{academy ? `${academy.address}, ${academy.city}, ${academy.postcode}` : "Academy data is unavailable until assignment."}</p>
              {academy?.website ? (
                <p className="mt-2 break-words text-sm font-semibold text-slate-700">{academy.website}</p>
              ) : null}
            </div>
          </div>
          {academy ? (
            <Link href={`/academies/${academy.slug}`} className="mt-5 inline-flex rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-slate-800 hover:bg-stone-50">
              View Academy
            </Link>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function SettingsPanel({
  academy,
  deletionRequest,
  searchParams,
  user,
}: {
  academy: DashboardAcademy;
  deletionRequest: AccountDeletionRequest | null;
  searchParams: DashboardSearchParams;
  user: DashboardUser;
}) {
  const activeAction = settingsAction(firstParam(searchParams.settingsAction));
  const settingsHref = (settingsAction?: SettingsAction) => standardDashboardHref(searchParams, { panel: "settings", settingsAction });
  const settingsItems: QuickActionPanelItem[] = [
    {
      active: activeAction === "change-password",
      id: "change-password",
      title: "Change Password",
      description: "Set a new password for your account.",
      href: settingsHref("change-password"),
      icon: <KeyRound size={22} aria-hidden />,
    },
    {
      active: activeAction === "edit-profile",
      id: "edit-profile",
      title: "Edit Profile",
      description: "Update your personal display name.",
      href: settingsHref("edit-profile"),
      icon: <Edit3 size={22} aria-hidden />,
    },
  ];
  const detailTitle = activeAction === "change-password" ? "Change Password" : activeAction === "edit-profile" ? "Edit Profile" : "Select an account action";
  const detailIcon = activeAction === "change-password" ? <KeyRound size={20} aria-hidden className="text-teal-700" /> : activeAction === "edit-profile" ? <UserRound size={20} aria-hidden className="text-teal-700" /> : null;
  const active = String(user.status) !== UserStatus.DISABLED && !user.disabled;

  return (
    <div>
      <p className="text-sm font-bold uppercase text-teal-800">Settings</p>
      <h1 className="mt-1 text-3xl font-black text-slate-950">Settings</h1>
      <QuickActionPanel title="Account Actions" items={settingsItems} className="mt-6" />
      <section className="mt-7 min-h-72 rounded-lg border border-teal-300 bg-teal-50/20 p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          {detailIcon}
          <h2 className="text-xl font-black text-slate-950">{detailTitle}</h2>
        </div>
        {activeAction === "change-password" ? (
          <ChangePasswordForm cancelHref={settingsHref()} embedded />
        ) : null}
        {activeAction === "edit-profile" ? (
          <EditProfileForm
            academyName={academy?.name ?? "No academy assigned"}
            cancelHref={settingsHref()}
            email={user.email}
            name={user.name}
            roleLabel={roleLabel(user.role)}
            statusLabel={active ? "Active" : "Disabled"}
          />
        ) : null}
        {!activeAction ? (
          <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm font-semibold text-slate-600 shadow-sm">
            Choose Change Password or Edit Profile to open the form here.
          </p>
        ) : null}
      </section>
      <AccountDeletionPanel
        notice={firstParam(searchParams.deletionNotice)}
        request={deletionRequest}
        surface={firstParam(searchParams.surface)}
      />
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3">
      <dt className="text-sm font-semibold text-stone-600">{label}</dt>
      <dd className="min-w-0 break-words font-semibold text-stone-950">{value}</dd>
    </div>
  );
}

function roleLabel(role: Role) {
  if (role === Role.SUPER_ADMIN || role === Role.ADMIN) return "Super Admin";
  if (role === Role.PLATFORM_ADMIN) return "Platform Admin";
  if (role === Role.ACADEMY_ADMIN) return "Academy Admin";
  return "Standard User";
}
