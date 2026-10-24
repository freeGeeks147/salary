# 8thCPCPay.com

7th & 8th Pay Commission salary calculator, published with GitHub Pages at
[8thcpcpay.com](https://8thcpcpay.com).

## Pages

| URL | Content |
| --- | --- |
| `/` | 7th & 8th CPC salary calculator (home) |
| `/pay-matrix/` | Pay matrix, levels 1–18 |
| `/arrears-allowances/` | 8th CPC arrears, DA arrears, HRA exemption, NDA, bonus |
| `/pension/` | UPS / NPS / gratuity / MACP |
| `/income-tax/` | Income tax FY 2026-27 and post presets |
| `/tools/` | All 46 calculators, with a link to each |
| `/tools/<slug>/` | One page per calculator (46), e.g. `/tools/dearness-allowance-calculator/` |
| `/8th-pay-commission/` | 8th CPC info, 20-state comparison, news, glossary |
| `/8th-pay-commission/fitment-factor/` | Fitment factor explained, new basic pay of every level at each factor |
| `/7th-pay-commission/` | 7th CPC in one page: pay levels, DA and HRA rates |
| `/hi/...` | Hindi version of every page above |

Calculator inputs and the chosen language are remembered in the browser, so they
carry over from page to page.

## Editing the site

The page files (`index.html`, `pay-matrix/index.html`, …) are **generated**. Edit
these instead:

- `src/partials/header.html` – top bar and mega-menus (shared by every page)
- `src/partials/hero.html` – home page banner
- `src/partials/banners.html` – context banner and breadcrumb bar
- `src/partials/footer.html` – footer, salary-slip and search pop-ups, mobile bottom bar
- `src/sections/*.html` – each page's calculator
- `src/content/*.html` – the explanatory text under each calculator
- `src/content/faqs.json` – each page's FAQs (shown on the page and sent to Google as FAQ data)
- `src/content/hi/*.html`, `src/content/faqs_hi.json` – the same text and FAQs in Hindi
- `src/content/tools.json` – each calculator page's address (slug), Google title and description
- `src/partials/footer.html` – `{{SITE_LINKS}}` is replaced with the footer link directory
- `src/tailwind.css` – custom styles
- `assets/js/app.js` – all calculator logic
- `build.py` – page titles, descriptions and URLs (English and Hindi), and the generated
  7th CPC and fitment factor tables

The build reads calculator names, inputs and rules, the pay matrix and the Hindi menu
text straight from `assets/js/app.js`, so a new calculator in `MICRO_TOOLS_REGISTRY` only
needs an entry in `src/content/tools.json` to get its own page.

### Languages

Every page is built in English (site root) and Hindi (`hi/`), linked with `hreflang` tags.
The हिंदी / English buttons switch between the two pages; বাংলা still switches the
English page in place. Text in the calculators is translated by the `I18N` dictionary in
`assets/js/app.js`; the build also applies it to the Hindi pages so they are in Hindi
before any script runs.

Then rebuild and commit:

```sh
python3 build.py
```

Only Python 3 is needed. Changes to `assets/js/app.js` take effect without a rebuild.

### Styles

The site uses a pre-built Tailwind CSS file (`assets/css/site.css`) rather than the
Tailwind CDN script, so pages load much faster. If you use a Tailwind class that
isn't used anywhere else on the site yet, rebuild the CSS (needs Node.js):

```sh
npx tailwindcss@3.4.17 -i src/tailwind.css -o assets/css/site.css --minify
```

## Publishing on GitHub Pages with the custom domain

1. In the repository on GitHub: **Settings → Pages → Build and deployment**,
   choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
2. The `CNAME` file already contains `8thcpcpay.com`. Under
   **Settings → Pages → Custom domain** it should show the same domain.
3. At your domain registrar, replace the DNS records that point to Google Sites with:

   | Type | Name | Value |
   | --- | --- | --- |
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | AAAA | `@` | `2606:50c0:8000::153` |
   | AAAA | `@` | `2606:50c0:8001::153` |
   | AAAA | `@` | `2606:50c0:8002::153` |
   | AAAA | `@` | `2606:50c0:8003::153` |
   | CNAME | `www` | `freegeeks147.github.io` |

4. Once DNS has propagated (minutes to a few hours), tick **Enforce HTTPS** in
   **Settings → Pages**.
5. In Google Search Console, submit `https://8thcpcpay.com/sitemap.xml`.
