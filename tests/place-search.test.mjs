import assert from "node:assert/strict";
import test from "node:test";
import { isBirthPlace } from "../app/lib/bazi.ts";
import { mapPlaceSearchPayload } from "../app/lib/place-search.ts";

test("global place results become validated birth locations", () => {
  const places = mapPlaceSearchPayload({
    results: [{
      id: 1815286,
      name: "成都",
      latitude: 30.66667,
      longitude: 104.06667,
      timezone: "Asia/Shanghai",
      country_code: "CN",
      country: "中国",
      admin1: "四川",
    }],
  });

  assert.equal(places.length, 1);
  assert.equal(places[0].label, "成都, 四川, 中国");
  assert.equal(places[0].timeZone, "Asia/Shanghai");
  assert.equal(isBirthPlace(places[0]), true);
});

test("malformed geocoding records are ignored", () => {
  const places = mapPlaceSearchPayload({
    results: [
      { id: 1, name: "No country", latitude: 0, longitude: 0, timezone: "UTC" },
      { id: 2, name: "Bad latitude", country: "Test", country_code: "TT", latitude: 200, longitude: 0, timezone: "UTC" },
    ],
  });

  assert.deepEqual(places, []);
});
