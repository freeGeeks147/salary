#!/usr/bin/env python3
"""Builds the static site pages from the shared pieces in src/.

Every page gets the same header, menus, footer and modals (src/partials/) plus
its own calculator section (src/sections/), explanatory text (src/content/)
and FAQs (src/content/faqs.json). Each page is built twice: in English at the
site root and in Hindi under hi/. Edit those files, then run:

    python3 build.py

and commit the regenerated .html files. No packages need to be installed.

Besides the pages listed in PAGES, the build also writes:
  - one page per micro-tool at tools/<slug>/ (metadata in src/content/tools.json,
    inputs and rules read from assets/js/app.js),
  - the 7th Pay Commission and 8th CPC fitment factor pages, whose tables come
    from the pay matrix data in assets/js/app.js.
"""
import datetime
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
SITE_URL = "https://govtsalarycalc.com/"
SITE_NAME = "GovtSalaryCalc"
OG_IMAGE = SITE_URL + "assets/og-image.jpg"
LANGS = ["en", "hi"]

# path: output folder ("" = site root); section: file name in src/sections/ and src/content/
# Keep titles under ~60 characters and descriptions under ~155 so Google shows them in full.
PAGES = [
    {
        "path": "",
        "section": "salary",
        "hero": True,
        "name": "8th Pay Commission Salary Calculator",
        "title": "8th Pay Commission Salary Calculator 2026 | 7th & 8th CPC",
        "description": "Free 8th Pay Commission salary calculator: compare 7th & 8th CPC in-hand pay with DA, HRA, TA, NPS & income tax at any fitment factor. Updated 2026.",
        "hi": {
            "name": "8वां वेतन आयोग सैलरी कैलकुलेटर",
            "title": "8वां वेतन आयोग सैलरी कैलकुलेटर 2026 | 7वां और 8वां CPC",
            "description": "मुफ़्त 8वां वेतन आयोग सैलरी कैलकुलेटर: किसी भी फिटमेंट फैक्टर पर DA, HRA, TA, NPS और इनकम टैक्स के साथ 7वें और 8वें CPC की इन-हैंड सैलरी की तुलना।",
        },
    },
    {
        "path": "pay-matrix/",
        "section": "matrix",
        "name": "7th & 8th CPC Pay Matrix",
        "title": "7th & 8th CPC Pay Matrix Table (Level 1–18) | GovtSalaryCalc",
        "description": "Full 7th CPC pay matrix for all pay levels 1–18 with projected 8th Pay Commission basic pay at any fitment factor, plus fitment factor history.",
        "hi": {
            "name": "7वें और 8वें CPC का पे मैट्रिक्स",
            "title": "7वें और 8वें वेतन आयोग का पे मैट्रिक्स (लेवल 1–18)",
            "description": "सभी पे लेवल 1–18 का पूरा 7वें CPC पे मैट्रिक्स, किसी भी फिटमेंट फैक्टर पर 8वें वेतन आयोग की अनुमानित बेसिक पे के साथ।",
        },
    },
    {
        "path": "arrears-allowances/",
        "section": "arrears",
        "name": "8th CPC Arrears & Allowance Calculator",
        "title": "8th CPC Arrears & DA Arrears Calculator | GovtSalaryCalc",
        "description": "Calculate 8th Pay Commission arrears from January 2026, DA arrears, HRA exemption u/s 10(13A), night duty allowance and Diwali bonus (PLB).",
        "hi": {
            "name": "8वें CPC का एरियर और भत्ता कैलकुलेटर",
            "title": "8वें वेतन आयोग का एरियर और DA एरियर कैलकुलेटर",
            "description": "जनवरी 2026 से 8वें वेतन आयोग का एरियर, DA एरियर, धारा 10(13A) HRA छूट, नाइट ड्यूटी भत्ता और दिवाली बोनस (PLB) निकालें।",
        },
    },
    {
        "path": "pension/",
        "section": "pension",
        "name": "UPS vs NPS Pension & Gratuity Calculator",
        "title": "UPS vs NPS Pension & Gratuity Calculator | GovtSalaryCalc",
        "description": "Compare Unified Pension Scheme (UPS) and NPS pension for central govt employees, with gratuity, leave encashment, commutation and MACP pay fixation.",
        "hi": {
            "name": "UPS बनाम NPS पेंशन और ग्रेच्युटी कैलकुलेटर",
            "title": "UPS बनाम NPS पेंशन और ग्रेच्युटी कैलकुलेटर",
            "description": "केंद्रीय कर्मचारियों के लिए एकीकृत पेंशन योजना (UPS) और NPS पेंशन की तुलना, ग्रेच्युटी, लीव एनकैशमेंट, कम्यूटेशन और MACP वेतन निर्धारण के साथ।",
        },
    },
    {
        "path": "income-tax/",
        "section": "tax",
        "name": "Income Tax Calculator FY 2026-27 for Government Employees",
        "title": "Income Tax Calculator FY 2026-27 for Govt Employees",
        "description": "Income tax on government salary for FY 2026-27: new vs old regime with 87A rebate, 80C, 80D, 80CCD(2) and HRA exemption, plus post-wise presets.",
        "hi": {
            "name": "सरकारी कर्मचारियों के लिए इनकम टैक्स कैलकुलेटर 2026-27",
            "title": "सरकारी कर्मचारियों का इनकम टैक्स कैलकुलेटर 2026-27",
            "description": "वित्त वर्ष 2026-27 में सरकारी सैलरी पर इनकम टैक्स: 87A छूट, 80C, 80D, 80CCD(2) और HRA छूट के साथ नई बनाम पुरानी व्यवस्था।",
        },
    },
    {
        "path": "tools/",
        "section": "tools",
        "name": "Government Employee Calculators",
        "title": "46 Govt Employee Calculators: DA, HRA, GPF, LTC | GovtSalaryCalc",
        "description": "DA, HRA, transport allowance, LTC, CGHS, leave, TA/DA on tour, posting allowance, GPF, pension and 40 more calculators for central government employees.",
        "hi": {
            "name": "सरकारी कर्मचारियों के कैलकुलेटर",
            "title": "46 सरकारी कर्मचारी कैलकुलेटर: DA, HRA, GPF, LTC",
            "description": "केंद्रीय सरकारी कर्मचारियों के लिए DA, HRA, परिवहन भत्ता, LTC, CGHS, छुट्टी, टूर पर TA/DA, GPF, पेंशन और 40 और कैलकुलेटर।",
        },
    },
    {
        "path": "8th-pay-commission/",
        "section": "guides",
        "name": "8th Pay Commission Latest News & Timeline",
        "title": "8th Pay Commission Latest News, Timeline & Fitment Factor",
        "description": "8th Pay Commission latest status, chairperson, timeline, expected fitment factor and effective date, plus state govt salary and DA comparison.",
        "hi": {
            "name": "8वां वेतन आयोग ताज़ा ख़बर और टाइमलाइन",
            "title": "8वां वेतन आयोग: ताज़ा ख़बर, टाइमलाइन और फिटमेंट फैक्टर",
            "description": "8वें वेतन आयोग की ताज़ा स्थिति, अध्यक्ष, टाइमलाइन, अपेक्षित फिटमेंट फैक्टर और लागू होने की तारीख, साथ में राज्यों के वेतन और DA की तुलना।",
        },
    },
    {
        "path": "8th-pay-commission/fitment-factor/",
        "section": "fitment",
        "parent": "8th-pay-commission/",
        "name": "8th Pay Commission Fitment Factor",
        "title": "8th Pay Commission Fitment Factor: Basic Pay by Level",
        "description": "8th CPC fitment factor explained, with the new basic pay for every pay level at 1.83, 1.92, 2.08, 2.28, 2.57 and 2.86, and the minimum salary at each.",
        "hi": {
            "name": "8वें वेतन आयोग का फिटमेंट फैक्टर",
            "title": "8वें वेतन आयोग का फिटमेंट फैक्टर: लेवल अनुसार नई बेसिक पे",
            "description": "8वें CPC का फिटमेंट फैक्टर आसान भाषा में, हर पे लेवल की नई बेसिक पे 1.83, 1.92, 2.08, 2.28, 2.57 और 2.86 पर, और हर फैक्टर पर न्यूनतम वेतन।",
        },
    },
    {
        "path": "7th-pay-commission/",
        "section": "cpc7",
        "name": "7th Pay Commission",
        "title": "7th Pay Commission: Pay Matrix, DA, Fitment 2.57 & Salary",
        "description": "7th Central Pay Commission in one page: pay levels and starting pay, fitment factor 2.57, minimum ₹18,000, DA and HRA rates, and a salary calculator.",
        "hi": {
            "name": "7वां वेतन आयोग",
            "title": "7वां वेतन आयोग: पे मैट्रिक्स, DA, फिटमेंट 2.57 और सैलरी",
            "description": "7वां केंद्रीय वेतन आयोग एक पेज में: पे लेवल और शुरुआती वेतन, फिटमेंट फैक्टर 2.57, न्यूनतम ₹18,000, DA और HRA दरें, और सैलरी कैलकुलेटर।",
        },
    },
]

