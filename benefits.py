"""Guides for the provident fund and leave calculators (GPF, EPF/VPF, leave encashment, maternity
and child care leave). Like sectors.py, build.py adds each guide above the calculator's general text
on its /tools/<slug>/ page, in English and Hindi, with FAQs for the FAQ schema. sectors.py merges
GUIDES and SEO from here into its own.

Rates to update when new orders come out: GPF_RATE (quarterly Finance Ministry resolution), EPF_RATE
(yearly, EPFO CBT), EPF_CEILING (statutory wage ceiling).
"""
from sectors import DA_NOW, NOTE, inr, links, t, table

GPF_RATE = 7.1          # 1 Oct to 31 Dec 2026, Finance Ministry resolution of 5 October 2026
EPF_RATE = 8.25         # 2025-26, CBT 2 March 2026, ratified June 2026
EPF_CEILING = 25000     # statutory wage ceiling from 17 September 2026 (was 15,000)
EPF_RATES = [("2021-22", "8.10%"), ("2022-23", "8.15%"), ("2023-24", "8.25%"), ("2024-25", "8.25%"), ("2025-26", "8.25%")]


def rupees(x):
    """Round half up, then format (EPS shares are quoted rounded up, e.g. 8.33% of 25,000 = ₹2,083)."""
    return inr(int(x + 0.5))


PF_LINKS = [
    ("GPF calculator", "GPF कैलकुलेटर", "tools/gpf-calculator/"),
    ("EPF & VPF calculator", "EPF और VPF कैलकुलेटर", "tools/epf-vpf-calculator/"),
    ("EPS-95 pension & Atal Pension calculator", "EPS-95 पेंशन और अटल पेंशन कैलकुलेटर", "tools/atal-pension-yojana-eps-95-calculator/"),
    ("Retirement planning calculator", "रिटायरमेंट प्लानिंग कैलकुलेटर", "tools/retirement-planning-calculator/"),
]
LEAVE_LINKS = [
    ("Leave encashment calculator (earned leave)", "छुट्टी नकदीकरण कैलकुलेटर (अर्जित अवकाश)", "tools/leave-encashment-calculator/"),
    ("Maternity, paternity & child care leave", "मातृत्व, पितृत्व और चाइल्ड केयर लीव", "tools/child-care-leave-maternity-leave-calculator/"),
    ("LTC calculator", "LTC कैलकुलेटर", "tools/ltc-calculator/"),
    ("Retirement date calculator", "रिटायरमेंट तारीख कैलकुलेटर", "tools/retirement-date-calculator/"),
]


# ---------------------------------------------------------------------------
# Provident fund (GPF calculator page): what a provident fund is, and the four kinds
# ---------------------------------------------------------------------------

