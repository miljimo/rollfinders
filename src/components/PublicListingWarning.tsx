import { AcademyMemberRole, AcademyVerificationStatus, ClaimStatus, Role } from "@prisma/client";

type PublicAcademyTrust = {
  id?: string;
  verified?: boolean;
  verificationStatus?: AcademyVerificationStatus;
  members?: unknown[];
  claims?: { status: ClaimStatus }[];
};

type CourseCreatorTrust = {
  createdBy?: {
    role?: Role;
    academyId?: string | null;
    academyMemberships?: { academyId?: string | null; role?: AcademyMemberRole }[];
  } | null;
};

export function isPublicAcademyTrusted(academy: PublicAcademyTrust) {
  const verified = academy.verified === true || academy.verificationStatus === AcademyVerificationStatus.VERIFIED;
  const managed = Boolean(academy.members?.length) || Boolean(academy.claims?.some((claim) => claim.status === ClaimStatus.APPROVED));

	return verified && managed;
}

function wasCreatedByAcademyAdmin(academy: PublicAcademyTrust, course?: CourseCreatorTrust) {
  const creator = course?.createdBy;
  if (!creator || creator.role !== Role.ACADEMY_ADMIN || !academy.id) return false;
  if (creator.academyId === academy.id) return true;
  return Boolean(creator.academyMemberships?.some((membership) => membership.academyId === academy.id && membership.role === AcademyMemberRole.ADMIN));
}

export function PublicListingWarning({ academy, className = "", course }: { academy: PublicAcademyTrust; className?: string; course?: unknown }) {
	if (isPublicAcademyTrusted(academy)) {
		if (wasCreatedByAcademyAdmin(academy, course as CourseCreatorTrust | undefined)) {
			return null;
		}

		return (
      <div className={`rounded-md border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-stone-800 ${className}`}>
        <p className="font-bold text-stone-950">Confirm before visiting</p>
        <p className="mt-1 font-semibold text-stone-700">
          Session details can change. Confirm the time, price, capacity, and visitor policy with the academy before travelling.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950 ${className}`}>
      <p className="font-bold">Check before you go</p>
      <p className="mt-1 font-semibold text-amber-900">
        This academy listing is not yet claimed and verified by the academy. Prices and session details may change, so confirm with the academy before visiting.
      </p>
    </div>
  );
}
