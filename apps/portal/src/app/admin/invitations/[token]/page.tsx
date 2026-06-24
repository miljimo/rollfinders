import { acceptAcademyInvitation } from "@/app/admin/academies/actions";

export const dynamic = "force-dynamic";

export default async function AcceptAcademyInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await acceptAcademyInvitation(token);
}
