import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AcademyVerificationStatus, ClaimStatus, Role } from "@prisma/client";
import { isPublicAcademyBookingVerified, isPublicAcademyPaymentsVerified, isPublicAcademyTrusted, PublicListingWarning } from "../PublicListingWarning";

describe("PublicListingWarning", () => {
  it("renders the strong warning for unclaimed or unverified academies", () => {
    const markup = renderToStaticMarkup(
      <PublicListingWarning
        academy={{ id: "academy-1", verificationStatus: AcademyVerificationStatus.PENDING, members: [], claims: [] }}
      />,
    );

    assert.match(markup, /Check before you go/);
    assert.match(markup, /not yet claimed and verified/);
  });

  it("renders a soft warning for trusted academies when the course was not created by an academy admin", () => {
    const markup = renderToStaticMarkup(
      <PublicListingWarning
        academy={{ id: "academy-1", verificationStatus: AcademyVerificationStatus.VERIFIED, members: [{ id: "member-1" }], claims: [{ status: ClaimStatus.APPROVED }] }}
        course={{ createdBy: { role: Role.PLATFORM_ADMIN, academyId: null, academyMemberships: [] } }}
      />,
    );

    assert.match(markup, /Confirm before visiting/);
    assert.match(markup, /Session details can change/);
    assert.doesNotMatch(markup, /not yet claimed and verified/);
  });

  it("keeps old verified academies out of the unverified public warning", () => {
    const markup = renderToStaticMarkup(
      <PublicListingWarning
        academy={{ id: "academy-1", verificationStatus: AcademyVerificationStatus.VERIFIED, members: [], claims: [] }}
        course={{ createdBy: { role: Role.PLATFORM_ADMIN, academyId: null, academyMemberships: [] } }}
      />,
    );

    assert.match(markup, /Confirm before visiting/);
    assert.doesNotMatch(markup, /not yet claimed and verified/);
  });

  it("keeps payment trust stricter than public verification display", () => {
    assert.equal(
      isPublicAcademyTrusted({ id: "academy-1", verificationStatus: AcademyVerificationStatus.VERIFIED, members: [], claims: [] }),
      false,
    );
  });

  it("keeps booking and payment verification separate from public listing verification", () => {
    const academy = {
      id: "academy-1",
      bookingVerified: true,
      paymentsVerified: false,
      publicListingVerified: true,
      verificationStatus: AcademyVerificationStatus.VERIFIED,
    };

    assert.equal(isPublicAcademyBookingVerified(academy), true);
    assert.equal(isPublicAcademyPaymentsVerified(academy), false);
  });

  it("hides warnings when a trusted academy course was created by an academy admin", () => {
    const markup = renderToStaticMarkup(
      <PublicListingWarning
        academy={{ id: "academy-1", verificationStatus: AcademyVerificationStatus.VERIFIED, members: [{ id: "member-1" }], claims: [{ status: ClaimStatus.APPROVED }] }}
        course={{
          createdBy: {
            role: Role.ACADEMY_ADMIN,
            academyId: "academy-1",
            academyMemberships: [{ academyId: "academy-1" }],
          },
        }}
      />,
    );

    assert.equal(markup, "");
  });
});
