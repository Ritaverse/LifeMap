from __future__ import annotations

import math
from pathlib import Path

from reportlab.lib.colors import Color, HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "life-map-full-daily-report-sample.pdf"

PAGE_W, PAGE_H = A4
INK = HexColor("#172120")
DEEP = HexColor("#0B1112")
SURFACE = HexColor("#141C1D")
PAPER = HexColor("#F2E8D4")
PAPER_SOFT = HexColor("#C8BDA8")
MUTED = HexColor("#958D7F")
GOLD = HexColor("#C4A46D")
JADE = HexColor("#86AA98")
CINNABAR = HexColor("#C76D59")
LINE = HexColor("#34413E")
WOOD = HexColor("#719D84")
FIRE = HexColor("#C76D59")
EARTH = HexColor("#B28A55")
METAL = HexColor("#AAA79D")
WATER = HexColor("#668DA2")


def register_fonts() -> tuple[str, str]:
    candidates = [
        Path("/System/Library/Fonts/PingFang.ttc"),
        Path("/System/Library/Fonts/STHeiti Light.ttc"),
        Path("/System/Library/Fonts/Supplemental/Songti.ttc"),
        Path("/Library/Fonts/Arial Unicode.ttf"),
        Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
    ]
    for path in candidates:
        if not path.exists():
            continue
        try:
            pdfmetrics.registerFont(TTFont("LifeMap", str(path), subfontIndex=0))
            pdfmetrics.registerFont(TTFont("LifeMapBold", str(path), subfontIndex=0))
            return "LifeMap", "LifeMapBold"
        except Exception:
            continue
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_BOLD = register_fonts()


def alpha(color: Color, opacity: float) -> Color:
    return Color(color.red, color.green, color.blue, alpha=opacity)


def wrap_lines(text: str, font: str, size: float, width: float) -> list[str]:
    lines: list[str] = []
    current = ""
    for char in text:
        if char == "\n":
            lines.append(current)
            current = ""
            continue
        candidate = current + char
        if current and pdfmetrics.stringWidth(candidate, font, size) > width:
            lines.append(current.rstrip())
            current = char.lstrip()
        else:
            current = candidate
    if current:
        lines.append(current.rstrip())
    return lines


def paragraph(c: canvas.Canvas, text: str, x: float, y: float, width: float, size: float = 10.5,
              leading: float = 17, color: Color = PAPER_SOFT, font: str = FONT,
              max_lines: int | None = None) -> float:
    lines = wrap_lines(text, font, size, width)
    if max_lines is not None:
        lines = lines[:max_lines]
    c.setFont(font, size)
    c.setFillColor(color)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def page_background(c: canvas.Canvas, page_no: int, section: str) -> None:
    c.setFillColor(DEEP)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(alpha(GOLD, 0.045))
    c.circle(PAGE_W + 16, PAGE_H - 162, 185, fill=1, stroke=0)
    c.setStrokeColor(alpha(GOLD, 0.22))
    c.setLineWidth(0.7)
    c.circle(PAGE_W + 15, PAGE_H - 162, 142, fill=0, stroke=1)
    c.circle(PAGE_W + 15, PAGE_H - 162, 106, fill=0, stroke=1)
    c.setStrokeColor(alpha(JADE, 0.13))
    c.line(44, 44, PAGE_W - 44, PAGE_H - 44)
    c.setStrokeColor(LINE)
    c.line(44, PAGE_H - 58, PAGE_W - 44, PAGE_H - 58)
    c.setFont(FONT_BOLD, 6.8)
    c.setFillColor(GOLD)
    c.drawString(44, PAGE_H - 48, section.upper())
    c.setFillColor(MUTED)
    c.drawRightString(PAGE_W - 44, PAGE_H - 48, f"{page_no:02d} / 10")


