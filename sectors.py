"""Pay-scale guides for the sector calculators (CAPF, defence and Agniveer, railways, PSUs,
banks and state governments). build.py adds each guide above the calculator's general text
on its /tools/<slug>/ page, in English and Hindi, with FAQs for the FAQ schema.

Figures marked as estimates or "reported" could not be checked against the original order;
update them (and the date in AS_OF) when new orders come out.
"""
import html

AS_OF = {"en": "October 2026", "hi": "अक्टूबर 2026"}
DA_NOW = 60          # central DA from 1 January 2026
FIT = 1.92           # most quoted 8th CPC fitment estimate (not official)

# 7th CPC pay matrix: first cell of each level (entry basic pay).
ENTRY = {"1": 18000, "2": 19900, "3": 21700, "4": 25500, "5": 29200, "6": 35400, "7": 44900, "8": 47600,
         "9": 53100, "10": 56100, "10B": 61300, "11": 67700, "11*": 69400, "12": 78800, "12A": 121200,
         "13": 123100, "13A": 131100, "13A*": 139600, "13*": 130600, "14": 144200, "15": 182200}

TABLE_WRAP = "overflow-x-auto rounded-xl border border-slate-200 my-3"
TABLE = "w-full text-sm text-left"
TH = "px-3 py-2.5 bg-slate-100 text-slate-700 font-semibold align-bottom"
TD = "px-3 py-2.5 border-t border-slate-100 whitespace-nowrap"
TDW = "px-3 py-2.5 border-t border-slate-100"
NUM = " text-right font-mono"
NOTE = "text-sm text-slate-500"


def t(lang, en, hi):
    return hi if lang == "hi" else en


def inr(n):
    s = str(int(round(n)))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        groups = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        s = ",".join(groups) + "," + tail
    return "₹" + s


def table(head, rows, num_cols=()):
    """head: list of labels; rows: list of lists of (already escaped) cell html."""
    th = "".join(f'<th class="{TH}{NUM if i in num_cols else ""}">{h}</th>' for i, h in enumerate(head))
    body = "".join("<tr>" + "".join(f'<td class="{TD if i else TDW}{NUM if i in num_cols else ""}">{c}</td>' for i, c in enumerate(r)) + "</tr>" for r in rows)
    return f'<div class="{TABLE_WRAP}"><table class="{TABLE}"><thead><tr>{th}</tr></thead><tbody>{body}</tbody></table></div>'


def ta_amount(level_key):
    """Transport allowance a month (outside the big-city list), with DA."""
    n = int("".join(ch for ch in level_key if ch.isdigit()))
    base = 900 if n <= 2 else 1800 if n <= 8 else 3600
    return base * (1 + DA_NOW / 100)


def gross_y(basic, level_key, extra=0):
    """Basic + DA + HRA (Y city, 20%) + transport allowance + any fixed extra pay."""
    return basic + (basic + extra) * DA_NOW / 100 + basic * 0.20 + ta_amount(level_key) + extra


def fit8(basic):
    return round(basic * FIT / 100) * 100


def central_rows(posts, lang, extra=0):
    """posts: [(en, hi, level_key)] -> rows: post, level, basic, gross, 8th CPC basic."""
    rows = []
    for en, hi, lv in posts:
        b = ENTRY[lv]
        rows.append([html.escape(t(lang, en, hi)), lv.rstrip("*"), inr(b), inr(gross_y(b, lv, extra)), inr(fit8(b))])
    return rows


def central_head(lang):
    return [t(lang, "Post / rank", "पद / रैंक"), t(lang, "Level", "लेवल"), t(lang, "Starting basic", "शुरुआती बेसिक"),
            t(lang, "Gross a month*", "मासिक ग्रॉस*"), t(lang, f"8th CPC basic ({FIT})*", f"8वें CPC में बेसिक ({FIT})*")]


def gross_note(lang):
    return f'<p class="{NOTE}">* ' + t(
        lang,
        f"Gross = basic pay + DA {DA_NOW}% + HRA 20% (Y-class city) + transport allowance with DA. In X-class cities HRA is 30% and transport allowance is higher; in Z-class towns HRA is 10%. NPS (10% of basic + DA), CGHS and income tax are deducted from gross. The 8th CPC column multiplies today's basic pay by {FIT}, the most quoted estimate; the real fitment factor is not announced yet.",
        f"ग्रॉस = बेसिक पे + {DA_NOW}% DA + 20% HRA (Y श्रेणी शहर) + DA सहित परिवहन भत्ता। X श्रेणी शहरों में HRA 30% और परिवहन भत्ता ज़्यादा है; Z श्रेणी में HRA 10%। ग्रॉस में से NPS (बेसिक + DA का 10%), CGHS और इनकम टैक्स कटते हैं। 8वें CPC वाला कॉलम आज की बेसिक पे को {FIT} से गुणा करता है, जो सबसे ज़्यादा उद्धृत अनुमान है; असली फिटमेंट फैक्टर अभी घोषित नहीं हुआ है।") + "</p>"


def links(lang, items):
    return "<ul>" + "".join(f'<li><a href="{{{{ROOT}}}}{href}">{html.escape(t(lang, en, hi))}</a></li>' for en, hi, href in items) + "</ul>"


COMMON_LINKS = [
    ("8th Pay Commission salary calculator", "8वां वेतन आयोग सैलरी कैलकुलेटर", ""),
    ("8th CPC fitment factor", "8वें CPC का फिटमेंट फैक्टर", "8th-pay-commission/fitment-factor/"),
    ("7th CPC pay matrix (all levels)", "7वें CPC का पे मैट्रिक्स (सभी लेवल)", "pay-matrix/"),
]


# ---------------------------------------------------------------------------
# CAPF
# ---------------------------------------------------------------------------