TOOL_CATEGORIES = {
    "PAY_CAREER": ("Pay, pay fixation & career", "वेतन, वेतन निर्धारण और करियर"),
    "ALLOWANCES_TOUR": ("Allowances, tour, LTC & quarters", "भत्ते, टूर, LTC और आवास"),
    "PENSION_LEAVE": ("GPF, pension, leave & retirement", "GPF, पेंशन, छुट्टी और सेवानिवृत्ति"),
    "TAX_SAVINGS": ("Tax, loans & savings", "टैक्स, लोन और बचत"),
    "SECTORS_ELIGIBILITY": ("Banks, PSUs, defence, states & eligibility", "बैंक, PSU, रक्षा, राज्य और पात्रता"),
}

# The tools most people search for; shown in the footer of every page.
POPULAR_TOOLS = [
    "da_calculator_tool", "hra_calculator_tool", "gpf_calculator", "commuted_pension", "ltc_calculator",
    "leave_rules_guide", "ta_calculator_guide", "family_pension_80plus", "retire_date_dlc", "sukanya_samriddhi",
    "post_office_savings", "hba_loan_calc",
]

FITMENT_FACTORS = [1.83, 1.92, 2.08, 2.28, 2.57, 2.86]

PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="{lang}"{prefix_attr}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <title>{title}</title>
  <meta name="description" content="{description}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="{canonical}" />
  <link rel="alternate" hreflang="en" href="{url_en}" />
  <link rel="alternate" hreflang="hi" href="{url_hi}" />
  <link rel="alternate" hreflang="x-default" href="{url_en}" />
  <meta name="theme-color" content="#0f172a" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="{site_name}" />
  <meta property="og:locale" content="{og_locale}" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{description}" />
  <meta property="og:url" content="{canonical}" />
  <meta property="og:image" content="{og_image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{title}" />
  <meta name="twitter:description" content="{description}" />
  <meta name="twitter:image" content="{og_image}" />
  <link rel="icon" href="{root}assets/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,600;0,6..72,700;1,6..72,600&family=Noto+Sans+Bengali:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{root}assets/css/site.css" />
  <script>window.GSC_TOOL_SLUGS = {tool_slugs};</script>
  <script defer src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script defer src="{root}assets/js/app.js"></script>
  <script type="application/ld+json">
{json_ld}
  </script>
