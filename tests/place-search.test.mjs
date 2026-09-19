import assert from "node:assert/strict";
import test from "node:test";
import { isBirthPlace } from "../app/lib/bazi.ts";
import { mapPlaceSearchPayload, searchBirthPlaces } from "../app/lib/place-search.ts";

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
      { id: 3, name: "Bad timezone", country: "Test", country_code: "TT", latitude: 0, longitude: 0, timezone: "Mars/Olympus" },
    ],
  });

  assert.deepEqual(places, []);
});

test("place labels avoid repeating an administrative area that matches the city", () => {
  const [place] = mapPlaceSearchPayload({
    results: [{
      id: 2643743,
      name: "London",
      admin1: "London",
      country: "United Kingdom",
      country_code: "gb",
      latitude: 51.50853,
      longitude: -0.12574,
      timezone: "Europe/London",
    }],
  });

  assert.equal(place.label, "London, United Kingdom");
  assert.equal(place.countryCode, "GB");
  assert.equal(isBirthPlace(place), true);
});

test("location search sends only the explicit place query and public search options", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let request;
  globalThis.fetch = async (input, init) => {
    request = { input: String(input), init };
    return new Response(JSON.stringify({
      results: [{
        id: 2988507,
        name: "Paris",
        country: "France",
        country_code: "FR",
        latitude: 48.85341,
        longitude: 2.3488,
        timezone: "Europe/Paris",
      }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const places = await searchBirthPlaces("  Paris, France  ", { language: "en-US" });
  const url = new URL(request.input);

  assert.equal(url.origin + url.pathname, "https://geocoding-api.open-meteo.com/v1/search");
  assert.deepEqual([...url.searchParams.keys()].sort(), ["count", "format", "language", "name"]);
  assert.equal(url.searchParams.get("name"), "Paris, France");
  assert.equal(url.searchParams.get("language"), "en");
  assert.equal(request.init.credentials, "omit");
  assert.equal(request.init.headers.accept, "application/json");
  assert.equal(places[0].timeZone, "Europe/Paris");
});

test("short location searches fail before making a network request", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response("{}");
  };

  await assert.rejects(searchBirthPlaces(" 成 "), /at least two characters/);
  assert.equal(calls, 0);
});

test("location search surfaces provider and HTTP failures", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  await assert.rejects(searchBirthPlaces("Paris"), /503/);

  globalThis.fetch = async () => new Response(
    JSON.stringify({ error: true, reason: "provider unavailable" }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
  await assert.rejects(searchBirthPlaces("Paris"), /provider unavailable/);
});
