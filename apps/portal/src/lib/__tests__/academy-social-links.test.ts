import assert from "node:assert/strict";
import test from "node:test";
import { legacySocialUrlsFromLinks, parseAcademySocialLinksJson, socialLinksFromLegacy } from "../academy-social-links";
import { academySchema } from "../validators";

const validAcademyInput = {
  name: "Test Academy",
  slug: "test-academy",
  description: "A valid academy description",
  affiliation: "",
  website: "",
  email: "",
  phone: "",
  address: "123 Test Street",
  city: "London",
  postcode: "W1 1AA",
  borough: "",
  country: "United Kingdom",
  latitude: "51.5",
  longitude: "-0.1",
  logoUrl: "",
  coverImageUrl: "",
  categories: "",
  facebookUrl: "",
  instagramUrl: "",
  xUrl: "",
  socialLinksJson: "[]",
  dropInPrice: "",
  giAvailable: "on",
  nogiAvailable: "on",
  beginnerFriendly: "on",
  competitionFocused: "off",
  featured: "off",
  verificationStatus: "PENDING",
};

test("parseAcademySocialLinksJson accepts unique http and https links", () => {
  const result = parseAcademySocialLinksJson(JSON.stringify([
    { platform: "FACEBOOK", url: " https://facebook.com/test " },
    { platform: "YOUTUBE", url: "https://youtube.com/test" },
    { platform: "FACEBOOK", url: "https://facebook.com/duplicate" },
  ]));

  assert.equal(result.error, undefined);
  assert.deepEqual(result.links, [
    { platform: "FACEBOOK", url: "https://facebook.com/test" },
    { platform: "YOUTUBE", url: "https://youtube.com/test" },
  ]);
});

test("parseAcademySocialLinksJson rejects unsafe URI schemes", () => {
  const result = parseAcademySocialLinksJson(JSON.stringify([
    { platform: "INSTAGRAM", url: "javascript:alert(1)" },
  ]));

  assert.equal(result.error, "Social links must be valid http or https URLs.");
  assert.deepEqual(result.links, []);
});

test("parseAcademySocialLinksJson rejects non-http social URLs", () => {
  for (const url of ["ftp://example.com/profile", "mailto:test@example.com", "tel:+440000000000"]) {
    const result = parseAcademySocialLinksJson(JSON.stringify([{ platform: "OTHER", url }]));

    assert.equal(result.error, "Social links must be valid http or https URLs.");
    assert.deepEqual(result.links, []);
  }
});

test("parseAcademySocialLinksJson preserves an explicit empty social link list", () => {
  const result = parseAcademySocialLinksJson("[]");

  assert.equal(result.error, undefined);
  assert.deepEqual(result.links, []);
});

test("legacySocialUrlsFromLinks keeps existing fixed academy fields compatible", () => {
  const result = legacySocialUrlsFromLinks([
    { platform: "FACEBOOK", url: "https://facebook.com/test" },
    { platform: "INSTAGRAM", url: "https://instagram.com/test" },
    { platform: "X", url: "https://x.com/test" },
    { platform: "YOUTUBE", url: "https://youtube.com/test" },
  ]);

  assert.deepEqual(result, {
    facebookUrl: "https://facebook.com/test",
    instagramUrl: "https://instagram.com/test",
    xUrl: "https://x.com/test",
  });
});

test("socialLinksFromLegacy migrates existing academy fields into relation inputs", () => {
  assert.deepEqual(socialLinksFromLegacy({
    facebookUrl: "https://facebook.com/test",
    instagramUrl: "",
    xUrl: "https://x.com/test",
  }), [
    { platform: "FACEBOOK", url: "https://facebook.com/test" },
    { platform: "X", url: "https://x.com/test" },
  ]);
});

test("academySchema rejects unsafe schemes in legacy social URL fields", () => {
  const result = academySchema.safeParse({
    ...validAcademyInput,
    facebookUrl: "javascript:alert(1)",
  });

  assert.equal(result.success, false);
});

test("academySchema rejects non-http legacy social URL fields", () => {
  const result = academySchema.safeParse({
    ...validAcademyInput,
    instagramUrl: "ftp://example.com/test",
  });

  assert.equal(result.success, false);
});