def gpf(lang):
    kinds = [
        ["EPF", t(lang, "Private sector, PSU and autonomous-body staff (EPFO)", "प्राइवेट, PSU और स्वायत्त संस्थाओं के कर्मचारी (EPFO)"),
         t(lang, "12% of basic + DA, and 12% from employer", "बेसिक + DA का 12%, और 12% नियोक्ता से"), f"{EPF_RATE}%"],
        ["VPF", t(lang, "EPF members who want to save more", "EPF सदस्य जो ज़्यादा बचाना चाहें"),
         t(lang, "Extra over 12%, up to 100% of basic + DA", "12% के ऊपर अतिरिक्त, बेसिक + DA के 100% तक"), f"{EPF_RATE}%"],
        ["GPF", t(lang, "Government employees on the old pension scheme", "पुरानी पेंशन योजना वाले सरकारी कर्मचारी"),
         t(lang, "At least 6% of pay; no employer share", "वेतन का कम से कम 6%; नियोक्ता का हिस्सा नहीं"), f"{GPF_RATE}%"],
        ["PPF", t(lang, "Anyone (post office or bank account)", "कोई भी (डाकघर या बैंक खाता)"),
         t(lang, "₹500 to ₹1.5 lakh a year, 15 years", "₹500 से ₹1.5 लाख सालाना, 15 साल"), "7.1%"],
    ]
    head = [t(lang, "Fund", "फंड"), t(lang, "Who can join", "कौन जुड़ सकता है"), t(lang, "How much goes in", "कितना जमा होता है"), t(lang, "Interest now", "अभी ब्याज")]
    bal, sub = 850000, 15000
    interest = (bal + sub * 6) * GPF_RATE / 100
    body = f"""<h2>{t(lang, "What is a provident fund?", "प्रोविडेंट फंड (भविष्य निधि) क्या है?")}</h2>
<p>{t(lang, "A provident fund (PF) is a savings account for your retirement that is filled from your salary every month. In Hindi it is called <em>bhavishya nidhi</em> (भविष्य निधि), the fund for the future. The money earns interest every year, the interest is tax-free within limits, and you get the whole balance when you retire or leave the job. India has four kinds: EPF, VPF, GPF and PPF.", "प्रोविडेंट फंड (PF), यानी भविष्य निधि, रिटायरमेंट के लिए एक बचत खाता है जिसमें हर महीने वेतन से पैसा जमा होता है। इस पर हर साल ब्याज मिलता है, सीमा के भीतर ब्याज टैक्स-फ़्री है, और रिटायरमेंट या नौकरी छोड़ने पर पूरा बैलेंस मिलता है। भारत में इसके चार प्रकार हैं: EPF, VPF, GPF और PPF।")}</p>
{table(head, kinds, wrap=True)}
<p class="{NOTE}">{t(lang, f"EPF and VPF: {EPF_RATE}% for 2025-26, set yearly by the EPFO. GPF: {GPF_RATE}% for October to December 2026, set every quarter by the Finance Ministry. PPF: 7.1%, set every quarter.", f"EPF और VPF: 2025-26 के लिए {EPF_RATE}%, EPFO हर साल तय करता है। GPF: अक्टूबर से दिसंबर 2026 के लिए {GPF_RATE}%, वित्त मंत्रालय हर तिमाही तय करता है। PPF: 7.1%, हर तिमाही तय होता है।")}</p>
<h2>{t(lang, "GPF: the provident fund for government employees", "GPF: सरकारी कर्मचारियों का प्रोविडेंट फंड")}</h2>
<p>{t(lang, "The General Provident Fund (GPF) is for central and state government employees on the old pension scheme: those who joined before 1 January 2004 (or before their state moved to NPS), and those allowed to switch back to the old scheme. Employees under NPS or the Unified Pension Scheme (UPS) do not have a GPF account.", "जनरल प्रोविडेंट फंड (GPF) पुरानी पेंशन योजना वाले केंद्र और राज्य सरकार के कर्मचारियों के लिए है: जो 1 जनवरी 2004 से पहले (या अपने राज्य में NPS आने से पहले) भर्ती हुए, और जिन्हें पुरानी योजना में लौटने की अनुमति मिली। NPS या एकीकृत पेंशन योजना (UPS) वाले कर्मचारियों का GPF खाता नहीं होता।")}</p>
<ul>
<li>{t(lang, "<strong>Subscription:</strong> at least 6% of your pay every month, and at most your pay. The total in a financial year cannot exceed ₹5 lakh. You can raise the rate twice and lower it once in a year.", "<strong>अंशदान:</strong> हर महीने वेतन का कम से कम 6%, और अधिकतम पूरा वेतन। एक वित्त वर्ष में कुल ₹5 लाख से ज़्यादा नहीं। साल में दो बार दर बढ़ा और एक बार घटा सकते हैं।")}</li>
<li>{t(lang, "<strong>No employer share:</strong> unlike EPF, the government adds nothing; the pension is the government's part.", "<strong>नियोक्ता का हिस्सा नहीं:</strong> EPF की तरह सरकार कुछ नहीं जोड़ती; पेंशन ही सरकार का हिस्सा है।")}</li>
<li>{t(lang, "<strong>Interest:</strong> worked out on the monthly balance and credited at the end of the financial year. It has been 7.1% every quarter since April 2020.", "<strong>ब्याज:</strong> मासिक बैलेंस पर गिना जाता है और वित्त वर्ष के अंत में जुड़ता है। अप्रैल 2020 से हर तिमाही 7.1% है।")}</li>
<li>{t(lang, "<strong>Advance and withdrawal:</strong> you can take a refundable advance or a non-refundable withdrawal for housing, illness, education, marriage and similar needs, within limits tied to your pay and balance.", "<strong>एडवांस और निकासी:</strong> मकान, बीमारी, पढ़ाई, शादी जैसी ज़रूरतों के लिए वेतन और बैलेंस से जुड़ी सीमा में वापसी-योग्य एडवांस या ग़ैर-वापसी निकासी ले सकते हैं।")}</li>
<li>{t(lang, "<strong>Last months of service:</strong> subscription stops three months before retirement, and the final balance is paid with interest after retirement.", "<strong>सेवा के आख़िरी महीने:</strong> रिटायरमेंट से तीन महीने पहले अंशदान बंद हो जाता है, और अंतिम बैलेंस ब्याज सहित रिटायरमेंट के बाद मिलता है।")}</li>
</ul>
<h2>{t(lang, "Example: GPF interest in one year", "उदाहरण: एक साल में GPF ब्याज")}</h2>
<p>{t(lang, f"With {inr(bal)} in GPF and {inr(sub)} going in every month, the balance at {GPF_RATE}% earns about {inr(interest)} in a year (interest on the opening balance plus, on average, half the year's subscriptions). The calculator above does this for your own figures.", f"GPF में {inr(bal)} हों और हर महीने {inr(sub)} जमा हो, तो {GPF_RATE}% पर साल भर में लगभग {inr(interest)} ब्याज बनता है (शुरुआती बैलेंस पर ब्याज, और औसतन साल भर के अंशदान के आधे पर)। ऊपर का कैलकुलेटर आपके आंकड़ों से यही हिसाब करता है।")}</p>
<h2>{t(lang, "GPF vs EPF vs PPF: which is better?", "GPF बनाम EPF बनाम PPF: कौन बेहतर?")}</h2>
<p>{t(lang, "You don't usually choose: your job decides whether you are in GPF or EPF. EPF pays the most interest and comes with an employer share. GPF is safe and tax-free but has no employer share. PPF is open to everyone, including the self-employed, and is a good extra saving because its interest and maturity amount are fully tax-free.", "आमतौर पर आप चुनते नहीं: आपकी नौकरी तय करती है कि आप GPF में हैं या EPF में। EPF में सबसे ज़्यादा ब्याज और नियोक्ता का हिस्सा मिलता है। GPF सुरक्षित और टैक्स-फ़्री है पर नियोक्ता का हिस्सा नहीं। PPF सबके लिए है, स्वरोज़गार वालों के लिए भी, और अतिरिक्त बचत के लिए अच्छा है क्योंकि इसका ब्याज और परिपक्वता राशि पूरी तरह टैक्स-फ़्री है।")}</p>
{links(lang, PF_LINKS[1:])}"""
    faqs = [
        (t(lang, "What is a provident fund?", "प्रोविडेंट फंड क्या है?"),
         t(lang, "A provident fund is a retirement savings account filled from your salary each month. It earns interest every year and is paid out when you retire or leave the job. The main kinds in India are EPF (private sector and PSUs), VPF (extra voluntary EPF), GPF (government employees on the old pension) and PPF (open to anyone).", "प्रोविडेंट फंड रिटायरमेंट के लिए बचत खाता है जिसमें हर महीने वेतन से पैसा जमा होता है। इस पर हर साल ब्याज मिलता है और रिटायरमेंट या नौकरी छोड़ने पर भुगतान होता है। भारत में मुख्य प्रकार हैं EPF (प्राइवेट और PSU), VPF (स्वैच्छिक अतिरिक्त EPF), GPF (पुरानी पेंशन वाले सरकारी कर्मचारी) और PPF (कोई भी)।")),
        (t(lang, "What is provident fund called in Hindi?", "प्रोविडेंट फंड को हिंदी में क्या कहते हैं?"),
         t(lang, "Bhavishya nidhi (भविष्य निधि). EPF is karmachari bhavishya nidhi, GPF is samanya bhavishya nidhi and PPF is lok bhavishya nidhi.", "भविष्य निधि। EPF को कर्मचारी भविष्य निधि, GPF को सामान्य भविष्य निधि और PPF को लोक भविष्य निधि कहते हैं।")),
        (t(lang, "What is the GPF interest rate now?", "अभी GPF की ब्याज दर क्या है?"),
         t(lang, f"{GPF_RATE}% for 1 October to 31 December 2026, by the Finance Ministry's resolution of 5 October 2026. It has stayed at 7.1% since April 2020.", f"1 अक्टूबर से 31 दिसंबर 2026 के लिए {GPF_RATE}%, वित्त मंत्रालय के 5 अक्टूबर 2026 के प्रस्ताव से। अप्रैल 2020 से यह 7.1% पर है।")),
        (t(lang, "Do NPS employees have GPF?", "क्या NPS वाले कर्मचारियों का GPF होता है?"),
         t(lang, "No. GPF is only for employees on the old pension scheme. Employees under NPS or UPS save through their NPS account instead.", "नहीं। GPF केवल पुरानी पेंशन योजना वालों के लिए है। NPS या UPS वाले कर्मचारी अपने NPS खाते से बचत करते हैं।")),
        (t(lang, "Is GPF interest taxable?", "क्या GPF का ब्याज टैक्सेबल है?"),
         t(lang, "GPF interest is tax-free as long as your subscription stays within ₹5 lakh a year, which is also the most you can put in. The final GPF payment at retirement is fully tax-free.", "जब तक सालाना अंशदान ₹5 लाख के भीतर है, GPF का ब्याज टैक्स-फ़्री है, और यही अधिकतम अंशदान सीमा भी है। रिटायरमेंट पर GPF का अंतिम भुगतान पूरी तरह टैक्स-फ़्री है।")),
    ]
    return body, faqs


