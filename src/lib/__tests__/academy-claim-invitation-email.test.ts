import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderAcademyClaimInvitationEmail, type AcademyClaimInvitationEmailInput } from "../email/academy-claim-invitation";

function validInput(overrides: Partial<AcademyClaimInvitationEmailInput> = {}): AcademyClaimInvitationEmailInput {
  return {
    academyName: "North Shore BJJ",
    academyProfileUrl: "https://rollfinders.com/academies/north-shore-bjj",
    claimInvitationUrl: "https://rollfinders.com/academies/north-shore-bjj/claim",
    recipientEmail: "owner@example.com",
    supportEmail: "support@rollfinders.com",
    currentYear: "2026",
    ...overrides,
  };
}

describe("renderAcademyClaimInvitationEmail", () => {
  it("renders the canonical academy claim invitation template", () => {
    const email = renderAcademyClaimInvitationEmail(validInput());

    assert.equal(email.subject, "Claim your academy listing on RollFinders");
    assert.match(email.html, /<strong>North Shore BJJ<\/strong>/);
    assert.match(email.html, /href="https:\/\/rollfinders\.com\/academies\/north-shore-bjj\/claim"/);
    assert.match(email.html, /https:\/\/rollfinders\.com\/academies\/north-shore-bjj/);
    assert.match(email.html, /owner@example\.com/);
    assert.match(email.text, /Claim this academy: https:\/\/rollfinders\.com\/academies\/north-shore-bjj\/claim/);
    assert.doesNotMatch(email.html, /{{\s*[^}]+\s*}}/);
  });

  it("escapes dynamic HTML values", () => {
    const email = renderAcademyClaimInvitationEmail(
      validInput({
        academyName: `A&B "Elite" <script>alert('x')</script>`,
        recipientEmail: "owner+test@example.com",
      }),
    );

    assert.match(email.html, /A&amp;B &quot;Elite&quot; &lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt;/);
    assert.doesNotMatch(email.html, /<script>alert/);
  });

  it("fails when required values are missing", () => {
    assert.throws(
      () => renderAcademyClaimInvitationEmail(validInput({ academyName: " " })),
      /missing required value: academyName/,
    );
  });
});