def footer(c: canvas.Canvas, page_no: int) -> None:
    c.setStrokeColor(LINE)
    c.line(44, 44, PAGE_W - 44, 44)
    c.setFont(FONT, 6.7)
    c.setFillColor(MUTED)
    c.drawString(44, 29, "LIFE MAP · PERSONAL REFLECTION")
    c.drawRightString(PAGE_W - 44, 29, f"PRIVATE SAMPLE · PAGE {page_no}")


def title(c: canvas.Canvas, zh: str, en: str, y: float = PAGE_H - 122, size: float = 31) -> float:
    c.setFillColor(PAPER)
    c.setFont(FONT_BOLD, size)
    c.drawString(44, y, zh)
    c.setFont(FONT_BOLD, 7.4)
    c.setFillColor(GOLD)
    c.drawString(45, y - 22, en.upper())
    return y - 56


def block(c: canvas.Canvas, x: float, y_top: float, width: float, height: float, label: str,
          heading: str, body: str, accent: Color = JADE) -> None:
    c.setFillColor(SURFACE)
    c.setStrokeColor(alpha(accent, 0.45))
    c.roundRect(x, y_top - height, width, height, 12, fill=1, stroke=1)
    c.setFont(FONT_BOLD, 6.4)
    c.setFillColor(accent)
    c.drawString(x + 16, y_top - 20, label.upper())
    c.setFont(FONT_BOLD, 13)
    c.setFillColor(PAPER)
    heading_lines = wrap_lines(heading, FONT_BOLD, 13, width - 32)[:2]
    yy = y_top - 43
    for line in heading_lines:
        c.drawString(x + 16, yy, line)
        yy -= 17
    paragraph(c, body, x + 16, yy - 5, width - 32, 8.5, 13.5, PAPER_SOFT, max_lines=7)


def draw_cover(c: canvas.Canvas) -> None:
    page_background(c, 1, "Life Map · Private Edition")
    c.setFont(FONT_BOLD, 8)
    c.setFillColor(GOLD)
    c.drawString(44, PAGE_H - 116, "THREE CHART SYSTEMS · CURRENT TIMING · RULE SYNTHESIS")
    c.setFont(FONT_BOLD, 36)
    c.setFillColor(PAPER)
    c.drawString(44, PAGE_H - 167, "完整每日反思报告")
    c.setFont(FONT, 15)
    c.setFillColor(PAPER_SOFT)
    c.drawString(44, PAGE_H - 196, "Full Daily Reflection Report")

    cx, cy = PAGE_W / 2, PAGE_H / 2 + 10
    c.setStrokeColor(alpha(GOLD, 0.55))
    c.setLineWidth(0.8)
    for radius in (122, 96, 65):
        c.circle(cx, cy, radius, fill=0, stroke=1)
    c.setStrokeColor(alpha(JADE, 0.32))
    for angle in range(0, 360, 45):
        r = math.radians(angle)
        c.line(cx + math.cos(r) * 65, cy + math.sin(r) * 65,
               cx + math.cos(r) * 122, cy + math.sin(r) * 122)
    c.setFillColor(alpha(CINNABAR, 0.9))
    c.circle(cx, cy + 122, 4.5, fill=1, stroke=0)
    c.setFont(FONT_BOLD, 64)
    c.setFillColor(PAPER)
    c.drawCentredString(cx, cy - 17, "癸")
    c.setFont(FONT_BOLD, 8)
    c.setFillColor(GOLD)
    c.drawCentredString(cx, cy - 49, "阴水 · YIN WATER")

    c.setFont(FONT_BOLD, 19)
    c.setFillColor(PAPER)
    c.drawString(44, 160, "Yu 的人生地图")
    paragraph(c, "八字 × 紫微 × 西占 × 当前时运 × 可追溯规则综合", 44, 137, PAGE_W - 88, 10, 16)
    c.setFont(FONT, 7.5)
    c.setFillColor(MUTED)
    c.drawString(44, 86, "SAMPLE DATA · BAZI 1.8.6 · IZTRO 2.6.1 · CELESTINE 0.2.1")
    footer(c, 1)
    c.showPage()


