import { notFound } from "next/navigation";
import Link from "next/link";
import { AcademyVerificationStatus } from "@prisma/client";
import { AnalyticsClickTracker, AnalyticsViewTracker } from "@/components/AnalyticsClickTracker";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/PageShell";
import { canDeleteAcademyRecord, canManageAcademyTeam, canViewAcademyTeam, requireAcademyEditor } from "@/lib/academy-access";
import { getCurrentUser, isAcademyAdminRole, isPlatformAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { updateAcademy } from "../actions";
import { AcademyForm } from "../AcademyForm";

export const dynamic = "force-dynamic";

export default async function EditAcademyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireAcademyEditor(id);
  const currentUser = await getCurrentUser();
  const academyAdmin = isAcademyAdminRole(currentUser?.role);
  const showAcademyStats = isPlatformAdminRole(currentUser?.role);
  const [academy, profileViewCount] = await Promise.all([
    prisma.academy.findUnique({
      where: { id },
      include: { events: true, claims: true, members: true },
    }),
    prisma.analyticsEvent.count({
      where: { academyId: id, eventName: "academy_profile_viewed" },
    }),
  ]);
  if (!academy) notFound();

  return (
    <PageShell>
      <AnalyticsViewTracker eventName="academy_profile_viewed" metadata={{ academyId: academy.id, sourcePage: "admin_academy_profile_summary" }} />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/admin?panel=academies" className="text-sm font-bold text-teal-800">Academy Management</Link>
            <h1 className="mt-2 text-3xl font-black text-stone-950">{academy.name}</h1>
            <p className="mt-2 text-stone-700">{academy.city}, {academy.postcode}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge>{academy.verificationStatus}</StatusBadge>
            <StatusBadge>{academy.featured ? "Featured" : "Not Featured"}</StatusBadge>
            {canViewAcademyTeam(access) ? (
              <Button href={`/admin/academies/${academy.id}/team`} size="sm" variant="secondary" className="px-3 py-2 text-sm">
                {canManageAcademyTeam(access) ? "Manage Team" : "View Team"}
              </Button>
            ) : null}
            <Button href={`/academies/${academy.slug}`} size="sm" variant="secondary" className="px-3 py-2 text-sm">
              View Public Profile
            </Button>
          </div>
        </div>

        <div className={`mt-6 grid gap-4 ${showAcademyStats ? "lg:grid-cols-3" : ""}`}>
          <section className={`rounded-lg border border-stone-200 bg-white p-4 shadow-sm ${showAcademyStats ? "lg:col-span-2" : ""}`}>
            <h2 className="text-lg font-black text-stone-950">Summary</h2>
            <p className="mt-3 leading-7 text-stone-700">{academy.description}</p>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Website" value={academy.website ? (
                <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "website", academyId: academy.id, external: true, sourcePage: "admin_academy_profile_summary" }}>
                  <a className="text-teal-800" href={academy.website}>{academy.website}</a>
                </AnalyticsClickTracker>
              ) : "Not listed"} />
              <Info label="Email" value={academy.email ? (
                <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "email", academyId: academy.id, external: true, sourcePage: "admin_academy_profile_summary" }}>
                  <a className="text-teal-800" href={`mailto:${academy.email}`}>{academy.email}</a>
                </AnalyticsClickTracker>
              ) : "Not listed"} />
              <Info label="Phone" value={academy.phone ? (
                <AnalyticsClickTracker eventName="commercial_intent_clicked" metadata={{ actionType: "phone", academyId: academy.id, external: true, sourcePage: "admin_academy_profile_summary" }}>
                  <a className="text-teal-800" href={`tel:${academy.phone}`}>{academy.phone}</a>
                </AnalyticsClickTracker>
              ) : "Not listed"} />
              <Info label="Categories" value={academy.categories ?? "Not categorised"} />
            </div>
          </section>
          {showAcademyStats ? (
            <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-black text-stone-950">Statistics</h2>
              <div className="mt-3 grid gap-3">
                <Info label="Profile views" value={profileViewCount.toString()} />
                <Info label="Enquiries" value={academy.claims.length.toString()} />
                <Info label="Reviews" value="0" />
                <Info label="Average rating" value="Not rated" />
                <Info label="Open mats" value={academy.events.length.toString()} />
                <Info label="Admins" value={academy.members.length.toString()} />
              </div>
            </section>
          ) : null}
        </div>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-stone-950">Administrative Actions</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <StatusBadge>{academy.verificationStatus === AcademyVerificationStatus.VERIFIED ? "Verified" : "Awaiting verification action"}</StatusBadge>
            <StatusBadge>{academy.featured ? "Featured placement active" : "No featured placement"}</StatusBadge>
            {canDeleteAcademyRecord(access, academy) ? (
              <form action={`/api/admin/academies/${academy.id}`} method="post">
                <input type="hidden" name="_method" value="DELETE" />
                <Button type="submit" variant="danger">Delete Academy</Button>
              </form>
            ) : null}
          </div>
        </section>

        {!academyAdmin ? <AcademyForm action={updateAcademy.bind(null, academy.id)} academy={academy} cancelHref="/admin?panel=academies" returnTo="/admin?panel=academies" /> : null}
      </section>
    </PageShell>
  );
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex min-h-9 items-center rounded-md border border-stone-200 px-3 text-xs font-bold uppercase text-stone-700">{children}</span>;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-stone-500">{label}</p>
      <p className="mt-1 break-all font-semibold text-stone-950">{value}</p>
    </div>
  );
}