</head>
<body class="min-h-screen flex flex-col pb-20 md:pb-8" data-page-name="{page_name}"{tool_attr}>
{header}
{hero}
{banners}
  <main class="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 no-print">
{section}
{content}
  </main>
{footer}
</body>
</html>
"""

PROSE_TEMPLATE = """    <section class="seo-content bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-3">
{prose}
    </section>
"""

FAQ_TEMPLATE = """    <section class="seo-content bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
      <h2>{heading}</h2>
{items}
    </section>
"""

FAQ_ITEM_TEMPLATE = """      <div class="space-y-1">
        <h3>{q}</h3>
        <p>{a}</p>
      </div>"""


def t(lang, en, hi):
    return hi if lang == "hi" else en


def read(path):
    return (SRC / path).read_text(encoding="utf-8")


def strip_comments(markup):
    """Drops HTML comments (developer notes) from the published page."""
    markup = re.sub(r"<!--.*?-->", "", markup, flags=re.S)
    return re.sub(r"\n\s*\n(\s*\n)+", "\n\n", markup)


def inr(n):
    """1234567 -> ₹12,34,567 (Indian digit grouping)."""
    s = str(int(round(n)))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        head = re.sub(r"(\d)(?=(\d\d)+$)", r"\1,", head)
        s = head + "," + tail
    return "₹" + s


# ---------------------------------------------------------------------------
# Data read from assets/js/app.js (the calculators' single source of truth)
# ---------------------------------------------------------------------------

def js_string(raw):
    return json.loads('"' + raw + '"')


def parse_app_js():
    js = (ROOT / "assets/js/app.js").read_text(encoding="utf-8")

    levels = []
    for m in re.finditer(r'\{ id: "(\w+)",\s*name: "([^"]+)",\s*gp: "([^"]+)",\s*post: "([^"]+)",\s*entry: (\d+)', js):
        levels.append({"id": m[1], "name": m[2], "gp": m[3], "post": m[4], "entry": int(m[5])})

    cells_block = js[js.index("const OFFICIAL_CELLS = {"):]
    cells_block = cells_block[:cells_block.index("};")]
    cells = {m[1]: [int(x) for x in m[2].split(",")] for m in re.finditer(r'"(\w+)": \[([\d,\s]+)\]', cells_block)}

    i18n_hi = {}
    hi_block = js[js.index("    hi: {", js.index("const I18N = {")):js.index("    bn: {", js.index("const I18N = {"))]
    for m in re.finditer(r'^\s*([A-Za-z0-9_]+):\s*"((?:[^"\\]|\\.)*)",?\s*$', hi_block, flags=re.M):
        i18n_hi[m[1]] = js_string(m[2])

    reg = js[js.index("const MICRO_TOOLS_REGISTRY = ["):js.index("function renderMicroToolsGrid")]
    tools = []
    chunks = re.split(r'\n    \{\n      id: "', reg)[1:]
    q = r'"((?:[^"\\]|\\.)*)"'
    for chunk in chunks:
        tid = chunk[:chunk.index('"')]

        def tri(key):
            m = re.search(key + r': \{\s*en: ' + q + r',\s*hi: ' + q + r',\s*bn: ' + q, chunk)
            return dict(zip(["en", "hi", "bn"], map(js_string, m.groups())))
        rule = re.search(r'\brule: ' + q, chunk)
        tools.append({
            "id": tid,
            "cat": re.search(r'cat: "(\w+)"', chunk)[1],
            "icon": js_string(re.search(r'icon: ' + q, chunk)[1]),
            "badge": js_string(re.search(r'badge: ' + q, chunk)[1]),
            "title": tri("title"),
            "desc": tri("desc"),
            "inputs": [js_string(v) for v in re.findall(r'label: ' + q, chunk)],
            "rule": js_string(rule[1]) if rule else "",
        })
    return levels, cells, i18n_hi, tools


LEVELS, CELLS, I18N_HI, TOOLS = parse_app_js()
TOOL_SEO = {k: v for k, v in json.loads(read("content/tools.json")).items() if not k.startswith("_")}
TOOLS = [tool for tool in TOOLS if tool["id"] in TOOL_SEO]
TOOL_BY_ID = {tool["id"]: tool for tool in TOOLS}
TOOL_SLUGS = {tool["id"]: TOOL_SEO[tool["id"]]["slug"] for tool in TOOLS}
TAB_PATHS = {
    "tab-salary": "", "tab-matrix": "pay-matrix/", "tab-arrears": "arrears-allowances/",
    "tab-pension": "pension/", "tab-tax": "income-tax/", "tab-microtools": "tools/",
    "tab-guides": "8th-pay-commission/", "tab-cpc7": "7th-pay-commission/",
    "tab-fitment": "8th-pay-commission/fitment-factor/",
}


# ---------------------------------------------------------------------------
# Generated sections
# ---------------------------------------------------------------------------

CARD = "bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4"
TABLE_WRAP = "overflow-x-auto rounded-xl border border-slate-200"
TABLE = "w-full text-sm text-left"
TH = "px-3 py-2.5 bg-slate-100 text-slate-700 font-semibold whitespace-nowrap"
TD = "px-3 py-2.5 border-t border-slate-100 whitespace-nowrap"
BTN = "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold"


def fact_cards(items):
    cards = "".join(
        f'<div class="rounded-xl bg-slate-50 border border-slate-200 p-3"><div class="text-xs text-slate-500">{k}</div>'
        f'<div class="font-serif-display text-xl sm:text-2xl font-bold text-slate-900">{v}</div></div>'
        for k, v in items
    )
    return f'<div class="grid grid-cols-2 md:grid-cols-3 gap-3">{cards}</div>'


def link_buttons(items):
    return '<div class="flex flex-wrap gap-2">' + "".join(
        f'<a href="{href}" class="{BTN} {"bg-slate-900 text-white hover:bg-slate-800" if i == 0 else "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50"}">{label}</a>'
        for i, (label, href) in enumerate(items)
    ) + "</div>"


def section_cpc7(lang):
    rows = "".join(
        f'<tr><td class="{TD} font-semibold">{lv["name"].replace("Level", t(lang, "Level", "लेवल"))}</td><td class="{TD}">{lv["gp"]}</td>'
        f'<td class="{TD} font-mono">{inr(lv["entry"])}</td><td class="{TD} font-mono">{inr(CELLS.get(lv["id"], [lv["entry"]])[-1])}</td>'
        f'<td class="{TD} whitespace-normal min-w-[220px] text-slate-600">{html.escape(lv["post"])}</td></tr>'
        for lv in LEVELS
    )
    da_rows = "".join(f'<tr><td class="{TD}">{d}</td><td class="{TD} font-mono">{r}</td></tr>' for d, r in [
        (t(lang, "January 2024", "जनवरी 2024"), "50%"), (t(lang, "July 2024", "जुलाई 2024"), "53%"),
        (t(lang, "January 2025", "जनवरी 2025"), "55%"), (t(lang, "July 2025", "जुलाई 2025"), "58%"),
        (t(lang, "January 2026", "जनवरी 2026"), "60%")])
    hra_rows = "".join(f'<tr><td class="{TD}">{c}</td><td class="{TD} font-mono">{a}</td><td class="{TD} font-mono">{b}</td><td class="{TD} font-mono">{d}</td></tr>' for c, a, b, d in [
        (t(lang, "X (big cities)", "X (बड़े शहर)"), "24%", "27%", "30%"),
        (t(lang, "Y (other cities)", "Y (अन्य शहर)"), "16%", "18%", "20%"),
        (t(lang, "Z (rest of India)", "Z (बाकी भारत)"), "8%", "9%", "10%")])
    return f"""    <section id="tab-cpc7" class="tab-panel space-y-5">
      <div class="{CARD}">
        <h1 class="font-serif-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{t(lang, "7th Pay Commission: pay matrix, DA and salary", "7वां वेतन आयोग: पे मैट्रिक्स, DA और सैलरी")}</h1>
        <p class="text-base text-slate-600 max-w-3xl">{t(lang, "Everything about the 7th Central Pay Commission that decides central government pay today, on one page.", "आज केंद्रीय सरकारी वेतन तय करने वाले 7वें केंद्रीय वेतन आयोग की पूरी जानकारी, एक पेज पर।")}</p>
        {fact_cards([
            (t(lang, "In force from", "लागू"), t(lang, "1 Jan 2016", "1 जनवरी 2016")),
            (t(lang, "Fitment factor", "फिटमेंट फैक्टर"), "2.57"),
            (t(lang, "Minimum basic pay", "न्यूनतम बेसिक पे"), "₹18,000"),
            (t(lang, "Maximum basic pay", "अधिकतम बेसिक पे"), "₹2,50,000"),
            (t(lang, "Annual increment", "सालाना इंक्रीमेंट"), "3%"),
            (t(lang, "DA from Jan 2026", "जनवरी 2026 से DA"), "60%"),
        ])}
        {link_buttons([
            (t(lang, "Calculate my salary →", "मेरी सैलरी निकालें →"), "{{ROOT}}"),
            (t(lang, "Full pay matrix", "पूरा पे मैट्रिक्स"), "{{ROOT}}pay-matrix/"),
            (t(lang, "DA calculator", "DA कैलकुलेटर"), "{{ROOT}}tools/" + TOOL_SLUGS["da_calculator_tool"] + "/"),
            (t(lang, "HRA calculator", "HRA कैलकुलेटर"), "{{ROOT}}tools/" + TOOL_SLUGS["hra_calculator_tool"] + "/"),
        ])}
      </div>
      <div class="{CARD}">
        <h2 class="text-lg sm:text-xl font-extrabold text-slate-900">{t(lang, "Pay levels and basic pay", "पे लेवल और बेसिक पे")}</h2>
        <p class="text-sm text-slate-600">{t(lang, "Starting and highest basic pay in each level of the 7th CPC pay matrix, with the old grade pay and typical posts.", "7वें CPC पे मैट्रिक्स के हर लेवल की शुरुआती और सबसे ऊँची बेसिक पे, पुराने ग्रेड पे और आम पदों के साथ।")}</p>
        <div class="{TABLE_WRAP}"><table class="{TABLE}"><thead><tr>
          <th class="{TH}">{t(lang, "Level", "लेवल")}</th><th class="{TH}">{t(lang, "Old grade pay", "पुराना ग्रेड पे")}</th><th class="{TH}">{t(lang, "Starting basic pay", "शुरुआती बेसिक पे")}</th><th class="{TH}">{t(lang, "Highest basic pay", "सबसे ऊँची बेसिक पे")}</th><th class="{TH}">{t(lang, "Typical posts", "आम पद")}</th>
        </tr></thead><tbody>{rows}</tbody></table></div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div class="{CARD}">
          <h2 class="text-lg sm:text-xl font-extrabold text-slate-900">{t(lang, "Recent DA rates", "हाल की DA दरें")}</h2>
          <div class="{TABLE_WRAP}"><table class="{TABLE}"><thead><tr><th class="{TH}">{t(lang, "From", "से")}</th><th class="{TH}">{t(lang, "DA (% of basic pay)", "DA (बेसिक पे का %)")}</th></tr></thead><tbody>{da_rows}</tbody></table></div>
          <p class="text-xs text-slate-500">{t(lang, "DA is revised every January and July. Rates as used in this site's calculators.", "DA हर जनवरी और जुलाई में बदलता है। ये दरें इस साइट के कैलकुलेटर में इस्तेमाल होती हैं।")}</p>
        </div>
        <div class="{CARD}">
          <h2 class="text-lg sm:text-xl font-extrabold text-slate-900">{t(lang, "HRA rates", "HRA दरें")}</h2>
          <div class="{TABLE_WRAP}"><table class="{TABLE}"><thead><tr><th class="{TH}">{t(lang, "City class", "शहर की श्रेणी")}</th><th class="{TH}">{t(lang, "Base", "मूल")}</th><th class="{TH}">{t(lang, "DA over 25%", "DA 25% से ऊपर")}</th><th class="{TH}">{t(lang, "DA over 50%", "DA 50% से ऊपर")}</th></tr></thead><tbody>{hra_rows}</tbody></table></div>
          <p class="text-xs text-slate-500">{t(lang, "HRA is a percentage of basic pay, with a minimum of ₹5,400 / ₹3,600 / ₹1,800.", "HRA बेसिक पे का प्रतिशत है, न्यूनतम ₹5,400 / ₹3,600 / ₹1,800।")}</p>
        </div>
      </div>
    </section>