def draw_method(c: canvas.Canvas) -> None:
    page_background(c, 2, "01 · How to read")
    y = title(c, "这份报告如何生成", "Calculation first, interpretation second")
    paragraph(c, "每一层都标出来源与限制。命盘事实由版本化引擎计算；传统主题提供反思语言，不把文化体系包装成科学结论。", 44, y, PAGE_W - 88, 10.5, 17)
    top = y - 76
    gap = 12
    w = (PAGE_W - 88 - gap) / 2
    block(c, 44, top, w, 166, "PRIVATE BY DESIGN", "出生资料留在浏览器", "姓名、生日、时间、地点与命盘内容不会发送给 Shopify。购买请求只包含商品 variant、数量与非个人化标签。", JADE)
    block(c, 44 + w + gap, top, w, 166, "VERSIONED ENGINES", "三套命盘真实计算", "八字、紫微和西占分别由锁定版本的本地引擎计算；当前时运使用明确日期快照。", GOLD)
    block(c, 44, top - 182, w, 166, "RULE SYNTHESIS", "综合洞察不是实时 AI", "规则层只连接稳定事实 ID；多体系同向才标记共识，不一致时保留张力。", CINNABAR)
    block(c, 44 + w + gap, top - 182, w, 166, "READING BOUNDARY", "事实与解释分开", "事实、传统反思与练习使用不同标签，方便逐项核对。", JADE)
    footer(c, 2)
    c.showPage()


def draw_pillars(c: canvas.Canvas) -> None:
    page_background(c, 3, "02 · Four pillars")
    y = title(c, "你的四柱结构", "Structured facts, not a personality verdict")
    paragraph(c, "以下内容来自样本出生资料的确定性引擎输出。它记录结构，不预测职业、财富、健康或关系结果。", 44, y, PAGE_W - 88, 10.5, 17)
    pillars = [
        ("年柱", "庚午", "天干 庚 · 地支 午", "表层五行 金、火"),
        ("月柱", "壬午", "天干 壬 · 地支 午", "表层五行 水、火"),
        ("日柱", "癸丑", "天干 癸 · 地支 丑", "表层五行 水、土"),
        ("时柱", "丁巳", "天干 丁 · 地支 巳", "表层五行 火、火"),
    ]
    start_y = y - 82
    card_w = (PAGE_W - 100) / 4
    for index, (label, ganzhi, line1, line2) in enumerate(pillars):
        x = 44 + index * (card_w + 4)
        c.setFillColor(SURFACE)
        c.setStrokeColor(GOLD if label == "日柱" else LINE)
        c.roundRect(x, start_y - 245, card_w, 245, 12, fill=1, stroke=1)
        c.setFont(FONT_BOLD, 7)
        c.setFillColor(GOLD if label == "日柱" else MUTED)
        c.drawCentredString(x + card_w / 2, start_y - 24, label)
        c.setFont(FONT_BOLD, 32)
        c.setFillColor(PAPER)
        c.drawCentredString(x + card_w / 2, start_y - 79, ganzhi[0])
        c.drawCentredString(x + card_w / 2, start_y - 124, ganzhi[1])
        c.setStrokeColor(LINE)
        c.line(x + 15, start_y - 147, x + card_w - 15, start_y - 147)
        paragraph(c, line1, x + 13, start_y - 169, card_w - 26, 7.5, 12, PAPER_SOFT, max_lines=2)
        paragraph(c, line2, x + 13, start_y - 207, card_w - 26, 7.5, 12, MUTED, max_lines=2)
    block(c, 44, start_y - 278, PAGE_W - 88, 130, "CALCULATED FACT", "日主 癸 · 阴水", "日主是日柱天干的结构记录。本报告不据此给出确定性人格判断；传统反思将在后页单独标注。", JADE)
    footer(c, 3)
    c.showPage()