# ---------------------------------------------------------------------------
# EPF and VPF
# ---------------------------------------------------------------------------

def epf(lang):
    rows = []
    for wage in (15000, 20000, 25000, 40000):
        base = min(wage, EPF_CEILING)
        eps = base * 0.0833
        label = inr(wage) + ("" if wage <= EPF_CEILING else t(lang, " (on ₹25,000)", " (₹25,000 पर)"))
        rows.append([label, rupees(base * 0.12), rupees(eps), rupees(base * 0.12 - int(eps + 0.5)), rupees(base * 0.24)])
    head = [t(lang, "PF wage (basic + DA)", "PF वेतन (बेसिक + DA)"), t(lang, "You pay (12%)", "आपका हिस्सा (12%)"),
            t(lang, "Employer to EPS (8.33%)", "नियोक्ता से EPS (8.33%)"), t(lang, "Employer to EPF", "नियोक्ता से EPF"),
            t(lang, "Into EPF + EPS", "EPF + EPS में कुल")]
    rate_rows = [[y, r] for y, r in EPF_RATES]
    pen_old, pen_new = 15000 * 27 / 70, 25000 * 27 / 70
    body = f"""<h2>{t(lang, "What is the Employees' Provident Fund (EPF)?", "कर्मचारी भविष्य निधि (EPF) क्या है?")}</h2>
<p>{t(lang, "EPF is the provident fund run by the Employees' Provident Fund Organisation (EPFO) for staff of private companies, PSUs and other establishments with 20 or more workers. Every month 12% of your basic pay + DA is deducted from your salary and your employer adds another 12%. Part of the employer's share goes to your pension under the Employees' Pension Scheme (EPS-95); the rest stays in your EPF account and earns interest.", "EPF, कर्मचारी भविष्य निधि संगठन (EPFO) द्वारा चलाया जाने वाला प्रोविडेंट फंड है, 20 या ज़्यादा कर्मचारियों वाली प्राइवेट कंपनियों, PSU और अन्य संस्थानों के लिए। हर महीने आपकी बेसिक + DA का 12% वेतन से कटता है और नियोक्ता भी 12% जोड़ता है। नियोक्ता के हिस्से का एक भाग कर्मचारी पेंशन योजना (EPS-95) में आपकी पेंशन के लिए जाता है; बाकी आपके EPF खाते में रहकर ब्याज कमाता है।")}</p>
<h2>{t(lang, "New EPF wage ceiling: ₹25,000 from 17 September 2026", "नई EPF वेतन सीमा: 17 सितंबर 2026 से ₹25,000")}</h2>
<p>{t(lang, "The Union Cabinet raised the EPFO wage ceiling from ₹15,000 to ₹25,000 a month, the first change since 2014. Employees earning up to ₹25,000 must now be in EPF, and contributions are worked out on wages up to ₹25,000. The rate is still 12%; what changes is the wage it is worked out on. The employer's pension (EPS) share now goes up to ₹2,083 a month instead of ₹1,250.", "केंद्रीय मंत्रिमंडल ने EPFO की वेतन सीमा ₹15,000 से बढ़ाकर ₹25,000 महीना कर दी, 2014 के बाद पहला बदलाव। ₹25,000 तक कमाने वालों का EPF में होना अब अनिवार्य है, और अंशदान ₹25,000 तक के वेतन पर गिना जाता है। दर अभी भी 12% है; बदलाव उस वेतन में है जिस पर यह गिनी जाती है। नियोक्ता का पेंशन (EPS) हिस्सा अब ₹1,250 के बजाय ₹2,083 महीने तक जाता है।")}</p>
<h2>{t(lang, "How much PF is deducted from salary", "वेतन से कितना PF कटता है")}</h2>
{table(head, rows, (1, 2, 3, 4))}
<p class="{NOTE}">{t(lang, "Above ₹25,000 many employers stop at the ceiling, as in the last row; some contribute 12% of the full wage. EPS never takes more than ₹2,083. Employers also pay 0.5% for EDLI insurance and 0.5% admin charges, which are not in your account.", "₹25,000 से ऊपर कई नियोक्ता आख़िरी पंक्ति की तरह सीमा पर रुक जाते हैं; कुछ पूरे वेतन का 12% देते हैं। EPS में ₹2,083 से ज़्यादा नहीं जाता। नियोक्ता EDLI बीमा के लिए 0.5% और प्रशासनिक शुल्क 0.5% भी देता है, जो आपके खाते में नहीं जाते।")}</p>
<h2>{t(lang, "EPF interest rate by year", "साल के अनुसार EPF ब्याज दर")}</h2>
{table([t(lang, "Year", "वर्ष"), t(lang, "EPF interest", "EPF ब्याज")], rate_rows, (1,))}
<p>{t(lang, f"The EPFO's Central Board of Trustees kept {EPF_RATE}% for 2025-26 on 2 March 2026, and the Finance Ministry ratified it in June 2026. VPF earns the same rate. Interest on your own contributions above ₹2.5 lakh a year (₹5 lakh if the employer puts in nothing) is taxable.", f"EPFO के केंद्रीय न्यासी बोर्ड ने 2 मार्च 2026 को 2025-26 के लिए {EPF_RATE}% बरकरार रखा, और वित्त मंत्रालय ने जून 2026 में इसकी पुष्टि की। VPF पर भी यही दर है। साल में ₹2.5 लाख (नियोक्ता का हिस्सा न हो तो ₹5 लाख) से ज़्यादा अपने अंशदान पर ब्याज टैक्सेबल है।")}</p>
<h2>{t(lang, "EPS-95 pension with the new ceiling", "नई सीमा के साथ EPS-95 पेंशन")}</h2>
<p>{t(lang, f"EPS pension = average pensionable salary of the last 60 months × years of service ÷ 70, with 2 extra years for 20 or more years of service. With 25 years of service at the old ₹15,000 ceiling it is about {rupees(pen_old)} a month; if the whole average is at the new ₹25,000 ceiling it is about {rupees(pen_new)}. Most people retiring soon will be in between, because only wages from September 2026 count at the higher ceiling.", f"EPS पेंशन = पिछले 60 महीनों का औसत पेंशन योग्य वेतन × सेवा के वर्ष ÷ 70, 20 या ज़्यादा साल की सेवा पर 2 साल अतिरिक्त। पुरानी ₹15,000 सीमा पर 25 साल सेवा से लगभग {rupees(pen_old)} महीना; पूरा औसत नई ₹25,000 सीमा पर हो तो लगभग {rupees(pen_new)}। जल्दी रिटायर होने वाले ज़्यादातर लोग इनके बीच रहेंगे, क्योंकि ऊँची सीमा केवल सितंबर 2026 के बाद के वेतन पर लागू है।")}</p>
<h2>{t(lang, "EPF login, balance and withdrawal", "EPF लॉगिन, बैलेंस और निकासी")}</h2>
<ul>
<li>{t(lang, "<strong>Login:</strong> use your UAN (Universal Account Number) on the EPFO member portal or the UMANG app. Your UAN is on your salary slip.", "<strong>लॉगिन:</strong> EPFO मेंबर पोर्टल या UMANG ऐप पर अपना UAN (यूनिवर्सल अकाउंट नंबर) इस्तेमाल करें। UAN आपकी सैलरी स्लिप पर होता है।")}</li>
<li>{t(lang, "<strong>Balance:</strong> give a missed call to 9966044425 from your registered mobile, or SMS \"EPFOHO UAN\" to 7738299899.", "<strong>बैलेंस:</strong> रजिस्टर्ड मोबाइल से 9966044425 पर मिस्ड कॉल दें, या 7738299899 पर \"EPFOHO UAN HIN\" SMS करें।")}</li>
<li>{t(lang, "<strong>Withdrawal:</strong> partial withdrawals are allowed for housing, illness, education and marriage; the full balance is paid on retirement or after you stop working. Withdrawal before 5 years of continuous service is taxable.", "<strong>निकासी:</strong> मकान, बीमारी, पढ़ाई और शादी के लिए आंशिक निकासी की अनुमति है; रिटायरमेंट या काम छोड़ने के बाद पूरा बैलेंस मिलता है। 5 साल की लगातार सेवा से पहले निकासी टैक्सेबल है।")}</li>
<li>{t(lang, "<strong>VPF:</strong> ask your employer to deduct more than 12%. It earns the EPF rate and counts towards the ₹2.5 lakh tax-free interest limit.", "<strong>VPF:</strong> नियोक्ता से 12% से ज़्यादा काटने को कहें। इस पर EPF वाली दर मिलती है और यह ₹2.5 लाख की टैक्स-फ़्री ब्याज सीमा में गिना जाता है।")}</li>
</ul>
{links(lang, [PF_LINKS[0]] + PF_LINKS[2:] + [("PSU salary (IDA) calculator", "PSU वेतन (IDA) कैलकुलेटर", "tools/psu-salary-calculator-ida/")])}"""
    faqs = [
        (t(lang, "What is the Employees' Provident Fund?", "कर्मचारी भविष्य निधि क्या है?"),
         t(lang, "EPF is a retirement savings scheme run by the EPFO. 12% of your basic pay + DA is deducted each month and your employer adds 12%; part of the employer's share goes to the EPS-95 pension and the rest earns interest in your EPF account.", "EPF, EPFO द्वारा चलाई जाने वाली रिटायरमेंट बचत योजना है। हर महीने बेसिक + DA का 12% कटता है और नियोक्ता 12% जोड़ता है; नियोक्ता के हिस्से का भाग EPS-95 पेंशन में जाता है और बाकी EPF खाते में ब्याज कमाता है।")),
        (t(lang, "What is the EPF interest rate for 2025-26?", "2025-26 के लिए EPF ब्याज दर क्या है?"),
         t(lang, f"{EPF_RATE}%, the same as 2023-24 and 2024-25. The EPFO board decided it on 2 March 2026 and the government ratified it in June 2026.", f"{EPF_RATE}%, 2023-24 और 2024-25 जैसी ही। EPFO बोर्ड ने 2 मार्च 2026 को तय किया और सरकार ने जून 2026 में पुष्टि की।")),
        (t(lang, "What is the new EPF wage ceiling?", "नई EPF वेतन सीमा क्या है?"),
         t(lang, "₹25,000 a month from 17 September 2026, up from ₹15,000. Employees earning up to ₹25,000 must be covered, and the employer's EPS share can now be up to ₹2,083 a month.", "17 सितंबर 2026 से ₹25,000 महीना, पहले ₹15,000 थी। ₹25,000 तक कमाने वालों का कवर होना अनिवार्य है, और नियोक्ता का EPS हिस्सा अब ₹2,083 महीने तक हो सकता है।")),
        (t(lang, "How much PF is deducted from a ₹20,000 salary?", "₹20,000 वेतन पर कितना PF कटता है?"),
         t(lang, "If ₹20,000 is your basic + DA, ₹2,400 (12%) is deducted from your pay. Your employer also pays ₹2,400: ₹1,666 to EPS pension and ₹734 to your EPF account.", "अगर ₹20,000 आपकी बेसिक + DA है, तो वेतन से ₹2,400 (12%) कटता है। नियोक्ता भी ₹2,400 देता है: ₹1,666 EPS पेंशन में और ₹734 आपके EPF खाते में।")),
        (t(lang, "How do I check my PF balance?", "PF बैलेंस कैसे चेक करें?"),
         t(lang, "Log in with your UAN on the EPFO member portal or UMANG app, give a missed call to 9966044425, or SMS \"EPFOHO UAN\" to 7738299899 from your registered mobile.", "EPFO मेंबर पोर्टल या UMANG ऐप पर UAN से लॉगिन करें, 9966044425 पर मिस्ड कॉल दें, या रजिस्टर्ड मोबाइल से 7738299899 पर \"EPFOHO UAN HIN\" SMS करें।")),
    ]
    return body, faqs


