# Life Map — Design System

## 1. Creative Direction

**Modern Oriental × Editorial**

Life Map should feel quiet, tactile, intelligent, and premium. Its visual identity comes from proportion, typography, warm materials, fine lines, and restrained symbolic geometry—not from mystical spectacle.

Desired qualities:

- Warm, not yellowed
- Spiritual, not supernatural
- Cultural, not ornamental
- Editorial, not austere
- Premium, not precious
- Personal, not clinical

Avoid:

- Purple galaxy or star-field backgrounds
- Glowing crystals and neon aura effects
- Dragons, talismans, zodiac animals, or Bagua used as decoration
- Fake parchment and distressed “ancient” textures
- Heavy gold gradients
- Glassmorphism as a default card treatment
- Luck meters, five-star fortune ratings, red/green fate scores
- Dense dashboards of specialist notation on primary screens

## 2. Brand Geometry

Use a small family of abstract shapes derived from the systems:

- **BaZi:** four vertical pillars
- **Zi Wei:** a restrained 12-part grid
- **Astrology:** circles, orbit lines, and axes
- **I Ching:** broken and unbroken lines

Combine no more than two motifs in a single composition. Geometry should serve hierarchy, state, or navigation before it serves decoration.

## 3. Color System

### Core palette

| Token | Value | Use |
|---|---:|---|
| `--color-canvas` | `#F5F1E8` | Primary warm-ivory page background |
| `--color-surface` | `#FBF8F1` | Raised cards and sheets |
| `--color-surface-strong` | `#EEE8DC` | Selected or emphasized neutral surface |
| `--color-ink` | `#171714` | Primary text |
| `--color-ink-soft` | `#55534D` | Secondary text |
| `--color-ink-muted` | `#77736A` | Metadata and tertiary labels |
| `--color-line` | `#D9D1C3` | Dividers and card borders |
| `--color-line-strong` | `#BDB3A3` | Emphasized dividers and inputs |
| `--color-jade` | `#496B5D` | Primary brand accent |
| `--color-jade-deep` | `#2F4D42` | Hover/pressed or dark accent surface |
| `--color-jade-soft` | `#DCE6DF` | Pills and supporting surfaces |
| `--color-cinnabar` | `#A44738` | Restrained alerts, moving lines, special marks |
| `--color-cinnabar-soft` | `#EEDDD7` | Subtle highlight surface |
| `--color-gold-muted` | `#9A7A48` | Small premium/material details only |
| `--color-focus` | `#275DCE` | Accessible keyboard focus ring |
| `--color-error` | `#9C3E36` | Validation and errors |
| `--color-success` | `#3E6954` | Completed states |

### Usage ratio

- 70–80% ivory and neutral surfaces
- 15–20% ink and line work
- 5–10% jade
- Less than 2% cinnabar or muted gold

Jade is the product accent. Cinnabar should feel like a seal or editorial annotation, never a broad brand wash.

### Contrast

- Primary text must meet WCAG AA against its background.
- Do not place muted text below accessible contrast for essential information.
- Evidence strength must not rely on color alone; pair color with labels, icons, or stroke patterns.

## 4. Typography

### Font roles

Use an editorial serif for evocative titles, theme words, hexagram names, and chart moments. Use a clean sans serif for navigation, controls, body text, and data.

Preferred stacks:

```css
--font-editorial: "Noto Serif SC", "Source Han Serif SC", "Songti SC", Georgia, serif;
--font-ui: Inter, "Noto Sans SC", "Source Han Sans SC", "PingFang SC", system-ui, sans-serif;
```

If external font loading is not already configured, use system fallbacks first. Do not block the prototype on font licensing or network-loaded assets.

### Type scale

