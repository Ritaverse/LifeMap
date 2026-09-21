"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { AnchorHTMLAttributes, FormEvent, ReactNode } from "react";
import { iching, products, recommendation } from "../lib/data";
import { calculateBazi, demoBaziReading } from "../lib/bazi";
import type { BaziPillar, BaziReading, BirthPlace, FiveElement, PillarKind } from "../lib/bazi";
import { buildCalculatedExperience, getChartExplanationPreview, localDateString, resolveCalculatedEvidence, routeCalculatedAsk } from "../lib/experience";
import type { CalculatedExperience, ChartExplanationPreview } from "../lib/experience";
import { searchBirthPlaces } from "../lib/place-search";
import { clearBirthProfile, readBirthProfile, readOnboardingDraft, writeBirthProfile, writeOnboardingDraft } from "../lib/profile-storage";
import type { OnboardingDraft, ReflectionFocus } from "../lib/profile-storage";
import { clearReflections, readReflections, removeReflection, saveReflection } from "../lib/reflection-storage";
import type { SavedReflection } from "../lib/reflection-storage";
import { buildDailyReport, buildLifeMapReport } from "../lib/report";
import { createReportCheckout, type ReportProductKind } from "../lib/shopify";
import type { AskResponse, DomainId, EvidenceRef, IChingLine, Product, SystemId } from "../lib/types";
import type { WesternReading } from "../lib/western";
import type { ZiweiReading } from "../lib/ziwei";

type RouteName = "landing" | "onboarding" | "generating" | "today" | "insight" | "life-map" | "domain" | "ask" | "iching" | "timing" | "objects" | "product" | "report" | "me";

function Link({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a href={href} {...props} />;
}

function navigate(href: string) {
  window.location.assign(href);
}

const systemLabels: Record<SystemId, { short: string; full: string }> = {
  bazi: { short: "八字", full: "BaZi · 八字" },
  ziwei: { short: "紫微", full: "Zi Wei · 紫微" },
  astrology: { short: "占星", full: "Western Astrology · 西方占星" },
};

const desktopNavItems = [
  { href: "/today", key: "today", zh: "今日", en: "Today", mark: "日" },
  { href: "/life-map", key: "life-map", zh: "命盘", en: "Life Map", mark: "命" },
  { href: "/ask", key: "ask", zh: "问", en: "Ask", mark: "问" },
  { href: "/timing", key: "timing", zh: "时运", en: "Timing", mark: "时" },
  { href: "/objects", key: "objects", zh: "商城", en: "Shop", mark: "物" },
  { href: "/me", key: "me", zh: "我的", en: "Me", mark: "我" },
];

const mobileNavItems = desktopNavItems.filter((item) => item.key !== "timing");

const focusOptions: Array<{ id: ReflectionFocus; label: string; title: string; description: string; prompt: string }> = [
  { id: "relationships", label: "关系", title: "看清重复的关系模式", description: "把靠近、空间、边界和回应说得更具体。", prompt: "为什么我和亲近的人总会重复类似的冲突？" },
  { id: "career", label: "事业", title: "梳理一个职业选择", description: "分开环境问题、角色问题和真正不能妥协的条件。", prompt: "我现在的职业处于什么阶段？" },
  { id: "timing", label: "时机", title: "理解现在所处的阶段", description: "观察当前线索，而不是寻找一个保证结果的日期。", prompt: "这个阶段我最值得留意什么？" },
  { id: "self", label: "自我", title: "理解内在的矛盾", description: "找出哪些需求正在拉扯，以及它们各自在保护什么。", prompt: "我的命盘里最矛盾的地方是什么？" },
];

const focusDomains: Record<ReflectionFocus, DomainId> = {
  relationships: "relationships",
  career: "career",
  timing: "inner-life",
  self: "identity",
};

function focusOption(id: ReflectionFocus) {
  return focusOptions.find((item) => item.id === id) ?? focusOptions[0];
}

function reviewDateFromNow(days = 7) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return localDateString(value);
}

function useSavedReflections() {
  const [items, setItems] = useState<SavedReflection[]>([]);
  useEffect(() => { queueMicrotask(() => setItems(readReflections())); }, []);
  return { items, setItems };
}

function useSessionFocus() {
  const [focus, setFocus] = useState<ReflectionFocus>("relationships");
  useEffect(() => {
    const value = sessionStorage.getItem("life-map-focus");
    if (focusOptions.some((item) => item.id === value)) queueMicrotask(() => setFocus(value as ReflectionFocus));
  }, []);
  return focus;
}

function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <span className={`brand-mark ${large ? "brand-mark--large" : ""}`} aria-hidden="true">
      <span className="brand-mark__orbit" />
      <span className="brand-mark__lens" />
      <span className="brand-mark__self" />
      <span className="brand-mark__anchors"><i /><i /><i /><i /></span>
    </span>
  );
}

function BrandLockup({ tagline = false }: { tagline?: boolean }) {
  return (
    <>
      <BrandMark />
      <span className="wordmark__copy"><strong>Life Map</strong>{tagline && <small>星命相照 · 向内生长</small>}</span>
    </>
  );
}