"""


def section_fitment(lang):
    head = "".join(f'<th class="{TH} text-right{" bg-emerald-100 text-emerald-900" if f == 1.92 else ""}">×{f:.2f}</th>' for f in FITMENT_FACTORS)
    rows = "".join(
        f'<tr><td class="{TD} font-semibold">{lv["name"].replace("Level", t(lang, "Level", "लेवल"))}</td><td class="{TD} font-mono text-right">{inr(lv["entry"])}</td>'
        + "".join(f'<td class="{TD} font-mono text-right{" bg-emerald-50 font-bold" if f == 1.92 else ""}">{inr(lv["entry"] * f)}</td>' for f in FITMENT_FACTORS)
        + "</tr>"
        for lv in LEVELS
    )
    return f"""    <section id="tab-fitment" class="tab-panel space-y-5">
      <div class="{CARD}">
        <h1 class="font-serif-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{t(lang, "8th Pay Commission fitment factor", "8वें वेतन आयोग का फिटमेंट फैक्टर")}</h1>
        <p class="text-base text-slate-600 max-w-3xl">{t(lang, "Your new basic pay = your 7th CPC basic pay × the fitment factor. The factor has not been announced yet; here is what each likely factor would mean.", "आपकी नई बेसिक पे = 7वें CPC की बेसिक पे × फिटमेंट फैक्टर। फैक्टर अभी घोषित नहीं हुआ है; यहाँ देखें कि हर संभावित फैक्टर का क्या मतलब होगा।")}</p>
        {fact_cards([
            (t(lang, "Minimum pay at 1.92", "1.92 पर न्यूनतम वेतन"), inr(18000 * 1.92)),
            (t(lang, "Minimum pay at 2.28", "2.28 पर न्यूनतम वेतन"), inr(18000 * 2.28)),
            (t(lang, "Minimum pay at 2.86", "2.86 पर न्यूनतम वेतन"), inr(18000 * 2.86)),
            (t(lang, "7th CPC factor", "7वें CPC का फैक्टर"), "2.57"),
            (t(lang, "6th CPC factor", "6वें CPC का फैक्टर"), "1.86"),
            (t(lang, "8th CPC factor", "8वें CPC का फैक्टर"), t(lang, "Not announced", "घोषित नहीं")),
        ])}
        {link_buttons([
            (t(lang, "Calculate my 8th CPC salary →", "मेरी 8वें CPC की सैलरी निकालें →"), "{{ROOT}}"),
            (t(lang, "Full pay matrix", "पूरा पे मैट्रिक्स"), "{{ROOT}}pay-matrix/"),
            (t(lang, "8th CPC latest news", "8वें CPC की ताज़ा ख़बर"), "{{ROOT}}8th-pay-commission/"),
        ])}
      </div>
      <div class="{CARD}">
        <h2 class="text-lg sm:text-xl font-extrabold text-slate-900">{t(lang, "New starting basic pay for every level", "हर लेवल की नई शुरुआती बेसिक पे")}</h2>
        <p class="text-sm text-slate-600">{t(lang, "Starting (first cell) basic pay of each 7th CPC level, multiplied by each fitment factor. The 1.92 column is the most widely quoted estimate.", "7वें CPC के हर लेवल की शुरुआती (पहले सेल की) बेसिक पे, हर फिटमेंट फैक्टर से गुणा करके। 1.92 वाला कॉलम सबसे ज़्यादा उद्धृत अनुमान है।")}</p>
        <div class="{TABLE_WRAP}"><table class="{TABLE}"><thead><tr><th class="{TH}">{t(lang, "Level", "लेवल")}</th><th class="{TH} text-right">{t(lang, "7th CPC now", "अभी (7वां CPC)")}</th>{head}</tr></thead><tbody>{rows}</tbody></table></div>
        <p class="text-xs text-slate-500">{t(lang, "Estimates only. The final factor will be decided by the 8th Pay Commission and the Government of India.", "केवल अनुमान। अंतिम फैक्टर 8वां वेतन आयोग और भारत सरकार तय करेंगे।")}</p>
      </div>
    </section>
