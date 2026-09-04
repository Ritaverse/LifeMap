# Repository Guidelines

## Mission

Build **Life Map**, a premium mobile-first personal reflection product that combines:

- BaZi / Four Pillars
- Zi Wei Dou Shu
- Western natal astrology
- I Ching
- AI-assisted synthesis
- Personalized symbolic objects such as stones, guardian stones, Five Elements bracelets, and, later, Feng Shui objects

The product helps people reflect on identity, relationships, work, timing, and current decisions. It must not present divination traditions as scientifically proven or make guaranteed predictions.

The foundational engineering rule is:

> **Calculation is deterministic. Interpretation is generative.**

Chart engines calculate structured facts. The AI layer explains, compares, and synthesizes those facts. An LLM must never invent or calculate chart positions.

## Read This First

Before making implementation decisions, read these files in order:

1. `AGENTS.md`
2. `PRODUCT_SPEC.md`
3. `DESIGN_SYSTEM.md`
4. `MVP_PLAN.md`
5. `MOCK_DATA.md`
6. `PHASE_2_PLAN.md`

Treat these documents as the product source of truth. If implementation code exists, inspect it before proposing structural changes. Preserve unrelated user work.

## Current Phase

Phase 2A is the active slice: **deterministic BaZi calculation foundations and real birth-location search** layered onto the validated Phase 1 experience.

The current vertical slice is:

> Birth onboarding → normalized local birth profile → versioned BaZi engine → structured Four Pillars facts → clearly separated demo interpretation

Real BaZi calculation and explicit city/country geocoding through the approved location adapter are authorized in Phase 2A. Keep Zi Wei, Western ephemeris/transits, live AI, historical timezone resolution, payments, and authentication out of this slice. Never send a name, birth date, or birth time to the geocoding provider. Do not present Phase 1 fixture interpretations as conclusions derived from a newly calculated chart.

## Working Priorities

When tradeoffs are necessary, prioritize in this order:

1. A cohesive, polished mobile experience
2. Clear information hierarchy on Today
3. A complete clickable happy path
4. Reusable components and typed data boundaries
5. Responsive behavior and accessibility
6. Feature breadth

The homepage is the highest-priority screen. Iterate on its visual quality before expanding lower-priority areas.

## Product Guardrails

### Interpretation

- Explain patterns as traditions, themes, tendencies, or prompts for reflection.
- Avoid deterministic language such as “definitely,” “guaranteed,” “fated,” “you will,” or “this will make you wealthy.”
- Never make medical, legal, financial, fertility, mortality, or safety predictions.
- Clearly distinguish chart facts, traditional interpretations, and AI synthesis in expanded explanations.
- Every synthesized insight must reference at least one evidence item. Consensus claims require two or more systems.
- When systems disagree, show the tension rather than averaging scores or hiding it.

### Commerce

- Products are optional symbolic reminders, never remedies or guaranteed interventions.
- Use the sequence: **insight → theme/element → daily practice → optional object**.
- Explain recommendations using the user profile, current timing, and stated intention.
- Use phrases such as “traditionally associated with” and “a symbolic reminder of.”
- Do not use scarcity pressure, fear, deficiency anxiety, health claims, “bad luck” claims, or pay-to-remove-negative-energy mechanics.
- Do not call the catalog a “fortune shop,” “luck shop,” or “cure.”

### Privacy

- Birth details and relationship profiles are sensitive personal data.
- Do not expose them in URLs, analytics labels, logs, or client error messages.
- Mock data must be fictional and labeled as demo data in developer-facing contexts.
- Future storage should minimize collection and support export and deletion; account infrastructure is out of Phase 1.

## Technical Guardrails

- Use React and TypeScript with strict typing for this greenfield prototype.
- Keep view components independent from fixtures. Read data through a small repository/service boundary so mocks can later be replaced with APIs.
- Model system-specific evidence as structured records; never embed chart logic in UI components.
- Keep generated prose and evidence linked by stable IDs.
- Centralize design tokens; do not scatter raw colors, spacing, or arbitrary shadows across components.
- Make interactive elements keyboard accessible, provide visible focus states, and respect `prefers-reduced-motion`.
- Use deterministic seed data. Reloading the same profile must not change its chart or insights.
- Avoid premature state-management or backend complexity. Use the smallest architecture supporting the complete flow.
- Do not add real integrations, credentials, tracking, payments, or network calls without explicit user approval.

## Route Contract

Preserve these directly testable destinations:

| Route | Purpose |
|---|---|
| `/` | Landing or demo-state redirect |
| `/onboarding` | Name, birth details, location, and optional traditional-rule inputs |
| `/generating` | Staged chart-generation experience |
| `/today` | Personalized homepage |
| `/insights/:insightId` | “Why?” evidence view |
| `/life-map` | Life-domain overview |
| `/life-map/:domain` | Domain detail such as Career or Relationships |
| `/ask` | Ask My Chart landing and conversation |
| `/iching` | Question, six casts, and result |
| `/timing` | Current-period preview |
| `/objects` | Optional symbolic-product collection |
| `/objects/:productId` | Personalized Product Detail Page |
| `/me` | Demo profile and settings shell |

Routes may render as full screens, drawers, or nested mobile views, but must remain directly addressable.

## Reusable Component Expectations

Build reusable primitives before duplicating page markup. Expected vocabulary includes:

