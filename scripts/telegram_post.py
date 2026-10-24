#!/usr/bin/env python3
"""Posts to the Telegram channel t.me/8thcpcpay. Run by .github/workflows/telegram.yml.

  python3 scripts/telegram_post.py news --before <git sha>   # new items in news.json since that commit
  python3 scripts/telegram_post.py level                     # the salary post for today's pay level
  python3 scripts/telegram_post.py intro                     # a welcome post (run once, then pin it)

Add --dry-run to print instead of posting. Posting needs the TELEGRAM_BOT_TOKEN and
TELEGRAM_CHANNEL (e.g. @8thcpcpay) environment variables. Numbers come from build.py
and news.json only, so the channel never says anything the website does not.
"""
import datetime
import html
import json
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import build  # noqa: E402  (reads the pay levels, DA rate and news)

SITE = build.SITE_URL
NEWS_PAGE = SITE + "8th-pay-commission/"
HIKE_PAGE = SITE + "8th-pay-commission/salary-hike/"
DATE_FMT = lambda iso: build.news_date(iso, "en")  # noqa: E731
# Levels most people ask about, posted in turn (Monday, Wednesday and Friday).
LEVEL_ROTATION = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"]


def esc(s):
    return html.escape(s, quote=False)


def news_post(item):
    kind = "✅ Official" if item["kind"] == "official" else "📰 Reported"
    sources = " · ".join(f'<a href="{html.escape(s["url"])}">{esc(s["name"])}</a>' for s in item["sources"])
    return (f"📢 <b>{esc(item['title']['en'])}</b>\n"
            f"<b>{esc(item['title']['hi'])}</b>\n\n"
            f"{esc(item['summary']['en'])}\n\n"
            f"{esc(item['summary']['hi'])}\n\n"
            f"🗓 {DATE_FMT(item['date'])} · {kind}\n"
            f"🔗 Sources: {sources}\n\n"
            f"🧮 Latest news &amp; your 8th CPC salary: {NEWS_PAGE}")


def level_post(level_id):
    lv = next(l for l in build.LEVELS if l["id"] == level_id)
    basic = lv["entry"]
    now = basic * (1 + build.DA_NOW / 100)
    lines = [f"💼 <b>{esc(lv['name'])} salary: 7th → 8th Pay Commission</b>",
             f"<b>लेवल {esc(lv['id'])} की सैलरी: 7वां → 8वां वेतन आयोग</b>", "",
             f"🏛 Posts: {esc(lv['post'])}",
             f"💰 Starting basic pay: {build.inr(basic)}",
             f"📌 Basic + {build.DA_NOW}% DA today: {build.inr(now)}", ""]
    for f in (1.92, 2.28, 2.86):
        new = basic * f
        lines.append(f"🚀 At ×{f:.2f}: {build.inr(new)}/month ({'+' if new >= now else '−'}{build.inr(abs(new - now))})")
    link = f"{SITE}?lv={lv['id']}&bp={basic}&fit=1.92&hra=X"
    lines += ["",
              f"🧮 Full in-hand salary with HRA, TA, NPS &amp; tax: {esc(link)}",
              f"📊 All levels: {HIKE_PAGE}",
              "",
              "⚠️ Estimates. The 8th CPC fitment factor has not been announced yet. / अनुमान; फिटमेंट फैक्टर अभी घोषित नहीं।"]
    return "\n".join(lines)


def intro_post():
    return ("👋 <b>Welcome to 8th Pay Commission Updates</b>\n"
            "<b>8वें वेतन आयोग की ख़बरें, सत्यापित</b>\n\n"
            "✅ Only verified news: an official government source or two established news outlets, always with links\n"
            "💼 Salary for every pay level, before and after the 8th CPC\n"
            "📈 DA updates for employees and pensioners\n\n"
            f"🧮 Free salary calculator (Hindi &amp; English): {SITE}\n"
            f"📰 Latest status: {NEWS_PAGE}\n\n"
            "Share this channel with your colleagues 🙏 t.me/8thcpcpay")


def new_items(before):
    """News items in news.json now that were not there at commit `before`."""
    try:
        old = json.loads(subprocess.run(["git", "show", f"{before}:src/content/news.json"], cwd=ROOT,
                                        capture_output=True, text=True, check=True).stdout)
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        print(f"No news.json at {before}; posting nothing to avoid repeating old news.")
        return []
    seen = {(i["date"], i["title"]["en"]) for i in old["items"]}
    return sorted((i for i in build.NEWS["items"] if (i["date"], i["title"]["en"]) not in seen), key=lambda i: i["date"])


def todays_level(today=None):
    """One step per Monday, Wednesday and Friday (other days use the last of those)."""
    today = today or datetime.date.today()
    weeks = (today - datetime.date(2026, 1, 5)).days // 7  # 5 Jan 2026 is a Monday
    slot = [0, 0, 1, 1, 2, 2, 2][today.weekday()]
    return LEVEL_ROTATION[(weeks * 3 + slot) % len(LEVEL_ROTATION)]


def send(text, dry_run):
    print(text, "\n" + "-" * 40)
    if dry_run:
        return
    token, chat = os.environ.get("TELEGRAM_BOT_TOKEN", ""), os.environ.get("TELEGRAM_CHANNEL", "")
    if not token or not chat:
        sys.exit("TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL must be set")
    body = urllib.parse.urlencode({"chat_id": chat, "text": text, "parse_mode": "HTML", "disable_web_page_preview": "false"}).encode()
    for attempt in range(4):
        try:
            with urllib.request.urlopen(f"https://api.telegram.org/bot{token}/sendMessage", body, timeout=30) as r:
                if json.load(r).get("ok"):
                    return
        except Exception as err:  # network error or Telegram refusing the message
            print(f"Telegram attempt {attempt + 1} failed: {getattr(err, 'read', lambda: b'')().decode()[:300] or err}")
        time.sleep(2 ** (attempt + 1))
    sys.exit("Could not post to Telegram")


def main():
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    mode = args[0] if args else ""
    if mode == "news":
        before = args[args.index("--before") + 1] if "--before" in args else ""
        items = new_items(before) if before.strip("0") else []
        if not items:
            print("No new news items to post.")
        for item in items:
            send(news_post(item), dry_run)
    elif mode == "level":
        send(level_post(args[args.index("--level") + 1] if "--level" in args else todays_level()), dry_run)
    elif mode == "intro":
        send(intro_post(), dry_run)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
