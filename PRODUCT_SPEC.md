# Life Map — Product Specification

**Status:** Phase 1 product source of truth  
**Platform:** Mobile-first responsive web app  
**Prototype mode:** Typed mock data; no production chart engines or checkout

## 1. Product Thesis

Life Map is a personal reflection product that places several interpretive traditions into one explainable experience:

- **BaZi / Four Pillars** for elemental structure, recurring tendencies, and longer cycles
- **Zi Wei Dou Shu** for life-domain interpretation through its palace structure
- **Western natal astrology** for personality, motivations, relationships, and transits
- **I Ching** for reflection on a specific question in the present
- **AI synthesis** for turning structured facts into clear language and exposing areas of agreement or tension
- **Symbolic commerce** for optional objects and rituals that carry a chosen theme into daily life

The product is not positioned as a scientific prediction system. Its promise is:

> Understand your patterns. Notice your timing. Reflect on what to do next.

## 2. Product Model

Life Map has three layers:

### Layer 1 — Who am I?

A relatively stable personal blueprint generated from birth data:

- BaZi
- Zi Wei Dou Shu
- Western natal chart

### Layer 2 — What season am I in?

Time-dependent themes:

- BaZi cycles and periods
- Zi Wei periods
- Western transits
- Calendar and seasonal context

Phase 1 displays mocked current-period signals only.

### Layer 3 — How do I meet this moment?

User-directed reflection:

- Ask My Chart
- I Ching casting
- Relationship questions in a later phase
- Space and Feng Shui guidance in a later phase
- An intention, practice, color, element, or optional symbolic object

## 3. Audience and Jobs to Be Done

### Primary audience

Curious adults who enjoy astrology, Chinese metaphysics, self-reflection, journaling, or culturally rooted ritual but prefer a contemporary, non-sensational experience.

### Core jobs

1. “Help me understand a recurring pattern in myself.”
2. “Help me make sense of my current life phase.”
3. “Give me a reflective frame for a question I am facing.”
4. “Show me why you reached this interpretation.”
5. “Help me carry an intention into daily life without making magical promises.”

## 4. Positioning

Life Map is:

- An explainable multi-system reflection tool
- A calm daily companion
- A bridge from specialist language to clear, humane prose
- A personalized ritual and symbolic-object experience

Life Map is not:

- A deterministic future-prediction service
- A scientific personality test
- A medical, financial, legal, or mental-health advisor
- A score-based “good luck” game
- An aggressive crystal or “energy cure” store

## 5. Core Product Principles

### 5.1 Human language first

Lead with “You may be re-evaluating how much autonomy you need at work,” not raw terms such as “Seven Killings,” “Tian Ji transforms to authority,” or “Saturn square Moon.” Specialist details remain available under “Why?”

### 5.2 Synthesis, not averaging

Never calculate a combined fortune score. Instead identify:

- **Consensus:** two or more systems emphasize a related theme
- **Tension:** systems highlight competing needs or different interpretations
- **Distinct signal:** one system contributes a relevant perspective without implying agreement

### 5.3 Explain every meaningful insight

Each insight includes stable evidence records that identify system, fact, interpretation, and relative strength. Users can expand the interpretation to see the basis for it.

### 5.4 Separate calculation and interpretation

Future architecture:

```text
Birth data
  → normalization, astronomy, calendar, time conventions
  → deterministic BaZi / Zi Wei / astrology engines
  → structured chart facts
  → rules and interpretation layer
  → AI synthesis
  → user-facing language
```

In Phase 1, typed fixtures begin at “structured chart facts.”

### 5.5 Commerce extends meaning

An object appears only after the product has established a theme and offered a non-purchase action. The object is presented as a beautiful symbolic reminder, not a correction for a deficient person.

## 6. Phase 1 Information Architecture

### Primary navigation

| Tab | Label | Purpose |
|---|---|---|
| Today | 今日 | The most relevant theme, actions, domains, timing, and symbol |
| Life Map | 命盘 | Stable blueprint and life-domain exploration |
| Ask | 问 | Ask My Chart and I Ching |
| Timing | 时运 | Current-period preview; deeper future timeline is later |
| Me | 我的 | Profile, preferences, and future relationship/object entry points |

Objects are accessible from recommendations and the Me area. They are not a primary navigation tab in Phase 1.

### Route map

```text
/
├── /onboarding
├── /generating
├── /today
│   └── /insights/:insightId
├── /life-map
│   └── /life-map/:domain
├── /ask
├── /iching
├── /timing
├── /objects
│   └── /objects/:productId
└── /me
```

## 7. Primary Journey

```text
Landing
  → birth onboarding
  → staged chart generation
  → Today theme
  → “Why?” evidence
  → Career in Life Map
  → Ask My Chart or cast an I Ching hexagram
  → return to a symbolic theme
  → recommendation
  → personalized Product Detail Page
```

Every primary call to action in this path must work in the prototype.

## 8. Screen Requirements

### 8.1 Landing

**Goal:** Communicate value and begin onboarding.

Content:

