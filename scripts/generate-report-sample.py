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
    c.drawRightString(PAGE_W - 44, PAGE_H - 48, f"{page_no:02d} / 08")


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
    c.drawString(44, PAGE_H - 116, "DETERMINISTIC CHART · REFLECTIVE READING")
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
    paragraph(c, "确定性四柱事实 × 克制的传统反思 × 可实践的日常问题", 44, 137, PAGE_W - 88, 10, 16)
    c.setFont(FONT, 7.5)
    c.setFillColor(MUTED)
    c.drawString(44, 86, "SAMPLE DATA · lunar-typescript v1.8.6 · life-map.bazi.v1")
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
    block(c, 44 + w + gap, top, w, 166, "ENGINE", "版本化四柱计算", "年界采用立春；月界采用节气中的“节”；日界采用出生地当地民用时间 00:00。", GOLD)
    block(c, 44, top - 182, w, 166, "CURRENT SCOPE", "只把八字视为真实计算", "紫微斗数、西方占星、真实时运与实时 AI 尚未进入本报告，不会伪装成已计算结论。", CINNABAR)
    block(c, 44 + w + gap, top - 182, w, 166, "READING BOUNDARY", "事实与解释分开", "CALCULATED FACT、TRADITIONAL REFLECTION 与 PRACTICE 使用不同标签，方便逐项核对。", JADE)
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
    page_background(c, 6, "05 · Seven-day practice")
    y = title(c, "把观察带进七天", "One small practice at a time")
    paragraph(c, "这套练习不需要购买任何象征物，也不承诺改变运气或结果。", 44, y, PAGE_W - 88, 10.5, 17)
    items = [
        ("DAY 1–2", "观察", "记下一次能量最集中与最分散的时刻，不急着解释原因。"),
        ("DAY 3–4", "取舍", "暂停一个低价值承诺，把空出的时间留给最重要的一件事。"),
        ("DAY 5–6", "表达", "向相关的人说清一个需要、一个边界或一个尚未确定的问题。"),
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
    footer(c, 6)
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
    page_background(c, 8, "07 · Notes & limits")
    y = title(c, "计算说明与限制", "What this version can and cannot say")
    items = [
        ("TIME BASIS", "四柱按出生地当地民用时间计算，尚未应用真太阳时校正。"),
        ("ELEMENT COUNTS", "五行数量仅统计八个表层干支，不代表旺衰、喜用神或吉凶评分。"),
        ("LOCATION RECORD", "Shanghai, China · Asia/Shanghai · 31.2304, 121.4737（虚构演示资料）"),
        ("ENGINE RECORD", "lunar-typescript v1.8.6 · life-map.bazi.v1 · Sample date 2026-09-19"),
    ]
    top = y - 30
    for index, (label, body) in enumerate(items):
        block(c, 44, top - index * 105, PAGE_W - 88, 92, label, f"说明 {index + 1}", body, JADE if index % 2 == 0 else GOLD)
    c.setFillColor(alpha(CINNABAR, 0.13))
    c.setStrokeColor(alpha(CINNABAR, 0.45))
    c.roundRect(44, 83, PAGE_W - 88, 64, 12, fill=1, stroke=1)
    paragraph(c, "本报告用于个人反思与传统文化探索，不是科学预测，也不提供医疗、法律、财务、生育、死亡或安全建议。", 60, 121, PAGE_W - 120, 8.5, 14, PAPER_SOFT, max_lines=3)
    footer(c, 8)
    c.showPage()


def build_pdf() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    c.setTitle("Life Map Full Daily Reflection Report · Sample")
    c.setAuthor("Life Map")
    c.setSubject("A privacy-first, multi-page BaZi reflection report sample")
    c.setCreator("Life Map deterministic report generator")
    draw_cover(c)
    draw_method(c)
    draw_pillars(c)
    draw_elements(c)
    draw_lens(c)
    draw_practice(c)
    draw_journal(c)
    draw_appendix(c)
    c.save()
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    build_pdf()