"""


def section_tool(tool, lang):
    """The tools page section, opened on one tool, with that tool's heading."""
    markup = read("sections/tools.html")
    markup = re.sub(r'<h1 class="([^"]*)" data-i18n="mt_hub_title">.*?</h1>',
                    lambda m: f'<h1 class="{m[1]}">{html.escape(tool["icon"] + " " + tool["title"][lang])}</h1>', markup, flags=re.S)
    markup = re.sub(r'<p class="([^"]*)" data-i18n="mt_hub_sub">.*?</p>',
                    lambda m: f'<p class="{m[1]}">{html.escape(tool["desc"][lang])}</p>', markup, flags=re.S)
    return markup


SECTION_BUILDERS = {"cpc7": section_cpc7, "fitment": section_fitment}


# ---------------------------------------------------------------------------
# Generated text blocks
# ---------------------------------------------------------------------------

def tool_href(tool_id):
    return "{{ROOT}}tools/" + TOOL_SLUGS[tool_id] + "/"


def tools_directory(lang, current=None):
    groups = []
    for cat, names in TOOL_CATEGORIES.items():
        items = "".join(
            f'<li><a href="{tool_href(tool["id"])}">{html.escape(tool["title"][lang])}</a></li>'
            for tool in TOOLS if tool["cat"] == cat and tool["id"] != current
        )
        groups.append(f"<h3>{t(lang, *names)}</h3>\n<ul>{items}</ul>")
    return "\n".join(groups)


