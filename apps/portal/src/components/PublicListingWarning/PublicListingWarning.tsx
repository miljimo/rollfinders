import { AcademyVerificationStatus, ClaimStatus, Role } from "@prisma/client";
import { WarningPanel } from "@/components/WarningPanel";

type PublicAcademyTrust = {
  id?: string;
  bookingVerified?: boolean | null;
  paymentsVerified?: boolean | null;
  publicListingVerified?: boolean | null;
  verified?: boolean;
  verificationStatus?: AcademyVerificationStatus;
  members?: unknown[];
  claims?: { status: ClaimStatus }[];
};

type CourseCreatorTrust = {
  createdBy?: {
    role?: Role;
    academyId?: string | null;
    academyMemberships?: { academyId?: string | null }[];
  } | null;
};

export function isPublicAcademyTrusted(academy: PublicAcademyTrust) {
  const verified = isPublicAcademyVerified(academy);
  const managed = Boolean(academy.members?.length) || Boolean(academy.claims?.some((claim) => claim.status === ClaimStatus.APPROVED));

	return verified && managed;
}

export function isPublicAcademyVerified(academy: PublicAcademyTrust) {
  if (typeof academy.publicListingVerified === "boolean") return academy.publicListingVerified;
  return academy.verified === true || academy.verificationStatus === AcademyVerificationStatus.VERIFIED;
}

export function isPublicAcademyBookingVerified(academy: PublicAcademyTrust) {
  return academy.bookingVerified === true;
}

export function isPublicAcademyPaymentsVerified(academy: PublicAcademyTrust) {
  return academy.paymentsVerified === true;
}

function wasCreatedByAcademyAdmin(academy: PublicAcademyTrust, course?: CourseCreatorTrust) {
  const creator = course?.createdBy;
  if (!creator || creator.role !== Role.ACADEMY_ADMIN || !academy.id) return false;
  if (creator.academyId === academy.id) return true;
  return Boolean(creator.academyMemberships?.some((membership) => membership.academyId === academy.id));
}

export function PublicListingWarning({ academy, className = "", course }: { academy: PublicAcademyTrust; className?: string; course?: unknown }) {
	if (isPublicAcademyVerified(academy)) {
		if (wasCreatedByAcademyAdmin(academy, course as CourseCreatorTrust | undefined)) {
			return null;
		}

		return (
      <WarningPanel className={className} title="Confirm before visiting" tone="neutral">
        Session details can change. Confirm the time, price, capacity, and visitor policy with the academy before travelling.
      </WarningPanel>
    );
  }

  return (
    <WarningPanel className={className} title="Check before you go">
      This academy listing is not yet claimed and verified by the academy. Prices and session details may change, so confirm with the academy before visiting.
    </WarningPanel>
  );
}
