# Phase 2 Plan

## Objective

Turn the validated prototype into a trustworthy product one deterministic layer at a time. Preserve the existing experience while keeping calculated facts, traditional interpretation, and future AI synthesis visibly separate.

## Implemented Calculation Foundation

The product accepts a local birth date, optional known time, and a global city selected from a real geocoding result. The selected record contains country, WGS84 coordinates, and an IANA timezone. Versioned adapters now produce BaZi pillars, a Zi Wei twelve-palace chart, a tropical Western natal chart, and dated current-period facts. `/life-map` visualizes only calculated facts; chart geometry is an information layout, not a new calculation convention.

Rules are explicit: Gregorian input, Li Chun year boundary, solar-term month boundary, local civil time, midnight day boundary, historical IANA offset, tropical zodiac, and whole-sign houses. True solar time is not applied. If birth time is unknown, time-sensitive outputs are omitted and the limitation is disclosed.

The synthesis layer is deterministic and evidence-grounded. It links stable calculated fact IDs, requires two or more systems for a consensus label, and preserves disagreement as tension. It does not call live AI or calculate chart positions with an LLM.

The browser session is the only persistence layer. Only a user-submitted city/country search term reaches the geocoding provider; name, birth date, and birth time are not included. Birth details are not placed in URLs, logs, analytics, or accounts. Users can clear the session profile from `/me`.

## Acceptance Criteria

- City search returns validated country, coordinate, and timezone records without search-as-you-type requests.
- The same supported input always produces the same versioned output.
- Known reference output and midnight-boundary behavior have automated tests.
- Invalid dates fail before engine execution.
- `/generating`, `/today`, `/life-map`, `/timing`, `/ask`, `/report`, and `/me` use calculated multi-system facts rather than chart fixtures.
- `/life-map` exposes BaZi pillars, Zi Wei palaces, Western placements, angles, houses, and aspects without inferring guaranteed outcomes.
- Current timing identifies its target date and source facts across BaZi, Zi Wei, and Western transits.
- Every rule-synthesized insight resolves to calculated evidence, and the report includes all supported systems.
- Direct routes still render without a saved profile by using the fictional sample input.
- Type checking, linting, tests, and deployment build pass.

## Deferred Slices

1. Opt-in true-solar-time conventions and additional Zi Wei school controls.
2. Live AI synthesis, only after prompt/evaluation safeguards and evidence citation are specified.
3. Accounts, relationship profiles, server-side report fulfillment, and long-range timing.
4. Production analytics and notification infrastructure with explicit privacy review.
