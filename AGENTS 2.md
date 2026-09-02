# Life Map — Instructions for Codex

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

Treat these documents as the source of truth for Phase 1. If the repository already contains implementation code, inspect it before proposing structural changes. Preserve unrelated user work.

## Current Phase

Phase 1 is a **high-fidelity, clickable prototype backed by realistic mock data**.

Build this vertical flow:

> Birth onboarding → chart-generation animation → Today → Life Map → Ask My Chart / I Ching → personalized recommendation → Product Detail

Do not implement real BaZi, Zi Wei, ephemeris, transit, calendar, geocoding, timezone-history, payment, authentication, or LLM services in Phase 1. Establish interfaces that can accept those services later.

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
- Clearly distinguish three layers in expanded explanations:
  - **Chart fact**: structured data supplied by an engine or mock fixture
  - **Traditional interpretation**: the conventionally associated meaning
  - **AI synthesis**: a contextual comparison across systems
- Every synthesized insight must reference at least one evidence item. Consensus claims must be supported by two or more systems.
- When systems disagree, show the tension rather than averaging scores or hiding it.

### Commerce

- Products are optional symbolic reminders, never remedies or guaranteed interventions.
- Use the sequence: **insight → theme/element → daily practice → optional object**.
- Explain why a product appeared using the user’s profile, current timing, and stated intention.
- Use phrases such as “traditionally associated with” and “a symbolic reminder of.”
- Do not use scarcity pressure, fear, deficiency anxiety, health claims, “bad luck” claims, or pay-to-remove-negative-energy mechanics.
- Do not call the catalog a “fortune shop,” “luck shop,” or “cure.”

### Privacy

- Birth details and relationship profiles are sensitive personal data.
- Do not expose them in URLs, analytics labels, logs, or client error messages.
- Mock data must be fictional and must be labeled as demo data in developer-facing contexts.
- Future production storage should minimize collection and support export and deletion, but account infrastructure is out of Phase 1.

## Technical Guardrails

- Prefer TypeScript with strict typing when the chosen stack supports it.
- Keep view components independent from mock fixtures. Read data through a small repository/service boundary so mocks can later be replaced with APIs.
- Model system-specific evidence as structured records; never embed chart logic in UI components.
- Keep generated prose and evidence linked by stable IDs.
- Centralize design tokens. Do not scatter raw colors, spacing, or arbitrary shadows across components.
- Make interactive elements keyboard accessible and provide visible focus states.
- Respect `prefers-reduced-motion` for all animations.
- Use deterministic seed data for demos. Reloading the same profile should not change its chart or insights.
- Avoid premature state-management or backend complexity. Use the smallest architecture that supports the complete flow.
- Do not add real integrations, credentials, tracking, payments, or network calls without explicit user approval.

## Recommended Route Contract

The exact framework syntax may vary, but preserve these user-facing destinations:

| Route | Purpose |
|---|---|
| `/` | Redirect to onboarding for a new demo session or Today for a completed one |
| `/onboarding` | Name, birth date, time, location, and optional traditional-rule inputs |
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

Routes may be presented as full screens, drawers, or nested views on mobile, but they must remain directly testable.

## Reusable Component Expectations

Build reusable primitives before duplicating page-level markup. The expected component vocabulary includes:

- `AppShell`, `TopBar`, `BottomNav`
- `EditorialCard`, `SectionHeader`, `Pill`, `SystemEvidenceChip`
- `PrimaryButton`, `SecondaryButton`, `IconButton`, `TextField`, `SegmentedControl`
- `TodayHero`, `QuickActionCard`, `LifeDomainCard`, `TimingPreview`
- `ElementSymbol`, `ProductRecommendationCard`, `ProductGallery`
- `EvidenceAccordion`, `EvidenceList`, `ConfidenceLanguage`
- `ProgressStepper`, `GenerationStage`, `CoinCast`, `Hexagram`
- `ChatComposer`, `SuggestedPrompt`, `AnswerSection`
- `EmptyState`, `LoadingSkeleton`, `InlineNotice`, `ErrorState`

Names can adapt to the repository’s conventions. Preserve clear separation among primitives, composites, page sections, and data adapters.

## Implementation Workflow

For substantial work:

1. Inspect the repository and existing conventions.
2. State the route/component/data approach briefly.
3. Implement the smallest complete vertical slice.
4. Run type checks, linting, and relevant tests.
5. Launch the app and visually inspect mobile and desktop widths.
6. Correct layout, typography, interaction, overflow, focus, and reduced-motion issues.
7. Report what changed, what was verified, and any remaining limitations.

Do not stop after scaffolding if a safe path remains to complete and verify the requested slice.

## Visual Quality Bar

The intended tone is **Modern Oriental × Editorial**: calm, tactile, thoughtful, and contemporary. Avoid purple galaxy backgrounds, glowing crystal clichés, generic glassmorphism, dragons, excessive zodiac ornament, faux-ancient textures, and casino-like “luck scores.”

The UI should feel designed even with all images disabled. Typography, spacing, composition, borders, and hierarchy must do the core visual work.

## Definition of Done for Phase 1

Phase 1 is complete only when:

- The entire primary flow is clickable with no dead-end primary actions.
- All required screens render from typed fixtures in `MOCK_DATA.md` or their code equivalent.
- Today follows the specified content priority.
- “Why?” reveals traceable multi-system evidence.
- Ask and I Ching each have a convincing mocked interaction.
- A recommendation opens a personalized Product Detail Page with responsible language.
- The app works at approximately 375 px, 768 px, and 1280 px widths.
- Keyboard navigation, focus states, contrast, reduced motion, and essential semantic labels have been checked.
- Type checks and repository tests pass, or any pre-existing failure is documented clearly.
- The final UI has been visually inspected, not merely compiled.

