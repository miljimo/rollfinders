import assert from "node:assert/strict";
import test from "node:test";
import { EventAudience, EventPricingType } from "@prisma/client";
import { coursePriceLabel } from "../courses";

test("donation pricing keeps the existing default labels", () => {
  assert.equal(coursePriceLabel({
    pricingType: EventPricingType.DONATION,
    price: 0,
    audience: EventAudience.EXTERNAL_ONLY,
    donationLabel: null,
  }), "Optional donation");

  assert.equal(coursePriceLabel({
    pricingType: EventPricingType.DONATION,
    price: 5,
    audience: EventAudience.EXTERNAL_ONLY,
    donationLabel: "",
  }), "Optional donation - suggested from £5.00");
});

test("donation pricing renders custom label text with optional donation placeholders", () => {
  assert.equal(coursePriceLabel({
    pricingType: EventPricingType.DONATION,
    price: 7.5,
    audience: EventAudience.EXTERNAL_ONLY,
    donationLabel: "Pay what you can from ${donation}",
  }), "Pay what you can from £7.50");

  assert.equal(coursePriceLabel({
    pricingType: EventPricingType.DONATION,
    price: 0,
    audience: EventAudience.EXTERNAL_ONLY,
    donationLabel: "Pay what you can",
  }), "Pay what you can");
});