def capf(lang):
    posts = [("Constable (GD)", "कांस्टेबल (GD)", "3"), ("Head Constable", "हेड कांस्टेबल", "4"),
             ("Assistant Sub-Inspector (ASI)", "असिस्टेंट सब-इंस्पेक्टर (ASI)", "5"), ("Sub-Inspector (SI)", "सब-इंस्पेक्टर (SI)", "6"),
             ("Inspector", "इंस्पेक्टर", "7"), ("Assistant Commandant", "असिस्टेंट कमांडेंट", "10"),
             ("Deputy Commandant", "डिप्टी कमांडेंट", "11"), ("Second-in-Command", "सेकंड-इन-कमांड", "12"),
             ("Commandant", "कमांडेंट", "13"), ("DIG", "DIG", "13A"), ("IG", "IG", "14")]
    rh = [["RH-Max (Siachen-type)", inr(31500), inr(21000)], ["R1H1", inr(25000), inr(17300)],
          ["R1H2 / R2H1", inr(16900), inr(9700)], ["R2H2 / R1H3 / R3H1", inr(10500), inr(6000)]]
    rma_day, rma_month = 151.93, 151.93 * 30
    c = central_rows(posts, lang)[0]
    body = f"""<h2>{t(lang, "CAPF salary by rank: BSF, CRPF, CISF, ITBP, SSB and Assam Rifles", "रैंक के अनुसार CAPF वेतन: BSF, CRPF, CISF, ITBP, SSB और असम राइफल्स")}</h2>
<p>{t(lang, "All Central Armed Police Forces use the same 7th CPC pay matrix as other central government employees. Each rank sits on a pay level; your basic pay starts at the first cell of that level and rises 3% every year (and on promotion or MACP).", "सभी केंद्रीय सशस्त्र पुलिस बल बाकी केंद्रीय कर्मचारियों की तरह 7वें CPC के पे मैट्रिक्स पर हैं। हर रैंक एक पे लेवल पर है; बेसिक पे उस लेवल की पहली सेल से शुरू होती है और हर साल 3% बढ़ती है (प्रमोशन या MACP पर भी)।")}</p>
{table(central_head(lang), central_rows(posts, lang), (2, 3, 4))}
{gross_note(lang)}
<h2>{t(lang, "CAPF allowances on top of pay", "वेतन के ऊपर CAPF भत्ते")}</h2>
<ul>
<li><strong>{t(lang, "Risk & Hardship Allowance", "रिस्क और हार्डशिप भत्ता")}</strong> – {t(lang, "for postings in risky or hard areas (insurgency, border, high altitude), paid by a matrix of risk (R1–R3) and hardship (H1–H3):", "जोखिम या कठिन इलाकों (उग्रवाद, सीमा, ऊँचाई) में तैनाती पर, जोखिम (R1–R3) और कठिनाई (H1–H3) के मैट्रिक्स से:")}</li>
</ul>
{table([t(lang, "Category", "श्रेणी"), t(lang, "Level 9 and above", "लेवल 9 और ऊपर"), t(lang, "Level 8 and below", "लेवल 8 और नीचे")], rh, (1, 2))}
<ul>
<li><strong>{t(lang, "Ration Money Allowance", "राशन मनी भत्ता")}</strong> – {t(lang, f"for non-gazetted ranks (Constable to Inspector): ₹{rma_day:.2f} a day for 2025-26, about {inr(rma_month)} a month. It is revised every year.", f"अराजपत्रित रैंक (कांस्टेबल से इंस्पेक्टर) के लिए: 2025-26 में ₹{rma_day:.2f} प्रति दिन, यानी लगभग {inr(rma_month)} महीना। हर साल बदलता है।")}</li>
<li><strong>{t(lang, "HRA or government quarters", "HRA या सरकारी क्वार्टर")}</strong> – {t(lang, "HRA by the city of posting, or family accommodation; personnel in field units whose families stay elsewhere can keep HRA for the family's station.", "तैनाती के शहर के अनुसार HRA या पारिवारिक आवास; फ़ील्ड यूनिट में रहने वाले जवानों का परिवार दूसरी जगह रहे तो परिवार के शहर का HRA मिल सकता है।")}</li>
<li><strong>{t(lang, "Others", "अन्य")}</strong> – {t(lang, "dress allowance once a year, transport allowance, special duty allowance in the North East, and children education allowance.", "साल में एक बार ड्रेस भत्ता, परिवहन भत्ता, पूर्वोत्तर में विशेष ड्यूटी भत्ता और बच्चों का शिक्षा भत्ता।")}</li>
</ul>
<h2>{t(lang, "Example: a CAPF Constable's monthly pay", "उदाहरण: CAPF कांस्टेबल का मासिक वेतन")}</h2>
<p>{t(lang, f"A newly joined Constable (Level 3) gets basic pay of {inr(21700)}, DA of {inr(21700 * 0.6)} and HRA/transport allowance, about {c[3]} gross in a Y city. Posted in an R1H2 area (for example counter-insurgency in a field area), the Constable also gets {inr(9700)} risk & hardship allowance and about {inr(rma_month)} ration money, so the total is close to {inr(gross_y(21700, '3') + 9700 + rma_month)} before deductions.", f"नए कांस्टेबल (लेवल 3) को {inr(21700)} बेसिक, {inr(21700 * 0.6)} DA और HRA/परिवहन भत्ता मिलता है, Y शहर में लगभग {c[3]} ग्रॉस। R1H2 इलाके (जैसे फ़ील्ड एरिया में उग्रवाद-रोधी ड्यूटी) में तैनाती पर {inr(9700)} रिस्क-हार्डशिप भत्ता और लगभग {inr(rma_month)} राशन मनी भी मिलती है, यानी कटौती से पहले कुल लगभग {inr(gross_y(21700, '3') + 9700 + rma_month)}।")}</p>
<h2>{t(lang, "CAPF salary in the 8th Pay Commission", "8वें वेतन आयोग में CAPF वेतन")}</h2>
<p>{t(lang, f"CAPF personnel are central government employees, so the 8th CPC applies to them like everyone else. At a fitment factor of {FIT}, a Constable's starting basic would go from {inr(21700)} to about {inr(fit8(21700))}, and an Assistant Commandant's from {inr(56100)} to about {inr(fit8(56100))}. Allowances such as risk & hardship and ration money are reviewed separately by the Commission.", f"CAPF कर्मी केंद्रीय सरकारी कर्मचारी हैं, इसलिए 8वां CPC उन पर भी लागू होगा। {FIT} फिटमेंट फैक्टर पर कांस्टेबल की शुरुआती बेसिक {inr(21700)} से लगभग {inr(fit8(21700))} और असिस्टेंट कमांडेंट की {inr(56100)} से लगभग {inr(fit8(56100))} हो जाएगी। रिस्क-हार्डशिप और राशन मनी जैसे भत्तों की आयोग अलग से समीक्षा करता है।")}</p>
{links(lang, COMMON_LINKS + [("Defence and Agniveer pay", "डिफेंस और अग्निवीर वेतन", "tools/agniveer-salary-calculator/")])}"""
    faqs = [
        (t(lang, "What is the salary of a CAPF Constable in 2026?", "2026 में CAPF कांस्टेबल का वेतन कितना है?"),
         t(lang, f"A CAPF Constable (GD) is on pay Level 3 with starting basic pay of ₹21,700. With DA at {DA_NOW}%, HRA and transport allowance the gross is about {c[3]} a month in a Y-class city, plus risk & hardship allowance and ration money where applicable.", f"CAPF कांस्टेबल (GD) पे लेवल 3 पर है, शुरुआती बेसिक ₹21,700। {DA_NOW}% DA, HRA और परिवहन भत्ते के साथ Y श्रेणी शहर में ग्रॉस लगभग {c[3]} महीना, साथ में जहाँ लागू हो रिस्क-हार्डशिप भत्ता और राशन मनी।")),
        (t(lang, "Which pay level is a CAPF Sub-Inspector and Assistant Commandant?", "CAPF सब-इंस्पेक्टर और असिस्टेंट कमांडेंट किस पे लेवल पर हैं?"),
         t(lang, "Sub-Inspector is Level 6 (₹35,400 starting basic). Assistant Commandant, the entry Group A officer, is Level 10 (₹56,100).", "सब-इंस्पेक्टर लेवल 6 (शुरुआती बेसिक ₹35,400) पर है। असिस्टेंट कमांडेंट, यानी प्रवेश स्तर के ग्रुप A अधिकारी, लेवल 10 (₹56,100) पर हैं।")),
        (t(lang, "How much is the CAPF risk and hardship allowance?", "CAPF रिस्क और हार्डशिप भत्ता कितना है?"),
         t(lang, "It depends on the posting category: ₹17,300 (R1H1), ₹9,700 (R1H2) or ₹6,000 (R2H2) a month for Level 8 and below, and ₹25,000, ₹16,900 or ₹10,500 for Level 9 and above, under the 7th CPC matrix applied by MHA.", "यह तैनाती की श्रेणी पर निर्भर है: लेवल 8 तक ₹17,300 (R1H1), ₹9,700 (R1H2) या ₹6,000 (R2H2) महीना, और लेवल 9 व ऊपर ₹25,000, ₹16,900 या ₹10,500, गृह मंत्रालय द्वारा लागू 7वें CPC मैट्रिक्स के अनुसार।")),
        (t(lang, "Will CAPF get the 8th Pay Commission?", "क्या CAPF को 8वां वेतन आयोग मिलेगा?"),
         t(lang, "Yes. CAPF personnel are central government employees, so the 8th CPC's pay matrix and fitment factor will apply to them when the Government accepts its report.", "हाँ। CAPF कर्मी केंद्रीय सरकारी कर्मचारी हैं, इसलिए सरकार द्वारा रिपोर्ट मानने पर 8वें CPC का पे मैट्रिक्स और फिटमेंट फैक्टर उन पर भी लागू होगा।")),
    ]
    return body, faqs


