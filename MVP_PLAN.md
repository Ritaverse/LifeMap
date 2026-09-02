# Life Map — Phase 1 MVP Plan

## 1. Goal

Deliver a polished, mobile-first, clickable Life Map prototype that validates the product hierarchy and emotional experience before any real chart, AI, commerce, or account infrastructure is built.

The required happy path is:

> Birth onboarding → generation animation → Today → Life Map → Ask My Chart / I Ching → recommendation → Product Detail

All content comes from deterministic, typed fixtures.

## 2. Prototype Outcomes

By the end of Phase 1, the team should be able to evaluate:

- Whether users understand the product without learning specialist terminology
- Whether Today has a compelling daily reason to return
- Whether multi-system evidence makes AI interpretation feel grounded
- Whether Ask My Chart and I Ching feel meaningfully different
- Whether commerce feels like an optional continuation of an insight
- Whether the visual language feels premium, calm, and culturally considered

Phase 1 is not intended to validate chart accuracy, AI answer quality at scale, or conversion to a real purchase.

## 3. Technical Approach

### Use the repository’s conventions

If an application already exists, preserve its framework, package manager, routing, styling, linting, testing, and folder conventions unless they prevent the requested prototype.

If the repository is greenfield:

- Use React and TypeScript with strict mode.
- Use a framework-supported router with directly addressable routes.
- Prefer a small token-based CSS approach already supported by the scaffold.
- Keep mock data local and deterministic.
- Avoid a backend, database, auth framework, payment SDK, analytics SDK, and live AI client.
- Add dependencies only when they materially improve the prototype and cannot be implemented simply with the existing stack.

### Architecture boundaries

```text
Typed fixtures
  → mock repository/service
  → selectors/view models
  → reusable page sections
  → routes/screens
```

Recommended modules:

```text
src/
├── app-or-routes/
├── components/
│   ├── primitives/
│   ├── layout/
│   ├── evidence/
│   ├── charts/
│   ├── ask/
│   └── commerce/
├── data/
│   ├── fixtures/
│   ├── mockRepository.ts
│   └── selectors.ts
├── domain/
│   ├── types.ts
│   └── constants.ts
├── styles/
│   ├── tokens.css
│   └── globals.css
└── test/
```

Adapt the folder names to the selected framework. Do not create parallel conventions inside an established application.

## 4. Route Plan

| Route | Minimum implementation |
|---|---|
| `/` | Resolve demo state and show Landing or redirect appropriately |
| `/onboarding` | Six-step form with validation and preserved state |
| `/generating` | Five-stage animation and reduced-motion behavior |
| `/today` | Complete priority-ordered homepage |
| `/insights/:insightId` | Complete evidence explanation for the Today hero |
| `/life-map` | Archetype summary and eight-domain grid |
| `/life-map/career` | Fully developed domain detail |
| `/ask` | Suggested prompts, deterministic mock answer, follow-up links |
| `/iching` | Question, six deterministic casts, result, restart |
| `/timing` | Current-period and activation preview |
| `/objects` | Small fixture-backed collection |
| `/objects/:productId` | Full personalized detail for the featured product |
| `/me` | Demo profile, disclosure, and placeholder settings |

Other life domains may use a consistent simplified detail template in Phase 1.

## 5. Shared Component Plan

### Primitives

- Button variants
- Icon button
- Text field, text area, date/time input wrapper
- Checkbox and segmented control
- Pill and tag
- Divider
- Progress indicator
- Visually hidden utility and live-region status

### Layout

- App shell
- Reading column
- Page header/top bar
- Bottom navigation
- Section header
- Responsive card grid
- Sheet/dialog only if required by the chosen interaction

### Product composites

- Today hero
- System evidence chip
- Quick action card
- Life-domain card
- Timing preview
- Element symbol and practice block
- Product recommendation card
- Evidence accordion/list
- Generation stage list
- Suggested prompt
- Mock answer section
- Coin cast control
- Hexagram figure
- Product gallery
- Personalized reason block

### System states

- Loading skeleton
- Empty state
- Inline notice
- Error state
- Disabled “coming soon” action

## 6. Implementation Milestones

Only one milestone should be actively expanded at a time. Run and inspect the app after each milestone.

### Milestone 0 — Repository audit and foundation

Tasks:

