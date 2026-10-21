#!/usr/bin/env python3
"""Builds the static site pages from the shared pieces in src/.

Every page gets the same header, menus, footer and modals (src/partials/) plus
its own calculator section (src/sections/), explanatory text (src/content/)
and FAQs (src/content/faqs.json). Edit those files, then run:

    python3 build.py

and commit the regenerated .html files. No packages need to be installed.
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

# Analytics. Leave empty to turn off; fill in and re-run build.py to turn on.
# Google Analytics 4: Admin → Data streams → your web stream → Measurement ID (G-XXXXXXXXXX)
GA_MEASUREMENT_ID = ""
# Microsoft Clarity (free heatmaps & session recordings): Settings → Overview → Project ID
CLARITY_PROJECT_ID = ""

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
    },
    {
        "path": "pay-matrix/",
        "section": "matrix",
        "name": "7th & 8th CPC Pay Matrix",
        "title": "7th & 8th CPC Pay Matrix Table (Level 1–18) | GovtSalaryCalc",
        "description": "Full 7th CPC pay matrix for all pay levels 1–18 with projected 8th Pay Commission basic pay at any fitment factor, plus fitment factor history.",
    },
    {
        "path": "arrears-allowances/",
        "section": "arrears",
        "name": "8th CPC Arrears & Allowance Calculator",
        "title": "8th CPC Arrears & DA Arrears Calculator | GovtSalaryCalc",
        "description": "Calculate 8th Pay Commission arrears from January 2026, DA arrears, HRA exemption u/s 10(13A), night duty allowance and Diwali bonus (PLB).",
    },
    {
        "path": "pension/",
        "section": "pension",
        "name": "UPS vs NPS Pension & Gratuity Calculator",
        "title": "UPS vs NPS Pension & Gratuity Calculator | GovtSalaryCalc",
        "description": "Compare Unified Pension Scheme (UPS) and NPS pension for central govt employees, with gratuity, leave encashment, commutation and MACP pay fixation.",
    },
    {
        "path": "income-tax/",
        "section": "tax",
        "name": "Income Tax Calculator FY 2026-27 for Government Employees",
        "title": "Income Tax Calculator FY 2026-27 for Govt Employees",
        "description": "Income tax on government salary for FY 2026-27: new vs old regime with 87A rebate, 80C, 80D, 80CCD(2) and HRA exemption, plus post-wise presets.",
    },
    {
        "path": "tools/",
        "section": "tools",
        "name": "Government Employee Calculators",
        "title": "94+ Govt Employee Calculators: DA, HRA, TA, LTC | GovtSalaryCalc",
        "description": "DA, HRA, transport allowance, LTC, CGHS, leave, TA/DA on tour, posting allowance and 90+ more calculators for central government employees.",
    },
    {
        "path": "8th-pay-commission/",
        "section": "guides",
        "name": "8th Pay Commission Latest News & Timeline",
        "title": "8th Pay Commission Latest News, Timeline & Fitment Factor",
        "description": "8th Pay Commission latest status, chairperson, timeline, expected fitment factor and effective date, plus state govt salary and DA comparison.",
    },
]

PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <title>{title}</title>
  <meta name="description" content="{description}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="{canonical}" />
  <meta name="theme-color" content="#0f172a" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="{site_name}" />
  <meta property="og:locale" content="en_IN" />
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
  <script defer src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script defer src="{root}assets/js/app.js"></script>
  <script type="application/ld+json">
{json_ld}
  </script>
{analytics}</head>
<body class="min-h-screen flex flex-col pb-20 md:pb-8">
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

CONTENT_TEMPLATE = """    <section class="seo-content bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-3">
{prose}
    </section>
    <section class="seo-content bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
      <h2>Frequently asked questions</h2>
{faqs}
    </section>
"""

FAQ_TEMPLATE = """      <div class="space-y-1">
        <h3>{q}</h3>
        <p>{a}</p>
      </div>"""


def analytics_tags():
    tags = ""
    if GA_MEASUREMENT_ID:
        tags += f"""  <script async src="https://www.googletagmanager.com/gtag/js?id={GA_MEASUREMENT_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() {{ dataLayer.push(arguments); }}
    gtag("js", new Date());
    gtag("config", "{GA_MEASUREMENT_ID}");
  </script>
"""
    if CLARITY_PROJECT_ID:
        tags += f"""  <script>
    (function(c,l,a,r,i,t,y){{c[a]=c[a]||function(){{(c[a].q=c[a].q||[]).push(arguments)}};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);}})(window,document,"clarity","script","{CLARITY_PROJECT_ID}");
  </script>
"""
    return tags


def read(path):
    return (SRC / path).read_text(encoding="utf-8")


def strip_comments(markup):
    """Drops HTML comments (developer notes) from the published page."""
    markup = re.sub(r"<!--.*?-->", "", markup, flags=re.S)
    return re.sub(r"\n\s*\n(\s*\n)+", "\n\n", markup)


def json_ld(page, faqs):
    url = SITE_URL + page["path"]
    graph = [
        {
            "@type": "WebApplication",
            "@id": url + "#app",
            "name": page["name"],
            "url": url,
            "description": page["description"],
            "applicationCategory": "FinanceApplication",
            "operatingSystem": "Any",
            "inLanguage": ["en", "hi", "bn"],
            "isAccessibleForFree": True,
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "INR"},
            "publisher": {"@id": SITE_URL + "#organization"},
        },
        {
            "@type": "FAQPage",
            "@id": url + "#faq",
            "mainEntity": [
                {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
                for q, a in faqs
            ],
        },
    ]
    if page["path"]:
        graph.append({
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL},
                {"@type": "ListItem", "position": 2, "name": page["name"], "item": url},
            ],
        })
    else:
        graph[:0] = [
            {
                "@type": "Organization",
                "@id": SITE_URL + "#organization",
                "name": SITE_NAME,
                "url": SITE_URL,
                "logo": SITE_URL + "assets/favicon.svg",
            },
            {
                "@type": "WebSite",
                "@id": SITE_URL + "#website",
                "name": SITE_NAME,
                "alternateName": "GovtSalaryCalc.com",
                "url": SITE_URL,
                "publisher": {"@id": SITE_URL + "#organization"},
            },
        ]
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=2)


def build_page(page, all_faqs):
    depth = page["path"].count("/")
    root = "../" * depth
    faqs = all_faqs[page["section"]]
    content = CONTENT_TEMPLATE.format(
        prose=read(f"content/{page['section']}.html").rstrip(),
        faqs="\n".join(FAQ_TEMPLATE.format(q=html.escape(q), a=html.escape(a)) for q, a in faqs),
    )
    out = PAGE_TEMPLATE.format(
        title=html.escape(page["title"]),
        description=html.escape(page["description"]),
        canonical=SITE_URL + page["path"],
        site_name=SITE_NAME,
        og_image=OG_IMAGE,
        root=root,
        json_ld=json_ld(page, faqs).replace("</", "<\\/"),
        analytics=analytics_tags(),
        header=read("partials/header.html"),
        hero=read("partials/hero.html") if page.get("hero") else "",
        banners=read("partials/banners.html"),
        section=read(f"sections/{page['section']}.html"),
        content=content,
        footer=read("partials/footer.html"),
    ).replace("{{ROOT}}", root)
    target = ROOT / page["path"] / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(strip_comments(out), encoding="utf-8")
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
    all_faqs = json.loads(read("content/faqs.json"))
    for page in PAGES:
        build_page(page, all_faqs)
    build_sitemap()
