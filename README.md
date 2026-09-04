# Life Map

Life Map is a mobile-first personal reflection product combining BaZi, Zi Wei Dou Shu, Western astrology, I Ching, and explainable synthesis. Its unified “Ink Nocturne × Personal Ritual” design system uses deep mineral surfaces, moon-paper type, and restrained jade, gold, and cinnabar geometry. Phase 2A adds deterministic BaZi Four Pillars calculation, an interactive fact-based chart, and global city search for birth inputs. Zi Wei, Western astrology, timing, and synthesis remain clearly labeled Phase 1 fixtures; there are still no live AI, payment, authentication, or analytics requests.

Location search sends only an explicitly submitted city/country query to the Open-Meteo geocoding endpoint. Names, birth dates, and birth times stay in the browser session. The public endpoint is suitable for this private prototype; commercial production use requires reviewing Open-Meteo customer access and pricing.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The primary demo flow is:

```text
Landing → onboarding → generation → Today → evidence → Life Map
        → Ask / I Ching → recommendation → object detail
```

## Quality commands

```bash
npm run typecheck  # strict TypeScript validation
npm run lint       # ESLint checks
npm test           # production build plus fixture and route tests
npm run build      # deployment build
```

## Project shape

- `app/ui/` contains the responsive screen and component layer.
- `app/lib/types.ts` defines typed domain contracts.
- `app/lib/data.ts` contains deterministic fictional fixtures.
- `app/lib/bazi.ts` owns versioned Four Pillars calculation and conventions.
- `app/lib/place-search.ts` maps global geocoding results into validated birth places.
- `app/lib/profile-storage.ts` limits sensitive birth inputs to the browser session.
- `app/lib/repository.ts` resolves references and isolates data access.
- `tests/` validates calculation fixtures and boundaries, fixture integrity, Ask routing, I Ching ordering, and direct routes.
- Product requirements and acceptance criteria live in `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md`, `MVP_PLAN.md`, `MOCK_DATA.md`, and `PHASE_2_PLAN.md`.

See `AGENTS.md` before contributing. All interpretive language must remain cautious, evidence-linked, and clearly presented as reflective tradition rather than scientific prediction.