function PageShell({ route, title, eyebrow, children, backHref }: { route: RouteName; title?: string; eyebrow?: string; children: ReactNode; backHref?: string }) {
  const hasNav = !["landing", "onboarding", "generating"].includes(route);
  const hasBrandFooter = !["onboarding", "generating"].includes(route);
  const activeKey = route === "domain" ? "life-map" : route === "insight" || route === "report" ? "today" : route === "objects" || route === "product" ? "objects" : route;
  return (
    <div className={`app-shell ${hasNav ? "app-shell--nav" : ""}`}>
      {hasNav && (
        <header className="topbar">
          <div className="topbar__inner">
            <div className="topbar__lead">{backHref ? <Link href={backHref} className="icon-link" aria-label="返回">←</Link> : <Link href="/today" className="wordmark" aria-label="Life Map 首页"><BrandLockup tagline /></Link>}</div>
            <nav className="desktop-nav" aria-label="网站主导航">
              {desktopNavItems.map((item) => <Link key={item.key} href={item.href} className={activeKey === item.key ? "is-active" : ""} aria-current={activeKey === item.key ? "page" : undefined}><span>{item.zh}</span><small>{item.en}</small></Link>)}
            </nav>
            <div className="topbar__context">
              {eyebrow && <span>{eyebrow}</span>}
              {title && <strong>{title}</strong>}
            </div>
            <div className="topbar__actions"><Link href="/me" className="profile-link" aria-label="个人资料">Y</Link></div>
          </div>
        </header>
      )}
      <main className={hasNav ? "main-content" : "main-content main-content--bare"}>{children}</main>
      {hasBrandFooter && (
        <footer className={`site-footer ${hasNav ? "" : "site-footer--bare"}`} aria-label="Life Map 品牌愿景">
          <div className="site-footer__inner">
            <div className="wordmark wordmark--footer"><BrandLockup tagline /></div>
            <p>东方命理 × 西方占星，理解自己，与同路人一起成长。</p>
            <small>COMMUNITY IN THE MAKING · 同路社区正在生长</small>
          </div>
        </footer>
      )}
      {hasNav && (
        <nav className="bottom-nav" aria-label="移动端主要导航">
          <div className="bottom-nav__inner">
            {mobileNavItems.map((item) => (
              <Link key={item.key} href={item.href} className={activeKey === item.key ? "is-active" : ""} aria-current={activeKey === item.key ? "page" : undefined}>
                <span className="nav-mark" aria-hidden="true">{item.mark}</span>
                <span>{item.zh}</span>
                <small>{item.en}</small>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

function SectionHeader({ eyebrow, title, action, href }: { eyebrow?: string; title: string; action?: string; href?: string }) {
  return (
    <div className="section-header">
      <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>
      {action && href && <Link href={href} className="text-link">{action} <span aria-hidden="true">↗</span></Link>}
    </div>
  );
}

function useActiveBaziReading() {
  const [reading, setReading] = useState<BaziReading>(demoBaziReading);
  useEffect(() => {
    const profile = readBirthProfile();
    if (!profile) return;
    try {
      const nextReading = calculateBazi(profile);
      queueMicrotask(() => setReading(nextReading));
    } catch { /* Keep the safe fictional sample if stored data is invalid. */ }
  }, []);
  return reading;
}

function useActiveExperience() {
  const reading = useActiveBaziReading();
  // SSR cannot know the browser's timezone. Start from the UTC calendar date so
  // the server and first client render agree, then adopt the local day after
  // hydration. This avoids a date-boundary hydration mismatch.
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().slice(0, 10));
  useEffect(() => {
    const localDate = localDateString();
    if (localDate !== targetDate) queueMicrotask(() => setTargetDate(localDate));
  }, [targetDate]);
  return useMemo(() => {
    try {
      return { reading, experience: buildCalculatedExperience(reading, targetDate), calculationError: null as string | null };
    } catch (error) {
      return { reading, experience: null, calculationError: error instanceof Error ? error.message : "命盘计算失败" };
    }
  }, [reading, targetDate]);
}

const elementEnglish: Record<FiveElement, string> = { 木: "WOOD", 火: "FIRE", 土: "EARTH", 金: "METAL", 水: "WATER" };
const elementOrder: FiveElement[] = ["木", "火", "土", "金", "水"];
const elementColor: Record<FiveElement, string> = {
  木: "var(--color-element-wood)",
  火: "var(--color-element-fire)",
  土: "var(--color-element-earth)",
  金: "var(--color-element-metal)",
  水: "var(--color-element-water)",
};

function PhaseScopeNotice({ experience }: { experience: CalculatedExperience }) {
  const ziweiStatus = experience.ziwei.status === "calculated" ? "紫微十二宫已排盘" : "紫微因出生时间未知而省略";
  return (
    <details className="phase-scope">
      <summary><span aria-hidden="true">✓</span><strong>三体系已计算</strong><small>查看范围与限制</small></summary>
      <p><strong>八字、西占与当前时运均来自版本化计算。</strong> {ziweiStatus}；综合洞察由可复算规则连接证据，不调用实时 AI，也不作结果保证。</p>
    </details>
  );
}

function elementGradient(reading: BaziReading) {
  const total = Object.values(reading.visibleElementCounts).reduce((sum, count) => sum + count, 0);
  let start = 0;
  return `conic-gradient(from -90deg, ${elementOrder.map((element) => {
    const end = start + (reading.visibleElementCounts[element] / total) * 100;
    const segment = `${elementColor[element]} ${start}% ${end}%`;
    start = end;
    return segment;
  }).join(", ")})`;
}

function ElementPresenceGraph({ reading, compact = false }: { reading: BaziReading; compact?: boolean }) {
  const counts = reading.visibleElementCounts;
  const maxCount = Math.max(1, ...Object.values(counts));
  const accessibleSummary = elementOrder.map((element) => `${element}${counts[element]}`).join("，");

  return (
    <figure className={`element-presence ${compact ? "element-presence--compact" : ""}`}>
      <header><span>VISIBLE ELEMENTS · 表层五行</span><strong>八个干支中的出现次数</strong></header>
      <div className="element-presence__plot" role="img" aria-label={`表层五行数量：${accessibleSummary}`}>
        {elementOrder.map((element, index) => (
          <div className="element-presence__column" key={element}>
            <div className="element-presence__bar">
              <span>{counts[element]}</span>
              <i style={{
                "--element-color": elementColor[element],
                "--element-height": `${(counts[element] / maxCount) * 100}%`,
                "--element-delay": `${index * 70}ms`,
              } as React.CSSProperties} />
            </div>
            <b>{element}</b>
            <small>{elementEnglish[element]}</small>
          </div>
        ))}
      </div>
      <figcaption>数量只描述表层干支，不等于旺衰、喜用神、吉凶或元素“缺失”。</figcaption>
    </figure>
  );
}

function BaziChartDrawing({ reading }: { reading: BaziReading }) {
  const [activeKind, setActiveKind] = useState<PillarKind>("day");
  const pillars: Array<BaziPillar | null> = [reading.pillars.year, reading.pillars.month, reading.pillars.day, reading.pillars.time];
  const activePillar = pillars.find((pillar) => pillar?.kind === activeKind) ?? reading.pillars.day;
  const wheelStyle = { "--bazi-element-gradient": elementGradient(reading) } as React.CSSProperties;
  const hiddenStems = activePillar.hiddenStems.map((stem, index) => `${stem} · ${activePillar.hiddenTenGods[index] ?? "—"}`);

  return (
    <div className="bazi-drawing">
      <div className="bazi-drawing__heading"><div><span>INTERACTIVE CHART · 命盘图</span><h3>四柱围绕日主展开</h3></div><p>点击四柱查看细节。圆环表示表层八个干支的五行数量；方位只用于信息阅读，不是另一套传统推算规则。</p></div>
      <div className="bazi-drawing__layout">
        <div className="bazi-wheel" style={wheelStyle} aria-label={`八字命盘图，日主 ${reading.dayMaster.stem}，${reading.dayMaster.polarity}${reading.dayMaster.element}`}>
          <div className="bazi-wheel__rings" aria-hidden="true"><i /><i /><i /></div>
          <div className="bazi-wheel__core"><span>日主</span><strong>{reading.dayMaster.stem}</strong><small>{reading.dayMaster.polarity}{reading.dayMaster.element}</small></div>
          {pillars.map((pillar, index) => pillar ? (
            <button key={pillar.kind} type="button" className={`bazi-node bazi-node--${pillar.kind} ${activeKind === pillar.kind ? "is-active" : ""}`} aria-pressed={activeKind === pillar.kind} onClick={() => setActiveKind(pillar.kind)}>
              <span>{pillar.label}</span><b>{pillar.stem}</b><b>{pillar.branch}</b><small>{pillar.elements.join(" · ")}</small>
            </button>
          ) : (
            <button key={`missing-${index}`} type="button" className="bazi-node bazi-node--time is-missing" disabled><span>时柱</span><b>—</b><b>—</b><small>时间未知</small></button>
          ))}
        </div>
        <aside className="pillar-inspector" aria-live="polite">
          <header><span>{activePillar.label} · {activePillar.kind.toUpperCase()}</span><h3>{activePillar.ganZhi}</h3><p>{activePillar.elements.join(" · ")} · 纳音 {activePillar.naYin}</p></header>
          <dl>
            <div><dt>天干</dt><dd>{activePillar.stem}</dd></div>
            <div><dt>地支</dt><dd>{activePillar.branch}</dd></div>
            <div><dt>天干十神</dt><dd>{activePillar.stemTenGod}</dd></div>
            <div><dt>藏干 · 支内十神</dt><dd>{hiddenStems.join(" ／ ") || "—"}</dd></div>
          </dl>
          <div className="element-legend" aria-label="表层干支五行分布">{elementOrder.map((element) => <span key={element} style={{ "--element-color": elementColor[element] } as React.CSSProperties}><i /><b>{element}</b><small>{reading.visibleElementCounts[element]}</small></span>)}</div>
          <p className="pillar-inspector__note">数量只描述表层干支，不等于旺衰、喜用神或吉凶。</p>
        </aside>
      </div>
    </div>
  );
}

function ChartExplanation({ preview }: { preview: ChartExplanationPreview }) {
  const label = systemLabels[preview.system].full;
  const headingId = `chart-explanation-${preview.system}`;
  return (
    <aside className="chart-explanation" data-chart-system={preview.system} data-evidence-id={preview.evidenceFactId ?? undefined} aria-labelledby={headingId}>
      <div>
        <p className="eyebrow">CHART NOTE · 命盘简读</p>
        <h3 id={headingId}>先读这三点</h3>
        <div className="chart-explanation__copy">
          {preview.lines.map((line) => <p key={line.label}><strong>{line.label}</strong>{line.text}</p>)}
        </div>
      </div>
      <footer className="chart-explanation__footer">
        <span>{label} 的计算事实与阅读边界保持免费公开；报告只增加整理、打印与连续练习。</span>
      </footer>
    </aside>
  );
}

function BaziChartCard({ reading, explanation, id, visual = false }: { reading: BaziReading; explanation?: ChartExplanationPreview; id?: string; visual?: boolean }) {
  const pillars = [reading.pillars.year, reading.pillars.month, reading.pillars.day, reading.pillars.time];
  return (
    <section className="bazi-chart" id={id}>
      <header className="bazi-chart__header">
        <div><p className="eyebrow">YOUR FOUR PILLARS · 四柱排盘</p><h2>{visual ? "你的八字命盘" : "你的四柱"}</h2><p>依据你输入的当地出生时间与所列规则计算；这里展示结构化事实，不生成性格或吉凶结论。</p></div>
        <span className="calculation-label">已排盘 · v{reading.engine.version}</span>
      </header>
      {visual && <BaziChartDrawing reading={reading} />}
      <div className="bazi-pillars" aria-label="八字四柱">
        {pillars.map((pillar, index) => pillar ? (
          <article key={pillar.kind} className={pillar.kind === "day" ? "is-day" : ""}>
            <small>{pillar.label}</small>
            <div aria-label={`${pillar.label} ${pillar.ganZhi}`}><strong>{pillar.stem}</strong><strong>{pillar.branch}</strong></div>
            <span>{pillar.elements.join(" · ")}</span>
            <p>{pillar.stemTenGod} · 纳音 {pillar.naYin}</p>
          </article>
        ) : (
          <article key={`missing-${index}`} className="is-missing">
            <small>时柱</small><div><strong>—</strong><strong>—</strong></div><span>出生时间未知</span><p>暂不推算</p>
          </article>
        ))}
      </div>
      <div className="bazi-chart__summary">
        <div><span>日主</span><strong>{reading.dayMaster.stem} · {reading.dayMaster.polarity}{reading.dayMaster.element}</strong><small>{elementEnglish[reading.dayMaster.element]}</small></div>
        <div><span>农历日期</span><strong>{reading.lunarDate}</strong><small>{reading.place.timeZone}</small></div>
      </div>
      <ElementPresenceGraph reading={reading} compact={!visual} />
      {explanation && <ChartExplanation preview={explanation} />}
      <details className="calculation-details">
        <summary>查看计算规则与限制</summary>
        <dl><div><dt>年界</dt><dd>立春</dd></div><div><dt>月界</dt><dd>节气中的「节」</dd></div><div><dt>日界</dt><dd>当地民用时间 00:00</dd></div><div><dt>真太阳时</dt><dd>本阶段未校正</dd></div></dl>
        {reading.caveats.map((caveat) => <p key={caveat}>{caveat}</p>)}
      </details>
    </section>
  );
}

function EvidenceChip({ system, role }: { system: SystemId; role: "primary" | "supporting" | "context" }) {
  return <span className={`evidence-chip evidence-chip--${role}`} aria-label={`${systemLabels[system].full}，${role === "primary" ? "主要依据" : role === "supporting" ? "支持依据" : "背景信息"}`}><i aria-hidden="true" />{systemLabels[system].short}</span>;
}

function EvidenceList({ evidence, experience }: { evidence: EvidenceRef[]; experience: CalculatedExperience }) {
  const resolved = resolveCalculatedEvidence(experience, evidence);
  return (
    <div className="evidence-list">
      {resolved.map(({ fact, contribution, role }) => (
        <details key={fact.id} className="evidence-row">
          <summary>
            <span className={`system-seal system-seal--${fact.system}`} aria-hidden="true">{systemLabels[fact.system].short.slice(0, 1)}</span>
            <span><small>{systemLabels[fact.system].full}</small><strong>{fact.label}</strong></span>
            <span className="evidence-role">{role === "primary" ? "主要" : role === "supporting" ? "支持" : "背景"}</span>
          </summary>
          <div className="evidence-row__body">
            <div><span>命盘事实</span><p>{fact.rawLabel}</p></div>
            <div><span>传统解释</span><p>{fact.traditionalInterpretation}</p></div>
            <div><span>综合作用</span><p>{contribution}</p></div>
            {fact.limitations && <p className="inline-notice">计算边界：{fact.limitations}</p>}
          </div>
        </details>
      ))}
    </div>
  );
}

const ziweiGridAreas = ["4 / 1", "4 / 2", "4 / 3", "4 / 4", "3 / 4", "2 / 4", "1 / 4", "1 / 3", "1 / 2", "1 / 1", "2 / 1", "3 / 1"];

function ZiweiChartCard({ reading, explanation }: { reading: ZiweiReading; explanation: ChartExplanationPreview }) {
  if (reading.status === "unavailable") {
    return <section className="system-chart system-chart--unavailable"><p className="eyebrow">ZI WEI DOU SHU · 紫微斗数</p><h2>出生时间未知，十二宫不推算</h2><p>{reading.caveats[0]}</p><ChartExplanation preview={explanation} /></section>;
  }
  return (
    <section className="system-chart ziwei-chart">
      <header className="system-chart__header"><div><p className="eyebrow">ZI WEI DOU SHU · 紫微斗数</p><h2>十二宫星盘</h2><p>宫位、主星与四化来自本地确定性排盘。点击或放大页面可阅读全部细节。</p></div><span className="calculation-label">已排盘 · v{reading.engine.version}</span></header>
      <div className="ziwei-board" role="img" aria-label={`紫微十二宫，命宫在${reading.soulPalaceBranch}，身宫在${reading.bodyPalaceBranch}`}>
        {reading.palaces.map((palace, index) => <article key={palace.id} style={{ gridArea: ziweiGridAreas[index] }} className={palace.name === "命宫" ? "is-soul" : palace.isBodyPalace ? "is-body" : ""}><header><b>{palace.name}</b><span>{palace.heavenlyStem}{palace.earthlyBranch}</span></header><p>{palace.majorStars.map((star) => <span key={star.name}>{star.name}{star.transformation ? <i>化{star.transformation}</i> : null}</span>)}</p>{!palace.majorStars.length && <small>无十四主星</small>}{palace.isBodyPalace && <em>身宫</em>}</article>)}
        <div className="ziwei-board__center"><small>命宫 · {reading.soulPalaceBranch}</small><strong>{reading.soulStar}</strong><span>{reading.fiveElementsClass}</span><p>身主 {reading.bodyStar} · 身宫 {reading.bodyPalaceBranch}</p></div>
      </div>
      <ChartExplanation preview={explanation} />
      <details className="calculation-details"><summary>查看紫微计算规则与限制</summary><dl><div><dt>引擎</dt><dd>{reading.engine.id} {reading.engine.version}</dd></div><div><dt>流派配置</dt><dd>{reading.engine.school}</dd></div><div><dt>闰月</dt><dd>前后半月调整开启</dd></div><div><dt>大限方向</dt><dd>{reading.conventions.directionRule === "traditional-gender" ? "使用所选传统输入" : "未应用"}</dd></div></dl>{reading.caveats.map((caveat) => <p key={caveat}>{caveat}</p>)}</details>
    </section>
  );
}

const westernGlyphs: Record<string, string> = { Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂", Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇" };
const westernSigns = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

function wheelPoint(longitude: number, radius: number) {
  const angle = (longitude - 90) * Math.PI / 180;
  return {
    x: Number((160 + Math.cos(angle) * radius).toFixed(4)),
    y: Number((160 + Math.sin(angle) * radius).toFixed(4)),
  };
}

function WesternChartCard({ reading, explanation }: { reading: WesternReading; explanation: ChartExplanationPreview }) {
  const placements = reading.placements.slice(0, 10);
  const placementByBody = new Map(placements.map((placement) => [placement.body, placement]));
  return (
    <section className="system-chart western-chart">
      <header className="system-chart__header"><div><p className="eyebrow">WESTERN NATAL · 西方占星</p><h2>本命星盘</h2><p>行星黄经、相位与{reading.completeness === "timed-chart" ? "整宫制宫位" : "当日星座位置"}来自本地天文计算。</p></div><span className="calculation-label">已计算 · v{reading.engine.version}</span></header>
      <div className="western-chart__layout">
        <svg className="western-wheel" viewBox="0 0 320 320" role="img" aria-label={`西方本命星盘，共 ${placements.length} 个行星位置`}>
          <circle cx="160" cy="160" r="148" /><circle cx="160" cy="160" r="114" /><circle cx="160" cy="160" r="76" />
          {Array.from({ length: 12 }, (_, index) => { const inner = wheelPoint(index * 30, 114); const outer = wheelPoint(index * 30, 148); const label = wheelPoint(index * 30 + 15, 132); return <g key={westernSigns[index]}><line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} /><text x={label.x} y={label.y}>{westernSigns[index]}</text></g>; })}
          {reading.aspects.slice(0, 10).map((aspect) => { const first = placementByBody.get(aspect.bodyA); const second = placementByBody.get(aspect.bodyB); if (!first || !second) return null; const a = wheelPoint(first.longitude, 72); const b = wheelPoint(second.longitude, 72); return <line key={aspect.id} className={`aspect-line aspect-line--${aspect.type}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />; })}
          {placements.map((placement) => { const point = wheelPoint(placement.longitude, 94); return <g key={placement.id} className="planet-node"><circle cx={point.x} cy={point.y} r="12" /><text x={point.x} y={point.y + 1}>{westernGlyphs[placement.body] ?? placement.body.slice(0, 1)}</text></g>; })}
          <text className="western-wheel__center" x="160" y="155">{reading.angles.ascendant ? `ASC ${reading.angles.ascendant.sign}` : "TIME UNKNOWN"}</text><text className="western-wheel__sub" x="160" y="174">TROPICAL · WHOLE SIGN</text>
        </svg>
        <div className="western-placements">{placements.map((placement) => <div key={placement.id}><span>{westernGlyphs[placement.body] ?? "•"}</span><b>{placement.body}</b><p>{placement.sign} {placement.degree}°{String(placement.minute).padStart(2, "0")}′{placement.house ? ` · H${placement.house}` : ""}</p>{placement.retrograde && <small>R</small>}</div>)}</div>
      </div>
      <ChartExplanation preview={explanation} />
      <details className="calculation-details"><summary>查看西占计算规则与限制</summary><dl><div><dt>黄道</dt><dd>热带黄道</dd></div><div><dt>宫制</dt><dd>整宫制</dd></div><div><dt>时区</dt><dd>IANA 历史偏移 · UTC {reading.utcOffsetHours >= 0 ? "+" : ""}{reading.utcOffsetHours}</dd></div><div><dt>出生时刻</dt><dd>{reading.utcIso}</dd></div></dl>{reading.caveats.map((caveat) => <p key={caveat}>{caveat}</p>)}</details>
    </section>
  );
}

function ProductVisual({ product, compact = false }: { product: Product; compact?: boolean }) {
  const style = { "--product-a": product.palette[0], "--product-b": product.palette[1], "--product-c": product.palette[2] } as React.CSSProperties;
  return (
    <div className={`product-visual ${compact ? "product-visual--compact" : ""}`} style={style}>
      <Image src={product.image.src} alt={product.image.alt} width={1024} height={1024} sizes={compact ? "(max-width: 479px) 100vw, 50vw" : "(max-width: 767px) 100vw, 50vw"} loading={compact ? "lazy" : "eager"} unoptimized />
      <span className="product-visual__veil" aria-hidden="true" />
      <small>SYMBOLIC OBJECT · DEMO</small>
    </div>
  );
}

function ErrorState({ route, title, message, href, action }: { route: RouteName; title: string; message: string; href: string; action: string }) {
  return (
    <PageShell route={route} title="未找到" eyebrow="ROUTE ERROR" backHref={href}>
      <div className="page state-page">
        <div className="state-mark" aria-hidden="true">?</div>
        <p className="eyebrow">THIS PATH IS MISSING</p>
        <h1>{title}</h1>
        <p>{message}</p>
        <Link href={href} className="button button--primary">{action} <span aria-hidden="true">→</span></Link>
      </div>
    </PageShell>
  );
}

function LandingPage() {
  const [hasProfile, setHasProfile] = useState(false);
  const [latestReflection, setLatestReflection] = useState<SavedReflection | null>(null);
  useEffect(() => {
    queueMicrotask(() => {
      setHasProfile(Boolean(readBirthProfile()));
      setLatestReflection(readReflections()[0] ?? null);
    });
  }, []);
  const shopPreview = [products.find((product) => product.category === "bracelet"), products.find((product) => product.featured), products.find((product) => product.category === "chart-art")].filter((product): product is Product => Boolean(product));
  return (
    <PageShell route="landing">
      <div className="landing">
        <header className="landing__header">
          <Link href="/" className="wordmark" aria-label="Life Map 首页"><BrandLockup tagline /></Link>
          <nav className="landing__nav" aria-label="首页导航"><a href="#intentions">从问题开始</a><Link href="/objects">象征物商城</Link><a href="#principles">方法与依据</a></nav>
          <Link href={hasProfile ? "/today" : "/onboarding"} className="quiet-button quiet-button--active">{hasProfile ? "继续我的地图" : "开始生成"}</Link>
        </header>
        <div className="landing__geometry" aria-hidden="true"><span className="orbit" /><span className="confluence-lens" /><span className="broken-line" /></div>
        <section className="landing__hero">
          <div className="landing__brand-intro"><BrandMark large /><div><p className="eyebrow">EASTERN WISDOM · WESTERN STARS · SHARED GROWTH</p><span>东方命理 × 西方占星 × 自我成长 × 同路社区</span></div></div>
          <h1>观星读象，<br /><em>照见更好的自己</em></h1>
          <p className="landing__lead">融合东方命理与西方占星，把古老的观察变成理解自己的语言、走向更好自己的行动，也为与同路人彼此照见、共同成长留出空间。</p>
          <div className="landing__actions">
            <Link href={hasProfile ? "/today" : "/onboarding"} className="button button--primary">{hasProfile ? "继续上次的地图" : "免费生成三体系快照"} <span aria-hidden="true">→</span></Link>
            <a href="#principles" className="button button--tertiary">了解我们如何解释</a>
          </div>
          <p className="landing__proof">约 2 分钟 · 无需注册 · 每条重要结论都能查看依据</p>
          <p className="disclosure">基于传统解释体系的个人反思体验，不是科学预测、专业建议或结果保证。</p>
        </section>
        {latestReflection && <section className="return-card"><div><p className="eyebrow">CONTINUE YOUR THREAD · 继续上次的问题</p><h2>{latestReflection.question}</h2><p>你为这件事保存了一个行动，可以回到地图继续观察和复盘。</p></div><Link href="/today" className="button button--secondary">继续查看</Link></section>}
        <section id="intentions" className="landing__intentions" aria-labelledby="landing-intentions-title">
          <div><p className="eyebrow">START WITH WHAT MATTERS</p><h2 id="landing-intentions-title">你现在最想看清什么？</h2></div>
          <div className="intent-grid">{focusOptions.map((option) => <Link href={`/onboarding?intent=${option.id}`} key={option.id}><span>{option.label}</span><h3>{option.title}</h3><p>{option.description}</p><b aria-hidden="true">→</b></Link>)}</div>
        </section>
        <section className="landing-shop" aria-labelledby="landing-shop-title">
          <header><div><p className="eyebrow">LIFE MAP OBJECTS · 象征物商城</p><h2 id="landing-shop-title">让一个主题，在日常里有具体的位置</h2><p>天然石、五行手链与个人命盘艺术。每件物品都清楚说明材质、传统关联与普通用法，不承诺改变运气或现实结果。</p></div><Link href="/objects" className="button button--secondary">进入商城 <span aria-hidden="true">→</span></Link></header>
          <div className="landing-shop__grid">{shopPreview.map((product) => <Link href={`/objects/${product.slug}`} key={product.id} className="landing-shop__card"><ProductVisual product={product} compact /><div><small>{product.category === "stone" ? "天然石" : product.category === "bracelet" ? "五行手链" : "命盘艺术"}</small><h3>{product.nameZh}</h3><p>{product.nameEn}</p><strong>{product.price}</strong></div></Link>)}</div>
          <p className="landing-shop__note">商城可以直接浏览；个性化推荐仍只会在你先看到洞察与免费练习之后出现。</p>
        </section>
        <section id="principles" className="landing__principles" aria-label="产品原则">
          <article><span>01</span><h2>先计算</h2><p>版本化引擎先生成八字、紫微与西占事实，不让语言模型代替排盘。</p></article>
          <article><span>02</span><h2>再解释</h2><p>每条重要洞察都能展开查看事实、传统解释、综合作用与限制。</p></article>
          <article><span>03</span><h2>最后行动</h2><p>产品不替你决定，而是帮助你保存一个现实中可以验证的小步骤。</p></article>
          <article><span>04</span><h2>彼此照见</h2><p>同路社区仍在生长；未来会围绕真实问题、行动与复盘连接经验，不制造权威或焦虑。</p></article>
        </section>
      </div>
    </PageShell>
  );
}

const onboardingSteps = [
  { id: "focus", number: "01", title: "你现在最想看清什么？", helper: "先从现实问题开始，结果会优先打开与你最相关的入口。" },
  { id: "birth", number: "02", title: "你的出生资料", helper: "称呼可选；日期必填，时间不知道也可以继续。" },
  { id: "location", number: "03", title: "你出生在哪里？", helper: "确认城市和历史时区，三套计算才会使用同一时刻。" },
  { id: "review", number: "04", title: "确认后生成地图", helper: "计算事实、传统解释和规则综合会保持清楚分层。" },
];

const defaultOnboardingDraft: OnboardingDraft = {
  focus: "relationships",
  name: "",
  date: "",
  time: "",
  unknownTime: false,
  locationQuery: "",
  selectedPlace: null,
  gender: "prefer-not-to-say",
  consent: false,
};

function BirthplaceSearch({ query, selectedPlace, onQueryChange, onSelect }: { query: string; selectedPlace: BirthPlace | null; onQueryChange: (value: string) => void; onSelect: (place: BirthPlace | null) => void }) {
  const [results, setResults] = useState<BirthPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (query.trim().length < 2) {
      setMessage("请输入至少两个字，并尽量加上国家或地区。");
      return;
    }
    setSearching(true);
    setMessage("");
    setResults([]);
    try {
      const places = await searchBirthPlaces(query, { language: navigator.language });
      setResults(places);
      if (!places.length) setMessage("没有找到匹配地点。请尝试“城市, 国家”的写法。");
    } catch {
      setMessage("地点服务暂时没有响应，请稍后重试。你已填写的其他资料不会丢失。");
    } finally {
      setSearching(false);
    }
  };

  const updateQuery = (value: string) => {
    onQueryChange(value);
    if (selectedPlace && value !== selectedPlace.label) onSelect(null);
  };

  const choose = (place: BirthPlace) => {
    onSelect(place);
    onQueryChange(place.label);
    setResults([]);
    setMessage("");
  };

  return (
    <div className="location-search">
      <form onSubmit={submit} className="location-search__form">
        <label className="field"><span>城市与国家</span><input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="例如 成都, 中国 / Paris, France" autoComplete="off" /></label>
        <button className="button button--secondary" type="submit" disabled={searching}>{searching ? "搜索中…" : "搜索地点"}</button>
      </form>
      <p className="location-search__privacy">只有这次地点关键词会发送至 <a href="https://open-meteo.com/en/docs/geocoding-api" target="_blank" rel="noreferrer">Open-Meteo 地点服务</a>；姓名、出生日期和时间不会发送。</p>
      {message && <p className="inline-notice" role="status">{message}</p>}
      {results.length > 0 && <ul className="location-results" aria-label="地点搜索结果">{results.map((place) => <li key={place.id}><button type="button" onClick={() => choose(place)}><span><strong>{place.city}</strong><small>{[place.admin1, place.country].filter(Boolean).join(" · ")}</small></span><span><b>{place.timeZone}</b><small>{place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}</small></span></button></li>)}</ul>}
      {selectedPlace && <div className="selected-location" aria-live="polite"><span aria-hidden="true">✓</span><div><small>已选择真实地点</small><strong>{selectedPlace.label}</strong><p>{selectedPlace.timeZone} · {selectedPlace.latitude.toFixed(4)}, {selectedPlace.longitude.toFixed(4)}</p></div></div>}
    </div>
  );
}

function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingDraft>(defaultOnboardingDraft);
  const [error, setError] = useState("");
  const current = onboardingSteps[step];

  useEffect(() => {
    const intent = new URLSearchParams(window.location.search).get("intent");
    const routedFocus = focusOptions.some((item) => item.id === intent) ? intent as ReflectionFocus : null;
    queueMicrotask(() => {
      const draft = readOnboardingDraft(defaultOnboardingDraft);
      setForm(routedFocus ? { ...draft, focus: routedFocus } : draft);
    });
  }, []);

  useEffect(() => { writeOnboardingDraft(form); }, [form]);

  const valid = useMemo(() => {
    if (current.id === "focus") return Boolean(form.focus);
    if (current.id === "birth") return Boolean(form.date) && (form.unknownTime || Boolean(form.time));
    if (current.id === "location") return Boolean(form.selectedPlace);
    if (current.id === "review") return form.consent;
    return true;
  }, [current.id, form]);

  const next = () => {
    if (!valid) return;
    if (step === onboardingSteps.length - 1) {
      if (!form.selectedPlace) {
        setError("请先搜索并选择一个真实出生地点。");
        return;
      }
      try {
        const profile = {
          displayName: form.name.trim() || "你",
          birthDate: form.date,
          birthTime: form.unknownTime ? null : form.time,
          timeAccuracy: form.unknownTime ? "unknown" as const : "known" as const,
          birthPlace: form.selectedPlace,
          traditionalGender: form.gender,
        };
        const bazi = calculateBazi(profile);
        buildCalculatedExperience(bazi, localDateString());
        writeBirthProfile(profile);
        sessionStorage.setItem("life-map-focus", form.focus);
        sessionStorage.setItem("life-map-complete", "true");
        navigate("/generating");
      } catch {
        setError("这组出生资料暂时无法计算，请返回检查日期、时间和地点。");
      }
    } else setStep((value) => value + 1);
  };

  return (
    <PageShell route="onboarding">
      <div className="onboarding">
        <header className="onboarding__header"><Link href="/" className="wordmark" aria-label="Life Map 首页"><BrandLockup tagline /></Link><span>创建你的地图</span></header>
        <div className="progress-track" aria-label={`第 ${step + 1} 步，共 ${onboardingSteps.length} 步`}><i style={{ width: `${((step + 1) / onboardingSteps.length) * 100}%` }} /></div>
        <section className="onboarding__panel">
          <div className="step-count"><span>{current.number}</span><small>OF 04</small></div>
          <p className="eyebrow">BIRTH PROFILE · 出生档案</p>
          <h1>{current.title}</h1>
          <p className="step-helper">{current.helper}</p>
          <div className="step-fields">
            {current.id === "focus" && <div className="focus-choice" role="radiogroup" aria-label="当前最想查看的主题">{focusOptions.map((option) => <button key={option.id} type="button" role="radio" aria-checked={form.focus === option.id} className={form.focus === option.id ? "is-selected" : ""} onClick={() => setForm({ ...form, focus: option.id })}><span>{option.label}</span><div><strong>{option.title}</strong><small>{option.description}</small></div><b aria-hidden="true">{form.focus === option.id ? "✓" : "→"}</b></button>)}</div>}
            {current.id === "birth" && <div className="birth-fields">
              <label className="field"><span>怎么称呼你？（选填）</span><input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="稍后也可以填写" /></label>
              <label className="field"><span>出生日期</span><input type="date" min="1900-01-01" max="2100-12-31" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /><small>当前引擎支持 1900—2100 年的公历输入。</small></label>
              <label className="field"><span>当地时间</span><input type="time" value={form.time} disabled={form.unknownTime} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label>
              <label className="check-field"><input type="checkbox" checked={form.unknownTime} onChange={(event) => setForm({ ...form, unknownTime: event.target.checked })} /><span><strong>我不知道准确时间</strong><small>会省略八字时柱与紫微十二宫；西占只显示当日行星星座，不推算上升与宫位。</small></span></label>
            </div>}
            {current.id === "location" && <BirthplaceSearch query={form.locationQuery} selectedPlace={form.selectedPlace} onQueryChange={(locationQuery) => setForm((value) => ({ ...value, locationQuery }))} onSelect={(selectedPlace) => setForm((value) => ({ ...value, selectedPlace }))} />}
            {current.id === "review" && <div className="review-card">
              <dl><div><dt>先看主题</dt><dd>{focusOption(form.focus).label}</dd></div><div><dt>称呼</dt><dd>{form.name.trim() || "稍后填写"}</dd></div><div><dt>出生日期</dt><dd>{form.date}</dd></div><div><dt>出生时间</dt><dd>{form.unknownTime ? "未知（不计算时柱）" : form.time}</dd></div><div><dt>出生地点</dt><dd>{form.selectedPlace?.label ?? "尚未选择"}</dd></div><div><dt>时区</dt><dd>{form.selectedPlace?.timeZone ?? "—"}</dd></div></dl>
              <details className="advanced-input"><summary>传统规则输入（选填）</summary><p>部分紫微流派使用传统男／女输入决定大限顺逆。若不选择，我们会省略这一层，不推测身份。</p><fieldset className="choice-field"><legend className="sr-only">传统规则输入</legend>{[["female", "女性"], ["male", "男性"], ["nonbinary", "非二元"], ["prefer-not-to-say", "不愿说明"]].map(([value, label]) => <label key={value}><input type="radio" name="gender" value={value} checked={form.gender === value} onChange={(event) => setForm({ ...form, gender: event.target.value as OnboardingDraft["gender"] })} /><span>{label}</span></label>)}</fieldset></details>
              <label className="check-field"><input type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} /><span><strong>我理解当前的计算范围</strong><small>命盘与时运事实由版本化引擎计算；综合文字来自规则模板，不是实时 AI、科学预测或结果保证。</small></span></label>
            </div>}
          </div>
          {error && <p className="inline-notice" role="alert">{error}</p>}
          <div className="onboarding__actions"><button className="button button--secondary" onClick={() => step === 0 ? navigate("/") : setStep((value) => value - 1)}>返回</button><button className="button button--primary" disabled={!valid} onClick={next}>{step === onboardingSteps.length - 1 ? "生成我的人生地图" : "继续"} <span aria-hidden="true">→</span></button></div>
        </section>
        <p className="onboarding__privacy">你的出生信息是敏感数据。本次计算只保存在当前浏览器会话中。</p>
      </div>
    </PageShell>
  );
}

const generationStages = ["正在验证出生资料与历史时区", "正在按节气排列四柱", "正在展开紫微十二宫", "正在定位出生时的行星与宫位", "正在连接可追溯的综合证据"];

function GeneratingPage() {
  const { reading, experience, calculationError } = useActiveExperience();
  const [active, setActive] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const interval = window.setInterval(() => setActive((value) => {
      if (value >= generationStages.length - 1) { window.clearInterval(interval); setDone(true); return value; }
      return value + 1;
    }), reduced ? 180 : 620);
    return () => window.clearInterval(interval);
  }, []);
  if (!experience) return <ErrorState route="generating" title="这组资料暂时无法完整排盘" message={calculationError ?? "请返回检查出生日期、时间和地点。"} href="/onboarding" action="返回检查资料" />;
  return (
    <PageShell route="generating">
      <div className="generation" aria-live="polite">
        <div className="generation__art" aria-hidden="true"><span className="generation-orbit" /><span className="generation-grid" /><BrandMark large /></div>
        <p className="eyebrow">CALIBRATING YOUR MAP</p>
        <h1>{done ? "你的人生地图已生成" : generationStages[active]}</h1>
        <p>{done ? "八字、紫微、西占与当前时运已经完成本地计算；解释层仍与计算事实清楚分开。" : "每个体系先生成可复算事实，再由规则层寻找共识与张力。"}</p>
        <ol className="generation__stages">
          {generationStages.map((stage, index) => <li key={stage} className={index < active || done ? "is-complete" : index === active ? "is-active" : ""}><span>{index < active || done ? "✓" : String(index + 1).padStart(2, "0")}</span>{stage}</li>)}
        </ol>
        {done && <div className="generation__result" aria-label="命盘计算结果"><span><small>八字</small><b>{reading.pillars.day.ganZhi}日</b></span><span><small>紫微</small><b>{experience.ziwei.status === "calculated" ? `${experience.ziwei.soulPalaceBranch}宫` : "时间未知"}</b></span><span><small>太阳</small><b>{experience.western.placements.find((item) => item.body === "Sun")?.sign ?? "—"}</b></span><span><small>综合</small><b>{experience.todayInsight.title}</b></span></div>}
        {done ? <button className="button button--primary" onClick={() => navigate("/today")}>进入今日地图 <span aria-hidden="true">→</span></button> : <button className="text-button" onClick={() => { setActive(generationStages.length - 1); setDone(true); }}>跳过等待动画</button>}
        <small className="calculation-label">三体系已计算 · 规则综合 v{experience.engine.version}</small>
      </div>
    </PageShell>
  );
}

function ReportOffer({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`report-offer ${compact ? "report-offer--compact" : ""}`}>
      <div className="report-offer__folio" aria-hidden="true"><span>1·10</span><i /><i /><i /></div>
      <div>
        <p className="eyebrow">PRIVATE PDF · 两种一次性报告</p>
        <h2>今天的一页，或十页完整地图</h2>
        <p>Daily Report 聚焦今天；Detailed Report 整理八字、紫微、西占、当前时运、证据综合与七日练习。两种报告都先预览、再一次性购买。</p>
        <div className="report-offer__meta"><strong>DAILY · $1.99</strong><strong>10 PAGES · $19.99</strong><span>本地生成</span></div>
        <Link href="/report" className="button button--primary">比较两种报告 <span aria-hidden="true">→</span></Link>
      </div>
    </section>
  );
}

function ReflectionThreadCard({ reflection }: { reflection: SavedReflection }) {
  return (
    <section className="reflection-thread">
      <div><p className="eyebrow">CONTINUE YOUR THREAD · 继续观察</p><h2>{reflection.question}</h2><p>{reflection.action ? `你保存的下一步：${reflection.action}` : "你已经保存了这个问题，可以继续补充一个现实中可验证的动作。"}</p></div>
      <div className="reflection-thread__meta"><span>{focusOption(reflection.focus).label}</span>{reflection.reviewDate && <span>复盘 · {reflection.reviewDate}</span>}<Link href="/me#reflection-history">查看记录 →</Link></div>
    </section>
  );
}

function TodayPage() {
  const { reading, experience, calculationError } = useActiveExperience();
  const { items: reflections } = useSavedReflections();
  const preferredFocus = useSessionFocus();
  if (!experience) return <ErrorState route="today" title="今天的地图无法完成计算" message={calculationError ?? "请检查出生资料。"} href="/onboarding" action="检查出生资料" />;
  const today = experience.todayInsight;
  const featured = products.find((product) => product.id === recommendation.productId) ?? products[0];
  const timing = experience.timing;
  const latestReflection = reflections[0] ?? null;
  const preferred = focusOption(preferredFocus);
  const greeting = reading.profile.displayName === "你" ? "你好" : `你好，${reading.profile.displayName}`;
  return (
    <PageShell route="today">
      <div className="page today-page">
        <header className="today-greeting"><div><span>YOUR INNER WEATHER · 此刻的内在天气</span><h1>{greeting}</h1></div><div className="day-seal" aria-label={`日主 ${reading.dayMaster.stem}，${reading.dayMaster.element}`}><span>{reading.dayMaster.stem}</span><small>{elementEnglish[reading.dayMaster.element]}</small></div></header>
        <PhaseScopeNotice experience={experience} />
        <section className="today-hero">
          <div className="today-hero__motif" aria-hidden="true"><i /><i /><i /></div>
          <p className="eyebrow">{today.eyebrow} · TODAY&apos;S THEME</p>
          <h2>{today.title}</h2>
          <h3>{today.subtitle}</h3>
          <p>{today.summary}</p>
          <div className="today-action"><span>今天可以先做</span><strong>{timing.practice}</strong></div>
          <div className="evidence-chips">{today.evidence.map((item) => <EvidenceChip key={item.factId} system={item.system} role={item.role} />)}</div>
          <Link href={`/insights/${today.id}`} className="button button--ink">为什么？查看依据 <span aria-hidden="true">↗</span></Link>
        </section>
        <section className="section-block">
          <SectionHeader eyebrow="REFLECT" title={latestReflection ? "继续，或开始一个新问题" : "从一个现实问题开始"} />
          <div className="quick-grid">
            <Link href={`/ask?focus=${preferredFocus}`} className="quick-card"><span className="quick-card__motif quick-card__motif--ask" aria-hidden="true" /><small>DECISION SESSION</small><h3>梳理{preferred.label}问题</h3><p>{preferred.description}</p><b aria-hidden="true">→</b></Link>
            <Link href="/iching" className="quick-card quick-card--cinnabar"><span className="quick-card__motif quick-card__motif--iching" aria-hidden="true" /><small>I CHING</small><h3>问一卦</h3><p>为此刻的具体问题留出空间</p><b aria-hidden="true">→</b></Link>
          </div>
        </section>
        {latestReflection && <ReflectionThreadCard reflection={latestReflection} />}
        <section className="section-block"><SectionHeader eyebrow="YOUR PATTERNS" title="生命领域" action="查看全部" href="/life-map" /><div className="domain-grid domain-grid--today">{experience.domains.slice(0, 4).map((domain, index) => <Link href={`/life-map/${domain.id}`} className="domain-card" key={domain.id}><span className="domain-card__index">0{index + 1}</span><small>{domain.nameEn}</small><h3>{domain.nameZh}</h3><p>{domain.pattern}</p><span className={`state state--${domain.state}`}>{domain.state === "active" ? "多源交集" : domain.state === "steady" ? "独立线索" : "保留张力"}</span></Link>)}</div></section>
        <section className="timing-card">
          <div><p className="eyebrow">CURRENT SEASON · 当前阶段</p><h2>{timing.title}</h2><p>{timing.summary}</p><Link href="/timing" className="text-link">展开时间线 <span aria-hidden="true">→</span></Link></div>
          <div className="mini-timeline" aria-label={`当前阶段从 ${timing.start} 至 ${timing.end}`}><span>{timing.start}</span><div style={{ "--timeline-position": `${timing.nowPosition * 100}%` } as React.CSSProperties}><i style={{ left: `${timing.nowPosition * 100}%` }}><b>现在</b></i></div><span>{timing.end}</span></div>
        </section>
        <section className="symbol-section">
          <ElementPresenceGraph reading={reading} compact />
          <div><p className="eyebrow">RULE-BASED REFLECTION · 规则综合</p><h2>{today.title}</h2><p>左侧是确定性四柱结构；综合主题只引用上方可展开的计算证据，不从五行数量直接推导吉凶。</p><div className="practice"><span>继续写一行</span><p>{today.reflectionPrompt}</p></div></div>
        </section>
        <ReportOffer compact />
        {latestReflection?.action && <section className="section-block"><SectionHeader eyebrow="OPTIONAL OBJECT" title="在行动之后，才考虑一个象征提醒" /><article className="recommendation-card"><ProductVisual product={featured} /><div className="recommendation-card__content"><div><span className="pill">SYMBOLIC · OPTIONAL</span><h2>{featured.nameEn}</h2><h3>{featured.nameZh}</h3><p>你已经先保存了一个不需要购买的行动。这件物品只作为可选提醒；它不改变命盘、时运或现实结果。</p></div><div className="recommendation-card__footer"><span>{featured.price}</span><Link href={`/objects/${featured.slug}`} className="button button--secondary">查看象征含义</Link></div></div></article></section>}
      </div>
    </PageShell>
  );
}

function InsightPage({ id }: { id?: string }) {
  const { experience, calculationError } = useActiveExperience();
  if (!experience) return <ErrorState route="insight" title="洞察证据无法完成计算" message={calculationError ?? "请检查出生资料。"} href="/onboarding" action="检查出生资料" />;
  const insight = id === experience.todayInsight.id || !id ? experience.todayInsight : Object.values(experience.domainInsights).find((item) => item.id === id);
  if (!insight) return <ErrorState route="insight" title="没有找到这个洞察" message="这个计算洞察链接不存在，或已经由新版规则替换。" href="/today" action="回到今日" />;
  return (
    <PageShell route="insight" title="为什么？" eyebrow="INSIGHT EVIDENCE" backHref="/today">
      <div className="page reading-page">
        <header className="reading-hero"><p className="eyebrow">{insight.eyebrow} · {insight.kind === "consensus" ? "MULTI-SYSTEM CONSENSUS" : "TENSION"}</p><h1>{insight.title}</h1><h2>{insight.subtitle}</h2><p>{insight.summary}</p><div className="evidence-chips">{insight.evidence.map((item) => <EvidenceChip key={item.factId} system={item.system} role={item.role} />)}</div></header>
        <section className="reading-section"><span className="section-number">01</span><SectionHeader title="综合解释" eyebrow="SYNTHESIS" /><p className="reading-copy">{insight.kind === "consensus" ? "这一主题在两个以上体系中出现，但每个体系提供了不同角度。共同点不是结果预测，而是此刻值得观察的方向。" : "不同体系在这里保留了有意义的张力；我们不会把它们平均成一个分数。"}</p></section>
        <section className="reading-section"><span className="section-number">02</span><SectionHeader title="依据来自哪里" eyebrow="EVIDENCE" /><EvidenceList evidence={insight.evidence} experience={experience} /></section>
        {insight.tensionNote && <section className="tension-card"><p className="eyebrow">TENSION · 张力</p><h2>不需要急着消除的矛盾</h2><p>{insight.tensionNote}</p></section>}
        <section className="reflection-card"><span aria-hidden="true">问</span><div><p className="eyebrow">REFLECTION PROMPT</p><h2>{insight.reflectionPrompt}</h2><Link href={`/ask?prompt=${encodeURIComponent(insight.reflectionPrompt)}`} className="button button--primary">和命盘继续聊 <span>→</span></Link></div></section>
        <p className="disclosure disclosure--center">命盘事实来自版本化本地引擎；综合文字来自规则模板，用于反思，不是实时 AI 或科学预测。</p>
      </div>
    </PageShell>
  );
}

function LifeMapPage() {
  const { reading, experience, calculationError } = useActiveExperience();
  if (!experience) return <ErrorState route="life-map" title="命盘无法完成计算" message={calculationError ?? "请检查出生资料。"} href="/onboarding" action="检查出生资料" />;
  const identity = experience.domainInsights.identity;
  const chartExplanations = {
    bazi: getChartExplanationPreview(experience, "bazi"),
    ziwei: getChartExplanationPreview(experience, "ziwei"),
    astrology: getChartExplanationPreview(experience, "astrology"),
  };
  return (
    <PageShell route="life-map">
      <div className="page life-map-page">
        <PhaseScopeNotice experience={experience} />
        <header className="map-hero">
          <div><p className="eyebrow">YOUR NATAL BLUEPRINT · 你的底图</p><h1>{identity.title.split(" · ")[0]}<br /><i>×</i> {identity.title.split(" · ")[1] ?? "观察"}</h1><p>{identity.summary}</p><div className="evidence-chips">{identity.evidence.map((item) => <EvidenceChip key={item.factId} system={item.system} role={item.role} />)}</div></div>
          <figure className="map-diagram">
            <Image
              className="map-diagram__image"
              src="/images/brand/life-map-confluence.webp"
              alt="东方四柱与西方星盘交织的 Life Map 品牌抽象图"
              width={768}
              height={768}
              preload
              unoptimized
            />
            <span className="map-diagram__core" aria-hidden="true"><BrandMark large /><b>命</b></span>
            <figcaption>BRAND SYMBOL · 品牌意象，非实际排盘</figcaption>
          </figure>
        </header>
        <div className="map-note"><span>如何阅读</span><p>这些领域不是命运评分，而是理解长期模式的入口。当前活跃表示本期内容的主题强调，不代表好或坏。</p></div>
        <section className="section-block"><SectionHeader eyebrow="EIGHT DOMAINS" title="先从生活领域进入" /><div className="domain-grid domain-grid--all">{experience.domains.map((domain, index) => <Link href={`/life-map/${domain.id}`} className="domain-card domain-card--wide" key={domain.id}><span className="domain-card__index">{String(index + 1).padStart(2, "0")}</span><div><small>{domain.nameEn}</small><h3>{domain.nameZh}</h3></div><p>{domain.pattern}</p><span className={`state state--${domain.state}`}>{domain.state === "active" ? "多源交集" : domain.state === "steady" ? "独立线索" : "保留张力"}</span><b aria-hidden="true">↗</b></Link>)}</div></section>
        <section className="chart-lab">
          <SectionHeader eyebrow="PROFESSIONAL VIEW · 专业视图" title="需要时，再展开完整命盘" />
          <p className="chart-lab__intro">生命领域负责回答“这和我有什么关系”；完整盘负责展示“底层事实是什么”。所有计算细节保持免费可查。</p>
          <details className="chart-system-disclosure"><summary><span>01</span><div><small>BAZI · 八字</small><strong>四柱与表层五行</strong></div><b>展开命盘</b></summary><BaziChartCard reading={reading} explanation={chartExplanations.bazi} id="bazi-chart" visual /></details>
          <details className="chart-system-disclosure"><summary><span>02</span><div><small>ZI WEI DOU SHU · 紫微斗数</small><strong>十二宫与主星</strong></div><b>展开命盘</b></summary><ZiweiChartCard reading={experience.ziwei} explanation={chartExplanations.ziwei} /></details>
          <details className="chart-system-disclosure"><summary><span>03</span><div><small>WESTERN NATAL · 西方占星</small><strong>行星、宫位与相位</strong></div><b>展开命盘</b></summary><WesternChartCard reading={experience.western} explanation={chartExplanations.astrology} /></details>
        </section>
      </div>
    </PageShell>
  );
}

function DomainPage({ id }: { id?: string }) {
  const { experience, calculationError } = useActiveExperience();
  if (!experience) return <ErrorState route="domain" title="生命领域无法完成计算" message={calculationError ?? "请检查出生资料。"} href="/onboarding" action="检查出生资料" />;
  const domain = experience.domains.find((item) => item.id === (id ?? "career"));
  if (!domain) return <ErrorState route="domain" title="没有找到这个生命领域" message="这个领域不存在。你可以回到 Life Map 查看八个可用领域。" href="/life-map" action="查看 Life Map" />;
  const insight = experience.domainInsights[domain.id];
  return (
    <PageShell route="domain" title={`${domain.nameZh} / ${domain.nameEn}`} eyebrow="LIFE DOMAIN" backHref="/life-map">
      <div className="page domain-page">
        <header className="domain-hero"><p className="eyebrow">{domain.nameEn.toUpperCase()} PATTERN</p><h1>{domain.pattern}</h1><h2>{insight.subtitle}</h2><p>{insight.summary}</p></header>
        <section className="calculation-coverage"><div><p className="eyebrow">CALCULATION COVERAGE</p><h2>本领域用了哪些真实事实</h2><p>数量只表示证据来源覆盖，不是置信度或命运评分。</p></div>{(["bazi", "ziwei", "astrology"] as SystemId[]).map((system) => <article key={system}><span className={`system-seal system-seal--${system}`}>{systemLabels[system].short.slice(0, 1)}</span><div><b>{systemLabels[system].full}</b><small>{insight.evidence.some((item) => item.system === system) ? "已连接计算事实" : "此领域没有可用事实"}</small></div></article>)}</section>
        <section className="reading-section"><SectionHeader eyebrow="MULTI-SYSTEM READING" title="三个体系如何描述它" /><p className="reading-copy">这不是把三个传统相加成一个结论，而是让每条线索保留自己的来源与语言，再观察它们在哪里相遇。</p><EvidenceList evidence={insight.evidence} experience={experience} /></section>
        {insight.tensionNote && <section className="tension-card"><p className="eyebrow">A USEFUL TENSION</p><h2>值得保留的张力</h2><p>{insight.tensionNote}</p></section>}
        <section className="reflection-card"><span aria-hidden="true">问</span><div><p className="eyebrow">TAKE THIS WITH YOU</p><h2>{insight.reflectionPrompt}</h2><Link href={`/ask?prompt=${encodeURIComponent(insight.reflectionPrompt)}`} className="button button--primary">问一个{domain.nameZh}问题 <span>→</span></Link></div></section>
      </div>
    </PageShell>
  );
}

function AskPage() {
  const { experience, calculationError } = useActiveExperience();
  const [focus, setFocus] = useState<ReflectionFocus>("relationships");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState("");
  const [concern, setConcern] = useState("");
  const [deadline, setDeadline] = useState("");
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  useEffect(() => {
    if (!experience) return;
    const params = new URLSearchParams(window.location.search);
    const prompt = params.get("prompt");
    const routedFocus = params.get("focus");
    queueMicrotask(() => {
      if (focusOptions.some((item) => item.id === routedFocus)) setFocus(routedFocus as ReflectionFocus);
      if (prompt) setQuestion(prompt);
    });
  }, [experience]);
  if (!experience) return <ErrorState route="ask" title="问命盘需要先完成计算" message={calculationError ?? "请检查出生资料。"} href="/onboarding" action="检查出生资料" />;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    const routedQuestion = `${focusOption(focus).label}：${question}`;
    setAnswer(routeCalculatedAsk(routedQuestion, experience, focusDomains[focus]));
  };
  const reset = () => {
    setAnswer(null);
    setQuestion("");
    setOptions("");
    setConcern("");
    setDeadline("");
  };
  return (
    <PageShell route="ask">
      <div className={`page ask-page ${answer ? "ask-page--answered" : ""}`}>
        {!answer ? <>
          <header className="ask-hero"><div className="ask-orbit" aria-hidden="true"><span>问</span></div><p className="eyebrow">DECISION SESSION · 决策反思</p><h1>先把问题<br />说具体一点</h1><p>Life Map 不替你选择。它会把现实问题与已计算事实并置，指出共识、张力和一个可以验证的小步骤。</p><span className="fixture-label">CALCULATED · 规则综合，不调用实时 AI</span></header>
          <form className="decision-form" onSubmit={submit}>
            <fieldset className="decision-focus"><legend>这次主要关于</legend>{focusOptions.map((option) => <label key={option.id} className={focus === option.id ? "is-selected" : ""}><input type="radio" name="focus" value={option.id} checked={focus === option.id} onChange={() => setFocus(option.id)} /><span>{option.label}</span></label>)}</fieldset>
            <label className="field field--textarea"><span>你正在面对什么问题？</span><textarea id="chart-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例如：我想继续这段关系，但不知道该如何说清边界。" rows={3} /></label>
            <div className="decision-form__grid">
              <label className="field"><span>你正在比较哪些选择？（选填）</span><input value={options} onChange={(event) => setOptions(event.target.value)} placeholder="留下 / 离开 / 先谈一次" /></label>
              <label className="field"><span>什么时候需要决定？（选填）</span><input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label>
            </div>
            <label className="field"><span>你最担心什么？（选填）</span><input value={concern} onChange={(event) => setConcern(event.target.value)} placeholder="失去关系、做错选择、再次重复旧模式…" /></label>
            <div className="decision-form__footer"><p>输入越具体，规则回答越容易连接到相关领域。不会把问题内容发送到外部服务。</p><button className="button button--primary" type="submit" disabled={!question.trim()}>生成我的决策地图 <span aria-hidden="true">→</span></button></div>
          </form>
          <section className="suggestions"><p className="eyebrow">TRY A STARTER</p>{focusOptions.map((option, index) => <button key={option.id} type="button" onClick={() => { setFocus(option.id); setQuestion(option.prompt); }}><span>0{index + 1}</span>{option.prompt}<b>填入</b></button>)}</section>
        </> : <AskAnswer answer={answer} question={question} options={options} concern={concern} deadline={deadline} focus={focus} experience={experience} onReset={reset} />}
      </div>
    </PageShell>
  );
}

function AskAnswer({ answer, question, options, concern, deadline, focus, experience, onReset }: { answer: AskResponse; question: string; options: string; concern: string; deadline: string; focus: ReflectionFocus; experience: CalculatedExperience; onReset: () => void }) {
  const [action, setAction] = useState("");
  const [reviewDate, setReviewDate] = useState(() => reviewDateFromNow(7));
  const [saved, setSaved] = useState(false);
  const save = () => {
    if (!action.trim()) return;
    saveReflection({
      id: `reflection-${Date.now()}`,
      focus,
      domain: focusDomains[focus],
      question: question.trim(),
      options: options.trim(),
      concern: concern.trim(),
      deadline,
      action: action.trim(),
      reviewDate,
      createdAt: new Date().toISOString(),
    });
    setSaved(true);
  };
  return (
    <article className="answer">
      <header><button className="text-button" onClick={onReset}>← 新问题</button><p className="eyebrow">YOUR QUESTION</p><blockquote>{question}</blockquote><span className="kind-label">{answer.kind === "consensus" ? "多体系共识" : answer.kind === "tension" ? "有意义的张力" : "独立线索"}</span><h1>{answer.title}</h1><p>{answer.directAnswer}</p></header>
      {(options || concern || deadline) && <section className="decision-context"><p className="eyebrow">YOUR REAL-WORLD CONTEXT · 现实条件</p><dl>{options && <div><dt>正在比较</dt><dd>{options}</dd></div>}{concern && <div><dt>最担心</dt><dd>{concern}</dd></div>}{deadline && <div><dt>决定期限</dt><dd>{deadline}</dd></div>}</dl><p>这些内容帮助你保存问题背景，但不会被当成命盘事实或证明某个结果。</p></section>}
      {answer.sections.map((section, index) => <section className="answer-section" key={section.heading}><span>0{index + 1}</span><div><h2>{section.heading}</h2><p>{section.body}</p><EvidenceList evidence={section.evidence} experience={experience} /></div></section>)}
      <section className="answer-reflection"><p className="eyebrow">A QUESTION TO KEEP</p><h2>{answer.reflectionQuestion}</h2></section>
      <section className="action-plan"><p className="eyebrow">ONE REVERSIBLE STEP · 一个可撤回的小步骤</p><h2>你准备先验证什么？</h2><p>先保存一个不需要购买、可以在现实中观察结果的动作。Life Map 不替你做决定。</p><label className="field"><span>我的下一步</span><input value={action} onChange={(event) => { setAction(event.target.value); setSaved(false); }} placeholder="例如：约一个不被打断的 20 分钟，把边界说清楚。" /></label><label className="field"><span>什么时候回来复盘？</span><input type="date" value={reviewDate} onChange={(event) => { setReviewDate(event.target.value); setSaved(false); }} /></label><button className="button button--primary" type="button" disabled={!action.trim()} onClick={save}>{saved ? "已保存到本次会话" : "保存行动与复盘日期"}</button>{saved && <p className="save-confirmation" role="status">已保存。你可以在“我的”中查看，并从 Today 继续这条线索。</p>}</section>
      {answer.relatedDomain && <Link href={`/life-map/${answer.relatedDomain}`} className="button button--secondary">查看相关生命领域 <span>↗</span></Link>}
      <p className="disclosure">{answer.disclaimer} 保存内容只保留在当前浏览器会话中。</p>
    </article>
  );
}

function Hexagram({ lines, count = 6 }: { lines: IChingLine[]; count?: number }) {
  return <div className="hexagram" aria-label={`六爻卦象，已显示 ${count} 爻`}>{lines.slice(0, count).reverse().map((line, index) => <div key={line.position} style={{ "--line-delay": `${index * 75}ms` } as React.CSSProperties} className={`hex-line hex-line--${line.polarity} ${line.moving ? "is-moving" : ""}`}><span /><span />{line.moving && <b>○</b>}<small>{line.position}</small></div>)}</div>;
}

function IChingPage() {
  const [question, setQuestion] = useState(iching.sampleQuestion);
  const [started, setStarted] = useState(false);
  const [casts, setCasts] = useState(0);
  const cast = () => { setStarted(true); setCasts((value) => Math.min(6, value + 1)); };
  const reset = () => { setCasts(0); setStarted(false); };
  return (
    <PageShell route="iching" title="问一卦 / I Ching" eyebrow="REFLECTION RITUAL" backHref="/ask">
      <div className="page iching-page">
        {!started ? <section className="iching-intro"><div className="iching-mark" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div><p className="eyebrow">A QUESTION FOR THIS MOMENT</p><h1>先把问题<br />放在心里</h1><p>易经在这里是一种为具体问题留出空间的传统反思实践。它不会替你预测或保证结果。</p><label className="field field--textarea"><span>你想问什么？</span><textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} /></label><button className="button button--primary" disabled={!question.trim()} onClick={cast}>开始投掷 <span>→</span></button></section> : casts < 6 ? <section className="casting"><p className="eyebrow">BUILDING FROM THE BOTTOM · 从下往上</p><h1>第 {casts + 1} 次，共 6 次</h1><p className="casting__question">“{question}”</p><div className="cast-stage"><Hexagram lines={iching.lines} count={casts} /><div className="coins" aria-hidden="true"><span>阴</span><span>阳</span><span>阴</span></div></div><button className="button button--primary" onClick={cast}>投掷三枚硬币</button><button className="text-button" onClick={() => setCasts(6)}>直接查看演示结果</button></section> : <section className="iching-result"><header><div><p className="eyebrow">HEXAGRAM 63 · 演示结果</p><h1>{iching.primary.nameZh}</h1><h2>{iching.primary.nameEn}</h2></div><Hexagram lines={iching.lines} /></header><div className="result-transition"><span>{iching.primary.nameZh} · 63</span><i>六二动爻 →</i><span>{iching.relating?.nameZh} · 05</span></div><section><p className="eyebrow">ORIGINAL TEXT · {iching.originalTextLabel}</p><blockquote>{iching.originalTextExcerpt}</blockquote></section><section><p className="eyebrow">PLAIN LANGUAGE · 白话理解</p><h2>已经开始，不必急着补齐一切</h2><p>{iching.plainLanguage}</p></section><section className="application-card"><p className="eyebrow">APPLIED TO YOUR QUESTION</p><h2>放回你的问题里</h2><p>{iching.applicationToQuestion}</p></section><section className="answer-reflection"><p className="eyebrow">REFLECTION</p><h2>{iching.reflectionPrompt}</h2></section><div className="result-actions"><Link href={`/ask?prompt=${encodeURIComponent(`结合命盘看：${question}`)}`} className="button button--primary">结合我的命盘一起看</Link><button className="button button--secondary" onClick={reset}>重新起卦</button></div><p className="disclosure disclosure--center">{iching.disclaimer}</p></section>}
      </div>
    </PageShell>
  );
}

function TimingPage() {
  const { experience, calculationError } = useActiveExperience();
  const { items: reflections } = useSavedReflections();
  if (!experience) return <ErrorState route="timing" title="当前时运无法完成计算" message={calculationError ?? "请检查出生资料。"} href="/onboarding" action="检查出生资料" />;
  const timing = experience.timing;
  const datedReflection = reflections.find((item) => item.deadline || item.reviewDate);
  return (
    <PageShell route="timing">
      <div className="page timing-page">
        <header className="page-heading"><p className="eyebrow">YOUR CURRENT SEASON · 当前时运</p><h1>{timing.title}</h1><p>{timing.summary}</p></header>
        <section className="timeline-large"><div className="timeline-years"><span>月初</span><span>现在</span><span>下月</span></div><div className="timeline-track" style={{ "--timeline-position": `${timing.nowPosition * 100}%` } as React.CSSProperties}><i style={{ left: `${timing.nowPosition * 100}%` }}><b>NOW</b></i></div><div className="timeline-periods"><article><small>{timing.start}</small><h3>本月计算起点</h3><p>以当前公历月为边界保存一张可复算快照。</p></article><article className="is-current"><small>{timing.start}—{timing.end}</small><h3>{timing.title}</h3><p>{timing.summary}</p></article><article><small>{timing.nextTransition.date}</small><h3>{timing.nextTransition.title}</h3><p>{timing.nextTransition.summary}</p></article></div></section>
        {datedReflection && <section className="decision-date-card"><p className="eyebrow">YOUR REAL-WORLD DATE · 你的现实时间</p><h2>{datedReflection.question}</h2><p>{datedReflection.deadline ? `你计划在 ${datedReflection.deadline} 前做决定。` : "你还没有设置决定期限。"} {datedReflection.reviewDate ? `复盘日期是 ${datedReflection.reviewDate}。` : ""}</p><small>现实日期来自你保存的问题，不是命盘预测或“吉日”。</small></section>}
        <section className="section-block"><SectionHeader eyebrow="DOMAIN ACTIVATION · 已计算" title="哪些主题留下较多线索" /><div className="signal-list">{timing.signals.map((signal, index) => <article key={signal.id}><div><span>{signal.label}</span><small>{signal.strength === "very-active" ? "多源线索" : signal.strength === "active" ? "可见线索" : "背景线索"}</small></div><i><b style={{ "--signal-width": `${signal.internalStrength * 100}%`, "--signal-delay": `${index * 90}ms` } as React.CSSProperties} /></i><p>{signal.summary}</p></article>)}</div><p className="inline-notice">{timing.disclaimer}</p></section>
        <section className="reading-section"><SectionHeader eyebrow={`AS OF ${timing.asOf}`} title="时运依据来自哪里" /><EvidenceList evidence={timing.evidence} experience={experience} /></section>
        <section className="reflection-card"><span aria-hidden="true">时</span><div><p className="eyebrow">THIS PERIOD&apos;S PRACTICE</p><h2>{experience.todayInsight.reflectionPrompt}</h2><Link href={`/ask?prompt=${encodeURIComponent("这个阶段我最值得留意什么？")}`} className="button button--primary">围绕当前阶段提问</Link></div></section>
      </div>
    </PageShell>
  );
}

function ReportPage() {
  const { reading, experience, calculationError } = useActiveExperience();
  const dailyReport = useMemo(() => experience ? buildDailyReport(experience, experience.calculatedFor) : null, [experience]);
  const detailedReport = useMemo(() => experience ? buildLifeMapReport(experience, experience.calculatedFor) : null, [experience]);
  const [checkoutState, setCheckoutState] = useState<{ status: "idle" | "loading" | "error"; kind: ReportProductKind | null }>({ status: "idle", kind: null });
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const storefrontConfigured = Boolean(process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN?.trim());

  if (!experience || !dailyReport || !detailedReport) return <ErrorState route="report" title="数字报告无法生成" message={calculationError ?? "请检查出生资料。"} href="/onboarding" action="检查出生资料" />;
  const dailyPage = dailyReport.pages[0];
  const previewPages = detailedReport.pages.filter((page) => [1, 7, 9].includes(page.number));

  const beginCheckout = async (kind: ReportProductKind) => {
    setCheckoutState({ status: "loading", kind });
    setCheckoutMessage("");
    try {
      const checkout = await createReportCheckout(kind);
      sessionStorage.setItem("life-map-report-checkout-started", JSON.stringify({ product: checkout.kind, amount: checkout.amount, currency: checkout.currencyCode }));
      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      setCheckoutState({ status: "error", kind });
      setCheckoutMessage(error instanceof Error ? error.message : "暂时无法连接 Shopify 结账，请稍后重试。");
    }
  };

  return (
    <PageShell route="report" title="数字报告" eyebrow="PRIVATE PDF" backHref="/today">
      <div className="page report-page">
        <header className="report-intro">
          <div>
            <p className="eyebrow">PRIVATE EDITIONS · 一次性购买</p>
            <h1>先选深度，<br />再进入结账</h1>
            <p>Daily Report 用一页回答“今天值得留意什么”；Detailed Report 用十页整理完整命盘、当期线索和可追溯依据。没有试用转订阅，也没有自动续费。</p>
            <div className="report-intro__actions">
              <button className="button button--secondary" type="button" onClick={() => window.print()}>保存本地预览</button>
              <a className="button button--tertiary" href="/downloads/life-map-full-daily-report-sample.pdf" download>下载十页演示 PDF</a>
            </div>
            <p className="report-privacy">两种都是一次性数字商品。你可以先查看下方预览，免费命盘事实与证据不会被报告付费墙锁住。</p>
          </div>
        </header>

        <section className="report-selector" aria-labelledby="report-selector-title">
          <div className="report-selector__heading"><p className="eyebrow">CHOOSE YOUR DEPTH · 选择阅读深度</p><h2 id="report-selector-title">两份报告，各自解决什么</h2><p>价格、页数和内容在点击结账前全部说明；购买不会解锁原本免费的命盘计算。</p></div>
          <div className="report-tier-grid">
            <article className="report-tier-card report-tier-card--daily">
              <header><span>DAILY · 1 PAGE</span><small>适合今天</small></header>
              <h3>Daily Report</h3>
              <p>一页读完今天的综合主题、当前时运与可验证的小行动。</p>
              <div className="report-tier-card__price"><strong>$1.99</strong><span>USD · 一次性购买</span></div>
              <ul><li>今日综合主题与时间范围</li><li>最多 3 条可溯源命盘依据</li><li>1 个现实观察与反思提示</li><li>私人一页 PDF</li></ul>
              <button className="button button--primary" type="button" onClick={() => beginCheckout("daily")} disabled={checkoutState.status === "loading"}>
                {checkoutState.status === "loading" && checkoutState.kind === "daily" ? "正在连接 Shopify…" : "购买 Daily Report · $1.99"}
              </button>
              <a href="#daily-preview" className="text-link">先看一页预览 ↓</a>
            </article>
            <article className="report-tier-card report-tier-card--detailed">
              <header><span>DETAILED · 10 PAGES</span><small>适合保存与复盘</small></header>
              <h3>Detailed Report</h3>
              <p>把三套本命计算、当前时运、规则综合和七日练习整理成完整档案。</p>
              <div className="report-tier-card__price"><strong>$19.99</strong><span>USD · 一次性购买</span></div>
              <ul><li>八字、紫微与西占计算记录</li><li>跨体系共识、张力与证据</li><li>八个生命领域的反思主题</li><li>七日练习、方法与限制</li></ul>
              <button className="button button--secondary" type="button" onClick={() => beginCheckout("detailed")} disabled={checkoutState.status === "loading"}>
                {checkoutState.status === "loading" && checkoutState.kind === "detailed" ? "正在连接 Shopify…" : "购买 10 页 Detailed Report · $19.99"}
              </button>
              <a href="#detailed-preview" className="text-link">查看目录与章节预览 ↓</a>
            </article>
          </div>
          <p className="report-checkout-note">安全结账由 Shopify 提供。订单只包含所选商品、数量和价格；姓名、生日、出生时间、地点与命盘内容不会发送给 Shopify。</p>
          {!storefrontConfigured && <p className="inline-notice">商店目前使用受保护的预览模式；Shopify 可能先显示店铺密码页。正式上线前需在 Shopify 后台解除 Online Store 密码，或配置公开 Storefront token。</p>}
          {checkoutState.status === "error" && <p className="inline-notice" role="alert">{checkoutMessage}</p>}
        </section>

        <div className="report-boundary"><span>FACT</span><p>命盘事实来自版本化引擎</p><span>REFLECTION</span><p>传统主题是可质疑的观察角度</p><span>PRACTICE</span><p>练习不需要购买任何物品</p></div>

        <section className="report-preview report-preview--daily" id="daily-preview" aria-label="Daily Report 预览">
          <div className="report-preview__heading"><p className="eyebrow">DAILY REPORT · FULL PREVIEW</p><h2>一页的结构，先完整看清</h2><p>Daily Report 聚焦 {experience.calculatedFor}，不会把短期快照包装成事件预测。</p></div>
          <article className="report-sheet report-sheet--daily">
            <header><span>{dailyPage.eyebrow}</span><small>01 / 01</small></header>
            <div className="report-sheet__title"><h2>{dailyPage.title}</h2><p>{dailyPage.subtitle}</p></div>
            <div className="report-sheet__blocks">{dailyPage.blocks.map((block) => <section className={`report-block report-block--${block.kind}`} key={block.id}><span>{block.label}</span><h3>{block.title}</h3><p>{block.body}</p></section>)}</div>
            <footer><span>Life Map · Daily reflection</span><b>{dailyReport.generatedOn}</b></footer>
          </article>
        </section>

        <section className="report-preview report-preview--detailed" id="detailed-preview" aria-label="Detailed Report 预览">
          <div className="report-preview__heading"><p className="eyebrow">DETAILED REPORT · THREE-CHAPTER PREVIEW</p><h2>十页目录与三个完整章节</h2><p>证据与主要洞察保持免费可查；Detailed Report 的价值是把计算、解释、练习与限制整理成一份可保存的连续记录。</p></div>
          <ol className="report-toc" aria-label="十页详细报告目录">{detailedReport.pages.map((page) => <li key={page.id} className={previewPages.some((item) => item.id === page.id) ? "is-preview" : ""}><span>{String(page.number).padStart(2, "0")}</span><div><strong>{page.title}</strong><small>{previewPages.some((item) => item.id === page.id) ? "本页完整预览" : "正式 PDF 包含"}</small></div></li>)}</ol>
          {previewPages.map((page) => (
            <article className={`report-sheet report-sheet--${page.id}`} key={page.id}>
              <header>
                <span>{page.eyebrow}</span>
                <small>{String(page.number).padStart(2, "0")} / {String(detailedReport.pages.length).padStart(2, "0")}</small>
              </header>
              <div className="report-sheet__title"><h2>{page.title}</h2><p>{page.subtitle}</p></div>
              {page.id === "cover" && <div className="report-cover-mark" aria-label={`日主 ${reading.dayMaster.stem}`}><i /><strong>{reading.dayMaster.stem}</strong><span>{reading.dayMaster.polarity}{reading.dayMaster.element}</span></div>}
              {page.id === "pillars" && <div className="report-element-bars" role="img" aria-label={elementOrder.map((element) => `${element} ${reading.visibleElementCounts[element]}`).join("，")}>{elementOrder.map((element) => <div key={element}><span>{element}<small>{elementEnglish[element]}</small></span><i><b style={{ width: `${(reading.visibleElementCounts[element] / Math.max(1, ...Object.values(reading.visibleElementCounts))) * 100}%`, "--element-color": elementColor[element] } as React.CSSProperties} /></i><strong>{reading.visibleElementCounts[element]}</strong></div>)}</div>}
              <div className="report-sheet__blocks">{page.blocks.map((block) => <section className={`report-block report-block--${block.kind}`} key={block.id}><span>{block.label}</span><h3>{block.title}</h3><p>{block.body}</p></section>)}</div>
              <footer><span>Life Map · Personal reflection</span><b>{detailedReport.generatedOn}</b></footer>
            </article>
          ))}
        </section>
        <section className="report-final-cta"><p className="eyebrow">ONE-TIME PURCHASE · NO SUBSCRIPTION</p><h2>选择今天的一页，或完整十页</h2><p>{detailedReport.disclaimer} 两种报告均为一次性购买，不会自动续费。</p><div className="report-final-cta__actions"><button className="button button--primary" type="button" onClick={() => beginCheckout("daily")} disabled={checkoutState.status === "loading"}>Daily · $1.99</button><button className="button button--secondary" type="button" onClick={() => beginCheckout("detailed")} disabled={checkoutState.status === "loading"}>Detailed · $19.99</button></div></section>
      </div>
    </PageShell>
  );
}

function ObjectsPage() {
  const [category, setCategory] = useState<"all" | Product["category"]>("all");
  const featuredProduct = products.find((product) => product.category === "bracelet") ?? products[0];
  const visibleProducts = category === "all" ? products : products.filter((product) => product.category === category);
  const categoryOptions: Array<{ id: "all" | Product["category"]; label: string }> = [{ id: "all", label: "全部" }, { id: "stone", label: "天然石" }, { id: "bracelet", label: "五行手链" }, { id: "chart-art", label: "命盘艺术" }];
  return (
    <PageShell route="objects" title="象征物商城" eyebrow="LIFE MAP SHOP">
      <div className="page objects-page">
        <header className="shop-hero"><div><p className="eyebrow">LIFE MAP OBJECTS · ONLINE SHOP</p><h1>象征物商城</h1><p>为已经被看见的主题，选择一件可以放进日常的物品。这里出售的是材质、设计与纪念意义，不是转运、疗愈或结果保证。</p><div className="shop-assurances"><span>材质信息透明</span><span>象征关联可解释</span><span>无功效承诺</span></div></div><ProductVisual product={featuredProduct} compact /></header>
        <section className="shop-feature"><div><p className="eyebrow">FEATURED · PERSONAL EDITION</p><h2>{featuredProduct.nameZh}</h2><p>{featuredProduct.shortDescription}</p><div className="pill-row">{featuredProduct.intentions.map((item) => <span key={item}>{item}</span>)}</div></div><div><strong>{featuredProduct.price}</strong><Link href={`/objects/${featuredProduct.slug}`} className="button button--primary">查看主推商品 <span aria-hidden="true">→</span></Link></div></section>
        <section className="shop-catalog" aria-labelledby="shop-catalog-title"><div className="shop-catalog__heading"><div><p className="eyebrow">BROWSE THE COLLECTION</p><h2 id="shop-catalog-title">浏览全部商品</h2></div><div className="shop-filters" aria-label="商品分类">{categoryOptions.map((option) => <button key={option.id} type="button" aria-pressed={category === option.id} onClick={() => setCategory(option.id)}>{option.label}</button>)}</div></div><div className="product-grid">{visibleProducts.map((product) => <Link href={`/objects/${product.slug}`} key={product.id} className="product-card"><ProductVisual product={product} compact /><div><small>{product.category === "stone" ? "天然石" : product.category === "bracelet" ? "五行手链" : "命盘艺术"}</small><h2>{product.nameEn}</h2><h3>{product.nameZh}</h3><p>{product.shortDescription}</p><footer><span>{product.price}</span><b>查看详情 →</b></footer></div></Link>)}</div></section>
        <aside className="shop-boundary"><p className="eyebrow">A CLEAR BOUNDARY · 商城边界</p><h2>先有理解，再谈物品</h2><p>直接浏览商城不会生成“你需要购买”的判断。个性化推荐必须说明它连接到哪个主题，并先给出一个不花钱也能完成的日常练习。</p><Link href="/today" className="text-link">回到我的地图 <span aria-hidden="true">→</span></Link></aside>
      </div>
    </PageShell>
  );
}

function ProductPage({ id }: { id?: string }) {
  const product = products.find((item) => item.id === (id ?? products[0].slug) || item.slug === (id ?? products[0].slug));
  const [saved, setSaved] = useState(false);
  if (!product) return <ErrorState route="product" title="没有找到这件象征物" message="这件演示物品可能已被移动，或链接并不存在。你仍可以浏览完整的演示收藏。" href="/objects" action="浏览象征物" />;
  const isFeatured = product.id === recommendation.productId;
  return (
    <PageShell route="product" title="象征物详情" eyebrow="OBJECT DETAIL" backHref="/objects">
      <div className="page product-page"><div className="product-layout"><div className="product-gallery"><ProductVisual product={product} /><div className="gallery-thumbs"><button aria-label="查看主图" className="is-active"><span /></button><button aria-label="查看材质细节"><span /></button><button aria-label="查看日常使用情境"><span /></button></div></div><article className="product-detail"><p className="eyebrow">PERSONAL SYMBOL · OPTIONAL</p><h1>{product.nameEn}</h1><h2>{product.nameZh}</h2><p className="product-intro">{product.shortDescription}</p>{isFeatured && <><section className="why-section"><p className="eyebrow">WHY IT SHOWED UP FOR YOU</p><h3>{recommendation.headline}</h3><p>{recommendation.summary}</p><div className="reason-list">{recommendation.reasons.map((reason) => <article key={reason.id}><span>{reason.label}</span><p>{reason.explanation}</p></article>)}</div></section><section className="practice practice--large"><span>{recommendation.nonCommercialPractice.title}</span><p>{recommendation.nonCommercialPractice.instruction}</p></section></>}<section className="association"><p className="eyebrow">TRADITIONAL ASSOCIATION</p><p>{product.traditionalMeaning}</p><div className="pill-row">{product.elements.concat(product.intentions).map((item) => <span className="pill" key={item}>{item}</span>)}</div></section><section className="daily-use"><p className="eyebrow">A SIMPLE DAILY USE</p><h3>让它成为一个动作提示</h3><p>{product.dailyUse}</p></section><details className="product-info" open><summary>材质与信息</summary><dl><div><dt>材质</dt><dd>{product.material}</dd></div><div><dt>产地</dt><dd>{product.origin}</dd></div><div><dt>尺寸</dt><dd>{product.dimensions}</dd></div><div><dt>养护</dt><dd>{product.care}</dd></div></dl></details><div className="product-action"><div><small>参考价格</small><strong>{product.price}</strong></div><button className="button button--primary" aria-pressed={saved} onClick={() => setSaved((value) => !value)}>{saved ? "已加入愿望清单" : "加入愿望清单"}</button></div><p className="wishlist-status" aria-live="polite">{saved ? "已在当前演示会话中保存。" : ""}</p><p className="disclosure">{isFeatured ? recommendation.disclaimer : "这些关联来自传统及现代象征文化，不是科学功效或结果保证。"} 当前商城为商品与愿望清单预览，实物结账尚未开放。</p></article></div></div>
    </PageShell>
  );
}

function MePage() {
  const { reading, experience, calculationError } = useActiveExperience();
  const { items: reflections, setItems: setReflections } = useSavedReflections();
  if (!experience) return <ErrorState route="me" title="出生档案无法完成计算" message={calculationError ?? "请检查出生资料。"} href="/onboarding" action="检查出生资料" />;
  const clearProfile = () => {
    clearBirthProfile();
    clearReflections();
    navigate("/onboarding");
  };
  return (
    <PageShell route="me">
      <div className="page me-page">
        <header className="profile-hero"><div className="profile-monogram">{reading.profile.displayName.slice(0, 1).toUpperCase()}</div><div><p className="eyebrow">YOUR PRIVATE SPACE · 你的内在空间</p><h1>{reading.profile.displayName}</h1><p>八字 · 紫微 · 西占 · 时运均使用本地计算</p></div></header>
        <section className="profile-card"><SectionHeader eyebrow="BIRTH PROFILE" title="出生信息" /><dl><div><dt>出生日期</dt><dd>{reading.profile.birthDate}</dd></div><div><dt>出生时间</dt><dd>{reading.profile.birthTime ?? "未知"}</dd></div><div><dt>出生地点</dt><dd>{reading.place.label}</dd></div><div><dt>时区</dt><dd>{reading.place.timeZone}</dd></div><div><dt>状态</dt><dd><span className="calculation-label">三体系计算完成</span></dd></div></dl><Link href="/onboarding" className="text-link">重新输入资料 →</Link></section>
        <section className="reflection-history" id="reflection-history"><SectionHeader eyebrow="YOUR THREADS" title="问题与行动" action={reflections.length ? `${reflections.length} 条记录` : undefined} />{reflections.length ? <div>{reflections.map((reflection) => <article key={reflection.id}><span>{focusOption(reflection.focus).label}</span><div><h3>{reflection.question}</h3><p>{reflection.action}</p><small>{reflection.reviewDate ? `计划复盘 ${reflection.reviewDate}` : "未设置复盘日期"}</small></div><button type="button" aria-label={`删除问题：${reflection.question}`} onClick={() => setReflections(removeReflection(reflection.id))}>删除</button></article>)}</div> : <div className="empty-thread"><p>还没有保存问题。完成一次决策反思后，你的行动和复盘日期会出现在这里。</p><Link href="/ask" className="button button--secondary">开始一个问题</Link></div>}<p className="reflection-history__privacy">当前阶段只保存在本次浏览器会话中。账号同步、跨设备记忆与提醒尚未启用。</p></section>
        <details className="profile-chart"><summary>查看我的四柱计算事实</summary><BaziChartCard reading={reading} /></details>
        <section className="menu-list"><Link href="/report"><span>数字报告</span><small>Daily $1.99 · 十页 Detailed $19.99 · 一次性购买</small><b>→</b></Link><Link href="/objects"><span>象征物商城</span><small>浏览天然石、五行手链与命盘艺术</small><b>→</b></Link><button disabled><span>关系档案</span><small>后续阶段开放</small><b>即将开放</b></button><button disabled><span>通知与每日提醒</span><small>后续阶段开放</small><b>即将开放</b></button></section>
        <section className="trust-card"><p className="eyebrow">TRUST & PRIVACY</p><h2>你的信息，只留在这次浏览会话</h2><p>出生资料只保存在当前浏览器会话中，不会上传、写入账户或发送分析事件。关闭会话后浏览器会清除它。</p><ul><li>八字、紫微和西占由版本锁定的本地引擎计算</li><li>时运使用 {experience.calculatedFor} 的干支、紫微运限与行星角距快照</li><li>综合解释由规则生成，不调用实时 AI 或追踪</li></ul><button className="text-button text-button--danger" onClick={clearProfile}>清除本次出生资料</button></section>
      </div>
    </PageShell>
  );
}

export function LifeMapApp({ initialRoute, resourceId }: { initialRoute: RouteName; resourceId?: string }) {
  switch (initialRoute) {
    case "landing": return <LandingPage />;
    case "onboarding": return <OnboardingPage />;
    case "generating": return <GeneratingPage />;
    case "today": return <TodayPage />;
    case "insight": return <InsightPage id={resourceId} />;
    case "life-map": return <LifeMapPage />;
    case "domain": return <DomainPage id={resourceId} />;
    case "ask": return <AskPage />;
    case "iching": return <IChingPage />;
    case "timing": return <TimingPage />;
    case "objects": return <ObjectsPage />;
    case "product": return <ProductPage id={resourceId} />;
    case "report": return <ReportPage />;
    case "me": return <MePage />;
  }
}
