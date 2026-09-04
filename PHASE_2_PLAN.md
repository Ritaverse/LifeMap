# Phase 2 Plan

## Objective

Turn the validated prototype into a trustworthy product one deterministic layer at a time. Preserve the existing experience while keeping calculated facts, traditional interpretation, and future AI synthesis visibly separate.

## Phase 2A — BaZi Calculation Foundation

This slice accepts a local birth date, optional known time, and a global city selected from a real geocoding result. The selected record contains country, WGS84 coordinates, and an IANA timezone. A versioned calculation adapter produces year, month, day, and time pillars; day master; visible stem/branch element counts; ten-god labels; Na Yin; and calculation metadata. `/life-map` visualizes only those calculated facts in an interactive chart; its radial placement is an information layout, not a new calculation convention.

Rules are explicit: Gregorian input, Li Chun year boundary, solar-term month boundary, local civil time, and midnight day boundary. True solar time is not yet applied. If birth time is unknown, the time pillar is omitted and boundary uncertainty is disclosed.

The browser session is the only persistence layer. Only a user-submitted city/country search term reaches the geocoding provider; name, birth date, and birth time are not included. Birth details are not placed in URLs, logs, analytics, or accounts. Users can clear the session profile from `/me`.

## Acceptance Criteria

- City search returns validated country, coordinate, and timezone records without search-as-you-type requests.
- The same supported input always produces the same versioned output.
- Known reference output and midnight-boundary behavior have automated tests.
- Invalid dates fail before engine execution.
- `/generating`, `/today`, `/life-map`, and `/me` distinguish calculated BaZi facts from demo content.
- `/life-map` centers the calculated day master, exposes all available pillars, and reveals hidden stems, ten gods, and Na Yin without inferring strength or auspiciousness.
- Direct routes still render without a saved profile by using the fictional sample input.
- Type checking, linting, tests, and deployment build pass.

## Deferred Slices

1. Phase 2B: historical timezone handling and opt-in true-solar-time conventions.
2. Phase 2C: deterministic Zi Wei engine with explicit school/version controls.
3. Phase 2D: Western natal ephemeris, houses, aspects, and source metadata.
4. Phase 2E: evidence-grounded interpretation rules, followed by live AI synthesis only after calculation coverage is trustworthy.
5. Accounts, relationship profiles, commerce, and long-range timing remain later product phases.
