# Life Map

Life Map is a mobile-first reflection product combining BaZi, Zi Wei Dou Shu, Western astrology, I Ching, and evidence-linked synthesis. It treats these systems as reflective traditions—not science or guaranteed prediction—and keeps deterministic chart calculation separate from interpretive copy.

## Safe public beta

The current beta calculates versioned BaZi, Zi Wei, Western natal/transit, timing, and synthesis facts in the browser. A valid birth profile is required before personalized routes render; fictional fixture data cannot reach the report flow. Birth details, reflection state, and Ask handoffs use `sessionStorage` and are cleared with the browser session. Free-text questions are not placed in URLs.

Only an explicitly submitted city/country search is sent to Open-Meteo for geocoding. Names, birth dates, birth times, questions, and chart results are not sent to Open-Meteo or Shopify. The Ask and I Ching flows intercept medical, legal, financial, fertility, mortality, and immediate-danger topics and direct users to appropriate real-world help.

The USD $2 report pipeline is implemented behind a fail-closed launch gate. The browser renders a 10-page PDF, private R2 stores only that finished file, D1 tracks opaque job/order metadata, and verified Shopify webhooks unlock expiring email delivery at `/report/access`. Purchasing remains disabled until public webhook access, production secrets, email, cleanup, support, and a real Shopify test order are verified. See `PAID_REPORT_LAUNCH.md`.

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

Copy `.env.example` to an ignored `.env.local` when local configuration is needed. `NEXT_PUBLIC_SITE_URL` sets the canonical HTTPS origin. Set `NEXT_PUBLIC_SUPPORT_EMAIL` only after that mailbox and its response process are operational. Shopify, email, encryption, and rate-limit secrets are server-only; never prefix them with `NEXT_PUBLIC_` or commit them. Apply all `drizzle/` migrations and bind D1 as `DB` and private R2 as `REPORTS` before testing fulfillment.

The existing Sites project is identified by `.openai/hosting.json`. Before deploying, run the full quality suite, publish an owner-only/private version first, verify the policy and onboarding routes, and keep paid checkout unavailable. Security headers, crawler rules, personalized-route `noindex`, sitemap, and error pages are implemented at the app/worker boundary.

## Project shape

- `app/ui/` contains responsive screens and reusable components.
- `app/lib/` contains typed profiles, storage adapters, deterministic engines, safety rules, report assembly/PDF rendering, and repository selectors.
- `worker/` contains the gated report API, Shopify webhook validation, private delivery, retention, and security headers.
- `db/` and `drizzle/` define D1 report metadata and migrations; private PDFs live only in the `REPORTS` R2 binding.
- `app/**/page.tsx` defines public, personalized, product, and policy routes.
- `tests/` covers engine boundaries, privacy guardrails, safety routing, rendered routes, bundle boundaries, and platform hardening.
- `public/` contains static brand and product assets.
- Product requirements live in `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md`, `MVP_PLAN.md`, `MOCK_DATA.md`, and `PHASE_2_PLAN.md`.

Read `AGENTS.md` before contributing. Keep calculation deterministic, interpretation evidence-linked, sensitive inputs session-local, and language cautious.