def tool_content(tool, lang):
    seo = TOOL_SEO[tool["id"]]
    intro = seo.get("intro") if lang == "en" and seo.get("intro") else tool["desc"][lang]
    inputs = "".join(f"<li>{html.escape(label)}</li>" for label in tool["inputs"])
    related = [x for x in TOOLS if x["cat"] == tool["cat"] and x["id"] != tool["id"]][:8]
    related_html = "".join(f'<li><a href="{tool_href(x["id"])}">{html.escape(x["title"][lang])}</a></li>' for x in related)
    rule = ""
    if tool["rule"]:
        rule = f'<h2>{t(lang, "The rule it uses", "यह किस नियम पर आधारित है")}</h2>\n<p>{html.escape(tool["rule"])}</p>'
    return f"""<h2>{t(lang, "About this calculator", "इस कैलकुलेटर के बारे में")}</h2>
<p>{html.escape(intro)}</p>
<h2>{t(lang, "How to use it", "इसे कैसे इस्तेमाल करें")}</h2>
<ol>
<li>{t(lang, "Set your pay level and basic pay in the <a href=\"{{ROOT}}\">main salary calculator</a> (it starts at Level 10, ₹56,100). This calculator uses them automatically.", "<a href=\"{{ROOT}}\">मुख्य सैलरी कैलकुलेटर</a> में अपना पे लेवल और बेसिक पे भरें (शुरुआत लेवल 10, ₹56,100 से)। यह कैलकुलेटर उन्हें अपने-आप इस्तेमाल करता है।")}</li>
<li>{t(lang, "Choose whether to use your current 7th CPC pay or projected 8th CPC pay with the switch at the top.", "ऊपर के स्विच से चुनें कि मौजूदा 7वें CPC का वेतन इस्तेमाल हो या अनुमानित 8वें CPC का।")}</li>
<li>{t(lang, "Fill in the boxes below the title. The result and the full breakdown update as you type.", "शीर्षक के नीचे के बॉक्स भरें। नतीजा और पूरा ब्योरा टाइप करते ही बदल जाता है।")}</li>
</ol>
<h2>{t(lang, "What you enter", "आपको क्या भरना है")}</h2>
<ul>{inputs}</ul>
{rule}
<h2>{t(lang, "Related calculators", "मिलते-जुलते कैलकुलेटर")}</h2>
<ul>{related_html}</ul>
<p><a href="{{{{ROOT}}}}tools/">{t(lang, "See all 46 calculators →", "सभी 46 कैलकुलेटर देखें →")}</a></p>
<p class="text-xs text-slate-500">{t(lang, "Results are estimates for information only, based on published government rules. Confirm with your DDO, PAO or controlling office.", "नतीजे केवल जानकारी के लिए अनुमान हैं, प्रकाशित सरकारी नियमों पर आधारित। अपने DDO, PAO या नियंत्रक कार्यालय से पुष्टि करें।")}</p>"""