# ---------------------------------------------------------------------------
# Defence and Agniveer
# ---------------------------------------------------------------------------

def defence(lang):
    pkg = [(1, 30000), (2, 33000), (3, 36500), (4, 40000)]
    pkg_rows = [[t(lang, f"Year {y}", f"वर्ष {y}"), inr(p), inr(p * 0.7), inr(p * 0.3), inr(p * 0.3)] for y, p in pkg]
    corpus = sum(p * 0.3 * 12 for _, p in pkg)
    jco = [("Sepoy", "सिपाही", "3"), ("Naik", "नायक", "4"), ("Havildar", "हवलदार", "5"),
           ("Naib Subedar", "नायब सूबेदार", "6"), ("Subedar", "सूबेदार", "7"), ("Subedar Major", "सूबेदार मेजर", "8")]
    off = [("Lieutenant", "लेफ्टिनेंट", "10"), ("Captain", "कैप्टन", "10B"), ("Major", "मेजर", "11*"),
           ("Lieutenant Colonel", "लेफ्टिनेंट कर्नल", "12A"), ("Colonel", "कर्नल", "13*"), ("Brigadier", "ब्रिगेडियर", "13A*"),
           ("Major General", "मेजर जनरल", "14"), ("Lieutenant General", "लेफ्टिनेंट जनरल", "15")]
    jrows = central_rows(jco, lang, extra=5200)
    # MSP is paid to officers up to Brigadier only.
    orows = central_rows(off[:6], lang, extra=15500) + central_rows(off[6:], lang)
    head = central_head(lang)
    head[3] = t(lang, "Gross a month incl. MSP*", "MSP सहित मासिक ग्रॉस*")
    body = f"""<h2>{t(lang, "Agniveer salary: year-by-year package", "अग्निवीर वेतन: साल-दर-साल पैकेज")}</h2>
<p>{t(lang, "Agniveers (Army, Navy and Air Force) get a fixed monthly package. 30% of it goes into the Seva Nidhi corpus every month and the Government adds the same amount.", "अग्निवीरों (थल सेना, नौसेना और वायु सेना) को तय मासिक पैकेज मिलता है। इसका 30% हर महीने सेवा निधि फंड में जाता है और सरकार भी उतनी ही रकम जोड़ती है।")}</p>
{table([t(lang, "Year", "वर्ष"), t(lang, "Monthly package", "मासिक पैकेज"), t(lang, "In hand (70%)", "हाथ में (70%)"), t(lang, "Your corpus share (30%)", "आपका फंड हिस्सा (30%)"), t(lang, "Government adds", "सरकार जोड़ती है")], pkg_rows, (1, 2, 3, 4))}
<ul>
<li>{t(lang, f"After 4 years: your contributions {inr(corpus)} + Government's {inr(corpus)} = {inr(corpus * 2)}, about ₹11.71 lakh with interest, paid as Seva Nidhi and fully tax-free.", f"4 साल बाद: आपका योगदान {inr(corpus)} + सरकार का {inr(corpus)} = {inr(corpus * 2)}, ब्याज सहित लगभग ₹11.71 लाख, सेवा निधि के रूप में, पूरी तरह टैक्स-फ़्री।")}</li>
<li>{t(lang, "Non-contributory life insurance cover of ₹48 lakh during service.", "सेवा के दौरान ₹48 लाख का बिना अंशदान वाला जीवन बीमा।")}</li>
<li>{t(lang, "Up to 25% of each batch can be selected for the regular cadre; their pay then follows the table below.", "हर बैच के 25% तक को नियमित कैडर में चुना जा सकता है; उनका वेतन फिर नीचे की तालिका के अनुसार होता है।")}</li>
</ul>
<h2>{t(lang, "Army pay scale: soldiers and JCOs", "थल सेना वेतनमान: जवान और JCO")}</h2>
{table(head, jrows, (2, 3, 4))}
<h2>{t(lang, "Army pay scale: officers", "थल सेना वेतनमान: अधिकारी")}</h2>
{table(head, orows, (2, 3, 4))}
<p class="{NOTE}">* {t(lang, "Defence personnel have their own pay matrix; Navy and Air Force ranks sit on the same levels as their Army equivalents. Gross includes Military Service Pay (MSP): ₹5,200 a month for soldiers and JCOs and ₹15,500 for officers up to Brigadier (MSP counts for DA). Technical trades also get X-group pay. ", "रक्षा कर्मियों का अपना पे मैट्रिक्स है; नौसेना और वायु सेना की रैंक अपने थल सेना समकक्षों के लेवल पर हैं। ग्रॉस में मिलिट्री सर्विस पे (MSP) शामिल है: जवानों और JCO के लिए ₹5,200 और ब्रिगेडियर तक के अधिकारियों के लिए ₹15,500 महीना (MSP पर DA मिलता है)। तकनीकी ट्रेड को X-ग्रुप पे भी मिलता है। ")}{t(lang, f"Gross = basic + MSP + DA {DA_NOW}% on both + HRA 20% + transport allowance. Regular armed forces personnel are not under NPS.", f"ग्रॉस = बेसिक + MSP + दोनों पर {DA_NOW}% DA + 20% HRA + परिवहन भत्ता। नियमित सशस्त्र बल कर्मी NPS में नहीं हैं।")}</p>
<h2>{t(lang, "Defence pay in the 8th Pay Commission", "8वें वेतन आयोग में डिफेंस वेतन")}</h2>
<p>{t(lang, f"The 8th CPC covers the armed forces too. At a fitment factor of {FIT}, a Sepoy's starting basic would rise from {inr(21700)} to about {inr(fit8(21700))} and a Lieutenant's from {inr(56100)} to about {inr(fit8(56100))}. MSP and the Agniveer package are separate decisions and may be revised on their own.", f"8वां CPC सशस्त्र बलों पर भी लागू होगा। {FIT} फिटमेंट फैक्टर पर सिपाही की शुरुआती बेसिक {inr(21700)} से लगभग {inr(fit8(21700))} और लेफ्टिनेंट की {inr(56100)} से लगभग {inr(fit8(56100))} हो जाएगी। MSP और अग्निवीर पैकेज अलग फ़ैसले हैं और अलग से बदल सकते हैं।")}</p>
{links(lang, COMMON_LINKS + [("CAPF pay by rank", "रैंक के अनुसार CAPF वेतन", "tools/capf-salary-calculator/")])}"""
    faqs = [
        (t(lang, "What is the Agniveer salary per month?", "अग्निवीर का मासिक वेतन कितना है?"),
         t(lang, "₹30,000 in year 1, ₹33,000 in year 2, ₹36,500 in year 3 and ₹40,000 in year 4. You get 70% in hand (₹21,000 to ₹28,000) and 30% goes to the Seva Nidhi corpus.", "पहले साल ₹30,000, दूसरे साल ₹33,000, तीसरे साल ₹36,500 और चौथे साल ₹40,000। 70% हाथ में मिलता है (₹21,000 से ₹28,000) और 30% सेवा निधि फंड में जाता है।")),
        (t(lang, "How much Seva Nidhi does an Agniveer get after 4 years?", "4 साल बाद अग्निवीर को कितनी सेवा निधि मिलती है?"),
         t(lang, f"About ₹11.71 lakh: {inr(corpus)} from the Agniveer, the same from the Government, plus interest. It is exempt from income tax.", f"लगभग ₹11.71 लाख: अग्निवीर का {inr(corpus)}, उतना ही सरकार का, साथ में ब्याज। यह इनकम टैक्स से मुक्त है।")),
        (t(lang, "What is the salary of an Army Sepoy?", "थल सेना के सिपाही का वेतन कितना है?"),
         t(lang, f"A Sepoy is on Level 3: starting basic ₹21,700 plus ₹5,200 MSP. With DA at {DA_NOW}% and allowances the gross is about {jrows[0][3]} a month in a Y-class city.", f"सिपाही लेवल 3 पर है: शुरुआती बेसिक ₹21,700 और ₹5,200 MSP। {DA_NOW}% DA और भत्तों के साथ Y श्रेणी शहर में ग्रॉस लगभग {jrows[0][3]} महीना।")),
        (t(lang, "What is Military Service Pay (MSP)?", "मिलिट्री सर्विस पे (MSP) क्या है?"),
         t(lang, "A fixed monthly pay for the special conditions of military service: ₹5,200 for soldiers and JCOs, ₹10,800 for military nursing officers and ₹15,500 for officers up to Brigadier. DA is paid on it.", "सैन्य सेवा की विशेष परिस्थितियों के लिए तय मासिक वेतन: जवानों और JCO के लिए ₹5,200, सैन्य नर्सिंग अधिकारियों के लिए ₹10,800 और ब्रिगेडियर तक के अधिकारियों के लिए ₹15,500। इस पर DA मिलता है।")),
    ]
    return body, faqs