def draw_elements(c: canvas.Canvas) -> None:
    page_background(c, 4, "03 · Visible elements")
    y = title(c, "表层五行分布", "Visible stems and branches only")
    paragraph(c, "数量只统计样本四柱中的八个表层干支，不等于旺衰、喜用神、吉凶或元素“缺失”。", 44, y, PAGE_W - 88, 10.5, 17)
    values = [("木", "WOOD", 0, WOOD), ("火", "FIRE", 4, FIRE), ("土", "EARTH", 1, EARTH), ("金", "METAL", 1, METAL), ("水", "WATER", 2, WATER)]
    max_value = max(item[2] for item in values)
    top = y - 80
    for index, (zh, en, count, color) in enumerate(values):
        yy = top - index * 56
        c.setFont(FONT_BOLD, 14)
        c.setFillColor(PAPER)
        c.drawString(44, yy, zh)
        c.setFont(FONT_BOLD, 6.5)
        c.setFillColor(MUTED)
        c.drawString(69, yy + 2, en)
        c.setFillColor(SURFACE)
        c.roundRect(123, yy - 3, PAGE_W - 205, 12, 6, fill=1, stroke=0)
        if count:
            c.setFillColor(color)
            c.roundRect(123, yy - 3, (PAGE_W - 205) * count / max_value, 12, 6, fill=1, stroke=0)
        c.setFont(FONT_BOLD, 13)
        c.setFillColor(PAPER_SOFT)
        c.drawRightString(PAGE_W - 44, yy, str(count))
    block(c, 44, top - 310, PAGE_W - 88, 142, "LIMITATION", "数量不是旺衰评分", "本阶段不计算藏干权重、季节旺衰、喜用神或吉凶。某一元素数量较少不表示缺陷，也不会被包装成需要付费修复的问题。", GOLD)
    footer(c, 4)
    c.showPage()


def draw_ziwei(c: canvas.Canvas) -> None:
    page_background(c, 4, "03 · Zi Wei")
    y = title(c, "紫微十二宫", "Natal palaces and major stars")
    paragraph(c, "以下宫位与星曜来自版本锁定的排盘引擎。它们是传统结构记录，不是事件结果或科学测量。", 44, y, PAGE_W - 88, 10.5, 17)
    block(c, 44, y - 72, PAGE_W - 88, 108, "CALCULATED FACT", "命宫丑 · 身宫亥 · 火六局", "命主巨门 · 身主火星 · 农历一九九〇年五月廿五 · 生肖马。", JADE)
    palaces = [
        ("命宫", "紫微、破军"), ("兄弟", "天机"), ("夫妻", "天府"),
        ("子女", "太阳、太阴"), ("财帛", "武曲、贪狼"), ("疾厄", "天同、巨门"),
        ("迁移", "天相"), ("仆役", "天梁"), ("官禄", "廉贞、七杀"),
        ("田宅", "无十四主星"), ("福德", "无十四主星"), ("父母", "无十四主星"),
    ]
    top = y - 205
    w = (PAGE_W - 112) / 3
    h = 82
    for index, (name, stars) in enumerate(palaces):
        row, col = divmod(index, 3)
        x = 44 + col * (w + 12)
        yy = top - row * (h + 10)
        block(c, x, yy, w, h, f"PALACE {index + 1:02d}", name, stars, GOLD if name == "命宫" else JADE)
    footer(c, 4)
    c.showPage()