def site_links(lang):
    """Footer link directory: real links so every page is reachable by search engines."""
    main = [(t(lang, "8th CPC salary calculator", "8वां CPC सैलरी कैलकुलेटर"), ""),
            (t(lang, "Pay matrix", "पे मैट्रिक्स"), "pay-matrix/"),
            (t(lang, "Arrears & DA arrears", "एरियर और DA एरियर"), "arrears-allowances/"),
            (t(lang, "UPS / NPS pension", "UPS / NPS पेंशन"), "pension/"),
            (t(lang, "Income tax 2026-27", "इनकम टैक्स 2026-27"), "income-tax/"),
            (t(lang, "All 46 calculators", "सभी 46 कैलकुलेटर"), "tools/")]
    cpc = [(t(lang, "8th Pay Commission news", "8वां वेतन आयोग ख़बर"), "8th-pay-commission/"),
           (t(lang, "8th CPC fitment factor", "8वें CPC का फिटमेंट फैक्टर"), "8th-pay-commission/fitment-factor/"),
           (t(lang, "7th Pay Commission", "7वां वेतन आयोग"), "7th-pay-commission/")]
    col = lambda head, items: (f'<div><div class="font-bold text-slate-200 mb-2">{head}</div><ul class="space-y-1">'
                               + "".join(f'<li><a class="hover:text-white" href="{{{{ROOT}}}}{p}">{html.escape(n)}</a></li>' for n, p in items) + "</ul></div>")
    popular = [(TOOL_BY_ID[i]["title"][lang], "tools/" + TOOL_SLUGS[i] + "/") for i in POPULAR_TOOLS if i in TOOL_BY_ID]
    half = (len(popular) + 1) // 2
    return (f'<nav aria-label="{t(lang, "Site links", "साइट लिंक")}" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-5 border-t border-slate-800/90 text-xs text-slate-400">'
            + col(t(lang, "Calculators", "कैलकुलेटर"), main)
            + col(t(lang, "Pay commission", "वेतन आयोग"), cpc)
            + col(t(lang, "Popular calculators", "लोकप्रिय कैलकुलेटर"), popular[:half])
            + col("&nbsp;", popular[half:])
            + "</nav>")


# ---------------------------------------------------------------------------
# Page assembly
# ---------------------------------------------------------------------------

def page_url(path, lang):
    return SITE_URL + ("hi/" if lang == "hi" else "") + path


def translate_i18n(markup, lang):
    """Fills plain-text elements marked data-i18n="key" with the Hindi text (as the browser
    script does on load), so the Hindi pages are already in Hindi for search engines."""
    if lang != "hi":
        return markup

    def sub(m):
        body = m.group("body")
        text = I18N_HI.get(m.group("key"))
        if text is None or "<" in body:
            return m.group(0)
        return m.group(1) + html.escape(text, quote=False) + m.group("end")
    return re.sub(r'(<(?P<tag>[a-zA-Z0-9]+)\b[^>]*\bdata-i18n="(?P<key>[^"]+)"[^>]*>)(?P<body>.*?)(?P<end></(?P=tag)>)', sub, markup, flags=re.S)


def nav_links(markup):
    """Turns menu buttons that open a page or a tool into real links (the browser script
    still handles them in place when they point to the current page)."""
    def sub(m):
        kind, val, attrs, body = m.group(1), m.group(2), m.group(3), m.group(4)
        if kind == "tab" and val in TAB_PATHS:
            href = "{{ROOT}}" + TAB_PATHS[val]
        elif kind == "mt" and val in TOOL_SLUGS:
            href = tool_href(val)
        else:
            return m.group(0)
        return f'<a href="{href}" data-nav-action="{kind}:{val}"{attrs}>{body}</a>'
    return re.sub(r'<button type="button" data-nav-action="(tab|mt):([^"]+)"([^>]*)>(.*?)</button>', sub, markup, flags=re.S)


def json_ld(page, faqs, lang):
    url = page_url(page["path"], lang)
    graph = [{
        "@type": "WebApplication",
        "@id": url + "#app",
        "name": page["name"],
        "url": url,
        "description": page["description"],
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "Any",
        "inLanguage": "hi-IN" if lang == "hi" else "en-IN",
        "isAccessibleForFree": True,
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "INR"},
        "publisher": {"@id": SITE_URL + "#organization"},
    }]
    if faqs:
        graph.append({
            "@type": "FAQPage",
            "@id": url + "#faq",
            "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}} for q, a in faqs],
        })
    if page["path"]:
        crumbs = [(t(lang, "Home", "होम"), page_url("", lang))]
        for parent in page.get("crumbs", []):
            crumbs.append(parent)
        crumbs.append((page["name"], url))
        graph.append({
            "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(crumbs)],
        })
    else:
        graph[:0] = [
            {"@type": "Organization", "@id": SITE_URL + "#organization", "name": SITE_NAME, "url": SITE_URL, "logo": SITE_URL + "assets/favicon.svg"},
            {"@type": "WebSite", "@id": SITE_URL + "#website", "name": SITE_NAME, "alternateName": "GovtSalaryCalc.com", "url": SITE_URL, "publisher": {"@id": SITE_URL + "#organization"}},
        ]
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=2)


