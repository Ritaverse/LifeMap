"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { AnchorHTMLAttributes, FormEvent, ReactNode } from "react";
import { consumeAskHandoff, writeAskHandoff } from "../lib/ask-handoff";
import { iching, products, recommendation } from "../lib/data";
import type { BaziPillar, BaziReading, FiveElement, PillarKind } from "../lib/bazi";
import type { BirthPlace } from "../lib/birth-profile";
import { baziCaveatLabel, fiveElementLabel, palaceLabel, pillarLabel, polarityLabel, tenGodLabel } from "../lib/chart-terminology.ts";
import { localDateString } from "../lib/date";
import { getChartExplanationPreview, resolveCalculatedEvidence, routeCalculatedAsk } from "../lib/experience-selectors";
import type { CalculatedExperience, ChartExplanationPreview } from "../lib/experience";
import { searchBirthPlaces } from "../lib/place-search";
import { clearBirthProfile, readBirthProfile, readOnboardingDraft, writeBirthProfile, writeOnboardingDraft } from "../lib/profile-storage";
import type { OnboardingDraft, ReflectionFocus } from "../lib/profile-storage";
import { clearReflections, readReflections, removeReflection, saveReflection } from "../lib/reflection-storage";
import type { SavedReflection } from "../lib/reflection-storage";
import { buildDailyReport, buildLifeMapReport } from "../lib/report";
import { FULL_REPORT_PRODUCT } from "../lib/report-product";
import { classifySafetyConcern } from "../lib/safety";
import { createPrivateReportJob, createReportCheckout, getReportLaunchReadiness } from "../lib/shopify";
import type { SafetyBoundary } from "../lib/safety";
import type { AskResponse, DomainId, EvidenceRef, IChingLine, Product, SystemId } from "../lib/types";
import type { WesternReading } from "../lib/western";
import type { ZiweiReading } from "../lib/ziwei";
import { BrandMark } from "./BrandMark";
import { LocaleSwitcher, useLocale } from "./LocaleProvider";
import type { AppLocale } from "../lib/locale.ts";

type RouteName = "landing" | "onboarding" | "generating" | "today" | "insight" | "life-map" | "domain" | "ask" | "iching" | "timing" | "objects" | "product" | "report" | "me";

