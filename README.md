# Life Map

Life Map is a mobile-first personal reflection prototype combining BaZi, Zi Wei Dou Shu, Western astrology, I Ching, and explainable synthesis. Phase 1 uses fictional, deterministic mock data; it does not perform real chart calculations or make live AI, payment, authentication, analytics, or network requests.

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
- `app/lib/repository.ts` resolves references and isolates data access.
- `tests/` validates fixture integrity, Ask routing, I Ching ordering, and direct routes.
- Product requirements and acceptance criteria live in `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md`, `MVP_PLAN.md`, and `MOCK_DATA.md`.

See `AGENTS.md` before contributing. All interpretive language must remain cautious, evidence-linked, and clearly presented as reflective tradition rather than scientific prediction.
