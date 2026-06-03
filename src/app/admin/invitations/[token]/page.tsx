import { InvitationStatus } from "@prisma/client";
import { PageShell } from "@/components/shell";
import { getCurrentUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { acceptAcademyInvitation } from "../../academies/actions";

export const dynamic = "force-dynamic";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();
  const invitation = await prisma.academyInvitation.findUnique({
    where: { token },
    include: { academy: true },
  });

  const invalid = !invitation || invitation.status !== InvitationStatus.PENDING || invitation.expiresAt < new Date();
  const wrongUser = user && invitation && invitation.invitedEmail.toLowerCase() !== user.email.toLowerCase();

  return (
    <PageShell>
      <section className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">Academy Invitation</h1>
        {invalid ? (
          <p className="mt-5 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">This invitation is no longer valid.</p>
        ) : (
          <div className="mt-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-stone-700">You have been invited to help manage <strong>{invitation.academy.name}</strong>.</p>
            {!user ? <p className="mt-3 text-sm text-stone-600">Log in with {invitation.invitedEmail} to accept this invitation.</p> : null}
            {wrongUser ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">This invitation is for {invitation.invitedEmail}.</p> : null}
            {user && !wrongUser ? (
              <form action={acceptAcademyInvitation.bind(null, token)} className="mt-4">
                <button className="rounded-md bg-teal-700 px-4 py-3 text-sm font-bold text-white">Accept Invitation</button>
              </form>
            ) : null}
          </div>
        )}
      </section>
    </PageShell>
  );
}