| Token | Mobile | Desktop | Line height | Role |
|---|---:|---:|---:|---|
| `display` | 42 px | 60 px | 1.08 | Landing statement, rare use |
| `theme` | 36 px | 48 px | 1.15 | Today theme, hexagram name |
| `h1` | 30 px | 40 px | 1.2 | Page title |
| `h2` | 24 px | 30 px | 1.3 | Section title |
| `h3` | 19 px | 22 px | 1.4 | Card title |
| `body-lg` | 17 px | 18 px | 1.7 | Hero/supporting prose |
| `body` | 15 px | 16 px | 1.65 | Default body |
| `label` | 13 px | 13 px | 1.4 | UI label |
| `caption` | 12 px | 12 px | 1.5 | Metadata |

Chinese body copy needs generous line height. Avoid wide letter spacing in Chinese. Eyebrows can use 0.08–0.12em tracking for short Latin or bilingual labels.

### Rules

- Serif is for meaning, not every heading.
- Use no more than three font weights per family.
- Limit hero prose to 16–22 Chinese characters per line on typical mobile widths when possible.
- Avoid centered body paragraphs longer than two lines.
- Use tabular numerals for dates, progress, and timing labels.

## 5. Spacing, Sizing, and Layout

### Spacing scale

Use a 4 px base:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
```

### Radius

```css
--radius-sm: 8px;
--radius-md: 14px;
--radius-lg: 22px;
--radius-xl: 30px;
--radius-pill: 999px;
```

Cards should generally use 14–22 px radius. Do not make every element pill-shaped.

### Borders and shadows

Prefer a fine border to a strong shadow.

```css
--shadow-soft: 0 10px 30px rgba(31, 27, 20, 0.06);
--shadow-overlay: 0 20px 60px rgba(31, 27, 20, 0.14);
```

Use `--shadow-soft` only on important raised cards, product imagery, and floating navigation. Most cards should use a 1 px `--color-line` border.

### Responsive grid

- **Small mobile, 320–479 px:** 16 px page gutters; single-column content
- **Large mobile/tablet, 480–767 px:** 24 px gutters; selected two-column card grids
- **Tablet, 768–1023 px:** max content width 760 px; 32 px gutters
- **Desktop, 1024 px and above:** centered app frame or editorial canvas, max content width 1120 px; two-column sections where useful

Primary reading content should remain between 560 and 720 px wide. Product imagery and domain grids may extend wider.

### Safe areas

Bottom navigation must account for device safe-area insets. Content needs enough bottom padding that final actions are never obscured.

## 6. Iconography and Illustration

- Use a consistent 1.5–1.75 px line icon family.
- Default icon sizes: 18, 20, and 24 px.
- Avoid filled emoji as production icons.
- Create symbolic illustrations using thin geometry, crop, negative space, and subtle paper/grain texture.
- Product photography should use natural daylight, neutral stone/linen/wood surfaces, and honest material detail.
- If photography is unavailable, use premium abstract placeholders that clearly read as prototype imagery.

## 7. Motion

Motion should feel measured and ceremonial, never magical or distracting.

### Durations

- Micro feedback: 120–180 ms
- Card/section transition: 220–320 ms
- Generation-stage transition: 450–700 ms
- I Ching line reveal: 350–500 ms

### Easing

Use a restrained ease-out curve such as `cubic-bezier(0.22, 1, 0.36, 1)` for entrances.

### Generation animation

- Reveal one geometric system at a time.
- Mark completed stages with a quiet check, line, or fill change.
- Avoid spinning zodiac wheels, particle explosions, cosmic zooms, and artificial countdowns.

### Reduced motion

When `prefers-reduced-motion: reduce` is enabled:

- Replace transform-based reveals with immediate opacity/state changes.
- Shorten generation to the minimum understandable sequence.
- Disable parallax and decorative looping animation.
- Preserve all informational progress states.

## 8. Component Specifications

### 8.1 App shell

`AppShell` manages canvas, max width, safe areas, and persistent navigation. On desktop, the experience may appear as an editorial app canvas rather than an artificially narrow phone replica.

### 8.2 Top bar

- Height: approximately 56 px mobile
- Use for greeting/context or back navigation, not both when avoidable
- Profile trigger is small and quiet
- Maintain a consistent back-button location

### 8.3 Bottom navigation

- Five destinations: Today, Life Map, Ask, Timing, Me
- Ask may receive a distinctive central mark, but must not become an oversized floating novelty button
- Active state uses ink plus jade indicator; inactive state uses muted ink
- Label remains visible; do not rely on icons alone
- Minimum target size: 44 × 44 px

### 8.4 Buttons

**Primary:** jade background, warm-white text, minimum 48 px height  
**Secondary:** transparent/ivory, 1 px strong border, ink text  
**Tertiary:** text with arrow or underline on hover  
**Destructive:** reserved for data removal; not needed in the primary demo

Buttons use sentence case. Disabled states must remain legible and explain why when the action matters.

### 8.5 Inputs

- Labels always remain visible.
- Minimum 48 px control height.
- Error copy appears directly below the field.
- Date/time fields can use native controls when they provide the most reliable mobile behavior.
- Provide helper text before validation when uncertainty is expected, especially birth time.

### 8.6 Editorial card

Base style:

- Surface background
- 1 px neutral border
- 18–22 px radius
- 20–24 px internal padding on mobile
- Optional eyebrow, title, body, metadata, and footer action

Cards should not all have identical visual weight. Use borderless grouped sections for secondary material.

### 8.7 Today hero

- Tallest and most spacious card on Today
- Soft ivory or lightly tinted jade surface
- A small geometric motif may sit at an edge, not behind body copy
- Theme title uses the editorial serif
- Evidence chips sit below the summary
- “为什么？” is visible without scrolling on common mobile heights when practical

### 8.8 System evidence chip

Variants:

- `primary`: jade tint, solid system mark, label
- `supporting`: neutral surface, jade outline or dot, label
- `context`: neutral surface, muted outline, label

Labels:

- 八字
- 紫微
- Astrology or 西方占星, depending on available width

Each chip needs an accessible label such as “八字，主要依据.”

### 8.9 Quick action card

Two cards sit side by side on standard mobile widths:

- “问命盘” with a conversational line motif
- “问一卦” with a solid/broken-line motif

Each card uses a short title, bilingual/secondary label if space permits, and a clear pressed state.

### 8.10 Life-domain card

Contains domain name, English label, one short pattern/status, and restrained directional indicator. No numerical score. Use varied but coordinated geometric crops to help scanning.

### 8.11 Timing preview

- Show a thin horizontal track with past, current point, and near future
- Current point is emphasized with jade and a textual “现在” label
- Title and one sentence are more important than the visualization
- Use activation bars only with explicit qualitative labels

### 8.12 Evidence accordion

Each row includes system, fact label, strength, and expand control. Expanded content separates:

1. Chart fact
2. Traditional interpretation
3. Contribution to this synthesis

Do not hide uncertainty or missing birth-time limitations.

### 8.13 Chat answer

- Avoid generic chat bubbles for long interpretation content.
- Present answers as editorial sections with a small conversational preface.
- Evidence chips and domain links remain interactive.
- User messages may use compact bubbles; assistant answers should use the reading column.

### 8.14 I Ching cast

- Three coins can be abstract discs, not photorealistic ancient coins.
- Include a text-accessible “第 1 次，共 6 次” status.
- Build hexagram lines from bottom to top.
- Moving lines use cinnabar plus a symbol; never color alone.
- Provide restart and skip-to-demo-result actions in development/demo mode.

### 8.15 Product recommendation card

The hierarchy is:

1. “与你的成长主题呼应”
2. Product image
3. English and Chinese product names
4. Association chips
5. “为什么推荐给我？”
6. Price and low-pressure view action

Do not make the price or purchase action the visually dominant element on Today.

### 8.16 Product Detail Page

- Use a 4:5 or square lead image.
- Place personalization explanation before material/price controls.
- Clearly label traditional associations.
- Include an ordinary daily use, such as placing the object near a journal or desk.
- Phase 1 purchase button should be disabled or converted into “加入愿望清单.”

## 9. Page Composition

### Today mobile order

```text
Top bar / greeting
Today hero
Two quick actions
Life domains (2 × 2)
Current timing
Element and one practice
Recommendation
Recent questions
Bottom navigation clearance
```

Use 32–48 px between major sections. Avoid enclosing every section in a large card.

### Life Map

Start with a generous identity/archetype composition, followed by an eight-domain grid. On larger screens, pair the archetype summary with a restrained system diagram.

### Ask

Keep the initial prompt spacious. Suggested prompts should look like editorial questions, not a wall of chat chips. After an answer, maintain a readable long-form column.

### Product detail

On desktop, use a two-column composition: sticky image/gallery left, personalized explanation and details right. On mobile, image leads and the action remains in document flow unless a sticky action can be implemented accessibly.

## 10. Voice and Microcopy

### Voice

- Calm
- Specific
- Curious
- Non-judgmental
- Culturally respectful
- Clear about uncertainty

### Preferred phrasing

- “你可能会注意到……”
- “这一主题在两个体系中都出现了。”
- “从传统解释看……”
- “这不一定意味着结果，而是一个值得留意的张力。”
- “你可以把它当作今天的反思提示。”

### Avoid

- “你命中注定……”
- “今天一定会……”
- “你的能量严重不足……”
- “佩戴后即可……”
- “准确率 99%”
- “AI 大师已算出……”

### Bilingual labeling

Chinese is primary. Use short English labels sparingly for brand texture and specialist clarity, for example `事业 / Career`. Do not repeat every sentence in two languages.

## 11. Accessibility

- Meet WCAG 2.2 AA where practical.
- Use semantic headings in a logical order.
- Provide keyboard access and visible focus for all actions.
- Give icons and symbolic diagrams meaningful accessible labels or mark them decorative.
- Use live-region status updates for chart generation and I Ching cast progress.
- Touch targets are at least 44 × 44 px.
- Do not convey evidence strength, moving lines, or errors by color alone.
- Honor reduced motion.
- Ensure zoom to 200% does not hide content or actions.
- Keep essential text as HTML, not embedded in images.

## 12. Token Starter

Codex may adapt naming to the chosen framework, but centralize equivalent values:

```css
:root {
  --color-canvas: #f5f1e8;
  --color-surface: #fbf8f1;
  --color-surface-strong: #eee8dc;
  --color-ink: #171714;
  --color-ink-soft: #55534d;
  --color-ink-muted: #77736a;
  --color-line: #d9d1c3;
  --color-line-strong: #bdb3a3;
  --color-jade: #496b5d;
  --color-jade-deep: #2f4d42;
  --color-jade-soft: #dce6df;
  --color-cinnabar: #a44738;
  --color-cinnabar-soft: #eeddd7;
  --color-gold-muted: #9a7a48;
  --color-focus: #275dce;
  --color-error: #9c3e36;
  --color-success: #3e6954;

  --font-editorial: "Noto Serif SC", "Source Han Serif SC", "Songti SC", Georgia, serif;
  --font-ui: Inter, "Noto Sans SC", "Source Han Sans SC", "PingFang SC", system-ui, sans-serif;

  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 22px;
  --radius-xl: 30px;
  --radius-pill: 999px;

  --shadow-soft: 0 10px 30px rgb(31 27 20 / 6%);
  --shadow-overlay: 0 20px 60px rgb(31 27 20 / 14%);
}
```

## 13. Visual QA Checklist

Before considering a screen complete, check:

- Does the primary message appear before specialist detail?
- Is the next action obvious without dominating the page?
- Is there enough negative space for the editorial tone?
- Are raw colors and one-off spacing values absent or rare?
- Does the screen work at 320/375 px without horizontal scrolling?
- Does the desktop version use space intentionally rather than merely stretching?
- Are focus, hover, pressed, disabled, loading, empty, and error states present where relevant?
- Does the experience remain coherent without decorative imagery?
- Does every product claim remain symbolic and non-guaranteed?
- Has the screen been visually inspected in a running app?