# ---------------------------------------------------------------------------
# Earned leave and leave encashment (CCS Leave Rules)
# ---------------------------------------------------------------------------

def leave(lang):
    kinds = [
        [t(lang, "Earned leave (EL)", "अर्जित अवकाश (EL)"), t(lang, "30 days a year: 15 on 1 January, 15 on 1 July", "साल में 30 दिन: 1 जनवरी को 15, 1 जुलाई को 15"), t(lang, "Up to 300 days; full pay", "300 दिन तक; पूरा वेतन")],
        [t(lang, "Half pay leave (HPL)", "अर्धवेतन अवकाश (HPL)"), t(lang, "20 days a year: 10 + 10", "साल में 20 दिन: 10 + 10"), t(lang, "No limit; half pay", "कोई सीमा नहीं; आधा वेतन")],
        [t(lang, "Commuted leave", "परिवर्तित अवकाश"), t(lang, "Taken from HPL on medical grounds", "मेडिकल आधार पर HPL से"), t(lang, "Full pay; 2 days of HPL per day", "पूरा वेतन; हर दिन पर 2 दिन HPL")],
        [t(lang, "Casual leave (CL)", "आकस्मिक अवकाश (CL)"), t(lang, "8 days a year, plus 2 restricted holidays", "साल में 8 दिन, साथ में 2 प्रतिबंधित अवकाश"), t(lang, "Lapses on 31 December", "31 दिसंबर को समाप्त")],
        [t(lang, "Extraordinary leave (EOL)", "असाधारण अवकाश (EOL)"), t(lang, "When no other leave is due", "जब कोई और छुट्टी बाकी न हो"), t(lang, "No pay", "वेतन नहीं")],
        [t(lang, "Maternity / paternity", "मातृत्व / पितृत्व"), t(lang, "180 days / 15 days", "180 दिन / 15 दिन"), t(lang, "Full pay", "पूरा वेतन")],
        [t(lang, "Child care leave (CCL)", "चाइल्ड केयर लीव (CCL)"), t(lang, "730 days in the whole service", "पूरी सेवा में 730 दिन"), t(lang, "100% for 365 days, then 80%", "365 दिन 100%, फिर 80%")],
    ]
    enc = []
    for basic in (40000, 80000, 150000):
        day = basic * (1 + DA_NOW / 100) / 30
        enc.append([inr(basic), inr(basic * (1 + DA_NOW / 100)), inr(day), inr(day * 300)])
    enc_head = [t(lang, "Basic pay at retirement", "रिटायरमेंट पर बेसिक"), t(lang, f"Basic + DA {DA_NOW}%", f"बेसिक + {DA_NOW}% DA"),
                t(lang, "Value of 1 day", "1 दिन का मूल्य"), t(lang, "300 days encashed", "300 दिन का नकदीकरण")]
    letter = t(
        lang,
        "To<br>The [Head of Office / Section Officer],<br>[Office name]<br><br>Subject: Application for earned leave<br><br>Sir/Madam,<br>I request earned leave for [number] days from [date] to [date] for [reason, e.g. family function / personal work]. I have enough earned leave in my account. I may also be allowed to prefix/suffix [holidays, if any]. My work will be looked after by [colleague's name] during my absence, and I can be reached at [phone].<br><br>Yours faithfully,<br>[Name], [Designation]<br>[Date]",
        "सेवा में<br>[कार्यालय प्रमुख / अनुभाग अधिकारी],<br>[कार्यालय का नाम]<br><br>विषय: अर्जित अवकाश हेतु आवेदन<br><br>महोदय/महोदया,<br>निवेदन है कि मुझे [कारण, जैसे पारिवारिक कार्यक्रम / निजी कार्य] के लिए [तारीख] से [तारीख] तक [संख्या] दिन का अर्जित अवकाश स्वीकृत करने की कृपा करें। मेरे खाते में पर्याप्त अर्जित अवकाश शेष है। कृपया [अवकाश के दिन, यदि हों] को आगे/पीछे जोड़ने की अनुमति भी दें। मेरी अनुपस्थिति में मेरा कार्य [सहकर्मी का नाम] देखेंगे, और मुझसे [फ़ोन] पर संपर्क किया जा सकता है।<br><br>भवदीय,<br>[नाम], [पदनाम]<br>[तारीख]")
    body = f"""<h2>{t(lang, "What is earned leave?", "अर्जित अवकाश (Earned Leave) क्या है?")}</h2>
<p>{t(lang, "Earned leave (EL) is paid leave you earn by working. In Hindi it is <em>arjit avkash</em> (अर्जित अवकाश); in private companies it is often called privilege leave (PL) or annual leave. You get your full salary while on earned leave, unused days carry forward, and whatever is left when you retire is paid out in cash (leave encashment).", "अर्जित अवकाश (EL) वह सवेतन छुट्टी है जो आप काम करके कमाते हैं। प्राइवेट कंपनियों में इसे अक्सर प्रिविलेज लीव (PL) या वार्षिक अवकाश कहते हैं। अर्जित अवकाश में पूरा वेतन मिलता है, न ली गई छुट्टियाँ आगे जुड़ती रहती हैं, और रिटायरमेंट पर बची छुट्टियों का नकद भुगतान होता है (छुट्टी नकदीकरण)।")}</p>
<h2>{t(lang, "Leave for central government employees (CCS Leave Rules)", "केंद्रीय कर्मचारियों की छुट्टियाँ (CCS अवकाश नियम)")}</h2>
{table([t(lang, "Leave", "छुट्टी"), t(lang, "How much", "कितनी"), t(lang, "Limit and pay", "सीमा और वेतन")], kinds, wrap=True)}
<h2>{t(lang, "Earned leave rules", "अर्जित अवकाश के नियम")}</h2>
<ul>
<li>{t(lang, "EL is credited in advance, 15 days on 1 January and 15 days on 1 July. In the half-year you join, you get 2.5 days for each completed month.", "EL पहले से जुड़ता है, 1 जनवरी को 15 और 1 जुलाई को 15 दिन। जिस छमाही में भर्ती हों, उसमें हर पूरे महीने के 2.5 दिन मिलते हैं।")}</li>
<li>{t(lang, "You can hold up to 300 days. Days above 300 on 1 January or 1 July are kept aside and lapse if not used in that half-year.", "अधिकतम 300 दिन जमा रह सकते हैं। 1 जनवरी या 1 जुलाई को 300 से ऊपर के दिन अलग रखे जाते हैं और उस छमाही में न लेने पर समाप्त हो जाते हैं।")}</li>
<li>{t(lang, "You can take up to 180 days of EL at a time.", "एक बार में 180 दिन तक EL ले सकते हैं।")}</li>
<li>{t(lang, "Extraordinary leave or unauthorised absence cuts the next credit by one tenth of those days, up to 15 days.", "असाधारण अवकाश या अनधिकृत अनुपस्थिति पर अगले क्रेडिट से उन दिनों का दसवाँ हिस्सा, अधिकतम 15 दिन, कटता है।")}</li>
<li>{t(lang, "With LTC you can encash 10 days of EL at a time, 60 days in your whole service; this does not reduce the 300 days at retirement.", "LTC के साथ एक बार में 10 दिन EL का नकदीकरण कर सकते हैं, पूरी सेवा में 60 दिन; इससे रिटायरमेंट के 300 दिन कम नहीं होते।")}</li>
<li>{t(lang, "Leave cannot be claimed as of right: your office can refuse or recall you for work. But it cannot change the kind of leave you applied for without your request.", "छुट्टी अधिकार के रूप में नहीं माँगी जा सकती: कार्यालय मना कर सकता है या काम के लिए वापस बुला सकता है। लेकिन आपके अनुरोध के बिना आपकी माँगी छुट्टी का प्रकार नहीं बदल सकता।")}</li>
</ul>
<h2>{t(lang, "Leave encashment at retirement", "रिटायरमेंट पर छुट्टी नकदीकरण")}</h2>
<p>{t(lang, f"At retirement you are paid for unused EL, and HPL if EL is under 300 days, up to 300 days in all. One day of EL is worth (basic pay + DA) ÷ 30; one day of HPL is worth half that. With DA at {DA_NOW}%:", f"रिटायरमेंट पर न ली गई EL का, और EL 300 से कम हो तो HPL का भी, कुल 300 दिन तक भुगतान होता है। एक दिन EL का मूल्य (बेसिक पे + DA) ÷ 30 है; एक दिन HPL का इसका आधा। {DA_NOW}% DA पर:")}</p>
{table(enc_head, enc, (1, 2, 3))}
<p>{t(lang, "Leave encashment at retirement is fully tax-free for central and state government employees. For others it is tax-free up to ₹25 lakh in the whole career.", "केंद्र और राज्य सरकार के कर्मचारियों के लिए रिटायरमेंट पर छुट्टी नकदीकरण पूरी तरह टैक्स-फ़्री है। बाकी के लिए पूरे करियर में ₹25 लाख तक टैक्स-फ़्री है।")}</p>
<h2>{t(lang, "Earned leave in private companies", "प्राइवेट कंपनियों में अर्जित अवकाश")}</h2>
<p>{t(lang, "Factories and many establishments follow the labour codes: one day of earned leave for every 20 days worked, once you have worked 180 days in the year. Shops and offices follow their state's Shops and Establishments Act, usually 12 to 18 days a year. Your appointment letter or HR policy may give more.", "कारख़ाने और कई संस्थान श्रम संहिताओं का पालन करते हैं: साल में 180 दिन काम करने के बाद हर 20 दिन काम पर एक दिन अर्जित अवकाश। दुकानें और दफ़्तर अपने राज्य के शॉप्स एंड एस्टैब्लिशमेंट एक्ट का पालन करते हैं, आमतौर पर साल में 12 से 18 दिन। आपके नियुक्ति पत्र या HR नीति में इससे ज़्यादा हो सकती है।")}</p>
<h2>{t(lang, "Earned leave application format", "अर्जित अवकाश आवेदन का प्रारूप")}</h2>
<p class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">{letter}</p>
{links(lang, LEAVE_LINKS[1:])}"""
    faqs = [
        (t(lang, "What is earned leave?", "अर्जित अवकाश क्या है?"),
         t(lang, "Earned leave is paid leave you earn for time worked; private companies often call it privilege leave. Central government employees get 30 days a year, credited 15 days on 1 January and 15 on 1 July, and can keep up to 300 days.", "अर्जित अवकाश काम के समय के बदले कमाई गई सवेतन छुट्टी है; प्राइवेट कंपनियों में इसे अक्सर प्रिविलेज लीव कहते हैं। केंद्रीय कर्मचारियों को साल में 30 दिन मिलते हैं, 1 जनवरी और 1 जुलाई को 15-15 दिन, और 300 दिन तक जमा रख सकते हैं।")),
        (t(lang, "What is earned leave called in Hindi?", "Earned leave को हिंदी में क्या कहते हैं?"),
         t(lang, "Arjit avkash (अर्जित अवकाश). Half pay leave is ardh vetan avkash and casual leave is aakasmik avkash.", "अर्जित अवकाश। हाफ पे लीव को अर्धवेतन अवकाश और कैज़ुअल लीव को आकस्मिक अवकाश कहते हैं।")),
        (t(lang, "How is leave encashment calculated?", "छुट्टी नकदीकरण कैसे गिना जाता है?"),
         t(lang, f"(Basic pay + DA) ÷ 30 × days of earned leave, up to 300 days. With basic pay of ₹80,000 and DA at {DA_NOW}%, 300 days come to {enc[1][3]}.", f"(बेसिक पे + DA) ÷ 30 × अर्जित अवकाश के दिन, 300 दिन तक। ₹80,000 बेसिक और {DA_NOW}% DA पर 300 दिन का मूल्य {enc[1][3]} होता है।")),
        (t(lang, "Can my office refuse earned leave or tell me to use it?", "क्या कार्यालय अर्जित अवकाश मना कर सकता है या लेने को कह सकता है?"),
         t(lang, "In government service leave cannot be claimed as a right, so it can be refused or cut short in the public interest. But the office cannot change the kind of leave you applied for unless you ask. In private jobs it depends on the labour codes and your company's policy.", "सरकारी सेवा में छुट्टी अधिकार के रूप में नहीं माँगी जा सकती, इसलिए जनहित में मना या कम की जा सकती है। लेकिन आपके कहे बिना कार्यालय आपकी माँगी छुट्टी का प्रकार नहीं बदल सकता। प्राइवेट नौकरी में यह श्रम संहिता और कंपनी की नीति पर निर्भर है।")),
        (t(lang, "Is there bereavement leave for government employees?", "क्या सरकारी कर्मचारियों के लिए शोक अवकाश होता है?"),
         t(lang, "The CCS Leave Rules have no separate bereavement leave. Central government employees use casual leave or earned leave after a death in the family. Many private companies give 3 to 5 days of bereavement leave under their own policy.", "CCS अवकाश नियमों में अलग शोक अवकाश नहीं है। परिवार में मृत्यु पर केंद्रीय कर्मचारी आकस्मिक या अर्जित अवकाश लेते हैं। कई प्राइवेट कंपनियाँ अपनी नीति के तहत 3 से 5 दिन का शोक अवकाश देती हैं।")),
    ]
    return body, faqs