- Inspect existing files, scripts, packages, and user changes.
- Confirm how the app runs, builds, lints, and tests.
- Define routes and component/data boundaries.
- Add global design tokens and base typography.
- Add domain types and the mock repository boundary.
- Add an app shell with responsive gutters and navigation.

Exit criteria:

- Existing quality commands run or pre-existing failures are documented.
- `/today` can render a minimal fixture-backed shell.
- No raw fixture import is required inside low-level visual primitives.

### Milestone 1 — Onboarding to Today vertical slice

Tasks:

- Build Landing.
- Build step-by-step onboarding with validation and back navigation.
- Persist onboarding state for the current browser session or in URL-independent local demo state.
- Build the staged generation experience.
- Build the full Today page in the required content order.
- Connect Today hero “Why?” to its evidence route.

Exit criteria:

- A user can start at `/`, complete onboarding, watch/skip generation, and arrive at Today.
- Refresh behavior is intentional and documented.
- Today renders correctly at 375 px and 1280 px.
- Today contains no dead primary action.

### Milestone 2 — Explainability and Life Map

Tasks:

- Build the evidence view for the Today hero.
- Add consensus/tension presentation.
- Build Life Map overview with eight domains.
- Build the complete Career detail.
- Connect evidence items and Ask CTA.

Exit criteria:

- Every key interpretation visible in this slice resolves to one or more evidence records.
- The user can distinguish chart fact, traditional interpretation, and synthesis.
- No score suggests scientific precision or “good/bad fortune.”

### Milestone 3 — Ask and I Ching

Tasks:

- Build Ask landing and suggested prompts.
- Map suggested prompts and selected free-text keywords to deterministic mock responses.
- Display long-form answers with evidence and relevant-domain links.
- Build the six-cast I Ching interaction and accessible progress updates.
- Show primary hexagram, moving line, relating hexagram, and layered explanation.
- Connect “结合我的命盘一起看” back to Ask with a prefilled prompt.

Exit criteria:

- Ask never implies a network or live AI call in prototype mode.
- I Ching builds from bottom to top and produces the same seeded result for the demo.
- Restart works and reduced-motion mode remains usable.

### Milestone 4 — Timing and symbolic commerce

Tasks:

- Build Timing preview and explanation of activation.
- Build the object collection from fixtures.
- Complete the featured recommendation card on Today.
- Build the featured Product Detail Page.
- Include non-commercial practice before the object recommendation.
- Use a wish-list or “coming soon” action; do not build payment.

Exit criteria:

- The product page explains why the recommendation appeared.
- All claims are framed as symbolic/traditional associations.
- Material and price information are clearly separate from personalized interpretation.
- There is no checkout, card collection, or fake order confirmation.

### Milestone 5 — Polish and verification

Tasks:

- Add loading, empty, validation, disabled, and basic error states.
- Check responsive layouts at approximately 320/375, 768, and 1280 px.
- Check keyboard navigation, focus order, semantic headings, form labels, and live regions.
- Check contrast and 200% zoom.
- Check reduced-motion behavior.
- Check navigation history and direct route loading.
- Run type checks, lint, tests, and production build.
- Visually inspect every required route and correct overflow, awkward wrapping, inconsistent rhythm, and broken states.

Exit criteria:

- All global acceptance criteria pass.
- Any remaining limitations are documented as known Phase 1 exclusions.

## 7. Mock Behavior Specification

### Demo session

- Default profile is the fictional `profile-yu-demo` from `MOCK_DATA.md`.
- Completing onboarding may overwrite display name and birth-entry fields in session state while retaining the seeded chart facts.
- Show a small development-only indicator or internal note that chart facts remain demo fixtures.
- The same session always receives the same Today insight, chart, I Ching result, and recommendation.

### Ask routing

Use these deterministic categories:

| Match | Response fixture |
|---|---|
| career, work, job, 工作, 职业, 换工作 | Career transition answer |
| relationship, partner, 关系, 感情, 冲突 | Relationship pattern answer |
| start, new, begin, 开始, 新项目 | New-beginning answer |
| conflict, contradiction, 矛盾, 拉扯 | Internal-tension answer |
| no match | General reflective answer with links to suggested prompts |

Matching is only prototype behavior; keep it in the mock repository, not in the visual component.

### I Ching seed

- Six line values are stored bottom-to-top.
- Use the fixture sequence in `MOCK_DATA.md`.
- Moving lines remain stable across reloads during the demo.
- Provide a developer/test shortcut, but keep it visually secondary or hidden outside development mode.

