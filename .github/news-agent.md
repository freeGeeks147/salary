# 8th CPC news agent

A scheduled Claude session runs this every second day. It checks for new, verified
8th Pay Commission and DA news, adds it to `src/content/news.json`, rebuilds the
site and publishes it. Accuracy matters more than speed: if you are not sure a
news item is true, leave it out.

## What counts as news

Add an item only for something that **happened**, such as:
- a Government decision: Cabinet approval, Gazette notification, Ministry of Finance / DoE / DoPT order
- an action by the 8th Pay Commission: notice, questionnaire, meeting, consultation, deadline, interim or final report
- a reply in Parliament (Lok Sabha / Rajya Sabha) about the 8th CPC, DA or pay
- a DA / DR decision for central government employees and pensioners
- a formal submission by a recognised body (for example the NC-JCM Staff Side, or a federation's memorandum). Label it as a demand.

Do **not** add:
- predictions, estimates or "may / likely / could" stories ("fitment factor could be 2.86")
- anything you found only on blogs, calculator sites, YouTube, Telegram, WhatsApp forwards, or social media other than official government accounts
- anything already in `news.json` (check by date and subject)

## Sourcing rules (the build enforces these)

Every source must be either an **official government source** or an **established
news outlet** from the lists `OFFICIAL_SOURCES` and `NEWS_OUTLETS` in `build.py`.
- `"kind": "official"`: at least one official source (pib.gov.in, 8cpc.gov.in, a ministry site, egazette, sansad.in, ...).
- `"kind": "reported"`: at least two different outlets that independently report the same facts.

Before adding an item, open each source (WebFetch) and check that it says what you
are about to write: same date, same numbers. If a page cannot be opened, use the
item only if the search results for both sources clearly state the same facts. If
sources disagree on a number or date, leave the item out. Never add a domain to the
allow-lists to get an item through.

## Writing

- Your own words. No sentences copied from the sources.
- Title up to about 70 characters. Summary 1–3 short sentences: what happened, when, what it means. Neutral, no hype, no "big news!".
- Say "demand", "proposal" or "estimate" whenever that is what it is.
- `date` is the date of the event (decision, notification, submission), not the article date.
- Write the Hindi version too (`hi`), in simple Hindi, with the same facts and numbers.
- Never invent or round numbers differently from the source.

## Each run

1. Get the repository: call `add_repo` for owner `freeGeeks147`, repo `salary`, with `access: "push"`, and clone it.
2. Read `src/content/news.json`. Note `last_checked` and the existing items.
3. Search the web (WebSearch, `extended` mode), several queries in one turn, for example:
   - `8th Pay Commission latest news`
   - `8th Central Pay Commission PIB`
   - `8cpc.gov.in notice`
   - `8वां वेतन आयोग ताज़ा ख़बर`
   - `DA hike central government employees <current month and year>`
   - `8th Pay Commission Lok Sabha OR Rajya Sabha reply`
   Also try WebFetch on https://8cpc.gov.in/ for official notices.
4. For each candidate event since the newest item, apply the rules above. Most runs find nothing new; that is fine.
5. Edit `src/content/news.json`:
   - add qualifying items (`date`, `kind`, `title`, `summary`, `sources`, each with `en` and `hi`)
   - update a `status` row if one of those facts changed (give the new source)
   - always set `last_checked` to today's date in India (YYYY-MM-DD)
6. **DA changes.** Only if the Cabinet or the Ministry of Finance has officially decided a new DA rate (an official source, not "expected"):
   - `build.py`: set `DA_NOW` and add the new row to the DA table in `section_cpc7`
   - `src/sections/salary.html`: in `#sel-7th-da`, make the new rate the `selected` "(Now)" option and relabel the old one
   - `assets/js/app.js`: set `da7th:` in `state` to the new rate
   - mention this clearly in the pull request
7. **Official fitment factor, pay matrix or effective date.** Add the news item and update the status rows, but do **not** change the calculators. Open a GitHub issue in `freeGeeks147/salary` titled "Official 8th CPC figures announced: update calculators", with the facts and source links, for the owner.
8. Run `python3 build.py`. It must print `built N pages`. If it fails the sourcing check, fix the item or remove it; never weaken the check.
9. Check `git status`: only `src/content/news.json`, generated `index.html` pages and `sitemap.xml` should change (plus the DA files in step 6, if any).
10. Commit on a new branch `news/YYYY-MM-DD` with the message `News update YYYY-MM-DD` (list the items added, or "no new verified news"). Push, open a pull request to `main` with each new item and its source links, and merge it.
11. Finish with a short summary: items added (with sources), or "No new verified news; last_checked updated".

## Never

- Change anything outside `freeGeeks147/salary`, or post to social media.
- Remove or rewrite an existing item, unless it was wrong. Then correct it and cite the source that shows it.
- Change the fitment, hike or salary calculators (except the DA steps above).
