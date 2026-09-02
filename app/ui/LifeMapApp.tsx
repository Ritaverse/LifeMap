"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnchorHTMLAttributes, FormEvent, ReactNode } from "react";
import { askResponses, domains, iching, insights, products, recommendation, timing } from "../lib/data";
import { calculateBazi, defaultBirthPlace, demoBaziReading, demoBirthProfile } from "../lib/bazi";
import type { BaziReading, BirthPlace, FiveElement } from "../lib/bazi";
import { searchBirthPlaces } from "../lib/place-search";
import { clearBirthProfile, readBirthProfile, readOnboardingDraft, writeBirthProfile, writeOnboardingDraft } from "../lib/profile-storage";
import type { OnboardingDraft } from "../lib/profile-storage";
import { getInsight, resolveEvidence, routeAsk } from "../lib/repository";
import type { AskResponse, EvidenceRef, IChingLine, Product, SystemId } from "../lib/types";

type RouteName = "landing" | "onboarding" | "generating" | "today" | "insight" | "life-map" | "domain" | "ask" | "iching" | "timing" | "objects" | "product" | "me";

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

const navItems = [
  { href: "/today", key: "today", zh: "今日", en: "Today", mark: "日" },
  { href: "/life-map", key: "life-map", zh: "命盘", en: "Life Map", mark: "命" },
  { href: "/ask", key: "ask", zh: "问", en: "Ask", mark: "问" },
  { href: "/timing", key: "timing", zh: "时运", en: "Timing", mark: "时" },
  { href: "/me", key: "me", zh: "我的", en: "Me", mark: "我" },
];

function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <span className={`brand-mark ${large ? "brand-mark--large" : ""}`} aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  );
}