function Link({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a href={href} {...props} />;
}

function navigate(href: string) {
  window.location.assign(href);
}

function AskLink({ prompt, focus, children, className }: { prompt?: string; focus?: ReflectionFocus; children: ReactNode; className?: string }) {
  return (
    <a
      href="/ask"
      className={className}
      onClick={(event) => {
        event.preventDefault();
        writeAskHandoff({ prompt, focus });
        navigate("/ask");
      }}
    >
      {children}
    </a>
  );
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

const focusOptions: Array<{ id: ReflectionFocus; label: string; title: string; description: string; prompt: string; labelEn: string; titleEn: string; descriptionEn: string; promptEn: string }> = [
  { id: "relationships", label: "关系", title: "看清重复的关系模式", description: "把靠近、空间、边界和回应说得更具体。", prompt: "为什么我和亲近的人总会重复类似的冲突？", labelEn: "Relationships", titleEn: "See a repeating relationship pattern", descriptionEn: "Make closeness, space, boundaries, and response more specific.", promptEn: "Why do similar conflicts keep repeating with people close to me?" },
  { id: "career", label: "事业", title: "梳理一个职业选择", description: "分开环境问题、角色问题和真正不能妥协的条件。", prompt: "我现在的职业处于什么阶段？", labelEn: "Career", titleEn: "Clarify a career choice", descriptionEn: "Separate the environment, the role, and what is truly non-negotiable.", promptEn: "What stage is my career in right now?" },
  { id: "timing", label: "时机", title: "理解现在所处的阶段", description: "观察当前线索，而不是寻找一个保证结果的日期。", prompt: "这个阶段我最值得留意什么？", labelEn: "Timing", titleEn: "Understand the season you are in", descriptionEn: "Observe current signals without looking for a date that guarantees an outcome.", promptEn: "What is most worth noticing in this season?" },
  { id: "self", label: "自我", title: "理解内在的矛盾", description: "找出哪些需求正在拉扯，以及它们各自在保护什么。", prompt: "我的命盘里最矛盾的地方是什么？", labelEn: "Self", titleEn: "Understand an inner tension", descriptionEn: "Name the needs pulling in different directions and what each is protecting.", promptEn: "Where does my chart show the clearest inner tension?" },
];

const focusDomains: Record<ReflectionFocus, DomainId> = {
  relationships: "relationships",
  career: "career",
  timing: "inner-life",
  self: "identity",
};

const productCopyEn: Record<string, { description: string; traditionalMeaning: string; dailyUse: string; material: string; origin: string; dimensions: string; care: string; alt: string }> = {
  "product-green-aventurine": { description: "An everyday symbol associated with growth, new beginnings, and steady cultivation.", traditionalMeaning: "Modern crystal culture often associates green aventurine with growth, new opportunities, and forward movement. These are cultural symbols, not guaranteed effects.", dailyUse: "Place it near your desk or journal and write the one thing you intend to cultivate today.", material: "Natural stone; texture and color vary (preview product information)", origin: "Origin pending verified supply-chain information", dimensions: "Approx. 35–50 mm (preview specification)", care: "Clean with a soft dry cloth; avoid chemicals and prolonged immersion.", alt: "Natural green aventurine on a dark stone surface" },
  "product-amethyst": { description: "A symbolic object associated with quiet observation and a focus ritual.", traditionalMeaning: "Modern crystal culture often links amethyst with quiet, focus, and reflection; this does not imply medical or psychological effects.", dailyUse: "Keep it in a reading space as a visual cue to close extra distractions.", material: "Natural stone (preview product information)", origin: "To be confirmed", dimensions: "Approx. 40 mm", care: "Avoid prolonged strong sunlight.", alt: "Natural amethyst in soft moonlike light" },
  "product-rose-quartz": { description: "A symbolic object associated with gentle response and relationship intention.", traditionalMeaning: "Modern crystal culture often links rose quartz with gentleness and relationship intention; it cannot bring or repair a relationship.", dailyUse: "Place it where you write messages as a reminder to express needs before making assumptions.", material: "Natural stone (preview product information)", origin: "To be confirmed", dimensions: "Approx. 35 mm", care: "Clean with a soft dry cloth.", alt: "Pale rose quartz on a dark mineral surface" },
  "product-black-tourmaline": { description: "A symbolic object associated with boundaries, grounding, and an end-of-work ritual.", traditionalMeaning: "Black tourmaline is traditionally associated with protection and boundaries. Life Map uses it only as a boundary ritual symbol, not a safety guarantee.", dailyUse: "Return it to its tray at the end of work as a cue to stop processing work messages.", material: "Natural stone (preview product information)", origin: "To be confirmed", dimensions: "Approx. 45 mm", care: "Handle gently and avoid impact.", alt: "Natural black tourmaline on a dark wood tray" },
  "product-five-elements-bracelet": { description: "An editable combination of colors and materials shaped by a personal theme and current intention.", traditionalMeaning: "A future version will show the design rules transparently and allow adjustments. It will not claim that a bracelet changes destiny.", dailyUse: "Choose one theme to practice while wearing it instead of expecting the object to produce an outcome.", material: "Concept product; materials to be confirmed", origin: "To be confirmed", dimensions: "Made to size", care: "Care instructions will follow verified material selection.", alt: "Five Elements bracelet concept using five restrained stone colors" },
  "product-chart-art": { description: "A restrained personalized artwork built from Four Pillars, circular charts, and Five Elements structure.", traditionalMeaning: "Uses structured chart facts as visual material and is positioned as personal art—not as an effect-producing product.", dailyUse: "Use it as a visual record of your story and reflection themes.", material: "Digital file or art-paper print (concept product)", origin: "Made to order", dimensions: "Multiple sizes", care: "Keep paper editions away from moisture and strong light.", alt: "Personal chart artwork composed of circles, a grid, and four pillars" },
};

const symbolicTagEnglish: Record<string, string> = {
  木: "Wood",
  火: "Fire",
  土: "Earth",
  金: "Metal",
  水: "Water",
  五行: "Five Elements",
  成长: "Growth",
  新开始: "New beginnings",
  专注: "Focus",
  安静: "Stillness",
  温柔: "Gentleness",
  关系: "Relationships",
  边界: "Boundaries",
  落地: "Grounding",
  日常仪式: "Daily ritual",
  个人化: "Personalization",
  创造: "Creativity",
  纪念: "Keepsake",
};

function symbolicTag(value: string, locale: AppLocale) {
  return locale === "zh-CN" ? value : symbolicTagEnglish[value] ?? value;
}

function productCopy(product: Product, locale: AppLocale) {
  return locale === "en" ? productCopyEn[product.id] ?? { description: product.shortDescription, traditionalMeaning: product.traditionalMeaning, dailyUse: product.dailyUse, material: product.material, origin: product.origin, dimensions: product.dimensions, care: product.care, alt: product.image.alt } : { description: product.shortDescription, traditionalMeaning: product.traditionalMeaning, dailyUse: product.dailyUse, material: product.material, origin: product.origin, dimensions: product.dimensions, care: product.care, alt: product.image.alt };
}

function focusOption(id: ReflectionFocus, locale: AppLocale = "zh-CN") {
  const item = focusOptions.find((option) => option.id === id) ?? focusOptions[0];
  return locale === "zh-CN" ? item : { ...item, label: item.labelEn, title: item.titleEn, description: item.descriptionEn, prompt: item.promptEn };
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

function BrandLockup({ tagline = false }: { tagline?: boolean }) {
  const { text } = useLocale();
  return (
    <>
      <BrandMark />
      <span className="wordmark__copy"><strong>Life Map</strong>{tagline && <small>{text("星命相照 · 向内生长", "Stars and symbols · Growth within")}</small>}</span>
    </>
  );
}

function PageShell({ route, title, eyebrow, children, backHref }: { route: RouteName; title?: string; eyebrow?: string; children: ReactNode; backHref?: string }) {
  const { locale, text } = useLocale();
  const hasNav = !["landing", "onboarding", "generating"].includes(route);
  const hasBrandFooter = !["onboarding", "generating"].includes(route);
  const activeKey = route === "domain" ? "life-map" : route === "insight" || route === "report" ? "today" : route === "objects" || route === "product" ? "objects" : route;
  return (
    <div className={`app-shell ${hasNav ? "app-shell--nav" : ""}`}>
      {hasNav && (
        <header className="topbar">
          <div className="topbar__inner">
            <div className="topbar__lead">{backHref ? <Link href={backHref} className="icon-link" aria-label={text("返回", "Back")}>←</Link> : <Link href="/today" className="wordmark" aria-label={text("Life Map 首页", "Life Map home")}><BrandLockup tagline /></Link>}</div>
            <nav className="desktop-nav" aria-label={text("网站主导航", "Main navigation")}>
              {desktopNavItems.map((item) => <Link key={item.key} href={item.href} className={activeKey === item.key ? "is-active" : ""} aria-current={activeKey === item.key ? "page" : undefined}><span>{locale === "zh-CN" ? item.zh : item.en}</span><small>{locale === "zh-CN" ? item.en : item.zh}</small></Link>)}
            </nav>
            <div className="topbar__context">
              {eyebrow && <span>{eyebrow}</span>}
              {title && <strong>{title}</strong>}
            </div>
            <div className="topbar__actions"><LocaleSwitcher /><Link href="/me" className="profile-link" aria-label={text("个人资料", "Profile")}>{text("我", "Me")}</Link></div>
          </div>
        </header>
      )}
      <main className={hasNav ? "main-content" : "main-content main-content--bare"}>{children}</main>
      {hasBrandFooter && (
        <footer className={`site-footer ${hasNav ? "" : "site-footer--bare"}`} aria-label={text("Life Map 品牌愿景", "Life Map vision")}>
          <div className="site-footer__inner">
            <div className="wordmark wordmark--footer"><BrandLockup tagline /></div>
            <p>{text("东方命理 × 西方占星，理解自己，与同路人一起成长。", "Eastern traditions × Western astrology—for self-understanding and growth in community.")}</p>
            <small>{text("COMMUNITY IN THE MAKING · 同路社区正在生长", "COMMUNITY IN THE MAKING · GROWING TOGETHER")}</small>
            <nav className="site-footer__legal" aria-label={text("隐私与支持", "Privacy and support")}>
              <Link href="/privacy">{text("隐私", "Privacy")}</Link>
              <Link href="/terms">{text("使用条款", "Terms")}</Link>
              <Link href="/digital-delivery">{text("数字交付与退款", "Digital delivery & refunds")}</Link>
              <Link href="/support">{text("支持", "Support")}</Link>
            </nav>
          </div>
        </footer>
      )}
      {hasNav && (
        <nav className="bottom-nav" aria-label={text("移动端主要导航", "Mobile navigation")}>
          <div className="bottom-nav__inner">
            {mobileNavItems.map((item) => (
              <Link key={item.key} href={item.href} className={activeKey === item.key ? "is-active" : ""} aria-current={activeKey === item.key ? "page" : undefined}>
                <span className="nav-mark" aria-hidden="true">{item.mark}</span>
                <span>{locale === "zh-CN" ? item.zh : item.en}</span>
                <small>{locale === "zh-CN" ? item.en : item.zh}</small>
              </Link>
            ))}
          </div>
        </nav>
      )}
      {!hasNav && <LocaleSwitcher className="locale-switcher--floating" />}
    </div>
  );
}

const profileProtectedRoutes = new Set<RouteName>([
  "generating",
  "today",
  "insight",
  "life-map",
  "domain",
  "ask",
  "iching",
  "timing",
  "report",
  "me",
]);

function ProfileGate({ children }: { children: ReactNode }) {
  const { text } = useLocale();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (readBirthProfile()) {
      queueMicrotask(() => setReady(true));
      return;
    }
    window.location.replace("/onboarding");
  }, []);

  if (!ready) {
    return (
      <div className="app-shell">
        <main className="main-content main-content--bare">
          <div className="page state-page profile-gate" role="status" aria-live="polite">
            <BrandMark large />
            <p className="eyebrow">{text("PRIVATE SESSION · 本地会话", "PRIVATE SESSION · ON THIS DEVICE")}</p>
            <h1>{text("正在确认你的出生档案", "Checking your birth profile")}</h1>
            <p>{text("如果当前浏览器没有已完成的出生资料，我们会安全地带你回到创建流程。", "If this browser does not have a completed birth profile, we will safely return you to onboarding.")}</p>
          </div>
        </main>
      </div>
    );
  }
  return children;
}

function SectionHeader({ eyebrow, title, action, href }: { eyebrow?: string; title: string; action?: string; href?: string }) {
  return (
    <div className="section-header">
      <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>
      {action && href && <Link href={href} className="text-link">{action} <span aria-hidden="true">↗</span></Link>}
    </div>
  );
}

function useActiveExperience() {
  const { locale, text } = useLocale();
  const [targetDate] = useState(() => localDateString());
  const [state, setState] = useState<{
    reading: BaziReading | null;
    experience: CalculatedExperience | null;
    calculationError: string | null;
    loading: boolean;
  }>({ reading: null, experience: null, calculationError: null, loading: true });

  useEffect(() => {
    let active = true;
    const profile = readBirthProfile();
    if (!profile) {
      queueMicrotask(() => active && setState({ reading: null, experience: null, calculationError: text("未找到当前会话的出生资料。", "No birth profile was found in this browser session."), loading: false }));
      return () => { active = false; };
    }
    Promise.all([import("../lib/bazi"), import("../lib/ziwei"), import("../lib/western"), import("../lib/experience")])
      .then(([baziModule, , , experienceModule]) => {
        const reading = baziModule.calculateBazi(profile);
        const experience = experienceModule.buildCalculatedExperience(reading, targetDate, locale);
        if (active) setState({ reading, experience, calculationError: null, loading: false });
      })
      .catch((error: unknown) => {
        if (active) setState({ reading: null, experience: null, calculationError: error instanceof Error ? error.message : text("命盘计算失败", "Chart calculation failed"), loading: false });
      });
    return () => { active = false; };
  }, [locale, targetDate, text]);
  // Every consumer returns its loading/error state while `experience` is null.
  // Once an experience exists it was built from the same non-null reading.
  return { ...state, reading: state.reading as BaziReading };
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
  const { text } = useLocale();
  const ziweiStatus = experience.ziwei.status === "calculated" ? text("紫微十二宫已排盘", "Zi Wei twelve-palace chart calculated") : text("紫微因出生时间未知而省略", "Zi Wei omitted because birth time is unknown");
  return (
    <details className="phase-scope">
      <summary><span aria-hidden="true">✓</span><strong>{text("三体系已计算", "Three systems calculated")}</strong><small>{text("查看范围与限制", "View scope and limits")}</small></summary>
      <p><strong>{text("八字、西占与当前时运均来自版本化计算。", "BaZi, Western astrology, and current timing come from versioned calculations.")}</strong> {ziweiStatus}{text("；综合洞察由可复算规则连接证据，不调用实时 AI，也不作结果保证。", ". Reproducible rules connect the evidence; no live AI or outcome guarantee is used.")}</p>
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
  const { text } = useLocale();
  const counts = reading.visibleElementCounts;
  const maxCount = Math.max(1, ...Object.values(counts));
  const accessibleSummary = elementOrder.map((element) => `${element} ${counts[element]}`).join(text("，", ", "));

  return (
    <figure className={`element-presence ${compact ? "element-presence--compact" : ""}`}>
      <header><span>{text("VISIBLE ELEMENTS · 表层五行", "VISIBLE ELEMENTS · FIVE ELEMENTS")}</span><strong>{text("八个干支中的出现次数", "Occurrences across the eight visible stems and branches")}</strong></header>
      <div className="element-presence__plot" role="img" aria-label={text(`表层五行数量：${accessibleSummary}`, `Visible Five Elements counts: ${accessibleSummary}`)}>
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
      <figcaption>{text("数量只描述表层干支，不等于旺衰、喜用神、吉凶或元素“缺失”。", "Counts describe visible stems and branches only. They are not strength, favorable elements, fortune, or an element ‘deficiency.’")}</figcaption>
    </figure>
  );
}

function BaziChartDrawing({ reading }: { reading: BaziReading }) {
  const { locale, text } = useLocale();
  const [activeKind, setActiveKind] = useState<PillarKind>("day");
  const pillars: Array<BaziPillar | null> = [reading.pillars.year, reading.pillars.month, reading.pillars.day, reading.pillars.time];
  const activePillar = pillars.find((pillar) => pillar?.kind === activeKind) ?? reading.pillars.day;
  const wheelStyle = { "--bazi-element-gradient": elementGradient(reading) } as React.CSSProperties;
  const hiddenStems = activePillar.hiddenStems.map((stem, index) => `${stem} · ${tenGodLabel(activePillar.hiddenTenGods[index] ?? "—", locale)}`);

  return (
    <div className="bazi-drawing">
      <div className="bazi-drawing__heading"><div><span>{text("INTERACTIVE CHART · 命盘图", "INTERACTIVE CHART · FOUR PILLARS")}</span><h3>{text("四柱围绕日主展开", "Four Pillars around the Day Master")}</h3></div><p>{text("点击四柱查看细节。圆环表示表层八个干支的五行数量；方位只用于信息阅读，不是另一套传统推算规则。", "Select a pillar to inspect it. The ring shows Five Elements counts across the eight visible characters; its orientation is for reading the interface, not another traditional rule.")}</p></div>
      <div className="bazi-drawing__layout">
        <div className="bazi-wheel" style={wheelStyle} aria-label={text(`八字命盘图，日主 ${reading.dayMaster.stem}，${reading.dayMaster.polarity}${reading.dayMaster.element}`, `BaZi chart, Day Master ${reading.dayMaster.stem}, ${polarityLabel(reading.dayMaster.polarity, locale, false)} ${fiveElementLabel(reading.dayMaster.element, locale, false)}`)}>
          <div className="bazi-wheel__rings" aria-hidden="true"><i /><i /><i /></div>
          <div className="bazi-wheel__core"><span>{text("日主", "Day Master")}</span><strong>{reading.dayMaster.stem}</strong><small>{locale === "zh-CN" ? `${reading.dayMaster.polarity}${reading.dayMaster.element}` : `${polarityLabel(reading.dayMaster.polarity, locale, false)} · ${fiveElementLabel(reading.dayMaster.element, locale, false)}`}</small></div>
          {pillars.map((pillar, index) => pillar ? (
            <button key={pillar.kind} type="button" className={`bazi-node bazi-node--${pillar.kind} ${activeKind === pillar.kind ? "is-active" : ""}`} aria-pressed={activeKind === pillar.kind} onClick={() => setActiveKind(pillar.kind)}>
              <span>{pillarLabel(pillar.kind, pillar.label, locale)}</span><b>{pillar.stem}</b><b>{pillar.branch}</b><small>{pillar.elements.map((element) => fiveElementLabel(element, locale, false)).join(" · ")}</small>
            </button>
          ) : (
            <button key={`missing-${index}`} type="button" className="bazi-node bazi-node--time is-missing" disabled><span>{text("时柱", "Time Pillar")}</span><b>—</b><b>—</b><small>{text("时间未知", "Time unknown")}</small></button>
          ))}
        </div>
        <aside className="pillar-inspector" aria-live="polite">
          <header><span>{pillarLabel(activePillar.kind, activePillar.label, locale)} · {activePillar.kind.toUpperCase()}</span><h3>{activePillar.ganZhi}</h3><p>{activePillar.elements.map((element) => fiveElementLabel(element, locale, false)).join(" · ")} · {text("纳音", "Na Yin (纳音)")} {activePillar.naYin}</p></header>
          <dl>
            <div><dt>{text("天干", "Heavenly stem")}</dt><dd>{activePillar.stem}</dd></div>
            <div><dt>{text("地支", "Earthly branch")}</dt><dd>{activePillar.branch}</dd></div>
            <div><dt>{text("天干十神", "Ten God of stem")}</dt><dd>{tenGodLabel(activePillar.stemTenGod, locale)}</dd></div>
            <div><dt>{text("藏干 · 支内十神", "Hidden stems · Ten Gods")}</dt><dd>{hiddenStems.join(" ／ ") || "—"}</dd></div>
          </dl>
          <div className="element-legend" aria-label={text("表层干支五行分布", "Visible Five Elements distribution")}>{elementOrder.map((element) => <span key={element} style={{ "--element-color": elementColor[element] } as React.CSSProperties}><i /><b>{fiveElementLabel(element, locale, locale === "en")}</b><small>{reading.visibleElementCounts[element]}</small></span>)}</div>
          <p className="pillar-inspector__note">{text("数量只描述表层干支，不等于旺衰、喜用神或吉凶。", "Counts describe visible stems and branches only; they are not strength, favorable elements, or fortune.")}</p>
        </aside>
      </div>
    </div>
  );
}

function ChartExplanation({ preview }: { preview: ChartExplanationPreview }) {
  const { text } = useLocale();
  const label = systemLabels[preview.system].full;
  const headingId = `chart-explanation-${preview.system}`;
  return (
    <aside className="chart-explanation" data-chart-system={preview.system} data-evidence-id={preview.evidenceFactId ?? undefined} aria-labelledby={headingId}>
      <div>
        <p className="eyebrow">{text("CHART NOTE · 命盘简读", "CHART NOTE · START HERE")}</p>
        <h3 id={headingId}>{text("先读这三点", "Three things to know")}</h3>
        <div className="chart-explanation__copy">
          {preview.lines.map((line) => <p key={line.label}><strong>{line.label}</strong>{line.text}</p>)}
        </div>
      </div>
      <footer className="chart-explanation__footer">
        <span>{text(`${label} 的计算事实与阅读边界保持免费公开；报告只增加整理、打印与连续练习。`, `${label} calculated facts and reading boundaries remain free; the report adds organization, printing, and a continuous practice.`)}</span>
      </footer>
    </aside>
  );
}

function BaziChartCard({ reading, explanation, id, visual = false }: { reading: BaziReading; explanation?: ChartExplanationPreview; id?: string; visual?: boolean }) {
  const { locale, text } = useLocale();
  const pillars = [reading.pillars.year, reading.pillars.month, reading.pillars.day, reading.pillars.time];
  return (
    <section className="bazi-chart" id={id}>
      <header className="bazi-chart__header">
        <div><p className="eyebrow">{text("YOUR FOUR PILLARS · 四柱排盘", "YOUR FOUR PILLARS · BAZI")}</p><h2>{visual ? text("你的八字命盘", "Your BaZi chart") : text("你的四柱", "Your Four Pillars")}</h2><p>{text("依据你输入的当地出生时间与所列规则计算；这里展示结构化事实，不生成性格或吉凶结论。", "Calculated from your local birth time using the listed conventions. This shows structured facts without generating personality or fortune conclusions.")}</p></div>
        <span className="calculation-label">{text("已排盘", "Calculated")} · v{reading.engine.version}</span>
      </header>
      {visual && <BaziChartDrawing reading={reading} />}
      <div className="bazi-pillars" aria-label={text("八字四柱", "BaZi Four Pillars")}>
        {pillars.map((pillar, index) => pillar ? (
          <article key={pillar.kind} className={pillar.kind === "day" ? "is-day" : ""}>
            <small>{pillarLabel(pillar.kind, pillar.label, locale)}</small>
            <div aria-label={`${pillarLabel(pillar.kind, pillar.label, locale)} ${pillar.ganZhi}`}><strong>{pillar.stem}</strong><strong>{pillar.branch}</strong></div>
            <span>{pillar.elements.map((element) => fiveElementLabel(element, locale, false)).join(" · ")}</span>
            <p>{tenGodLabel(pillar.stemTenGod, locale)} · {text("纳音", "Na Yin (纳音)")} {pillar.naYin}</p>
          </article>
        ) : (
          <article key={`missing-${index}`} className="is-missing">
            <small>{text("时柱", "Time Pillar")}</small><div><strong>—</strong><strong>—</strong></div><span>{text("出生时间未知", "Birth time unknown")}</span><p>{text("暂不推算", "Not calculated")}</p>
          </article>
        ))}
      </div>
      <div className="bazi-chart__summary">
        <div><span>{text("日主", "Day Master")}</span><strong>{reading.dayMaster.stem} · {locale === "zh-CN" ? `${reading.dayMaster.polarity}${reading.dayMaster.element}` : `${polarityLabel(reading.dayMaster.polarity, locale, false)} ${fiveElementLabel(reading.dayMaster.element, locale, false)}`}</strong><small>{elementEnglish[reading.dayMaster.element]}</small></div>
        <div><span>{text("农历日期", "Lunar date")}</span><strong>{reading.lunarDate}</strong><small>{reading.place.timeZone}</small></div>
      </div>
      <ElementPresenceGraph reading={reading} compact={!visual} />
      {explanation && <ChartExplanation preview={explanation} />}
      <details className="calculation-details">
        <summary>{text("查看计算规则与限制", "View calculation rules and limits")}</summary>
        <dl><div><dt>{text("年界", "Year boundary")}</dt><dd>{text("立春", "Start of Spring (立春)")}</dd></div><div><dt>{text("月界", "Month boundary")}</dt><dd>{text("节气中的「节」", "Sectional solar terms")}</dd></div><div><dt>{text("日界", "Day boundary")}</dt><dd>{text("当地民用时间 00:00", "00:00 local civil time")}</dd></div><div><dt>{text("真太阳时", "True solar time")}</dt><dd>{text("本阶段未校正", "Not corrected in this version")}</dd></div></dl>
        {reading.caveats.map((caveat) => <p key={caveat}>{baziCaveatLabel(caveat, locale)}</p>)}
      </details>
    </section>
  );
}

function EvidenceChip({ system, role }: { system: SystemId; role: "primary" | "supporting" | "context" }) {
  const { text } = useLocale();
  return <span className={`evidence-chip evidence-chip--${role}`} aria-label={`${systemLabels[system].full}, ${role === "primary" ? text("主要依据", "primary evidence") : role === "supporting" ? text("支持依据", "supporting evidence") : text("背景信息", "context")}`}><i aria-hidden="true" />{systemLabels[system].short}</span>;
}

function EvidenceList({ evidence, experience, factsOverride }: { evidence: EvidenceRef[]; experience: CalculatedExperience; factsOverride?: CalculatedExperience["facts"] }) {
  const { text } = useLocale();
  const resolved = resolveCalculatedEvidence(factsOverride ? { ...experience, facts: factsOverride } : experience, evidence);
  return (
    <div className="evidence-list">
      {resolved.map(({ fact, contribution, role }) => (
        <details key={fact.id} className="evidence-row">
          <summary>
            <span className={`system-seal system-seal--${fact.system}`} aria-hidden="true">{systemLabels[fact.system].short.slice(0, 1)}</span>
            <span><small>{systemLabels[fact.system].full}</small><strong>{fact.label}</strong></span>
            <span className="evidence-role">{role === "primary" ? text("主要", "Primary") : role === "supporting" ? text("支持", "Supporting") : text("背景", "Context")}</span>
          </summary>
          <div className="evidence-row__body">
            <div><span>{text("命盘事实", "Chart fact")}</span><p>{fact.rawLabel}</p></div>
            <div><span>{text("传统解释", "Traditional interpretation")}</span><p>{fact.traditionalInterpretation}</p></div>
            <div><span>{text("综合作用", "Role in synthesis")}</span><p>{contribution}</p></div>
            {fact.limitations && <p className="inline-notice">{text("计算边界：", "Calculation boundary: ")}{fact.limitations}</p>}
          </div>
        </details>
      ))}
    </div>
  );
}

const ziweiGridAreas = ["4 / 1", "4 / 2", "4 / 3", "4 / 4", "3 / 4", "2 / 4", "1 / 4", "1 / 3", "1 / 2", "1 / 1", "2 / 1", "3 / 1"];

function ZiweiChartCard({ reading, explanation }: { reading: ZiweiReading; explanation: ChartExplanationPreview }) {
  const { locale, text } = useLocale();
  if (reading.status === "unavailable") {
    return <section className="system-chart system-chart--unavailable"><p className="eyebrow">ZI WEI DOU SHU · 紫微斗数</p><h2>{text("出生时间未知，十二宫不推算", "Birth time unknown; the twelve palaces are not calculated")}</h2><p>{text(reading.caveats[0], "Life Map leaves the palace structure blank instead of inventing a substitute birth time.")}</p><ChartExplanation preview={explanation} /></section>;
  }
  return (
    <section className="system-chart ziwei-chart">
      <header className="system-chart__header"><div><p className="eyebrow">ZI WEI DOU SHU · 紫微斗数</p><h2>{text("十二宫星盘", "Twelve-palace chart")}</h2><p>{text("宫位、主星与四化来自本地确定性排盘。点击或放大页面可阅读全部细节。", "Palaces, major stars, and transformations come from deterministic calculation on this device. Zoom the page to read every detail.")}</p></div><span className="calculation-label">{text("已排盘", "Calculated")} · v{reading.engine.version}</span></header>
      <div className="ziwei-board" role="img" aria-label={text(`紫微十二宫，命宫在${reading.soulPalaceBranch}，身宫在${reading.bodyPalaceBranch}`, `Zi Wei twelve palaces; Life Palace at ${reading.soulPalaceBranch}, Body Palace at ${reading.bodyPalaceBranch}`)}>
        {reading.palaces.map((palace, index) => <article key={palace.id} style={{ gridArea: ziweiGridAreas[index] }} className={palace.name === "命宫" ? "is-soul" : palace.isBodyPalace ? "is-body" : ""}><header><b>{palaceLabel(palace.name, locale)}</b><span>{palace.heavenlyStem}{palace.earthlyBranch}</span></header><p>{palace.majorStars.map((star) => <span key={star.name}>{star.name}{star.transformation ? <i>{text(`化${star.transformation}`, `Transformation ${star.transformation}`)}</i> : null}</span>)}</p>{!palace.majorStars.length && <small>{text("无十四主星", "No major star")}</small>}{palace.isBodyPalace && <em>{text("身宫", "Body Palace (身宫)")}</em>}</article>)}
        <div className="ziwei-board__center"><small>{text("命宫", "Life Palace (命宫)")} · {reading.soulPalaceBranch}</small><strong>{reading.soulStar}</strong><span>{reading.fiveElementsClass}</span><p>{text("身主", "Body Ruler (身主)")} {reading.bodyStar} · {text("身宫", "Body Palace (身宫)")} {reading.bodyPalaceBranch}</p></div>
      </div>
      <ChartExplanation preview={explanation} />
      <details className="calculation-details"><summary>{text("查看紫微计算规则与限制", "View Zi Wei calculation rules and limits")}</summary><dl><div><dt>{text("引擎", "Engine")}</dt><dd>{reading.engine.id} {reading.engine.version}</dd></div><div><dt>{text("流派配置", "School configuration")}</dt><dd>{reading.engine.school}</dd></div><div><dt>{text("闰月", "Leap month")}</dt><dd>{text("前后半月调整开启", "Half-month adjustment enabled")}</dd></div><div><dt>{text("大限方向", "Decade-cycle direction")}</dt><dd>{reading.conventions.directionRule === "traditional-gender" ? text("使用所选传统输入", "Uses selected traditional input") : text("未应用", "Not applied")}</dd></div></dl>{reading.caveats.map((caveat) => <p key={caveat}>{text(caveat, "See the chart explanation above for the applicable calculation boundary.")}</p>)}</details>
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
  const { text } = useLocale();
  const placements = reading.placements.slice(0, 10);
  const placementByBody = new Map(placements.map((placement) => [placement.body, placement]));
  return (
    <section className="system-chart western-chart">
      <header className="system-chart__header"><div><p className="eyebrow">WESTERN NATAL · 西方占星</p><h2>{text("本命星盘", "Natal chart")}</h2><p>{text("行星黄经、相位与", "Planetary longitudes, aspects, and ")}{reading.completeness === "timed-chart" ? text("整宫制宫位", "whole-sign houses") : text("当日星座位置", "date-only zodiac positions")}{text("来自本地天文计算。", " come from astronomical calculation on this device.")}</p></div><span className="calculation-label">{text("已计算", "Calculated")} · v{reading.engine.version}</span></header>
      <div className="western-chart__layout">
        <svg className="western-wheel" viewBox="0 0 320 320" role="img" aria-label={text(`西方本命星盘，共 ${placements.length} 个行星位置`, `Western natal chart with ${placements.length} planetary positions`)}>
          <circle cx="160" cy="160" r="148" /><circle cx="160" cy="160" r="114" /><circle cx="160" cy="160" r="76" />
          {Array.from({ length: 12 }, (_, index) => { const inner = wheelPoint(index * 30, 114); const outer = wheelPoint(index * 30, 148); const label = wheelPoint(index * 30 + 15, 132); return <g key={westernSigns[index]}><line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} /><text x={label.x} y={label.y}>{westernSigns[index]}</text></g>; })}
          {reading.aspects.slice(0, 10).map((aspect) => { const first = placementByBody.get(aspect.bodyA); const second = placementByBody.get(aspect.bodyB); if (!first || !second) return null; const a = wheelPoint(first.longitude, 72); const b = wheelPoint(second.longitude, 72); return <line key={aspect.id} className={`aspect-line aspect-line--${aspect.type}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />; })}
          {placements.map((placement) => { const point = wheelPoint(placement.longitude, 94); return <g key={placement.id} className="planet-node"><circle cx={point.x} cy={point.y} r="12" /><text x={point.x} y={point.y + 1}>{westernGlyphs[placement.body] ?? placement.body.slice(0, 1)}</text></g>; })}
          <text className="western-wheel__center" x="160" y="155">{reading.angles.ascendant ? `ASC ${reading.angles.ascendant.sign}` : "TIME UNKNOWN"}</text><text className="western-wheel__sub" x="160" y="174">TROPICAL · WHOLE SIGN</text>
        </svg>
        <div className="western-placements">{placements.map((placement) => <div key={placement.id}><span>{westernGlyphs[placement.body] ?? "•"}</span><b>{placement.body}</b><p>{placement.sign} {placement.degree}°{String(placement.minute).padStart(2, "0")}′{placement.house ? ` · H${placement.house}` : ""}</p>{placement.retrograde && <small>R</small>}</div>)}</div>
      </div>
      <ChartExplanation preview={explanation} />
      <details className="calculation-details"><summary>{text("查看西占计算规则与限制", "View Western astrology rules and limits")}</summary><dl><div><dt>{text("黄道", "Zodiac")}</dt><dd>{text("热带黄道", "Tropical")}</dd></div><div><dt>{text("宫制", "House system")}</dt><dd>{text("整宫制", "Whole sign")}</dd></div><div><dt>{text("时区", "Time zone")}</dt><dd>IANA {text("历史偏移", "historical offset")} · UTC {reading.utcOffsetHours >= 0 ? "+" : ""}{reading.utcOffsetHours}</dd></div><div><dt>{text("出生时刻", "Birth instant")}</dt><dd>{reading.utcIso}</dd></div></dl>{reading.caveats.map((caveat) => <p key={caveat}>{text(caveat, reading.completeness === "timed-chart" ? "Uses a tropical zodiac and whole-sign houses; interpretations are reflective, not predictive." : "Birth time is unknown, so angles and houses are omitted.")}</p>)}</details>
    </section>
  );
}

function ProductVisual({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { locale, text } = useLocale();
  const style = { "--product-a": product.palette[0], "--product-b": product.palette[1], "--product-c": product.palette[2] } as React.CSSProperties;
  return (
    <div className={`product-visual ${compact ? "product-visual--compact" : ""}`} style={style}>
      <Image src={product.image.src} alt={productCopy(product, locale).alt} width={768} height={768} loading={compact ? "lazy" : "eager"} unoptimized />
      <span className="product-visual__veil" aria-hidden="true" />
      <small>{text("SYMBOLIC OBJECT · DEMO", "SYMBOLIC OBJECT · PREVIEW")}</small>
    </div>
  );
}

function ErrorState({ route, title, message, href, action }: { route: RouteName; title: string; message: string; href: string; action: string }) {
  const { text } = useLocale();
  return (
    <PageShell route={route} title={text("未找到", "Not found")} eyebrow="ROUTE ERROR" backHref={href}>
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

function CalculationLoadingState({ route }: { route: RouteName }) {
  const { text } = useLocale();
  return (
    <PageShell route={route} title={text("本地计算", "Local calculation")} eyebrow="CALCULATING">
      <div className="page state-page profile-gate" role="status" aria-live="polite">
        <BrandMark large />
        <p className="eyebrow">{text("LOCAL ENGINES · 本地计算", "LOCAL ENGINES · ON THIS DEVICE")}</p>
        <h1>{text("正在展开你的地图", "Opening your map")}</h1>
        <p>{text("计算引擎按需载入，出生资料仍只保留在当前浏览器会话中。", "The calculation engines load when needed. Your birth profile remains in this browser session.")}</p>
      </div>
    </PageShell>
  );
}

function LandingPage() {
  const { locale, text } = useLocale();
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
          <Link href="/" className="wordmark" aria-label={text("Life Map 首页", "Life Map home")}><BrandLockup tagline /></Link>
          <nav className="landing__nav" aria-label={text("首页导航", "Home navigation")}><a href="#intentions">{text("从问题开始", "Start with a question")}</a><Link href="/objects">{text("象征物商城", "Symbolic objects")}</Link><a href="#principles">{text("方法与依据", "Method & evidence")}</a></nav>
          <Link href={hasProfile ? "/today" : "/onboarding"} className="quiet-button quiet-button--active">{hasProfile ? text("继续我的地图", "Continue my map") : text("开始生成", "Begin")}</Link>
        </header>
        <div className="landing__geometry" aria-hidden="true"><span className="orbit" /><span className="confluence-lens" /><span className="broken-line" /></div>
        <section className="landing__hero">
          <div className="landing__brand-intro"><BrandMark large /><div><p className="eyebrow">EASTERN WISDOM · WESTERN STARS · SHARED GROWTH</p><span>{text("东方命理 × 西方占星 × 自我成长 × 同路社区", "Eastern traditions × Western astrology × personal growth × community")}</span></div></div>
          <h1>{text(<>观星读象，<br /><em>照见更好的自己</em></>, <>Read the symbols,<br /><em>become more fully yourself</em></>)}</h1>
          <p className="landing__lead">{text("融合东方命理与西方占星，把古老的观察变成理解自己的语言、走向更好自己的行动，也为与同路人彼此照见、共同成长留出空间。", "Life Map brings Eastern destiny traditions and Western astrology together, turning ancient observations into language for self-understanding, grounded action, and growth alongside others on the same path.")}</p>
          <div className="landing__actions">
            <Link href={hasProfile ? "/today" : "/onboarding"} className="button button--primary">{hasProfile ? text("继续上次的地图", "Continue my last map") : text("免费生成三体系快照", "Create a free three-system snapshot")} <span aria-hidden="true">→</span></Link>
            <a href="#principles" className="button button--tertiary">{text("了解我们如何解释", "See how interpretation works")}</a>
          </div>
          <p className="landing__proof">{text("约 2 分钟 · 无需注册 · 每条重要结论都能查看依据", "About 2 minutes · No account required · Evidence is visible for every major insight")}</p>
          <p className="disclosure">{text("基于传统解释体系的个人反思体验，不是科学预测、专业建议或结果保证。", "A personal reflection experience based on traditional interpretive systems—not scientific prediction, professional advice, or a guarantee of outcomes.")}</p>
        </section>
        {latestReflection && <section className="return-card"><div><p className="eyebrow">{text("CONTINUE YOUR THREAD · 继续上次的问题", "CONTINUE YOUR THREAD")}</p><h2>{latestReflection.question}</h2><p>{text("你为这件事保存了一个行动，可以回到地图继续观察和复盘。", "You saved an action for this question. Return to your map to continue observing and reviewing it.")}</p></div><Link href="/today" className="button button--secondary">{text("继续查看", "Continue")}</Link></section>}
        <section id="intentions" className="landing__intentions" aria-labelledby="landing-intentions-title">
          <div><p className="eyebrow">START WITH WHAT MATTERS</p><h2 id="landing-intentions-title">{text("你现在最想看清什么？", "What do you most want to understand right now?")}</h2></div>
          <div className="intent-grid">{focusOptions.map((raw) => { const option = focusOption(raw.id, locale); return <Link href={`/onboarding?intent=${option.id}`} key={option.id}><span>{option.label}</span><h3>{option.title}</h3><p>{option.description}</p><b aria-hidden="true">→</b></Link>; })}</div>
        </section>
        <section className="landing-shop" aria-labelledby="landing-shop-title">
          <header><div><p className="eyebrow">{text("LIFE MAP OBJECTS · 象征物商城", "LIFE MAP OBJECTS · SYMBOLIC COLLECTION")}</p><h2 id="landing-shop-title">{text("让一个主题，在日常里有具体的位置", "Give a reflection theme a place in daily life")}</h2><p>{text("天然石、五行手链与个人命盘艺术。每件物品都清楚说明材质、传统关联与普通用法，不承诺改变运气或现实结果。", "Stones, Five Elements bracelets, and personal chart art. Every object explains its material, traditional association, and everyday use without promising luck or outcomes.")}</p></div><Link href="/objects" className="button button--secondary">{text("进入商城", "Browse the collection")} <span aria-hidden="true">→</span></Link></header>
          <div className="landing-shop__grid">{shopPreview.map((product) => <Link href={`/objects/${product.slug}`} key={product.id} className="landing-shop__card"><ProductVisual product={product} compact /><div><small>{product.category === "stone" ? text("天然石", "Natural stone") : product.category === "bracelet" ? text("五行手链", "Five Elements bracelet") : text("命盘艺术", "Chart art")}</small><h3>{locale === "zh-CN" ? product.nameZh : product.nameEn}</h3><p>{locale === "zh-CN" ? product.nameEn : product.nameZh}</p><strong>{product.price}</strong></div></Link>)}</div>
          <p className="landing-shop__note">{text("商城可以直接浏览；个性化推荐仍只会在你先看到洞察与免费练习之后出现。", "You can browse directly. Personalized recommendations appear only after you have seen the insight and a free practice first.")}</p>
        </section>
        <section id="principles" className="landing__principles" aria-label={text("产品原则", "Product principles")}>
          <article><span>01</span><h2>{text("先计算", "Calculate first")}</h2><p>{text("版本化引擎先生成八字、紫微与西占事实，不让语言模型代替排盘。", "Versioned engines calculate BaZi, Zi Wei, and Western chart facts. A language model never replaces chart calculation.")}</p></article>
          <article><span>02</span><h2>{text("再解释", "Then interpret")}</h2><p>{text("每条重要洞察都能展开查看事实、传统解释、综合作用与限制。", "Every major insight can be opened to see the fact, traditional lens, role in synthesis, and limitations.")}</p></article>
          <article><span>03</span><h2>{text("最后行动", "Act last")}</h2><p>{text("产品不替你决定，而是帮助你保存一个现实中可以验证的小步骤。", "Life Map does not decide for you. It helps you save one small step that can be tested in real life.")}</p></article>
          <article><span>04</span><h2>{text("彼此照见", "Grow together")}</h2><p>{text("同路社区仍在生长；未来会围绕真实问题、行动与复盘连接经验，不制造权威或焦虑。", "The community is still growing. It will connect lived questions, actions, and review without manufacturing authority or anxiety.")}</p></article>
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

const onboardingStepsEn = [
  { id: "focus", number: "01", title: "What do you most want to understand?", helper: "Start with a real question. Your result will open the most relevant entry point first." },
  { id: "birth", number: "02", title: "Your birth details", helper: "A display name is optional. Date is required, and you can continue without an exact time." },
  { id: "location", number: "03", title: "Where were you born?", helper: "Confirm the city and historical time zone so all three calculations use the same instant." },
  { id: "review", number: "04", title: "Confirm and create your map", helper: "Calculated facts, traditional interpretation, and rule synthesis will remain clearly separated." },
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
  const { locale, text } = useLocale();
  const [results, setResults] = useState<BirthPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (query.trim().length < 2) {
      setMessage(text("请输入至少两个字，并尽量加上国家或地区。", "Enter at least two characters and include the country or region when possible."));
      return;
    }
    setSearching(true);
    setMessage("");
    setResults([]);
    try {
      const places = await searchBirthPlaces(query, { language: locale });
      setResults(places);
      if (!places.length) setMessage(text("没有找到匹配地点。请尝试“城市, 国家”的写法。", "No matching place was found. Try “city, country.”"));
    } catch {
      setMessage(text("地点服务暂时没有响应，请稍后重试。你已填写的其他资料不会丢失。", "The place service is not responding. Try again shortly; your other entries are still here."));
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
        <label className="field"><span>{text("城市与国家", "City and country")}</span><input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={text("例如 成都, 中国 / Paris, France", "For example: Paris, France / 成都, 中国")} autoComplete="off" /></label>
        <button className="button button--secondary" type="submit" disabled={searching}>{searching ? text("搜索中…", "Searching…") : text("搜索地点", "Search places")}</button>
      </form>
      <p className="location-search__privacy">{text("只有这次地点关键词会发送至 ", "Only this place-search phrase is sent to the ")}<a href="https://open-meteo.com/en/docs/geocoding-api" target="_blank" rel="noreferrer">{text("Open-Meteo 地点服务", "Open-Meteo geocoding service")}</a>{text("；姓名、出生日期和时间不会发送。", ". Your name, birth date, and birth time are not sent.")}</p>
      {message && <p className="inline-notice" role="status">{message}</p>}
      {results.length > 0 && <ul className="location-results" aria-label={text("地点搜索结果", "Place search results")}>{results.map((place) => <li key={place.id}><button type="button" onClick={() => choose(place)}><span><strong>{place.city}</strong><small>{[place.admin1, place.country].filter(Boolean).join(" · ")}</small></span><span><b>{place.timeZone}</b><small>{place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}</small></span></button></li>)}</ul>}
      {selectedPlace && <div className="selected-location" aria-live="polite"><span aria-hidden="true">✓</span><div><small>{text("已选择真实地点", "Verified place selected")}</small><strong>{selectedPlace.label}</strong><p>{selectedPlace.timeZone} · {selectedPlace.latitude.toFixed(4)}, {selectedPlace.longitude.toFixed(4)}</p></div></div>}
    </div>
  );
}

function OnboardingPage() {
  const { locale, text } = useLocale();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingDraft>(defaultOnboardingDraft);
  const [error, setError] = useState("");
  const [calculating, setCalculating] = useState(false);
  const steps = locale === "zh-CN" ? onboardingSteps : onboardingStepsEn;
  const current = steps[step];

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

  const next = async () => {
    if (!valid || calculating) return;
    if (step === steps.length - 1) {
      if (!form.selectedPlace) {
        setError(text("请先搜索并选择一个真实出生地点。", "Search for and select a real birth place first."));
        return;
      }
      try {
        setCalculating(true);
        const profile = {
          displayName: form.name.trim() || text("你", "You"),
          birthDate: form.date,
          birthTime: form.unknownTime ? null : form.time,
          timeAccuracy: form.unknownTime ? "unknown" as const : "known" as const,
          birthPlace: form.selectedPlace,
          traditionalGender: form.gender,
        };
        const [baziModule, , , experienceModule] = await Promise.all([import("../lib/bazi"), import("../lib/ziwei"), import("../lib/western"), import("../lib/experience")]);
        const bazi = baziModule.calculateBazi(profile);
        experienceModule.buildCalculatedExperience(bazi, localDateString(), locale);
        writeBirthProfile(profile);
        sessionStorage.setItem("life-map-focus", form.focus);
        sessionStorage.setItem("life-map-complete", "true");
        navigate("/generating");
      } catch {
        setCalculating(false);
        setError(text("这组出生资料暂时无法计算，请返回检查日期、时间和地点。", "These birth details cannot be calculated yet. Go back and check the date, time, and place."));
      }
    } else setStep((value) => value + 1);
  };

  return (
    <PageShell route="onboarding">
      <div className="onboarding">
        <header className="onboarding__header"><Link href="/" className="wordmark" aria-label={text("Life Map 首页", "Life Map home")}><BrandLockup tagline /></Link><span>{text("创建你的地图", "Create your map")}</span></header>
        <div className="progress-track" aria-label={text(`第 ${step + 1} 步，共 ${steps.length} 步`, `Step ${step + 1} of ${steps.length}`)}><i style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
        <section className="onboarding__panel">
          <div className="step-count"><span>{current.number}</span><small>OF 04</small></div>
          <p className="eyebrow">{text("BIRTH PROFILE · 出生档案", "BIRTH PROFILE · PRIVATE SESSION")}</p>
          <h1>{current.title}</h1>
          <p className="step-helper">{current.helper}</p>
          <div className="step-fields">
            {current.id === "focus" && <div className="focus-choice" role="radiogroup" aria-label={text("当前最想查看的主题", "The theme you most want to explore")}>{focusOptions.map((raw) => { const option = focusOption(raw.id, locale); return <button key={option.id} type="button" role="radio" aria-checked={form.focus === option.id} className={form.focus === option.id ? "is-selected" : ""} onClick={() => setForm({ ...form, focus: option.id })}><span>{option.label}</span><div><strong>{option.title}</strong><small>{option.description}</small></div><b aria-hidden="true">{form.focus === option.id ? "✓" : "→"}</b></button>; })}</div>}
            {current.id === "birth" && <div className="birth-fields">
              <label className="field"><span>{text("怎么称呼你？（选填）", "What should we call you? (optional)")}</span><input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={text("稍后也可以填写", "You can add this later")} /></label>
              <label className="field"><span>{text("出生日期", "Birth date")}</span><input type="date" min="1900-01-01" max="2100-12-31" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /><small>{text("当前引擎支持 1900—2100 年的公历输入。", "The current engines support Gregorian dates from 1900 to 2100.")}</small></label>
              <label className="field"><span>{text("当地时间", "Local time")}</span><input type="time" value={form.time} disabled={form.unknownTime} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label>
              <label className="check-field"><input type="checkbox" checked={form.unknownTime} onChange={(event) => setForm({ ...form, unknownTime: event.target.checked })} /><span><strong>{text("我不知道准确时间", "I do not know the exact time")}</strong><small>{text("会省略八字时柱与紫微十二宫；西占只显示当日行星星座，不推算上升与宫位。", "The BaZi Time Pillar and Zi Wei palaces will be omitted. Western astrology will show date-safe planetary positions without the Ascendant or houses.")}</small></span></label>
            </div>}
            {current.id === "location" && <BirthplaceSearch query={form.locationQuery} selectedPlace={form.selectedPlace} onQueryChange={(locationQuery) => setForm((value) => ({ ...value, locationQuery }))} onSelect={(selectedPlace) => setForm((value) => ({ ...value, selectedPlace }))} />}
            {current.id === "review" && <div className="review-card">
              <dl><div><dt>{text("先看主题", "Primary theme")}</dt><dd>{focusOption(form.focus, locale).label}</dd></div><div><dt>{text("称呼", "Name")}</dt><dd>{form.name.trim() || text("稍后填写", "Add later")}</dd></div><div><dt>{text("出生日期", "Birth date")}</dt><dd>{form.date}</dd></div><div><dt>{text("出生时间", "Birth time")}</dt><dd>{form.unknownTime ? text("未知（不计算时柱）", "Unknown (Time Pillar omitted)") : form.time}</dd></div><div><dt>{text("出生地点", "Birth place")}</dt><dd>{form.selectedPlace?.label ?? text("尚未选择", "Not selected")}</dd></div><div><dt>{text("时区", "Time zone")}</dt><dd>{form.selectedPlace?.timeZone ?? "—"}</dd></div></dl>
              <details className="advanced-input"><summary>{text("传统规则输入（选填）", "Traditional rule input (optional)")}</summary><p>{text("部分紫微流派使用传统男／女输入决定大限顺逆。若不选择，我们会省略这一层，不推测身份。", "Some Zi Wei schools use a traditional male/female input to determine decade-cycle direction. If you do not select one, this layer is omitted and identity is not inferred.")}</p><fieldset className="choice-field"><legend className="sr-only">{text("传统规则输入", "Traditional rule input")}</legend>{[["female", text("女性", "Female")], ["male", text("男性", "Male")], ["nonbinary", text("非二元", "Nonbinary")], ["prefer-not-to-say", text("不愿说明", "Prefer not to say")]].map(([value, label]) => <label key={value}><input type="radio" name="gender" value={value} checked={form.gender === value} onChange={(event) => setForm({ ...form, gender: event.target.value as OnboardingDraft["gender"] })} /><span>{label}</span></label>)}</fieldset></details>
              <label className="check-field"><input type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} /><span><strong>{text("我理解当前的计算范围", "I understand the current calculation scope")}</strong><small>{text("命盘与时运事实由版本化引擎计算；综合文字来自规则模板，不是实时 AI、科学预测或结果保证。", "Chart and timing facts come from versioned engines. Synthesis text comes from rule templates—not live AI, scientific prediction, or an outcome guarantee.")}</small></span></label>
            </div>}
          </div>
          {error && <p className="inline-notice" role="alert">{error}</p>}
          <div className="onboarding__actions"><button className="button button--secondary" disabled={calculating} onClick={() => step === 0 ? navigate("/") : setStep((value) => value - 1)}>{text("返回", "Back")}</button><button className="button button--primary" disabled={!valid || calculating} onClick={next}>{calculating ? text("正在验证计算…", "Validating calculations…") : step === steps.length - 1 ? text("生成我的人生地图", "Create my Life Map") : text("继续", "Continue")} <span aria-hidden="true">→</span></button></div>
        </section>
        <p className="onboarding__privacy">{text("你的出生信息是敏感数据。本次计算只保存在当前浏览器会话中。", "Birth information is sensitive. This calculation is kept only in the current browser session.")}</p>
      </div>
    </PageShell>
  );
}

const generationStages = ["正在验证出生资料与历史时区", "正在按节气排列四柱", "正在展开紫微十二宫", "正在定位出生时的行星与宫位", "正在连接可追溯的综合证据"];
const generationStagesEn = ["Validating birth details and historical time zone", "Arranging the Four Pillars by solar terms", "Opening the Zi Wei twelve palaces", "Locating natal planets and houses", "Connecting traceable synthesis evidence"];

function GeneratingPage() {
  const { locale, text } = useLocale();
  const stages = locale === "zh-CN" ? generationStages : generationStagesEn;
  const { reading, experience, calculationError, loading } = useActiveExperience();
  const [active, setActive] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const interval = window.setInterval(() => setActive((value) => {
      if (value >= stages.length - 1) { window.clearInterval(interval); setDone(true); return value; }
      return value + 1;
    }), reduced ? 180 : 620);
    return () => window.clearInterval(interval);
  }, [stages.length]);
  if (loading) return <CalculationLoadingState route="generating" />;
  if (!experience) return <ErrorState route="generating" title={text("这组资料暂时无法完整排盘", "This profile could not be fully calculated")} message={calculationError ?? text("请返回检查出生日期、时间和地点。", "Return and check the birth date, time, and place.")} href="/onboarding" action={text("返回检查资料", "Check details")} />;
  return (
    <PageShell route="generating">
      <div className="generation" aria-live="polite">
        <div className="generation__art" aria-hidden="true"><span className="generation-orbit" /><span className="generation-grid" /><BrandMark large /></div>
        <p className="eyebrow">CALIBRATING YOUR MAP</p>
        <h1>{done ? text("你的人生地图已生成", "Your Life Map is ready") : stages[active]}</h1>
        <p>{done ? text("八字、紫微、西占与当前时运已经完成本地计算；解释层仍与计算事实清楚分开。", "BaZi, Zi Wei, Western astrology, and current timing have been calculated on this device. Interpretation remains clearly separate from calculated facts.") : text("每个体系先生成可复算事实，再由规则层寻找共识与张力。", "Each system produces reproducible facts first; then the rules layer looks for consensus and tension.")}</p>
        <ol className="generation__stages">
          {stages.map((stage, index) => <li key={stage} className={index < active || done ? "is-complete" : index === active ? "is-active" : ""}><span>{index < active || done ? "✓" : String(index + 1).padStart(2, "0")}</span>{stage}</li>)}
        </ol>
        {done && <div className="generation__result" aria-label={text("命盘计算结果", "Chart calculation result")}><span><small>{text("八字", "BaZi")}</small><b>{reading.pillars.day.ganZhi}{text("日", " day")}</b></span><span><small>{text("紫微", "Zi Wei")}</small><b>{experience.ziwei.status === "calculated" ? `${experience.ziwei.soulPalaceBranch}${text("宫", " palace")}` : text("时间未知", "Time unknown")}</b></span><span><small>{text("太阳", "Sun")}</small><b>{experience.western.placements.find((item) => item.body === "Sun")?.sign ?? "—"}</b></span><span><small>{text("综合", "Synthesis")}</small><b>{experience.todayInsight.title}</b></span></div>}
        {done ? <button className="button button--primary" onClick={() => navigate("/today")}>{text("进入今日地图", "Open today’s map")} <span aria-hidden="true">→</span></button> : <button className="text-button" onClick={() => { setActive(stages.length - 1); setDone(true); }}>{text("跳过等待动画", "Skip animation")}</button>}
        <small className="calculation-label">{text("三体系已计算 · 规则综合", "Three systems calculated · Rule synthesis")} v{experience.engine.version}</small>
      </div>
    </PageShell>
  );
}

function ReportOffer({ compact = false }: { compact?: boolean }) {
  const { text } = useLocale();
  return (
    <section className={`report-offer ${compact ? "report-offer--compact" : ""}`}>
      <div className="report-offer__folio" aria-hidden="true"><span>1·10</span><i /><i /><i /></div>
      <div>
        <p className="eyebrow">PRIVATE PDF · FULL REPORT</p>
        <h2>{text("把三套命盘整理成十页私人报告", "Bring three chart systems into one private ten-page report")}</h2>
        <p>{text("一份报告包含八字、紫微、西占、当前时运、证据综合与七日练习。唯一价格是 USD $2；安全上线门槛未通过时不会进入结账。", "The report includes BaZi, Zi Wei, Western astrology, current timing, evidence synthesis, and a seven-day practice. It costs USD $2 once; checkout opens only when the secure delivery gate passes.")}</p>
        <div className="report-offer__meta"><strong>10 PAGES · PERSONAL</strong><strong>ONE-TIME · $2 USD</strong><span>{text("私人交付", "Private delivery")}</span></div>
        <Link href="/report" className="button button--primary">{text("查看完整报告说明", "View the full report")} <span aria-hidden="true">→</span></Link>
      </div>
    </section>
  );
}

function ReflectionThreadCard({ reflection }: { reflection: SavedReflection }) {
  const { locale, text } = useLocale();
  return (
    <section className="reflection-thread">
      <div><p className="eyebrow">{text("CONTINUE YOUR THREAD · 继续观察", "CONTINUE YOUR THREAD")}</p><h2>{reflection.question}</h2><p>{reflection.action ? text(`你保存的下一步：${reflection.action}`, `Your saved next step: ${reflection.action}`) : text("你已经保存了这个问题，可以继续补充一个现实中可验证的动作。", "You saved this question. Add an action you can test in real life when you are ready.")}</p></div>
      <div className="reflection-thread__meta"><span>{focusOption(reflection.focus, locale).label}</span>{reflection.reviewDate && <span>{text("复盘", "Review")} · {reflection.reviewDate}</span>}<Link href="/me#reflection-history">{text("查看记录", "View notes")} →</Link></div>
    </section>
  );
}

function TodayPage() {
  const { locale, text } = useLocale();
  const { reading, experience, calculationError, loading } = useActiveExperience();
  const { items: reflections } = useSavedReflections();
  const preferredFocus = useSessionFocus();
  if (loading) return <CalculationLoadingState route="today" />;
  if (!experience) return <ErrorState route="today" title={text("今天的地图无法完成计算", "Today’s map could not be calculated")} message={calculationError ?? text("请检查出生资料。", "Check your birth details.")} href="/onboarding" action={text("检查出生资料", "Check birth details")} />;
  const today = experience.todayInsight;
  const featured = products.find((product) => product.id === recommendation.productId) ?? products[0];
  const timing = experience.timing;
  const latestReflection = reflections[0] ?? null;
  const preferred = focusOption(preferredFocus, locale);
  const greeting = reading.profile.displayName === "你" || reading.profile.displayName === "You" ? text("你好", "Hello") : text(`你好，${reading.profile.displayName}`, `Hello, ${reading.profile.displayName}`);
  return (
    <PageShell route="today">
      <div className="page today-page">
        <header className="today-greeting"><div><span>{text("YOUR INNER WEATHER · 此刻的内在天气", "YOUR INNER WEATHER · TODAY")}</span><h1>{greeting}</h1></div><div className="day-seal" aria-label={text(`日主 ${reading.dayMaster.stem}，${reading.dayMaster.element}`, `Day Master ${reading.dayMaster.stem}, ${reading.dayMaster.element}`)}><span>{reading.dayMaster.stem}</span><small>{elementEnglish[reading.dayMaster.element]}</small></div></header>
        <PhaseScopeNotice experience={experience} />
        <section className="today-hero">
          <div className="today-hero__motif" aria-hidden="true"><i /><i /><i /></div>
          <p className="eyebrow">{today.eyebrow} · TODAY&apos;S THEME</p>
          <h2>{today.title}</h2>
          <h3>{today.subtitle}</h3>
          <p>{today.summary}</p>
          <div className="today-action"><span>{text("今天可以先做", "A practice for today")}</span><strong>{timing.practice}</strong></div>
          <div className="evidence-chips">{today.evidence.map((item) => <EvidenceChip key={item.factId} system={item.system} role={item.role} />)}</div>
          <Link href={`/insights/${today.id}`} className="button button--ink">{text("为什么？查看依据", "Why? View the evidence")} <span aria-hidden="true">↗</span></Link>
        </section>
        <section className="section-block">
          <SectionHeader eyebrow="REFLECT" title={latestReflection ? text("继续，或开始一个新问题", "Continue, or begin a new question") : text("从一个现实问题开始", "Start with a real question")} />
          <div className="quick-grid">
            <AskLink focus={preferredFocus} className="quick-card"><span className="quick-card__motif quick-card__motif--ask" aria-hidden="true" /><small>DECISION SESSION</small><h3>{text(`梳理${preferred.label}问题`, `Clarify a ${preferred.label.toLowerCase()} question`)}</h3><p>{preferred.description}</p><b aria-hidden="true">→</b></AskLink>
            <Link href="/iching" className="quick-card quick-card--cinnabar"><span className="quick-card__motif quick-card__motif--iching" aria-hidden="true" /><small>I CHING</small><h3>{text("问一卦", "Cast a hexagram")}</h3><p>{text("为此刻的具体问题留出空间", "Make room for a specific question in this moment")}</p><b aria-hidden="true">→</b></Link>
          </div>
        </section>
        {latestReflection && <ReflectionThreadCard reflection={latestReflection} />}
        <section className="section-block"><SectionHeader eyebrow="YOUR PATTERNS" title={text("生命领域", "Life domains")} action={text("查看全部", "View all")} href="/life-map" /><div className="domain-grid domain-grid--today">{experience.domains.slice(0, 4).map((domain, index) => <Link href={`/life-map/${domain.id}`} className="domain-card" key={domain.id}><span className="domain-card__index">0{index + 1}</span><small>{locale === "zh-CN" ? domain.nameEn : domain.nameZh}</small><h3>{locale === "zh-CN" ? domain.nameZh : domain.nameEn}</h3><p>{domain.pattern}</p><span className={`state state--${domain.state}`}>{domain.state === "active" ? text("多源交集", "Multi-system") : domain.state === "steady" ? text("独立线索", "Distinct signal") : text("保留张力", "Tension remains")}</span></Link>)}</div></section>
        <section className="timing-card">
          <div><p className="eyebrow">{text("CURRENT SEASON · 当前阶段", "CURRENT SEASON · CALCULATED")}</p><h2>{timing.title}</h2><p>{timing.summary}</p><Link href="/timing" className="text-link">{text("展开时间线", "Open the timeline")} <span aria-hidden="true">→</span></Link></div>
          <div className="mini-timeline" aria-label={text(`当前阶段从 ${timing.start} 至 ${timing.end}`, `Current period from ${timing.start} to ${timing.end}`)}><span>{timing.start}</span><div style={{ "--timeline-position": `${timing.nowPosition * 100}%` } as React.CSSProperties}><i style={{ left: `${timing.nowPosition * 100}%` }}><b>{text("现在", "Now")}</b></i></div><span>{timing.end}</span></div>
        </section>
        <section className="symbol-section">
          <ElementPresenceGraph reading={reading} compact />
          <div><p className="eyebrow">{text("RULE-BASED REFLECTION · 规则综合", "RULE-BASED REFLECTION · TRACEABLE")}</p><h2>{today.title}</h2><p>{text("左侧是确定性四柱结构；综合主题只引用上方可展开的计算证据，不从五行数量直接推导吉凶。", "The Four Pillars structure is deterministic. The synthesis cites expandable evidence above and never turns element counts directly into fortune judgments.")}</p><div className="practice"><span>{text("继续写一行", "Write one more line")}</span><p>{today.reflectionPrompt}</p></div></div>
        </section>
        <ReportOffer compact />
        {latestReflection?.action && <section className="section-block"><SectionHeader eyebrow="OPTIONAL OBJECT" title={text("在行动之后，才考虑一个象征提醒", "Consider a symbolic reminder only after the action")} /><article className="recommendation-card"><ProductVisual product={featured} /><div className="recommendation-card__content"><div><span className="pill">SYMBOLIC · OPTIONAL</span><h2>{locale === "zh-CN" ? featured.nameEn : featured.nameZh}</h2><h3>{locale === "zh-CN" ? featured.nameZh : featured.nameEn}</h3><p>{text("你已经先保存了一个不需要购买的行动。这件物品只作为可选提醒；它不改变命盘、时运或现实结果。", "You already saved an action that requires no purchase. This object is only an optional reminder; it cannot change a chart, timing, or real-world outcome.")}</p></div><div className="recommendation-card__footer"><span>{featured.price}</span><Link href={`/objects/${featured.slug}`} className="button button--secondary">{text("查看象征含义", "View symbolic meaning")}</Link></div></div></article></section>}
      </div>
    </PageShell>
  );
}

function InsightPage({ id }: { id?: string }) {
  const { text } = useLocale();
  const { experience, calculationError, loading } = useActiveExperience();
  if (loading) return <CalculationLoadingState route="insight" />;
  if (!experience) return <ErrorState route="insight" title={text("洞察证据无法完成计算", "Insight evidence could not be calculated")} message={calculationError ?? text("请检查出生资料。", "Check your birth details.")} href="/onboarding" action={text("检查出生资料", "Check birth details")} />;
  const insight = id === experience.todayInsight.id || !id ? experience.todayInsight : Object.values(experience.domainInsights).find((item) => item.id === id);
  if (!insight) return <ErrorState route="insight" title={text("没有找到这个洞察", "Insight not found")} message={text("这个计算洞察链接不存在，或已经由新版规则替换。", "This calculated insight link does not exist or has been replaced by a newer rules version.")} href="/today" action={text("回到今日", "Back to Today")} />;
  return (
    <PageShell route="insight" title={text("为什么？", "Why?")} eyebrow="INSIGHT EVIDENCE" backHref="/today">
      <div className="page reading-page">
        <header className="reading-hero"><p className="eyebrow">{insight.eyebrow} · {insight.kind === "consensus" ? "MULTI-SYSTEM CONSENSUS" : "TENSION"}</p><h1>{insight.title}</h1><h2>{insight.subtitle}</h2><p>{insight.summary}</p><div className="evidence-chips">{insight.evidence.map((item) => <EvidenceChip key={item.factId} system={item.system} role={item.role} />)}</div></header>
        <section className="reading-section"><span className="section-number">01</span><SectionHeader title={text("综合解释", "Synthesis")} eyebrow="SYNTHESIS" /><p className="reading-copy">{insight.kind === "consensus" ? text("这一主题在两个以上体系中出现，但每个体系提供了不同角度。共同点不是结果预测，而是此刻值得观察的方向。", "This theme appears in two or more systems, each from a different angle. The overlap is a direction worth observing—not a predicted outcome.") : text("不同体系在这里保留了有意义的张力；我们不会把它们平均成一个分数。", "The systems preserve a meaningful tension here; Life Map does not average them into a score.")}</p></section>
        <section className="reading-section"><span className="section-number">02</span><SectionHeader title={text("依据来自哪里", "Where the evidence comes from")} eyebrow="EVIDENCE" /><EvidenceList evidence={insight.evidence} experience={experience} /></section>
        {insight.tensionNote && <section className="tension-card"><p className="eyebrow">{text("TENSION · 张力", "TENSION · KEEP THE DIFFERENCE")}</p><h2>{text("不需要急着消除的矛盾", "A contradiction you do not need to erase")}</h2><p>{insight.tensionNote}</p></section>}
        <section className="reflection-card"><span aria-hidden="true">?</span><div><p className="eyebrow">REFLECTION PROMPT</p><h2>{insight.reflectionPrompt}</h2><AskLink prompt={insight.reflectionPrompt} className="button button--primary">{text("和命盘继续聊", "Continue with this question")} <span>→</span></AskLink></div></section>
        <p className="disclosure disclosure--center">{text("命盘事实来自版本化本地引擎；综合文字来自规则模板，用于反思，不是实时 AI 或科学预测。", "Chart facts come from versioned local engines. Rule templates create reflective synthesis; this is not live AI or scientific prediction.")}</p>
      </div>
    </PageShell>
  );
}

function LifeMapPage() {
  const { locale, text } = useLocale();
  const { reading, experience, calculationError, loading } = useActiveExperience();
  if (loading) return <CalculationLoadingState route="life-map" />;
  if (!experience) return <ErrorState route="life-map" title={text("命盘无法完成计算", "Your charts could not be calculated")} message={calculationError ?? text("请检查出生资料。", "Check your birth details.")} href="/onboarding" action={text("检查出生资料", "Check birth details")} />;
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
          <div><p className="eyebrow">{text("YOUR NATAL BLUEPRINT · 你的底图", "YOUR NATAL BLUEPRINT · CALCULATED")}</p><h1>{identity.title.split(" · ")[0]}<br /><i>×</i> {identity.title.split(" · ")[1] ?? text("观察", "Observe")}</h1><p>{identity.summary}</p><div className="evidence-chips">{identity.evidence.map((item) => <EvidenceChip key={item.factId} system={item.system} role={item.role} />)}</div></div>
          <figure className="map-diagram">
            <Image
              className="map-diagram__image"
              src="/images/brand/life-map-confluence.webp"
              alt={text("东方四柱与西方星盘交织的 Life Map 品牌抽象图", "Life Map brand artwork weaving Eastern Four Pillars with a Western celestial chart")}
              width={768}
              height={768}
              preload
              unoptimized
            />
            <span className="map-diagram__core" aria-hidden="true"><BrandMark large /><b>命</b></span>
            <figcaption>{text("BRAND SYMBOL · 品牌意象，非实际排盘", "BRAND SYMBOL · DECORATIVE, NOT A CALCULATED CHART")}</figcaption>
          </figure>
        </header>
        <div className="map-note"><span>{text("如何阅读", "How to read this")}</span><p>{text("这些领域不是命运评分，而是理解长期模式的入口。当前活跃表示本期内容的主题强调，不代表好或坏。", "These domains are not fate scores. They are entry points for understanding longer patterns. Active means emphasized in the current material—not good or bad.")}</p></div>
        <section className="section-block"><SectionHeader eyebrow="EIGHT DOMAINS" title={text("先从生活领域进入", "Begin with a life domain")} /><div className="domain-grid domain-grid--all">{experience.domains.map((domain, index) => <Link href={`/life-map/${domain.id}`} className="domain-card domain-card--wide" key={domain.id}><span className="domain-card__index">{String(index + 1).padStart(2, "0")}</span><div><small>{locale === "zh-CN" ? domain.nameEn : domain.nameZh}</small><h3>{locale === "zh-CN" ? domain.nameZh : domain.nameEn}</h3></div><p>{domain.pattern}</p><span className={`state state--${domain.state}`}>{domain.state === "active" ? text("多源交集", "Multi-system") : domain.state === "steady" ? text("独立线索", "Distinct signal") : text("保留张力", "Tension remains")}</span><b aria-hidden="true">↗</b></Link>)}</div></section>
        <section className="chart-lab">
          <SectionHeader eyebrow={text("PROFESSIONAL VIEW · 专业视图", "PROFESSIONAL VIEW · CALCULATED CHARTS")} title={text("需要时，再展开完整命盘", "Open the full charts when you need the detail")} />
          <p className="chart-lab__intro">{text("生命领域负责回答“这和我有什么关系”；完整盘负责展示“底层事实是什么”。所有计算细节保持免费可查。", "Life domains answer ‘how does this relate to me?’ The full charts show the underlying facts. Every calculation detail remains free to inspect.")}</p>
          <details className="chart-system-disclosure"><summary><span>01</span><div><small>BAZI · 八字</small><strong>{text("四柱与表层五行", "Four Pillars and visible Five Elements")}</strong></div><b>{text("展开命盘", "Open chart")}</b></summary><BaziChartCard reading={reading} explanation={chartExplanations.bazi} id="bazi-chart" visual /></details>
          <details className="chart-system-disclosure"><summary><span>02</span><div><small>ZI WEI DOU SHU · 紫微斗数</small><strong>{text("十二宫与主星", "Twelve palaces and major stars")}</strong></div><b>{text("展开命盘", "Open chart")}</b></summary><ZiweiChartCard reading={experience.ziwei} explanation={chartExplanations.ziwei} /></details>
          <details className="chart-system-disclosure"><summary><span>03</span><div><small>WESTERN NATAL · 西方占星</small><strong>{text("行星、宫位与相位", "Planets, houses, and aspects")}</strong></div><b>{text("展开命盘", "Open chart")}</b></summary><WesternChartCard reading={experience.western} explanation={chartExplanations.astrology} /></details>
        </section>
      </div>
    </PageShell>
  );
}

function DomainPage({ id }: { id?: string }) {
  const { locale, text } = useLocale();
  const { experience, calculationError, loading } = useActiveExperience();
  if (loading) return <CalculationLoadingState route="domain" />;
  if (!experience) return <ErrorState route="domain" title={text("生命领域无法完成计算", "This life domain could not be calculated")} message={calculationError ?? text("请检查出生资料。", "Check your birth details.")} href="/onboarding" action={text("检查出生资料", "Check birth details")} />;
  const domain = experience.domains.find((item) => item.id === (id ?? "career"));
  if (!domain) return <ErrorState route="domain" title={text("没有找到这个生命领域", "Life domain not found")} message={text("这个领域不存在。你可以回到 Life Map 查看八个可用领域。", "This domain does not exist. Return to Life Map to see the eight available domains.")} href="/life-map" action={text("查看 Life Map", "View Life Map")} />;
  const insight = experience.domainInsights[domain.id];
  return (
    <PageShell route="domain" title={locale === "zh-CN" ? `${domain.nameZh} / ${domain.nameEn}` : `${domain.nameEn} / ${domain.nameZh}`} eyebrow="LIFE DOMAIN" backHref="/life-map">
      <div className="page domain-page">
        <header className="domain-hero"><p className="eyebrow">{domain.nameEn.toUpperCase()} PATTERN</p><h1>{domain.pattern}</h1><h2>{insight.subtitle}</h2><p>{insight.summary}</p></header>
        <section className="calculation-coverage"><div><p className="eyebrow">CALCULATION COVERAGE</p><h2>{text("本领域用了哪些真实事实", "Which calculated facts support this domain")}</h2><p>{text("数量只表示证据来源覆盖，不是置信度或命运评分。", "The count shows source coverage, not confidence or a fate score.")}</p></div>{(["bazi", "ziwei", "astrology"] as SystemId[]).map((system) => <article key={system}><span className={`system-seal system-seal--${system}`}>{systemLabels[system].short.slice(0, 1)}</span><div><b>{systemLabels[system].full}</b><small>{insight.evidence.some((item) => item.system === system) ? text("已连接计算事实", "Calculated fact connected") : text("此领域没有可用事实", "No available fact for this domain")}</small></div></article>)}</section>
        <section className="reading-section"><SectionHeader eyebrow="MULTI-SYSTEM READING" title={text("三个体系如何描述它", "How three systems describe it")} /><p className="reading-copy">{text("这不是把三个传统相加成一个结论，而是让每条线索保留自己的来源与语言，再观察它们在哪里相遇。", "This does not add three traditions into one conclusion. Each signal keeps its own source and language so you can see where they meet.")}</p><EvidenceList evidence={insight.evidence} experience={experience} /></section>
        {insight.tensionNote && <section className="tension-card"><p className="eyebrow">A USEFUL TENSION</p><h2>{text("值得保留的张力", "A tension worth keeping")}</h2><p>{insight.tensionNote}</p></section>}
        <section className="reflection-card"><span aria-hidden="true">?</span><div><p className="eyebrow">TAKE THIS WITH YOU</p><h2>{insight.reflectionPrompt}</h2><AskLink prompt={insight.reflectionPrompt} className="button button--primary">{text(`问一个${domain.nameZh}问题`, `Ask an ${domain.nameEn.toLowerCase()} question`)} <span>→</span></AskLink></div></section>
      </div>
    </PageShell>
  );
}

function AskPage() {
  const { locale, text, inputLocale } = useLocale();
  const { experience, calculationError, loading } = useActiveExperience();
  const [focus, setFocus] = useState<ReflectionFocus>("relationships");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState("");
  const [concern, setConcern] = useState("");
  const [deadline, setDeadline] = useState("");
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [safetyBoundary, setSafetyBoundary] = useState<SafetyBoundary | null>(null);
  useEffect(() => {
    if (!experience) return;
    const handoff = consumeAskHandoff();
    queueMicrotask(() => {
      if (handoff?.focus) setFocus(handoff.focus);
      if (handoff?.prompt) setQuestion(handoff.prompt);
    });
  }, [experience]);
  if (loading) return <CalculationLoadingState route="ask" />;
  if (!experience) return <ErrorState route="ask" title={text("问命盘需要先完成计算", "Complete your charts before asking")} message={calculationError ?? text("请检查出生资料。", "Check your birth details.")} href="/onboarding" action={text("检查出生资料", "Check birth details")} />;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    const boundary = classifySafetyConcern([question, options, concern].filter(Boolean).join(" "));
    if (boundary) {
      setAnswer(null);
      setSafetyBoundary(boundary);
      return;
    }
    const responseLocale = inputLocale(question);
    const routedQuestion = `${focusOption(focus, responseLocale).label}: ${question}`;
    setSafetyBoundary(null);
    setAnswer(routeCalculatedAsk(routedQuestion, experience, focusDomains[focus], responseLocale));
  };
  const reset = () => {
    setAnswer(null);
    setSafetyBoundary(null);
    setQuestion("");
    setOptions("");
    setConcern("");
    setDeadline("");
  };
  return (
    <PageShell route="ask">
      <div className={`page ask-page ${answer || safetyBoundary ? "ask-page--answered" : ""}`}>
        {safetyBoundary ? <SafetyNotice boundary={safetyBoundary} onReset={reset} /> : !answer ? <>
          <header className="ask-hero"><div className="ask-orbit" aria-hidden="true"><span>?</span></div><p className="eyebrow">{text("DECISION SESSION · 决策反思", "DECISION SESSION · CHART REFLECTION")}</p><h1>{text(<>先把问题<br />说具体一点</>, <>Make the question<br />more specific</>)}</h1><p>{text("Life Map 不替你选择。它会把现实问题与已计算事实并置，指出共识、张力和一个可以验证的小步骤。", "Life Map does not choose for you. It places your real question beside calculated facts, then shows consensus, tension, and one small step you can test.")}</p><span className="fixture-label">{text("CALCULATED · 规则综合，不调用实时 AI", "CALCULATED · RULE SYNTHESIS, NO LIVE AI")}</span></header>
          <form className="decision-form" onSubmit={submit}>
            <fieldset className="decision-focus"><legend>{text("这次主要关于", "This is mainly about")}</legend>{focusOptions.map((raw) => { const option = focusOption(raw.id, locale); return <label key={option.id} className={focus === option.id ? "is-selected" : ""}><input type="radio" name="focus" value={option.id} checked={focus === option.id} onChange={() => setFocus(option.id)} /><span>{option.label}</span></label>; })}</fieldset>
            <label className="field field--textarea"><span>{text("你正在面对什么问题？", "What question are you facing?")}</span><textarea id="chart-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={text("例如：我想继续这段关系，但不知道该如何说清边界。", "For example: I want to stay in this relationship, but I do not know how to state my boundary.")} rows={3} /></label>
            <div className="decision-form__grid">
              <label className="field"><span>{text("你正在比较哪些选择？（选填）", "Which options are you comparing? (optional)")}</span><input value={options} onChange={(event) => setOptions(event.target.value)} placeholder={text("留下 / 离开 / 先谈一次", "Stay / leave / have one conversation first")} /></label>
              <label className="field"><span>{text("什么时候需要决定？（选填）", "When do you need to decide? (optional)")}</span><input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label>
            </div>
            <label className="field"><span>{text("你最担心什么？（选填）", "What worries you most? (optional)")}</span><input value={concern} onChange={(event) => setConcern(event.target.value)} placeholder={text("失去关系、做错选择、再次重复旧模式…", "Losing the relationship, choosing badly, repeating an old pattern…")} /></label>
            <div className="decision-form__footer"><p>{text("输入越具体，规则回答越容易连接到相关领域。不会把问题内容发送到外部服务。", "Specific input helps the rules connect to the right domain. Your question is not sent to an external service.")}</p><button className="button button--primary" type="submit" disabled={!question.trim()}>{text("生成我的决策地图", "Create my decision map")} <span aria-hidden="true">→</span></button></div>
          </form>
          <section className="suggestions"><p className="eyebrow">TRY A STARTER</p>{focusOptions.map((raw, index) => { const option = focusOption(raw.id, locale); return <button key={option.id} type="button" onClick={() => { setFocus(option.id); setQuestion(option.prompt); }}><span>0{index + 1}</span>{option.prompt}<b>{text("填入", "Use")}</b></button>; })}</section>
        </> : <AskAnswer answer={answer} question={question} options={options} concern={concern} deadline={deadline} focus={focus} experience={experience} onReset={reset} />}
      </div>
    </PageShell>
  );
}

function SafetyNotice({ boundary, onReset }: { boundary: SafetyBoundary; onReset: () => void }) {
  const { text } = useLocale();
  return (
    <article className={`safety-notice ${boundary.urgent ? "safety-notice--urgent" : ""}`} role={boundary.urgent ? "alert" : "status"}>
      <p className="eyebrow">{boundary.eyebrow}</p>
      <h1>{boundary.title}</h1>
      <p>{boundary.message}</p>
      <ul>{boundary.nextSteps.map((step) => <li key={step}>{step}</li>)}</ul>
      <div className="safety-notice__actions">
        <button className="button button--primary" type="button" onClick={onReset}>{text("换一个反思问题", "Ask a different reflection question")}</button>
        <Link className="button button--secondary" href="/support">{text("查看支持与产品边界", "View support and product boundaries")}</Link>
      </div>
      <small>{text("Life Map 不会根据命盘、卦象或星盘给出高风险专业判断。", "Life Map does not use charts or hexagrams to make high-risk professional judgments.")}</small>
    </article>
  );
}

function AskAnswer({ answer, question, options, concern, deadline, focus, experience, onReset }: { answer: AskResponse; question: string; options: string; concern: string; deadline: string; focus: ReflectionFocus; experience: CalculatedExperience; onReset: () => void }) {
  const { inputLocale } = useLocale();
  const responseLocale = inputLocale(question);
  const isEnglish = responseLocale === "en";
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
      <header><button className="text-button" onClick={onReset}>← {isEnglish ? "New question" : "新问题"}</button><p className="eyebrow">YOUR QUESTION</p><blockquote>{question}</blockquote><span className="kind-label">{answer.kind === "consensus" ? (isEnglish ? "Multi-system consensus" : "多体系共识") : answer.kind === "tension" ? (isEnglish ? "Meaningful tension" : "有意义的张力") : (isEnglish ? "Distinct signal" : "独立线索")}</span><h1>{answer.title}</h1><p>{answer.directAnswer}</p></header>
      {(options || concern || deadline) && <section className="decision-context"><p className="eyebrow">{isEnglish ? "YOUR REAL-WORLD CONTEXT" : "YOUR REAL-WORLD CONTEXT · 现实条件"}</p><dl>{options && <div><dt>{isEnglish ? "Comparing" : "正在比较"}</dt><dd>{options}</dd></div>}{concern && <div><dt>{isEnglish ? "Main concern" : "最担心"}</dt><dd>{concern}</dd></div>}{deadline && <div><dt>{isEnglish ? "Decision date" : "决定期限"}</dt><dd>{deadline}</dd></div>}</dl><p>{isEnglish ? "This context helps preserve the question, but it is not treated as chart evidence or proof of an outcome." : "这些内容帮助你保存问题背景，但不会被当成命盘事实或证明某个结果。"}</p></section>}
      {answer.sections.map((section, index) => <section className="answer-section" key={section.heading}><span>0{index + 1}</span><div><h2>{section.heading}</h2><p>{section.body}</p><EvidenceList evidence={section.evidence} experience={experience} factsOverride={answer.localizedFacts} /></div></section>)}
      <section className="answer-reflection"><p className="eyebrow">A QUESTION TO KEEP</p><h2>{answer.reflectionQuestion}</h2></section>
      <section className="action-plan"><p className="eyebrow">{isEnglish ? "ONE REVERSIBLE STEP" : "ONE REVERSIBLE STEP · 一个可撤回的小步骤"}</p><h2>{isEnglish ? "What will you test first?" : "你准备先验证什么？"}</h2><p>{isEnglish ? "Save one action that requires no purchase and produces something you can observe in real life. Life Map does not decide for you." : "先保存一个不需要购买、可以在现实中观察结果的动作。Life Map 不替你做决定。"}</p><label className="field"><span>{isEnglish ? "My next step" : "我的下一步"}</span><input value={action} onChange={(event) => { setAction(event.target.value); setSaved(false); }} placeholder={isEnglish ? "For example: set aside 20 uninterrupted minutes to state the boundary clearly." : "例如：约一个不被打断的 20 分钟，把边界说清楚。"} /></label><label className="field"><span>{isEnglish ? "When will you review it?" : "什么时候回来复盘？"}</span><input type="date" value={reviewDate} onChange={(event) => { setReviewDate(event.target.value); setSaved(false); }} /></label><button className="button button--primary" type="button" disabled={!action.trim()} onClick={save}>{saved ? (isEnglish ? "Saved in this session" : "已保存到本次会话") : (isEnglish ? "Save action and review date" : "保存行动与复盘日期")}</button>{saved && <p className="save-confirmation" role="status">{isEnglish ? "Saved. View it under Me and continue the thread from Today." : "已保存。你可以在“我的”中查看，并从 Today 继续这条线索。"}</p>}</section>
      {answer.relatedDomain && <Link href={`/life-map/${answer.relatedDomain}`} className="button button--secondary">{isEnglish ? "View related life domain" : "查看相关生命领域"} <span>↗</span></Link>}
      <p className="disclosure">{answer.disclaimer} {isEnglish ? "Saved content stays only in the current browser session." : "保存内容只保留在当前浏览器会话中。"}</p>
    </article>
  );
}

function Hexagram({ lines, count = 6 }: { lines: IChingLine[]; count?: number }) {
  const { text } = useLocale();
  return <div className="hexagram" aria-label={text(`六爻卦象，已显示 ${count} 爻`, `Six-line hexagram with ${count} lines shown`)}>{lines.slice(0, count).reverse().map((line, index) => <div key={line.position} style={{ "--line-delay": `${index * 75}ms` } as React.CSSProperties} className={`hex-line hex-line--${line.polarity} ${line.moving ? "is-moving" : ""}`}><span /><span />{line.moving && <b>○</b>}<small>{line.position}</small></div>)}</div>;
}

function IChingPage() {
  const { locale, text, inputLocale } = useLocale();
  const [question, setQuestion] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [casts, setCasts] = useState(0);
  const [safetyBoundary, setSafetyBoundary] = useState<SafetyBoundary | null>(null);
  const activeQuestion = question ?? (locale === "zh-CN" ? iching.sampleQuestion : "How can I begin this new direction without rushing?");
  const resultLocale = inputLocale(activeQuestion);
  const cast = () => {
    if (!started) {
      const boundary = classifySafetyConcern(activeQuestion);
      if (boundary) {
        setSafetyBoundary(boundary);
        return;
      }
    }
    setSafetyBoundary(null);
    setStarted(true);
    setCasts((value) => Math.min(6, value + 1));
  };
  const reset = () => { setQuestion(""); setCasts(0); setStarted(false); setSafetyBoundary(null); };
  return (
    <PageShell route="iching" title={text("问一卦 / I Ching", "I Ching / 易经")} eyebrow="REFLECTION RITUAL" backHref="/ask">
      <div className="page iching-page">
        {safetyBoundary ? <SafetyNotice boundary={safetyBoundary} onReset={reset} /> : !started ? <section className="iching-intro"><div className="iching-mark" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div><p className="eyebrow">A QUESTION FOR THIS MOMENT</p><h1>{text(<>先把问题<br />放在心里</>, <>Hold the question<br />for a moment</>)}</h1><p>{text("易经在这里是一种为具体问题留出空间的传统反思实践。它不会替你预测或保证结果。", "Here, the I Ching is a traditional reflection practice that makes space for a specific question. It does not predict or guarantee an outcome.")}</p><label className="field field--textarea"><span>{text("你想问什么？", "What would you like to ask?")}</span><textarea value={activeQuestion} onChange={(event) => setQuestion(event.target.value)} rows={3} /></label><button className="button button--primary" disabled={!activeQuestion.trim()} onClick={cast}>{text("开始投掷", "Begin the cast")} <span>→</span></button></section> : casts < 6 ? <section className="casting"><p className="eyebrow">{text("BUILDING FROM THE BOTTOM · 从下往上", "BUILDING FROM THE BOTTOM")}</p><h1>{text(`第 ${casts + 1} 次，共 6 次`, `Cast ${casts + 1} of 6`)}</h1><p className="casting__question">“{activeQuestion}”</p><div className="cast-stage"><Hexagram lines={iching.lines} count={casts} /><div className="coins" aria-hidden="true"><span>{text("阴", "Yin")}</span><span>{text("阳", "Yang")}</span><span>{text("阴", "Yin")}</span></div></div><button className="button button--primary" onClick={cast}>{text("投掷三枚硬币", "Cast three coins")}</button><button className="text-button" onClick={() => setCasts(6)}>{text("直接查看演示结果", "View the deterministic demo result")}</button></section> : <section className="iching-result"><header><div><p className="eyebrow">{resultLocale === "en" ? "HEXAGRAM 63 · REFLECTION" : "HEXAGRAM 63 · 演示结果"}</p><h1>{resultLocale === "en" ? iching.primary.nameEn : iching.primary.nameZh}</h1><h2>{resultLocale === "en" ? iching.primary.nameZh : iching.primary.nameEn}</h2></div><Hexagram lines={iching.lines} /></header><div className="result-transition"><span>{resultLocale === "en" ? iching.primary.nameEn : iching.primary.nameZh} · 63</span><i>{resultLocale === "en" ? "Moving line 2 →" : "六二动爻 →"}</i><span>{resultLocale === "en" ? iching.relating?.nameEn : iching.relating?.nameZh} · 05</span></div><section><p className="eyebrow">{resultLocale === "en" ? "SOURCE TEXT · TRADITIONAL EXCERPT" : `ORIGINAL TEXT · ${iching.originalTextLabel}`}</p><blockquote>{resultLocale === "en" ? "After completion: balance is present, yet small details still ask for care." : iching.originalTextExcerpt}</blockquote></section><section><p className="eyebrow">{resultLocale === "en" ? "PLAIN LANGUAGE" : "PLAIN LANGUAGE · 白话理解"}</p><h2>{resultLocale === "en" ? "You have begun; you do not need to complete everything at once" : "已经开始，不必急着补齐一切"}</h2><p>{resultLocale === "en" ? "The structure is already taking shape. The useful move is to protect what works, notice the unfinished detail, and avoid turning momentum into haste." : iching.plainLanguage}</p></section><section className="application-card"><p className="eyebrow">APPLIED TO YOUR QUESTION</p><h2>{resultLocale === "en" ? "Bring it back to your question" : "放回你的问题里"}</h2><p>{resultLocale === "en" ? "Name what has already become clear, then choose one small part that can be stabilized before you expand the commitment." : iching.applicationToQuestion}</p></section><section className="answer-reflection"><p className="eyebrow">REFLECTION</p><h2>{resultLocale === "en" ? "What is already sufficient, and what small detail still needs patient attention?" : iching.reflectionPrompt}</h2></section><div className="result-actions"><AskLink prompt={resultLocale === "en" ? `Read this with my chart: ${activeQuestion}` : `结合命盘看：${activeQuestion}`} className="button button--primary">{resultLocale === "en" ? "Read it with my chart" : "结合我的命盘一起看"}</AskLink><button className="button button--secondary" onClick={reset}>{resultLocale === "en" ? "Cast again" : "重新起卦"}</button></div><p className="disclosure disclosure--center">{resultLocale === "en" ? "This is a deterministic reflection ritual based on traditional I Ching language. It is not a prediction, professional advice, or a guarantee." : iching.disclaimer}</p></section>}
      </div>
    </PageShell>
  );
}

function TimingPage() {
  const { text } = useLocale();
  const { experience, calculationError, loading } = useActiveExperience();
  const { items: reflections } = useSavedReflections();
  if (loading) return <CalculationLoadingState route="timing" />;
  if (!experience) return <ErrorState route="timing" title={text("当前时运无法完成计算", "Current timing could not be calculated")} message={calculationError ?? text("请检查出生资料。", "Check your birth details.")} href="/onboarding" action={text("检查出生资料", "Check birth details")} />;
  const timing = experience.timing;
  const datedReflection = reflections.find((item) => item.deadline || item.reviewDate);
  return (
    <PageShell route="timing">
      <div className="page timing-page">
        <header className="page-heading"><p className="eyebrow">{text("YOUR CURRENT SEASON · 当前时运", "YOUR CURRENT SEASON · CALCULATED TIMING")}</p><h1>{timing.title}</h1><p>{timing.summary}</p></header>
        <section className="timeline-large"><div className="timeline-years"><span>{text("月初", "Month start")}</span><span>{text("现在", "Now")}</span><span>{text("下月", "Next month")}</span></div><div className="timeline-track" style={{ "--timeline-position": `${timing.nowPosition * 100}%` } as React.CSSProperties}><i style={{ left: `${timing.nowPosition * 100}%` }}><b>NOW</b></i></div><div className="timeline-periods"><article><small>{timing.start}</small><h3>{text("本月计算起点", "Calculation start for this month")}</h3><p>{text("以当前公历月为边界保存一张可复算快照。", "A reproducible snapshot is saved using the current Gregorian month as its boundary.")}</p></article><article className="is-current"><small>{timing.start}—{timing.end}</small><h3>{timing.title}</h3><p>{timing.summary}</p></article><article><small>{timing.nextTransition.date}</small><h3>{timing.nextTransition.title}</h3><p>{timing.nextTransition.summary}</p></article></div></section>
        {datedReflection && <section className="decision-date-card"><p className="eyebrow">{text("YOUR REAL-WORLD DATE · 你的现实时间", "YOUR REAL-WORLD DATE")}</p><h2>{datedReflection.question}</h2><p>{datedReflection.deadline ? text(`你计划在 ${datedReflection.deadline} 前做决定。`, `You plan to decide by ${datedReflection.deadline}.`) : text("你还没有设置决定期限。", "You have not set a decision deadline.")} {datedReflection.reviewDate ? text(`复盘日期是 ${datedReflection.reviewDate}。`, `Your review date is ${datedReflection.reviewDate}.`) : ""}</p><small>{text("现实日期来自你保存的问题，不是命盘预测或“吉日”。", "This real-world date comes from your saved question, not a chart prediction or auspicious-date claim.")}</small></section>}
        <section className="section-block"><SectionHeader eyebrow={text("DOMAIN ACTIVATION · 已计算", "DOMAIN ACTIVATION · CALCULATED")} title={text("哪些主题留下较多线索", "Where more signals appear")} /><div className="signal-list">{timing.signals.map((signal, index) => <article key={signal.id}><div><span>{signal.label}</span><small>{signal.strength === "very-active" ? text("多源线索", "Multi-source") : signal.strength === "active" ? text("可见线索", "Visible signal") : text("背景线索", "Background")}</small></div><i><b style={{ "--signal-width": `${signal.internalStrength * 100}%`, "--signal-delay": `${index * 90}ms` } as React.CSSProperties} /></i><p>{signal.summary}</p></article>)}</div><p className="inline-notice">{timing.disclaimer}</p></section>
        <section className="reading-section"><SectionHeader eyebrow={`AS OF ${timing.asOf}`} title={text("时运依据来自哪里", "Where timing evidence comes from")} /><EvidenceList evidence={timing.evidence} experience={experience} /></section>
        <section className="reflection-card"><span aria-hidden="true">◌</span><div><p className="eyebrow">THIS PERIOD&apos;S PRACTICE</p><h2>{experience.todayInsight.reflectionPrompt}</h2><AskLink prompt={text("这个阶段我最值得留意什么？", "What is most worth noticing in this season?")} focus="timing" className="button button--primary">{text("围绕当前阶段提问", "Ask about this season")}</AskLink></div></section>
      </div>
    </PageShell>
  );
}

function ReportPage() {
  const { text } = useLocale();
  const { reading, experience, calculationError, loading } = useActiveExperience();
  const dailyReport = useMemo(() => experience ? buildDailyReport(experience, experience.calculatedFor) : null, [experience]);
  const detailedReport = useMemo(() => experience ? buildLifeMapReport(experience, experience.calculatedFor) : null, [experience]);
  const [launchState, setLaunchState] = useState<"checking" | "available" | "unavailable">("checking");
  const [purchaseState, setPurchaseState] = useState<"idle" | "rendering" | "uploading" | "checkout" | "error">("idle");
  const [purchaseError, setPurchaseError] = useState("");

  useEffect(() => {
    let active = true;
    getReportLaunchReadiness()
      .then((result) => active && setLaunchState(result.available ? "available" : "unavailable"))
      .catch(() => active && setLaunchState("unavailable"));
    return () => { active = false; };
  }, []);

  if (loading) return <CalculationLoadingState route="report" />;
  if (!experience || !dailyReport || !detailedReport) return <ErrorState route="report" title={text("数字报告无法生成", "The digital report could not be generated")} message={calculationError ?? text("请检查出生资料。", "Check your birth details.")} href="/onboarding" action={text("检查出生资料", "Check birth details")} />;
  const dailyPage = dailyReport.pages[0];
  const previewPages = detailedReport.pages.filter((page) => [1, 7, 9].includes(page.number));
  const buying = !["idle", "error"].includes(purchaseState);
  const purchaseLabel = purchaseState === "rendering"
    ? text("正在生成私人 PDF…", "Creating your private PDF…")
    : purchaseState === "uploading"
      ? text("正在进入私人交付队列…", "Adding it to private delivery…")
      : purchaseState === "checkout"
        ? text("正在打开 Shopify…", "Opening Shopify…")
        : launchState === "checking"
          ? text("正在检查安全上线状态…", "Checking secure launch readiness…")
          : launchState === "unavailable"
            ? text("购买尚未开放", "Purchase not available yet")
            : text(`购买完整报告 · $${FULL_REPORT_PRODUCT.price} USD`, `Purchase full report · $${FULL_REPORT_PRODUCT.price} USD`);

  const purchase = async () => {
    if (launchState !== "available" || buying) return;
    setPurchaseError("");
    try {
      setPurchaseState("rendering");
      const { renderLifeMapReportPdf } = await import("../lib/report-pdf");
      const pdf = await renderLifeMapReportPdf(detailedReport);
      setPurchaseState("uploading");
      const job = await createPrivateReportJob(pdf, detailedReport.locale);
      setPurchaseState("checkout");
      const checkout = await createReportCheckout(job);
      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      setPurchaseError(experience.locale === "en"
        ? "The report cannot enter checkout right now. Please try again."
        : error instanceof Error ? error.message : "报告暂时无法进入结账，请稍后重试。");
      setPurchaseState("error");
    }
  };

  return (
    <PageShell route="report" title={text("数字报告", "Digital report")} eyebrow="PRIVATE PDF" backHref="/today">
      <div className="page report-page">
        <header className="report-intro">
          <div>
            <p className="eyebrow">PRIVATE EDITION · ONE CLEAR PRICE</p>
            <h1>{text(<>一份完整报告，<br />USD $2</>, <>One complete report,<br />USD $2</>)}</h1>
            <p>{text("十页整理八字、紫微、西占、当前时运和可追溯综合。PDF 在你的浏览器生成；Shopify 只收到随机报告编号、商品与金额。", "Ten pages organize BaZi, Zi Wei, Western astrology, current timing, and traceable synthesis. The PDF is created in your browser; Shopify receives only a random report ID, product, and amount.")}</p>
            <div className="report-intro__actions">
              <button className="button button--secondary" type="button" onClick={() => window.print()}>{text("保存本地预览", "Save local preview")}</button>
              <a className="button button--tertiary" href="/downloads/life-map-full-daily-report-sample.pdf" download>{text("下载十页演示 PDF", "Download ten-page sample PDF")}</a>
            </div>
            <p className="report-privacy">{text("免费命盘事实与证据不会被付费墙锁住。未开始结账的文件 24 小时删除；已创建结账的文件覆盖 Shopify 购物车有效期，付款后最多保留 30 天。", "Free chart facts and evidence are never locked behind payment. Files without checkout are deleted after 24 hours; files linked to checkout cover the Shopify cart window and remain for at most 30 days after payment.")}</p>
          </div>
        </header>

        <section className="report-selector" aria-labelledby="report-selector-title">
          <div className="report-selector__heading"><p className="eyebrow">{text("FULL REPORT · 完整版", "FULL REPORT · ONE EDITION")}</p><h2 id="report-selector-title">{text("一个商品，不制造档位焦虑", "One product, no tier anxiety")}</h2><p>{text("付款前先看目录与三个完整章节。购买按钮只有在付款验证、私人交付、恢复、退款和自动清理全部可用时才会开启。", "Review the table of contents and three complete chapters before paying. Purchase opens only when payment verification, private delivery, recovery, refunds, and automatic cleanup are all available.")}</p></div>
          <div className="report-tier-grid report-tier-grid--single">
            <article className="report-tier-card report-tier-card--detailed">
              <header><span>FULL · 10 PAGES</span><small>{text("一次性购买", "One-time purchase")}</small></header>
              <h3>Life Map Full Personal Report</h3>
              <p>{text("把三套本命计算、当前时运、规则综合和七日练习整理成完整档案。", "A complete record of three natal systems, current timing, rule synthesis, and a seven-day practice.")}</p>
              <div className="report-tier-card__price"><strong>$2.00</strong><span>{text("USD · PDF · 无订阅", "USD · PDF · No subscription")}</span></div>
              <ul><li>{text("八字、紫微与西占计算记录", "BaZi, Zi Wei, and Western calculation records")}</li><li>{text("跨体系共识、张力与证据", "Cross-system consensus, tension, and evidence")}</li><li>{text("八个生命领域的反思主题", "Reflection themes across eight life domains")}</li><li>{text("七日练习、方法与限制", "Seven-day practice, methods, and limits")}</li></ul>
              <button className="button button--primary" type="button" disabled={launchState !== "available" || buying} onClick={purchase}>{purchaseLabel}</button>
              <a href="#detailed-preview" className="text-link">{text("查看目录与章节预览", "View contents and chapter preview")} ↓</a>
            </article>
          </div>
          <p className="report-checkout-note">{text("Shopify 只接收随机报告编号、一个商品、数量 1 与 USD $2.00。姓名、生日、出生时间、地点、问题、命盘内容和 PDF 都不会作为 Shopify 商品属性发送。", "Shopify receives only a random report ID, one product, quantity 1, and USD $2.00. Your name, birth date, birth time, location, questions, chart content, and PDF are never sent as Shopify product attributes.")}</p>
          {launchState !== "available" && <p className="inline-notice">{text("PAID-LAUNCH GATE · 购买保持关闭，直到公开访问、Webhook、邮件、私人存储、自动清理与支持流程全部验证。", "PAID-LAUNCH GATE · Purchase stays closed until public access, webhooks, email, private storage, automatic cleanup, and support are all verified.")}</p>}
          {purchaseError && <p className="inline-notice" role="alert">{purchaseError}</p>}
          <Link href="/report/access" className="text-link">{text("已经购买？恢复下载链接", "Already purchased? Recover your download link")} →</Link>
        </section>

        <div className="report-boundary"><span>FACT</span><p>{text("命盘事实来自版本化引擎", "Chart facts come from versioned engines")}</p><span>REFLECTION</span><p>{text("传统主题是可质疑的观察角度", "Traditional themes are contestable lenses")}</p><span>PRACTICE</span><p>{text("练习不需要购买任何物品", "Practice requires no purchase")}</p></div>

        <section className="report-preview report-preview--daily" id="daily-preview" aria-label={text("Daily Report 预览", "Daily Report preview")}>
          <div className="report-preview__heading"><p className="eyebrow">DAILY REPORT · FULL PREVIEW</p><h2>{text("一页的结构，先完整看清", "See the complete one-page structure")}</h2><p>{text(`Daily Report 聚焦 ${experience.calculatedFor}，不会把短期快照包装成事件预测。`, `The Daily Report focuses on ${experience.calculatedFor} without presenting a short-term snapshot as an event prediction.`)}</p></div>
          <article className="report-sheet report-sheet--daily">
            <header><span>{dailyPage.eyebrow}</span><small>01 / 01</small></header>
            <div className="report-sheet__title"><h2>{dailyPage.title}</h2><p>{dailyPage.subtitle}</p></div>
            <div className="report-sheet__blocks">{dailyPage.blocks.map((block) => <section className={`report-block report-block--${block.kind}`} key={block.id}><span>{block.label}</span><h3>{block.title}</h3><p>{block.body}</p></section>)}</div>
            <footer><span>Life Map · Daily reflection</span><b>{dailyReport.generatedOn}</b></footer>
          </article>
        </section>

        <section className="report-preview report-preview--detailed" id="detailed-preview" aria-label={text("Detailed Report 预览", "Detailed Report preview")}>
          <div className="report-preview__heading"><p className="eyebrow">DETAILED REPORT · THREE-CHAPTER PREVIEW</p><h2>{text("十页目录与三个完整章节", "Ten-page contents and three complete chapters")}</h2><p>{text("证据与主要洞察保持免费可查；Detailed Report 的价值是把计算、解释、练习与限制整理成一份可保存的连续记录。", "Evidence and major insights remain free. The Detailed Report organizes calculations, interpretation, practice, and limits into one record you can keep.")}</p></div>
          <ol className="report-toc" aria-label={text("十页详细报告目录", "Ten-page detailed report contents")}>{detailedReport.pages.map((page) => <li key={page.id} className={previewPages.some((item) => item.id === page.id) ? "is-preview" : ""}><span>{String(page.number).padStart(2, "0")}</span><div><strong>{page.title}</strong><small>{previewPages.some((item) => item.id === page.id) ? text("本页完整预览", "Complete preview") : text("正式 PDF 包含", "Included in PDF")}</small></div></li>)}</ol>
          {previewPages.map((page) => (
            <article className={`report-sheet report-sheet--${page.id}`} key={page.id}>
              <header>
                <span>{page.eyebrow}</span>
                <small>{String(page.number).padStart(2, "0")} / {String(detailedReport.pages.length).padStart(2, "0")}</small>
              </header>
              <div className="report-sheet__title"><h2>{page.title}</h2><p>{page.subtitle}</p></div>
              {page.id === "cover" && <div className="report-cover-mark" aria-label={text(`日主 ${reading.dayMaster.stem}`, `Day Master ${reading.dayMaster.stem}`)}><i /><strong>{reading.dayMaster.stem}</strong><span>{reading.dayMaster.polarity}{reading.dayMaster.element}</span></div>}
              {page.id === "pillars" && <div className="report-element-bars" role="img" aria-label={elementOrder.map((element) => `${element} ${reading.visibleElementCounts[element]}`).join("，")}>{elementOrder.map((element) => <div key={element}><span>{element}<small>{elementEnglish[element]}</small></span><i><b style={{ width: `${(reading.visibleElementCounts[element] / Math.max(1, ...Object.values(reading.visibleElementCounts))) * 100}%`, "--element-color": elementColor[element] } as React.CSSProperties} /></i><strong>{reading.visibleElementCounts[element]}</strong></div>)}</div>}
              <div className="report-sheet__blocks">{page.blocks.map((block) => <section className={`report-block report-block--${block.kind}`} key={block.id}><span>{block.label}</span><h3>{block.title}</h3><p>{block.body}</p></section>)}</div>
              <footer><span>Life Map · Personal reflection</span><b>{detailedReport.generatedOn}</b></footer>
            </article>
          ))}
        </section>
        <section className="report-final-cta"><p className="eyebrow">PRIVATE DELIVERY · $2 USD</p><h2>{text("保存一份可以慢慢读的完整档案", "Keep a complete record you can read slowly")}</h2><p>{detailedReport.disclaimer} {text("这是一次性数字商品，没有订阅或自动续费。", "This is a one-time digital product with no subscription or automatic renewal.")}</p><div className="report-final-cta__actions"><button className="button button--primary" type="button" disabled={launchState !== "available" || buying} onClick={purchase}>{purchaseLabel}</button></div><Link href="/digital-delivery" className="text-link">{text("查看数字交付、保留期与退款边界", "View digital delivery, retention, and refund boundaries")} →</Link></section>
      </div>
    </PageShell>
  );
}

function ObjectsPage() {
  const { locale, text } = useLocale();
  const [category, setCategory] = useState<"all" | Product["category"]>("all");
  const featuredProduct = products.find((product) => product.category === "bracelet") ?? products[0];
  const visibleProducts = category === "all" ? products : products.filter((product) => product.category === category);
  const categoryOptions: Array<{ id: "all" | Product["category"]; label: string }> = [{ id: "all", label: text("全部", "All") }, { id: "stone", label: text("天然石", "Stones") }, { id: "bracelet", label: text("五行手链", "Five Elements bracelets") }, { id: "chart-art", label: text("命盘艺术", "Chart art") }];
  const featuredCopy = productCopy(featuredProduct, locale);
  return (
    <PageShell route="objects" title={text("象征物商城", "Symbolic collection")} eyebrow="LIFE MAP SHOP">
      <div className="page objects-page">
        <header className="shop-hero"><div><p className="eyebrow">LIFE MAP OBJECTS · ONLINE SHOP</p><h1>{text("象征物商城", "Symbolic collection")}</h1><p>{text("为已经被看见的主题，选择一件可以放进日常的物品。这里出售的是材质、设计与纪念意义，不是转运、疗愈或结果保证。", "Choose an object that gives a theme you have already seen a place in daily life. These are materials, design, and keepsakes—not luck, healing, or outcome guarantees.")}</p><div className="shop-assurances"><span>{text("材质信息透明", "Transparent materials")}</span><span>{text("象征关联可解释", "Explainable symbolism")}</span><span>{text("无功效承诺", "No effect claims")}</span></div></div><ProductVisual product={featuredProduct} compact /></header>
        <section className="shop-feature"><div><p className="eyebrow">FEATURED · PERSONAL EDITION</p><h2>{locale === "zh-CN" ? featuredProduct.nameZh : featuredProduct.nameEn}</h2><p>{featuredCopy.description}</p><div className="pill-row">{featuredProduct.intentions.map((item) => <span key={item}>{symbolicTag(item, locale)}</span>)}</div></div><div><strong>{featuredProduct.price}</strong><Link href={`/objects/${featuredProduct.slug}`} className="button button--primary">{text("查看主推商品", "View featured object")} <span aria-hidden="true">→</span></Link></div></section>
        <section className="shop-catalog" aria-labelledby="shop-catalog-title"><div className="shop-catalog__heading"><div><p className="eyebrow">BROWSE THE COLLECTION</p><h2 id="shop-catalog-title">{text("浏览全部商品", "Browse all objects")}</h2></div><div className="shop-filters" aria-label={text("商品分类", "Product categories")}>{categoryOptions.map((option) => <button key={option.id} type="button" aria-pressed={category === option.id} onClick={() => setCategory(option.id)}>{option.label}</button>)}</div></div><div className="product-grid">{visibleProducts.map((product) => { const copy = productCopy(product, locale); return <Link href={`/objects/${product.slug}`} key={product.id} className="product-card"><ProductVisual product={product} compact /><div><small>{product.category === "stone" ? text("天然石", "Natural stone") : product.category === "bracelet" ? text("五行手链", "Five Elements bracelet") : text("命盘艺术", "Chart art")}</small><h2>{locale === "zh-CN" ? product.nameZh : product.nameEn}</h2><h3>{locale === "zh-CN" ? product.nameEn : product.nameZh}</h3><p>{copy.description}</p><footer><span>{product.price}</span><b>{text("查看详情", "View details")} →</b></footer></div></Link>; })}</div></section>
        <aside className="shop-boundary"><p className="eyebrow">{text("A CLEAR BOUNDARY · 商城边界", "A CLEAR COMMERCE BOUNDARY")}</p><h2>{text("先有理解，再谈物品", "Understanding first, objects second")}</h2><p>{text("直接浏览商城不会生成“你需要购买”的判断。个性化推荐必须说明它连接到哪个主题，并先给出一个不花钱也能完成的日常练习。", "Browsing never creates a judgment that you need to buy. A personalized recommendation must name the theme it connects to and offer a free daily practice first.")}</p><Link href="/today" className="text-link">{text("回到我的地图", "Return to my map")} <span aria-hidden="true">→</span></Link></aside>
      </div>
    </PageShell>
  );
}

function ProductPage({ id }: { id?: string }) {
  const { locale, text } = useLocale();
  const product = products.find((item) => item.id === (id ?? products[0].slug) || item.slug === (id ?? products[0].slug));
  const [saved, setSaved] = useState(false);
  if (!product) return <ErrorState route="product" title={text("没有找到这件象征物", "Object not found")} message={text("这件演示物品可能已被移动，或链接并不存在。你仍可以浏览完整的演示收藏。", "This preview object may have moved or the link may not exist. You can still browse the full collection.")} href="/objects" action={text("浏览象征物", "Browse objects")} />;
  const isFeatured = product.id === recommendation.productId;
  const copy = productCopy(product, locale);
  return (
    <PageShell route="product" title={text("象征物详情", "Object detail")} eyebrow="OBJECT DETAIL" backHref="/objects">
      <div className="page product-page"><div className="product-layout"><div className="product-gallery"><ProductVisual product={product} /><div className="gallery-thumbs"><button aria-label={text("查看主图", "View main image")} className="is-active"><span /></button><button aria-label={text("查看材质细节", "View material detail")}><span /></button><button aria-label={text("查看日常使用情境", "View everyday use")}><span /></button></div></div><article className="product-detail"><p className="eyebrow">PERSONAL SYMBOL · OPTIONAL</p><h1>{locale === "zh-CN" ? product.nameZh : product.nameEn}</h1><h2>{locale === "zh-CN" ? product.nameEn : product.nameZh}</h2><p className="product-intro">{copy.description}</p>{isFeatured && <><section className="why-section"><p className="eyebrow">WHY IT SHOWED UP FOR YOU</p><h3>{text(recommendation.headline, "A symbolic reminder after a free practice")}</h3><p>{text(recommendation.summary, "This object connects to a theme already visible in your reflection. It remains optional and cannot change your chart or guarantee a result.")}</p><div className="reason-list">{recommendation.reasons.map((reason) => <article key={reason.id}><span>{text(reason.label, "Reflection link")}</span><p>{text(reason.explanation, "This association is offered as symbolic context, not evidence of an effect.")}</p></article>)}</div></section><section className="practice practice--large"><span>{text(recommendation.nonCommercialPractice.title, "Try this first—no purchase needed")}</span><p>{text(recommendation.nonCommercialPractice.instruction, "Choose one small action that expresses the theme in daily life before considering an object.")}</p></section></>}<section className="association"><p className="eyebrow">TRADITIONAL ASSOCIATION</p><p>{copy.traditionalMeaning}</p><div className="pill-row">{product.elements.concat(product.intentions).map((item) => <span className="pill" key={item}>{symbolicTag(item, locale)}</span>)}</div></section><section className="daily-use"><p className="eyebrow">A SIMPLE DAILY USE</p><h3>{text("让它成为一个动作提示", "Use it as a cue for action")}</h3><p>{copy.dailyUse}</p></section><details className="product-info" open><summary>{text("材质与信息", "Material and information")}</summary><dl><div><dt>{text("材质", "Material")}</dt><dd>{copy.material}</dd></div><div><dt>{text("产地", "Origin")}</dt><dd>{copy.origin}</dd></div><div><dt>{text("尺寸", "Dimensions")}</dt><dd>{copy.dimensions}</dd></div><div><dt>{text("养护", "Care")}</dt><dd>{copy.care}</dd></div></dl></details><div className="product-action"><div><small>{text("参考价格", "Reference price")}</small><strong>{product.price}</strong></div><button className="button button--primary" aria-pressed={saved} onClick={() => setSaved((value) => !value)}>{saved ? text("已加入愿望清单", "Saved to wishlist") : text("加入愿望清单", "Add to wishlist")}</button></div><p className="wishlist-status" aria-live="polite">{saved ? text("已在当前演示会话中保存。", "Saved in this preview session.") : ""}</p><p className="disclosure">{isFeatured ? text(recommendation.disclaimer, "This recommendation is a symbolic association, not a scientific effect or outcome guarantee.") : text("这些关联来自传统及现代象征文化，不是科学功效或结果保证。", "These associations come from traditional and modern symbolic culture, not scientific effects or outcome guarantees.")} {text("当前商城为商品与愿望清单预览，实物结账尚未开放。", "The current shop is a product and wishlist preview; physical checkout is not open.")}</p></article></div></div>
    </PageShell>
  );
}

function MePage() {
  const { locale, text } = useLocale();
  const { reading, experience, calculationError, loading } = useActiveExperience();
  const { items: reflections, setItems: setReflections } = useSavedReflections();
  if (loading) return <CalculationLoadingState route="me" />;
  if (!experience) return <ErrorState route="me" title={text("出生档案无法完成计算", "Birth profile could not be calculated")} message={calculationError ?? text("请检查出生资料。", "Check your birth details.")} href="/onboarding" action={text("检查出生资料", "Check birth details")} />;
  const clearProfile = () => {
    clearBirthProfile();
    clearReflections();
    navigate("/onboarding");
  };
  return (
    <PageShell route="me">
      <div className="page me-page">
        <header className="profile-hero"><div className="profile-monogram">{reading.profile.displayName.slice(0, 1).toUpperCase()}</div><div><p className="eyebrow">{text("YOUR PRIVATE SPACE · 你的内在空间", "YOUR PRIVATE SPACE · THIS DEVICE")}</p><h1>{reading.profile.displayName}</h1><p>{text("八字 · 紫微 · 西占 · 时运均使用本地计算", "BaZi · Zi Wei · Western astrology · timing calculated locally")}</p></div></header>
        <section className="profile-card"><SectionHeader eyebrow="BIRTH PROFILE" title={text("出生信息", "Birth details")} /><dl><div><dt>{text("出生日期", "Birth date")}</dt><dd>{reading.profile.birthDate}</dd></div><div><dt>{text("出生时间", "Birth time")}</dt><dd>{reading.profile.birthTime ?? text("未知", "Unknown")}</dd></div><div><dt>{text("出生地点", "Birth place")}</dt><dd>{reading.place.label}</dd></div><div><dt>{text("时区", "Time zone")}</dt><dd>{reading.place.timeZone}</dd></div><div><dt>{text("状态", "Status")}</dt><dd><span className="calculation-label">{text("三体系计算完成", "Three-system calculation complete")}</span></dd></div></dl><Link href="/onboarding" className="text-link">{text("重新输入资料", "Enter new details")} →</Link></section>
        <section className="reflection-history" id="reflection-history"><SectionHeader eyebrow="YOUR THREADS" title={text("问题与行动", "Questions and actions")} action={reflections.length ? text(`${reflections.length} 条记录`, `${reflections.length} notes`) : undefined} />{reflections.length ? <div>{reflections.map((reflection) => <article key={reflection.id}><span>{focusOption(reflection.focus, locale).label}</span><div><h3>{reflection.question}</h3><p>{reflection.action}</p><small>{reflection.reviewDate ? text(`计划复盘 ${reflection.reviewDate}`, `Review planned for ${reflection.reviewDate}`) : text("未设置复盘日期", "No review date")}</small></div><button type="button" aria-label={text(`删除问题：${reflection.question}`, `Delete question: ${reflection.question}`)} onClick={() => setReflections(removeReflection(reflection.id))}>{text("删除", "Delete")}</button></article>)}</div> : <div className="empty-thread"><p>{text("还没有保存问题。完成一次决策反思后，你的行动和复盘日期会出现在这里。", "No saved questions yet. After a decision reflection, your action and review date will appear here.")}</p><Link href="/ask" className="button button--secondary">{text("开始一个问题", "Start a question")}</Link></div>}<p className="reflection-history__privacy">{text("当前阶段只保存在本次浏览器会话中。账号同步、跨设备记忆与提醒尚未启用。", "For now, this is saved only in the current browser session. Account sync, cross-device memory, and reminders are not enabled.")}</p></section>
        <details className="profile-chart"><summary>{text("查看我的四柱计算事实", "View my Four Pillars calculation facts")}</summary><BaziChartCard reading={reading} /></details>
        <section className="menu-list"><Link href="/report"><span>{text("十页私人报告", "Ten-page private report")}</span><small>{text("一份完整报告 · USD $2 · 安全门槛控制", "One complete report · USD $2 · Secure launch gate")}</small><b>→</b></Link><Link href="/objects"><span>{text("象征物商城", "Symbolic collection")}</span><small>{text("浏览天然石、五行手链与命盘艺术", "Browse stones, Five Elements bracelets, and chart art")}</small><b>→</b></Link><button disabled><span>{text("关系档案", "Relationship profiles")}</span><small>{text("后续阶段开放", "Planned for a later phase")}</small><b>{text("即将开放", "Later")}</b></button><button disabled><span>{text("通知与每日提醒", "Notifications and daily reminders")}</span><small>{text("后续阶段开放", "Planned for a later phase")}</small><b>{text("即将开放", "Later")}</b></button></section>
        <section className="trust-card"><p className="eyebrow">TRUST & PRIVACY</p><h2>{text("你的信息，只留在这次浏览会话", "Your information stays in this browser session")}</h2><p>{text("出生资料只保存在当前浏览器会话中，不会上传、写入账户或发送分析事件。关闭会话后浏览器会清除它。", "Birth details stay in this browser session. They are not uploaded, written to an account, or sent as analytics events. The browser clears them when the session closes.")}</p><ul><li>{text("八字、紫微和西占由版本锁定的本地引擎计算", "BaZi, Zi Wei, and Western astrology use version-locked local engines")}</li><li>{text(`时运使用 ${experience.calculatedFor} 的干支、紫微运限与行星角距快照`, `Timing uses a ${experience.calculatedFor} snapshot of stem-branch, Zi Wei period, and planetary-angle facts`)}</li><li>{text("综合解释由规则生成，不调用实时 AI 或追踪", "Synthesis is rule-generated with no live AI or tracking")}</li></ul><button className="text-button text-button--danger" onClick={clearProfile}>{text("清除本次出生资料", "Clear this birth profile")}</button></section>
      </div>
    </PageShell>
  );
}

export function LifeMapApp({ initialRoute, resourceId }: { initialRoute: RouteName; resourceId?: string }) {
  let content: ReactNode;
  switch (initialRoute) {
    case "landing": content = <LandingPage />; break;
    case "onboarding": content = <OnboardingPage />; break;
    case "generating": content = <GeneratingPage />; break;
    case "today": content = <TodayPage />; break;
    case "insight": content = <InsightPage id={resourceId} />; break;
    case "life-map": content = <LifeMapPage />; break;
    case "domain": content = <DomainPage id={resourceId} />; break;
    case "ask": content = <AskPage />; break;
    case "iching": content = <IChingPage />; break;
    case "timing": content = <TimingPage />; break;
    case "objects": content = <ObjectsPage />; break;
    case "product": content = <ProductPage id={resourceId} />; break;
    case "report": content = <ReportPage />; break;
    case "me": content = <MePage />; break;
  }
  return profileProtectedRoutes.has(initialRoute) ? <ProfileGate>{content}</ProfileGate> : content;
}