# ---------------------------------------------------------------------------
# Railways
# ---------------------------------------------------------------------------

def railway(lang):
    posts = [("Track Maintainer Gr IV, Pointsman, Helper (Group D)", "ट्रैक मेंटेनर ग्रेड IV, पॉइंट्समैन, हेल्पर (ग्रुप D)", "1"),
             ("Assistant Loco Pilot (ALP), Technician Gr III", "असिस्टेंट लोको पायलट (ALP), तकनीशियन ग्रेड III", "2"),
             ("Junior Clerk cum Typist, Accounts Clerk, Trains Clerk", "जूनियर क्लर्क कम टाइपिस्ट, अकाउंट्स क्लर्क, ट्रेन्स क्लर्क", "2"),
             ("Commercial cum Ticket Clerk, RPF Constable", "कमर्शियल कम टिकट क्लर्क, RPF कांस्टेबल", "3"),
             ("Goods Train Manager, Senior Clerk cum Typist, Jr Account Assistant", "गुड्स ट्रेन मैनेजर, सीनियर क्लर्क कम टाइपिस्ट, जूनियर अकाउंट असिस्टेंट", "5"),
             ("Station Master, Junior Engineer, RPF Sub-Inspector", "स्टेशन मास्टर, जूनियर इंजीनियर, RPF सब-इंस्पेक्टर", "6"),
             ("Senior Section Engineer", "सीनियर सेक्शन इंजीनियर", "7")]
    rows = central_rows(posts, lang)
    body = f"""<h2>{t(lang, "Railway salary by post (7th CPC pay level)", "पद के अनुसार रेलवे वेतन (7वें CPC का पे लेवल)")}</h2>
<p>{t(lang, "Indian Railways uses the central 7th CPC pay matrix. The RRB notice for each post gives its pay level; the table shows the most common recruitment posts.", "भारतीय रेलवे केंद्र के 7वें CPC पे मैट्रिक्स पर है। हर पद की RRB अधिसूचना में उसका पे लेवल लिखा होता है; तालिका में सबसे आम भर्ती वाले पद हैं।")}</p>
{table(central_head(lang), rows, (2, 3, 4))}
{gross_note(lang)}
<h2>{t(lang, "Extra pay for railway staff", "रेलवे कर्मियों का अतिरिक्त वेतन")}</h2>
<ul>
<li><strong>{t(lang, "Running allowance", "रनिंग भत्ता")}</strong> – {t(lang, "loco pilots, ALPs and guards (train managers) get kilometre allowance for distance run; 30% of their basic pay also counts as pay for DA and pension. Up to ₹10,000 a month of running allowance is tax-free.", "लोको पायलट, ALP और गार्ड (ट्रेन मैनेजर) को चली दूरी पर किलोमीटर भत्ता मिलता है; उनकी बेसिक पे का 30% DA और पेंशन के लिए वेतन माना जाता है। रनिंग भत्ते का ₹10,000 महीना तक टैक्स-फ़्री है।")}</li>
<li><strong>{t(lang, "Productivity Linked Bonus (PLB)", "उत्पादकता आधारित बोनस (PLB)")}</strong> – {t(lang, "78 days' wages a year for non-gazetted staff, calculated on a ₹7,000 monthly ceiling: up to ₹17,951, paid before Dussehra/Diwali.", "अराजपत्रित कर्मियों को साल में 78 दिन का वेतन, ₹7,000 मासिक सीमा पर: अधिकतम ₹17,951, दशहरा/दिवाली से पहले।")}</li>
<li><strong>{t(lang, "Night duty allowance", "नाइट ड्यूटी भत्ता")}</strong> – {t(lang, "for duty between 10 pm and 6 am, for staff with basic pay up to ₹43,600.", "रात 10 से सुबह 6 बजे की ड्यूटी पर, ₹43,600 तक बेसिक पे वाले कर्मियों को।")}</li>
<li><strong>{t(lang, "Free rail passes and PTOs", "मुफ़्त रेल पास और PTO")}</strong> – {t(lang, "for the employee and family every year.", "हर साल कर्मचारी और परिवार के लिए।")}</li>
</ul>
<h2>{t(lang, "Railway salary in the 8th Pay Commission", "8वें वेतन आयोग में रेलवे वेतन")}</h2>
<p>{t(lang, f"Railway employees are central government employees, so the 8th CPC applies. At a fitment factor of {FIT}, Level 1 starting basic would go from {inr(18000)} to about {inr(fit8(18000))} and an ALP's (Level 2) from {inr(19900)} to about {inr(fit8(19900))}.", f"रेलवे कर्मचारी केंद्रीय सरकारी कर्मचारी हैं, इसलिए 8वां CPC लागू होगा। {FIT} फिटमेंट फैक्टर पर लेवल 1 की शुरुआती बेसिक {inr(18000)} से लगभग {inr(fit8(18000))} और ALP (लेवल 2) की {inr(19900)} से लगभग {inr(fit8(19900))} हो जाएगी।")}</p>
{links(lang, COMMON_LINKS + [("Night duty allowance and bonus (PLB) calculator", "नाइट ड्यूटी भत्ता और बोनस (PLB) कैलकुलेटर", "arrears-allowances/")])}"""
    faqs = [
        (t(lang, "What is the salary of a railway Group D employee in 2026?", "2026 में रेलवे ग्रुप D कर्मचारी का वेतन कितना है?"),
         t(lang, f"Group D posts such as Track Maintainer and Pointsman are on Level 1 with starting basic pay of ₹18,000. With DA at {DA_NOW}%, HRA and transport allowance the gross is about {rows[0][3]} a month in a Y-class city.", f"ट्रैक मेंटेनर और पॉइंट्समैन जैसे ग्रुप D पद लेवल 1 पर हैं, शुरुआती बेसिक ₹18,000। {DA_NOW}% DA, HRA और परिवहन भत्ते के साथ Y श्रेणी शहर में ग्रॉस लगभग {rows[0][3]} महीना।")),
        (t(lang, "What is the pay level of a Station Master?", "स्टेशन मास्टर का पे लेवल क्या है?"),
         t(lang, "Station Master is Level 6 with starting basic pay of ₹35,400, the same level as Junior Engineer and RPF Sub-Inspector.", "स्टेशन मास्टर लेवल 6 पर है, शुरुआती बेसिक ₹35,400, जूनियर इंजीनियर और RPF सब-इंस्पेक्टर के बराबर।")),
        (t(lang, "How much is the railway bonus (PLB)?", "रेलवे बोनस (PLB) कितना है?"),
         t(lang, "78 days' wages on a ₹7,000 monthly ceiling, which works out to a maximum of ₹17,951 for eligible non-gazetted staff.", "₹7,000 मासिक सीमा पर 78 दिन का वेतन, यानी पात्र अराजपत्रित कर्मियों को अधिकतम ₹17,951।")),
    ]
    return body, faqs


