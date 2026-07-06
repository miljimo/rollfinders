import type { AcademyVerificationStatus } from "@prisma/client";

export type PlatformAdminAcademyRow = {
  id: string;
  name: string;
  slug: string;
  borough: string | null;
  city: string;
  postcode: string;
  verificationStatus: AcademyVerificationStatus;
  createdAt: Date;
  createdById: string | null;
};

export type PlatformAdminAcademyTableRow = Record<string, unknown> & {
  id: string;
  academy: string;
  creator: string;
  creatorEmail: string;
  location: string;
  reviewLabel: string;
  reviewHref: string;
  verificationStatus: AcademyVerificationStatus;
  createdAt: Date;
  slug: string;
};

