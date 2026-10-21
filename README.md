# GovtSalaryCalc.com

7th & 8th Pay Commission salary calculator, published with GitHub Pages at
[govtsalarycalc.com](https://govtsalarycalc.com).

## Pages

| URL | Content |
| --- | --- |
| `/` | 7th & 8th CPC salary calculator (home) |
| `/pay-matrix/` | Pay matrix, levels 1–18 |
| `/arrears-allowances/` | 8th CPC arrears, DA arrears, HRA exemption, NDA, bonus |
| `/pension/` | UPS / NPS / gratuity / MACP |
| `/income-tax/` | Income tax FY 2026-27 and post presets |
| `/tools/` | All 94+ micro-calculators |
| `/8th-pay-commission/` | 8th CPC info, 20-state comparison, news, glossary |

Calculator inputs and the chosen language are remembered in the browser, so they
carry over from page to page.

## Editing the site

The page files (`index.html`, `pay-matrix/index.html`, …) are **generated**. Edit
these instead:

- `src/partials/header.html` – top bar and mega-menus (shared by every page)
- `src/partials/hero.html` – home page banner
- `src/partials/banners.html` – context banner and breadcrumb bar
- `src/partials/footer.html` – footer, salary-slip and search pop-ups, mobile bottom bar
- `src/sections/*.html` – each page's own content
- `assets/css/style.css`, `assets/js/app.js` – styles and all calculator logic
- `build.py` – page titles, descriptions and URLs

Then rebuild and commit:

```sh
python3 build.py
```

(Only Python 3 is needed. Changes to `assets/` take effect without a rebuild.)

## Publishing on GitHub Pages with the custom domain

1. In the repository on GitHub: **Settings → Pages → Build and deployment**,
   choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
2. The `CNAME` file already contains `govtsalarycalc.com`. Under
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
5. In Google Search Console, submit `https://govtsalarycalc.com/sitemap.xml`.