function PageShell({ route, title, eyebrow, children, backHref }: { route: RouteName; title?: string; eyebrow?: string; children: ReactNode; backHref?: string }) {
  const hasNav = !["landing", "onboarding", "generating"].includes(route);
  const activeKey = route === "domain" ? "life-map" : route === "insight" ? "today" : route === "objects" || route === "product" ? "me" : route;
  return (
    <div className={`app-shell ${hasNav ? "app-shell--nav" : ""}`}>
      {hasNav && (
        <header className="topbar">
          <div className="topbar__inner">
            {backHref ? <Link href={backHref} className="icon-link" aria-label="返回">←</Link> : <Link href="/today" className="wordmark"><BrandMark /><span>Life Map</span></Link>}
            <div className="topbar__context">
              {eyebrow && <span>{eyebrow}</span>}
              {title && <strong>{title}</strong>}
            </div>
            <Link href="/me" className="profile-link" aria-label="个人资料">Y</Link>
          </div>
        </header>
      )}
      <main className={hasNav ? "main-content" : "main-content main-content--bare"}>{children}</main>
      {hasNav && (
        <nav className="bottom-nav" aria-label="主要导航">
          <div className="bottom-nav__inner">
            {navItems.map((item) => (
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

const elementEnglish: Record<FiveElement, string> = { 木: "WOOD", 火: "FIRE", 土: "EARTH", 金: "METAL", 水: "WATER" };

function PhaseScopeNotice() {
  return (
    <aside className="phase-scope" aria-label="当前计算范围">
      <span>PHASE 2A</span>
      <p><strong>八字四柱已启用真实计算。</strong> 紫微、西占、时运与综合洞察目前仍是固定演示内容，不会混作你的真实结果。</p>
    </aside>
  );
}

function BaziChartCard({ reading, id }: { reading: BaziReading; id?: string }) {
  const pillars = [reading.pillars.year, reading.pillars.month, reading.pillars.day, reading.pillars.time];
  return (
    <section className="bazi-chart" id={id}>
      <header className="bazi-chart__header">
        <div><p className="eyebrow">DETERMINISTIC CHART FACTS · 确定性命盘事实</p><h2>你的四柱</h2><p>依据你输入的当地出生时间与所列规则计算；这里展示结构化事实，不生成性格或吉凶结论。</p></div>
        <span className="calculation-label">CALCULATED · v{reading.engine.version}</span>
      </header>
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
      <div className="element-counts" aria-label="表层干支五行数量">
        {(Object.entries(reading.visibleElementCounts) as Array<[FiveElement, number]>).map(([element, count]) => <span key={element}><b>{element}</b>{count}</span>)}
      </div>
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

function EvidenceList({ evidence }: { evidence: EvidenceRef[] }) {
  const resolved = resolveEvidence(evidence);
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
            {fact.limitations && <p className="inline-notice">演示限制：{fact.limitations}</p>}
          </div>
        </details>
      ))}
    </div>
  );
}

function ProductVisual({ product, compact = false }: { product: Product; compact?: boolean }) {
  const style = { "--product-a": product.palette[0], "--product-b": product.palette[1], "--product-c": product.palette[2] } as React.CSSProperties;
  return (
    <div className={`product-visual ${compact ? "product-visual--compact" : ""}`} style={style} role="img" aria-label={`${product.nameZh}的抽象演示图`}>
      <span className={`product-shape product-shape--${product.category}`} />
      <i /><i /><i />
      <small>DEMO OBJECT · 01</small>
    </div>
  );
}

function ErrorState({ route, title, message, href, action }: { route: RouteName; title: string; message: string; href: string; action: string }) {
  return (
    <PageShell route={route} title="未找到" eyebrow="DEMO ERROR" backHref={href}>
      <div className="page state-page">
        <div className="state-mark" aria-hidden="true">?</div>
        <p className="eyebrow">THIS DEMO PATH IS MISSING</p>
        <h1>{title}</h1>
        <p>{message}</p>
        <Link href={href} className="button button--primary">{action} <span aria-hidden="true">→</span></Link>
      </div>
    </PageShell>
  );
}

function LandingPage() {
  return (
    <PageShell route="landing">
      <div className="landing">
        <header className="landing__header"><div className="wordmark"><BrandMark /><span>Life Map</span></div><button className="quiet-button" disabled>登录 · 即将开放</button></header>
        <div className="landing__geometry" aria-hidden="true"><span className="orbit" /><span className="pillars" /><span className="broken-line" /></div>
        <section className="landing__hero">
          <p className="eyebrow">YOUR INNER ATLAS · 人生地图</p>
          <h1>看见属于你的<br />人生地图</h1>
          <p className="landing__lead">东方命理 × 西方占星 × AI，帮助你理解性格、关系与人生周期。</p>
          <div className="landing__actions">
            <Link href="/onboarding" className="button button--primary">生成我的命盘 <span aria-hidden="true">→</span></Link>
            <a href="#principles" className="button button--tertiary">了解我们如何解释</a>
          </div>
          <p className="disclosure">基于传统解释体系的个人反思体验，不是科学预测或结果保证。</p>
        </section>
        <section id="principles" className="landing__principles" aria-label="产品原则">
          <article><span>01</span><h2>三个体系</h2><p>把八字、紫微与西方占星放在同一张可理解的地图上。</p></article>
          <article><span>02</span><h2>有据可循</h2><p>每个重要洞察都能展开查看来源、传统解释与综合判断。</p></article>
          <article><span>03</span><h2>留有余地</h2><p>呈现主题、张力与反思提示，不用确定性语言替你做决定。</p></article>
        </section>
      </div>
    </PageShell>
  );
}

const onboardingSteps = [
  { id: "name", number: "01", title: "怎么称呼你？", helper: "我们会用这个名字，让体验更自然。" },
  { id: "date", number: "02", title: "你的出生日期", helper: "日期会进入真实八字四柱计算。" },
  { id: "time", number: "03", title: "你的出生时间", helper: "当地时间用于确定时柱；不知道时可以生成暂缺时柱的结果。" },
  { id: "location", number: "04", title: "你出生在哪里？", helper: "搜索城市与国家，再从真实地点结果中确认出生地。" },
  { id: "rules", number: "05", title: "传统规则输入", helper: "本轮先记录此项；后续运势与紫微引擎才会使用。" },
  { id: "review", number: "06", title: "确认计算范围", helper: "八字将真实计算；紫微、西占和综合解释仍使用演示内容。" },
];

const defaultOnboardingDraft: OnboardingDraft = {
  name: demoBirthProfile.displayName,
  date: demoBirthProfile.birthDate,
  time: demoBirthProfile.birthTime ?? "12:00",
  unknownTime: false,
  locationQuery: defaultBirthPlace.label,
  selectedPlace: defaultBirthPlace,
  gender: demoBirthProfile.traditionalGender,
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
    queueMicrotask(() => setForm(readOnboardingDraft(defaultOnboardingDraft)));
  }, []);

  useEffect(() => { writeOnboardingDraft(form); }, [form]);

  const valid = useMemo(() => {
    if (current.id === "name") return form.name.trim().length > 0;
    if (current.id === "date") return Boolean(form.date);
    if (current.id === "time") return form.unknownTime || Boolean(form.time);
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
          displayName: form.name,
          birthDate: form.date,
          birthTime: form.unknownTime ? null : form.time,
          timeAccuracy: form.unknownTime ? "unknown" as const : "known" as const,
          birthPlace: form.selectedPlace,
          traditionalGender: form.gender,
        };
        calculateBazi(profile);
        writeBirthProfile(profile);
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
        <header className="onboarding__header"><Link href="/" className="wordmark"><BrandMark /><span>Life Map</span></Link><span>创建你的地图</span></header>
        <div className="progress-track" aria-label={`第 ${step + 1} 步，共 ${onboardingSteps.length} 步`}><i style={{ width: `${((step + 1) / onboardingSteps.length) * 100}%` }} /></div>
        <section className="onboarding__panel">
          <div className="step-count"><span>{current.number}</span><small>OF 06</small></div>
          <p className="eyebrow">BIRTH PROFILE · 出生档案</p>
          <h1>{current.title}</h1>
          <p className="step-helper">{current.helper}</p>
          <div className="step-fields">
            {current.id === "name" && <label className="field"><span>偏好称呼</span><input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="输入你的名字" /></label>}
            {current.id === "date" && <label className="field"><span>出生日期</span><input type="date" min="1900-01-01" max="2100-12-31" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /><small>当前引擎支持 1900—2100 年的公历输入。</small></label>}
            {current.id === "time" && <>
              <label className="field"><span>当地时间</span><input type="time" value={form.time} disabled={form.unknownTime} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label>
              <label className="check-field"><input type="checkbox" checked={form.unknownTime} onChange={(event) => setForm({ ...form, unknownTime: event.target.checked })} /><span><strong>我不知道准确时间</strong><small>本阶段会省略八字时柱；未来紫微宫位与西占上升也会标记为不确定。</small></span></label>
            </>}
            {current.id === "location" && <BirthplaceSearch query={form.locationQuery} selectedPlace={form.selectedPlace} onQueryChange={(locationQuery) => setForm((value) => ({ ...value, locationQuery }))} onSelect={(selectedPlace) => setForm((value) => ({ ...value, selectedPlace }))} />}
            {current.id === "rules" && <fieldset className="choice-field"><legend>传统规则输入（选填）</legend>{[["female", "女性"], ["male", "男性"], ["nonbinary", "非二元"], ["prefer-not-to-say", "不愿说明"]].map(([value, label]) => <label key={value}><input type="radio" name="gender" value={value} checked={form.gender === value} onChange={(event) => setForm({ ...form, gender: event.target.value as OnboardingDraft["gender"] })} /><span>{label}</span></label>)}</fieldset>}
            {current.id === "review" && <div className="review-card">
              <dl><div><dt>称呼</dt><dd>{form.name}</dd></div><div><dt>出生日期</dt><dd>{form.date}</dd></div><div><dt>出生时间</dt><dd>{form.unknownTime ? "未知（不计算时柱）" : form.time}</dd></div><div><dt>出生地点</dt><dd>{form.selectedPlace?.label ?? "尚未选择"}</dd></div><div><dt>时区</dt><dd>{form.selectedPlace?.timeZone ?? "—"}</dd></div></dl>
              <label className="check-field"><input type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} /><span><strong>我理解当前的计算范围</strong><small>八字四柱会真实计算；紫微、西占、时运与综合解释仍是固定演示，不代表我的个人结果。</small></span></label>
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

const generationStages = ["正在验证出生资料", "正在按节气排列年柱与月柱", "正在计算日柱与时柱", "正在记录计算约定", "正在载入演示综合解读"];

function GeneratingPage() {
  const reading = useActiveBaziReading();
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
  return (
    <PageShell route="generating">
      <div className="generation" aria-live="polite">
        <div className="generation__art" aria-hidden="true"><span className="generation-orbit" /><span className="generation-grid" /><BrandMark large /></div>
        <p className="eyebrow">CALIBRATING YOUR MAP</p>
        <h1>{done ? "你的八字结构已生成" : generationStages[active]}</h1>
        <p>{done ? "四柱来自确定性计算；其他体系与综合解释会继续以演示状态清楚标注。" : "我们正在先建立可复算的命盘事实，再把解释与事实分开呈现。"}</p>
        <ol className="generation__stages">
          {generationStages.map((stage, index) => <li key={stage} className={index < active || done ? "is-complete" : index === active ? "is-active" : ""}><span>{index < active || done ? "✓" : String(index + 1).padStart(2, "0")}</span>{stage}</li>)}
        </ol>
        {done && <div className="generation__result" aria-label="四柱计算结果">{[reading.pillars.year, reading.pillars.month, reading.pillars.day, reading.pillars.time].map((pillar, index) => <span key={pillar?.kind ?? index}><small>{pillar?.label ?? "时柱"}</small><b>{pillar?.ganZhi ?? "未知"}</b></span>)}</div>}
        {done ? <button className="button button--primary" onClick={() => navigate("/today")}>进入今日地图 <span aria-hidden="true">→</span></button> : <button className="text-button" onClick={() => { setActive(generationStages.length - 1); setDone(true); }}>跳过演示动画</button>}
        <small className="calculation-label">BAZI CALCULATED · OTHER SYSTEMS DEMO</small>
      </div>
    </PageShell>
  );
}

function TodayPage() {
  const reading = useActiveBaziReading();
  const today = insights[0];
  const featured = products[0];
  return (
    <PageShell route="today">
      <div className="page today-page">
        <header className="today-greeting"><div><span>PHASE 2A · CALCULATION FOUNDATION</span><h1>你好，{reading.profile.displayName}</h1></div><div className="day-seal" aria-label={`日主 ${reading.dayMaster.stem}，${reading.dayMaster.element}`}><span>{reading.dayMaster.stem}</span><small>{elementEnglish[reading.dayMaster.element]}</small></div></header>
        <PhaseScopeNotice />
        <section className="today-hero">
          <div className="today-hero__motif" aria-hidden="true"><i /><i /><i /></div>
          <p className="eyebrow">{today.eyebrow} · TODAY&apos;S THEME</p>
          <h2>{today.title}</h2>
          <h3>{today.subtitle}</h3>
          <p>{today.summary}</p>
          <div className="evidence-chips">{today.evidence.map((item) => <EvidenceChip key={item.factId} system={item.system} role={item.role} />)}</div>
          <Link href={`/insights/${today.id}`} className="button button--ink">为什么？查看依据 <span aria-hidden="true">↗</span></Link>
        </section>
        <section className="section-block">
          <SectionHeader eyebrow="REFLECT" title="从一个问题开始" />
          <div className="quick-grid">
            <Link href="/ask" className="quick-card"><span className="quick-card__motif quick-card__motif--ask" aria-hidden="true" /><small>ASK MY CHART</small><h3>问命盘</h3><p>从三个体系寻找共同主题</p><b aria-hidden="true">→</b></Link>
            <Link href="/iching" className="quick-card quick-card--cinnabar"><span className="quick-card__motif quick-card__motif--iching" aria-hidden="true" /><small>I CHING</small><h3>问一卦</h3><p>为此刻的具体问题留出空间</p><b aria-hidden="true">→</b></Link>
          </div>
        </section>
        <section className="section-block"><SectionHeader eyebrow="YOUR PATTERNS" title="生命领域" action="查看全部" href="/life-map" /><div className="domain-grid domain-grid--today">{domains.slice(0, 4).map((domain, index) => <Link href={`/life-map/${domain.id}`} className="domain-card" key={domain.id}><span className="domain-card__index">0{index + 1}</span><small>{domain.nameEn}</small><h3>{domain.nameZh}</h3><p>{domain.pattern}</p><span className={`state state--${domain.state}`}>{domain.state === "active" ? "当前活跃" : domain.state === "steady" ? "稳定主题" : "值得反思"}</span></Link>)}</div></section>
        <section className="timing-card">
          <div><p className="eyebrow">CURRENT SEASON · 当前阶段</p><h2>{timing.title}</h2><p>{timing.summary}</p><Link href="/timing" className="text-link">展开时间线 <span aria-hidden="true">→</span></Link></div>
          <div className="mini-timeline" aria-label={`当前阶段从 ${timing.start} 至 ${timing.end}`}><span>{timing.start}</span><div><i style={{ left: `${timing.nowPosition * 100}%` }}><b>现在</b></i></div><span>{timing.end}</span></div>
        </section>
        <section className="symbol-section">
          <div className="element-symbol" aria-hidden="true"><span>木</span><i /><i /><i /></div>
          <div><p className="eyebrow">TODAY&apos;S ELEMENT</p><h2>成长 · 扩张 · 柔韧</h2><p>今天不需要同时长出更多枝条；先选择一条值得持续培育的方向。</p><div className="practice"><span>今日练习</span><p>写下未来七天唯一愿意持续培育的小行动。</p></div></div>
        </section>
        <section className="section-block"><SectionHeader eyebrow="OPTIONAL OBJECT" title="与你的成长主题呼应" /><article className="recommendation-card"><ProductVisual product={featured} /><div className="recommendation-card__content"><div><span className="pill">WOOD · 新开始</span><h2>{featured.nameEn}</h2><h3>{featured.nameZh}</h3><p>{recommendation.summary}</p></div><div className="recommendation-card__footer"><span>{featured.price}</span><Link href={`/objects/${featured.slug}`} className="button button--secondary">为什么推荐给我？</Link></div></div></article></section>
        <section className="recent-questions"><SectionHeader eyebrow="RECENT" title="最近想过的问题" /><Link href="/ask?prompt=我现在适合换工作吗？">我现在适合换工作吗？ <span>→</span></Link><Link href="/ask?prompt=为什么我做一段时间后就想开始新的事情？">为什么我做一段时间后就想开始新的事情？ <span>→</span></Link></section>
      </div>
    </PageShell>
  );
}

function InsightPage({ id }: { id?: string }) {
  const insight = insights.find((item) => item.id === (id ?? insights[0].id));
  if (!insight) return <ErrorState route="insight" title="没有找到这个洞察" message="这个演示洞察可能已被移动，或链接并不存在。你的固定演示数据没有受到影响。" href="/today" action="回到今日" />;
  return (
    <PageShell route="insight" title="为什么？" eyebrow="INSIGHT EVIDENCE" backHref="/today">
      <div className="page reading-page">
        <header className="reading-hero"><p className="eyebrow">{insight.eyebrow} · {insight.kind === "consensus" ? "MULTI-SYSTEM CONSENSUS" : "TENSION"}</p><h1>{insight.title}</h1><h2>{insight.subtitle}</h2><p>{insight.summary}</p><div className="evidence-chips">{insight.evidence.map((item) => <EvidenceChip key={item.factId} system={item.system} role={item.role} />)}</div></header>
        <section className="reading-section"><span className="section-number">01</span><SectionHeader title="综合解释" eyebrow="SYNTHESIS" /><p className="reading-copy">{insight.kind === "consensus" ? "这一主题在两个以上体系中出现，但每个体系提供了不同角度。共同点不是结果预测，而是此刻值得观察的方向。" : "不同体系在这里保留了有意义的张力；我们不会把它们平均成一个分数。"}</p></section>
        <section className="reading-section"><span className="section-number">02</span><SectionHeader title="依据来自哪里" eyebrow="EVIDENCE" /><EvidenceList evidence={insight.evidence} /></section>
        {insight.tensionNote && <section className="tension-card"><p className="eyebrow">TENSION · 张力</p><h2>不需要急着消除的矛盾</h2><p>{insight.tensionNote}</p></section>}
        <section className="reflection-card"><span aria-hidden="true">问</span><div><p className="eyebrow">REFLECTION PROMPT</p><h2>{insight.reflectionPrompt}</h2><Link href={`/ask?prompt=${encodeURIComponent(insight.reflectionPrompt)}`} className="button button--primary">和命盘继续聊 <span>→</span></Link></div></section>
        <p className="disclosure disclosure--center">所有内容基于虚构演示数据，用于反思，不是科学预测。</p>
      </div>
    </PageShell>
  );
}

function LifeMapPage() {
  const reading = useActiveBaziReading();
  return (
    <PageShell route="life-map">
      <div className="page life-map-page">
        <PhaseScopeNotice />
        <header className="map-hero"><div><p className="eyebrow">YOUR NATAL BLUEPRINT · 你的底图</p><h1>Builder<br /><i>×</i> Explorer</h1><p>你倾向于把模糊的想法变成可以运作的结构，同时需要持续发现新的可能。真正让你投入的，往往不是稳定本身，而是有空间参与定义方向。</p><div className="evidence-chips"><EvidenceChip system="bazi" role="primary" /><EvidenceChip system="ziwei" role="primary" /><EvidenceChip system="astrology" role="supporting" /></div></div><div className="map-diagram" aria-label="三个传统体系汇聚为 Life Map 的抽象图"><span className="map-ring" /><span className="map-grid" /><span className="map-pillars" /><b>命</b></div></header>
        <div className="map-note"><span>如何阅读</span><p>这些领域不是命运评分，而是理解长期模式的入口。当前活跃表示本期内容的主题强调，不代表好或坏。</p></div>
        <BaziChartCard reading={reading} id="bazi-chart" />
        <section className="section-block"><SectionHeader eyebrow="EIGHT DOMAINS" title="八个生命领域" /><div className="domain-grid domain-grid--all">{domains.map((domain, index) => <Link href={`/life-map/${domain.id}`} className="domain-card domain-card--wide" key={domain.id}><span className="domain-card__index">{String(index + 1).padStart(2, "0")}</span><div><small>{domain.nameEn}</small><h3>{domain.nameZh}</h3></div><p>{domain.pattern}</p><span className={`state state--${domain.state}`}>{domain.state === "active" ? "当前活跃" : domain.state === "steady" ? "稳定主题" : domain.state === "emerging" ? "正在浮现" : "值得反思"}</span><b aria-hidden="true">↗</b></Link>)}</div></section>
      </div>
    </PageShell>
  );
}

function DomainPage({ id }: { id?: string }) {
  const domain = domains.find((item) => item.id === (id ?? "career"));
  if (!domain) return <ErrorState route="domain" title="没有找到这个生命领域" message="这个演示领域不存在。你可以回到 Life Map 查看八个可用领域。" href="/life-map" action="查看 Life Map" />;
  const insight = getInsight(domain.insightId);
  const dimensions = domain.dimensions ?? [
    { label: "内在驱动", qualitativeValue: "high" as const, internalValue: 0.78 },
    { label: "关系感受", qualitativeValue: "medium" as const, internalValue: 0.56 },
    { label: "当前强调", qualitativeValue: "high" as const, internalValue: 0.72 },
  ];
  return (
    <PageShell route="domain" title={`${domain.nameZh} / ${domain.nameEn}`} eyebrow="LIFE DOMAIN" backHref="/life-map">
      <div className="page domain-page">
        <header className="domain-hero"><p className="eyebrow">{domain.nameEn.toUpperCase()} PATTERN</p><h1>{domain.pattern}</h1><h2>{insight.subtitle}</h2><p>{insight.summary}</p></header>
        <section className="dimensions-card"><div><p className="eyebrow">QUALITATIVE DIMENSIONS</p><h2>你的模式侧重</h2><p>以下为解释性标签，不是科学测量或命运评分。</p></div><div className="dimension-list">{dimensions.map((dimension) => <div key={dimension.label}><span><b>{dimension.label}</b><small>{dimension.qualitativeValue === "very-high" ? "很突出" : dimension.qualitativeValue === "high" ? "较突出" : "适中"}</small></span><i><b style={{ width: `${dimension.internalValue * 100}%` }} /></i></div>)}</div></section>
        <section className="reading-section"><SectionHeader eyebrow="MULTI-SYSTEM READING" title="三个体系如何描述它" /><p className="reading-copy">这不是把三个传统相加成一个结论，而是让每条线索保留自己的来源与语言，再观察它们在哪里相遇。</p><EvidenceList evidence={insight.evidence} /></section>
        {insight.tensionNote && <section className="tension-card"><p className="eyebrow">A USEFUL TENSION</p><h2>值得保留的张力</h2><p>{insight.tensionNote}</p></section>}
        <section className="reflection-card"><span aria-hidden="true">问</span><div><p className="eyebrow">TAKE THIS WITH YOU</p><h2>{insight.reflectionPrompt}</h2><Link href={`/ask?prompt=${encodeURIComponent(insight.reflectionPrompt)}`} className="button button--primary">问一个{domain.nameZh}问题 <span>→</span></Link></div></section>
      </div>
    </PageShell>
  );
}

function AskPage() {
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  useEffect(() => {
    const prompt = new URLSearchParams(window.location.search).get("prompt");
    if (prompt) queueMicrotask(() => { setInput(prompt); setAnswer(routeAsk(prompt)); });
  }, []);
  const submit = (event: FormEvent) => { event.preventDefault(); if (input.trim()) setAnswer(routeAsk(input)); };
  return (
    <PageShell route="ask">
      <div className={`page ask-page ${answer ? "ask-page--answered" : ""}`}>
        {!answer ? <>
          <header className="ask-hero"><div className="ask-orbit" aria-hidden="true"><span>问</span></div><p className="eyebrow">ASK MY CHART · 问命盘</p><h1>你最近在想什么？</h1><p>我会从固定的演示命盘事实中寻找共识、张力和不同角度，并让每个回答都能展开查看依据。</p><span className="fixture-label">DEMO · 不会调用实时 AI</span></header>
          <section className="suggestions"><p className="eyebrow">SUGGESTED QUESTIONS</p>{askResponses.slice(0, 4).map((response, index) => <button key={response.id} onClick={() => { setInput(response.suggestedPrompt); setAnswer(response); }}><span>0{index + 1}</span>{response.suggestedPrompt}<b>→</b></button>)}</section>
        </> : <AskAnswer answer={answer} question={input} onReset={() => { setAnswer(null); setInput(""); }} />}
        <form className="chat-composer" onSubmit={submit}><label htmlFor="chart-question" className="sr-only">输入你想问命盘的问题</label><textarea id="chart-question" value={input} onChange={(event) => setInput(event.target.value)} placeholder="写下一个具体的问题…" rows={1} /><button type="submit" aria-label="发送问题" disabled={!input.trim()}>↑</button><small>固定演示回答 · 不替代专业建议</small></form>
      </div>
    </PageShell>
  );
}

function AskAnswer({ answer, question, onReset }: { answer: AskResponse; question: string; onReset: () => void }) {
  return (
    <article className="answer">
      <header><button className="text-button" onClick={onReset}>← 新问题</button><p className="eyebrow">YOUR QUESTION</p><blockquote>{question}</blockquote><span className="kind-label">{answer.kind === "consensus" ? "多体系共识" : answer.kind === "tension" ? "有意义的张力" : "独立线索"}</span><h1>{answer.title}</h1><p>{answer.directAnswer}</p></header>
      {answer.sections.map((section, index) => <section className="answer-section" key={section.heading}><span>0{index + 1}</span><div><h2>{section.heading}</h2><p>{section.body}</p><EvidenceList evidence={section.evidence} /></div></section>)}
      <section className="answer-reflection"><p className="eyebrow">A QUESTION TO KEEP</p><h2>{answer.reflectionQuestion}</h2></section>
      {answer.relatedDomain && <Link href={`/life-map/${answer.relatedDomain}`} className="button button--secondary">查看相关生命领域 <span>↗</span></Link>}
      <p className="disclosure">{answer.disclaimer}</p>
    </article>
  );
}

function Hexagram({ lines, count = 6 }: { lines: IChingLine[]; count?: number }) {
  return <div className="hexagram" aria-label={`六爻卦象，已显示 ${count} 爻`}>{lines.slice(0, count).reverse().map((line) => <div key={line.position} className={`hex-line hex-line--${line.polarity} ${line.moving ? "is-moving" : ""}`}><span /><span />{line.moving && <b>○</b>}<small>{line.position}</small></div>)}</div>;
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
  return (
    <PageShell route="timing">
      <div className="page timing-page">
        <header className="page-heading"><p className="eyebrow">YOUR CURRENT SEASON · 当前时运</p><h1>{timing.title}</h1><p>{timing.summary}</p></header>
        <section className="timeline-large"><div className="timeline-years"><span>过去</span><span>现在</span><span>近期</span></div><div className="timeline-track"><i style={{ left: `${timing.nowPosition * 100}%` }}><b>NOW</b></i></div><div className="timeline-periods"><article><small>2026.01—06</small><h3>旧结构松动</h3><p>观察什么正在失去意义。</p></article><article className="is-current"><small>{timing.start}—{timing.end}</small><h3>{timing.title}</h3><p>{timing.summary}</p></article><article><small>{timing.nextTransition.date}</small><h3>{timing.nextTransition.title}</h3><p>{timing.nextTransition.summary}</p></article></div></section>
        <section className="section-block"><SectionHeader eyebrow="DOMAIN ACTIVATION" title="哪些主题正在被强调" /><div className="signal-list">{timing.signals.map((signal) => <article key={signal.id}><div><span>{signal.label}</span><small>{signal.strength === "very-active" ? "很活跃" : signal.strength === "active" ? "活跃" : "出现中"}</small></div><i><b style={{ width: `${signal.internalStrength * 100}%` }} /></i><p>{signal.summary}</p></article>)}</div><p className="inline-notice">{timing.disclaimer}</p></section>
        <section className="reflection-card"><span aria-hidden="true">时</span><div><p className="eyebrow">THIS SEASON&apos;S PRACTICE</p><h2>为一个真正值得的承诺留出结构</h2><Link href="/ask?prompt=这个阶段我最值得保留什么承诺？" className="button button--primary">围绕当前阶段提问</Link></div></section>
      </div>
    </PageShell>
  );
}

function ObjectsPage() {
  return (
    <PageShell route="objects" title="象征物 / Objects" eyebrow="OPTIONAL RITUALS" backHref="/me">
      <div className="page objects-page"><header className="page-heading"><p className="eyebrow">OBJECTS WITH CONTEXT</p><h1>把一个主题<br />带进日常</h1><p>这些物品是可选的象征提醒，不是补救、保护或改变命运的工具。每个推荐都先提供一个不需要购买的日常练习。</p></header><div className="product-grid">{products.map((product) => <Link href={`/objects/${product.slug}`} key={product.id} className="product-card"><ProductVisual product={product} compact /><div><small>{product.category.replace("-", " ")}</small><h2>{product.nameEn}</h2><h3>{product.nameZh}</h3><p>{product.shortDescription}</p><span>{product.price}</span></div></Link>)}</div></div>
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
      <div className="page product-page"><div className="product-layout"><div className="product-gallery"><ProductVisual product={product} /><div className="gallery-thumbs"><button aria-label="查看主图" className="is-active"><span /></button><button aria-label="查看材质细节"><span /></button><button aria-label="查看日常使用情境"><span /></button></div></div><article className="product-detail"><p className="eyebrow">PERSONAL SYMBOL · OPTIONAL</p><h1>{product.nameEn}</h1><h2>{product.nameZh}</h2><p className="product-intro">{product.shortDescription}</p>{isFeatured && <><section className="why-section"><p className="eyebrow">WHY IT SHOWED UP FOR YOU</p><h3>{recommendation.headline}</h3><p>{recommendation.summary}</p><div className="reason-list">{recommendation.reasons.map((reason) => <article key={reason.id}><span>{reason.label}</span><p>{reason.explanation}</p></article>)}</div></section><section className="practice practice--large"><span>{recommendation.nonCommercialPractice.title}</span><p>{recommendation.nonCommercialPractice.instruction}</p></section></>}<section className="association"><p className="eyebrow">TRADITIONAL ASSOCIATION</p><p>{product.traditionalMeaning}</p><div className="pill-row">{product.elements.concat(product.intentions).map((item) => <span className="pill" key={item}>{item}</span>)}</div></section><section className="daily-use"><p className="eyebrow">A SIMPLE DAILY USE</p><h3>让它成为一个动作提示</h3><p>{product.dailyUse}</p></section><details className="product-info" open><summary>材质与信息</summary><dl><div><dt>材质</dt><dd>{product.material}</dd></div><div><dt>产地</dt><dd>{product.origin}</dd></div><div><dt>尺寸</dt><dd>{product.dimensions}</dd></div><div><dt>养护</dt><dd>{product.care}</dd></div></dl></details><div className="product-action"><div><small>演示价格</small><strong>{product.price}</strong></div><button className="button button--primary" aria-pressed={saved} onClick={() => setSaved((value) => !value)}>{saved ? "已加入愿望清单" : "加入愿望清单"}</button></div><p className="wishlist-status" aria-live="polite">{saved ? "已在当前演示会话中保存。" : ""}</p><p className="disclosure">{isFeatured ? recommendation.disclaimer : "这些关联来自传统及现代象征文化，不是科学功效或结果保证。"} Phase 1 不提供购买。</p></article></div></div>
    </PageShell>
  );
}

function MePage() {
  const reading = useActiveBaziReading();
  const clearProfile = () => {
    clearBirthProfile();
    navigate("/onboarding");
  };
  return (
    <PageShell route="me">
      <div className="page me-page">
        <header className="profile-hero"><div className="profile-monogram">{reading.profile.displayName.slice(0, 1).toUpperCase()}</div><div><p className="eyebrow">LOCAL SESSION PROFILE</p><h1>{reading.profile.displayName}</h1><p>八字已计算 · 其他体系仍为演示</p></div></header>
        <section className="profile-card"><SectionHeader eyebrow="BIRTH PROFILE" title="出生信息" /><dl><div><dt>出生日期</dt><dd>{reading.profile.birthDate}</dd></div><div><dt>出生时间</dt><dd>{reading.profile.birthTime ?? "未知"}</dd></div><div><dt>出生地点</dt><dd>{reading.place.label}</dd></div><div><dt>时区</dt><dd>{reading.place.timeZone}</dd></div><div><dt>状态</dt><dd><span className="calculation-label">BAZI CALCULATED</span></dd></div></dl><Link href="/onboarding" className="text-link">重新输入资料 →</Link></section>
        <BaziChartCard reading={reading} />
        <section className="menu-list"><Link href="/objects"><span>象征物收藏</span><small>查看所有演示物品</small><b>→</b></Link><button disabled><span>关系档案</span><small>后续阶段开放</small><b>即将开放</b></button><button disabled><span>通知与每日提醒</span><small>后续阶段开放</small><b>即将开放</b></button></section>
        <section className="trust-card"><p className="eyebrow">TRUST & PRIVACY</p><h2>你的信息，只留在这次浏览会话</h2><p>出生资料只保存在当前浏览器会话中，不会上传、写入账户或发送分析事件。关闭会话后浏览器会清除它。</p><ul><li>八字四柱由确定性引擎在浏览器内计算</li><li>紫微、西占与综合解释仍明确标注为演示</li><li>没有实时 AI、支付或追踪</li></ul><button className="text-button text-button--danger" onClick={clearProfile}>清除本次出生资料</button></section>
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
    case "me": return <MePage />;
  }
}