def draw_western(c: canvas.Canvas) -> None:
    page_background(c, 5, "04 · Western natal")
    y = title(c, "西方本命盘", "Tropical zodiac · whole-sign houses")
    paragraph(c, "历史 IANA 时区把上海样本时间解析为 UTC+9；行星、角点与相位均来自本地星历计算。", 44, y, PAGE_W - 88, 10.5, 17)
    cx, cy = 170, y - 220
    for radius in (118, 88, 55):
        c.setStrokeColor(alpha(GOLD if radius != 88 else JADE, 0.55))
        c.circle(cx, cy, radius, fill=0, stroke=1)
    for angle in range(0, 360, 30):
        r = math.radians(angle)
        c.line(cx + math.cos(r) * 88, cy + math.sin(r) * 88, cx + math.cos(r) * 118, cy + math.sin(r) * 118)
    c.setFont(FONT_BOLD, 29)
    c.setFillColor(PAPER)
    c.drawCentredString(cx, cy - 8, "ASC")
    c.setFont(FONT_BOLD, 7)
    c.setFillColor(GOLD)
    c.drawCentredString(cx, cy - 28, "LEO 12°")
    x = 320
    placements = [("太阳", "双子 25° · H11"), ("月亮", "白羊 6° · H9"), ("水星", "双子 8° · H11"), ("金星", "金牛 20° · H10"), ("火星", "白羊 12° · H9"), ("天顶", "金牛 6°")]
    for index, (body, value) in enumerate(placements):
        yy = y - 78 - index * 66
        c.setFont(FONT_BOLD, 7)
        c.setFillColor(MUTED)
        c.drawString(x, yy, body)
        c.setFont(FONT_BOLD, 12)
        c.setFillColor(PAPER)
        c.drawString(x, yy - 21, value)
        c.setStrokeColor(LINE)
        c.line(x, yy - 34, PAGE_W - 44, yy - 34)
    block(c, 44, 142, PAGE_W - 88, 88, "LIMITATION", "位置是计算，解释是传统语言", "采用热带黄道与整宫制；角点依赖出生时间。符号解释不等于人格测量或结果判断。", CINNABAR)
    footer(c, 5)
    c.showPage()


def draw_timing(c: canvas.Canvas) -> None:
    page_background(c, 6, "05 · Current timing")
    y = title(c, "2026.09 · 结构与边界", "A dated, reproducible snapshot")
    paragraph(c, "本页只描述目标日的干支年月、紫微运限和行星角距。快照不是事件预言或好运评分。", 44, y, PAGE_W - 88, 10.5, 17)
    items = [
        ("八字 · CURRENT FACT", "丙午年 · 丁酉月", "目标日 2026-09-20 的节气月柱与年柱。"),
        ("紫微 · CURRENT FACT", "流年与流月宫位", "目标日期对应的流年、流月宫位与四化记录。"),
        ("西占 · CURRENT FACT", "土星三分本命上升", "目标日中午快照；容许度约 0.3°。"),
    ]
    top = y - 70
    for index, (label, heading, body) in enumerate(items):
        block(c, 44, top - index * 146, PAGE_W - 88, 128, label, heading, body, [JADE, GOLD, CINNABAR][index])
    block(c, 44, top - 438, PAGE_W - 88, 105, "TIMING BOUNDARY", "活跃只表示证据密度", "它不是好运、坏运、事件概率或结果保证；进入下个月后会重新计算。", GOLD)
    footer(c, 6)
    c.showPage()


def draw_synthesis(c: canvas.Canvas) -> None:
    page_background(c, 7, "06 · Synthesis")
    y = title(c, "结构 · 边界", "Rule synthesis with traceable evidence")
    paragraph(c, "只有两个或以上体系共享同一主题时才称为共识；规则不会把分歧平均成一个命运分数。", 44, y, PAGE_W - 88, 10.5, 17)
    block(c, 44, y - 72, PAGE_W - 88, 126, "CONSENSUS · THREE SYSTEMS", "先让承诺变得清楚", "多个计算来源同时留下秩序、判断或边界线索。这里提供的是可验证的反思方向，不保证外界结果。", CINNABAR)
    evidence = [
        ("八字 · EVIDENCE", "当前干支年月", "以明确目标日计算，提供当月传统背景。"),
        ("紫微 · EVIDENCE", "运限宫位", "记录流年与流月落宫，不转换成事件预言。"),
        ("西占 · EVIDENCE", "行运角距", "记录行运行星与本命点的几何关系。"),
    ]
    top = y - 224
    w = (PAGE_W - 112) / 3
    for index, (label, heading, body) in enumerate(evidence):
        block(c, 44 + index * (w + 12), top, w, 180, label, heading, body, JADE)
    block(c, 44, top - 198, PAGE_W - 88, 126, "REFLECTION PROMPT", "哪一条边界说清楚后，会让你更安心？", "先写下答案，再补一句：我有哪些现实事实支持这个感受？", GOLD)
    footer(c, 7)
    c.showPage()