# ---------------------------------------------------------------------------
# PSUs (CPSE executives, 3rd PRC)
# ---------------------------------------------------------------------------

PSU_SCALES = [("E0", 30000, 120000), ("E1", 40000, 140000), ("E2", 50000, 160000), ("E3", 60000, 180000),
              ("E4", 70000, 200000), ("E5", 80000, 220000), ("E6", 90000, 240000), ("E7", 100000, 260000),
              ("E8", 120000, 280000), ("E9", 150000, 300000)]
PSU_ROLES = {"E0": ("Junior supervisors / officers", "जूनियर सुपरवाइज़र / अधिकारी"), "E1": ("Graduate engineer trainees, management trainees", "ग्रेजुएट इंजीनियर ट्रेनी, मैनेजमेंट ट्रेनी"),
             "E2": ("Engineers, officers (after training)", "इंजीनियर, अधिकारी (ट्रेनिंग के बाद)"), "E3": ("Senior engineers, senior officers", "सीनियर इंजीनियर, सीनियर अधिकारी"),
             "E4": ("Managers", "मैनेजर"), "E5": ("Senior / chief managers", "सीनियर / चीफ़ मैनेजर"),
             "E6": ("Deputy general managers", "डिप्टी जनरल मैनेजर"), "E7": ("General managers", "जनरल मैनेजर"),
             "E8": ("Executive directors / chief GMs", "एग्ज़िक्यूटिव डायरेक्टर / चीफ़ GM"), "E9": ("Senior executive directors", "सीनियर एग्ज़िक्यूटिव डायरेक्टर")}
IDA_NOW = 55.7


def psu(lang):
    rows = []
    for g, lo, hi in PSU_SCALES:
        gross = lo * (1 + IDA_NOW / 100) + lo * 0.35 + lo * 0.20
        rows.append([g, html.escape(t(lang, *PSU_ROLES[g])), f"{inr(lo)} – {inr(hi)}", inr(gross)])
    body = f"""<h2>{t(lang, "PSU salary: E0 to E9 pay scales (3rd PRC, IDA pattern)", "PSU वेतन: E0 से E9 वेतनमान (तीसरा PRC, IDA पैटर्न)")}</h2>
<p>{t(lang, "Executives of central public sector enterprises (ONGC, NTPC, IOCL, BHEL, SAIL, GAIL, Coal India and others) are paid on the IDA pattern, not the central pay matrix. Pay scales come from the 3rd Pay Revision Committee (PRC), in force from 1 January 2017. Each scale has a 3% annual increment.", "केंद्रीय सार्वजनिक उपक्रमों (ONGC, NTPC, IOCL, BHEL, SAIL, GAIL, कोल इंडिया आदि) के अधिकारियों को केंद्र के पे मैट्रिक्स से नहीं, IDA पैटर्न से वेतन मिलता है। वेतनमान तीसरी पे रिवीज़न कमेटी (PRC) से हैं, 1 जनवरी 2017 से लागू। हर स्केल में 3% सालाना इंक्रीमेंट है।")}</p>
{table([t(lang, "Grade", "ग्रेड"), t(lang, "Typical posts", "आम पद"), t(lang, "Pay scale (basic)", "वेतनमान (बेसिक)"), t(lang, "Starting gross a month (estimate)", "शुरुआती मासिक ग्रॉस (अनुमान)")], rows, (2, 3))}
<p class="{NOTE}">{t(lang, f"Gross = basic + IDA {IDA_NOW}% + perks 35% of basic (cafeteria allowances, the usual maximum) + HRA 20% (Y city). Perks differ by company. Board-level scales: Director ₹1,80,000 – ₹3,40,000, CMD ₹2,00,000 – ₹3,70,000.", f"ग्रॉस = बेसिक + {IDA_NOW}% IDA + बेसिक का 35% पर्क्स (कैफ़ेटेरिया भत्ते, आमतौर पर अधिकतम) + 20% HRA (Y शहर)। पर्क्स कंपनी के अनुसार अलग होते हैं। बोर्ड स्तर: डायरेक्टर ₹1,80,000 – ₹3,40,000, CMD ₹2,00,000 – ₹3,70,000।")}</p>
<h2>{t(lang, "IDA (Industrial Dearness Allowance) now", "अभी का IDA (औद्योगिक महंगाई भत्ता)")}</h2>
<ul>
<li>{t(lang, f"IDA on 2017 scales is revised every quarter (January, April, July, October) from the CPI-IW. It was <strong>{IDA_NOW}% from 1 July 2026</strong> (DPE order). From 1 October 2026 it has been reported at about 59.1%; check the DPE order before using it.", f"2017 वेतनमान पर IDA हर तिमाही (जनवरी, अप्रैल, जुलाई, अक्टूबर) CPI-IW के आधार पर बदलता है। <strong>1 जुलाई 2026 से यह {IDA_NOW}%</strong> था (DPE आदेश)। 1 अक्टूबर 2026 से लगभग 59.1% बताया गया है; इस्तेमाल से पहले DPE आदेश देखें।")}</li>
<li>{t(lang, "HRA rises with IDA: 24/16/8% of basic, 27/18/9% once IDA crosses 25%, and 30/20/10% once it crosses 50%.", "HRA, IDA के साथ बढ़ता है: बेसिक का 24/16/8%, IDA 25% पार करने पर 27/18/9%, और 50% पार करने पर 30/20/10%।")}</li>
<li>{t(lang, "Other benefits: Performance Related Pay (PRP) based on company profit, and superannuation benefits (EPF, gratuity, pension) up to 30% of basic + IDA.", "अन्य लाभ: कंपनी के मुनाफ़े पर आधारित परफ़ॉर्मेंस रिलेटेड पे (PRP), और बेसिक + IDA के 30% तक सेवानिवृत्ति लाभ (EPF, ग्रेच्युटी, पेंशन)।")}</li>
</ul>
<h2>{t(lang, "Does the 8th Pay Commission apply to PSU employees?", "क्या 8वां वेतन आयोग PSU कर्मचारियों पर लागू होगा?")}</h2>
<p>{t(lang, "No. CPSE executives on IDA pay get their own pay revision committee, usually every 10 years. The 3rd PRC ran from 1 January 2017, so the 4th PRC is due from 1 January 2027. Unionised workers get wage settlements negotiated company by company. Some CPSEs that follow central DA (CDA pattern) are covered by the pay commission instead.", "नहीं। IDA वेतन वाले CPSE अधिकारियों के लिए अलग पे रिवीज़न कमेटी बनती है, आमतौर पर हर 10 साल में। तीसरा PRC 1 जनवरी 2017 से लागू था, इसलिए चौथा PRC 1 जनवरी 2027 से देय है। यूनियन वाले कर्मचारियों का वेतन समझौता हर कंपनी में अलग से होता है। केंद्रीय DA (CDA पैटर्न) वाले कुछ CPSE वेतन आयोग के दायरे में आते हैं।")}</p>
{links(lang, [("Bank salary (12th Bipartite)", "बैंक वेतन (12वां द्विपक्षीय समझौता)", "tools/bank-salary-calculator-12th-bipartite/"), ("CTC to in-hand salary calculator", "CTC से इन-हैंड सैलरी कैलकुलेटर", "tools/ctc-to-in-hand-salary-calculator/")] + COMMON_LINKS[:1])}"""
    faqs = [
        (t(lang, "What is the E2 grade salary in a PSU?", "PSU में E2 ग्रेड का वेतन कितना है?"),
         t(lang, f"The E2 scale is ₹50,000 – ₹1,60,000 basic. At the start, with IDA {IDA_NOW}%, 35% perks and HRA, the gross is about {rows[2][3]} a month, plus annual PRP.", f"E2 वेतनमान ₹50,000 – ₹1,60,000 बेसिक है। शुरुआत में {IDA_NOW}% IDA, 35% पर्क्स और HRA के साथ ग्रॉस लगभग {rows[2][3]} महीना, साथ में सालाना PRP।")),
        (t(lang, "What is the current IDA rate for PSU employees?", "PSU कर्मचारियों का मौजूदा IDA कितना है?"),
         t(lang, f"{IDA_NOW}% on 2017 pay scales from 1 July 2026. The October 2026 rate has been reported at about 59.1%.", f"1 जुलाई 2026 से 2017 वेतनमान पर {IDA_NOW}%। अक्टूबर 2026 की दर लगभग 59.1% बताई गई है।")),
        (t(lang, "When is the next pay revision for PSU employees?", "PSU कर्मचारियों का अगला वेतन संशोधन कब है?"),
         t(lang, "The 4th Pay Revision for CPSE executives is due from 1 January 2027, ten years after the 3rd PRC. The 8th Pay Commission does not cover IDA-pattern PSU employees.", "CPSE अधिकारियों का चौथा वेतन संशोधन 1 जनवरी 2027 से देय है, तीसरे PRC के दस साल बाद। 8वां वेतन आयोग IDA पैटर्न वाले PSU कर्मचारियों पर लागू नहीं होता।")),
    ]
    return body, faqs


