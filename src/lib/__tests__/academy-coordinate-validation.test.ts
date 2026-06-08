import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AcademyVerificationStatus } from "@prisma/client";
import { academySchema } from "../validators";

const validAcademy = {
  name: "Northside Grappling",
  slug: "northside-grappling",
  description: "A friendly academy with daily classes.",
  affiliation: "",
  website: "",
  email: "",
  phone: "",
  address: "1 Example Street",
  city: "London",
  postcode: "NW1 1AA",
  borough: "",
  country: "United Kingdom",
  latitude: "51.5237",
  longitude: "-0.1585",
  logoUrl: "",
  coverImageUrl: "",
  categories: "",
  facebookUrl: "",
  instagramUrl: "",
  xUrl: "",
  dropInPrice: "",
  giAvailable: "on",
  nogiAvailable: "on",
  beginnerFriendly: "on",
  competitionFocused: "off",
  verificationStatus: AcademyVerificationStatus.PENDING,
  featured: "off",
};

describe("academy coordinate validation", () => {
  it("accepts manually entered latitude and longitude strings as numeric coordinates", () => {
    const parsed = academySchema.parse({
      ...validAcademy,
      latitude: "51.4879",
      longitude: "-0.1680",
    });

    assert.equal(parsed.latitude, 51.4879);
    assert.equal(parsed.longitude, -0.168);
  });

  it("rejects non-numeric manual coordinate values", () => {
    const parsed = academySchema.safeParse({
      ...validAcademy,
      latitude: "not-a-latitude",
      longitude: "-0.1680",
    });

    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.match(JSON.stringify(parsed.error.flatten().fieldErrors), /latitude/);
    }
  });
});