# ---------------------------------------------------------------------------
# Maternity, paternity and child care leave
# ---------------------------------------------------------------------------

def family_leave(lang):
    rows = [
        [t(lang, "Maternity leave", "मातृत्व अवकाश"), t(lang, "180 days, full pay", "180 दिन, पूरा वेतन"), t(lang, "Women with fewer than 2 surviving children; also for surrogacy", "2 से कम जीवित बच्चों वाली महिलाएँ; सरोगेसी में भी")],
        [t(lang, "Miscarriage / abortion", "गर्भपात"), t(lang, "Up to 45 days in the whole service", "पूरी सेवा में 45 दिन तक"), t(lang, "On a medical certificate", "मेडिकल प्रमाणपत्र पर")],
        [t(lang, "Paternity leave", "पितृत्व अवकाश"), t(lang, "15 days, full pay", "15 दिन, पूरा वेतन"), t(lang, "Within 6 months of the birth; fewer than 2 surviving children", "जन्म के 6 महीने के भीतर; 2 से कम जीवित बच्चे")],
        [t(lang, "Child adoption leave", "बाल दत्तक ग्रहण अवकाश"), t(lang, "180 days, full pay", "180 दिन, पूरा वेतन"), t(lang, "Adopting a child under 1 year", "1 साल से छोटा बच्चा गोद लेने पर")],
        [t(lang, "Child care leave (CCL)", "चाइल्ड केयर लीव (CCL)"), t(lang, "730 days in the whole service", "पूरी सेवा में 730 दिन"), t(lang, "Women, and single fathers; 2 eldest children under 18", "महिलाएँ और एकल पिता; 18 साल से छोटे 2 बड़े बच्चे")],
    ]
    body = f"""<h2>{t(lang, "Maternity, paternity and child care leave for government employees", "सरकारी कर्मचारियों के लिए मातृत्व, पितृत्व और चाइल्ड केयर लीव")}</h2>
{table([t(lang, "Leave", "छुट्टी"), t(lang, "How much", "कितनी"), t(lang, "Who gets it", "किसे मिलती है")], rows, wrap=True)}
<p class="{NOTE}">{t(lang, "Central government rules (CCS Leave Rules 1972, as amended up to 2024). Most states have the same or similar rules.", "केंद्र सरकार के नियम (CCS अवकाश नियम 1972, 2024 तक के संशोधन सहित)। ज़्यादातर राज्यों में ऐसे ही या मिलते-जुलते नियम हैं।")}</p>
<h2>{t(lang, "Maternity leave", "मातृत्व अवकाश")}</h2>
<p>{t(lang, "Government employees get 180 days of maternity leave on full pay, for up to two children. It does not come out of your leave account, and you can join it with earned leave or child care leave. Since 2024 it also covers surrogacy: the surrogate and the commissioning mother each get 180 days, and the commissioning father gets 15 days of paternity leave.", "सरकारी कर्मचारियों को दो बच्चों तक पूरे वेतन पर 180 दिन का मातृत्व अवकाश मिलता है। यह आपके छुट्टी खाते से नहीं कटता, और इसे अर्जित अवकाश या चाइल्ड केयर लीव के साथ जोड़ सकते हैं। 2024 से यह सरोगेसी पर भी लागू है: सरोगेट और कमीशनिंग माँ दोनों को 180 दिन, और कमीशनिंग पिता को 15 दिन का पितृत्व अवकाश।")}</p>
<p>{t(lang, "In private companies the Maternity Benefit Act (now part of the Social Security Code) gives 26 weeks of paid leave for the first two children and 12 weeks for the third; adopting mothers of a baby under 3 months also get 12 weeks.", "प्राइवेट कंपनियों में मातृत्व लाभ अधिनियम (अब सामाजिक सुरक्षा संहिता का हिस्सा) पहले दो बच्चों के लिए 26 हफ़्ते और तीसरे के लिए 12 हफ़्ते का सवेतन अवकाश देता है; 3 महीने से छोटा बच्चा गोद लेने वाली माँ को भी 12 हफ़्ते मिलते हैं।")}</p>
<h2>{t(lang, "Paternity leave", "पितृत्व अवकाश")}</h2>
<p>{t(lang, "A male government employee with fewer than two surviving children gets 15 days of paternity leave on full pay, from 15 days before to 6 months after the birth. If not taken in that time, it lapses. Private-sector paternity leave depends on the company; there is no law requiring it.", "दो से कम जीवित बच्चों वाले पुरुष सरकारी कर्मचारी को पूरे वेतन पर 15 दिन का पितृत्व अवकाश मिलता है, जन्म से 15 दिन पहले से 6 महीने बाद तक। इस बीच न लेने पर यह समाप्त हो जाता है। प्राइवेट कंपनियों में यह कंपनी पर निर्भर है; कोई क़ानूनी बाध्यता नहीं है।")}</p>
<h2>{t(lang, "Child care leave (CCL)", "चाइल्ड केयर लीव (CCL)")}</h2>
<ul>
<li>{t(lang, "730 days in the whole service, to look after your two eldest children up to age 18 (no age limit for a child with a disability).", "पूरी सेवा में 730 दिन, अपने दो बड़े बच्चों की 18 साल तक देखभाल के लिए (दिव्यांग बच्चे के लिए आयु सीमा नहीं)।")}</li>
<li>{t(lang, "Paid at 100% of leave salary for the first 365 days and 80% for the next 365 days.", "पहले 365 दिन 100% अवकाश वेतन, अगले 365 दिन 80%।")}</li>
<li>{t(lang, "For women employees and single male employees (unmarried, widowed or divorced fathers).", "महिला कर्मचारियों और एकल पुरुष कर्मचारियों (अविवाहित, विधुर या तलाक़शुदा पिता) के लिए।")}</li>
<li>{t(lang, "At least 5 days at a time; up to 3 spells a year (6 for single women).", "एक बार में कम से कम 5 दिन; साल में 3 बार तक (एकल महिलाओं के लिए 6)।")}</li>
</ul>
{links(lang, [LEAVE_LINKS[0], LEAVE_LINKS[2]])}"""
    faqs = [
        (t(lang, "How many days of maternity leave do government employees get?", "सरकारी कर्मचारियों को कितने दिन का मातृत्व अवकाश मिलता है?"),
         t(lang, "180 days on full pay for women with fewer than two surviving children. Private-sector employees get 26 weeks under the Maternity Benefit Act (12 weeks from the third child).", "दो से कम जीवित बच्चों वाली महिलाओं को पूरे वेतन पर 180 दिन। प्राइवेट कर्मचारियों को मातृत्व लाभ अधिनियम के तहत 26 हफ़्ते (तीसरे बच्चे से 12 हफ़्ते)।")),
        (t(lang, "How many days of paternity leave do government employees get?", "सरकारी कर्मचारियों को कितने दिन का पितृत्व अवकाश मिलता है?"),
         t(lang, "15 days on full pay, to be taken within 6 months of the birth (or adoption), for men with fewer than two surviving children.", "दो से कम जीवित बच्चों वाले पुरुषों को पूरे वेतन पर 15 दिन, जन्म (या गोद लेने) के 6 महीने के भीतर।")),
        (t(lang, "Is child care leave paid?", "क्या चाइल्ड केयर लीव सवेतन है?"),
         t(lang, "Yes. The first 365 days are paid at 100% of leave salary and the next 365 days at 80%, out of 730 days in the whole service.", "हाँ। पूरी सेवा के 730 दिनों में से पहले 365 दिन 100% अवकाश वेतन पर और अगले 365 दिन 80% पर।")),
        (t(lang, "Can fathers take child care leave?", "क्या पिता चाइल्ड केयर लीव ले सकते हैं?"),
         t(lang, "Only single fathers: male employees who are unmarried, widowed or divorced. Other fathers get 15 days of paternity leave.", "केवल एकल पिता: अविवाहित, विधुर या तलाक़शुदा पुरुष कर्मचारी। बाकी पिताओं को 15 दिन का पितृत्व अवकाश मिलता है।")),
    ]
    return body, faqs