# ---------------------------------------------------------------------------
# Banks (12th Bipartite Settlement)
# ---------------------------------------------------------------------------

def bank(lang):
    scales = [("Sub-staff", "सब-स्टाफ़", 19500, 37815), ("Clerk", "क्लर्क", 24050, 64480),
              ("JMGS I (PO, Assistant Manager)", "JMGS I (PO, असिस्टेंट मैनेजर)", 48480, 85920), ("MMGS II (Manager)", "MMGS II (मैनेजर)", 64820, 93960),
              ("MMGS III (Senior Manager)", "MMGS III (सीनियर मैनेजर)", 85920, 105280), ("SMGS IV (Chief Manager)", "SMGS IV (चीफ़ मैनेजर)", 102300, 120940),
              ("SMGS V (Assistant GM)", "SMGS V (असिस्टेंट GM)", 120940, 135020), ("TEGS VI (Deputy GM)", "TEGS VI (डिप्टी GM)", 140500, 156500),
              ("TEGS VII (GM)", "TEGS VII (GM)", 156500, 173860)]
    bda = 27.83
    rows = [[html.escape(t(lang, en, hi)), f"{inr(lo)} – {inr(hi_)}", inr(lo * bda / 100)] for en, hi, lo, hi_ in scales]
    body = f"""<h2>{t(lang, "Bank salary: 12th Bipartite Settlement pay scales", "बैंक वेतन: 12वें द्विपक्षीय समझौते के वेतनमान")}</h2>
<p>{t(lang, "Staff of public sector banks (SBI, PNB, Bank of Baroda, Canara Bank and others) are paid under the 12th Bipartite Settlement and Joint Note signed in March 2024, effective from 1 November 2022. The 8th Pay Commission does not apply to banks.", "सरकारी बैंकों (SBI, PNB, बैंक ऑफ़ बड़ौदा, केनरा बैंक आदि) के कर्मचारियों को मार्च 2024 में हुए 12वें द्विपक्षीय समझौते और जॉइंट नोट के अनुसार वेतन मिलता है, जो 1 नवंबर 2022 से लागू है। 8वां वेतन आयोग बैंकों पर लागू नहीं होता।")}</p>
{table([t(lang, "Cadre / scale", "कैडर / स्केल"), t(lang, "Basic pay scale", "बेसिक वेतनमान"), t(lang, f"DA at start ({bda}%)", f"शुरुआत में DA ({bda}%)")], rows, (1, 2))}
<p class="{NOTE}">{t(lang, "On top of basic pay and DA: special allowance (a percentage of basic that also earns DA), HRA or leased accommodation for officers, transport and other allowances, and PLI linked to the bank's profit.", "बेसिक और DA के अलावा: स्पेशल अलाउंस (बेसिक का प्रतिशत, इस पर भी DA), HRA या अधिकारियों को लीज़ आवास, परिवहन व अन्य भत्ते, और बैंक के मुनाफ़े से जुड़ा PLI।")}</p>
<h2>{t(lang, "Bank DA now", "अभी का बैंक DA")}</h2>
<p>{t(lang, f"Bank DA changes every quarter (February, May, August, November) with the CPI-IW. It is <strong>{bda}% for August–October 2026</strong>; the November 2026 – January 2027 rate is announced by IBA after the September index and is expected around 30%.", f"बैंक DA हर तिमाही (फ़रवरी, मई, अगस्त, नवंबर) CPI-IW के साथ बदलता है। <strong>अगस्त–अक्टूबर 2026 के लिए यह {bda}%</strong> है; नवंबर 2026 – जनवरी 2027 की दर IBA सितंबर के सूचकांक के बाद घोषित करता है, लगभग 30% की उम्मीद है।")}</p>
<h2>{t(lang, "Next bank wage revision", "बैंकों का अगला वेतन संशोधन")}</h2>
<p>{t(lang, "Bipartite settlements run for five years, so the 13th Bipartite Settlement is due from 1 November 2027. Talks between IBA and the unions usually start a few months before.", "द्विपक्षीय समझौते पाँच साल के होते हैं, इसलिए 13वां समझौता 1 नवंबर 2027 से देय है। IBA और यूनियनों की बातचीत आमतौर पर कुछ महीने पहले शुरू होती है।")}</p>
{links(lang, [("PSU salary (E0 to E9)", "PSU वेतन (E0 से E9)", "tools/psu-salary-calculator-ida/"), ("CTC to in-hand salary calculator", "CTC से इन-हैंड सैलरी कैलकुलेटर", "tools/ctc-to-in-hand-salary-calculator/")])}"""
    faqs = [
        (t(lang, "What is the basic pay of a bank PO in 2026?", "2026 में बैंक PO की बेसिक पे कितनी है?"),
         t(lang, f"A Probationary Officer (JMGS I) starts at ₹48,480 basic under the 12th Bipartite Settlement, with DA of {bda}% (August–October 2026), special allowance, HRA and other allowances on top.", f"12वें द्विपक्षीय समझौते में प्रोबेशनरी ऑफ़िसर (JMGS I) की शुरुआती बेसिक ₹48,480 है, साथ में {bda}% DA (अगस्त–अक्टूबर 2026), स्पेशल अलाउंस, HRA और अन्य भत्ते।")),
        (t(lang, "What is the basic pay of a bank clerk?", "बैंक क्लर्क की बेसिक पे कितनी है?"),
         t(lang, "The clerk scale is ₹24,050 – ₹64,480 under the 12th Bipartite Settlement.", "12वें द्विपक्षीय समझौते में क्लर्क का वेतनमान ₹24,050 – ₹64,480 है।")),
        (t(lang, "Will bank employees get the 8th Pay Commission?", "क्या बैंक कर्मचारियों को 8वां वेतन आयोग मिलेगा?"),
         t(lang, "No. Bank pay is set by bipartite settlements between IBA and the unions. The next one, the 13th, is due from 1 November 2027.", "नहीं। बैंक वेतन IBA और यूनियनों के बीच द्विपक्षीय समझौते से तय होता है। अगला, 13वां, 1 नवंबर 2027 से देय है।")),
    ]
    return body, faqs


