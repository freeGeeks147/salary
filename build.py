#!/usr/bin/env python3
"""Builds the static site pages from the shared pieces in src/.

Every page gets the same header, menus, footer and modals (src/partials/) plus
its own calculator section (src/sections/). Edit those files, then run:

    python3 build.py

and commit the regenerated .html files. No packages need to be installed.
"""
import datetime
import html
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
SITE_URL = "https://govtsalarycalc.com/"

# path: output folder ("" = site root); section: file in src/sections/
PAGES = [
    {
        "path": "",
        "section": "salary",
        "hero": True,
        "title": "8th Pay Commission Calculator — 7th & 8th CPC Salary, Arrears, Pay Matrix, Pension & Tax",
        "description": "Free 7th & 8th Pay Commission salary calculator for central government employees: in-hand pay, DA, HRA, TA, fitment factor, arrears, pension and income tax.",
    },
    {
        "path": "pay-matrix/",
        "section": "matrix",
        "title": "7th & 8th CPC Pay Matrix (Level 1–18) with Fitment Factor | GovtSalaryCalc",
        "description": "Complete 7th CPC pay matrix for all 18 pay levels with projected 8th Pay Commission basic pay at your chosen fitment factor, plus fitment factor history.",
    },
    {
        "path": "arrears-allowances/",
        "section": "arrears",
        "title": "8th CPC Arrears, DA Arrears, HRA Exemption, NDA & Bonus Calculator | GovtSalaryCalc",
        "description": "Calculate 8th Pay Commission arrears from January 2026, DA arrears, Section 10(13A) HRA tax exemption, night duty allowance and Diwali bonus (PLB).",
    },
    {
        "path": "pension/",
        "section": "pension",
        "title": "UPS vs NPS Pension, Gratuity & Commutation Calculator | GovtSalaryCalc",
        "description": "Compare Unified Pension Scheme (UPS) and NPS pension, gratuity, leave encashment and commutation, plus MACP / promotion pay fixation under FR 22.",
    },
    {
        "path": "income-tax/",
        "section": "tax",
        "title": "Income Tax Calculator FY 2026-27 for Govt Employees (New vs Old Regime) | GovtSalaryCalc",
        "description": "Income tax for central government employees in FY 2026-27 under the new and old regimes, with salary presets for Railway, Defence, CAPF, SSC and more.",
    },
    {
        "path": "tools/",
        "section": "tools",
        "title": "94+ Government Employee Salary & Service Calculators | GovtSalaryCalc",
        "description": "DA, HRA, TA, LTC, CGHS, leave, subsistence allowance, posting allowance and 90+ other micro-calculators for central government employees.",
    },
    {
        "path": "8th-pay-commission/",
        "section": "guides",
        "title": "8th Pay Commission: Latest News, Timeline & State Salary Comparison | GovtSalaryCalc",
        "description": "8th Pay Commission timeline and key facts, state government salary and DA comparison for 20 states, news, CAPF and Railway handbooks and a CPC glossary.",
    },
]

PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <title>{title}</title>
  <meta name="description" content="{description}" />
  <link rel="canonical" href="{canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="GovtSalaryCalc" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{description}" />
  <meta property="og:url" content="{canonical}" />
  <link rel="icon" href="{root}assets/favicon.svg" type="image/svg+xml" />
  <script src="https://cdn.tailwindcss.com/3.4.17"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,600;0,6..72,700;1,6..72,600&family=Noto+Sans+Bengali:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{root}assets/css/style.css" />
</head>
<body class="min-h-screen flex flex-col pb-20 md:pb-8">

<!-- GENERATED FILE: edit src/ and run `python3 build.py` instead of editing this file. -->

{header}
{hero}
{banners}
  <!-- MAIN CONTENT CONTAINER -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 no-print">

{section}
  </main>

{footer}
  <script src="{root}assets/js/app.js"></script>
</body>
</html>
"""


def read(path):
    return (SRC / path).read_text(encoding="utf-8")


def build_page(page):
    depth = page["path"].count("/")
    root = "../" * depth
    out = PAGE_TEMPLATE.format(
        title=html.escape(page["title"]),
        description=html.escape(page["description"]),
        canonical=SITE_URL + page["path"],
        root=root,
        header=read("partials/header.html"),
        hero=read("partials/hero.html") if page.get("hero") else "",
        banners=read("partials/banners.html"),
        section=read(f"sections/{page['section']}.html"),
        footer=read("partials/footer.html"),
    ).replace("{{ROOT}}", root)
    target = ROOT / page["path"] / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(out, encoding="utf-8")
    print(f"built {target.relative_to(ROOT)}")


def build_sitemap():
    today = datetime.date.today().isoformat()
    urls = "".join(
        f"  <url><loc>{SITE_URL}{p['path']}</loc><lastmod>{today}</lastmod></url>\n" for p in PAGES
    )
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{urls}</urlset>\n",
        encoding="utf-8",
    )
    print("built sitemap.xml")


if __name__ == "__main__":
    for page in PAGES:
        build_page(page)
    build_sitemap()