GUIDES = {
    "gpf_calculator": gpf,
    "vpf_epf_calculator": epf,
    "leave_rules_guide": leave,
    "ccl_maternity_leave": family_leave,
}

SEO = {
    "gpf_calculator": {
        "title": ("What Is Provident Fund? GPF Calculator 2026 (7.1%)", "प्रोविडेंट फंड क्या है? GPF कैलकुलेटर 2026 (7.1%)"),
        "description": ("Provident fund meaning, EPF vs VPF vs GPF vs PPF, and a GPF calculator at 7.1% interest (Oct–Dec 2026) with advance and withdrawal limits.",
                        "प्रोविडेंट फंड (भविष्य निधि) का अर्थ, EPF, VPF, GPF और PPF में अंतर, और 7.1% ब्याज (अक्टूबर–दिसंबर 2026) पर GPF कैलकुलेटर।")},
    "vpf_epf_calculator": {
        "title": ("EPF Calculator 2026: 8.25% Interest & New ₹25,000 Limit", "EPF कैलकुलेटर 2026: 8.25% ब्याज और नई ₹25,000 सीमा"),
        "description": ("Employees' Provident Fund explained: PF deduction from salary, new ₹25,000 wage ceiling, 8.25% interest for 2025-26, EPS pension and VPF maturity.",
                        "कर्मचारी भविष्य निधि: वेतन से PF कटौती, नई ₹25,000 वेतन सीमा, 2025-26 के लिए 8.25% ब्याज, EPS पेंशन और VPF परिपक्वता।")},
    "leave_rules_guide": {
        "title": ("Earned Leave Rules & Leave Encashment Calculator 2026", "अर्जित अवकाश नियम और छुट्टी नकदीकरण कैलकुलेटर 2026"),
        "description": ("What earned leave is, CCS leave rules (EL 30 days, HPL, CL, 300-day limit), leave encashment at retirement with DA 63%, and a leave application format.",
                        "अर्जित अवकाश क्या है, CCS अवकाश नियम (EL 30 दिन, HPL, CL, 300 दिन सीमा), 63% DA के साथ रिटायरमेंट पर नकदीकरण, और छुट्टी आवेदन का प्रारूप।")},
    "ccl_maternity_leave": {
        "title": ("Maternity, Paternity & Child Care Leave Rules 2026", "मातृत्व, पितृत्व और चाइल्ड केयर लीव नियम 2026"),
        "description": ("Maternity leave (180 days govt, 26 weeks private), paternity leave (15 days), child care leave (730 days, 100% then 80% pay) and a CCL pay calculator.",
                        "मातृत्व अवकाश (सरकारी 180 दिन, प्राइवेट 26 हफ़्ते), पितृत्व अवकाश (15 दिन), चाइल्ड केयर लीव (730 दिन, 100% फिर 80% वेतन) और CCL कैलकुलेटर।")},
}