## 8. Testing Strategy

Use the testing tools already present in the repository. At minimum, verify:

### Unit tests

- Mock selectors return the expected Today insight and featured product.
- Evidence resolution rejects or exposes missing references.
- Ask keyword routing is deterministic.
- I Ching line construction preserves bottom-to-top order.
- Unknown birth time toggles the appropriate limitation message.

### Component/integration tests

- Onboarding retains values across steps and blocks invalid progression.
- Generation reaches its completed state.
- Today hero opens the correct insight.
- Suggested Ask prompt renders the correct fixture answer.
- Six I Ching casts produce the expected result.
- Recommendation opens the correct Product Detail Page.

### End-to-end smoke path, if the repository supports it

```text
Landing
→ complete onboarding
→ generation
→ Today
→ Why
→ Career
→ Ask suggested question
→ I Ching demo result
→ featured product
```

Do not install a large end-to-end stack solely for this prototype if the repository does not already support one; use an appropriate lightweight verification instead.

## 9. Global Acceptance Criteria

### Product

- [ ] Landing explains the product in one screen.
- [ ] Onboarding is step-based and handles unknown birth time.
- [ ] Generation introduces all three birth-chart systems and synthesis.
- [ ] Today’s first card communicates one primary theme.
- [ ] Today’s content order matches `PRODUCT_SPEC.md`.
- [ ] Ask My Chart and I Ching are visibly distinct entry points.
- [ ] Life Map offers eight understandable domains.
- [ ] Career has a complete multi-system detail experience.
- [ ] “Why?” reveals traceable evidence.
- [ ] Timing uses activation, not luck scoring.
- [ ] A non-commercial practice appears before the product recommendation.
- [ ] The featured Product Detail Page explains personalization responsibly.

### Interaction

- [ ] All primary CTAs work.
- [ ] Back navigation and direct routes are usable.
- [ ] There are no accidental horizontal scrollbars.
- [ ] Loading, empty, disabled, validation, and basic error states are represented.
- [ ] I Ching can be completed and restarted.
- [ ] Ask returns deterministic demo answers.

### Engineering

- [ ] Domain models are typed.
- [ ] Fixtures are separate from components.
- [ ] Chart facts are not calculated in the UI.
- [ ] Evidence IDs resolve correctly.
- [ ] Design tokens are centralized.
- [ ] No credentials, payment, analytics, or live AI calls are present.
- [ ] Type check, lint, tests, and build pass, or pre-existing issues are documented.

### Accessibility and visual quality

- [ ] Keyboard navigation and visible focus work.
- [ ] Forms have labels and useful errors.
- [ ] Progress changes are announced accessibly.
- [ ] Evidence state and moving lines do not rely on color alone.
- [ ] Reduced-motion mode is usable.
- [ ] Essential contrast meets WCAG AA.
- [ ] The app is visually checked at 320/375, 768, and 1280 px.
- [ ] The visual language matches `DESIGN_SYSTEM.md` and avoids the listed clichés.

### Content and trust

- [ ] No guaranteed prediction or scientific claim appears.
- [ ] No medical, legal, financial, fertility, mortality, or safety prediction appears.
- [ ] Product language is symbolic and optional.
- [ ] Missing precision is disclosed instead of fabricated.
- [ ] Mock/demo behavior does not masquerade as a live calculation or live AI call.

## 10. Out-of-Scope Backlog

Do not begin these items until Phase 1 has been reviewed:

- Production BaZi, Zi Wei, astrology, transit, or calendar engines
- Historical timezone and daylight-saving resolution
- True solar time and school/convention settings
- Live LLM synthesis and retrieval
- User accounts and cloud persistence
- Relationship/synastry engine
- Long-range timing
- Real catalog, checkout, orders, shipping, taxes, or inventory
- Bracelet configurator
- Feng Shui compass, floor plan, or camera analysis
- Expert booking
- Notifications, social, community, and referrals

## 11. Handoff Format

When Codex finishes an implementation pass, report:

1. The outcome and routes completed
2. The most important product/visual decisions made
3. Checks run and their results
4. Screens visually inspected and viewport sizes
5. Known Phase 1 limitations
6. The safest next implementation slice

Do not describe Phase 1 as complete unless every required route and global acceptance criterion has been addressed.

