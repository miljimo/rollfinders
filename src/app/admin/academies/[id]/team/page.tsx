import Link from "next/link";
import { AcademyMemberRole, InvitationStatus } from "@prisma/client";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/PageShell";
import { canManageAcademyTeam, canTransferAcademyOwnership, canViewAcademyTeam, requireAcademyTeamViewer } from "@/lib/academy-access";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { cancelAcademyInvitation, inviteAcademyAdmin, removeAcademyMember, resendAcademyInvitation, transferAcademyOwnership } from "../../actions";

export const dynamic = "force-dynamic";

export default async function AcademyTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireAcademyTeamViewer(id);
  const academy = await prisma.academy.findUnique({
    where: { id },
    include: {
      members: { orderBy: [{ role: "desc" }, { createdAt: "asc" }] },
      invitations: { where: { status: InvitationStatus.PENDING }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!academy || !canViewAcademyTeam(access)) return null;
  const canManageTeam = canManageAcademyTeam(access);

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href={`/admin/academies/${academy.id}`} className="text-sm font-semibold text-teal-800">Back to academy</Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-stone-950">Academy Team</h1>
            <p className="mt-2 text-stone-700">{academy.name}</p>
          </div>
          {canManageTeam ? (
            <form action={inviteAcademyAdmin.bind(null, academy.id)} className="flex gap-2">
              <input name="invitedEmail" type="email" required placeholder="admin@example.com" className="min-h-11 rounded-md border border-stone-300 px-3 text-sm" />
              <Button type="submit" variant="primary">Invite</Button>
            </form>
          ) : null}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-black text-stone-950">Members</h2>
            <div className="mt-3">
              {academy.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3 border-b border-stone-100 py-3">
                  <div>
                    <p className="font-semibold text-stone-950">{member.userId}</p>
                    <p className="text-sm text-stone-600">{member.role}</p>
                  </div>
                  {canManageTeam ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      {canTransferAcademyOwnership(access) && member.role !== AcademyMemberRole.OWNER ? (
                        <form action={transferAcademyOwnership.bind(null, academy.id, member.id)}>
                          <Button type="submit" size="sm" variant="secondary">Make Owner</Button>
                        </form>
                      ) : null}
                      {member.role !== AcademyMemberRole.OWNER || access.platformAdmin ? (
                        <form action={removeAcademyMember.bind(null, academy.id, member.id)}>
                          <Button type="submit" size="sm" variant="danger">Remove</Button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
              {academy.members.length === 0 ? <p className="py-3 text-sm text-stone-600">No members yet.</p> : null}
            </div>
          </section>

          {canManageTeam ? (
          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-black text-stone-950">Pending Invitations</h2>
            <div className="mt-3">
              {academy.invitations.map((invitation) => (
                <div key={invitation.id} className="border-b border-stone-100 py-3">
                  <p className="font-semibold text-stone-950">{invitation.invitedEmail}</p>
                  <p className="text-sm text-stone-600">Invited by {invitation.invitedById} · expires {formatDate(invitation.expiresAt)}</p>
                  <p className="mt-1 break-all text-xs text-stone-500">Accept URL: /admin/invitations/{invitation.token}</p>
                  <div className="mt-2 flex gap-2">
                    <form action={resendAcademyInvitation.bind(null, academy.id, invitation.id)}>
                      <Button type="submit" size="sm" variant="secondary">Resend</Button>
                    </form>
                    <form action={cancelAcademyInvitation.bind(null, academy.id, invitation.id)}>
                      <Button type="submit" size="sm" variant="danger">Cancel</Button>
                    </form>
                  </div>
                </div>
              ))}
              {academy.invitations.length === 0 ? <p className="py-3 text-sm text-stone-600">No pending invitations.</p> : null}
            </div>
          </section>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