- Wordmark or restrained geometric mark
- Headline: “看见属于你的人生地图”
- Supporting line: “东方命理 × 西方占星 × AI，帮助你理解性格、关系与人生周期。”
- Primary CTA: “生成我的命盘”
- Secondary login affordance may be visually present but can be disabled or labeled “即将开放”
- Small disclosure: interpretive traditions are offered for reflection, not guaranteed prediction

### 8.2 Birth onboarding

**Goal:** Collect one field group per step without overwhelming the user.

Required steps:

1. Preferred name
2. Birth date
3. Birth time, with “I don’t know my exact time” option
4. Birth place search or mocked selector
5. Optional traditional-rule input, such as gender, with an explanation that some schools use it in cycle direction rules
6. Review and consent to generate the demo chart

Behavior:

- Preserve values when navigating backward.
- Validate required fields inline.
- If birth time is unknown, explain that Zi Wei palaces, the ascendant, and houses may be less precise in a real calculation.
- Location selection resolves to mocked latitude, longitude, timezone, and label.
- Never imply that Phase 1 has calculated a real chart; the completed project should label fixtures as demo data in development/demo mode.

### 8.3 Generation experience

**Goal:** Turn waiting into a meaningful introduction to the systems.

Staged labels:

1. “正在校准出生时间”
2. “正在排列四柱”
3. “正在展开十二宫”
4. “正在定位出生时的天空”
5. “正在寻找共同主题”

Requirements:

- Show progress and completed states.
- Duration should feel intentional but not slow; approximately 3–5 seconds in prototype mode, with a skip option during testing.
- Respect reduced-motion settings.
- End with “你的人生地图已生成” and a clear CTA to Today.

### 8.4 Today homepage

**Goal:** Answer, “What is most worth noticing today?” in under ten seconds.

The page order is fixed:

1. Today’s primary theme
2. Ask My Chart / I Ching quick actions
3. Life domains
4. Current timing
5. Element or symbolic theme
6. Personalized object recommendation
7. Recent questions, if space allows

#### Today hero

Contains:

- Greeting and localized date
- Eyebrow: “今日主题”
- A short title, ideally two to five Chinese characters, such as “收敛 · 选择”
- No more than two short explanatory sentences
- Evidence chips for BaZi, Zi Wei, and astrology with strong/supporting/inactive states
- CTA: “为什么？”

The hero must not display a luck score, star rating, or false numerical precision.

#### Quick actions

- “问命盘” opens `/ask`
- “问一卦” opens `/iching`

#### Life domains

Show four priority cards on Today:

- 自我 / Identity
- 事业 / Career
- 关系 / Relationships
- 财富 / Wealth

Each card has a short pattern or state, not a score. “查看全部” opens `/life-map`.

#### Current timing

Show the current period title, date range, one-sentence summary, and a compact position on a timeline. CTA opens `/timing`.

#### Symbolic recommendation

First show the day’s element/theme and one small non-commercial practice. Then show the optional product card and “为什么推荐给我？”

### 8.5 “Why?” evidence view

**Goal:** Establish trust and distinguish the product from generic generated prose.

Sections:

1. Synthesis
2. Evidence grouped by system
3. Tension or uncertainty, when present
4. “What you can do with this” reflection prompt
5. CTA to ask a follow-up question

Every evidence item shows:

- System
- User-facing fact label
- Traditional interpretation
- Strength language
- Optional “view raw mock fact” disclosure

### 8.6 Life Map overview

**Goal:** Provide a stable map of the user, organized by understandable life areas.

Domains:

- Identity
- Career
- Wealth
- Love
- Family
- Relationships
- Creativity
- Inner Life

The overview introduces a concise archetype such as “Builder × Explorer.” Each domain card contains one pattern sentence and a status such as “active,” “steady,” or “reflective,” not a fortune score.

### 8.7 Life-domain detail

**Goal:** Move from a plain-language pattern into evidence.

Required Career example:

- Pattern title: “Builder × Explorer”
- Two- to three-sentence summary
- Qualitative dimensions: autonomy, stability need, exploration need
- Multi-system synthesis
- Evidence sections for BaZi, Zi Wei, and Western astrology
- Reflection prompt and Ask CTA

Qualitative dimensions may use labeled bars, but never claim scientific measurement.

### 8.8 Ask My Chart

**Goal:** Demonstrate grounded conversational value without a live LLM.

Initial state:

- Prompt: “你最近在想什么？”
- Suggested questions about career stage, repeated relationship patterns, starting something new, and internal contradictions
- Composer with a clear demo behavior

Mock answer structure:

1. Direct, cautious answer
2. Consensus or tension summary
3. Supporting evidence chips and expandable sections
4. One reflective question
5. Optional link to the relevant Life Map domain

For Phase 1, map a small set of suggested prompts and free-text keywords to deterministic canned answers. Do not pretend a live AI request occurred.

### 8.9 I Ching

**Goal:** Offer a deliberate question-and-reflection ritual separate from the birth chart.

Flow:

1. User writes one concrete question.
2. User completes six casts, shown as three coin results or an accessible “cast” button.
3. Lines build from bottom to top.
4. The result displays primary hexagram, moving lines, and relating hexagram when applicable.
5. Explanation is separated into original text excerpt/label, plain-language interpretation, and application to the question.
6. CTA: “结合我的命盘一起看” opens a prefilled Ask experience.