- `AppShell`, `TopBar`, `BottomNav`
- `EditorialCard`, `SectionHeader`, `Pill`, `SystemEvidenceChip`
- `PrimaryButton`, `SecondaryButton`, `IconButton`, `TextField`, `SegmentedControl`
- `TodayHero`, `QuickActionCard`, `LifeDomainCard`, `TimingPreview`
- `ElementSymbol`, `ProductRecommendationCard`, `ProductGallery`
- `EvidenceAccordion`, `EvidenceList`, `ConfidenceLanguage`
- `ProgressStepper`, `GenerationStage`, `CoinCast`, `Hexagram`
- `ChatComposer`, `SuggestedPrompt`, `AnswerSection`
- `EmptyState`, `LoadingSkeleton`, `InlineNotice`, `ErrorState`

Names may adapt to repository conventions. Preserve separation among primitives, composites, page sections, and data adapters.

## Project Structure & Module Organization

The application uses Next.js-compatible routes under `app/`. Keep reusable screens and components in `app/ui/`, deterministic calculation and storage adapters in `app/lib/`, route entry points in `app/**/page.tsx`, and automated checks in `tests/`. Static assets belong in `public/`; product requirements and staged plans remain in the repository root. Do not commit generated output, dependencies, editor settings, or local caches.

Recommended boundary:

```text
Typed fixtures → mock repository/service → selectors/view models → components → routes
```

## Build, Test, and Development Commands

Use the repository scripts so contributors run identical versions and options:

- `npm run dev`: start the local development environment.
- `npm run typecheck`: validate strict TypeScript boundaries.
- `npm run lint`: check formatting and static analysis.
- `npm test`: run the automated test suite.
- `npm run build`: create the production artifact.

`npm test` includes a production build before running Node tests. Use Node.js 22.13 or newer.

## Coding Style & Naming Conventions

Use UTF-8, Unix line endings, a final newline, two-space indentation, and the configured formatter and linter. Use `PascalCase` for React components and types, `camelCase` for functions and variables, and `kebab-case` for documentation and asset filenames. Keep domain logic close to its owning feature, but keep fixtures and chart logic outside visual components. Avoid large generic utility modules.

## Testing Guidelines

Every behavior change should include an appropriate test. Name tests for their unit or scenario, such as `route-planner.test.ts`. Cover normal behavior, boundaries, failure paths, evidence resolution, deterministic Ask routing, bottom-to-top I Ching construction, onboarding state, and the primary navigation path. Tests must not rely on credentials, live network access, real time, or shared mutable state.

## Implementation Workflow

For substantial work:

1. Inspect existing files and conventions.
2. State the route, component, and data approach briefly.
3. Implement the smallest complete vertical slice.
4. Run type checks, linting, and relevant tests.
5. Launch the app and inspect mobile and desktop widths.
6. Correct layout, typography, interaction, overflow, focus, and reduced-motion issues.
7. Report changes, verification, and remaining limitations.

Do not stop after scaffolding if a safe path remains to complete and verify the requested slice.

## Visual Quality Bar

The intended tone is **Ink Nocturne × Personal Ritual**: intimate, spiritual, tactile, quietly mysterious, and contemporary. Use deep ink surfaces, moon-paper typography, fine mineral borders, and restrained jade, muted-gold, and cinnabar geometry. Avoid purple galaxy backgrounds, glowing crystal clichés, generic glassmorphism, dragons, excessive zodiac ornament, faux-ancient textures, and casino-like “luck scores.”

The UI must feel designed with images disabled. Typography, spacing, composition, borders, and hierarchy do the core visual work. Follow `DESIGN_SYSTEM.md`, including centralized palette and spacing tokens, Chinese-first typography, 44 px touch targets, WCAG 2.2 AA where practical, and responsive checks near 320/375, 768, and 1280 px.

## Commit & Pull Request Guidelines

Recent history uses concise Conventional Commit-style subjects such as `feat: add global birth location search` and `fix: handle missing coordinates`. Keep commits narrowly scoped. Pull requests should explain motivation and implementation, list verification performed, link relevant issues, and include screenshots or recordings for visual changes. Call out migrations, dependencies, and follow-up work explicitly.

## Security & Configuration

Never commit secrets or personal data. Store local values in ignored `.env` files and provide a safe `.env.example` containing names and placeholders only. Validate external input and review new dependencies before adoption. Phase 1 must contain no production credentials, analytics, payment, real chart, or live AI integrations.

## Definition of Done for Phase 2A

Phase 2A is complete only when:

- A selected global city produces a validated country, coordinate, and IANA-timezone record.
- Supported birth inputs produce deterministic, versioned Four Pillars output.
- Unknown birth time omits the time pillar and exposes boundary limitations.
- Calculation rules and engine version are visible to the user.
- The Life Map chart is driven only by engine facts and exposes pillar details accessibly.
- Calculated facts remain visually and structurally separate from fixture interpretation.
- Sensitive inputs stay in the current browser session and can be cleared.
- Known-result, boundary, invalid-input, type, lint, route, and build checks pass.

## Definition of Done for Phase 1

Phase 1 is complete only when:

- The primary flow is clickable with no dead-end primary actions.
- Required screens render from typed fixtures derived from `MOCK_DATA.md`.
- Today follows the specified content priority.
- “Why?” reveals traceable multi-system evidence.
- Ask and I Ching each provide a convincing deterministic mock interaction.
- A recommendation opens a personalized Product Detail Page with responsible language.
- The app works near 320/375, 768, and 1280 px widths.
- Keyboard navigation, focus, contrast, reduced motion, zoom, and essential semantic labels have been checked.
- Type checks, lint, tests, and build pass, or any pre-existing failure is documented.
- The final UI has been visually inspected, not merely compiled.

When handing off an implementation pass, report completed routes, key decisions, checks and results, inspected viewports, known limitations, and the safest next slice. Do not describe Phase 1 as complete until every required route and global acceptance criterion in `MVP_PLAN.md` has been addressed.
