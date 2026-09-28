# Life Map

Life Map is a mobile-first reflection product combining BaZi, Zi Wei Dou Shu, Western astrology, I Ching, and evidence-linked synthesis. It treats these systems as reflective traditions—not science or guaranteed prediction—and keeps deterministic chart calculation separate from interpretive copy.

## Safe public beta

The current beta calculates versioned BaZi, Zi Wei, Western natal/transit, timing, and synthesis facts in the browser. A valid birth profile is required before personalized routes render; fictional fixture data cannot reach the report flow. Birth details, reflection state, and Ask handoffs use `sessionStorage` and are cleared with the browser session. Free-text questions are not placed in URLs.

Only an explicitly submitted city/country search is sent to Open-Meteo for geocoding. Names, birth dates, birth times, questions, and chart results are not sent to Open-Meteo or Shopify. The Ask and I Ching flows intercept medical, legal, financial, fertility, mortality, and immediate-danger topics and direct users to appropriate real-world help.

Report purchasing is **disabled** during the beta: the report route is preview-only and creates no Shopify checkout or order. Public policy pages are available at `/privacy`, `/terms`, `/digital-delivery`, `/refund`, and `/support`. Confirm that the published support mailbox can receive messages before opening access.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and complete onboarding before visiting personalized routes.

## Quality commands

```bash
npm run typecheck  # strict TypeScript validation
npm run lint       # ESLint checks
npm test           # production build plus all Node tests
npm run build      # create the deployment artifact
```

CI runs `typecheck → lint → unit tests → build → production-artifact tests`. `npm test` remains the one-command local build-and-test check.

## Configuration and deployment

Copy `.env.example` to an ignored `.env.local` when local configuration is needed. `NEXT_PUBLIC_SITE_URL` sets the canonical HTTPS origin. Set `NEXT_PUBLIC_SUPPORT_EMAIL` only after that mailbox and its response process are operational; without it, the Support page explicitly keeps public launch blocked. `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN` is reserved for a future commerce launch and is not required while checkout is disabled. Never place Admin API credentials or personal birth data in client-exposed variables.

The existing Sites project is identified by `.openai/hosting.json`. Before deploying, run the full quality suite, publish an owner-only/private version first, verify the policy and onboarding routes, and keep paid checkout unavailable. Security headers, crawler rules, personalized-route `noindex`, sitemap, and error pages are implemented at the app/worker boundary.

## Project shape

- `app/ui/` contains responsive screens and reusable components.
- `app/lib/` contains typed profiles, storage adapters, deterministic engines, safety rules, report assembly, and repository selectors.
- `app/**/page.tsx` defines public, personalized, product, and policy routes.
- `tests/` covers engine boundaries, privacy guardrails, safety routing, rendered routes, bundle boundaries, and platform hardening.
- `public/` contains static brand and product assets.
- Product requirements live in `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md`, `MVP_PLAN.md`, `MOCK_DATA.md`, and `PHASE_2_PLAN.md`.

Read `AGENTS.md` before contributing. Keep calculation deterministic, interpretation evidence-linked, sensitive inputs session-local, and language cautious.