# ---------------------------------------------------------------------------
# State governments
# ---------------------------------------------------------------------------

STATES_CENTRAL = [("Uttar Pradesh", "उत्तर प्रदेश"), ("Madhya Pradesh", "मध्य प्रदेश"), ("Rajasthan", "राजस्थान"), ("Gujarat", "गुजरात"),
                  ("Bihar", "बिहार"), ("Jharkhand", "झारखंड"), ("Uttarakhand", "उत्तराखंड"), ("Haryana", "हरियाणा"), ("Chhattisgarh", "छत्तीसगढ़"),
                  ("Odisha", "ओडिशा"), ("Tamil Nadu", "तमिलनाडु"), ("Delhi", "दिल्ली")]
STATES_OWN = [("Maharashtra", "महाराष्ट्र", "7th State Pay Commission (own S-1 to S-30 levels)", "सातवाँ राज्य वेतन आयोग (अपने S-1 से S-30 लेवल)"),
              ("Karnataka", "कर्नाटक", "7th State Pay Commission (from 2024)", "सातवाँ राज्य वेतन आयोग (2024 से)"),
              ("Kerala", "केरल", "11th Pay Revision (2019); 12th due", "11वां वेतन संशोधन (2019); 12वां देय"),
              ("Punjab", "पंजाब", "6th Punjab Pay Commission", "छठा पंजाब वेतन आयोग"),
              ("Himachal Pradesh", "हिमाचल प्रदेश", "Follows Punjab pay scales", "पंजाब वेतनमान पर"),
              ("West Bengal", "पश्चिम बंगाल", "ROPA 2019 (6th Pay Commission); 7th Pay Commission formed", "ROPA 2019 (छठा वेतन आयोग); सातवाँ वेतन आयोग गठित"),
              ("Andhra Pradesh", "आंध्र प्रदेश", "Pay Revision Commission (PRC 2022); next PRC due", "वेतन संशोधन आयोग (PRC 2022); अगला PRC देय"),
              ("Telangana", "तेलंगाना", "PRC 2020; 2nd PRC due", "PRC 2020; दूसरा PRC देय")]


def state(lang):
    cen = ", ".join(t(lang, en, hi) for en, hi in STATES_CENTRAL)
    rows = [[html.escape(t(lang, en, hi)), html.escape(t(lang, a, b))] for en, hi, a, b in STATES_OWN]
    body = f"""<h2>{t(lang, "State government pay scales: which states follow the central pay commission", "राज्य सरकार के वेतनमान: कौन से राज्य केंद्रीय वेतन आयोग अपनाते हैं")}</h2>
<p>{t(lang, "States are not bound by the central pay commission. Each state decides its own pay structure and DA. They fall into two groups.", "राज्य केंद्रीय वेतन आयोग से बंधे नहीं हैं। हर राज्य अपना वेतन ढाँचा और DA ख़ुद तय करता है। राज्य दो समूहों में आते हैं।")}</p>
<h3>{t(lang, "1. States that use the 7th CPC pay matrix", "1. 7वें CPC पे मैट्रिक्स वाले राज्य")}</h3>
<p>{html.escape(cen)}.</p>
<p>{t(lang, "Their employees have the same pay levels (Level 1 ₹18,000 upwards) as central employees, sometimes with a few state-specific levels. These states usually raise DA to match the centre a few weeks or months after each central DA hike, so DA is at or close to the central 60% (from January 2026). They have historically adopted each central pay commission, usually 6 to 18 months after the centre.", "इनके कर्मचारियों के पे लेवल केंद्र जैसे ही हैं (लेवल 1 ₹18,000 से ऊपर), कहीं-कहीं कुछ राज्य-विशेष लेवल के साथ। ये राज्य आमतौर पर केंद्र के हर DA बढ़ोतरी के कुछ हफ़्ते या महीने बाद DA बढ़ाते हैं, इसलिए DA केंद्र के 60% (जनवरी 2026 से) के बराबर या उसके आसपास है। ये राज्य हर केंद्रीय वेतन आयोग को अपनाते रहे हैं, आमतौर पर केंद्र के 6 से 18 महीने बाद।")}</p>
<h3>{t(lang, "2. States with their own pay commission", "2. अपने वेतन आयोग वाले राज्य")}</h3>
{table([t(lang, "State", "राज्य"), t(lang, "Pay structure", "वेतन ढाँचा")], rows)}
<p class="{NOTE}">{t(lang, "In these states the DA percentage is not comparable with the central DA, because it is paid on a different (revised) basic pay. A lower DA percentage does not mean lower pay.", "इन राज्यों का DA प्रतिशत केंद्र के DA से तुलनीय नहीं है, क्योंकि यह अलग (संशोधित) बेसिक पे पर मिलता है। कम DA प्रतिशत का मतलब कम वेतन नहीं है।")}</p>
<h2>{t(lang, "Will state employees get the 8th Pay Commission?", "क्या राज्य कर्मचारियों को 8वां वेतन आयोग मिलेगा?")}</h2>
<p>{t(lang, "Not automatically. The 8th CPC is for central government employees. States in the first group are expected to adopt its pay matrix by their own notification after the centre implements it, as they did with the 7th CPC. States in the second group will revise pay through their own commissions on their own timetable.", "अपने-आप नहीं। 8वां CPC केंद्रीय कर्मचारियों के लिए है। पहले समूह के राज्य केंद्र के लागू करने के बाद अपनी अधिसूचना से इसका पे मैट्रिक्स अपनाएँगे, जैसा 7वें CPC के साथ हुआ। दूसरे समूह के राज्य अपने आयोगों से अपने समय पर वेतन संशोधित करेंगे।")}</p>
{links(lang, COMMON_LINKS + [("DA calculator", "DA कैलकुलेटर", "tools/dearness-allowance-calculator/")])}"""
    faqs = [
        (t(lang, "Will state government employees get the 8th Pay Commission?", "क्या राज्य सरकार के कर्मचारियों को 8वां वेतन आयोग मिलेगा?"),
         t(lang, "Not automatically. States such as UP, MP, Rajasthan, Gujarat and Bihar usually adopt the central pay commission by their own order after the centre; states such as Kerala, Karnataka, Punjab and West Bengal have their own pay commissions.", "अपने-आप नहीं। उत्तर प्रदेश, मध्य प्रदेश, राजस्थान, गुजरात और बिहार जैसे राज्य आमतौर पर केंद्र के बाद अपने आदेश से केंद्रीय वेतन आयोग अपनाते हैं; केरल, कर्नाटक, पंजाब और पश्चिम बंगाल जैसे राज्यों के अपने वेतन आयोग हैं।")),
        (t(lang, "Why is DA different in different states?", "अलग-अलग राज्यों में DA अलग क्यों है?"),
         t(lang, "Each state sets its own DA. States on the central pay matrix usually follow the central rate with some delay; states with their own pay commission pay DA on a revised basic, so their percentage is lower but not comparable.", "हर राज्य अपना DA ख़ुद तय करता है। केंद्रीय पे मैट्रिक्स वाले राज्य आमतौर पर कुछ देरी से केंद्र की दर अपनाते हैं; अपने वेतन आयोग वाले राज्य संशोधित बेसिक पर DA देते हैं, इसलिए उनका प्रतिशत कम होता है पर तुलनीय नहीं।")),
        (t(lang, "Which states follow the 7th CPC pay matrix?", "कौन से राज्य 7वें CPC का पे मैट्रिक्स अपनाते हैं?"),
         t(lang, cen + " broadly use the central 7th CPC pay matrix.", cen + " मोटे तौर पर केंद्र का 7वें CPC पे मैट्रिक्स अपनाते हैं।")),
    ]
    return body, faqs


