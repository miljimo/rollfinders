import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lookupCoordinates } from "../geocoding";

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    json: async () => body,
  } as Response;
}

describe("geocoding", () => {
  it("uses postcode coordinates when postcodes.io returns a valid result", async () => {
    const calls: string[] = [];
    const result = await lookupCoordinates({ postcode: "SW1A 1AA" }, async (url) => {
      calls.push(String(url));
      return jsonResponse({ result: { latitude: 51.501009, longitude: -0.141588, postcode: "SW1A 1AA" } });
    });

    assert.deepEqual(result, { latitude: 51.501009, longitude: -0.141588, label: "SW1A 1AA" });
    assert.equal(calls.length, 1);
    assert.match(calls[0], /postcodes\.io\/postcodes\/SW1A1AA/);
  });

  it("falls back to full address lookup when postcode lookup fails", async () => {
    const calls: string[] = [];
    const result = await lookupCoordinates({ address: "10 Downing Street", city: "London", postcode: "SW1A 2AA", country: "United Kingdom" }, async (url) => {
      calls.push(String(url));
      if (calls.length === 1) return jsonResponse({}, false);
      return jsonResponse([{ lat: "51.5034878", lon: "-0.1275804", display_name: "10 Downing Street, London" }]);
    });

    assert.deepEqual(result, { latitude: 51.5034878, longitude: -0.1275804, label: "10 Downing Street, London" });
    assert.equal(calls.length, 2);
    assert.match(calls[1], /nominatim\.openstreetmap\.org\/search/);
  });

  it("returns null for failed or invalid coordinate responses", async () => {
    const result = await lookupCoordinates({ postcode: "bad", address: "x" }, async () => jsonResponse({ result: { latitude: 120, longitude: -0.1 } }));

    assert.equal(result, null);
  });
});