def draw_domains(c: canvas.Canvas) -> None:
    page_background(c, 8, "07 · Life domains")
    y = title(c, "八个生命领域", "Themes, not scores")
    paragraph(c, "每个领域都使用同一组已计算事实；共识、张力与独立线索分别标注。", 44, y, PAGE_W - 88, 10.5, 17)
    domains = [("自我", "探索 · 重构"), ("事业", "结构 · 边界"), ("财富", "资源 · 配置"), ("爱情", "靠近 · 留白"), ("家庭", "观察 · 回应"), ("关系", "靠近 · 留白"), ("创造力", "表达 · 被看见"), ("内在成长", "观察 · 回应")]
    top = y - 65
    w = (PAGE_W - 100) / 2
    for index, (name, theme) in enumerate(domains):
        row, col = divmod(index, 2)
        x = 44 + col * (w + 12)
        yy = top - row * 119
        block(c, x, yy, w, 103, f"DOMAIN {index + 1:02d}", name, theme, JADE if index % 2 == 0 else GOLD)
    footer(c, 8)
    c.showPage()


def draw_lens(c: canvas.Canvas) -> None:
    page_background(c, 5, "04 · Traditional lens")
    y = title(c, "感知与流动", "A traditional lens for Yin Water")
    paragraph(c, "这一页明确属于传统反思，不是由元素数量自动推导出的科学或确定性结论。", 44, y, PAGE_W - 88, 10.5, 17)
    cx, cy = PAGE_W / 2, y - 165
    c.setStrokeColor(alpha(WATER, 0.72))
    c.setLineWidth(1.2)
    for offset in range(5):
        points = []
        for i in range(101):
            xx = 75 + (PAGE_W - 150) * i / 100
            yy = cy + (offset - 2) * 18 + math.sin(i / 10 + offset * 0.75) * 10
            points.append((xx, yy))
        path = c.beginPath()
        path.moveTo(*points[0])
        for point in points[1:]:
            path.lineTo(*point)
        c.drawPath(path, stroke=1, fill=0)
    top = y - 325
    block(c, 44, top, (PAGE_W - 100) / 2, 170, "TRADITIONAL REFLECTION", "一种语言，不是一项判决", "在八字传统中，水常被用来讨论感知、探索与流动。这里不预测变化，只邀请你观察信息如何进入与离开。", GOLD)
    block(c, 56 + (PAGE_W - 100) / 2, top, (PAGE_W - 100) / 2, 170, "REFLECTION PROMPT", "什么问题值得再多听一会儿？", "先写下最直接的答案，再补一句：我有哪些现实事实支持这个感受？", CINNABAR)
    footer(c, 5)
    c.showPage()