The mock sequence must be deterministic so demos and tests are repeatable. Include a restart action.

### 8.10 Timing

**Goal:** Preview retention value without claiming forecast certainty.

Show:

- Past / now / near-future timeline
- Current period and next transition
- Domain activation labels for Career, Relationships, Creativity, and Inner Life
- An explanation that “activation” means thematic emphasis, not good or bad fortune

Long-range interactive forecasts are out of Phase 1.

### 8.11 Recommendation and object collection

**Goal:** Present optional symbolic objects in a contextually responsible way.

Recommendation logic represented in mocks:

```text
birth profile theme
  + current timing
  + current intention
  → recommendation reasons
```

Phase 1 categories:

- Stones
- Five Elements bracelet concept
- Desk/home symbolic set
- Personalized chart art concept

The collection may show 6–10 items, but only one complete Product Detail Page is required.

### 8.12 Product Detail Page

**Goal:** Explain the recommendation before presenting a mock purchase action.

Required sections:

1. Product imagery or premium placeholder art
2. Name in English and Chinese
3. “Why it showed up for you” with three reason chips
4. Traditional association disclaimer
5. Relationship to the current Life Map theme
6. A simple, non-magical daily use or ritual
7. Material, dimensions, origin, and care placeholder content
8. Price
9. CTA such as “加入愿望清单” or disabled “购买功能即将开放”

Phase 1 must not collect payment or imply inventory is real.

## 9. Content and Evidence Model

An insight is valid only if it has:

- A domain
- A user-facing title and summary
- One or more evidence references
- A synthesis type: consensus, tension, or distinct signal
- Cautious confidence language
- A reflection or action prompt when appropriate

Recommended strength labels:

- `primary`: central to this interpretation
- `supporting`: reinforces or nuances the theme
- `context`: useful context but not confirmation

Do not expose numeric confidence percentages to users.

## 10. Commerce Experience

### Funnel

```text
Insight
  → why this theme is present
  → element / symbol
  → optional practice
  → optional object
  → personalized Product Detail Page
```

### Recommended initial hero product

**Your Five Elements Bracelet** is a later commerce centerpiece: a personalized bead arrangement derived from a transparent rule set plus user intention. Phase 1 may show it as a concept card but should not build a configurator.

### Language rules

Use:

- “Traditionally associated with…”
- “Chosen as a symbol of…”
- “You might use it as a reminder to…”
- “This recommendation reflects your current intention…”

Avoid:

- “Balances your energy” as a factual health claim
- “Fixes your missing Wood”
- “Attracts guaranteed wealth/love”
- “Protects you from harm”
- “Buy now to change your luck”

## 11. Safety and Trust

- Show a concise interpretive-practice disclosure during onboarding and in Me.
- Make “Why?” available wherever a major personalized claim appears.
- Never imply scientific validation.
- Never encourage users to substitute the product for professional advice.
- For user questions involving immediate danger, health, legal, or financial stakes, a future live AI should redirect appropriately; Phase 1 fixtures should avoid such examples.
- Use “unknown” and uncertainty states rather than silently fabricating missing birth-time precision.

## 12. Phase 1 Scope

### Included

- Responsive shell and navigation
- Complete onboarding flow
- Generation animation
- Today homepage
- Insight evidence view
- Life Map overview and at least one complete domain detail
- Mocked Ask experience
- Deterministic I Ching experience
- Timing preview
- Product recommendation and one complete Product Detail Page
- Typed mock models and fixtures
- Loading, empty, and basic error states for core screens

### Explicitly excluded

- Real chart calculation of any kind
- Real astronomical or calendar libraries
- Real AI/LLM calls
- Authentication and persistent cloud accounts
- Payments, orders, fulfillment, inventory, or shipping
- Relationship synastry
- Full Feng Shui floor-plan or camera analysis
- Human expert marketplace
- Community or social feed
- Notifications and daily background jobs
- Localization beyond the prototype’s chosen Chinese-first bilingual UI

## 13. Phase 1 Success Criteria

The prototype succeeds when a test user can:

1. Explain the product’s purpose after viewing Landing and Today.
2. Complete the primary path without instruction or broken navigation.
3. Identify Today’s single most important theme within ten seconds.
4. Open “Why?” and understand which systems support the insight.
5. Distinguish Ask My Chart from I Ching.
6. Understand why an object was recommended without believing it guarantees an outcome.
7. Describe the visual experience as calm, premium, contemporary, and culturally considered.

## 14. Future Product Direction

After visual and product validation, later phases may add:

- Deterministic BaZi, Zi Wei, astrology, and calendar engines
- Engine convention/version controls
- Authenticated profiles and saved readings
- Live evidence-grounded AI synthesis
- Relationship profiles and comparison
- Longer timing horizons
- Commerce, fulfillment, and personalized bracelet configuration
- Feng Shui space input and floor plans
- Human expert sessions

None of these should distort the Phase 1 architecture into premature production complexity.

