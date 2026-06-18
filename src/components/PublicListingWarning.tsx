import { AcademyVerificationStatus, ClaimStatus } from "@prisma/client";

type PublicAcademyTrust = {
  id?: string;
  verified?: boolean;
  verificationStatus?: AcademyVerificationStatus;
  members?: unknown[];
  claims?: { status: ClaimStatus }[];
};

export function isPublicAcademyTrusted(academy: PublicAcademyTrust) {
  const verified = academy.verified === true || academy.verificationStatus === AcademyVerificationStatus.VERIFIED;
  const managed = Boolean(academy.members?.length) || Boolean(academy.claims?.some((claim) => claim.status === ClaimStatus.APPROVED));

  return verified && managed;
}

export function PublicListingWarning({ academy, className = "" }: { academy: PublicAcademyTrust; className?: string; course?: unknown }) {
  if (isPublicAcademyTrusted(academy)) {
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
