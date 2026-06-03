import Link from "next/link";
import { InvitationStatus } from "@prisma/client";
import { PageShell } from "@/components/shell";
import { requireAcademyOwner } from "@/lib/academy-access";
import { prisma } from "@/lib/prisma";
import {
  cancelAcademyInvitation,
  inviteAcademyAdmin,
  removeAcademyMember,
  resendAcademyInvitation,
  transferAcademyOwnership,
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function AcademyTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invited?: string; error?: string }>;
}) {
  const { id } = await params;
  const { invited, error } = await searchParams;
  await requireAcademyOwner(id);

  const academy = await prisma.academy.findUnique({
    where: { id },
    include: {
      members: { include: { user: true }, orderBy: [{ role: "desc" }, { createdAt: "asc" }] },
      invitations: {
        where: { status: InvitationStatus.PENDING },
        include: { invitedBy: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!academy) return null;

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-teal-800">Academy Team</p>
            <h1 className="text-3xl font-black text-stone-950">{academy.name}</h1>
          </div>
          <Link href={`/admin/academies/${academy.id}`} className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800">
            Edit Academy
          </Link>
        </div>

        {invited ? <p className="mt-5 rounded-md bg-teal-50 p-3 text-sm font-semibold text-teal-900">Invitation created.</p> : null}
        {error === "invalid-email" ? <p className="mt-5 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">Enter a valid email address.</p> : null}

        <form action={inviteAcademyAdmin.bind(null, academy.id)} className="mt-6 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]">
          <label className="grid gap-1 text-sm font-semibold text-stone-800">
            Invite admin by email
            <input name="invitedEmail" type="email" required className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal" />
          </label>
          <button className="self-end rounded-md bg-teal-700 px-4 py-3 text-sm font-bold text-white">Invite Admin</button>
        </form>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-stone-950">Members</h2>
          <div className="mt-3 divide-y divide-stone-100">
            {academy.members.map((member) => (
              <div key={member.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-stone-950">{member.user.name ?? member.user.email}</p>
                  <p className="text-sm text-stone-600">{member.user.email} · {member.role}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {member.role !== "OWNER" ? (
                    <form action={transferAcademyOwnership.bind(null, academy.id, member.id)}>
                      <button className="rounded-md border border-stone-300 px-3 py-2 text-xs font-bold text-stone-800">Transfer Ownership</button>
                    </form>
                  ) : null}
                  {member.role !== "OWNER" ? (
                    <form action={removeAcademyMember.bind(null, academy.id, member.id)}>
                      <button className="rounded-md border border-red-300 px-3 py-2 text-xs font-bold text-red-700">Remove</button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
            {academy.members.length === 0 ? <p className="py-3 text-sm text-stone-600">No members assigned yet.</p> : null}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-stone-950">Pending Invitations</h2>
          <div className="mt-3 divide-y divide-stone-100">
            {academy.invitations.map((invitation) => (
              <div key={invitation.id} className="grid gap-3 py-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="font-semibold text-stone-950">{invitation.invitedEmail}</p>
                  <p className="text-sm text-stone-600">Expires {invitation.expiresAt.toLocaleDateString("en-GB")}</p>
                  <p className="mt-1 break-all text-xs text-stone-500">/admin/invitations/{invitation.token}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={resendAcademyInvitation.bind(null, academy.id, invitation.id)}>
                    <button className="rounded-md border border-stone-300 px-3 py-2 text-xs font-bold text-stone-800">Resend</button>
                  </form>
                  <form action={cancelAcademyInvitation.bind(null, academy.id, invitation.id)}>
                    <button className="rounded-md border border-red-300 px-3 py-2 text-xs font-bold text-red-700">Cancel</button>
                  </form>
                </div>
              </div>
            ))}
            {academy.invitations.length === 0 ? <p className="py-3 text-sm text-stone-600">No pending invitations.</p> : null}
          </div>
        </section>
      </section>
    </PageShell>
  );
}
