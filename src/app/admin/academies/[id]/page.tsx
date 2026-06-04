import { notFound } from "next/navigation";
import Link from "next/link";
import { AcademyVerificationStatus } from "@prisma/client";
import { PageShell } from "@/components/shell";
import { canDeleteAcademy, canManageAcademyTeam, canViewAcademyTeam, requireAcademyEditor } from "@/lib/academy-access";
import { prisma } from "@/lib/prisma";
import { updateAcademy } from "../actions";
import { AcademyForm } from "../form";

export const dynamic = "force-dynamic";

export default async function EditAcademyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireAcademyEditor(id);
  const academy = await prisma.academy.findUnique({
    where: { id },
    include: { events: true, claims: true, members: true },
  });
  if (!academy) notFound();

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/admin/academies" className="text-sm font-bold text-teal-800">Academy Management</Link>
            <h1 className="mt-2 text-3xl font-black text-stone-950">{academy.name}</h1>
            <p className="mt-2 text-stone-700">{academy.city}, {academy.postcode}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge>{academy.verificationStatus}</StatusBadge>
            <StatusBadge>{academy.featured ? "Featured" : "Not Featured"}</StatusBadge>
            {canViewAcademyTeam(access) ? (
              <Link href={`/admin/academies/${academy.id}/team`} className="rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-stone-800">
                {canManageAcademyTeam(access) ? "Manage Team" : "View Team"}
              </Link>
            ) : null}
            <Link href={`/academies/${academy.slug}`} className="rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-stone-800">
              View Public Profile
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-black text-stone-950">Summary</h2>
            <p className="mt-3 leading-7 text-stone-700">{academy.description}</p>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Website" value={academy.website ?? "Not listed"} />
              <Info label="Email" value={academy.email ?? "Not listed"} />
              <Info label="Phone" value={academy.phone ?? "Not listed"} />
              <Info label="Categories" value={academy.categories ?? "Not categorised"} />
            </div>
          </section>
          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black text-stone-950">Statistics</h2>
            <div className="mt-3 grid gap-3">
              <Info label="Profile views" value="0" />
              <Info label="Enquiries" value={academy.claims.length.toString()} />
              <Info label="Reviews" value="0" />
              <Info label="Average rating" value="Not rated" />
              <Info label="Open mats" value={academy.events.length.toString()} />
              <Info label="Admins" value={academy.members.length.toString()} />
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-stone-950">Administrative Actions</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <StatusBadge>{academy.verificationStatus === AcademyVerificationStatus.VERIFIED ? "Verified" : "Awaiting verification action"}</StatusBadge>
            <StatusBadge>{academy.featured ? "Featured placement active" : "No featured placement"}</StatusBadge>
            {canDeleteAcademy(access) ? (
              <form action={`/api/admin/academies/${academy.id}`} method="post">
                <input type="hidden" name="_method" value="DELETE" />
                <button className="rounded-md border border-red-300 px-4 py-2 text-sm font-bold text-red-700">Delete Academy</button>
              </form>
            ) : null}
          </div>
        </section>

        <AcademyForm action={updateAcademy.bind(null, academy.id)} academy={academy} />
      </section>
    </PageShell>
  );
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex min-h-9 items-center rounded-md border border-stone-200 px-3 text-xs font-bold uppercase text-stone-700">{children}</span>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-stone-500">{label}</p>
      <p className="mt-1 break-all font-semibold text-stone-950">{value}</p>
    </div>
  );
}