def draw_practice(c: canvas.Canvas) -> None:
    page_background(c, 9, "08 · Seven-day practice")
    y = title(c, "把观察带进七天", "One small practice at a time")
    paragraph(c, "这套练习不需要购买任何象征物，也不承诺改变运气或结果。", 44, y, PAGE_W - 88, 10.5, 17)
    items = [
        ("DAY 1-2", "观察", "记下一次能量最集中与最分散的时刻，不急着解释原因。"),
        ("DAY 3-4", "取舍", "暂停一个低价值承诺，把空出的时间留给最重要的一件事。"),
        ("DAY 5-6", "表达", "向相关的人说清一个需要、一个边界或一个尚未确定的问题。"),
        ("DAY 7", "回看", "写下最可靠的一条观察，以及仍然无法确认的一点。"),
    ]
    c.setStrokeColor(alpha(GOLD, 0.42))
    c.line(79, y - 70, 79, 160)
    top = y - 68
    for index, (days, heading, body) in enumerate(items):
        yy = top - index * 126
        c.setFillColor(CINNABAR if index == 3 else JADE)
        c.circle(79, yy, 6, fill=1, stroke=0)
        c.setFont(FONT_BOLD, 7)
        c.setFillColor(GOLD)
        c.drawString(104, yy + 20, days)
        c.setFont(FONT_BOLD, 18)
        c.setFillColor(PAPER)
        c.drawString(104, yy - 4, heading)
        paragraph(c, body, 104, yy - 27, PAGE_W - 158, 9, 15, PAPER_SOFT, max_lines=3)
    footer(c, 9)
    c.showPage()


def draw_journal(c: canvas.Canvas) -> None:
    page_background(c, 7, "06 · Journal")
    y = title(c, "留给你的空白", "Reflection does not need an immediate answer")
    prompts = ["我正在收敛什么？", "什么值得继续培育？", "哪一个判断仍需要更多现实证据？"]
    top = y - 18
    for index, prompt in enumerate(prompts, start=1):
        c.setFont(FONT_BOLD, 6.5)
        c.setFillColor(CINNABAR)
        c.drawString(44, top, f"PROMPT {index:02d}")
        c.setFont(FONT_BOLD, 16)
        c.setFillColor(PAPER)
        c.drawString(44, top - 28, prompt)
        for line in range(4):
            yy = top - 66 - line * 30
            c.setStrokeColor(LINE)
            c.line(44, yy, PAGE_W - 44, yy)
        top -= 206
    footer(c, 7)
    c.showPage()


def draw_appendix(c: canvas.Canvas) -> None:
    page_background(c, 10, "09 · Notes & limits")
    y = title(c, "计算说明与限制", "What this version can and cannot say")
    items = [
        ("TIME BASIS", "四柱按出生地当地民用时间计算，尚未应用真太阳时校正。"),
        ("ELEMENT COUNTS", "五行数量仅统计八个表层干支，不代表旺衰、喜用神或吉凶评分。"),
        ("LOCATION RECORD", "Shanghai, China · Asia/Shanghai · 31.2304, 121.4737（虚构演示资料）"),
        ("ENGINE RECORD", "BaZi 1.8.6 · iztro 2.6.1 · celestine 0.2.1 · rules 1.0.0"),
    ]
    top = y - 30
    for index, (label, body) in enumerate(items):
        block(c, 44, top - index * 105, PAGE_W - 88, 92, label, f"说明 {index + 1}", body, JADE if index % 2 == 0 else GOLD)
    c.setFillColor(alpha(CINNABAR, 0.13))
    c.setStrokeColor(alpha(CINNABAR, 0.45))
    c.roundRect(44, 83, PAGE_W - 88, 64, 12, fill=1, stroke=1)
    paragraph(c, "本报告用于个人反思与传统文化探索，不是科学预测，也不提供医疗、法律、财务、生育、死亡或安全建议。", 60, 121, PAGE_W - 120, 8.5, 14, PAPER_SOFT, max_lines=3)
    footer(c, 10)
    c.showPage()


def build_pdf() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    c.setTitle("Life Map Full Daily Reflection Report · Sample")
    c.setAuthor("Life Map")
    c.setSubject("A privacy-first, multi-system daily reflection report sample")
    c.setCreator("Life Map deterministic report generator")
    draw_cover(c)
    draw_method(c)
    draw_pillars(c)
    draw_ziwei(c)
    draw_western(c)
    draw_timing(c)
    draw_synthesis(c)
    draw_domains(c)
    draw_practice(c)
    draw_appendix(c)
    c.save()
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    build_pdf()