GUIDES = {
    "capf_handbook_suite": capf,
    "agniveer_defence": defence,
    "railway_hub_suite": railway,
    "psu_cpse_3prc": psu,
    "bank_iba_12bps": bank,
    "state_govt_compare": state,
}

# Search-friendly titles and descriptions for the guide pages (titles under ~60 characters).
SEO = {
    "capf_handbook_suite": {
        "title": ("CAPF Salary 2026: Constable to Commandant Pay & 8th CPC", "CAPF वेतन 2026: कांस्टेबल से कमांडेंट तक और 8वां CPC"),
        "description": ("CAPF salary by rank for BSF, CRPF, CISF, ITBP, SSB: pay level, basic pay, gross with DA 60%, risk & hardship allowance, ration money and 8th CPC estimate.",
                        "BSF, CRPF, CISF, ITBP, SSB में रैंक के अनुसार वेतन: पे लेवल, बेसिक, 60% DA के साथ ग्रॉस, रिस्क-हार्डशिप भत्ता, राशन मनी और 8वें CPC का अनुमान।")},
    "agniveer_defence": {
        "title": ("Agniveer Salary & Army Pay Scale 2026 (Sepoy to General)", "अग्निवीर वेतन और सेना वेतनमान 2026 (सिपाही से जनरल)"),
        "description": ("Agniveer pay year 1 to 4, in-hand and Seva Nidhi (₹11.71 lakh), plus Army pay scale for every rank with MSP, DA 60% and the 8th CPC estimate.",
                        "अग्निवीर का साल 1 से 4 तक वेतन, हाथ में और सेवा निधि (₹11.71 लाख), साथ में हर रैंक का सेना वेतनमान, MSP, 60% DA और 8वें CPC का अनुमान।")},
    "railway_hub_suite": {
        "title": ("Railway Salary 2026: Pay Level of Every Post & 8th CPC", "रेलवे वेतन 2026: हर पद का पे लेवल और 8वां CPC"),
        "description": ("Railway salary by post: Group D, ALP, clerk, Station Master, JE, SSE pay level and gross with DA 60%, running allowance, PLB bonus and 8th CPC estimate.",
                        "पद के अनुसार रेलवे वेतन: ग्रुप D, ALP, क्लर्क, स्टेशन मास्टर, JE, SSE का पे लेवल और 60% DA के साथ ग्रॉस, रनिंग भत्ता, PLB बोनस और 8वें CPC का अनुमान।")},
    "psu_cpse_3prc": {
        "title": ("PSU Salary 2026: E0 to E9 Pay Scales, IDA & In-Hand", "PSU वेतन 2026: E0 से E9 वेतनमान, IDA और इन-हैंड"),
        "description": ("PSU (CPSE) salary under the 3rd PRC: E0 to E9 pay scales, IDA 55.7%, HRA, perks, PRP, and when the 4th pay revision is due (January 2027).",
                        "तीसरे PRC में PSU (CPSE) वेतन: E0 से E9 वेतनमान, 55.7% IDA, HRA, पर्क्स, PRP और चौथा वेतन संशोधन कब (जनवरी 2027)।")},
    "bank_iba_12bps": {
        "title": ("Bank Salary 2026: 12th Bipartite Clerk & PO Pay Scale", "बैंक वेतन 2026: 12वें समझौते में क्लर्क और PO वेतनमान"),
        "description": ("Public sector bank pay scales under the 12th Bipartite Settlement: clerk, PO (JMGS I) to GM, bank DA 27.83%, and when the 13th settlement is due.",
                        "12वें द्विपक्षीय समझौते में सरकारी बैंकों के वेतनमान: क्लर्क, PO (JMGS I) से GM तक, बैंक DA 27.83% और 13वां समझौता कब।")},
    "state_govt_compare": {
        "title": ("State Govt Pay Scales: Which States Get the 8th CPC?", "राज्य सरकार वेतनमान: किन राज्यों को मिलेगा 8वां CPC?"),
        "description": ("Which states use the central 7th CPC pay matrix and DA, which have their own pay commissions, and whether state employees will get the 8th Pay Commission.",
                        "कौन से राज्य केंद्र का 7वां CPC पे मैट्रिक्स और DA अपनाते हैं, किनके अपने वेतन आयोग हैं, और क्या राज्य कर्मचारियों को 8वां वेतन आयोग मिलेगा।")},
}


def guide(tool_id, lang):
    """(html, faqs) for a tool page, or ("", []) when the tool has no guide."""
    fn = GUIDES.get(tool_id)
    if not fn:
        return "", []
    body, faqs = fn(lang)
    stamp = f'<p class="{NOTE}">' + t(lang, f"Figures as of {AS_OF['en']}. Allowance and DA rates change; confirm with your office's latest order.", f"आंकड़े {AS_OF['hi']} तक के। भत्ते और DA की दरें बदलती रहती हैं; अपने कार्यालय के ताज़ा आदेश से पुष्टि करें।") + "</p>"
    return body + "\n" + stamp, faqs