def localize(page, lang):
    """The page's metadata in the requested language."""
    if lang == "en" or "hi" not in page:
        return page
    return {**page, **page["hi"]}


def build_page(page, lang, faqs, section, prose):
    page = localize(page, lang)
    out_path = ("hi/" if lang == "hi" else "") + page["path"]
    depth = out_path.count("/")
    asset_root = "../" * depth
    lang_root = "../" * page["path"].count("/")
    content = ""
    if prose:
        content += PROSE_TEMPLATE.format(prose=prose.rstrip())
    if faqs:
        content += FAQ_TEMPLATE.format(
            heading=t(lang, "Frequently asked questions", "अक्सर पूछे जाने वाले सवाल"),
            items="\n".join(FAQ_ITEM_TEMPLATE.format(q=html.escape(q), a=html.escape(a)) for q, a in faqs))
    footer = read("partials/footer.html").replace("{{SITE_LINKS}}", site_links(lang))
    pieces = {
        "header": nav_links(read("partials/header.html")),
        "hero": read("partials/hero.html") if page.get("hero") else "",
        "banners": read("partials/banners.html"),
        "section": section,
        "footer": footer,
    }
    pieces = {k: translate_i18n(v, lang) for k, v in pieces.items()}
    out = PAGE_TEMPLATE.format(
        lang=lang,
        prefix_attr=' data-prefix="hi/"' if lang == "hi" else "",
        title=html.escape(page["title"]),
        description=html.escape(page["description"]),
        canonical=page_url(page["path"], lang),
        url_en=page_url(page["path"], "en"),
        url_hi=page_url(page["path"], "hi"),
        og_locale="hi_IN" if lang == "hi" else "en_IN",
        site_name=SITE_NAME,
        og_image=OG_IMAGE,
        root=asset_root,
        tool_slugs=json.dumps(TOOL_SLUGS),
        json_ld=json_ld(page, faqs, lang).replace("</", "<\\/"),
        page_name=html.escape(page["name"]),
        tool_attr=f' data-mt-tool="{page["tool"]}"' if page.get("tool") else "",
        content=content,
        **pieces,
    ).replace("{{ROOT}}", lang_root)
    target = ROOT / out_path / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(strip_comments(out), encoding="utf-8")
    return out_path


def tool_pages():
    pages = []
    for tool in TOOLS:
        seo = TOOL_SEO[tool["id"]]
        pages.append({
            "path": f"tools/{seo['slug']}/",
            "tool": tool["id"],
            "name": tool["title"]["en"],
            "title": seo["title"],
            "description": seo["description"],
            "hi": {
                "name": tool["title"]["hi"],
                "title": f'{tool["title"]["hi"]} | GovtSalaryCalc',
                "description": tool["desc"]["hi"],
            },
        })
    return pages


def build_sitemap(paths):
    today = datetime.date.today().isoformat()
    urls = "".join(
        f'  <url><loc>{SITE_URL}{p}</loc><lastmod>{today}</lastmod>'
        f'<xhtml:link rel="alternate" hreflang="en" href="{SITE_URL}{p.removeprefix("hi/")}"/>'
        f'<xhtml:link rel="alternate" hreflang="hi" href="{SITE_URL}hi/{p.removeprefix("hi/")}"/></url>\n'
        for p in paths
    )
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        f"{urls}</urlset>\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    faqs = {"en": json.loads(read("content/faqs.json")), "hi": json.loads(read("content/faqs_hi.json"))}
    written = []
    for lang in LANGS:
        for page in PAGES:
            sec = page["section"]
            section = SECTION_BUILDERS[sec](lang) if sec in SECTION_BUILDERS else read(f"sections/{sec}.html")
            prose = read(f"content/{sec}.html" if lang == "en" else f"content/hi/{sec}.html")
            if sec == "tools":
                prose += "\n<h2>" + t(lang, "All calculators", "सभी कैलकुलेटर") + "</h2>\n" + tools_directory(lang)
            if page.get("parent"):
                parent = localize(next(p for p in PAGES if p["path"] == page["parent"]), lang)
                page = {**page, "crumbs": [(parent["name"], page_url(parent["path"], lang))]}
            written.append(build_page(page, lang, faqs[lang].get(sec, []), section, prose))
        tools_hub = localize(next(p for p in PAGES if p["section"] == "tools"), lang)
        for page in tool_pages():
            tool = TOOL_BY_ID[page["tool"]]
            page = {**page, "crumbs": [(tools_hub["name"], page_url("tools/", lang))]}
            written.append(build_page(page, lang, [], section_tool(tool, lang), tool_content(tool, lang)))
    build_sitemap(written)
    print(f"built {len(written)} pages and sitemap.xml")
