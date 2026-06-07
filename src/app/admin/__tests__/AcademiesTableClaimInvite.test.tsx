import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ClaimStatus } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { AcademiesTable } from "../page";

describe("AcademiesTable claim invite UX", () => {
  it("shows compact claim invite status without an inline send reminder button", () => {
    const markup = renderToStaticMarkup(
      <AcademiesTable
        academies={[
          {
            borough: "Hounslow",
            city: "London",
            claimReminders: [],
            claims: [],
            email: "info@backstreetdojo.co.uk",
            featured: true,
            id: "academy-1",
            members: [],
            name: "BackStreet DOJO",
            postcode: "TW13 6QQ",
            slug: "backstreet-dojo",
            verificationStatus: "VERIFIED",
            verified: true,
          },
          {
            borough: null,
            city: "London",
            claimReminders: [],
            claims: [{ status: ClaimStatus.APPROVED }],
            email: null,
            featured: false,
            id: "academy-2",
            members: [{ id: "member-1" }],
            name: "Managed Academy",
            postcode: "SW1A 1AA",
            slug: "managed-academy",
            verificationStatus: "VERIFIED",
            verified: true,
          },
        ]}
        params={{ panel: "academies" }}
      />,
    );

    assert.match(markup, /Claim Invite/);
    assert.match(markup, /Not sent/);
    assert.match(markup, /No email/);
    assert.doesNotMatch(markup, /Claim reminder<\/th>/i);
    assert.doesNotMatch(markup, /<button[^>]*>[\s\S]*Send claim reminder[\s\S]*<\/button>/);
  });
});
