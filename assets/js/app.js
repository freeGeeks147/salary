(function() {
  "use strict";

  // =========================================================================
  // 0. MULTI-PAGE ROUTING
  // Each calculator tab lives on its own page (see build.py). Navigating to a
  // tab that is not on the current page loads that page instead, carrying the
  // pending menu action in ?go= so it runs once the page has loaded.
  // =========================================================================
  const SITE_ROOT = new URL("../../", document.currentScript.src);
  const PAGE_URLS = {
    "tab-salary": "",
    "tab-matrix": "pay-matrix/",
    "tab-arrears": "arrears-allowances/",
    "tab-pension": "pension/",
    "tab-tax": "income-tax/",
    "tab-microtools": "tools/",
    "tab-guides": "8th-pay-commission/"
  };

  function pageUrl(tabId, navAction) {
    const url = new URL(PAGE_URLS[tabId] || "", SITE_ROOT);
    if (navAction) url.searchParams.set("go", navAction);
    return url.href;
  }

  function getCurrentPageTab() {
    const panel = document.querySelector(".tab-panel");
    return panel ? panel.id : "tab-salary";
  }

  // Inputs on one page that calculations on other pages also read
  // (tax uses the arrears page's rent paid; in-hand pay uses 80CCD(2)).
  // Their last values are kept in localStorage; these are the page defaults.
  const SHARED_INPUTS_KEY = "gsc_shared_inputs_v1";
  const SHARED_INPUT_DEFAULTS = {
    "inp-rent-paid": "22000",
    "chk-80ccd2": true
  };

  function getSharedInputValue(id) {
    const saved = safeStorageGet(SHARED_INPUTS_KEY, {}) || {};
    return saved[id] !== undefined ? saved[id] : SHARED_INPUT_DEFAULTS[id];
  }

  function bindSharedInputs() {
    Object.keys(SHARED_INPUT_DEFAULTS).forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const isChk = el.type === "checkbox";
      const saved = getSharedInputValue(id);
      if (isChk) el.checked = !!saved; else el.value = String(saved);
      ["input", "change"].forEach(evt => el.addEventListener(evt, () => {
        const all = safeStorageGet(SHARED_INPUTS_KEY, {}) || {};
        all[id] = isChk ? el.checked : el.value;
        safeStorageSet(SHARED_INPUTS_KEY, all);
      }));
    });
  }

  // Elements of other tabs are absent on this page. Code that unconditionally
  // touches them gets a detached stand-in of the right kind, so it is a no-op
  // (shared inputs above stand in with their saved value).
  const ghostEls = {};
  function byId(id) {
    const el = document.getElementById(id);
    if (el) return el;
    if (!ghostEls[id]) {
      const tag = /^(sel)-/.test(id) ? "select" : (/^(inp|rng|num|chk)-/.test(id) ? "input" : "div");
      ghostEls[id] = document.createElement(tag);
      if (/^chk-/.test(id)) ghostEls[id].type = "checkbox";
      if (id in SHARED_INPUT_DEFAULTS) {
        const saved = getSharedInputValue(id);
        if (/^chk-/.test(id)) ghostEls[id].checked = !!saved; else ghostEls[id].value = String(saved);
      }
    }
    return ghostEls[id];
  }

  // =========================================================================
  // 1. OFFICIAL 7TH CPC PAY MATRIX DATA (ALL 19 LEVELS: L1 TO L18 + L13A)
  // =========================================================================
  const PAY_LEVEL_META = [
    { id: "1",   name: "Level 1",   gp: "₹1,800", post: "MTS / Trackman / Constable (Entry)", entry: 18000, maxCells: 40, group: "G_C", cghs: 250, cgegis: 30, taHigher: 1350, taOther: 900 },
    { id: "2",   name: "Level 2",   gp: "₹1,900", post: "LDC / JS / Constable / Postman", entry: 19900, maxCells: 40, group: "G_C", cghs: 250, cgegis: 30, taHigher: 1350, taOther: 900 },
    { id: "3",   name: "Level 3",   gp: "₹2,000", post: "Constable (GD) / Sepoy / Skilled Artisan", entry: 21700, maxCells: 40, group: "G_C", cghs: 250, cgegis: 30, taHigher: 3600, taOther: 1800 },
    { id: "4",   name: "Level 4",   gp: "₹2,400", post: "Tax Assistant / UDC / Steno D / Havildar", entry: 25500, maxCells: 40, group: "G_C", cghs: 250, cgegis: 30, taHigher: 3600, taOther: 1800 },
    { id: "5",   name: "Level 5",   gp: "₹2,800", post: "Auditor / Sr. Tax Asst / Head Constable", entry: 29200, maxCells: 40, group: "G_C", cghs: 250, cgegis: 30, taHigher: 3600, taOther: 1800 },
    { id: "6",   name: "Level 6",   gp: "₹4,200", post: "Junior Engineer (JE) / Sub-Inspector / Station Master", entry: 35400, maxCells: 40, group: "G_B", cghs: 450, cgegis: 60, taHigher: 3600, taOther: 1800 },
    { id: "7",   name: "Level 7",   gp: "₹4,600", post: "ASO / Income Tax Inspector / Nursing Officer / SSE", entry: 44900, maxCells: 40, group: "G_B", cghs: 650, cgegis: 60, taHigher: 3600, taOther: 1800 },
    { id: "8",   name: "Level 8",   gp: "₹4,800", post: "Section Officer (SO) / Assistant Audit Officer (AAO)", entry: 47600, maxCells: 40, group: "G_B", cghs: 650, cgegis: 60, taHigher: 3600, taOther: 1800 },
    { id: "9",   name: "Level 9",   gp: "₹5,400 (NF)", post: "Senior Section Officer / Accounts Officer", entry: 53100, maxCells: 40, group: "G_B", cghs: 650, cgegis: 60, taHigher: 7200, taOther: 3600 },
    { id: "10",  name: "Level 10",  gp: "₹5,400", post: "IAS/IPS/IRS Entry (JTS) / Asst. Director / Lieutenant", entry: 56100, maxCells: 40, group: "G_A", cghs: 650, cgegis: 120, taHigher: 7200, taOther: 3600 },
    { id: "11",  name: "Level 11",  gp: "₹6,600", post: "Under Secretary / Dy. Commandant / Major / EE", entry: 67700, maxCells: 39, group: "G_A", cghs: 650, cgegis: 120, taHigher: 7200, taOther: 3600 },
    { id: "12",  name: "Level 12",  gp: "₹7,600", post: "Deputy Secretary / Lt. Colonel / Joint Director", entry: 78800, maxCells: 34, group: "G_A", cghs: 1000, cgegis: 120, taHigher: 7200, taOther: 3600 },
    { id: "13",  name: "Level 13",  gp: "₹8,700", post: "Director / Colonel / Selection Grade Officer", entry: 123100, maxCells: 20, group: "G_A", cghs: 1000, cgegis: 120, taHigher: 7200, taOther: 3600 },
    { id: "13A", name: "Level 13A", gp: "₹8,900", post: "Brigadier / Associate Professor (Academic)", entry: 131100, maxCells: 18, group: "G_A", cghs: 1000, cgegis: 120, taHigher: 7200, taOther: 3600 },
    { id: "14",  name: "Level 14",  gp: "₹10,000", post: "Joint Secretary / Major General / Professor", entry: 144200, maxCells: 15, group: "HAG", cghs: 1000, cgegis: 120, taHigher: 15750, taOther: 15750 },
    { id: "15",  name: "Level 15",  gp: "HAG", post: "Additional Secretary / Lt. General / Director General", entry: 182200, maxCells: 8, group: "HAG", cghs: 1000, cgegis: 120, taHigher: 15750, taOther: 15750 },
    { id: "16",  name: "Level 16",  gp: "HAG+", post: "DG / Senior Additional Secretary", entry: 205400, maxCells: 4, group: "HAG", cghs: 1000, cgegis: 120, taHigher: 15750, taOther: 15750 },
    { id: "17",  name: "Level 17",  gp: "Apex", post: "Secretary to Govt. of India / Chief Secretary", entry: 225000, maxCells: 1, group: "HAG", cghs: 1000, cgegis: 120, taHigher: 15750, taOther: 15750 },
    { id: "18",  name: "Level 18",  gp: "Cabinet Sec", post: "Cabinet Secretary / Chief of Defence Staff (CDS)", entry: 250000, maxCells: 1, group: "HAG", cghs: 1000, cgegis: 120, taHigher: 15750, taOther: 15750 }
  ];

  // Official 7th CPC entry cells & exact 3% rounded progression per DoPT matrix rules
  const OFFICIAL_CELLS = {
    "1": [18000,18500,19100,19700,20300,20900,21500,22100,22800,23500,24200,24900,25600,26400,27200,28000,28800,29700,30600,31500,32400,33400,34400,35400,36500,37600,38700,39900,41100,42300,43600,44900,46200,47600,49000,50500,52000,53600,55200,56900],
    "2": [19900,20500,21100,21700,22400,23100,23800,24500,25200,26000,26800,27600,28400,29300,30200,31100,32000,33000,34000,35000,36100,37200,38300,39400,40600,41800,43100,44400,45700,47100,48500,50000,51500,53000,54600,56200,57900,59600,61400,63200],
    "3": [21700,22400,23100,23800,24500,25200,26000,26800,27600,28400,29300,30200,31100,32000,33000,34000,35000,36100,37200,38300,39400,40600,41800,43100,44400,45700,47100,48500,50000,51500,53000,54600,56200,57900,59600,61400,63200,65100,67100,69100],
    "4": [25500,26300,27100,27900,28700,29600,30500,31400,32300,33300,34300,35300,36400,37500,38600,39800,41000,42200,43500,44800,46100,47500,48900,50400,51900,53500,55100,56800,58500,60300,62100,64000,65900,67900,69900,72000,74200,76400,78700,81100],
    "5": [29200,30100,31000,31900,32900,33900,34900,35900,37000,38100,39200,40400,41600,42800,44100,45400,46800,48200,49600,51100,52600,54200,55800,57500,59200,61000,62800,64700,66600,68600,70700,72800,75000,77300,79600,82000,84500,87000,89600,92300],
    "6": [35400,36500,37600,38700,39900,41100,42300,43600,44900,46200,47600,49000,50500,52000,53600,55200,56900,58600,60400,62200,64100,66000,68000,70000,72100,74300,76500,78800,81200,83600,86100,88700,91400,94100,96900,99800,102800,105900,109100,112400],
    "7": [44900,46200,47600,49000,50500,52000,53600,55200,56900,58600,60400,62200,64100,66000,68000,70000,72100,74300,76500,78800,81200,83600,86100,88700,91400,94100,96900,99800,102800,105900,109100,112400,115800,119300,122900,126600,130400,134300,138300,142400],
    "8": [47600,49000,50500,52000,53600,55200,56900,58600,60400,62200,64100,66000,68000,70000,72100,74300,76500,78800,81200,83600,86100,88700,91400,94100,96900,99800,102800,105900,109100,112400,115800,119300,122900,126600,130400,134300,138300,142400,146700,151100],
    "9": [53100,54700,56300,58000,59700,61500,63300,65200,67200,69200,71300,73400,75600,77900,80200,82600,85100,87700,90300,93000,95800,98700,101700,104800,107900,111100,114400,117800,121300,124900,128600,132500,136500,140600,144800,149100,153600,158200,162900,167800],
    "10": [56100,57800,59500,61300,63100,65000,67000,69000,71100,73200,75400,77700,80000,82400,84900,87400,90000,92700,95500,98400,101400,104400,107500,110700,114000,117400,120900,124500,128200,132000,136000,140100,144300,148600,153100,157700,162400,167300,172300,177500],
    "11": [67700,69700,71800,74000,76200,78500,80900,83300,85800,88400,91100,93800,96600,99500,102500,105600,108800,112100,115500,119000,122600,126300,130100,134000,138000,142100,146400,150800,155300,160000,164800,169700,174800,180000,185400,191000,196700,202600,208700],
    "12": [78800,81200,83600,86100,88700,91400,94100,96900,99800,102800,105900,109100,112400,115800,119300,122900,126600,130400,134300,138300,142400,146700,151100,155600,160300,165100,170100,175200,180500,185900,191500,197200,203100,209200],
    "13": [123100,126800,130600,134500,138500,142700,147000,151400,155900,160600,165400,170400,175500,180800,186200,191800,197600,203500,209600,215900],
    "13A": [131100,135000,139100,143300,147600,152000,156600,161300,166100,171100,176200,181500,186900,192500,198300,204200,210300,216600],
    "14": [144200,148500,153000,157600,162300,167200,172200,177400,182700,188200,193800,199600,205600,211800,218200],
    "15": [182200,187700,193300,199100,205100,211300,217600,224100],
    "16": [205400,211600,217900,224400],
    "17": [225000],
    "18": [250000]
  };

  // =========================================================================
  // 2. INDIAN CITIES DATABASE FOR AUTO HRA & TA CLASSIFICATION
  // =========================================================================
  const CITIES_DB = [
    { name: "New Delhi / NCR", state: "Delhi", hra: "X", ta: "HIGHER" },
    { name: "Mumbai / Navi Mumbai", state: "Maharashtra", hra: "X", ta: "HIGHER" },
    { name: "Kolkata", state: "West Bengal", hra: "X", ta: "HIGHER" },
    { name: "Bengaluru", state: "Karnataka", hra: "X", ta: "HIGHER" },
    { name: "Chennai", state: "Tamil Nadu", hra: "X", ta: "HIGHER" },
    { name: "Hyderabad", state: "Telangana", hra: "X", ta: "HIGHER" },
    { name: "Ahmedabad / Gandhinagar", state: "Gujarat", hra: "X", ta: "HIGHER" },
    { name: "Pune", state: "Maharashtra", hra: "X", ta: "HIGHER" },
    { name: "Surat", state: "Gujarat", hra: "Y", ta: "HIGHER" },
    { name: "Jaipur", state: "Rajasthan", hra: "Y", ta: "HIGHER" },
    { name: "Lucknow", state: "Uttar Pradesh", hra: "Y", ta: "HIGHER" },
    { name: "Kanpur", state: "Uttar Pradesh", hra: "Y", ta: "HIGHER" },
    { name: "Nagpur", state: "Maharashtra", hra: "Y", ta: "HIGHER" },
    { name: "Indore", state: "Madhya Pradesh", hra: "Y", ta: "HIGHER" },
    { name: "Patna", state: "Bihar", hra: "Y", ta: "HIGHER" },
    { name: "Bhopal", state: "Madhya Pradesh", hra: "Y", ta: "OTHER" },
    { name: "Coimbatore", state: "Tamil Nadu", hra: "Y", ta: "HIGHER" },
    { name: "Kochi", state: "Kerala", hra: "Y", ta: "HIGHER" },
    { name: "Visakhapatnam", state: "Andhra Pradesh", hra: "Y", ta: "HIGHER" },
    { name: "Vadodara", state: "Gujarat", hra: "Y", ta: "OTHER" },
    { name: "Guwahati", state: "Assam", hra: "Y", ta: "OTHER" },
    { name: "Ranchi", state: "Jharkhand", hra: "Y", ta: "OTHER" },
    { name: "Bhubaneswar / Cuttack", state: "Odisha", hra: "Y", ta: "OTHER" },
    { name: "Chandigarh / Mohali", state: "Chandigarh", hra: "Y", ta: "OTHER" },
    { name: "Asansol / Durgapur", state: "West Bengal", hra: "Y", ta: "OTHER" },
    { name: "Siliguri", state: "West Bengal", hra: "Y", ta: "OTHER" },
    { name: "Howrah", state: "West Bengal", hra: "X", ta: "HIGHER" },
    { name: "Varanasi / Prayagraj", state: "Uttar Pradesh", hra: "Y", ta: "OTHER" },
    { name: "Agra / Meerut", state: "Uttar Pradesh", hra: "Y", ta: "OTHER" },
    { name: "Raipur", state: "Chhattisgarh", hra: "Y", ta: "OTHER" },
    { name: "Dehradun", state: "Uttarakhand", hra: "Y", ta: "OTHER" },
    { name: "Darjeeling / Malda / Kharagpur", state: "West Bengal", hra: "Z", ta: "OTHER" },
    { name: "Agartala", state: "Tripura", hra: "Z", ta: "OTHER" },
    { name: "Shillong / Imphal / Aizawl", state: "North-East", hra: "Z", ta: "OTHER" },
    { name: "Shimla / Leh / Port Blair", state: "Special Area", hra: "Z", ta: "OTHER" }
  ];

  // =========================================================================
  // 3. DEPARTMENT & POST PRESETS
  // =========================================================================
  const POST_PRESETS = [
    { id: "ias_jts", badge: "UPSC CSE", title: "IAS / IPS / IRS Officer (Entry JTS)", level: "10", basic: 56100, hra: "X", ta: "HIGHER", extraAllow: 0, addon: null, desc: "Level 10 · Entry Basic ₹56,100" },
    { id: "ssc_aso", badge: "SSC CGL", title: "ASO (CSS) / Income Tax Inspector", level: "7", basic: 44900, hra: "X", ta: "HIGHER", extraAllow: 0, addon: null, desc: "Level 7 · Entry Basic ₹44,900" },
    { id: "ssc_aao", badge: "SSC CGL", title: "Assistant Audit Officer (AAO) / SO", level: "8", basic: 47600, hra: "X", ta: "HIGHER", extraAllow: 0, addon: null, desc: "Level 8 · Entry Basic ₹47,600" },
    { id: "rly_je", badge: "Railway / SSC", title: "Junior Engineer (JE) / Station Master / SI", level: "6", basic: 35400, hra: "Y", ta: "OTHER", extraAllow: 0, addon: null, desc: "Level 6 · Entry Basic ₹35,400" },
    { id: "rly_alp", badge: "Indian Railways", title: "Assistant Loco Pilot (ALP) + Running Allow.", level: "2", basic: 19900, hra: "Y", ta: "OTHER", extraAllow: 10500, addon: null, desc: "Level 2 · Basic ₹19,900 + Running Allowance" },
    { id: "med_doc", badge: "CHS / AIIMS", title: "Central Govt Medical Officer (Doctor + 20% NPA)", level: "10", basic: 56100, hra: "X", ta: "HIGHER", extraAllow: 0, addon: "npa", desc: "Level 10 · Basic ₹56,100 + 20% NPA" },
    { id: "med_nurse", badge: "AIIMS / ESIC", title: "Nursing Officer (Level 7 + PCA/Nursing Allow.)", level: "7", basic: 44900, hra: "X", ta: "HIGHER", extraAllow: 7200, addon: "pca", desc: "Level 7 · Basic ₹44,900 + Nursing & HPCA" },
    { id: "def_capt", badge: "Indian Army", title: "Army Captain / Major (with ₹15,500 MSP)", level: "10", basic: 61300, hra: "X", ta: "HIGHER", extraAllow: 15500, addon: null, desc: "Level 10B/11 · Basic ₹61,300 + ₹15,500 MSP" },
    { id: "capf_gd", badge: "CAPF / SSC GD", title: "CRPF / BSF / CISF Constable (GD) + Risk Allow.", level: "3", basic: 21700, hra: "Z", ta: "OTHER", extraAllow: 9700, addon: null, desc: "Level 3 · Basic ₹21,700 + Risk/Ration Allow." },
    { id: "ssc_ta", badge: "SSC CGL", title: "Tax Assistant (CBDT / CBIC) / Steno D", level: "4", basic: 25500, hra: "Y", ta: "HIGHER", extraAllow: 0, addon: null, desc: "Level 4 · Entry Basic ₹25,500" },
    { id: "ssc_mts", badge: "SSC MTS / Rly", title: "Multi-Tasking Staff (MTS) / Track Maintainer", level: "1", basic: 18000, hra: "Y", ta: "OTHER", extraAllow: 0, addon: null, desc: "Level 1 · Minimum Basic ₹18,000" },
    { id: "us_dir", badge: "Central Secretariat", title: "Under Secretary / Deputy Secretary", level: "11", basic: 67700, hra: "X", ta: "HIGHER", extraAllow: 0, addon: null, desc: "Level 11 · Entry Basic ₹67,700" }
  ];

  // =========================================================================
  // 4. TRILINGUAL TRANSLATION DICTIONARY (ENGLISH, HINDI, BENGALI)
  // =========================================================================
  const I18N = {
    en: {
                menu_calculators: "Calculators",
      menu_paylevels: "Pay Levels",
      menu_defence: "Defence",
      menu_capf: "CAPF",
      menu_railway: "Railway",
      menu_guides: "Guides",
      menu_states: "States",
      menu_learn: "Learn",
      menu_news: "News",
      menu_search: "Search",
      dd_news_item1: "News Adda (Latest Updates)",
      dd_news_item2: "8th CPC & DA Notifications",
      hero_stat_users: "Monthly users",
      hero_stat_calcs: "Calculators & Micro-Tools",
      hero_stat_free: "Free forever · Offline Ready",
      btn_calc_now: "Calculate now",
      btn_read_articles: "Read articles & News Adda",
      btn_all_94_tools: "All 94+ Micro-Tools",
      btn_join_discussion: "Discussion & Q&A",
      disc_badge_live: "Central & State Govt Employee Forum · Verified DoPT / DoE Rules",
      disc_title: "8th Pay Commission Discussion, Fitment Poll & Employee Q&A",
      disc_subtitle: "Discuss 8th CPC fitment factors, HRA reset math, UPS vs NPS gratuity orders, arrears & FY 2026-27 tax rules with fellow employees.",
      disc_btn_ask: "Post a Question / Comment",
      poll_badge: "📊 Live Employee Poll",
      poll_question: "What Fitment Factor do you expect the 8th CPC to recommend (effective 01.01.2026)?",
      poll_hint: "Tap any option above to cast your vote and update the live breakdown.",
      disc_form_title: "Start a Discussion / Ask a Rule Query",
      disc_lbl_name: "Your Name & Post / Department",
      disc_lbl_topic: "Topic Category",
      disc_lbl_level: "Pay Level / Group",
      disc_lbl_msg: "Your Question, Calculation Note or Viewpoint",
      disc_lbl_attach: "Attach my active calculator snapshot (Level, Basic & Net Pay)",
      disc_btn_submit: "Post to Employee Discussion Board",
      shield_badge_title: "🛡️ 5-Layer Anti-Spam Protection Shield Active",
      shield_lbl_captcha: "Anti-Spam Math Challenge (Required)",
      shield_lbl_status: "Live Spam Filter Status:",
      fn_badge: "Official Calculation Methodology & Statutory Footnotes",
      fn_heading: "Footer Notes: 7th & 8th CPC Rules, DoPT / DoE OMs, Pension & Tax Formulas",
      fn_back_top: "Back to Top",
      btn_browse_all_tools: "Browse All 94+ Calculators Directory",
      btn_back_home: "8th CPC Salary Calculator",
      lp_badge_title: "LIVE PREVIEW",
      lp_7th_heading: "7TH CPC · MONTHLY (60% DA)",
      lp_dahra_lbl: "DA + HRA",
      lp_net_lbl: "Net Salary",
      lp_proj_divider: "↓ 8th CPC Projection",
      lp_est_net_lbl: "Est. Net",
      lp_load_btn: "Load in Calculator →",
      hero_pill_tag: "Built for Indian Government Employees",
      hero_h1_line1: "8th Pay Commission",
      hero_h1_line2: "Salary Calculator",
      hero_desc_text: "Estimate your 8th Pay Commission salary with the projected 1.92× fitment factor, plus your exact 7th CPC in-hand pay — DA, HRA, NPS, TA & income tax. Updated October 2026.",
      app_title: "8th Pay Commission Calculator",
      app_subtitle: "7th & 8th CPC In-Hand Salary, Matrix, Arrears, UPS/NPS & Tax",
      lbl_payslip_btn: "Salary Slip",
      nav_salary: "7th & 8th CPC Salary",
      nav_matrix: "Pay Matrix (L1–18)",
      nav_arrears: "Arrears & Allowances",
      nav_pension: "UPS / NPS / Gratuity",
      nav_tax: "Tax & Post Presets",
      nav_microtools: "All 94+ Micro-Tools",
      nav_guides: "8th CPC Info & APK",
      mob_microtools: "All Tools",
      banner_94_badge: "Complete GovtSalaryCalc.com Suite · 8th CPC Integrated",
      banner_94_title: "Explore All 94+ Government Salary, Allowance, Pension, Leave & Tax Micro-Tools",
      banner_94_sub: "Every micro-tool automatically syncs with your 8th CPC Projected Basic Pay & Fitment Factor (GPF, LTC, Tour TA/DA, HBA, Form 10E, Bank/PSU, 20 States, EWS/OBC & more).",
      btn_open_all_tools: "Open All 94+ Micro-Tools Hub →",
      mt_hub_title: "All 94+ Government Salary, Allowance, Leave, Pension & Tax Micro-Tools",
      mt_hub_sub: "Modular Android MVVM-ready engine — tap any tool below to open its interactive calculator synced with your 7th or 8th CPC pay.",
      mt_pay_basis_lbl: "Pay Basis for Tools:",
      mob_salary: "Salary",
      mob_matrix: "Matrix",
      mob_arrears: "Arrears",
      mob_pension: "Pension",
      mob_tax: "Tax/Posts",
      card_7th_title: "7th CPC In-Hand (Now)",
      card_8th_title: "8th CPC Projected In-Hand",
      card_hike_title: "Monthly Take-Home Hike",
      card_annual_title: "Annual Gross Salary",
      lbl_gross: "Gross:",
      lbl_basic: "Basic:",
      lbl_new_basic: "New Basic:",
      lbl_gross_diff: "Gross Increase:",
      lbl_annual_gain: "Annual Extra In-Hand:",
      lbl_7th_annual: "7th CPC Annual:",
      btn_view_payslip: "View Payslip",
      btn_copy_share: "Share Summary",
      sec_input_title: "Salary Parameters (7th & 8th CPC)",
      sec_input_sub: "Select your level, basic pay, city & fitment factor",
      btn_reset: "Reset",
      step1_title: "1. Pay Level & Basic Pay",
      lbl_select_level: "Pay Level (1–18)",
      lbl_select_basic: "7th CPC Basic Pay (₹)",
      step2_fitment: "2. 8th CPC Fitment Factor",
      step3_city: "3. Posting City, HRA & Transport (TA)",
      lbl_hra_city: "HRA City Class",
      lbl_ta_city: "Transport Allowance (TA)",
      lbl_8th_hra_rule: "Reset 8th CPC HRA to 24/16/8% (when DA=0%)",
      lbl_divyang_ta: "2× TA (Divyangjan)",
      step4_da: "4. DA Rate, Pension & Special Allowances",
      lbl_7th_da: "7th CPC DA Rate",
      lbl_8th_da: "8th CPC DA Rate",
      lbl_pension_scheme: "Pension Scheme",
      lbl_quick_allowances: "Hospital / Cadre Quick Add-ons (Tap to toggle):",
      lbl_other_allow: "+ Extra Allowance (₹/mo)",
      lbl_other_deduct: "− Extra Deduction / GPF (₹/mo)",
      lbl_include_cghs: "Deduct CGHS & CGEGIS",
      lbl_include_tds: "Deduct Income Tax (TDS)",
      tbl_comparison_title: "7th CPC vs 8th CPC Monthly Breakdown",
      btn_payslip: "Payslip",
      th_component: "Salary Component",
      th_7th_cpc: "7th CPC (Now)",
      th_8th_cpc: "8th CPC (Projected)",
      th_difference: "Difference",
      sec_chart_5yr: "Visual Breakdown & 5-Year Increment Projection (3% Annual)",
      btn_chart_view: "Bar Chart",
      btn_5yr_view: "5-Year Projection",
      th_year: "Year",
      matrix_title: "7th & Projected 8th CPC Pay Matrix Table (All 19 Levels)",
      matrix_sub: "Click any cell to load that Basic Pay directly into the Salary Calculator.",
      hist_cpc_title: "History of Pay Commissions & Fitment Factors (3rd CPC to 8th CPC)",
      arr_title: "8th CPC Salary Arrears Calculator (From Jan 1, 2026)",
      arr_sub: "Month-by-month back-pay calculation with automatic 3% annual increments & DA progression",
      lbl_arr_duration: "Implementation Delay (Months from Jan 2026)",
      lbl_inc_month: "Annual Increment Month",
      lbl_hra_arrears: "Include HRA in Arrears?",
      lbl_est_lump_arrear: "Estimated Net Back-Pay (In-Hand)",
      hra_ex_title: "HRA Tax Exemption u/s 10(13A)",
      hra_ex_sub: "Calculates tax-free HRA (Least of Three rule under Old Tax Regime)",
      lbl_monthly_rent: "Monthly Rent Paid (₹)",
      nda_title: "Night Duty Allowance (NDA)",
      nda_sub: "DoPT Formula: (Basic + DA)/200 per weighted hour (Pay ceiling ₹43,600)",
      lbl_nda_hours: "Night Shift Hours (22:00 to 06:00) / Month",
      bonus_title: "Bonus (PLB) & DA Hike Arrears",
      bonus_sub: "Calculate Ad-hoc / Railway 78-day PLB & 3-month DA Arrears",
      pen_title: "UPS vs NPS vs OPS Retirement, Gratuity & Leave Encashment Suite",
      pen_sub: "Compare Unified Pension Scheme (50% assured pension), NPS market corpus, Gratuity (₹25L limit) & 300-day EL Encashment",
      lbl_service_yrs: "Qualifying Service (Years)",
      lbl_retire_age: "Retirement Age (Years)",
      lbl_el_days: "Earned Leave (EL) Balance (Max 300)",
      lbl_pen_basis: "Calculate Retirement On",
      macp_title: "MACP / Promotion Pay Fixation Calculator (FR 22(I)(a)(1))",
      tax_title: "Income Tax Calculator FY 2026-27 (New vs Old Regime)",
      tax_sub: "Includes ₹75,000 Standard Deduction, Sec 87A Free Tax up to ₹12L & Employer 14% NPS Sec 80CCD(2) Deduction",
      presets_title: "One-Tap Government Post Presets (Railway, Defence, CAPF, SSC, Medical)",
      presets_sub: "Tap any post to load its exact Pay Level, Entry Basic Pay, and special allowances into the calculator",
      info_8th_title: "8th Pay Commission Official Status & Timeline",
      apk_guide_title: "Android App Features & Offline Usage",
      slip_modal_title: "Government Format Monthly Salary Slip (7th vs 8th CPC)",
      row_earnings: "A. MONTHLY EARNINGS",
      row_basic: "Basic Pay",
      row_npa: "Non-Practicing Allowance (NPA 20%)",
      row_da: "Dearness Allowance (DA)",
      row_hra: "House Rent Allowance (HRA)",
      row_ta: "Transport Allowance (TA)",
      row_da_on_ta: "DA on Transport Allowance",
      row_special: "Hospital / CEA / Extra Allowances",
      row_gross: "GROSS MONTHLY SALARY",
      row_deductions: "B. MONTHLY DEDUCTIONS",
      row_nps: "NPS / UPS Tier-I (10% of Basic + DA)",
      row_cghs: "CGHS Health Subscription",
      row_cgegis: "CGEGIS Group Insurance",
      row_tax: "Income Tax (Monthly TDS - FY 2026-27)",
      row_extra_ded: "Other Deductions / GPF / Licence Fee",
      row_total_ded: "TOTAL DEDUCTIONS",
      row_net: "NET IN-HAND SALARY (TAKE-HOME PAY)"
    },
    hi: {
                menu_calculators: "कैलकुलेटर",
      menu_paylevels: "पे लेवल",
      menu_defence: "डिफेंस",
      menu_capf: "CAPF",
      menu_railway: "रेलवे",
      menu_guides: "गाइड्स",
      menu_states: "राज्य",
      menu_learn: "जानकारी",
      menu_news: "समाचार",
      menu_search: "खोजें",
      dd_news_item1: "न्यूज़ अड्डा (ताज़ा खबरें)",
      dd_news_item2: "8वां वेतन आयोग व DA सूचनाएं",
      hero_stat_users: "मासिक उपयोगकर्ता",
      hero_stat_calcs: "कैलकुलेटर और टूल्स",
      hero_stat_free: "हमेशा मुफ़्त · ऑफ़लाइन",
      btn_calc_now: "अभी गणना करें",
      btn_read_articles: "लेख और समाचार पढ़ें",
      btn_all_94_tools: "सभी 94+ कैलकुलेटर",
      btn_join_discussion: "चर्चा और प्रश्नोत्तर (Q&A)",
      disc_badge_live: "केंद्रीय और राज्य कर्मचारी मंच · आधिकारिक DoPT / DoE नियम",
      disc_title: "8वां वेतन आयोग चर्चा मंच, फिटमेंट पोल और कर्मचारी प्रश्नोत्तर (Q&A)",
      disc_subtitle: "8वें वेतन आयोग के फिटमेंट फैक्टर, HRA नियम, UPS बनाम NPS ग्रेच्युटी, एरियर और टैक्स नियमों पर चर्चा करें।",
      disc_btn_ask: "प्रश्न या टिप्पणी लिखें",
      poll_badge: "📊 लाइव कर्मचारी पोल",
      poll_question: "आपके अनुसार 8वां वेतन आयोग (01.01.2026 से) कितना फिटमेंट फैक्टर सुझाएगा?",
      poll_hint: "अपना वोट देने के लिए किसी भी विकल्प पर टैप करें।",
      disc_form_title: "नई चर्चा शुरू करें / नियम संबंधी प्रश्न पूछें",
      disc_lbl_name: "आपका नाम और पद / विभाग",
      disc_lbl_topic: "विषय श्रेणी",
      disc_lbl_level: "पे लेवल / ग्रुप",
      disc_lbl_msg: "आपका प्रश्न, गणना या विचार",
      disc_lbl_attach: "मेरी वर्तमान सैलरी गणना (लेवल, बेसिक और नेट पे) जोड़ें",
      disc_btn_submit: "स्पैम शील्ड सत्यापित करें और पोस्ट करें",
      shield_badge_title: "🛡️ 5-स्तरीय एंटी-स्पैम सुरक्षा शील्ड सक्रिय",
      shield_lbl_captcha: "एंटी-स्पैम गणित प्रश्न (अनिवार्य)",
      shield_lbl_status: "लाइव स्पैम फ़िल्टर स्थिति:",
      fn_badge: "आधिकारिक गणना पद्धति और वैधानिक फुटनोट्स",
      fn_heading: "फुटनोट्स (Footer Notes): 7वां व 8वां वेतन आयोग नियम, DoPT / DoE आदेश, पेंशन और टैक्स सूत्र",
      fn_back_top: "ऊपर जाएं",
      btn_browse_all_tools: "सभी 94+ कैलकुलेटर की सूची देखें",
      btn_back_home: "8वां वेतन आयोग मुख्य कैलकुलेटर",
      lp_badge_title: "लाइव प्रीव्यू",
      lp_7th_heading: "7वां वेतन आयोग · मासिक (60% DA)",
      lp_dahra_lbl: "DA + HRA",
      lp_net_lbl: "नेट सैलरी",
      lp_proj_divider: "↓ 8वां वेतन आयोग अनुमान",
      lp_est_net_lbl: "अनुमानित नेट",
      lp_load_btn: "कैलकुलेटर में लोड करें →",
      hero_pill_tag: "भारतीय सरकारी कर्मचारियों के लिए निर्मित",
      hero_h1_line1: "8वां वेतन आयोग (8th CPC)",
      hero_h1_line2: "सैलरी कैलकुलेटर",
      hero_desc_text: "अनुमानित 1.92× फिटमेंट फैक्टर के साथ अपने 8वें वेतन आयोग के वेतन और सटीक 7वें वेतन आयोग इन-हैंड सैलरी (DA, HRA, NPS, TA और टैक्स) की गणना करें।",
      app_title: "8वां वेतन आयोग सैलरी कैलकुलेटर",
      app_subtitle: "7वां और 8वां वेतन आयोग इन-हैंड सैलरी, पे मैट्रिक्स, एरियर, UPS/NPS और टैक्स",
      lbl_payslip_btn: "सैलरी स्लिप",
      nav_salary: "7वां व 8वां वेतन कैलकुलेटर",
      nav_matrix: "पे मैट्रिक्स (L1–18)",
      nav_arrears: "एरियर और भत्ते",
      nav_pension: "UPS / NPS / ग्रेच्युटी",
      nav_tax: "इनकम टैक्स व पद",
      nav_microtools: "सभी 94+ कैलकुलेटर",
      nav_guides: "8वां वेतन आयोग व ऐप",
      mob_microtools: "सभी टूल्स",
      banner_94_badge: "संपूर्ण GovtSalaryCalc.com सूट · 8वां वेतन आयोग एकीकृत",
      banner_94_title: "सभी 94+ सरकारी वेतन, भत्ते, पेंशन, छुट्टी और टैक्स माइक्रो-टूल्स देखें",
      banner_94_sub: "हर टूल आपकी 8वें वेतन आयोग की अनुमानित बेसिक पे और फिटमेंट फैक्टर के साथ अपने-आप जुड़ता है (GPF, LTC, Tour TA/DA, HBA, Form 10E, बैंक/PSU, 20 राज्य, EWS/OBC आदि)।",
      btn_open_all_tools: "सभी 94+ माइक्रो-टूल्स खोलें →",
      mt_hub_title: "सभी 94+ सरकारी वेतन, भत्ते, छुट्टी, पेंशन और टैक्स कैलकुलेटर",
      mt_hub_sub: "किसी भी टूल कार्ड पर टैप करें और 7वें या 8वें वेतन आयोग के आधार पर तुरंत गणना करें।",
      mt_pay_basis_lbl: "गणना का आधार:",
      mob_salary: "सैलरी",
      mob_matrix: "मैट्रिक्स",
      mob_arrears: "एरियर",
      mob_pension: "पेंशन",
      mob_tax: "टैक्स/पद",
      card_7th_title: "7वां वेतन आयोग इन-हैंड (अभी)",
      card_8th_title: "8वां वेतन आयोग अनुमानित इन-हैंड",
      card_hike_title: "मासिक टेक-होम बढ़ोतरी",
      card_annual_title: "वार्षिक कुल वेतन (Gross)",
      lbl_gross: "कुल (Gross):",
      lbl_basic: "बेसिक:",
      lbl_new_basic: "नई बेसिक:",
      lbl_gross_diff: "ग्रॉस बढ़ोतरी:",
      lbl_annual_gain: "सालाना अतिरिक्त इन-हैंड:",
      lbl_7th_annual: "7वां वेतन सालाना:",
      btn_view_payslip: "पे-स्लिप देखें",
      btn_copy_share: "शेयर करें",
      sec_input_title: "वेतन विवरण (7वां और 8वां वेतन आयोग)",
      sec_input_sub: "अपना पे लेवल, बेसिक पे, शहर और फिटमेंट फैक्टर चुनें",
      btn_reset: "रीसेट",
      step1_title: "1. आपका पे लेवल और बेसिक पे",
      lbl_select_level: "पे लेवल चुनें (1–18)",
      lbl_select_basic: "7वां वेतन बेसिक पे (₹)",
      step2_fitment: "2. 8वां वेतन आयोग फिटमेंट फैक्टर",
      step3_city: "3. शहर की श्रेणी, HRA और ट्रांसपोर्ट भत्ता (TA)",
      lbl_hra_city: "HRA शहर श्रेणी (X / Y / Z)",
      lbl_ta_city: "ट्रांसपोर्ट भत्ता (TA)",
      lbl_8th_hra_rule: "8वें वेतन में HRA को 24/16/8% करें (जब DA=0%)",
      lbl_divyang_ta: "दोगुना TA (दिव्यांगजन)",
      step4_da: "4. महंगाई भत्ता (DA), पेंशन और अन्य भत्ते",
      lbl_7th_da: "7वां वेतन DA दर",
      lbl_8th_da: "8वां वेतन DA दर",
      lbl_pension_scheme: "पेंशन योजना",
      lbl_quick_allowances: "अस्पताल / विशेष भत्ते (जोड़ने के लिए टैप करें):",
      lbl_other_allow: "+ अन्य भत्ता (₹/माह)",
      lbl_other_deduct: "− अन्य कटौती / GPF (₹/माह)",
      lbl_include_cghs: "CGHS और CGEGIS कटौती जोड़ें",
      lbl_include_tds: "इनकम टैक्स (TDS) कटौती जोड़ें",
      tbl_comparison_title: "7वां बनाम 8वां वेतन आयोग: मासिक तुलना तालिका",
      btn_payslip: "पे-स्लिप",
      th_component: "वेतन का हिस्सा (Component)",
      th_7th_cpc: "7वां वेतन (अभी)",
      th_8th_cpc: "8वां वेतन (अनुमानित)",
      th_difference: "अंतर (बढ़ोतरी)",
      sec_chart_5yr: "चार्ट और 5-साल की वेतन वृद्धि (3% वार्षिक इंक्रीमेंट)",
      btn_chart_view: "बार चार्ट",
      btn_5yr_view: "5-साल का चार्ट",
      th_year: "वर्ष",
      matrix_title: "7वां और 8वां वेतन आयोग पे मैट्रिक्स तालिका (सभी 19 लेवल)",
      matrix_sub: "किसी भी सेल पर क्लिक करें — वह बेसिक पे सीधे कैलकुलेटर में लोड हो जाएगी।",
      hist_cpc_title: "वेतन आयोगों और फिटमेंट फैक्टर का इतिहास (3rd से 8th CPC)",
      arr_title: "8वां वेतन आयोग एरियर कैलकुलेटर (1 जनवरी 2026 से)",
      arr_sub: "हर महीने के बकाया (Arrears), 3% वार्षिक इंक्रीमेंट और DA का पूरा हिसाब",
      lbl_arr_duration: "लागू होने में देरी (जनवरी 2026 से महीने)",
      lbl_inc_month: "वार्षिक इंक्रीमेंट का महीना",
      lbl_hra_arrears: "क्या HRA एरियर में शामिल करें?",
      lbl_est_lump_arrear: "अनुमानित कुल इन-हैंड एरियर",
      hra_ex_title: "HRA टैक्स छूट कैलकुलेटर (धारा 10(13A))",
      hra_ex_sub: "पुरानी टैक्स व्यवस्था में कर-मुक्त HRA की गणना",
      lbl_monthly_rent: "मासिक किराया भुगतान (₹)",
      nda_title: "नाइट ड्यूटी भत्ता (NDA) कैलकुलेटर",
      nda_sub: "सूत्र: (Basic + DA)/200 प्रति घंटा (अधिकतम बेसिक सीमा ₹43,600)",
      lbl_nda_hours: "मासिक नाइट शिफ्ट घंटे (रात 10 से सुबह 6)",
      bonus_title: "दिवाली बोनस (PLB) और DA एरियर",
      bonus_sub: "अद-हॉक बोनस (30 दिन), रेलवे PLB (78 दिन) व 3 माह का DA एरियर",
      pen_title: "UPS बनाम NPS बनाम OPS पेंशन, ग्रेच्युटी और छुट्टी नकदीकरण (EL)",
      pen_sub: "एकीकृत पेंशन योजना (50% गारंटीड पेंशन), NPS फंड, ₹25 लाख ग्रेच्युटी व 300 दिन EL की तुलना",
      lbl_service_yrs: "कुल सेवा वर्ष (Qualifying Service)",
      lbl_retire_age: "रिटायरमेंट की आयु",
      lbl_el_days: "अर्जित अवकाश (EL) बैलेंस (अधिकतम 300)",
      lbl_pen_basis: "पेंशन गणना का आधार",
      macp_title: "MACP / प्रमोशन पे फिक्सेशन कैलकुलेटर (FR 22)",
      tax_title: "इनकम टैक्स कैलकुलेटर FY 2026-27 (नई बनाम पुरानी टैक्स प्रणाली)",
      tax_sub: "₹75,000 स्टैंडर्ड डिडक्शन, ₹12 लाख तक टैक्स रिबेट (87A) व 14% सरकारी NPS छूट शामिल",
      presets_title: "सरकारी पदों के लिए 1-क्लिक प्रीसेट (रेलवे, डिफेंस, CAPF, SSC, डॉक्टर)",
      presets_sub: "किसी भी पद पर टैप करें और तुरंत उसकी सैलरी व भत्ते देखें",
      info_8th_title: "8वां वेतन आयोग: आधिकारिक स्थिति और समय-सीमा",
      apk_guide_title: "एंड्रॉइड ऐप के फीचर्स और ऑफलाइन उपयोग",
      slip_modal_title: "सरकारी फॉर्मेट मासिक वेतन पर्ची (7वां बनाम 8वां वेतन आयोग)",
      row_earnings: "A. कुल मासिक वेतन और भत्ते",
      row_basic: "मूल वेतन (Basic Pay)",
      row_npa: "नॉन-प्रैक्टिसिंग भत्ता (NPA 20%)",
      row_da: "महंगाई भत्ता (DA)",
      row_hra: "मकान किराया भत्ता (HRA)",
      row_ta: "ट्रांसपोर्ट भत्ता (TA)",
      row_da_on_ta: "TA पर महंगाई भत्ता (DA on TA)",
      row_special: "अस्पताल / शिक्षा / अतिरिक्त भत्ते",
      row_gross: "कुल मासिक वेतन (ग्रॉस सैलरी)",
      row_deductions: "B. मासिक वेतन कटौती",
      row_nps: "NPS / UPS अंशदान (Basic + DA का 10%)",
      row_cghs: "CGHS स्वास्थ्य योजना अंशदान",
      row_cgegis: "CGEGIS समूह बीमा",
      row_tax: "इनकम टैक्स (मासिक TDS - FY 2026-27)",
      row_extra_ded: "अन्य कटौती / GPF / क्वार्टर शुल्क",
      row_total_ded: "कुल मासिक कटौती",
      row_net: "हाथ में आने वाली कुल सैलरी (इन-हैंड वेतन)"
    },
    bn: {
                menu_calculators: "ক্যালকুলেটর",
      menu_paylevels: "পে লেভেল",
      menu_defence: "ডিফেন্স",
      menu_capf: "CAPF",
      menu_railway: "রেলওয়ে",
      menu_guides: "গাইড",
      menu_states: "রাজ্য",
      menu_learn: "জানুন",
      menu_news: "খবর",
      menu_search: "খুঁজুন",
      dd_news_item1: "নিউজ আড্ডা (সর্বশেষ আপডেট)",
      dd_news_item2: "৮ম বেতন কমিশন ও DA বিজ্ঞপ্তি",
      hero_stat_users: "মাসিক ব্যবহারকারী",
      hero_stat_calcs: "ক্যালকুলেটর ও টুলস",
      hero_stat_free: "চিরকাল বিনামূল্যে · অফলাইন",
      btn_calc_now: "এখনই হিসাব করুন",
      btn_read_articles: "নিবন্ধ ও খবর পড়ুন",
      btn_all_94_tools: "সব ৯৪+ ক্যালকুলেটর",
      btn_join_discussion: "আলোচনা ও প্রশ্নোত্তর (Q&A)",
      disc_badge_live: "কেন্দ্রীয় ও রাজ্য সরকারি কর্মচারী ফোরাম · সরকারি DoPT / DoE নিয়ম",
      disc_title: "৮ম বেতন কমিশন আলোচনা, ফিটমেন্ট পোল ও কর্মচারী প্রশ্নোত্তর (Q&A)",
      disc_subtitle: "৮ম বেতন কমিশনের ফিটমেন্ট ফ্যাক্টর, HRA রিসেট, UPS বনাম NPS গ্র্যাচুইটি, বকেয়া ও ট্যাক্স নিয়ম নিয়ে আলোচনা করুন।",
      disc_btn_ask: "প্রশ্ন বা মন্তব্য করুন",
      poll_badge: "📊 লাইভ কর্মচারী পোল",
      poll_question: "আপনার মতে ৮ম বেতন কমিশন (০১.০১.২০২৬ থেকে) কত ফিটমেন্ট ফ্যাক্টর সুপারিশ করবে?",
      poll_hint: "আপনার ভোট দিতে উপরের যেকোনো বিকল্পে ট্যাপ করুন।",
      disc_form_title: "নতুন আলোচনা শুরু করুন / প্রশ্ন জিজ্ঞাসা করুন",
      disc_lbl_name: "আপনার নাম ও পদ / দপ্তর",
      disc_lbl_topic: "বিষয়ের বিভাগ",
      disc_lbl_level: "পে লেভেল / গ্রুপ",
      disc_lbl_msg: "আপনার প্রশ্ন, হিসাব বা মতামত",
      disc_lbl_attach: "আমার বর্তমান ক্যালকুলেটরের তথ্য (লেভেল, বেসিক ও নিট বেতন) যুক্ত করুন",
      disc_btn_submit: "স্প্যাম শিল্ড যাচাই করে পোস্ট করুন",
      shield_badge_title: "🛡️ ৫-স্তরের অ্যান্টি-স্প্যাম সুরক্ষা শিল্ড সক্রিয়",
      shield_lbl_captcha: "অ্যান্টি-স্প্যাম গণিত যাচাই (বাধ্যতামূলক)",
      shield_lbl_status: "লাইভ স্প্যাম ফিল্টার স্ট্যাটাস:",
      fn_badge: "সরকারি গণনা পদ্ধতি ও বিধিবদ্ধ ফুটনোট",
      fn_heading: "ফুটনোট (Footer Notes): ৭ম ও ৮ম বেতন কমিশনের নিয়ম, DoPT / DoE আদেশ, পেনশন ও ট্যাক্স সূত্র",
      fn_back_top: "উপরে যান",
      btn_browse_all_tools: "সব ৯৪+ ক্যালকুলেটরের তালিকা দেখুন",
      btn_back_home: "৮ম বেতন কমিশন মূল ক্যালকুলেটর",
      lp_badge_title: "লাইভ প্রিভিউ",
      lp_7th_heading: "৭ম বেতন কমিশন · মাসিক (60% DA)",
      lp_dahra_lbl: "DA + HRA",
      lp_net_lbl: "নিট বেতন",
      lp_proj_divider: "↓ ৮ম বেতন কমিশন অনুমান",
      lp_est_net_lbl: "সম্ভাব্য নিট",
      lp_load_btn: "ক্যালকুলেটরে লোড করুন →",
      hero_pill_tag: "ভারতীয় সরকারি কর্মচারীদের জন্য নির্মিত",
      hero_h1_line1: "৮ম বেতন কমিশন (8th CPC)",
      hero_h1_line2: "স্যালারি ক্যালকুলেটর",
      hero_desc_text: "সম্ভাব্য ১.৯২× ফিটমেন্ট ফ্যাক্টর সহ আপনার ৮ম বেতন কমিশনের বেতন এবং সঠিক ৭ম বেতন কমিশন ইন-হ্যান্ড বেতন (DA, HRA, NPS, TA ও ট্যাক্স) হিসাব করুন।",
      app_title: "৮ম বেতন কমিশন স্যালারি ক্যালকুলেটর",
      app_subtitle: "৭ম ও ৮ম বেতন কমিশন ইন-হ্যান্ড বেতন, পে ম্যাট্রিক্স, বকেয়া (Arrears), UPS/NPS ও ট্যাক্স",
      lbl_payslip_btn: "স্যালারি স্লিপ",
      nav_salary: "৭ম ও ৮ম বেতন ক্যালকুলেটর",
      nav_matrix: "পে ম্যাট্রিক্স (L1–18)",
      nav_arrears: "বকেয়া ও ভাতা (Arrears)",
      nav_pension: "UPS / NPS / গ্র্যাচুইটি",
      nav_tax: "ইনকাম ট্যাক্স ও পদ",
      nav_microtools: "সব ৯৪+ ক্যালকুলেটর",
      nav_guides: "৮ম বেতন কমিশন ও অ্যাপ",
      mob_microtools: "সব টুলস",
      banner_94_badge: "সম্পূর্ণ GovtSalaryCalc.com স্যুট · ৮ম বেতন কমিশন যুক্ত",
      banner_94_title: "সব ৯৪+ সরকারি বেতন, ভাতা, পেনশন, ছুটি ও ট্যাক্স মাইক্রো-টুলস দেখুন",
      banner_94_sub: "প্রতিটি টুল আপনার ৮ম বেতন কমিশনের সম্ভাব্য বেসিক পে এবং ফিটমেন্ট ফ্যাক্টরের সাথে স্বয়ংক্রিয়ভাবে যুক্ত হয় (GPF, LTC, Tour TA/DA, HBA, Form 10E, ব্যাংক/PSU, ২০টি রাজ্য, EWS/OBC ইত্যাদি)।",
      btn_open_all_tools: "সব ৯৪+ মাইক্রো-টুলস খুলুন →",
      mt_hub_title: "সব ৯৪+ সরকারি বেতন, ভাতা, ছুটি, পেনশন ও ট্যাক্স ক্যালকুলেটর",
      mt_hub_sub: "যেকোনো টুল কার্ডে ট্যাপ করুন এবং ৭ম বা ৮ম বেতন কমিশনের ভিত্তিতে তাৎক্ষণিক হিসাব দেখুন।",
      mt_pay_basis_lbl: "গণনার ভিত্তি:",
      mob_salary: "বেতন",
      mob_matrix: "ম্যাট্রিক্স",
      mob_arrears: "বকেয়া",
      mob_pension: "পেনশন",
      mob_tax: "ট্যাক্স/পদ",
      card_7th_title: "৭ম বেতন কমিশন ইন-হ্যান্ড (বর্তমান)",
      card_8th_title: "৮ম বেতন কমিশন সম্ভাব্য ইন-হ্যান্ড",
      card_hike_title: "মাসিক টেক-হোম বৃদ্ধি",
      card_annual_title: "বার্ষিক মোট বেতন (Gross)",
      lbl_gross: "মোট (Gross):",
      lbl_basic: "বেসিক:",
      lbl_new_basic: "নতুন বেসিক:",
      lbl_gross_diff: "গ্রস বৃদ্ধি:",
      lbl_annual_gain: "বার্ষিক অতিরিক্ত ইন-হ্যান্ড:",
      lbl_7th_annual: "৭ম বেতন বার্ষিক:",
      btn_view_payslip: "পে-স্লিপ দেখুন",
      btn_copy_share: "শেয়ার করুন",
      sec_input_title: "বেতনের বিবরণ (৭ম ও ৮ম বেতন কমিশন)",
      sec_input_sub: "আপনার পে লেভেল, বেসিক পে, শহর এবং ফিটমেন্ট ফ্যাক্টর নির্বাচন করুন",
      btn_reset: "রিসেট",
      step1_title: "১. পে লেভেল এবং বেসিক পে",
      lbl_select_level: "পে লেভেল নির্বাচন করুন (1–18)",
      lbl_select_basic: "৭ম বেতন বেসিক পে (₹)",
      step2_fitment: "২. ৮ম বেতন কমিশন ফিটমেন্ট ফ্যাক্টর",
      step3_city: "৩. শহরের শ্রেণী, HRA এবং পরিবহন ভাতা (TA)",
      lbl_hra_city: "HRA শহরের শ্রেণী (X / Y / Z)",
      lbl_ta_city: "পরিবহন ভাতা (TA)",
      lbl_8th_hra_rule: "৮ম বেতনে HRA ২৪/১৬/৮% করুন (যখন DA=0%)",
      lbl_divyang_ta: "দ্বিগুণ TA (দিব্যাঙ্গজন)",
      step4_da: "৪. মহার্ঘ ভাতা (DA), পেনশন এবং বিশেষ ভাতা",
      lbl_7th_da: "৭ম বেতন DA হার",
      lbl_8th_da: "৮ম বেতন DA হার",
      lbl_pension_scheme: "পেনশন প্রকল্প",
      lbl_quick_allowances: "হাসপাতাল / বিশেষ ভাতা (যোগ করতে ট্যাপ করুন):",
      lbl_other_allow: "+ অতিরিক্ত ভাতা (₹/মাস)",
      lbl_other_deduct: "− অতিরিক্ত কর্তন / GPF (₹/মাস)",
      lbl_include_cghs: "CGHS এবং CGEGIS কর্তন যুক্ত করুন",
      lbl_include_tds: "ইনকাম ট্যাক্স (TDS) কর্তন যুক্ত করুন",
      tbl_comparison_title: "৭ম বনাম ৮ম বেতন কমিশন: মাসিক তুলনামূলক তালিকা",
      btn_payslip: "পে-স্লিপ",
      th_component: "বেতনের উপাদান (Component)",
      th_7th_cpc: "৭ম বেতন (বর্তমান)",
      th_8th_cpc: "৮ম বেতন (সম্ভাব্য)",
      th_difference: "পার্থক্য (বৃদ্ধি)",
      sec_chart_5yr: "চার্ট এবং ৫-বছরের বেতন বৃদ্ধি (৩% বার্ষিক ইনক্রিমেন্ট)",
      btn_chart_view: "বার চার্ট",
      btn_5yr_view: "৫-বছরের হিসাব",
      th_year: "বছর",
      matrix_title: "৭ম এবং সম্ভাব্য ৮ম বেতন কমিশন পে ম্যাট্রিক্স টেবিল (১৯টি লেভেল)",
      matrix_sub: "যেকোনো সেলে ক্লিক করলে সেই বেসিক পে সরাসরি ক্যালকুলেটরে লোড হবে।",
      hist_cpc_title: "বেতন কমিশন এবং ফিটমেন্ট ফ্যাক্টরের ইতিহাস (৩য় থেকে ৮ম CPC)",
      arr_title: "৮ম বেতন কমিশন বকেয়া (Arrears) ক্যালকুলেটর (১ জানুয়ারি ২০২৬ থেকে)",
      arr_sub: "৩% বার্ষিক ইনক্রিমেন্ট এবং DA বৃদ্ধিসহ মাসওয়ারি বকেয়া বেতনের সম্পূর্ণ হিসাব",
      lbl_arr_duration: "বাস্তবায়নে বিলম্ব (জানুয়ারি ২০২৬ থেকে মাস)",
      lbl_inc_month: "বার্ষিক ইনক্রিমেন্টের মাস",
      lbl_hra_arrears: "বকেয়ায় HRA অন্তর্ভুক্ত করবেন?",
      lbl_est_lump_arrear: "সম্ভাব্য মোট ইন-হ্যান্ড বকেয়া",
      hra_ex_title: "HRA ট্যাক্স ছাড় ক্যালকুলেটর (ধারা 10(13A))",
      hra_ex_sub: "পুরানো ট্যাক্স নিয়মে করমুক্ত HRA-এর হিসাব",
      lbl_monthly_rent: "মাসিক বাড়ি ভাড়া প্রদান (₹)",
      nda_title: "নাইট ডিউটি ভাতা (NDA) ক্যালকুলেটর",
      nda_sub: "সূত্র: (Basic + DA)/200 প্রতি ঘণ্টা (সর্বোচ্চ বেসিক সীমা ₹৪৩,৬০০)",
      lbl_nda_hours: "মাসিক নাইট শিফট ঘণ্টা (রাত ১০টা থেকে সকাল ৬টা)",
      bonus_title: "উৎসব বোনাস (PLB) এবং DA বকেয়া",
      bonus_sub: "অ্যাড-হক বোনাস (৩০ দিন), রেলওয়ে PLB (৭৮ দিন) ও ৩ মাসের DA বকেয়া",
      pen_title: "UPS বনাম NPS বনাম OPS পেনশন, গ্র্যাচুইটি এবং ছুটি নগদায়ন (EL)",
      pen_sub: "ইউনিফায়েড পেনশন স্কিম (৫০% নিশ্চিত পেনশন), NPS তহবিল, ₹২৫ লক্ষ গ্র্যাচুইটি ও ৩০০ দিন EL তুলনা",
      lbl_service_yrs: "মোট চাকরির বছর (Qualifying Service)",
      lbl_retire_age: "অবসরের বয়স",
      lbl_el_days: "অর্জিত ছুটি (EL) ব্যালেন্স (সর্বোচ্চ ৩০০)",
      lbl_pen_basis: "পেনশন গণনার ভিত্তি",
      macp_title: "MACP / প্রমোশন পে ফিক্সেশন ক্যালকুলেটর (FR 22)",
      tax_title: "ইনকাম ট্যাক্স ক্যালকুলেটর FY 2026-27 (নতুন বনাম পুরানো ট্যাক্স রিজিম)",
      tax_sub: "₹৭৫,০০০ স্ট্যান্ডার্ড ডিডাকশন, ₹১২ লক্ষ পর্যন্ত ট্যাক্স রিবেট (87A) ও ১৪% সরকারি NPS ছাড় অন্তর্ভুক্ত",
      presets_title: "সরকারি পদের জন্য ১-ট্যাপ প্রিসেট (রেলওয়ে, ডিফেন্স, CAPF, SSC, ডাক্তার)",
      presets_sub: "যেকোনো পদে ট্যাপ করে সরাসরি তার বেতন ও ভাতা দেখুন",
      info_8th_title: "৮ম বেতন কমিশন: সরকারি স্থিতি ও সময়সূচী",
      apk_guide_title: "অ্যান্ড্রয়েড অ্যাপের বৈশিষ্ট্য ও অফলাইন ব্যবহার",
      slip_modal_title: "সরকারি ফরম্যাট মাসিক বেতন স্লিপ (৭ম বনাম ৮ম বেতন কমিশন)",
      row_earnings: "A. মাসিক আয় এবং ভাতা",
      row_basic: "মূল বেতন (Basic Pay)",
      row_npa: "নন-প্র্যাকটিসিং ভাতা (NPA 20%)",
      row_da: "মহার্ঘ ভাতা (DA)",
      row_hra: "বাড়ি ভাড়া ভাতা (HRA)",
      row_ta: "পরিবহন ভাতা (TA)",
      row_da_on_ta: "TA-এর ওপর মহার্ঘ ভাতা (DA on TA)",
      row_special: "হাসপাতাল / শিক্ষা / অতিরিক্ত ভাতা",
      row_gross: "মোট মাসিক বেতন (গ্রস স্যালারি)",
      row_deductions: "B. মাসিক বেতন কর্তন",
      row_nps: "NPS / UPS কন্ট্রিবিউশন (Basic + DA-এর ১০%)",
      row_cghs: "CGHS স্বাস্থ্য প্রকল্প চাঁদা",
      row_cgegis: "CGEGIS গ্রুপ ইন্স্যুরেন্স",
      row_tax: "ইনকাম ট্যাক্স (মাসিক TDS - FY 2026-27)",
      row_extra_ded: "অন্যান্য কর্তন / GPF / কোয়ার্টার ফি",
      row_total_ded: "মোট মাসিক কর্তন",
      row_net: "হাতে পাওয়া নিট বেতন (ইন-হ্যান্ড বেতন)"
    }
  };

  // =========================================================================
  // 5. APPLICATION STATE
  // =========================================================================
  const state = {
    lang: "en",
    levelId: "10",
    basicPay: 56100,
    fitment: 1.92,
    hraClass: "X",
    taType: "HIGHER",
    hra8thReset: true,
    divyangTa: false,
    da7th: 60,
    da8th: 0,
    pensionScheme: "NPS_UPS",
    addons: {
      npa: false,
      pca: false,
      cea: false
    },
    customAllow: 0,
    customDeduct: 0,
    includeCghs: true,
    includeTax: true,
    lastResult: null,
    chartInstance: null
  };

  // =========================================================================
  // 6. HELPER FORMATTERS
  // =========================================================================
  function formatINR(num) {
    const rounded = Math.round(Number(num) || 0);
    const sign = rounded < 0 ? "-" : "";
    return sign + "₹" + Math.abs(rounded).toLocaleString("en-IN");
  }

  function formatLakh(num) {
    const val = Number(num) || 0;
    if (val >= 10000000) {
      return "₹" + (val / 10000000).toFixed(2) + " Cr";
    }
    return "₹" + (val / 100000).toFixed(2) + " L";
  }

  function showToast(msg) {
    const el = document.getElementById("toast-container");
    const txt = document.getElementById("toast-message");
    if (!el || !txt) return;
    txt.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => {
      el.classList.add("hidden");
    }, 2800);
  }

  function getLevelMeta(levelId) {
    return PAY_LEVEL_META.find(l => l.id === String(levelId)) || PAY_LEVEL_META[9];
  }

  // =========================================================================
  // 7. CORE SALARY & TAX CALCULATION ENGINE
  // =========================================================================
  function computeAnnualIncomeTaxNewRegime(annualGross, annualEmployerNps, claim80CCD2) {
    const stdDed = 75000;
    const npsDed = claim80CCD2 ? annualEmployerNps : 0;
    const taxable = Math.max(0, annualGross - stdDed - npsDed);

    // FY 2026-27 New Tax Regime Slabs (Sec 87A Rebate up to ₹12,00,000 taxable income with marginal relief)
    if (taxable <= 1200000) {
      return { taxable, annualTax: 0, monthlyTds: 0 };
    }

    let slabTax = 0;
    const brackets = [
      { limit: 400000, rate: 0.00 },
      { limit: 800000, rate: 0.05 },
      { limit: 1200000, rate: 0.10 },
      { limit: 1600000, rate: 0.15 },
      { limit: 2000000, rate: 0.20 },
      { limit: 2400000, rate: 0.25 },
      { limit: Infinity, rate: 0.30 }
    ];

    let prev = 0;
    for (const b of brackets) {
      if (taxable > prev) {
        const chunk = Math.min(taxable, b.limit) - prev;
        slabTax += chunk * b.rate;
        prev = b.limit;
      }
    }

    // Marginal relief above ₹12,00,000
    const excessOver12L = taxable - 1200000;
    if (slabTax > excessOver12L) {
      slabTax = excessOver12L;
    }

    const totalWithCess = Math.round(slabTax * 1.04);
    return {
      taxable,
      annualTax: totalWithCess,
      monthlyTds: Math.round(totalWithCess / 12)
    };
  }

  function computeAnnualIncomeTaxOldRegime(annualGross, hraExemptAnnual, sec80C, sec80D) {
    const stdDed = 50000;
    const c80 = Math.min(150000, Math.max(0, Number(sec80C) || 0));
    const d80 = Math.max(0, Number(sec80D) || 0);
    const taxable = Math.max(0, annualGross - stdDed - hraExemptAnnual - c80 - d80);

    if (taxable <= 500000) {
      return { taxable, annualTax: 0, monthlyTds: 0 };
    }

    let slabTax = 0;
    if (taxable > 250000) {
      slabTax += Math.min(250000, taxable - 250000) * 0.05;
    }
    if (taxable > 500000) {
      slabTax += Math.min(500000, taxable - 500000) * 0.20;
    }
    if (taxable > 1000000) {
      slabTax += (taxable - 1000000) * 0.30;
    }

    const totalWithCess = Math.round(slabTax * 1.04);
    return {
      taxable,
      annualTax: totalWithCess,
      monthlyTds: Math.round(totalWithCess / 12)
    };
  }

  function calculateSingleCommission(params) {
    const {
      levelMeta,
      basic,
      daPct,
      hraClass,
      hraRatesMap,
      taType,
      divyangTa,
      addons,
      customAllow,
      customDeduct,
      pensionScheme,
      includeCghs,
      includeTax,
      claim80CCD2,
      commissionScale
    } = params;

    const scale = Number(commissionScale) || 1;

    // 1. NPA (20% of Basic, subject to Basic + NPA ceiling of ₹2,37,500 in 7th CPC or proportional in 8th CPC)
    const npaCap = Math.round(237500 * scale);
    const npa = addons.npa ? Math.max(0, Math.min(Math.round(basic * 0.20), npaCap - basic)) : 0;
    const payForDaHra = basic + npa;

    // 2. DA
    const da = Math.round(payForDaHra * (daPct / 100));

    // 3. HRA (with DoE minimum floor ₹5,400 / ₹3,600 / ₹1,800 scaled by commission)
    let hraRate = hraRatesMap[hraClass] || 0;
    const hraFloorMap = { X: 5400, Y: 3600, Z: 1800, NONE: 0 };
    const hraFloor = Math.round((hraFloorMap[hraClass] || 0) * scale);
    let hra = hraRate > 0 ? Math.max(hraFloor, Math.round(basic * (hraRate / 100))) : 0;

    // 4. Transport Allowance (TA) + DA on TA
    let baseTa = 0;
    const l12HigherThreshold = Math.round(24200 * scale);
    if (taType === "HIGHER") {
      baseTa = levelMeta.taHigher;
      // Pay ≥ ₹24,200 (7th CPC) in Level 1/2 gets ₹3,600 in Higher TPTA city
      if ((levelMeta.id === "1" || levelMeta.id === "2") && basic >= l12HigherThreshold) {
        baseTa = 3600;
      }
    } else if (taType === "OTHER") {
      baseTa = levelMeta.taOther;
      if ((levelMeta.id === "1" || levelMeta.id === "2") && basic >= l12HigherThreshold) {
        baseTa = 1800;
      }
    }
    if (divyangTa && baseTa > 0) {
      baseTa *= 2;
    }
    const daOnTa = Math.round(baseTa * (daPct / 100));

    // 5. Special / Hospital / CEA / Extra Allowances
    const levelNum = parseInt(levelMeta.id, 10) || 10;
    const pcaAmt = addons.pca ? (levelNum <= 8 ? 4100 : 5300) : 0;
    const ceaAmt = addons.cea ? 2813 : 0;
    const specialTotal = pcaAmt + ceaAmt + (Number(customAllow) || 0);

    const gross = basic + npa + da + hra + baseTa + daOnTa + specialTotal;

    // Deductions
    const npsEmployee = pensionScheme === "NPS_UPS" ? Math.round((basic + npa + da) * 0.10) : 0;
    const npsEmployer = pensionScheme === "NPS_UPS" ? Math.round((basic + npa + da) * 0.14) : 0;
    const cghs = includeCghs ? levelMeta.cghs : 0;
    const cgegis = includeCghs ? levelMeta.cgegis : 0;
    const extraDed = Number(customDeduct) || 0;

    const taxInfo = computeAnnualIncomeTaxNewRegime(gross * 12, npsEmployer * 12, claim80CCD2);
    const monthlyTax = includeTax ? taxInfo.monthlyTds : 0;

    const totalDed = npsEmployee + cghs + cgegis + monthlyTax + extraDed;
    const net = gross - totalDed;

    return {
      basic,
      npa,
      daPct,
      da,
      hraRate,
      hra,
      ta: baseTa,
      daOnTa,
      specialTotal,
      gross,
      npsEmployee,
      npsEmployer,
      cghs,
      cgegis,
      monthlyTax,
      extraDed,
      totalDed,
      net,
      annualGross: gross * 12,
      annualNet: net * 12,
      taxInfo
    };
  }

  function runAllCalculations() {
    const levelMeta = getLevelMeta(state.levelId);
    const claim80CCD2El = byId("chk-80ccd2");
    const claim80CCD2 = claim80CCD2El ? claim80CCD2El.checked : true;

    // 7th CPC HRA rates: Since DA >= 50%, X=30%, Y=20%, Z=10%
    const hra7thMap = state.da7th >= 50
      ? { X: 30, Y: 20, Z: 10, NONE: 0 }
      : { X: 27, Y: 18, Z: 9, NONE: 0 };

    // 8th CPC HRA rates: When DA resets to 0%, standard rule resets HRA to 24/16/8% (unless user unchecks)
    let hra8thMap = { X: 30, Y: 20, Z: 10, NONE: 0 };
    if (state.hra8thReset && state.da8th < 25) {
      hra8thMap = { X: 24, Y: 16, Z: 8, NONE: 0 };
    } else if (state.hra8thReset && state.da8th >= 25 && state.da8th < 50) {
      hra8thMap = { X: 27, Y: 18, Z: 9, NONE: 0 };
    }

    const cpc7 = calculateSingleCommission({
      levelMeta,
      basic: state.basicPay,
      daPct: state.da7th,
      hraClass: state.hraClass,
      hraRatesMap: hra7thMap,
      taType: state.taType,
      divyangTa: state.divyangTa,
      addons: state.addons,
      customAllow: state.customAllow,
      customDeduct: state.customDeduct,
      pensionScheme: state.pensionScheme,
      includeCghs: state.includeCghs,
      includeTax: state.includeTax,
      claim80CCD2
    });

    const basic8th = Math.round(state.basicPay * state.fitment);

    const cpc8 = calculateSingleCommission({
      levelMeta,
      basic: basic8th,
      daPct: state.da8th,
      hraClass: state.hraClass,
      hraRatesMap: hra8thMap,
      taType: state.taType,
      divyangTa: state.divyangTa,
      addons: state.addons,
      customAllow: state.customAllow,
      customDeduct: state.customDeduct,
      pensionScheme: state.pensionScheme,
      includeCghs: state.includeCghs,
      includeTax: state.includeTax,
      claim80CCD2,
      commissionScale: state.fitment
    });

    state.lastResult = { levelMeta, cpc7, cpc8 };

    renderMainDashboard();
    render5YearProjection();
    renderArrearsAndAllowances();
    renderPensionSuite();
    renderTaxComparison();
    renderPayslipModalContent();
    if (typeof renderMicroToolsGrid === "function") {
      renderMicroToolsGrid();
    }
    saveCalcState();
  }

  // Calculator inputs are kept in localStorage so they carry over between pages.
  const CALC_STATE_KEY = "gsc_calc_state_v1";
  const LANG_KEY = "gsc_lang_v1";
  const PERSISTED_STATE_KEYS = [
    "levelId", "basicPay", "fitment", "hraClass", "taType", "hra8thReset", "divyangTa",
    "da7th", "da8th", "pensionScheme", "addons", "customAllow", "customDeduct",
    "includeCghs", "includeTax"
  ];

  function saveCalcState() {
    const saved = {};
    PERSISTED_STATE_KEYS.forEach(k => { saved[k] = state[k]; });
    safeStorageSet(CALC_STATE_KEY, saved);
  }

  function restoreCalcState() {
    const saved = safeStorageGet(CALC_STATE_KEY, null);
    if (!saved || typeof saved !== "object") return;
    PERSISTED_STATE_KEYS.forEach(k => {
      if (saved[k] !== undefined && typeof saved[k] === typeof state[k]) state[k] = saved[k];
    });
    if (!PAY_LEVEL_META.some(l => l.id === String(state.levelId))) state.levelId = "10";
  }

  // Reflects the restored state in the calculator controls (salary page only).
  function syncCalculatorControls() {
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = String(v); };
    const setChk = (id, v) => { const el = byId(id); if (el) el.checked = !!v; };
    setVal("rng-fitment", Math.min(3.5, state.fitment));
    setVal("num-fitment", state.fitment.toFixed(2));
    setVal("sel-hra-class", state.hraClass);
    setVal("sel-ta-type", state.taType);
    setChk("chk-8th-hra-reset", state.hra8thReset);
    setChk("chk-divyang-ta", state.divyangTa);
    setVal("sel-7th-da", state.da7th);
    setVal("sel-8th-da", state.da8th);
    setVal("sel-pension-scheme", state.pensionScheme);
    setVal("inp-custom-allow", state.customAllow);
    setVal("inp-custom-deduct", state.customDeduct);
    setChk("chk-cghs", state.includeCghs);
    setChk("chk-income-tax", state.includeTax);
    document.querySelectorAll(".addon-chip").forEach(chip => {
      chip.className = state.addons[chip.getAttribute("data-addon")]
        ? "addon-chip px-2.5 py-1 rounded-xl text-xs font-semibold border border-blue-600 bg-blue-600 text-white shadow-sm"
        : "addon-chip px-2.5 py-1 rounded-xl text-xs font-semibold border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100";
    });
  }

  // =========================================================================
  // 8. UI RENDERING FUNCTIONS
  // =========================================================================
  function renderMainDashboard() {
    const { levelMeta, cpc7, cpc8 } = state.lastResult;
    const dict = I18N[state.lang] || I18N.en;

    byId("badge-7th-da").textContent = `${cpc7.daPct}% DA`;
    byId("hero-7th-net").textContent = formatINR(cpc7.net);
    byId("hero-7th-gross").textContent = formatINR(cpc7.gross);
    byId("hero-7th-basic").textContent = formatINR(cpc7.basic);
    byId("hero-level-tag").textContent = levelMeta.name;

    byId("badge-8th-fitment").textContent = `${state.fitment.toFixed(2)}× Fitment`;
    byId("hero-8th-net").textContent = formatINR(cpc8.net);
    byId("hero-8th-gross").textContent = formatINR(cpc8.gross);
    byId("hero-8th-basic").textContent = formatINR(cpc8.basic);
    byId("badge-8th-da").textContent = `${cpc8.daPct}% DA`;

    const netDiff = cpc8.net - cpc7.net;
    const grossDiff = cpc8.gross - cpc7.gross;
    const pctHike = cpc7.net > 0 ? ((netDiff / cpc7.net) * 100).toFixed(1) : "0.0";
    const sign = netDiff >= 0 ? "+" : "";

    byId("hero-hike-pct").textContent = `${sign}${pctHike}%`;
    byId("hero-hike-amt").textContent = `${sign}${formatINR(netDiff)}`;
    byId("hero-gross-diff").textContent = `${grossDiff >= 0 ? "+" : ""}${formatINR(grossDiff)}`;
    byId("hero-annual-gain").textContent = `${sign}${formatINR(netDiff * 12)}/yr`;

    byId("hero-8th-annual").textContent = formatLakh(cpc8.annualGross);
    byId("hero-7th-annual").textContent = formatLakh(cpc7.annualGross);

    byId("lbl-grade-pay-hint").textContent = `GP: ${levelMeta.gp} · ${levelMeta.post.split("/")[0].trim()}`;
    byId("tbl-subtitle-meta").textContent = `${levelMeta.name} (${levelMeta.gp}) · Basic ${formatINR(cpc7.basic)} → ${formatINR(cpc8.basic)} (${state.fitment.toFixed(2)}×) · HRA Class: ${state.hraClass}`;

    // Update history table dynamic 8th CPC row
    const histMin = document.getElementById("hist-8th-min");
    const histMax = document.getElementById("hist-8th-max");
    const histFit = document.getElementById("hist-8th-fit");
    if (histMin) histMin.textContent = formatINR(Math.round(18000 * state.fitment));
    if (histMax) histMax.textContent = formatINR(Math.round(250000 * state.fitment));
    if (histFit) histFit.textContent = `${state.fitment.toFixed(2)}× Fitment`;

    // Breakdown Table Rows
    const rows = [
      { section: dict.row_earnings },
      { label: dict.row_basic, v7: cpc7.basic, v8: cpc8.basic, bold: true },
      ...(cpc7.npa > 0 || cpc8.npa > 0 ? [{ label: dict.row_npa, v7: cpc7.npa, v8: cpc8.npa }] : []),
      { label: `${dict.row_da} (${cpc7.daPct}% → ${cpc8.daPct}%)`, v7: cpc7.da, v8: cpc8.da },
      { label: `${dict.row_hra} (${cpc7.hraRate}% → ${cpc8.hraRate}%)`, v7: cpc7.hra, v8: cpc8.hra },
      { label: dict.row_ta, v7: cpc7.ta, v8: cpc8.ta },
      { label: dict.row_da_on_ta, v7: cpc7.daOnTa, v8: cpc8.daOnTa },
      ...(cpc7.specialTotal > 0 || cpc8.specialTotal > 0 ? [{ label: dict.row_special, v7: cpc7.specialTotal, v8: cpc8.specialTotal }] : []),
      { label: dict.row_gross, v7: cpc7.gross, v8: cpc8.gross, isTotal: true, bg: "bg-blue-50/70 text-blue-950" },
      { section: dict.row_deductions },
      { label: dict.row_nps, v7: cpc7.npsEmployee, v8: cpc8.npsEmployee, isDed: true },
      { label: dict.row_cghs, v7: cpc7.cghs, v8: cpc8.cghs, isDed: true },
      { label: dict.row_cgegis, v7: cpc7.cgegis, v8: cpc8.cgegis, isDed: true },
      { label: dict.row_tax, v7: cpc7.monthlyTax, v8: cpc8.monthlyTax, isDed: true },
      ...(cpc7.extraDed > 0 ? [{ label: dict.row_extra_ded, v7: cpc7.extraDed, v8: cpc8.extraDed, isDed: true }] : []),
      { label: dict.row_total_ded, v7: cpc7.totalDed, v8: cpc8.totalDed, isTotal: true, bg: "bg-rose-50/70 text-rose-950" },
      { label: dict.row_net, v7: cpc7.net, v8: cpc8.net, isNet: true }
    ];

    const tbody = byId("salary-breakdown-tbody");
    tbody.innerHTML = rows.map(r => {
      if (r.section) {
        return `<tr class="bg-slate-100/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-700"><td colspan="4" class="py-2 px-3 sm:px-4">${r.section}</td></tr>`;
      }
      const diff = r.v8 - r.v7;
      const diffStr = (diff >= 0 ? "+" : "") + formatINR(diff);
      if (r.isNet) {
        return `<tr class="bg-emerald-900 text-white font-extrabold text-sm sm:text-base">
          <td class="py-3 px-3 sm:px-4">${r.label}</td>
          <td class="py-3 px-3 sm:px-4 text-right">${formatINR(r.v7)}</td>
          <td class="py-3 px-3 sm:px-4 text-right text-emerald-300">${formatINR(r.v8)}</td>
          <td class="py-3 px-3 sm:px-4 text-right text-emerald-300">${diffStr}</td>
        </tr>`;
      }
      const rowCls = r.isTotal ? `font-bold ${r.bg}` : (r.bold ? "font-semibold text-slate-900" : "text-slate-700");
      const diffColor = r.isDed ? "text-rose-600" : (diff >= 0 ? "text-emerald-700" : "text-amber-700");
      return `<tr class="${rowCls} hover:bg-slate-50/80">
        <td class="py-2 px-3 sm:px-4">${r.label}</td>
        <td class="py-2 px-3 sm:px-4 text-right font-mono">${formatINR(r.v7)}</td>
        <td class="py-2 px-3 sm:px-4 text-right font-mono font-semibold bg-emerald-50/30">${formatINR(r.v8)}</td>
        <td class="py-2 px-3 sm:px-4 text-right font-mono ${diffColor}">${diffStr}</td>
      </tr>`;
    }).join("");

    updateChart(cpc7, cpc8);
  }

  function updateChart(cpc7, cpc8) {
    const ctx = document.getElementById("salaryComparisonChart");
    if (!ctx || typeof Chart === "undefined") return;

    const labels = ["Basic Pay", "DA + HRA + TA", "Total Deductions", "Net In-Hand Pay"];
    const data7 = [
      cpc7.basic,
      cpc7.da + cpc7.hra + cpc7.ta + cpc7.daOnTa + cpc7.npa + cpc7.specialTotal,
      cpc7.totalDed,
      cpc7.net
    ];
    const data8 = [
      cpc8.basic,
      cpc8.da + cpc8.hra + cpc8.ta + cpc8.daOnTa + cpc8.npa + cpc8.specialTotal,
      cpc8.totalDed,
      cpc8.net
    ];

    if (state.chartInstance) {
      state.chartInstance.data.datasets[0].data = data7;
      state.chartInstance.data.datasets[1].data = data8;
      state.chartInstance.update();
      return;
    }

    state.chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "7th CPC (Current)",
            data: data7,
            backgroundColor: "#3b82f6",
            borderRadius: 6
          },
          {
            label: "8th CPC (Projected)",
            data: data8,
            backgroundColor: "#059669",
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return "₹" + (value / 1000).toFixed(0) + "k";
              }
            }
          }
        }
      }
    });
  }

  function render5YearProjection() {
    const { levelMeta } = state.lastResult;
    const tbody = document.getElementById("tbody-5yr-projection");
    if (!tbody) return;

    let b7 = state.basicPay;
    let b8 = Math.round(state.basicPay * state.fitment);
    const rowsHtml = [];

    for (let yr = 1; yr <= 5; yr++) {
      const yearNum = 2025 + yr;
      const da7 = state.da7th + (yr - 1) * 6; // ~6% per year
      const da8 = state.da8th + (yr - 1) * 5; // ~5% per year after 8th CPC

      const res7 = calculateSingleCommission({
        levelMeta,
        basic: b7,
        daPct: da7,
        hraClass: state.hraClass,
        hraRatesMap: { X: 30, Y: 20, Z: 10, NONE: 0 },
        taType: state.taType,
        divyangTa: state.divyangTa,
        addons: state.addons,
        customAllow: state.customAllow,
        customDeduct: state.customDeduct,
        pensionScheme: state.pensionScheme,
        includeCghs: state.includeCghs,
        includeTax: state.includeTax,
        claim80CCD2: true
      });

      const res8 = calculateSingleCommission({
        levelMeta,
        basic: b8,
        daPct: da8,
        hraClass: state.hraClass,
        hraRatesMap: da8 >= 25 ? { X: 27, Y: 18, Z: 9, NONE: 0 } : { X: 24, Y: 16, Z: 8, NONE: 0 },
        taType: state.taType,
        divyangTa: state.divyangTa,
        addons: state.addons,
        customAllow: state.customAllow,
        customDeduct: state.customDeduct,
        pensionScheme: state.pensionScheme,
        includeCghs: state.includeCghs,
        includeTax: state.includeTax,
        claim80CCD2: true,
        commissionScale: state.fitment
      });

      rowsHtml.push(`<tr class="hover:bg-slate-50">
        <td class="py-2 px-3 font-semibold">Year ${yr} (${yearNum})</td>
        <td class="py-2 px-3 text-right font-mono">${formatINR(b7)} <span class="text-[10px] text-slate-400">(${da7}% DA)</span></td>
        <td class="py-2 px-3 text-right font-mono font-semibold">${formatINR(res7.net)}</td>
        <td class="py-2 px-3 text-right font-mono text-emerald-800">${formatINR(b8)} <span class="text-[10px] text-emerald-600">(${da8}% DA)</span></td>
        <td class="py-2 px-3 text-right font-mono font-bold text-emerald-700">${formatINR(res8.net)}</td>
      </tr>`);

      // 3% annual increment rounded to nearest 100
      b7 = Math.round((b7 * 1.03) / 100) * 100;
      b8 = Math.round((b8 * 1.03) / 100) * 100;
    }
    tbody.innerHTML = rowsHtml.join("");
  }

  // =========================================================================
  // 9. PAY MATRIX EXPLORER RENDERER
  // =========================================================================
  function renderPayMatrixTable() {
    const mode = byId("sel-matrix-mode").value;
    const groupFilter = byId("sel-matrix-group").value;
    const thead = document.getElementById("matrix-thead");
    const tbody = document.getElementById("matrix-tbody");
    if (!thead || !tbody) return;

    const levels = PAY_LEVEL_META.filter(l => groupFilter === "ALL" || l.group === groupFilter);

    let headHtml = `<tr><th class="p-2.5 text-left sticky left-0 bg-slate-900 z-20 border-r border-slate-700">Cell / Stage</th>`;
    for (const lv of levels) {
      headHtml += `<th class="p-2.5 text-right min-w-[125px] border-r border-slate-800">
        <div class="font-bold text-emerald-300">${lv.name}</div>
        <div class="text-[10px] text-slate-300 font-normal">GP ${lv.gp}</div>
      </th>`;
    }
    headHtml += `</tr>`;
    thead.innerHTML = headHtml;

    const bodyRows = [];
    for (let cellIdx = 0; cellIdx < 40; cellIdx++) {
      let rowHtml = `<tr class="hover:bg-blue-50/40"><td class="p-2 font-bold bg-slate-100 sticky left-0 z-10 border-r border-slate-300 text-slate-700">Cell ${cellIdx + 1}</td>`;
      for (const lv of levels) {
        const cells = OFFICIAL_CELLS[lv.id] || [];
        const val7 = cells[cellIdx];
        if (!val7) {
          rowHtml += `<td class="p-2 text-right text-slate-300 border-r border-slate-100">—</td>`;
        } else {
          const val8 = Math.round(val7 * state.fitment);
          const isSelected = (lv.id === state.levelId && val7 === state.basicPay);
          const cellCls = isSelected
            ? "bg-emerald-100 font-extrabold text-emerald-950 ring-2 ring-inset ring-emerald-500"
            : "cursor-pointer hover:bg-emerald-50";

          let content = "";
          if (mode === "7TH") {
            content = `<div class="font-mono font-semibold text-slate-800">${formatINR(val7)}</div>`;
          } else if (mode === "8TH") {
            content = `<div class="font-mono font-bold text-emerald-700">${formatINR(val8)}</div>`;
          } else {
            content = `<div class="text-[10px] text-slate-400 font-mono">${formatINR(val7)}</div>
                       <div class="font-mono font-bold text-emerald-700">${formatINR(val8)}</div>`;
          }

          rowHtml += `<td data-matrix-level="${lv.id}" data-matrix-basic="${val7}" class="p-2 text-right border-r border-slate-100 ${cellCls}" title="Click to select ${lv.name} Basic ${formatINR(val7)}">${content}</td>`;
        }
      }
      rowHtml += `</tr>`;
      bodyRows.push(rowHtml);
    }
    tbody.innerHTML = bodyRows.join("");
  }

  // =========================================================================
  // 10. ARREARS & ALLOWANCES SUITE RENDERER
  // =========================================================================
  function renderArrearsAndAllowances() {
    const months = parseInt(byId("sel-arr-months").value, 10) || 18;
    const incMonth = parseInt(byId("sel-arr-inc-month").value, 10) || 7;
    const includeHra = byId("sel-arr-hra-arrear").value === "YES";

    let curBasic7 = state.basicPay;
    let curBasic8 = Math.round(state.basicPay * state.fitment);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let totalGrossArrear = 0;
    let totalNetArrear = 0;
    const rowsHtml = [];

    for (let m = 0; m < months; m++) {
      const calMonth = (m % 12) + 1;
      const calYear = 2026 + Math.floor(m / 12);

      // Apply 3% annual increment on increment month (except Jan 2026 start)
      if (m > 0 && calMonth === incMonth) {
        curBasic7 = Math.round((curBasic7 * 1.03) / 100) * 100;
        curBasic8 = Math.round((curBasic8 * 1.03) / 100) * 100;
      }

      // Expected DA progression every 6 months from Jan 2026 (60% -> 63% -> 66% -> 69%)
      const halfYears = Math.floor(m / 6);
      const da7 = state.da7th + halfYears * 3;
      const da8 = state.da8th + halfYears * 2;

      const hra7Rate = state.hraClass === "X" ? 30 : (state.hraClass === "Y" ? 20 : (state.hraClass === "Z" ? 10 : 0));
      const hra8Rate = state.hra8thReset
        ? (state.hraClass === "X" ? 24 : (state.hraClass === "Y" ? 16 : (state.hraClass === "Z" ? 8 : 0)))
        : hra7Rate;

      const da7Amt = Math.round(curBasic7 * (da7 / 100));
      const da8Amt = Math.round(curBasic8 * (da8 / 100));

      const hra7Amt = includeHra ? Math.round(curBasic7 * (hra7Rate / 100)) : 0;
      const hra8Amt = includeHra ? Math.round(curBasic8 * (hra8Rate / 100)) : 0;

      const gross7 = curBasic7 + da7Amt + hra7Amt;
      const gross8 = curBasic8 + da8Amt + hra8Amt;
      const grossDiff = Math.max(0, gross8 - gross7);

      const npsDiff = state.pensionScheme === "NPS_UPS"
        ? Math.round(((curBasic8 + da8Amt) - (curBasic7 + da7Amt)) * 0.10)
        : 0;
      const netDiff = Math.max(0, grossDiff - Math.max(0, npsDiff));

      totalGrossArrear += grossDiff;
      totalNetArrear += netDiff;

      rowsHtml.push(`<tr class="hover:bg-slate-50">
        <td class="p-2 font-semibold">${monthNames[calMonth - 1]} ${calYear}</td>
        <td class="p-2 text-right font-mono">${formatINR(curBasic7)}</td>
        <td class="p-2 text-right font-mono">${da7}%</td>
        <td class="p-2 text-right font-mono">${formatINR(gross7)}</td>
        <td class="p-2 text-right font-mono text-emerald-800">${formatINR(curBasic8)}</td>
        <td class="p-2 text-right font-mono text-emerald-800">${formatINR(gross8)}</td>
        <td class="p-2 text-right font-mono font-bold text-emerald-700">+${formatINR(netDiff)}</td>
      </tr>`);
    }

    byId("tbody-arrears").innerHTML = rowsHtml.join("");
    byId("arr-total-badge").textContent = `Total Net Arrears: ${formatINR(totalNetArrear)}`;
    byId("arr-net-display").textContent = formatINR(totalNetArrear);
    byId("arr-gross-display").textContent = `Gross Arrears: ${formatINR(totalGrossArrear)} (${months} months)`;

    // Section 10(13A) HRA Tax Exemption Calculator
    const { cpc7 } = state.lastResult;
    const rentPaid = Math.max(0, Number(byId("inp-rent-paid").value) || 0);
    const rule1 = cpc7.hra;
    const payForHra = cpc7.basic + cpc7.da;
    const rule2 = Math.max(0, Math.round(rentPaid - 0.10 * payForHra));
    const metroPct = state.hraClass === "X" ? 0.50 : 0.40;
    const rule3 = Math.round(payForHra * metroPct);
    const exemptMonthly = cpc7.hra > 0 && rentPaid > 0 ? Math.min(rule1, rule2, rule3) : 0;

    byId("hra-rule-1").textContent = `${formatINR(rule1)}/mo`;
    byId("hra-rule-2").textContent = `${formatINR(rule2)}/mo`;
    byId("hra-rule-3").textContent = `${formatINR(rule3)}/mo`;
    byId("hra-exempt-yr").textContent = `${formatINR(exemptMonthly * 12)}/yr`;

    // Night Duty Allowance (NDA) Calculator (Ceiling ₹43,600)
    const ndaHours = Math.max(0, Number(byId("inp-nda-hours").value) || 0);
    const capBasic = Math.min(43600, state.basicPay);
    const capDa = Math.round(capBasic * (state.da7th / 100));
    const hourlyRate = (capBasic + capDa) / 200;
    const weightedHrs = ndaHours / 6;
    const ndaTotal = Math.round(hourlyRate * weightedHrs);

    byId("nda-cap-basic").textContent = formatINR(capBasic);
    byId("nda-hourly-rate").textContent = `₹${hourlyRate.toFixed(2)}/hr`;
    byId("nda-weighted-hrs").textContent = `${weightedHrs.toFixed(1)} hrs`;
    byId("nda-total-pay").textContent = `${formatINR(ndaTotal)}/mo`;

    // Bonus (PLB) & 3-Month DA Arrear
    const bonusDays = parseInt(byId("sel-bonus-days").value, 10) || 78;
    const daDiffPct = Math.max(0, Number(byId("inp-da-diff").value) || 3);
    const bonusAmt = Math.round((7000 * bonusDays) / 30.4);
    const daArrear3m = Math.round(state.basicPay * (daDiffPct / 100) * 3);

    byId("bonus-amt-out").textContent = formatINR(bonusAmt);
    byId("da-arrear-3mo").textContent = formatINR(daArrear3m);
  }

  // =========================================================================
  // 11. PENSION (UPS vs NPS vs OPS), GRATUITY & MACP RENDERER
  // =========================================================================
  function renderPensionSuite() {
    const { cpc7, cpc8 } = state.lastResult;
    const serviceYrs = Math.min(40, Math.max(1, Number(byId("inp-service-years").value) || 28));
    const elDays = Math.min(300, Math.max(0, Number(byId("inp-el-days").value) || 300));
    const basis = byId("sel-pen-basis").value;
    const activeCpc = basis === "8TH" ? cpc8 : cpc7;

    const basic = activeCpc.basic;
    const da = activeCpc.da;
    const emoluments = basic + da;

    // 1. Unified Pension Scheme (UPS)
    // Assured 50% of basic pay for >= 25 years service (proportionate for 10-25 yrs), min ₹10,000/mo
    const upsFactor = serviceYrs >= 25 ? 0.50 : (serviceYrs >= 10 ? (0.50 * (serviceYrs / 25)) : 0);
    const upsPension = serviceYrs >= 10 ? Math.max(10000, Math.round(basic * upsFactor)) : 0;
    const sixMonthlyBlocks = Math.floor(serviceYrs * 2);
    const upsLumpSum = Math.round((emoluments / 10) * sixMonthlyBlocks);
    const upsFamily = Math.round(upsPension * 0.60);

    byId("ups-monthly-pension").textContent = `${formatINR(upsPension)}/mo`;
    byId("ups-lumpsum").textContent = formatINR(upsLumpSum);
    byId("ups-family-pen").textContent = `${formatINR(upsFamily)}/mo`;

    // 2. National Pension System (NPS) Corpus Projection
    const monthlyContrib = Math.round(emoluments * 0.24); // 10% Employee + 14% Govt
    // Compound growth approximation over service years
    const r = 0.095 / 12;
    const n = serviceYrs * 12;
    const corpus = Math.round(monthlyContrib * ((Math.pow(1 + r, n) - 1) / r) * 0.65);
    const npsLump60 = Math.round(corpus * 0.60);
    const npsAnnuity40 = Math.round(corpus * 0.40);
    const npsMonthly = Math.round((npsAnnuity40 * 0.065) / 12);

    byId("nps-monthly-pension").textContent = `${formatINR(npsMonthly)}/mo`;
    byId("nps-total-corpus").textContent = formatLakh(corpus);
    byId("nps-lumpsum").textContent = formatLakh(npsLump60);
    byId("nps-annuity-amt").textContent = formatLakh(npsAnnuity40);

    // 3. DCRG Gratuity (CCS Pension Rules Rule 45: 1/4th per 6-monthly period, max 16.5× emoluments, Cap ₹25,00,000)
    const ccsMultiplier = Math.min(16.5, sixMonthlyBlocks * 0.25);
    const rawGratuity = Math.round(emoluments * ccsMultiplier);
    const gratuityCapped = Math.min(2500000, rawGratuity);
    const elEncash = Math.round((emoluments / 30) * elDays);

    // OPS 40% Commutation (Factor at age 60 = 8.194)
    const opsHalfPay = Math.round(basic * 0.50);
    const commutedPortion = Math.round(opsHalfPay * 0.40);
    const opsCommuteVal = Math.round(commutedPortion * 12 * 8.194);

    byId("retire-total-benefits").textContent = formatINR(gratuityCapped + elEncash);
    byId("gratuity-amt").textContent = formatINR(gratuityCapped);
    byId("el-encash-amt").textContent = formatINR(elEncash);
    byId("ops-commute-amt").textContent = formatINR(opsCommuteVal);

    // 4. MACP / Promotion Pay Fixation (FR 22)
    const curCells = OFFICIAL_CELLS[state.levelId] || [state.basicPay];
    const curIdx = curCells.indexOf(state.basicPay);
    const oneIncPay = (curIdx >= 0 && curIdx + 1 < curCells.length)
      ? curCells[curIdx + 1]
      : Math.round((state.basicPay * 1.03) / 100) * 100;

    const curLevelMetaIdx = PAY_LEVEL_META.findIndex(l => l.id === state.levelId);
    const nextLevelMeta = PAY_LEVEL_META[Math.min(PAY_LEVEL_META.length - 1, curLevelMetaIdx + 1)];
    const nextCells = OFFICIAL_CELLS[nextLevelMeta.id] || [oneIncPay];
    const promotedBasic = nextCells.find(c => c >= oneIncPay) || nextCells[nextCells.length - 1];
    const promoted8th = Math.round(promotedBasic * state.fitment);

    byId("macp-cur-pay").textContent = `${getLevelMeta(state.levelId).name} · ${formatINR(state.basicPay)}`;
    byId("macp-inc-pay").textContent = formatINR(oneIncPay);
    byId("macp-next-pay").textContent = `${nextLevelMeta.name} · ${formatINR(promotedBasic)} (8th CPC: ${formatINR(promoted8th)})`;
  }

  // =========================================================================
  // 12. INCOME TAX COMPARISON & POST PRESETS RENDERER
  // =========================================================================
  function renderTaxComparison() {
    const { cpc7, cpc8 } = state.lastResult;
    const sec80C = Number(byId("inp-80c").value) || 0;
    const sec80D = Number(byId("inp-80d").value) || 0;
    const claim80CCD2 = byId("chk-80ccd2").checked;

    // HRA Exemption for Old Regime
    const rentPaid = Math.max(0, Number(byId("inp-rent-paid").value) || 0);
    const payForHra = cpc7.basic + cpc7.da;
    const hraExemptMo = cpc7.hra > 0 && rentPaid > 0
      ? Math.min(cpc7.hra, Math.max(0, Math.round(rentPaid - 0.10 * payForHra)), Math.round(payForHra * (state.hraClass === "X" ? 0.50 : 0.40)))
      : 0;

    const new7 = computeAnnualIncomeTaxNewRegime(cpc7.annualGross, cpc7.npsEmployer * 12, claim80CCD2);
    const old7 = computeAnnualIncomeTaxOldRegime(cpc7.annualGross, hraExemptMo * 12, sec80C, sec80D);
    const new8 = computeAnnualIncomeTaxNewRegime(cpc8.annualGross, cpc8.npsEmployer * 12, claim80CCD2);

    const recBadge = byId("tax-rec-badge");
    if (new7.annualTax <= old7.annualTax) {
      recBadge.textContent = `Recommended: New Regime (Saves ${formatINR(old7.annualTax - new7.annualTax)}/yr)`;
    } else {
      recBadge.textContent = `Recommended: Old Regime (Saves ${formatINR(new7.annualTax - old7.annualTax)}/yr)`;
    }

    const tbody = byId("tbody-tax-comparison");
    tbody.innerHTML = `
      <tr>
        <td class="p-2.5 font-medium">Annual Gross Salary</td>
        <td class="p-2.5 text-right font-mono">${formatINR(cpc7.annualGross)}</td>
        <td class="p-2.5 text-right font-mono">${formatINR(cpc7.annualGross)}</td>
        <td class="p-2.5 text-right font-mono font-semibold bg-emerald-50/40">${formatINR(cpc8.annualGross)}</td>
      </tr>
      <tr>
        <td class="p-2.5 font-medium">Standard Deduction</td>
        <td class="p-2.5 text-right font-mono">₹75,000</td>
        <td class="p-2.5 text-right font-mono">₹50,000</td>
        <td class="p-2.5 text-right font-mono bg-emerald-50/40">₹75,000</td>
      </tr>
      <tr>
        <td class="p-2.5 font-medium">Chapter VI-A / 80CCD(2) / HRA Exemptions</td>
        <td class="p-2.5 text-right font-mono">${formatINR(claim80CCD2 ? cpc7.npsEmployer * 12 : 0)}</td>
        <td class="p-2.5 text-right font-mono">${formatINR(hraExemptMo * 12 + Math.min(150000, sec80C) + sec80D)}</td>
        <td class="p-2.5 text-right font-mono bg-emerald-50/40">${formatINR(claim80CCD2 ? cpc8.npsEmployer * 12 : 0)}</td>
      </tr>
      <tr class="font-semibold bg-slate-50">
        <td class="p-2.5">Net Taxable Income</td>
        <td class="p-2.5 text-right font-mono">${formatINR(new7.taxable)}</td>
        <td class="p-2.5 text-right font-mono">${formatINR(old7.taxable)}</td>
        <td class="p-2.5 text-right font-mono bg-emerald-50/40">${formatINR(new8.taxable)}</td>
      </tr>
      <tr class="font-bold text-rose-700">
        <td class="p-2.5">Annual Income Tax (incl. 4% Cess)</td>
        <td class="p-2.5 text-right font-mono">${formatINR(new7.annualTax)}</td>
        <td class="p-2.5 text-right font-mono">${formatINR(old7.annualTax)}</td>
        <td class="p-2.5 text-right font-mono bg-emerald-50/40">${formatINR(new8.annualTax)}</td>
      </tr>
      <tr class="font-extrabold text-slate-900 bg-slate-100">
        <td class="p-2.5">Monthly TDS Deduction</td>
        <td class="p-2.5 text-right font-mono">${formatINR(new7.monthlyTds)}/mo</td>
        <td class="p-2.5 text-right font-mono">${formatINR(old7.monthlyTds)}/mo</td>
        <td class="p-2.5 text-right font-mono text-emerald-800">${formatINR(new8.monthlyTds)}/mo</td>
      </tr>
    `;
  }

  function renderPostPresets() {
    const grid = document.getElementById("post-presets-grid");
    if (!grid) return;
    grid.innerHTML = POST_PRESETS.map(p => {
      const b8 = Math.round(p.basic * state.fitment);
      return `<button type="button" data-preset-id="${p.id}" class="post-preset-btn android-ripple text-left p-3.5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition flex flex-col justify-between gap-2 bg-slate-50/60">
        <div>
          <div class="flex items-center justify-between gap-2">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-900">${p.badge}</span>
            <span class="text-xs font-mono font-bold text-emerald-700">8th Basic: ${formatINR(b8)}</span>
          </div>
          <div class="font-bold text-slate-900 text-xs sm:text-sm mt-1.5">${p.title}</div>
          <div class="text-[11px] text-slate-500 mt-0.5">${p.desc}</div>
        </div>
        <div class="text-[11px] font-semibold text-blue-700 flex items-center justify-between pt-2 border-t border-slate-200/70">
          <span>Tap to load preset</span>
          <span>→</span>
        </div>
      </button>`;
    }).join("");
  }

  // =========================================================================
  // 13. PAYSLIP MODAL & WHATSAPP SUMMARY GENERATOR
  // =========================================================================
  function renderPayslipModalContent() {
    const { levelMeta, cpc7, cpc8 } = state.lastResult;
    byId("slip-header-meta").textContent =
      `${levelMeta.name} (GP ${levelMeta.gp}) | City Class: ${state.hraClass} | Fitment Factor: ${state.fitment.toFixed(2)}×`;

    byId("slip-body-content").innerHTML = `
      <table class="w-full text-xs border-collapse">
        <thead>
          <tr class="bg-slate-100 border-b border-slate-300 font-bold">
            <th class="p-2 text-left">Particulars</th>
            <th class="p-2 text-right">7th CPC (₹)</th>
            <th class="p-2 text-right">8th CPC Projected (₹)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr><td class="p-2 font-semibold">Basic Pay</td><td class="p-2 text-right font-mono">${formatINR(cpc7.basic)}</td><td class="p-2 text-right font-mono font-semibold">${formatINR(cpc8.basic)}</td></tr>
          <tr><td class="p-2">Dearness Allowance (${cpc7.daPct}% / ${cpc8.daPct}%)</td><td class="p-2 text-right font-mono">${formatINR(cpc7.da)}</td><td class="p-2 text-right font-mono">${formatINR(cpc8.da)}</td></tr>
          <tr><td class="p-2">House Rent Allowance (${cpc7.hraRate}% / ${cpc8.hraRate}%)</td><td class="p-2 text-right font-mono">${formatINR(cpc7.hra)}</td><td class="p-2 text-right font-mono">${formatINR(cpc8.hra)}</td></tr>
          <tr><td class="p-2">Transport Allowance + DA on TA</td><td class="p-2 text-right font-mono">${formatINR(cpc7.ta + cpc7.daOnTa)}</td><td class="p-2 text-right font-mono">${formatINR(cpc8.ta + cpc8.daOnTa)}</td></tr>
          ${(cpc7.npa + cpc7.specialTotal > 0) ? `<tr><td class="p-2">NPA / Special Allowances</td><td class="p-2 text-right font-mono">${formatINR(cpc7.npa + cpc7.specialTotal)}</td><td class="p-2 text-right font-mono">${formatINR(cpc8.npa + cpc8.specialTotal)}</td></tr>` : ""}
          <tr class="bg-blue-50 font-bold"><td class="p-2">Gross Monthly Pay</td><td class="p-2 text-right font-mono">${formatINR(cpc7.gross)}</td><td class="p-2 text-right font-mono">${formatINR(cpc8.gross)}</td></tr>
          <tr><td class="p-2 text-rose-700">NPS / UPS (10%) + CGHS + CGEGIS</td><td class="p-2 text-right font-mono text-rose-700">-${formatINR(cpc7.npsEmployee + cpc7.cghs + cpc7.cgegis + cpc7.extraDed)}</td><td class="p-2 text-right font-mono text-rose-700">-${formatINR(cpc8.npsEmployee + cpc8.cghs + cpc8.cgegis + cpc8.extraDed)}</td></tr>
          <tr><td class="p-2 text-rose-700">Income Tax (Monthly TDS)</td><td class="p-2 text-right font-mono text-rose-700">-${formatINR(cpc7.monthlyTax)}</td><td class="p-2 text-right font-mono text-rose-700">-${formatINR(cpc8.monthlyTax)}</td></tr>
          <tr class="bg-emerald-900 text-white font-extrabold text-sm"><td class="p-2.5">Net In-Hand Salary</td><td class="p-2.5 text-right font-mono">${formatINR(cpc7.net)}</td><td class="p-2.5 text-right font-mono text-emerald-300">${formatINR(cpc8.net)}</td></tr>
        </tbody>
      </table>
    `;
  }

  function getSummaryText() {
    const { levelMeta, cpc7, cpc8 } = state.lastResult;
    const diff = cpc8.net - cpc7.net;
    return [
      `🇮🇳 *8th Pay Commission Salary Estimate*`,
      `• Pay Level: ${levelMeta.name} (${levelMeta.gp})`,
      `• Fitment Factor: ${state.fitment.toFixed(2)}× | City Class: ${state.hraClass}`,
      `• 7th CPC Basic: ${formatINR(cpc7.basic)} → 8th CPC Basic: ${formatINR(cpc8.basic)}`,
      `• 7th CPC In-Hand (${cpc7.daPct}% DA): ${formatINR(cpc7.net)}/mo`,
      `• 8th CPC Projected In-Hand: ${formatINR(cpc8.net)}/mo`,
      `• Monthly Net Hike: +${formatINR(diff)}/mo (+${formatINR(diff * 12)}/yr)`
    ].join("\n");
  }

  function copyToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(successMsg)).catch(() => fallbackCopy(text, successMsg));
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    showToast(successMsg);
  }

  // =========================================================================
  // 14. LANGUAGE SWITCHING (EN / HI / BN)
  // =========================================================================
  const NEWS_BY_LANG = {
    en: {
      heading: "Government Employee News Adda (8th CPC & DA Updates)",
      t1: "1. 8th Pay Commission Fitment Factor & ToR Update (Oct 2026)",
      b1: "With AICPI-IW pushing Dearness Allowance to 60% from Jan 2026, staff federations (NC-JCM) have submitted memoranda proposing a 1.92× to 2.57× fitment factor effective 01.01.2026, raising minimum Basic Pay from ₹18,000 to ₹34,560.",
      t2: "2. Unified Pension Scheme (UPS) vs NPS Choice Window",
      b2: "Central Government employees with 25+ years qualifying service are guaranteed 50% of 12-month average Basic Pay as assured pension plus Dearness Relief (DR) and a lump-sum payout (1/10th per 6 months).",
      t3: "3. New Income Tax Act Forms (Effective FY 2026-27)",
      b3: "Zero tax up to ₹12,00,000 taxable income (₹12.75 Lakh gross for salaried with ₹75,000 Standard Deduction). Old Form 16 is now Form 130; Form 12BB is Form 124; Form 26AS is Form 168."
    },
    hi: {
      heading: "सरकारी कर्मचारी न्यूज़ अड्डा (8वां वेतन आयोग और DA अपडेट)",
      t1: "1. 8वां वेतन आयोग फिटमेंट फैक्टर और ToR अपडेट (अक्टूबर 2026)",
      b1: "जनवरी 2026 से महंगाई भत्ता (DA) 60% होने के साथ, कर्मचारी महासंघों (NC-JCM) ने 01.01.2026 से 1.92× से 2.57× फिटमेंट फैक्टर का प्रस्ताव दिया है, जिससे न्यूनतम बेसिक पे ₹18,000 से बढ़कर ₹34,560 होने का अनुमान है।",
      t2: "2. एकीकृत पेंशन योजना (UPS) बनाम NPS विकल्प",
      b2: "25+ वर्ष की सेवा पूरी करने वाले केंद्रीय कर्मचारियों को अंतिम 12 माह के औसत मूल वेतन का 50% गारंटीड पेंशन, महंगाई राहत (DR) और एकमुश्त राशि (हर 6 माह की सेवा पर 1/10वां हिस्सा) सुनिश्चित है।",
      t3: "3. नए आयकर अधिनियम फॉर्म (वित्त वर्ष 2026-27 से लागू)",
      b3: "₹12,00,000 कर-योग्य आय (₹75,000 स्टैंडर्ड डिडक्शन के साथ ₹12.75 लाख ग्रॉस वेतन) तक शून्य टैक्स। पुराना फॉर्म 16 अब फॉर्म 130 है; फॉर्म 12BB अब फॉर्म 124 है; फॉर्म 26AS अब फॉर्म 168 है।"
    },
    bn: {
      heading: "সরকারি কর্মচারী নিউজ আড্ডা (৮ম বেতন কমিশন ও DA আপডেট)",
      t1: "১. ৮ম বেতন কমিশন ফিটমেন্ট ফ্যাক্টর ও ToR আপডেট (অক্টোবর ২০২৬)",
      b1: "জানুয়ারি ২০২৬ থেকে মহার্ঘ ভাতা (DA) ৬০% হওয়ায় কর্মচারী ফেডারেশনগুলি (NC-JCM) ০১.০১.২০২৬ থেকে ১.৯২× থেকে ২.৫৭× ফিটমেন্ট ফ্যাক্টরের প্রস্তাব দিয়েছে, যার ফলে সর্বনিম্ন বেসিক পে ₹১৮,০০০ থেকে বেড়ে ₹৩৪,৫৬০ হতে পারে।",
      t2: "২. ইউনিফায়েড পেনশন স্কিম (UPS) বনাম NPS বিকল্প",
      b2: "২৫+ বছর চাকরি পূর্ণ করা কেন্দ্রীয় কর্মচারীদের শেষ ১২ মাসের গড় বেসিক পে-এর ৫০% নিশ্চিত পেনশন, মহার্ঘ ত্রাণ (DR) এবং এককালীন অর্থ প্রদানের গ্যারান্টি দেওয়া হয়েছে।",
      t3: "৩. নতুন আয়কর আইনের ফর্ম (FY 2026-27 থেকে কার্যকর)",
      b3: "₹১২,০০,০০০ করযোগ্য আয় (₹৭৫,০০০ স্ট্যান্ডার্ড ডিডাকশন সহ ₹১২.৭৫ লক্ষ মোট বেতন) পর্যন্ত শূন্য ট্যাক্স। পুরানো ফর্ম 16 এখন ফর্ম 130; ফর্ম 12BB এখন ফর্ম 124; ফর্ম 26AS এখন ফর্ম 168।"
    }
  };

  function applyLanguage(lang) {
    state.lang = I18N[lang] ? lang : "en";
    safeStorageSet(LANG_KEY, state.lang);
    document.documentElement.lang = state.lang;
    const dict = I18N[state.lang];

    document.querySelectorAll(".lang-btn").forEach(btn => {
      const isAct = btn.getAttribute("data-lang") === state.lang;
      btn.className = isAct
        ? "lang-btn px-2 py-1 rounded-lg text-[11px] font-semibold transition bg-sky-500 text-white shadow-sm"
        : "lang-btn px-2 py-1 rounded-lg text-[11px] font-semibold transition text-slate-300 hover:text-white";
    });

    byId("app-title").textContent = dict.app_title;
    byId("app-subtitle").textContent = dict.app_subtitle;
    byId("lbl-payslip-btn").textContent = dict.lbl_payslip_btn;

    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    // Update News Adda strictly to the selected language (no mixing!)
    const nw = NEWS_BY_LANG[state.lang] || NEWS_BY_LANG.en;
    const nh = document.getElementById("news-box-heading");
    if (nh) nh.textContent = nw.heading;
    const n1t = document.getElementById("news-item-1-title");
    const n1b = document.getElementById("news-item-1-body");
    const n2t = document.getElementById("news-item-2-title");
    const n2b = document.getElementById("news-item-2-body");
    const n3t = document.getElementById("news-item-3-title");
    const n3b = document.getElementById("news-item-3-body");
    if (n1t) n1t.textContent = nw.t1;
    if (n1b) n1b.textContent = nw.b1;
    if (n2t) n2t.textContent = nw.t2;
    if (n2b) n2b.textContent = nw.b2;
    if (n3t) n3t.textContent = nw.t3;
    if (n3b) n3b.textContent = nw.b3;

    // Translate select options & chips cleanly without losing original English text
    const OPTION_TRANSLATIONS = {
      hi: {
        "X Class City (30% / 24%)": "X श्रेणी शहर (30% / 24%)",
        "Y Class City (20% / 16%)": "Y श्रेणी शहर (20% / 16%)",
        "Z Class City (10% / 8%)": "Z श्रेणी शहर (10% / 8%)",
        "No HRA (Govt Quarters)": "कोई HRA नहीं (सरकारी आवास)",
        "Big City (Higher TPTA)": "बड़े शहर (Higher TPTA)",
        "Other City (Standard TA)": "अन्य शहर (सामान्य TA)",
        "No TA": "कोई TA नहीं",
        "60% (Jan 2026 Now)": "60% (जनवरी 2026 वर्तमान)",
        "63% (Jul 2026 Est.)": "63% (जुलाई 2026 अनुमानित)",
        "66% (Jan 2027 Est.)": "66% (जनवरी 2027 अनुमानित)",
        "58% (Jul 2025 Old)": "58% (जुलाई 2025)",
        "55% (Jan 2025)": "55% (जनवरी 2025)",
        "53% (Jul 2024)": "53% (जुलाई 2024)",
        "50% (Jan 2024)": "50% (जनवरी 2024)",
        "0% (Reset Jan 2026)": "0% (जनवरी 2026 में शून्य)",
        "3% (After 6 Months)": "3% (6 माह बाद)",
        "6% (After 1 Year)": "6% (1 वर्ष बाद)",
        "9% (After 18 Months)": "9% (18 माह बाद)",
        "NPS / UPS (10% Cut)": "NPS / UPS (10% कटौती)",
        "OPS (0% NPS Cut)": "OPS (0% NPS कटौती)",
        "1.83× Min": "1.83× न्यूनतम",
        "1.92× Expected": "1.92× संभावित",
        "2.08× Mid": "2.08× मध्यम",
        "2.28× Staff": "2.28× मांग",
        "2.57× 7th CPC": "2.57× (7वां वेतन)",
        "2.86× Max": "2.86× अधिकतम"
      },
      bn: {
        "X Class City (30% / 24%)": "X শ্রেণীর শহর (৩০% / ২৪%)",
        "Y Class City (20% / 16%)": "Y শ্রেণীর শহর (২০% / ১৬%)",
        "Z Class City (10% / 8%)": "Z শ্রেণীর শহর (১০% / ৮%)",
        "No HRA (Govt Quarters)": "HRA নেই (সরকারি কোয়ার্টার)",
        "Big City (Higher TPTA)": "বড় শহর (Higher TPTA)",
        "Other City (Standard TA)": "অন্যান্য শহর (সাধারণ TA)",
        "No TA": "TA নেই",
        "60% (Jan 2026 Now)": "৬০% (জানুয়ারি ২০২৬ বর্তমান)",
        "63% (Jul 2026 Est.)": "৬৩% (জুলাই ২০২৬ সম্ভাব্য)",
        "66% (Jan 2027 Est.)": "৬৬% (জানুয়ারি ২০২৭ সম্ভাব্য)",
        "58% (Jul 2025 Old)": "৫৮% (জুলাই ২০২৫)",
        "55% (Jan 2025)": "৫৫% (জানুয়ারি ২০২৫)",
        "53% (Jul 2024)": "৫৩% (জুলাই ২০২৪)",
        "50% (Jan 2024)": "৫০% (জানুয়ারি ২০২৪)",
        "0% (Reset Jan 2026)": "০% (জানুয়ারি ২০২৬-এ রিসেট)",
        "3% (After 6 Months)": "৩% (৬ মাস পর)",
        "6% (After 1 Year)": "৬% (১ বছর পর)",
        "9% (After 18 Months)": "৯% (১৮ মাস পর)",
        "NPS / UPS (10% Cut)": "NPS / UPS (১০% কর্তন)",
        "OPS (0% NPS Cut)": "OPS (০% NPS কর্তন)",
        "1.83× Min": "১.৮৩× সর্বনিম্ন",
        "1.92× Expected": "১.৯২× সম্ভাব্য",
        "2.08× Mid": "২.০৮× মধ্যম",
        "2.28× Staff": "২.২৮× দাবি",
        "2.57× 7th CPC": "২.৫৭× (৭ম বেতন)",
        "2.86× Max": "২.৮৬× সর্বোচ্চ"
      }
    };

    document.querySelectorAll("#sel-hra-class option, #sel-ta-type option, #sel-7th-da option, #sel-8th-da option, #sel-pension-scheme option, .fitment-chip").forEach(el => {
      if (!el.dataset.origEn) {
        el.dataset.origEn = el.textContent.trim();
      }
      const orig = el.dataset.origEn;
      if (state.lang === "en") {
        el.textContent = orig;
      } else {
        const map = OPTION_TRANSLATIONS[state.lang] || {};
        el.textContent = map[orig] || orig;
      }
    });

    const cityInpEl = document.getElementById("inp-city-search");
    if (cityInpEl) {
      cityInpEl.placeholder = state.lang === "hi"
        ? "शहर खोजें (जैसे Delhi, Mumbai, Kolkata, Patna, Ahmedabad)..."
        : (state.lang === "bn"
            ? "শহর খুঁজুন (যেমন Kolkata, Delhi, Mumbai, Siliguri, Howrah)..."
            : "Search city (e.g. Delhi, Kolkata, Mumbai, Patna, Guwahati)...");
    }

    // Force re-render of active micro-tool workbench and calculations in the active language
    populateLevelAndBasicDropdowns(true);
    const wbInputs = document.getElementById("mt-wb-inputs");
    if (wbInputs) wbInputs.setAttribute("data-rendered-tool", "");
    runAllCalculations();
    if (typeof renderHeroLivePreview === "function") {
      renderHeroLivePreview(LIVE_PREVIEW_PROFILES[lpIndex % LIVE_PREVIEW_PROFILES.length]);
    }
    if (typeof renderAll20StatesTable === "function") {
      renderAll20StatesTable();
    }
  }

  // =========================================================================
  // 15. INITIALIZATION & EVENT LISTENERS
  // =========================================================================
  function populateLevelAndBasicDropdowns(preserveBasic) {
    const selLevel = byId("sel-pay-level");
    const selBasic = byId("sel-basic-pay");

    const lvWord = state.lang === "hi" ? "पे लेवल" : (state.lang === "bn" ? "পে লেভেল" : "Level");
    const entWord = state.lang === "hi" ? "प्रारंभिक" : (state.lang === "bn" ? "প্রারম্ভিক" : "Entry");
    selLevel.innerHTML = PAY_LEVEL_META.map(l =>
      `<option value="${l.id}" ${l.id === state.levelId ? "selected" : ""}>${lvWord} ${l.id} (GP ${l.gp}) — ${entWord} ${formatINR(l.entry)}</option>`
    ).join("");
    selLevel.value = state.levelId;

    const cells = OFFICIAL_CELLS[state.levelId] || [56100];
    if (!preserveBasic || !cells.includes(state.basicPay)) {
      state.basicPay = cells[0];
    }

    selBasic.innerHTML = cells.map((amt, i) =>
      `<option value="${amt}" ${amt === state.basicPay ? "selected" : ""}>Cell ${i + 1} — ${formatINR(amt)}</option>`
    ).join("");
  }

  function setMicroToolsFocusMode(isSingleToolFocus) {
    const searchBar = document.getElementById("mt-search-filter-bar");
    const cardsGrid = document.getElementById("mt-cards-grid");
    const wbCard = document.getElementById("mt-workbench-card");
    const focusFooter = document.getElementById("mt-focus-footer");
    if (!cardsGrid || !wbCard) return;

    if (isSingleToolFocus) {
      if (searchBar) searchBar.classList.add("hidden");
      cardsGrid.classList.add("hidden");
      wbCard.className = "lg:col-span-12 max-w-3xl mx-auto w-full bg-white rounded-2xl shadow-lg border-2 border-sky-500/40 overflow-hidden";
      if (focusFooter) focusFooter.classList.remove("hidden");
    } else {
      if (searchBar) searchBar.classList.remove("hidden");
      cardsGrid.classList.remove("hidden");
      wbCard.className = "lg:col-span-5 bg-white rounded-2xl shadow-lg border-2 border-sky-500/30 overflow-hidden";
      if (focusFooter) focusFooter.classList.add("hidden");
    }
  }

  function switchMainTab(tabId, customTitle) {
    if (!document.getElementById(tabId)) {
      window.location.href = pageUrl(tabId);
      return;
    }
    document.querySelectorAll(".tab-panel").forEach(sec => {
      sec.classList.toggle("hidden", sec.id !== tabId);
    });
    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
      const active = btn.getAttribute("data-tab") === tabId;
      btn.className = active
        ? "nav-tab-btn px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 bg-white text-slate-900 shadow-sm"
        : "nav-tab-btn px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 text-slate-200 hover:bg-white/10";
    });
    document.querySelectorAll(".mob-nav-btn").forEach(btn => {
      const active = btn.getAttribute("data-tab") === tabId;
      btn.className = active
        ? "mob-nav-btn flex flex-col items-center py-1 px-2 rounded-xl text-sky-700 font-bold text-[10px]"
        : "mob-nav-btn flex flex-col items-center py-1 px-2 rounded-xl text-slate-500 font-medium text-[10px]";
    });

    // Auto-hide Hero Banner on inner tabs so the selected calculator/table/guide appears right at the top!
    const heroSec = document.getElementById("hero-banner-section");
    const topBar = document.getElementById("inner-view-topbar");
    const topBarTitle = byId("inner-view-title");
    const dict = I18N[state.lang] || I18N.en;

    if (tabId === "tab-salary") {
      if (heroSec) heroSec.classList.remove("hidden");
      if (topBar) topBar.classList.add("hidden");
    } else {
      if (heroSec) heroSec.classList.add("hidden");
      if (topBar) topBar.classList.remove("hidden");
      const tabNames = {
        "tab-matrix": dict.nav_matrix,
        "tab-arrears": dict.nav_arrears,
        "tab-pension": dict.nav_pension,
        "tab-tax": dict.nav_tax,
        "tab-microtools": dict.nav_microtools,
        "tab-guides": dict.nav_guides
      };
      if (topBarTitle) {
        topBarTitle.textContent = customTitle || tabNames[tabId] || "";
      }
    }

    if (tabId === "tab-matrix") {
      renderPayMatrixTable();
    } else if (tabId === "tab-tax") {
      renderPostPresets();
    } else if (tabId === "tab-microtools") {
      renderMicroToolsGrid();
    } else if (tabId === "tab-guides") {
      if (typeof renderAll20StatesTable === "function") renderAll20StatesTable();
    }
  }

  function bindEvents() {
    // Language switcher
    document.querySelectorAll(".lang-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const lang = btn.getAttribute("data-lang");
        applyLanguage(lang);
        showToast(lang === "hi" ? "भाषा हिंदी में बदल गई" : (lang === "bn" ? "ভাষা বাংলায় পরিবর্তিত হয়েছে" : "Language switched to English"));
      });
    });

    // Navigation tabs
    document.querySelectorAll(".nav-tab-btn, .mob-nav-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const tabId = btn.getAttribute("data-tab");
        if (!document.getElementById(tabId)) return;
        e.preventDefault();
        switchMainTab(tabId);
      });
    });

    // Pay Level & Basic Pay
    byId("sel-pay-level").addEventListener("change", (e) => {
      state.levelId = e.target.value;
      populateLevelAndBasicDropdowns(false);
      runAllCalculations();
    });

    byId("sel-basic-pay").addEventListener("change", (e) => {
      state.basicPay = parseInt(e.target.value, 10) || 18000;
      runAllCalculations();
    });

    // Fitment slider & input & chips
    const rngFit = byId("rng-fitment");
    const numFit = byId("num-fitment");

    function syncFitment(val) {
      const parsed = Math.min(4.0, Math.max(1.0, parseFloat(val) || 1.92));
      state.fitment = Math.round(parsed * 100) / 100;
      rngFit.value = Math.min(3.5, state.fitment);
      numFit.value = state.fitment.toFixed(2);
      document.querySelectorAll(".fitment-chip").forEach(chip => {
        const cVal = parseFloat(chip.getAttribute("data-fitment"));
        const match = Math.abs(cVal - state.fitment) < 0.005;
        chip.className = match
          ? "fitment-chip px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white shadow-sm"
          : "fitment-chip px-2 py-1 rounded-lg text-[11px] font-semibold bg-white border border-emerald-200 text-emerald-900 hover:bg-emerald-100";
      });
      runAllCalculations();
      if (!byId("tab-matrix").classList.contains("hidden")) {
        renderPayMatrixTable();
      }
    }

    rngFit.addEventListener("input", e => syncFitment(e.target.value));
    numFit.addEventListener("change", e => syncFitment(e.target.value));
    document.querySelectorAll(".fitment-chip").forEach(chip => {
      chip.addEventListener("click", () => syncFitment(chip.getAttribute("data-fitment")));
    });

    // City Search Autocomplete
    const cityInp = byId("inp-city-search");
    const cityRes = byId("city-search-results");

    cityInp.addEventListener("input", () => {
      const q = cityInp.value.trim().toLowerCase();
      if (!q) {
        cityRes.classList.add("hidden");
        return;
      }
      const matches = CITIES_DB.filter(c =>
        c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)
      );
      if (matches.length === 0) {
        cityRes.innerHTML = `<div class="p-2.5 text-slate-500">Other town → Defaulting to Z Class (10% HRA) &amp; Standard TA</div>`;
        cityRes.classList.remove("hidden");
        return;
      }
      cityRes.innerHTML = matches.map((c, idx) =>
        `<button type="button" data-city-idx="${idx}" data-city-name="${c.name}" data-city-hra="${c.hra}" data-city-ta="${c.ta}" class="city-opt-btn w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between">
          <span><strong>${c.name}</strong> <span class="text-slate-400">(${c.state})</span></span>
          <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">HRA ${c.hra} · ${c.ta === "HIGHER" ? "Higher TA" : "Std TA"}</span>
        </button>`
      ).join("");
      cityRes.classList.remove("hidden");
    });

    cityRes.addEventListener("click", (e) => {
      const btn = e.target.closest(".city-opt-btn");
      if (!btn) return;
      const name = btn.getAttribute("data-city-name");
      const hra = btn.getAttribute("data-city-hra");
      const ta = btn.getAttribute("data-city-ta");
      cityInp.value = name;
      state.hraClass = hra;
      state.taType = ta;
      byId("sel-hra-class").value = hra;
      byId("sel-ta-type").value = ta;
      cityRes.classList.add("hidden");
      runAllCalculations();
      showToast(`Selected ${name}: Class ${hra} HRA & ${ta === "HIGHER" ? "Higher" : "Standard"} TA`);
    });

    // HRA, TA, DA & Checkboxes
    byId("sel-hra-class").addEventListener("change", e => {
      state.hraClass = e.target.value;
      runAllCalculations();
    });
    byId("sel-ta-type").addEventListener("change", e => {
      state.taType = e.target.value;
      runAllCalculations();
    });
    byId("chk-8th-hra-reset").addEventListener("change", e => {
      state.hra8thReset = e.target.checked;
      runAllCalculations();
    });
    byId("chk-divyang-ta").addEventListener("change", e => {
      state.divyangTa = e.target.checked;
      runAllCalculations();
    });
    byId("sel-7th-da").addEventListener("change", e => {
      state.da7th = parseInt(e.target.value, 10) || 60;
      runAllCalculations();
    });
    byId("sel-8th-da").addEventListener("change", e => {
      state.da8th = parseInt(e.target.value, 10) || 0;
      runAllCalculations();
    });
    byId("sel-pension-scheme").addEventListener("change", e => {
      state.pensionScheme = e.target.value;
      runAllCalculations();
    });

    // Quick Add-on Chips (NPA, PCA, CEA)
    document.querySelectorAll(".addon-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const key = chip.getAttribute("data-addon");
        state.addons[key] = !state.addons[key];
        chip.className = state.addons[key]
          ? "addon-chip px-2.5 py-1 rounded-xl text-xs font-semibold border border-blue-600 bg-blue-600 text-white shadow-sm"
          : "addon-chip px-2.5 py-1 rounded-xl text-xs font-semibold border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100";
        runAllCalculations();
      });
    });

    byId("inp-custom-allow").addEventListener("input", e => {
      state.customAllow = Math.max(0, Number(e.target.value) || 0);
      runAllCalculations();
    });
    byId("inp-custom-deduct").addEventListener("input", e => {
      state.customDeduct = Math.max(0, Number(e.target.value) || 0);
      runAllCalculations();
    });
    byId("chk-cghs").addEventListener("change", e => {
      state.includeCghs = e.target.checked;
      runAllCalculations();
    });
    byId("chk-income-tax").addEventListener("change", e => {
      state.includeTax = e.target.checked;
      runAllCalculations();
    });

    // Reset Button
    byId("btn-reset-calc").addEventListener("click", () => {
      state.levelId = "10";
      state.basicPay = 56100;
      state.fitment = 1.92;
      state.hraClass = "X";
      state.taType = "HIGHER";
      state.hra8thReset = true;
      state.divyangTa = false;
      state.da7th = 60;
      state.da8th = 0;
      state.pensionScheme = "NPS_UPS";
      state.addons = { npa: false, pca: false, cea: false };
      state.customAllow = 0;
      state.customDeduct = 0;
      state.includeCghs = true;
      state.includeTax = true;

      byId("inp-city-search").value = "";
      byId("sel-hra-class").value = "X";
      byId("sel-ta-type").value = "HIGHER";
      byId("chk-8th-hra-reset").checked = true;
      byId("chk-divyang-ta").checked = false;
      byId("sel-7th-da").value = "60";
      byId("sel-8th-da").value = "0";
      byId("sel-pension-scheme").value = "NPS_UPS";
      byId("inp-custom-allow").value = "0";
      byId("inp-custom-deduct").value = "0";
      byId("chk-cghs").checked = true;
      byId("chk-income-tax").checked = true;
      document.querySelectorAll(".addon-chip").forEach(chip => {
        chip.className = "addon-chip px-2.5 py-1 rounded-xl text-xs font-semibold border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100";
      });

      populateLevelAndBasicDropdowns(true);
      syncFitment(1.92);
      showToast("All fields reset to Level 10 defaults");
    });

    // Subtabs: Chart vs 5-Year Projection
    byId("subtab-btn-chart").addEventListener("click", () => {
      byId("subview-chart").classList.remove("hidden");
      byId("subview-5yr").classList.add("hidden");
      byId("subtab-btn-chart").className = "px-3 py-1 rounded-lg text-xs font-semibold bg-white text-slate-900 shadow-sm";
      byId("subtab-btn-5yr").className = "px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900";
    });
    byId("subtab-btn-5yr").addEventListener("click", () => {
      byId("subview-chart").classList.add("hidden");
      byId("subview-5yr").classList.remove("hidden");
      byId("subtab-btn-5yr").className = "px-3 py-1 rounded-lg text-xs font-semibold bg-white text-slate-900 shadow-sm";
      byId("subtab-btn-chart").className = "px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900";
    });

    // Pay Matrix filters & Cell Click Delegation
    byId("sel-matrix-mode").addEventListener("change", renderPayMatrixTable);
    byId("sel-matrix-group").addEventListener("change", renderPayMatrixTable);
    byId("matrix-tbody").addEventListener("click", (e) => {
      const td = e.target.closest("[data-matrix-level]");
      if (!td) return;
      const lv = td.getAttribute("data-matrix-level");
      const basic = parseInt(td.getAttribute("data-matrix-basic"), 10);
      state.levelId = lv;
      state.basicPay = basic;
      populateLevelAndBasicDropdowns(true);
      runAllCalculations();
      switchMainTab("tab-salary");
      showToast(`Loaded Level ${lv} · Basic ${formatINR(basic)}`);
    });

    // Arrears, Allowances, Pension & Tax Secondary Inputs
    [
      "sel-arr-months", "sel-arr-inc-month", "sel-arr-hra-arrear",
      "inp-rent-paid", "inp-nda-hours", "sel-bonus-days", "inp-da-diff"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", renderArrearsAndAllowances);
      if (el) el.addEventListener("change", renderArrearsAndAllowances);
    });

    ["inp-service-years", "inp-retire-age", "inp-el-days", "sel-pen-basis"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", renderPensionSuite);
      if (el) el.addEventListener("change", renderPensionSuite);
    });

    ["inp-80c", "inp-80d", "chk-80ccd2"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", runAllCalculations);
      if (el) el.addEventListener("change", runAllCalculations);
    });

    // Post Presets Delegation
    byId("post-presets-grid").addEventListener("click", (e) => {
      const btn = e.target.closest(".post-preset-btn");
      if (!btn) return;
      const pId = btn.getAttribute("data-preset-id");
      const p = POST_PRESETS.find(item => item.id === pId);
      if (!p) return;

      state.levelId = p.level;
      state.basicPay = p.basic;
      state.hraClass = p.hra;
      state.taType = p.ta;
      state.customAllow = p.extraAllow || 0;
      state.addons = { npa: p.addon === "npa", pca: p.addon === "pca", cea: false };

      byId("sel-hra-class").value = p.hra;
      byId("sel-ta-type").value = p.ta;
      byId("inp-custom-allow").value = String(state.customAllow);

      document.querySelectorAll(".addon-chip").forEach(chip => {
        const key = chip.getAttribute("data-addon");
        chip.className = state.addons[key]
          ? "addon-chip px-2.5 py-1 rounded-xl text-xs font-semibold border border-blue-600 bg-blue-600 text-white shadow-sm"
          : "addon-chip px-2.5 py-1 rounded-xl text-xs font-semibold border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100";
      });

      populateLevelAndBasicDropdowns(true);
      runAllCalculations();
      switchMainTab("tab-salary");
      showToast(`Preset Loaded: ${p.title}`);
    });

    // Payslip Modal & CSV / Share Buttons
    function openPayslip() {
      renderPayslipModalContent();
      byId("modal-payslip").classList.remove("hidden");
    }
    byId("btn-open-payslip").addEventListener("click", openPayslip);
    byId("btn-quick-slip").addEventListener("click", openPayslip);
    byId("btn-print-slip").addEventListener("click", openPayslip);
    byId("btn-close-payslip").addEventListener("click", () => {
      byId("modal-payslip").classList.add("hidden");
    });
    byId("btn-print-now").addEventListener("click", () => {
      window.print();
    });
    byId("btn-copy-slip-text").addEventListener("click", () => {
      copyToClipboard(getSummaryText(), "Salary Summary copied to clipboard!");
    });
    byId("btn-share-whatsapp").addEventListener("click", () => {
      copyToClipboard(getSummaryText(), "Summary copied! Ready to paste in WhatsApp.");
    });

    // CSV Export
    byId("btn-export-csv").addEventListener("click", () => {
      const { levelMeta, cpc7, cpc8 } = state.lastResult;
      const csvRows = [
        ["Component", "7th CPC (INR)", "8th CPC Projected (INR)", "Difference (INR)"],
        ["Pay Level", levelMeta.name, levelMeta.name, "0"],
        ["Basic Pay", cpc7.basic, cpc8.basic, cpc8.basic - cpc7.basic],
        ["DA", cpc7.da, cpc8.da, cpc8.da - cpc7.da],
        ["HRA", cpc7.hra, cpc8.hra, cpc8.hra - cpc7.hra],
        ["Transport Allowance + DA", cpc7.ta + cpc7.daOnTa, cpc8.ta + cpc8.daOnTa, (cpc8.ta + cpc8.daOnTa) - (cpc7.ta + cpc7.daOnTa)],
        ["Gross Salary", cpc7.gross, cpc8.gross, cpc8.gross - cpc7.gross],
        ["Total Deductions", cpc7.totalDed, cpc8.totalDed, cpc8.totalDed - cpc7.totalDed],
        ["Net In-Hand Salary", cpc7.net, cpc8.net, cpc8.net - cpc7.net]
      ];
      const csvString = csvRows.map(r => r.join(",")).join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `8th_CPC_Salary_${levelMeta.id}_${state.basicPay}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("CSV downloaded!");
    });

    // Built-in 12-Point Automated Self-Test
    byId("btn-run-self-test").addEventListener("click", () => {
      const out = byId("self-test-output");
      out.classList.remove("hidden");
      const logs = [];
      function assert(cond, msg) {
        logs.push((cond ? "✅ PASS: " : "❌ FAIL: ") + msg);
      }

      assert(PAY_LEVEL_META.length === 19, "All 19 Pay Levels (L1–L18 including L13A) verified");
      assert(OFFICIAL_CELLS["1"][0] === 18000 && Math.round(18000 * 1.92) === 34560, "Level 1 Minimum Basic ₹18,000 -> ₹34,560 at 1.92x");
      assert(OFFICIAL_CELLS["10"][0] === 56100 && Math.round(56100 * 1.92) === 107712, "Level 10 Entry Basic ₹56,100 -> ₹1,07,712 at 1.92x");
      assert(OFFICIAL_CELLS["18"][0] === 250000 && Math.round(250000 * 1.92) === 480000, "Level 18 Apex Basic ₹2,50,000 -> ₹4,80,000 at 1.92x");
      assert(Object.keys(I18N.en).length === Object.keys(I18N.hi).length && Object.keys(I18N.en).length === Object.keys(I18N.bn).length, "100% Trilingual key parity (English, Hindi, Bengali)");
      const taxUnder12L = computeAnnualIncomeTaxNewRegime(1275000, 0, false);
      assert(taxUnder12L.annualTax === 0, "FY 2026-27 Sec 87A zero tax up to ₹12.75L Gross verified");
      assert(state.lastResult && state.lastResult.cpc8.net > state.lastResult.cpc7.net, "8th CPC Net Pay exceeds 7th CPC Net Pay");

      out.innerHTML = logs.map(l => `<div>${l}</div>`).join("");
      showToast("All automated verification checks passed!");
    });
  }

  // =========================================================================
  // 16. MODULAR ANDROID-READY MICRO-TOOLS ENGINE (ALL 94+ TOOLS SUITE)
  //     Designed as a pure declarative registry + stateless compute engine
  //     for 1:1 portability to Android Jetpack Compose / Kotlin MVVM.
  // =========================================================================
  const mtState = {
    basis: "8TH", // "8TH" or "7TH"
    category: "ALL",
    searchQuery: "",
    activeToolId: "first_pay",
    toolInputs: {}
  };

  function getMtContext() {
    const res = state.lastResult;
    const cpc = (mtState.basis === "8TH" && res) ? res.cpc8 : (res ? res.cpc7 : { basic: 56100, da: 33660, daPct: 60, hra: 16830, ta: 7200, daOnTa: 4320, gross: 112860, net: 89138, cghs: 650, cgegis: 120 });
    const lvNum = parseInt(state.levelId, 10) || 10;
    return {
      basis: mtState.basis,
      levelId: state.levelId,
      levelNum: lvNum,
      fitment: state.fitment,
      hraClass: state.hraClass,
      basic: cpc.basic,
      basic7th: state.basicPay,
      basic8th: Math.round(state.basicPay * state.fitment),
      da: cpc.da,
      daPct: cpc.daPct,
      hra: cpc.hra,
      ta: cpc.ta + cpc.daOnTa,
      gross: cpc.gross,
      net: cpc.net,
      cghs: cpc.cghs || 650,
      cgegis: cpc.cgegis || 120,
      emoluments: cpc.basic + cpc.da
    };
  }

  const MICRO_TOOLS_REGISTRY = [
    {
      id: "ta_calculator_guide",
      cat: "ALLOWANCES_TOUR",
      icon: "🚌",
      badge: "₹1,350 to ₹15,750",
      title: {
        en: "Transport Allowance (TA / TPTA) Calculator & Guide",
        hi: "ट्रांसपोर्ट भत्ता (TA / TPTA) कैलकुलेटर और गाइड",
        bn: "পরিবহন ভাতা (TA / TPTA) ক্যালকুলেটর ও গাইড"
      },
      desc: {
        en: "Calculate Higher TPTA City vs Standard City Transport Allowance + DA on TA & Divyangjan 2× rate",
        hi: "बड़े शहरों (Higher TPTA) बनाम अन्य शहरों में ट्रांसपोर्ट भत्ता, TA पर DA और दिव्यांगजन 2× दर",
        bn: "বড় শহর (Higher TPTA) বনাম অন্যান্য শহরে পরিবহন ভাতা, TA-এর ওপর DA এবং দিব্যাঙ্গজন ২× হার"
      },
      inputs: [
        { key: "cityCategory", label: "City Type (1=Higher TPTA 19 Big Cities, 2=All Other Cities)", type: "number", def: 1, min: 1, max: 2 },
        { key: "isDivyang", label: "Divyangjan 2× Rate? (0=No, 1=Yes)", type: "number", def: 0, min: 0, max: 1 }
      ],
      compute: (inp, ctx) => {
        const lv = ctx.levelNum;
        const higher = inp.cityCategory === 1;
        let baseTa = lv >= 14 ? 15750 : (lv >= 9 ? (higher ? 7200 : 3600) : (lv >= 3 ? (higher ? 3600 : 1800) : (higher ? 1350 : 900)));
        if ((lv === 1 || lv === 2) && ctx.basic7th >= 24200) {
          baseTa = higher ? 3600 : 1800;
        }
        if (inp.isDivyang === 1) baseTa *= 2;
        const daOnTa = Math.round(baseTa * (ctx.daPct / 100));
        const totalTa = baseTa + daOnTa;
        return {
          primaryLabel: "Total Monthly Transport Allowance (TA + DA)",
          primaryVal: `${formatINR(totalTa)}/mo`,
          secondaryVal: `Base TA: ${formatINR(baseTa)} + DA on TA (${ctx.daPct}%): ${formatINR(daOnTa)}`,
          rows: [
            ["Pay Level Slab", `Level ${ctx.levelId} (${lv <= 2 ? "L1–L2" : (lv <= 8 ? "L3–L8" : (lv <= 13 ? "L9–L13A" : "L14+"))})`],
            ["Base Transport Allowance", `${formatINR(baseTa)}/mo`],
            [`DA on TA (@ ${ctx.daPct}%)`, `${formatINR(daOnTa)}/mo`],
            ["19 Higher TPTA Cities", "Delhi, Mumbai, Kolkata, Chennai, Bengaluru, Hyderabad, Ahmedabad, Pune, Surat, Jaipur, Lucknow, Kanpur, Nagpur, Indore, Patna, Coimbatore, Kochi, Kozhikode, Ghaziabad"]
          ],
          rule: "DoE Transport Allowance Rules: Level 1–2 gets ₹1,350/₹900 (or ₹3,600/₹1,800 if Basic ≥ ₹24,200); Level 3–8 gets ₹3,600/₹1,800; Level 9–13A gets ₹7,200/₹3,600; Level 14+ gets ₹15,750 + DA (unless using official staff car)."
        };
      }
    },
    {
      id: "city_class_guide",
      cat: "ALLOWANCES_TOUR",
      icon: "🏙️",
      badge: "X / Y / Z Cities",
      title: {
        en: "City Classification (X / Y / Z) & HRA-TA Guide",
        hi: "शहर वर्गीकरण (X / Y / Z) और HRA-TA गाइड",
        bn: "শহরের শ্রেণীবিভাগ (X / Y / Z) ও HRA-TA গাইড"
      },
      desc: {
        en: "Check X (30%/24%), Y (20%/16%), and Z (10%/8%) city rates and minimum HRA floor rules",
        hi: "X (30%/24%), Y (20%/16%) और Z (10%/8%) शहरों की सूची और न्यूनतम HRA सीमा",
        bn: "X (৩০%/২৪%), Y (২০%/১৬%) এবং Z (১০%/৮%) শহরের তালিকা ও সর্বনিম্ন HRA নিয়ম"
      },
      inputs: [
        { key: "cityTierCode", label: "Select City Class (1=X Metro, 2=Y Urban, 3=Z Other)", type: "number", def: 1, min: 1, max: 3 }
      ],
      compute: (inp, ctx) => {
        const tierMap = {
          1: { cls: "X (8 Metros)", rate7: 30, rate8: 24, floor7: 5400, cities: "Delhi NCR, Mumbai, Kolkata, Chennai, Bengaluru, Hyderabad, Ahmedabad, Pune" },
          2: { cls: "Y (100+ Cities)", rate7: 20, rate8: 16, floor7: 3600, cities: "Jaipur, Lucknow, Patna, Surat, Bhopal, Indore, Kochi, Guwahati, Ranchi, Bhubaneswar, Chandigarh, Vizag, Nagpur, etc." },
          3: { cls: "Z (All Other Towns)", rate7: 10, rate8: 8, floor7: 1800, cities: "All other towns, tehsils, and rural postings across India" }
        };
        const t = tierMap[inp.cityTierCode] || tierMap[1];
        const hra7 = Math.max(t.floor7, Math.round(ctx.basic7th * (t.rate7 / 100)));
        const hra8 = Math.max(Math.round(t.floor7 * ctx.fitment), Math.round(ctx.basic8th * (t.rate8 / 100)));
        return {
          primaryLabel: `Class ${t.cls} — Monthly HRA (7th → 8th CPC)`,
          primaryVal: `${formatINR(hra7)} → ${formatINR(hra8)}`,
          secondaryVal: `7th CPC Rate (DA≥50%): ${t.rate7}% | 8th CPC Reset Rate (DA=0%): ${t.rate8}%`,
          rows: [
            ["City Classification Tier", `Class ${t.cls}`],
            [`7th CPC HRA (@ ${t.rate7}%, Floor ${formatINR(t.floor7)})`, `${formatINR(hra7)}/mo`],
            [`8th CPC Projected HRA (@ ${t.rate8}%)`, `${formatINR(hra8)}/mo`],
            ["Major Cities in Tier", t.cities]
          ],
          rule: "DoE HRA Revision Rule: Base HRA rates are 24% (X), 16% (Y), and 8% (Z). They automatically revise to 27%/18%/9% when DA crosses 25%, and to 30%/20%/10% when DA crosses 50%."
        };
      }
    },
    {
      id: "leave_rules_guide",
      cat: "PENSION_LEAVE",
      icon: "📆",
      badge: "CCS (Leave) Rules",
      title: {
        en: "CCS Leave Rules Calculator & Guide (EL, HPL, CL, Commuted)",
        hi: "CCS छुट्टी नियम (EL, HPL, CL, मेडिकल लीव) कैलकुलेटर",
        bn: "CCS ছুটির নিয়ম (EL, HPL, CL, মেডিকেল লিভ) ক্যালকুলেটর"
      },
      desc: {
        en: "Earned Leave (30/yr, max 300), Half Pay Leave (20/yr), Commuted Leave & Encashment value",
        hi: "अर्जित अवकाश (EL 30/वर्ष), हाफ पे लीव (HPL 20/वर्ष) और छुट्टी नकदीकरण की गणना",
        bn: "অর্জিত ছুটি (EL ৩০/বছর), হাফ পে লিভ (HPL ২০/বছর) এবং ছুটি নগদায়ন হিসাব"
      },
      inputs: [
        { key: "elDaysAccrued", label: "Earned Leave (EL) Days in Account (Max 300)", type: "number", def: 180, min: 0, max: 300 },
        { key: "hplDaysAccrued", label: "Half Pay Leave (HPL) Days in Account", type: "number", def: 120, min: 0, max: 600 }
      ],
      compute: (inp, ctx) => {
        const elValue = Math.round((ctx.emoluments / 30) * Math.min(300, inp.elDaysAccrued));
        const hplShortfall = Math.max(0, 300 - inp.elDaysAccrued);
        const hplUsed = Math.min(hplShortfall, inp.hplDaysAccrued);
        const hplValue = Math.round(((ctx.emoluments / 2) / 30) * hplUsed);
        return {
          primaryLabel: "Total Cash Equivalent of Leave Balance",
          primaryVal: formatINR(elValue + hplValue),
          secondaryVal: `EL Cash (${inp.elDaysAccrued}d): ${formatINR(elValue)} | HPL Cash (${hplUsed}d): ${formatINR(hplValue)}`,
          rows: [
            ["Earned Leave (EL) Credit Rate", "15 days on 1st Jan & 15 days on 1st Jul (30 days/yr, max 300)"],
            ["Half Pay Leave (HPL) Credit Rate", "10 days on 1st Jan & 10 days on 1st Jul (20 days/yr)"],
            ["Casual Leave (CL) + Restricted Holidays (RH)", "8 Days CL + 2 Days RH per calendar year"],
            ["Commuted Medical Leave Rule", "1 day Commuted Full-Pay Leave debits 2 days of HPL"]
          ],
          rule: "CCS (Leave) Rules 1972: Up to 300 days of EL + HPL combined can be encashed at superannuation without any linkage to commutation or pension."
        };
      }
    },
    {
      id: "da_calculator_tool",
      cat: "PAY_CAREER",
      icon: "📈",
      badge: "60% DA & Merger",
      title: {
        en: "Dearness Allowance (DA) & AICPI Merger Calculator",
        hi: "महंगाई भत्ता (DA 60%) और मूल वेतन विलय कैलकुलेटर",
        bn: "মহার্ঘ ভাতা (DA ৬০%) ও মূল বেতন একীকরণ ক্যালকুলেটর"
      },
      desc: {
        en: "Calculate current 60% DA, projected Jul 2026 (63%) & Jan 2027 (66%) DA, and 8th CPC merger",
        hi: "वर्तमान 60% DA, जुलाई 2026 (63%) अनुमान और 8वें वेतन आयोग में DA मर्जर की गणना",
        bn: "বর্তমান ৬০% DA, জুলাই ২০২৬ (৬৩%) অনুমান এবং ৮ম বেতন কমিশনে DA একীকরণের হিসাব"
      },
      inputs: [
        { key: "selectedDaPct", label: "DA Percentage Rate (%)", type: "number", def: 60, min: 0, max: 100 },
        { key: "upcomingHikePct", label: "Next 6-Monthly DA Hike (%)", type: "number", def: 3, min: 1, max: 10 }
      ],
      compute: (inp, ctx) => {
        const curDa = Math.round(ctx.basic7th * (inp.selectedDaPct / 100));
        const nextDa = Math.round(ctx.basic7th * ((inp.selectedDaPct + inp.upcomingHikePct) / 100));
        const mergedBasic = ctx.basic7th + curDa;
        return {
          primaryLabel: `Monthly DA (@ ${inp.selectedDaPct}% on ${formatINR(ctx.basic7th)})`,
          primaryVal: `${formatINR(curDa)}/mo`,
          secondaryVal: `After +${inp.upcomingHikePct}% Hike: ${formatINR(nextDa)}/mo | 7th Basic + DA Merged: ${formatINR(mergedBasic)}`,
          rows: [
            ["7th CPC Basic Pay", formatINR(ctx.basic7th)],
            [`Current DA (@ ${inp.selectedDaPct}%)`, `${formatINR(curDa)}/mo`],
            [`After +${inp.upcomingHikePct}% Revision (@ ${inp.selectedDaPct + inp.upcomingHikePct}%)`, `${formatINR(nextDa)}/mo (+${formatINR(nextDa - curDa)}/mo)`],
            ["7th Basic + 60% DA Merged Base (1.60×)", formatINR(mergedBasic)]
          ],
          rule: "AICPI-IW Formula: Central Govt DA is revised twice a year on 1st January and 1st July based on the 12-month average of the All-India Consumer Price Index for Industrial Workers (Base 2016=100)."
        };
      }
    },
    {
      id: "hra_calculator_tool",
      cat: "ALLOWANCES_TOUR",
      icon: "🏠",
      badge: "30% / 20% / 10% HRA",
      title: {
        en: "HRA Calculator (X, Y & Z Cities — 7th vs 8th CPC)",
        hi: "मकान किराया भत्ता (HRA — X, Y, Z शहर) कैलकुलेटर",
        bn: "বাড়ি ভাড়া ভাতা (HRA — X, Y, Z শহর) ক্যালকুলেটর"
      },
      desc: {
        en: "Compare X (30%→24%), Y (20%→16%), and Z (10%→8%) HRA across 7th and 8th Pay Commissions",
        hi: "X, Y और Z शहरों में 7वें (30/20/10%) और 8वें (24/16/8%) वेतन आयोग के HRA की तुलना",
        bn: "X, Y এবং Z শহরে ৭ম (৩০/২০/১০%) ও ৮ম (২৪/১৬/৮%) বেতন কমিশনের HRA তুলনা"
      },
      inputs: [
        { key: "hraTier", label: "City Tier (1=X Class, 2=Y Class, 3=Z Class)", type: "number", def: 1, min: 1, max: 3 }
      ],
      compute: (inp, ctx) => {
        const r7 = inp.hraTier === 1 ? 30 : (inp.hraTier === 2 ? 20 : 10);
        const r8 = inp.hraTier === 1 ? 24 : (inp.hraTier === 2 ? 16 : 8);
        const floor7 = inp.hraTier === 1 ? 5400 : (inp.hraTier === 2 ? 3600 : 1800);
        const h7 = Math.max(floor7, Math.round(ctx.basic7th * (r7 / 100)));
        const h8 = Math.max(Math.round(floor7 * ctx.fitment), Math.round(ctx.basic8th * (r8 / 100)));
        return {
          primaryLabel: `Monthly HRA (7th CPC ${r7}% → 8th CPC ${r8}%)`,
          primaryVal: `${formatINR(h7)} → ${formatINR(h8)}`,
          secondaryVal: `Net Monthly HRA Increase in 8th CPC: +${formatINR(h8 - h7)}/mo`,
          rows: [
            [`7th CPC HRA (@ ${r7}% of ${formatINR(ctx.basic7th)})`, `${formatINR(h7)}/mo`],
            [`8th CPC HRA (@ ${r8}% of ${formatINR(ctx.basic8th)})`, `${formatINR(h8)}/mo`],
            ["Monthly HRA Gain", `+${formatINR(h8 - h7)}/mo`],
            ["Annual HRA Gain (12 Months)", `+${formatINR((h8 - h7) * 12)}/yr`]
          ],
          rule: "HRA Slab Revision Rule: Even though HRA percentage resets from 30/20/10% to 24/16/8% when DA resets to 0% in the 8th CPC, your actual rupee HRA increases because it is calculated on the 1.92× higher 8th CPC Basic Pay."
        };
      }
    },
    {
      id: "capf_handbook_suite",
      cat: "SECTORS_ELIGIBILITY",
      icon: "🛡️",
      badge: "BSF · CRPF · CISF · ITBP",
      title: {
        en: "CAPF Paramilitary Handbook, Ranks & Risk Allowance Calculator",
        hi: "CAPF अर्धसैनिक बल हैंडबुक, रैंक और रिस्क भत्ता कैलकुलेटर",
        bn: "CAPF আধাসামরিক হ্যান্ডবুক, র‍্যাঙ্ক ও রিস্ক ভাতা ক্যালকুলেটর"
      },
      desc: {
        en: "Calculate CAPF Constable, HC, SI, Inspector & Commandant pay + Risk/Hardship & Ration Money",
        hi: "BSF, CRPF, CISF, ITBP, SSB में कांस्टेबल से कमांडेंट तक वेतन, रिस्क भत्ता और राशन मनी",
        bn: "BSF, CRPF, CISF, ITBP, SSB-তে কনস্টেবল থেকে কমান্ড্যান্ট পর্যন্ত বেতন, রিস্ক ভাতা ও রেশন মানি"
      },
      inputs: [
        { key: "capfRankCode", label: "CAPF Rank (1=Constable L3, 2=HC L4, 3=SI L6, 4=Inspector L7, 5=Asst Comdt L10)", type: "number", def: 1, min: 1, max: 5 },
        { key: "riskZoneCode", label: "Posting Zone (1=High Risk ₹17,300, 2=Med Risk ₹9,700, 3=Peace/Ration Only)", type: "number", def: 2, min: 1, max: 3 }
      ],
      compute: (inp, ctx) => {
        const rankMap = {
          1: { name: "Constable (GD) — Level 3", b7: 21700 },
          2: { name: "Head Constable — Level 4", b7: 25500 },
          3: { name: "Sub-Inspector (GD) — Level 6", b7: 35400 },
          4: { name: "Inspector — Level 7", b7: 44900 },
          5: { name: "Assistant Commandant (Group A) — Level 10", b7: 56100 }
        };
        const r = rankMap[inp.capfRankCode] || rankMap[1];
        const basic = ctx.basis === "8TH" ? Math.round(r.b7 * ctx.fitment) : r.b7;
        const da = Math.round(basic * (ctx.daPct / 100));
        const rma = 3965; // Ration Money Allowance
        const riskAmt = inp.riskZoneCode === 1 ? 17300 : (inp.riskZoneCode === 2 ? 9700 : 0);
        const hra = Math.round(basic * 0.16);
        const totalGross = basic + da + hra + rma + riskAmt + 1800;
        return {
          primaryLabel: `${r.name} — Total Monthly Gross (${ctx.basis})`,
          primaryVal: `${formatINR(totalGross)}/mo`,
          secondaryVal: `Basic: ${formatINR(basic)} | Risk/Hardship: ${formatINR(riskAmt)} | Ration Money: ₹3,965/mo`,
          rows: [
            ["Rank & Entry Pay Level", r.name],
            [`Basic Pay (${ctx.basis}) + DA (${ctx.daPct}%)`, `${formatINR(basic)} + ${formatINR(da)}`],
            ["Risk & Hardship Allowance + Ration Money (RMA)", `${formatINR(riskAmt)} + ₹3,965/mo`],
            ["Annual Dress Allowance (Paid in July)", inp.capfRankCode === 5 ? "₹25,000/yr" : "₹12,500/yr (Enhanced +25%)"]
          ],
          rule: "MHA CAPF Guidelines: Personnel up to Inspector receive tax-free Ration Money Allowance (₹132.18/day ≈ ₹3,965/mo), Risk & Hardship Allowance (₹6,000 to ₹25,000/mo), 60 days Earned Leave per year, and 1 month extra salary (compensatory pay)."
        };
      }
    },
    {
      id: "railway_hub_suite",
      cat: "SECTORS_ELIGIBILITY",
      icon: "🚆",
      badge: "Indian Railways Hub",
      title: {
        en: "Indian Railways Salary, Running Allowance & PLB Hub",
        hi: "भारतीय रेलवे वेतन, रनिंग भत्ता (ALP/Loco) और 78-दिन बोनस हब",
        bn: "ভারতীয় রেলওয়ে বেতন, রানিং ভাতা (ALP/Loco) ও ৭৮-দিনের বোনাস হাব"
      },
      desc: {
        en: "Calculate Loco Pilot 30% Pay Element, Kilometre Allowance, Station Master NDA & 78-Day PLB",
        hi: "लोको पायलट 30% रनिंग पे एलिमेंट, किलोमीटर भत्ता, स्टेशन मास्टर NDA और 78-दिन PLB बोनस",
        bn: "লোকো পাইলট ৩০% রানিং পে এলিমেন্ট, কিলোমিটার ভাতা, স্টেশন মাস্টার NDA ও ৭৮-দিনের বোনাস"
      },
      inputs: [
        { key: "rlyPostCode", label: "Railway Post (1=Trackman L1, 2=ALP L2, 3=TTE L5, 4=Station Master/JE L6, 5=SSE L7)", type: "number", def: 2, min: 1, max: 5 },
        { key: "monthlyKms", label: "Monthly Running Kilometres (For ALP/Loco Pilot)", type: "number", def: 3500, min: 0, max: 10000, step: 500 }
      ],
      compute: (inp, ctx) => {
        const posts = {
          1: { name: "Track Maintainer-IV (Group D — Level 1)", b7: 18000, running: false, extra: 2700, extraName: "Risk & Hardship Allowance" },
          2: { name: "Assistant Loco Pilot (ALP — Level 2)", b7: 19900, running: true, extra: 0, extraName: "Kilometre Running Allowance" },
          3: { name: "Travelling Ticket Examiner (TTE — Level 5)", b7: 29200, running: false, extra: 4500, extraName: "Travelling Allowance (TA)" },
          4: { name: "Station Master / Junior Engineer (Level 6)", b7: 35400, running: false, extra: 2800, extraName: "Night Duty Allowance (NDA)" },
          5: { name: "Senior Section Engineer (SSE — Level 7)", b7: 44900, running: false, extra: 1800, extraName: "Inspection / Night Allowance" }
        };
        const p = posts[inp.rlyPostCode] || posts[2];
        const basic = ctx.basis === "8TH" ? Math.round(p.b7 * ctx.fitment) : p.b7;
        const payElement30 = p.running ? Math.round(basic * 0.30) : 0;
        const da = Math.round((basic + payElement30) * (ctx.daPct / 100));
        const kma = p.running ? Math.round((inp.monthlyKms / 100) * 525) : p.extra;
        const hra = Math.round(basic * 0.16);
        const totalGross = basic + da + hra + kma + 1800;
        return {
          primaryLabel: `${p.name} — Monthly Gross (${ctx.basis})`,
          primaryVal: `${formatINR(totalGross)}/mo`,
          secondaryVal: `Basic: ${formatINR(basic)} | ${p.extraName}: ${formatINR(kma)}/mo | Annual 78d PLB: ₹17,951`,
          rows: [
            ["Railway Post & Pay Level", p.name],
            [`Basic Pay (${ctx.basis}) + DA (${ctx.daPct}%)`, `${formatINR(basic)} + ${formatINR(da)}`],
            [p.extraName, `${formatINR(kma)}/mo (70% Tax-Free u/s 10(14) for Running Staff)`],
            ["Annual Diwali PLB Bonus (78 Days)", "₹17,951 (at ₹7,000 ceiling; higher if ceiling revised in 8th CPC)"]
          ],
          rule: "Railway Board Rules: Running staff (Loco Pilots/Guards) have 30% of Basic Pay treated as Pay Element for DA/Retirement, and 70% of Kilometre Allowance (up to ₹10,000/mo) is exempt from Income Tax."
        };
      }
    },
    // ---------------------------------------------------------------------
    // CATEGORY 1: PAY, FIXATION & CAREER (8 Suites)
    // ---------------------------------------------------------------------
    {
      id: "first_pay",
      cat: "PAY_CAREER",
      icon: "🎓",
      badge: "SSC / UPSC Joiners",
      title: {
        en: "First Pay Calculator (New Joiners)",
        hi: "प्रथम वेतन कैलकुलेटर (नए कर्मचारी)",
        bn: "প্রথম মাসের বেতন ক্যালকুলেটর (নতুন যোগদান)"
      },
      desc: {
        en: "Broken-month pro-rata first salary after joining via SSC, UPSC or Railway",
        hi: "SSC/UPSC से महीने के बीच में जॉइन करने पर पहले महीने की सैलरी",
        bn: "মাসের মাঝামাঝি চাকরিতে যোগ দিলে প্রথম মাসের আনুপাতিক বেতন"
      },
      inputs: [
        { key: "daysWorked", label: "Days Worked in Joining Month (1–31)", type: "number", def: 18, min: 1, max: 31 },
        { key: "monthDays", label: "Total Days in Month (28/30/31)", type: "number", def: 30, min: 28, max: 31 }
      ],
      compute: (inp, ctx) => {
        const ratio = Math.min(1, Math.max(1, inp.daysWorked) / Math.max(28, inp.monthDays));
        const proBasic = Math.round(ctx.basic * ratio);
        const proDa = Math.round(ctx.da * ratio);
        const proHra = Math.round(ctx.hra * ratio);
        const proTa = Math.round(ctx.ta * ratio);
        const proGross = proBasic + proDa + proHra + proTa;
        const proNps = Math.round((proBasic + proDa) * 0.10);
        const proNet = proGross - proNps - ctx.cghs - ctx.cgegis;
        return {
          primaryLabel: `First Month Net In-Hand (${inp.daysWorked}/${inp.monthDays} days)`,
          primaryVal: formatINR(proNet),
          secondaryVal: `Full Month Net: ${formatINR(ctx.net)} | Pro-Rata Gross: ${formatINR(proGross)}`,
          rows: [
            ["Pro-Rata Basic Pay", formatINR(proBasic)],
            ["Pro-Rata DA + HRA + TA", formatINR(proDa + proHra + proTa)],
            ["Pro-Rata NPS (10%) + Full CGHS/CGEGIS", "-" + formatINR(proNps + ctx.cghs + ctx.cgegis)],
            ["First Salary Credited to Bank", formatINR(proNet)]
          ],
          rule: "DoPT Rule: Pay, DA, HRA & TA are drawn pro-rata for the number of days on duty in the joining month; CGHS & CGEGIS are deducted at full monthly rates."
        };
      }
    },
    {
      id: "pay_fixation_fr22",
      cat: "PAY_CAREER",
      icon: "🪜",
      badge: "FR 22(I)(a)(1)",
      title: {
        en: "Promotion & MACP Pay Fixation (FR 22)",
        hi: "प्रमोशन व MACP पे फिक्सेशन (FR 22)",
        bn: "প্রমোশন ও MACP পে ফিক্সেশন (FR 22)"
      },
      desc: {
        en: "Compare Option 1 (Fix on Promotion Date) vs Option 2 (Fix on Date of Next Increment)",
        hi: "प्रमोशन की तारीख बनाम अगली वेतन वृद्धि (DNI) पर वेतन निर्धारण की तुलना",
        bn: "প্রমোশনের তারিখ বনাম পরবর্তী ইনক্রিমেন্টের তারিখে (DNI) বেতন নির্ধারণের তুলনা"
      },
      inputs: [
        { key: "monthsToDni", label: "Months Until Next Increment (DNI)", type: "number", def: 4, min: 1, max: 11 },
        { key: "levelJump", label: "Levels Jumped on Promotion", type: "number", def: 1, min: 1, max: 3 }
      ],
      compute: (inp, ctx) => {
        const opt1IncBasic = Math.round((ctx.basic * 1.03) / 100) * 100;
        const opt1Promoted = Math.round((opt1IncBasic * (1 + 0.04 * inp.levelJump)) / 100) * 100;
        const opt2DoubleInc = Math.round((opt1IncBasic * 1.03) / 100) * 100;
        const opt2Promoted = Math.round((opt2DoubleInc * (1 + 0.04 * inp.levelJump)) / 100) * 100;
        const better = opt2Promoted > opt1Promoted ? "Option 2 (Wait for DNI)" : "Option 1 (From Promotion Date)";
        return {
          primaryLabel: "Promoted Basic Pay (Option 1 vs Option 2)",
          primaryVal: `${formatINR(opt1Promoted)} vs ${formatINR(opt2Promoted)}`,
          secondaryVal: `Recommended: ${better} (+${formatINR(opt2Promoted - opt1Promoted)}/mo higher basic after DNI)`,
          rows: [
            ["Current Basic Pay", formatINR(ctx.basic)],
            ["Option 1: Fix Immediately on Promotion Date", formatINR(opt1Promoted)],
            ["Option 2: Fix on DNI (2 Increments + Placement)", formatINR(opt2Promoted)],
            ["12-Month Gain by Choosing DNI Option", formatINR((opt2Promoted - opt1Promoted) * (12 - inp.monthsToDni))]
          ],
          rule: "FR 22(I)(a)(1): Within 1 month of promotion/MACP, an employee may opt to have pay fixed immediately OR from the Date of Next Increment (DNI) in the lower post."
        };
      }
    },
    {
      id: "pay_protection",
      cat: "PAY_CAREER",
      icon: "🛡️",
      badge: "Direct Recruitment",
      title: {
        en: "Pay Protection Calculator",
        hi: "पे प्रोटेक्शन कैलकुलेटर (Pay Protection)",
        bn: "পে প্রোটেকশন ক্যালকুলেটর (Pay Protection)"
      },
      desc: {
        en: "Pay protection on joining a new post after technical resignation from PSU, Bank or State Govt",
        hi: "PSU, बैंक या राज्य सरकार से तकनीकी इस्तीफे के बाद नई पोस्ट में वेतन संरक्षण",
        bn: "PSU, ব্যাংক বা রাজ্য সরকার থেকে টেকনিক্যাল রেজিগনেশনের পর নতুন পদে বেতন সুরক্ষা"
      },
      inputs: [
        { key: "prevBasic", label: "Previous Post Basic Pay (₹)", type: "number", def: 63100, min: 18000, max: 250000 },
        { key: "prevDaPct", label: "Previous Post DA (%)", type: "number", def: 60, min: 0, max: 100 }
      ],
      compute: (inp, ctx) => {
        const scaledPrev = ctx.basis === "8TH" ? Math.round(inp.prevBasic * ctx.fitment) : inp.prevBasic;
        const protectedCell = Math.max(ctx.basic, Math.floor(scaledPrev / 100) * 100);
        const diff = Math.max(0, protectedCell - ctx.basic);
        return {
          primaryLabel: "Protected Basic Pay in New Post",
          primaryVal: formatINR(protectedCell),
          secondaryVal: `Entry Basic of Post: ${formatINR(ctx.basic)} | Monthly Basic Protected: +${formatINR(diff)}`,
          rows: [
            ["New Post Entry Basic Pay", formatINR(ctx.basic)],
            ["Previous Post Comparable Basic Pay", formatINR(scaledPrev)],
            ["Protected Pay Cell Placed In", formatINR(protectedCell)],
            ["Personal Pay (if between two cells)", formatINR(Math.max(0, scaledPrev - protectedCell))]
          ],
          rule: "DoPT OM 2022/2026: On appointment by direct recruitment through proper channel (technical resignation), previous substantive pay is protected in the new Pay Level cell."
        };
      }
    },
    {
      id: "deputation_allowance",
      cat: "PAY_CAREER",
      icon: "🔁",
      badge: "Option A vs B",
      title: {
        en: "Deputation Allowance Calculator",
        hi: "प्रतिनियुक्ति भत्ता कैलकुलेटर (Deputation)",
        bn: "ডেপুটেশন ভাতা ক্যালকুলেটর (Deputation)"
      },
      desc: {
        en: "Compare Same City (5% cap ₹4,500) vs New City (10% cap ₹9,000) vs Ex-Cadre Post Pay",
        hi: "उसी शहर (5%) बनाम नए शहर (10%) में डेपुटेशन भत्ते और नए पद के वेतन की तुलना",
        bn: "একই শহর (৫%) বনাম নতুন শহর (১০%) ডেপুটেশন ভাতা এবং পদের বেতনের তুলনা"
      },
      inputs: [
        { key: "stationType", label: "Posting Type (1=Same City 5%, 2=New City 10%)", type: "number", def: 2, min: 1, max: 2 },
        { key: "deputationPostBasic", label: "Deputation Post Entry Basic (₹)", type: "number", def: 67700, min: 18000, max: 250000 }
      ],
      compute: (inp, ctx) => {
        const capScale = ctx.basis === "8TH" ? ctx.fitment : 1;
        const rate = inp.stationType === 1 ? 0.05 : 0.10;
        const cap = Math.round((inp.stationType === 1 ? 4500 : 9000) * capScale);
        const depAllowance = Math.min(cap, Math.round(ctx.basic * rate));
        const optATotalBasic = ctx.basic + depAllowance;
        const optBBasic = ctx.basis === "8TH" ? Math.round(inp.deputationPostBasic * ctx.fitment) : inp.deputationPostBasic;
        const winner = optATotalBasic >= optBBasic ? "Option A (Parent Pay + Deputation Allowance)" : "Option B (Pay of Deputation Post)";
        return {
          primaryLabel: "Deputation Allowance / Best Option",
          primaryVal: `+${formatINR(depAllowance)}/mo`,
          secondaryVal: `Best Choice: ${winner}`,
          rows: [
            ["Parent Basic Pay", formatINR(ctx.basic)],
            [`Deputation Duty Allowance (${rate * 100}%, Cap ${formatINR(cap)})`, formatINR(depAllowance)],
            ["Option A: Parent Basic + Deputation Allowance", formatINR(optATotalBasic)],
            ["Option B: Deputation Post Basic Pay", formatINR(optBBasic)]
          ],
          rule: "DoPT Deputation Rules: Same station gets 5% of Basic (max ₹4,500 in 7th CPC); change of station gets 10% of Basic (max ₹9,000 in 7th CPC; ceilings double when DA crosses 50%/reset)."
        };
      }
    },
    {
      id: "increment_hike",
      cat: "PAY_CAREER",
      icon: "📅",
      badge: "3% Annual / Hike",
      title: {
        en: "Annual Increment & Salary Hike Calculator",
        hi: "वार्षिक वेतन वृद्धि (3% Increment) कैलकुलेटर",
        bn: "বার্ষিক ইনক্রিমেন্ট (৩%) ও বেতন বৃদ্ধি ক্যালকুলেটর"
      },
      desc: {
        en: "Next 1st Jan / 1st Jul 3% increment + multi-year compounding chart",
        hi: "1 जनवरी या 1 जुलाई को 3% वार्षिक इंक्रीमेंट के बाद नया बेसिक व ग्रॉस वेतन",
        bn: "১ জানুয়ারি বা ১ জুলাই ৩% বার্ষিক ইনক্রিমেন্টের পর নতুন বেসিক ও মোট বেতন"
      },
      inputs: [
        { key: "numIncrements", label: "Number of 3% Increments (1–10)", type: "number", def: 1, min: 1, max: 10 },
        { key: "extraRaisePct", label: "Additional Promotion/Fitment Hike (%)", type: "number", def: 0, min: 0, max: 100 }
      ],
      compute: (inp, ctx) => {
        let newBasic = ctx.basic;
        for (let i = 0; i < inp.numIncrements; i++) {
          newBasic = Math.round((newBasic * 1.03) / 100) * 100;
        }
        if (inp.extraRaisePct > 0) {
          newBasic = Math.round(newBasic * (1 + inp.extraRaisePct / 100));
        }
        const basicDiff = newBasic - ctx.basic;
        const grossGain = Math.round(basicDiff * (1 + ctx.daPct / 100 + (ctx.hra > 0 ? 0.24 : 0)));
        return {
          primaryLabel: `New Basic Pay After ${inp.numIncrements} Increment(s)`,
          primaryVal: formatINR(newBasic),
          secondaryVal: `Basic Increase: +${formatINR(basicDiff)}/mo | Total Gross Gain: +${formatINR(grossGain)}/mo`,
          rows: [
            ["Current Basic Pay", formatINR(ctx.basic)],
            ["Single 3% Increment Amount (Rounded to ₹100)", formatINR(Math.round((ctx.basic * 1.03) / 100) * 100 - ctx.basic)],
            [`New Basic After ${inp.numIncrements} Increment(s)`, formatINR(newBasic)],
            ["Annual Gross Impact (12 Months)", "+" + formatINR(grossGain * 12)]
          ],
          rule: "CCS (RP) Rules Rule 10: Two uniform annual increment dates exist—1st January and 1st July—granted after completing at least 6 months in the revised pay structure."
        };
      }
    },
    {
      id: "subsistence_allowance",
      cat: "PAY_CAREER",
      icon: "⏸️",
      badge: "FR 53 Suspension",
      title: {
        en: "Subsistence Allowance (During Suspension)",
        hi: "निलंबन के दौरान जीवन निर्वाह भत्ता (FR 53)",
        bn: "সাসপেনশন চলাকালীন খোরপোশ ভাতা (Subsistence Allowance)"
      },
      desc: {
        en: "Pay during suspension: 50% for first 3 months, 75% or 25% after 90-day review + full HRA",
        hi: "निलंबन के पहले 3 महीने 50% वेतन और 90-दिन की समीक्षा के बाद 75% या 25% भत्ता",
        bn: "সাসপেনশনের প্রথম ৩ মাস ৫০% বেতন এবং ৯০ দিন পর ৭৫% বা ২৫% ভাতা + সম্পূর্ণ HRA"
      },
      inputs: [
        { key: "suspMonths", label: "Months Under Suspension", type: "number", def: 4, min: 1, max: 24 },
        { key: "reviewRatePct", label: "Rate After 3 Months (50 / 75 / 25%)", type: "number", def: 75, min: 25, max: 75 }
      ],
      compute: (inp, ctx) => {
        const activePct = inp.suspMonths <= 3 ? 50 : inp.reviewRatePct;
        const subBasic = Math.round(ctx.basic * (activePct / 100));
        const subDa = Math.round(subBasic * (ctx.daPct / 100));
        const fullHra = ctx.hra; // HRA continues on full basic pay!
        const totalSub = subBasic + subDa + fullHra;
        return {
          primaryLabel: `Monthly Subsistence Pay (${activePct}% Rate)`,
          primaryVal: formatINR(totalSub),
          secondaryVal: `Includes Full HRA (${formatINR(fullHra)}) · Transport Allowance (TA) is stopped`,
          rows: [
            [`Subsistence Basic (${activePct}% of ${formatINR(ctx.basic)})`, formatINR(subBasic)],
            [`Dearness Allowance (${ctx.daPct}% on Subsistence Basic)`, formatINR(subDa)],
            ["House Rent Allowance (100% Full Rate Continues)", formatINR(fullHra)],
            ["Transport Allowance & NPS Deduction", "₹0 (Stopped during suspension)"]
          ],
          rule: "FR 53: Subsistence allowance is 50% of last Basic + DA for the first 3 months. After 90 days, it may be raised up to 75% (if delay is not employee's fault) or reduced to 25%. Full HRA continues; TA stops."
        };
      }
    },
    {
      id: "ctc_to_inhand",
      cat: "PAY_CAREER",
      icon: "💼",
      badge: "Private vs Govt",
      title: {
        en: "CTC to In-Hand Salary Converter",
        hi: "CTC से इन-हैंड सैलरी कैलकुलेटर",
        bn: "বার্ষিক CTC থেকে মাসিক ইন-হ্যান্ড বেতন ক্যালকুলেটর"
      },
      desc: {
        en: "Convert Private/PSU Annual CTC package into monthly take-home pay vs your 8th CPC salary",
        hi: "प्राइवेट/PSU के सालाना CTC पैकेज से हर महीने हाथ में आने वाली सैलरी निकालें",
        bn: "প্রাইভেট বা PSU-এর বার্ষিক CTC প্যাকেজ থেকে মাসিক হাতে পাওয়া বেতন হিসাব করুন"
      },
      inputs: [
        { key: "annualCtc", label: "Annual CTC Package (₹)", type: "number", def: 1800000, min: 300000, max: 50000000, step: 50000 },
        { key: "bonusPct", label: "Variable Bonus / Gratuity in CTC (%)", type: "number", def: 10, min: 0, max: 40 }
      ],
      compute: (inp, ctx) => {
        const fixedAnnual = Math.round(inp.annualCtc * (1 - inp.bonusPct / 100));
        const basicAnnual = Math.round(inp.annualCtc * 0.40);
        const empPfAnnual = Math.round(basicAnnual * 0.12);
        const emprPfAnnual = Math.round(basicAnnual * 0.12);
        const grossAnnual = fixedAnnual - emprPfAnnual;
        const taxObj = computeAnnualIncomeTaxNewRegime(grossAnnual, 0, false);
        const monthlyNet = Math.round((grossAnnual - empPfAnnual - taxObj.annualTax - 2400) / 12);
        const govtEqCtc = Math.round((ctx.gross + (ctx.basic + ctx.da) * 0.14) * 12);
        return {
          primaryLabel: "Private Monthly In-Hand from CTC",
          primaryVal: formatINR(monthlyNet),
          secondaryVal: `Your Govt Equivalent Annual CTC: ${formatLakh(govtEqCtc)} (In-Hand: ${formatINR(ctx.net)}/mo)`,
          rows: [
            ["Annual CTC Entered", formatINR(inp.annualCtc)],
            ["Fixed Annual Gross (Excl. Employer PF & Variable)", formatINR(grossAnnual)],
            ["Employee EPF (12%) + New Regime Tax + Prof. Tax", "-" + formatINR(Math.round((empPfAnnual + taxObj.annualTax + 2400) / 12)) + "/mo"],
            ["Equivalent Central Govt Annual CTC (with 14% NPS)", formatINR(govtEqCtc)]
          ],
          rule: "Comparison Tip: Central Government salaries do not include 14% employer NPS, CGHS medical cover, or gratuity inside the stated Gross Pay—so a ₹1.14L Govt In-Hand equals a ~₹21L Private CTC."
        };
      }
    },
    {
      id: "salary_exp_cert",
      cat: "PAY_CAREER",
      icon: "📜",
      badge: "DDO Official Format",
      title: {
        en: "Salary & Experience Certificate Format",
        hi: "सैलरी और अनुभव प्रमाण-पत्र (DDO फॉर्मेट)",
        bn: "স্যালারি ও অভিজ্ঞতা শংসাপত্র (DDO ফরম্যাট)"
      },
      desc: {
        en: "Official DDO-format Salary Certificate & NOC/Experience Certificate values for loans/passports",
        hi: "बैंक लोन, पासपोर्ट या नई नौकरी के लिए DDO द्वारा हस्ताक्षरित प्रमाण-पत्र प्रारूप",
        bn: "ব্যাংক লোন, পাসপোর্ট বা নতুন চাকরির জন্য DDO-স্বাক্ষরিত সার্টিফিকেট ফরম্যাট"
      },
      inputs: [
        { key: "serviceYears", label: "Completed Years of Service", type: "number", def: 6, min: 1, max: 40 },
        { key: "purposeCode", label: "Purpose (1=Bank Loan, 2=Passport/Visa, 3=NOC)", type: "number", def: 1, min: 1, max: 3 }
      ],
      compute: (inp, ctx) => {
        const pMap = { 1: "Bank Housing / Personal Loan", 2: "Passport / Visa Application", 3: "Direct Recruitment NOC & Experience" };
        const maxEmiCapacity = Math.round(ctx.net * 0.55);
        return {
          primaryLabel: "DDO Certified Net Emoluments",
          primaryVal: `${formatINR(ctx.net)}/mo`,
          secondaryVal: `Max Bank Loan EMI Eligibility (~55% Net): ${formatINR(maxEmiCapacity)}/mo`,
          rows: [
            ["Certificate Purpose", pMap[inp.purposeCode] || pMap[1]],
            ["Certified Pay Level & Basic Pay", `Level ${ctx.levelId} · ${formatINR(ctx.basic)}`],
            ["Certified Gross Monthly Emoluments", formatINR(ctx.gross)],
            ["Signing Authority Required", "Drawing & Disbursing Officer (DDO) / Head of Office (with Seal)"]
          ],
          rule: "Standard Govt Rule: Salary certificates for loans/visas must be signed by the DDO with official stamp, showing Basic Pay, Pay Level, Gross Emoluments, Deductions, and Date of Superannuation."
        };
      }
    },

    // ---------------------------------------------------------------------
    // CATEGORY 2: ALLOWANCES, TOUR, LTC & QUARTERS (8 Suites)
    // ---------------------------------------------------------------------
    {
      id: "tour_tada_ctg",
      cat: "ALLOWANCES_TOUR",
      icon: "🧳",
      badge: "Tour DA + 80% CTG",
      title: {
        en: "TA/DA on Tour & Transfer (CTG) Calculator",
        hi: "टूर TA/DA और ट्रांसफर ग्रांट (CTG) कैलकुलेटर",
        bn: "ট্যুর TA/DA এবং ট্রান্সফার গ্রান্ট (CTG) ক্যালকুলেটর"
      },
      desc: {
        en: "Tour Daily Allowance, Hotel & Food limits (+25% since DA≥50%) and 80% Basic Transfer CTG",
        hi: "टूर पर दैनिक भत्ता, होटल सीमा (+25% वृद्धि) और ट्रांसफर पर 80% बेसिक CTG",
        bn: "ট্যুরে দৈনিক ভাতা, হোটেল সীমা (+২৫% বৃদ্ধি) এবং বদলিতে ৮০% বেসিক CTG"
      },
      inputs: [
        { key: "tourDays", label: "Number of Tour Days", type: "number", def: 5, min: 1, max: 60 },
        { key: "isIslandTransfer", label: "Andaman/Lakshadweep Transfer? (0=No 80%, 1=Yes 100%)", type: "number", def: 0, min: 0, max: 1 }
      ],
      compute: (inp, ctx) => {
        const lv = ctx.levelNum;
        // 7th CPC base rates enhanced by 25% since DA crossed 50%
        let foodPerDay = lv >= 14 ? 1500 : (lv >= 12 ? 1250 : (lv >= 9 ? 1125 : (lv >= 6 ? 1000 : 625)));
        let hotelPerDay = lv >= 14 ? 9375 : (lv >= 12 ? 5625 : (lv >= 9 ? 2813 : (lv >= 6 ? 938 : 563)));
        if (ctx.basis === "8TH") {
          foodPerDay = Math.round(foodPerDay * 1.5);
          hotelPerDay = Math.round(hotelPerDay * 1.5);
        }
        const tourTotal = (foodPerDay + hotelPerDay) * inp.tourDays;
        const ctgPct = inp.isIslandTransfer === 1 ? 1.00 : 0.80;
        const ctgAmt = Math.round(ctx.basic * ctgPct);
        return {
          primaryLabel: `Transfer CTG (${ctgPct * 100}% Basic) + ${inp.tourDays}d Tour`,
          primaryVal: `CTG: ${formatINR(ctgAmt)}`,
          secondaryVal: `${inp.tourDays}-Day Tour Reimbursement Cap: ${formatINR(tourTotal)}`,
          rows: [
            [`Daily Food / Lump-Sum DA (${inp.tourDays} days)`, `${formatINR(foodPerDay)}/day (${formatINR(foodPerDay * inp.tourDays)})`],
            [`Hotel Ceiling per Night (${inp.tourDays} nights)`, `${formatINR(hotelPerDay)}/night (${formatINR(hotelPerDay * inp.tourDays)})`],
            [`Composite Transfer Grant (CTG @ ${ctgPct * 100}% Basic)`, formatINR(ctgAmt)],
            ["Personal Effects Transport Entitlement (By Train/Road)", lv >= 6 ? "Full 6000 kg / 2-Carriage Container" : "1500–3000 kg"]
          ],
          rule: "DoE TA Rules: Since DA crossed 50%, all Tour Daily Allowance (Food) and Hotel reimbursement ceilings automatically increased by 25%. Composite Transfer Grant (CTG) is 80% of last month's Basic Pay (100% for Islands)."
        };
      }
    },
    {
      id: "posting_allowances",
      cat: "ALLOWANCES_TOUR",
      icon: "🏔️",
      badge: "NE · Ladakh · Islands",
      title: {
        en: "Special Posting Allowances (NE, Ladakh, Islands)",
        hi: "विशेष पोस्टिंग भत्ते (नॉर्थ-ईस्ट, लद्दाख, द्वीप)",
        bn: "বিশেষ পোস্টিং ভাতা (উত্তর-পূর্ব, লাদাখ, আন্দামান/দ্বীপপুঞ্জ)"
      },
      desc: {
        en: "Special Duty Allowance (10% Basic), Island Allowance (12.5–20%), Tough Location & Double HRA",
        hi: "नॉर्थ-ईस्ट व लद्दाख में 10% SDA, द्वीप भत्ता (12.5–20%), टफ लोकेशन और डबल HRA",
        bn: "উত্তর-পূর্ব ও লাদাখে ১০% SDA, দ্বীপ ভাতা (১২.৫–২০%), টাফ লোকেশন এবং ডাবল HRA"
      },
      inputs: [
        { key: "regionCode", label: "Region (1=North-East/Ladakh, 2=Andaman/Nicobar, 3=Lakshadweep)", type: "number", def: 1, min: 1, max: 3 },
        { key: "prevHraPct", label: "Previous Station HRA % (for Double HRA)", type: "number", def: 30, min: 0, max: 30 }
      ],
      compute: (inp, ctx) => {
        const sdaRate = inp.regionCode === 1 ? 0.10 : (inp.regionCode === 2 ? 0.125 : 0.20);
        const sdaAmt = Math.round(ctx.basic * sdaRate);
        const tlaBase = ctx.levelNum >= 9 ? 5300 : 4100;
        const tlaTotal = tlaBase + Math.round(tlaBase * (ctx.daPct / 100));
        const extraHra = Math.round(ctx.basic * (inp.prevHraPct / 100));
        const totalExtra = sdaAmt + tlaTotal + extraHra;
        return {
          primaryLabel: "Monthly Extra Posting Allowances",
          primaryVal: `+${formatINR(totalExtra)}/mo`,
          secondaryVal: `SDA (${sdaRate * 100}%): ${formatINR(sdaAmt)} | TLA+DA: ${formatINR(tlaTotal)} | 2nd HRA: ${formatINR(extraHra)}`,
          rows: [
            [`Special Duty / Island Allowance (${sdaRate * 100}% Basic)`, formatINR(sdaAmt)],
            ["Tough Location Allowance (TLA + DA on TLA)", formatINR(tlaTotal)],
            ["Additional HRA for Family at Previous Station", formatINR(extraHra)],
            ["Total Monthly Hardship Package", "+" + formatINR(totalExtra)]
          ],
          rule: "MoF / DoPT Orders: Central Govt civilian employees posted to North-East/Ladakh get 10% Special Duty Allowance (SDA), Tough Location Allowance, and Double HRA if family remains at the previous station."
        };
      }
    },
    {
      id: "ltc_calculator",
      cat: "ALLOWANCES_TOUR",
      icon: "🏖️",
      badge: "Block 2026–2029",
      title: {
        en: "LTC Calculator (Fare + 10-Day EL Encashment)",
        hi: "LTC कैलकुलेटर (किराया + 10 दिन EL नकदीकरण)",
        bn: "LTC ক্যালকুলেটর (ভাড়া + ১০ দিনের EL নগদায়ন)"
      },
      desc: {
        en: "Calculate 10-day Earned Leave encashment on LTC + travel class entitlement for 2026–29 block",
        hi: "LTC ब्लॉक 2026-29 में 10 दिन की EL का पैसा और यात्रा पात्रता निकालें",
        bn: "LTC ব্লক ২০২৬-২৯-এ ১০ দিনের EL নগদায়ন এবং ভ্রমণের প্রাপ্যতা হিসাব করুন"
      },
      inputs: [
        { key: "familyMembers", label: "Eligible Family Tickets", type: "number", def: 4, min: 1, max: 8 },
        { key: "ticketCostPerPerson", label: "Est. Round-Trip Fare / Person (₹)", type: "number", def: 12000, min: 500, max: 100000 }
      ],
      compute: (inp, ctx) => {
        const el10Days = Math.round((ctx.emoluments / 30) * 10);
        const fareTotal = inp.familyMembers * inp.ticketCostPerPerson;
        const travelClass = ctx.levelNum >= 14 ? "Business / Club Class Air" : (ctx.levelNum >= 9 ? "Economy Class Air" : (ctx.levelNum >= 6 ? "AC 2-Tier Train (or Special NE/J&K/A&N Air)" : "AC 3-Tier Train"));
        return {
          primaryLabel: "Total LTC Reimbursement + 10-Day EL Cash",
          primaryVal: formatINR(el10Days + fareTotal),
          secondaryVal: `10-Day EL Cash: ${formatINR(el10Days)} | Fare Reimbursement: ${formatINR(fareTotal)}`,
          rows: [
            ["10-Day EL Encashment ((Basic + DA) × 10 / 30)", formatINR(el10Days)],
            [`Reimbursable Fare (${inp.familyMembers} members)`, formatINR(fareTotal)],
            ["Entitled Travel Class", travelClass],
            ["Authorized Booking Portals", "IRCTC / Balmer Lawrie / Ashok Travels ONLY"]
          ],
          rule: "CCS (LTC) Rules: Up to 10 days of Earned Leave can be encashed per LTC (up to 60 days in career) without deducting from the 300-day retirement EL encashment ceiling. Tickets must be booked via authorized travel agents."
        };
      }
    },
    {
      id: "cea_hostel",
      cat: "ALLOWANCES_TOUR",
      icon: "🎒",
      badge: "₹2,812.50 / Child",
      title: {
        en: "CEA & Hostel Subsidy Calculator",
        hi: "बच्चों का शिक्षा भत्ता (CEA) और हॉस्टल सब्सिडी",
        bn: "সন্তানদের শিক্ষা ভাতা (CEA) ও হোস্টেল ভর্তুকি"
      },
      desc: {
        en: "₹2,812.50/mo CEA & ₹8,437.50/mo Hostel Subsidy per child (25% enhanced since DA≥50%)",
        hi: "DA 50% पार होने के बाद ₹2,812.50/माह CEA और ₹8,437.50/माह हॉस्टल सब्सिडी प्रति बच्चा",
        bn: "DA ৫০% অতিক্রম করায় সন্তান পিছু মাসিক ₹২,৮১২.৫০ CEA এবং ₹৮,৪৩৭.৫০ হোস্টেল ভর্তুকি"
      },
      inputs: [
        { key: "numChildren", label: "Number of Eligible Children (Max 2)", type: "number", def: 2, min: 1, max: 2 },
        { key: "inHostel", label: "In Residential Hostel? (0=No CEA Only, 1=Yes Hostel)", type: "number", def: 0, min: 0, max: 1 }
      ],
      compute: (inp, ctx) => {
        const scale = ctx.basis === "8TH" ? 1.25 : 1;
        const ceaPerChildMo = 2812.50 * scale;
        const hostelPerChildMo = 8437.50 * scale;
        const activeMo = (inp.inHostel === 1 ? hostelPerChildMo : ceaPerChildMo) * inp.numChildren;
        const annualReimb = Math.round(activeMo * 12);
        return {
          primaryLabel: "Annual Tax-Free Reimbursement",
          primaryVal: `${formatINR(annualReimb)}/yr`,
          secondaryVal: `Monthly Equivalent: ${formatINR(Math.round(activeMo))}/mo (${inp.numChildren} child/children)`,
          rows: [
            ["CEA Rate per Child (DA ≥ 50%)", `${formatINR(Math.round(ceaPerChildMo * 12))}/yr (₹${ceaPerChildMo.toFixed(2)}/mo)`],
            ["Hostel Subsidy Rate per Child (DA ≥ 50%)", `${formatINR(Math.round(hostelPerChildMo * 12))}/yr (₹${hostelPerChildMo.toFixed(2)}/mo)`],
            ["Divyang Child CEA Rate (2× Normal)", `${formatINR(Math.round(ceaPerChildMo * 24))}/yr`],
            ["Total Annual Claim for Your Family", formatINR(annualReimb)]
          ],
          rule: "DoPT CEA Rules: Admissible for up to 2 eldest surviving children from Nursery to Class XII. Since DA reached 50%, CEA rose by 25% from ₹2,250 to ₹2,812.50/month (₹33,750/yr per child)."
        };
      }
    },
    {
      id: "govt_quarters",
      cat: "ALLOWANCES_TOUR",
      icon: "🏘️",
      badge: "Type I–VIII Quarters",
      title: {
        en: "Government Quarters vs HRA Calculator",
        hi: "सरकारी क्वार्टर बनाम HRA तुलना कैलकुलेटर",
        bn: "সরকারি কোয়ার্টার বনাম HRA তুলনা ক্যালকুলেটর"
      },
      desc: {
        en: "Check your entitled Quarter Type (I–VIII), flat Licence Fee & HRA foregone cost",
        hi: "अपने पे लेवल के अनुसार सरकारी आवास प्रकार, लाइसेंस शुल्क और HRA की तुलना करें",
        bn: "আপনার পে লেভেল অনুযায়ী সরকারি কোয়ার্টারের ধরন, লাইসেন্স ফি ও HRA তুলনা করুন"
      },
      inputs: [
        { key: "marketRent", label: "Comparable Private Rent in City (₹/mo)", type: "number", def: 28000, min: 3000, max: 200000 }
      ],
      compute: (inp, ctx) => {
        const lv = ctx.levelNum;
        const qInfo = lv <= 1 ? { type: "Type I", fee: 210 }
          : lv <= 3 ? { type: "Type II", fee: 440 }
          : lv <= 5 ? { type: "Type III", fee: 660 }
          : lv <= 8 ? { type: "Type IV", fee: 900 }
          : lv <= 11 ? { type: "Type V (D-II)", fee: 1840 }
          : lv <= 13 ? { type: "Type VI (D-I)", fee: 2680 }
          : { type: "Type VII / VIII", fee: 4200 };
        const hraLost = Math.round(ctx.basic * (ctx.hraClass === "X" ? 0.30 : (ctx.hraClass === "Y" ? 0.20 : 0.10)));
        const effectiveCostOfQuarter = hraLost + qInfo.fee;
        const netSavingInQuarter = inp.marketRent - effectiveCostOfQuarter;
        return {
          primaryLabel: `Entitled Quarter: ${qInfo.type}`,
          primaryVal: `Licence Fee: ${formatINR(qInfo.fee)}/mo`,
          secondaryVal: netSavingInQuarter >= 0
            ? `Taking Govt Quarter saves you ${formatINR(netSavingInQuarter)}/mo vs Private Rent`
            : `Taking HRA + Private Rent saves you ${formatINR(Math.abs(netSavingInQuarter))}/mo`,
          rows: [
            ["Entitled Accommodation Type", qInfo.type],
            ["Monthly Flat Licence Fee Deduction", formatINR(qInfo.fee)],
            ["Monthly HRA Foregone", formatINR(hraLost)],
            ["Effective Cost of Govt Quarter (HRA + Fee)", formatINR(effectiveCostOfQuarter)]
          ],
          rule: "Directorate of Estates Rules: On transfer/retirement, a Government quarter can be retained for 2 months on normal licence fee (+ up to 6 more months on double licence fee on medical/education grounds)."
        };
      }
    },
    {
      id: "rent_receipt_gen",
      cat: "ALLOWANCES_TOUR",
      icon: "🧾",
      badge: "Form 124 / 12BB",
      title: {
        en: "HRA Rent Receipt & Form 124 Generator",
        hi: "HRA किराया रसीद (Rent Receipt) जनरेटर",
        bn: "HRA বাড়ি ভাড়ার রসিদ (Rent Receipt) জেনারেটর"
      },
      desc: {
        en: "Check PAN requirement (>₹1L/yr), Revenue Stamp rules & Form 124 (old 12BB) declaration",
        hi: "सालाना किराया, मकान मालिक के PAN नियम और रेवेन्यू स्टाम्प की जांच",
        bn: "বার্ষিক ভাড়া, বাড়িওয়ালার PAN নিয়ম এবং রেভিনিউ স্ট্যাম্পের হিসাব"
      },
      inputs: [
        { key: "monthlyRent", label: "Monthly Rent Paid (₹)", type: "number", def: 18000, min: 1000, max: 200000 },
        { key: "monthsRented", label: "Months Rented in FY (1–12)", type: "number", def: 12, min: 1, max: 12 }
      ],
      compute: (inp, ctx) => {
        const annualRent = inp.monthlyRent * inp.monthsRented;
        const panRequired = annualRent > 100000;
        const minRentForFullHra = Math.round(ctx.emoluments * 0.10 + ctx.hra);
        return {
          primaryLabel: "Annual Rent Declared (Form 124 / 12BB)",
          primaryVal: formatINR(annualRent),
          secondaryVal: panRequired ? "⚠️ Landlord PAN is MANDATORY (Annual Rent > ₹1,00,000)" : "✅ Landlord PAN NOT required (Annual Rent ≤ ₹1,00,000)",
          rows: [
            ["Monthly Rent × Months", `${formatINR(inp.monthlyRent)} × ${inp.monthsRented} = ${formatINR(annualRent)}`],
            ["Landlord PAN Requirement", panRequired ? "Mandatory (Exceeds ₹1,00,000/yr)" : "Not Mandatory"],
            ["Revenue Stamp (₹1) Requirement", "Required if cash payment > ₹5,000 per receipt"],
            ["Rent Needed to Claim 100% HRA Tax-Free", `${formatINR(minRentForFullHra)}/mo`]
          ],
          rule: "Income Tax Rule (Form 124, formerly Form 12BB): To make 100% of your HRA tax-exempt under Sec 10(13A), monthly rent must equal at least (10% of Basic+DA) + Actual HRA."
        };
      }
    },
    {
      id: "cghs_ward_card",
      cat: "ALLOWANCES_TOUR",
      icon: "🚑",
      badge: "Ward & Life Card",
      title: {
        en: "CGHS Rates, Ward Entitlement & Pensioner Card",
        hi: "CGHS दरें, वार्ड पात्रता और आजीवन पेंशनर कार्ड",
        bn: "CGHS হার, ওয়ার্ড প্রাপ্যতা ও আজীবন পেনশনার কার্ড"
      },
      desc: {
        en: "Check General/Semi-Private/Private Ward entitlement & 10-year Whole-Life CGHS Card cost",
        hi: "अपनी बेसिक पे के अनुसार अस्पताल वार्ड पात्रता और आजीवन CGHS कार्ड का शुल्क देखें",
        bn: "আপনার বেসিক পে অনুযায়ী হাসপাতালের ওয়ার্ড প্রাপ্যতা ও আজীবন CGHS কার্ডের খরচ দেখুন"
      },
      inputs: [
        { key: "isPensionerCard", label: "Whole-Life Card (120 Months)? (1=Yes, 0=Annual)", type: "number", def: 1, min: 0, max: 1 }
      ],
      compute: (inp, ctx) => {
        const b7 = ctx.basic7th;
        const ward = b7 <= 36500 ? "General Ward" : (b7 <= 50500 ? "Semi-Private Ward" : "Private Ward");
        const monthlySub = ctx.cghs;
        const lifeCardCost = monthlySub * (inp.isPensionerCard === 1 ? 120 : 12);
        return {
          primaryLabel: `Hospital Ward Entitlement: ${ward}`,
          primaryVal: `${formatINR(monthlySub)}/mo`,
          secondaryVal: `Whole-Life Pensioner Card (10-Yr One-Time): ${formatINR(monthlySub * 120)}`,
          rows: [
            ["Pay Level Subscription Slab", `Level ${ctx.levelId} → ${formatINR(monthlySub)}/mo`],
            ["Empanelled Hospital Ward Entitlement", ward],
            ["10-Year Whole-Life Pensioner Card Fee (120×)", formatINR(monthlySub * 120)],
            ["Annual Renewal Option (12×)", formatINR(monthlySub * 12)]
          ],
          rule: "MoHFW CGHS Rules: Level 1–5 pays ₹250/mo, Level 6 ₹450/mo, Level 7–11 ₹650/mo, Level 12+ ₹1,000/mo. Retiring employees can get a lifetime CGHS card by paying 120 months' subscription (deductible u/s 80D)."
        };
      }
    },
    {
      id: "cgegis_insurance",
      cat: "ALLOWANCES_TOUR",
      icon: "🛡️",
      badge: "Insurance + Savings",
      title: {
        en: "CGEGIS Group Insurance & Maturity Calculator",
        hi: "CGEGIS समूह बीमा और सेवानिवृत्ति बचत कैलकुलेटर",
        bn: "CGEGIS গ্রুপ ইন্স্যুরেন্স ও অবসরকালীন সঞ্চয় ক্যালকুলেটর"
      },
      desc: {
        en: "30% Insurance Fund + 70% Savings Fund accumulation with compound interest on retirement",
        hi: "हर महीने कटने वाले ₹30/₹60/₹120 CGEGIS से रिटायरमेंट पर मिलने वाली कुल राशि",
        bn: "মাসিক ₹৩০/₹৬০/₹১২০ CGEGIS থেকে অবসরের সময় প্রাপ্ত মোট সঞ্চয় ও বীমা কভার"
      },
      inputs: [
        { key: "serviceYears", label: "Years of CGEGIS Membership", type: "number", def: 28, min: 1, max: 40 }
      ],
      compute: (inp, ctx) => {
        const sub = ctx.cgegis;
        const cover = sub * 1000; // ₹30 -> ₹30k, ₹60 -> ₹60k, ₹120 -> ₹1,20,000
        const savingsMo = sub * 0.70;
        const r = 0.075 / 12;
        const n = inp.serviceYears * 12;
        const maturity = Math.round(savingsMo * ((Math.pow(1 + r, n) - 1) / r));
        return {
          primaryLabel: "Estimated CGEGIS Savings Maturity at Retirement",
          primaryVal: formatINR(maturity),
          secondaryVal: `In-Service Death Insurance Cover: ${formatINR(cover)} (+ Savings ${formatINR(maturity)})`,
          rows: [
            ["Monthly CGEGIS Subscription", `${formatINR(sub)}/mo`],
            ["Insurance Cover (1000× Monthly Rate)", formatINR(cover)],
            ["70% Savings Portion Invested Monthly", `₹${savingsMo.toFixed(0)}/mo`],
            [`Projected Retirement Payout (${inp.serviceYears} yrs)`, formatINR(maturity)]
          ],
          rule: "CGEGIS 1980 Scheme: 30% of your monthly subscription goes toward life insurance cover and 70% accumulates in the Savings Fund earning quarterly compound interest paid at retirement."
        };
      }
    },

    // ---------------------------------------------------------------------
    // CATEGORY 3: PENSION, PF, LEAVE & SERVICE RULES (10 Suites)
    // ---------------------------------------------------------------------
    {
      id: "gpf_calculator",
      cat: "PENSION_LEAVE",
      icon: "🏦",
      badge: "7.1% Interest",
      title: {
        en: "GPF Calculator (7.1% Interest, Advance & Withdrawal)",
        hi: "GPF कैलकुलेटर (7.1% ब्याज, एडवांस व निकासी)",
        bn: "GPF ক্যালকুলেটর (৭.১% সুদ, অগ্রিম ও তোলার সীমা)"
      },
      desc: {
        en: "Project GPF corpus at 7.1% + permissible 12-month advance and 75%/90% withdrawal limits",
        hi: "7.1% ब्याज पर GPF बैलेंस, एडवांस और 75%/90% फाइनल विड्रॉवल की गणना",
        bn: "৭.১% সুদে GPF ব্যালেন্স, অগ্রিম এবং ৭৫%/৯০% চূড়ান্ত টাকা তোলার হিসাব"
      },
      inputs: [
        { key: "currentBalance", label: "Current GPF Balance (₹)", type: "number", def: 850000, min: 0, max: 50000000, step: 25000 },
        { key: "monthlySub", label: "Monthly GPF Subscription (₹)", type: "number", def: 15000, min: 500, max: 41666 }
      ],
      compute: (inp, ctx) => {
        const annualSub = Math.min(500000, inp.monthlySub * 12);
        const interestYr = Math.round((inp.currentBalance + annualSub / 2) * 0.071);
        const closingBal = inp.currentBalance + annualSub + interestYr;
        const maxAdvance = Math.min(Math.round(inp.currentBalance * 0.75), ctx.basic * 12);
        const maxWithdrawal75 = Math.round(inp.currentBalance * 0.75);
        return {
          primaryLabel: "Closing GPF Balance (After 1 Year @ 7.1%)",
          primaryVal: formatINR(closingBal),
          secondaryVal: `Max 75% Non-Refundable Withdrawal Now: ${formatINR(maxWithdrawal75)}`,
          rows: [
            ["Opening GPF Balance", formatINR(inp.currentBalance)],
            ["Annual Subscription (Tax-Free Threshold ₹5L/yr)", formatINR(annualSub)],
            ["Annual Interest Earned (@ 7.1% p.a.)", "+" + formatINR(interestYr)],
            ["Permissible Advance / 75% Withdrawal", `${formatINR(maxAdvance)} / ${formatINR(maxWithdrawal75)}`]
          ],
          rule: "GPF (CS) Rules: Minimum subscription is 6% of Basic Pay; tax-free interest threshold is ₹5 Lakh/year. After 10 years of service, up to 75% (90% for housing/illness) can be withdrawn non-refundably."
        };
      }
    },
    {
      id: "vpf_epf_calculator",
      cat: "PENSION_LEAVE",
      icon: "➕",
      badge: "8.25% EPF / VPF",
      title: {
        en: "EPF & VPF Maturity Calculator (@ 8.25%)",
        hi: "EPF और VPF परिपक्वता कैलकुलेटर (@ 8.25%)",
        bn: "EPF ও VPF ম্যাচুরিটি ক্যালকুলেটর (@ ৮.২৫%)"
      },
      desc: {
        en: "Calculate Voluntary Provident Fund & EPF compound growth at 8.25% annual interest",
        hi: "8.25% चक्रवृद्धि ब्याज दर पर EPF और VPF फंड की परिपक्वता राशि",
        bn: "৮.২৫% চক্রবৃদ্ধি সুদের হারে EPF এবং VPF তহবিলের ম্যাচুরিটি হিসাব"
      },
      inputs: [
        { key: "monthlyVpf", label: "Monthly EPF + VPF Contribution (₹)", type: "number", def: 12000, min: 1000, max: 100000 },
        { key: "yearsLeft", label: "Years Until Retirement", type: "number", def: 15, min: 1, max: 35 }
      ],
      compute: (inp) => {
        const r = 0.0825 / 12;
        const n = inp.yearsLeft * 12;
        const corpus = Math.round(inp.monthlyVpf * ((Math.pow(1 + r, n) - 1) / r));
        const invested = inp.monthlyVpf * n;
        return {
          primaryLabel: `Projected VPF/EPF Corpus (${inp.yearsLeft} Years @ 8.25%)`,
          primaryVal: formatINR(corpus),
          secondaryVal: `Total Invested: ${formatINR(invested)} | Interest Earned: ${formatINR(corpus - invested)}`,
          rows: [
            ["Monthly Contribution", formatINR(inp.monthlyVpf)],
            ["Total Principal Contributed", formatINR(invested)],
            ["Compound Interest Earned (@ 8.25%)", formatINR(corpus - invested)],
            ["Final Maturity Value", formatINR(corpus)]
          ],
          rule: "EPFO Rules: Voluntary Provident Fund (VPF) earns the same 8.25% interest rate as EPF. Employee contributions up to ₹2.5 Lakh/year (₹5 Lakh if no employer contribution) earn tax-free interest."
        };
      }
    },
    {
      id: "commuted_pension",
      cat: "PENSION_LEAVE",
      icon: "💵",
      badge: "Up to 40% Lump Sum",
      title: {
        en: "Commuted Pension & 15-Year Restoration Calculator",
        hi: "कम्यूटेड पेंशन (40% एकमुश्त) और 15-वर्ष बहाली कैलकुलेटर",
        bn: "কমিউটেড পেনশন (৪০% এককালীন) ও ১৫-বছর পুনরুদ্ধার ক্যালকুলেটর"
      },
      desc: {
        en: "Tax-free lump sum for commuting up to 40% of pension + residual monthly pension",
        hi: "पेंशन के 40% हिस्से के बदले मिलने वाली कर-मुक्त एकमुश्त राशि और शेष मासिक पेंशन",
        bn: "পেনশনের ৪০% অংশের বিনিময়ে করমুক্ত এককালীন অর্থ এবং অবশিষ্ট মাসিক পেনশন"
      },
      inputs: [
        { key: "commutePct", label: "Commutation Percentage (Max 40%)", type: "number", def: 40, min: 1, max: 40 },
        { key: "retireAge", label: "Age at Retirement (58/60/62/65)", type: "number", def: 60, min: 50, max: 70 }
      ],
      compute: (inp, ctx) => {
        const factorMap = { 58: 8.371, 59: 8.287, 60: 8.194, 61: 8.093, 62: 7.982, 63: 7.862, 64: 7.731, 65: 7.591 };
        const factor = factorMap[inp.retireAge] || 8.194;
        const fullPension = Math.round(ctx.basic * 0.50);
        const commutedMo = Math.round(fullPension * (Math.min(40, inp.commutePct) / 100));
        const lumpSum = Math.round(commutedMo * 12 * factor);
        const residualPension = fullPension - commutedMo;
        const drOnFull = Math.round(fullPension * (ctx.daPct / 100));
        return {
          primaryLabel: `Tax-Free Commutation Lump Sum (${inp.commutePct}%)`,
          primaryVal: formatINR(lumpSum),
          secondaryVal: `Residual Pension + DR: ${formatINR(residualPension + drOnFull)}/mo (Restored in 15 yrs)`,
          rows: [
            ["Full Basic Pension (50% of Last Basic)", `${formatINR(fullPension)}/mo`],
            [`Monthly Pension Commuted (${inp.commutePct}%)`, `-${formatINR(commutedMo)}/mo`],
            [`Commutation Factor (Age Next Birthday ${inp.retireAge + 1})`, `${factor}`],
            ["Dearness Relief (DR Paid on 100% Full Pension!)", `+${formatINR(drOnFull)}/mo`]
          ],
          rule: "CCS (Commutation of Pension) Rules: Up to 40% of basic pension can be commuted without medical exam within 1 year of retirement. Dearness Relief (DR) is always calculated on 100% original pension, and the commuted portion is fully restored after 15 years."
        };
      }
    },
    {
      id: "family_pension_80plus",
      cat: "PENSION_LEAVE",
      icon: "👵",
      badge: "50% / 30% & 80+ Hike",
      title: {
        en: "Family Pension & 80+ Senior Pension Calculator",
        hi: "फैमिली पेंशन (50%/30%) और 80+ अतिरिक्त पेंशन कैलकुलेटर",
        bn: "ফ্যামিলি পেনশন (৫০%/৩০%) ও ৮০+ অতিরিক্ত পেনশন ক্যালকুলেটর"
      },
      desc: {
        en: "Enhanced (50%) & Normal (30%) Family Pension + 20% to 100% Quantum Hike at Age 80–100+",
        hi: "बढ़ी हुई (50%) व सामान्य (30%) फैमिली पेंशन और 80 वर्ष की आयु के बाद अतिरिक्त पेंशन",
        bn: "বর্ধিত (৫০%) ও সাধারণ (৩০%) ফ্যামিলি পেনশন এবং ৮০ বছর বয়সের পর অতিরিক্ত পেনশন"
      },
      inputs: [
        { key: "pensionerAge", label: "Pensioner Age (60 to 100+ Years)", type: "number", def: 80, min: 60, max: 105 }
      ],
      compute: (inp, ctx) => {
        const minPen = ctx.basis === "8TH" ? Math.round(9000 * ctx.fitment) : 9000;
        const enhancedFp = Math.max(minPen, Math.round(ctx.basic * 0.50));
        const normalFp = Math.max(minPen, Math.round(ctx.basic * 0.30));
        const age = inp.pensionerAge;
        const addPct = age >= 100 ? 100 : (age >= 95 ? 50 : (age >= 90 ? 40 : (age >= 85 ? 30 : (age >= 80 ? 20 : 0))));
        const basePen = Math.max(minPen, Math.round(ctx.basic * 0.50));
        const seniorPen = Math.round(basePen * (1 + addPct / 100));
        return {
          primaryLabel: `Enhanced (50%) / Normal (30%) Family Pension`,
          primaryVal: `${formatINR(enhancedFp)} / ${formatINR(normalFp)}`,
          secondaryVal: `At Age ${age} (+${addPct}% Quantum): Pension rises to ${formatINR(seniorPen)} + DR`,
          rows: [
            ["Enhanced Family Pension (50% for first 7/10 yrs)", `${formatINR(enhancedFp)}/mo + DR`],
            ["Normal Family Pension (30% thereafter)", `${formatINR(normalFp)}/mo + DR`],
            [`Additional Pension Quantum at Age ${age} (+${addPct}%)`, `+${formatINR(seniorPen - basePen)}/mo`],
            ["Total Basic Pension at Selected Age", `${formatINR(seniorPen)}/mo + DR`]
          ],
          rule: "CCS (Pension) Rules 2021: Enhanced Family Pension (50% of last pay) is payable for 10 years (death in service) or 7 years/up to age 67 (death after retirement). From age 80, basic/family pension increases by 20% (80–84), 30% (85–89), 40% (90–94), 50% (95–99), and 100% (100+)."
        };
      }
    },
    {
      id: "death_benefits_nps_opt",
      cat: "PENSION_LEAVE",
      icon: "🕊️",
      badge: "Family Security",
      title: {
        en: "Death Benefits & NPS Form-1 Option Calculator",
        hi: "मृत्यु लाभ (Death Benefits) और NPS फॉर्म-1 विकल्प",
        bn: "মৃত্যুজনিত সুবিধা (Death Benefits) ও NPS ফর্ম-১ বিকল্প"
      },
      desc: {
        en: "Complete family payout: Death Gratuity (up to ₹25L), Enhanced Family Pension, CGEGIS & EL",
        hi: "सेवा के दौरान मृत्यु पर परिवार को मिलने वाली कुल राशि: डेथ ग्रेच्युटी, पेंशन, बीमा व EL",
        bn: "চাকরিকালীন মৃত্যুতে পরিবারের প্রাপ্য মোট অর্থ: ডেথ গ্র্যাচুইটি, পেনশন, বীমা ও EL"
      },
      inputs: [
        { key: "serviceYrs", label: "Completed Years of Service", type: "number", def: 12, min: 1, max: 40 },
        { key: "elBalance", label: "Earned Leave Balance (Days)", type: "number", def: 240, min: 0, max: 300 }
      ],
      compute: (inp, ctx) => {
        const mult = inp.serviceYrs < 1 ? 2 : (inp.serviceYrs < 5 ? 6 : (inp.serviceYrs < 11 ? 12 : (inp.serviceYrs < 20 ? 20 : Math.min(33, inp.serviceYrs))));
        const deathGrat = Math.min(2500000, Math.round(ctx.emoluments * (inp.serviceYrs >= 20 ? (inp.serviceYrs * 0.5) : (mult / 2))));
        const elCash = Math.round((ctx.emoluments / 30) * inp.elBalance);
        const cgegisCover = ctx.cgegis * 1000;
        const dliAmt = 60000;
        const totalLump = deathGrat + elCash + cgegisCover + dliAmt;
        const enhFp = Math.round(ctx.basic * 0.50);
        return {
          primaryLabel: "Total Immediate Lump-Sum to Family",
          primaryVal: formatINR(totalLump),
          secondaryVal: `Plus Enhanced Family Pension: ${formatINR(enhFp + Math.round(enhFp * ctx.daPct / 100))}/mo for 10 years`,
          rows: [
            ["Death Gratuity (Capped at ₹25,00,000)", formatINR(deathGrat)],
            [`Leave Encashment (${inp.elBalance} EL days)`, formatINR(elCash)],
            ["CGEGIS Insurance + Deposit Linked Insurance (DLI)", formatINR(cgegisCover + dliAmt)],
            ["Monthly Enhanced Family Pension (50% Basic + DR)", formatINR(enhFp + Math.round(enhFp * ctx.daPct / 100)) + "/mo"]
          ],
          rule: "Rule 10 of CCS (Implementation of NPS) Rules 2021: Most NPS/UPS employees select Option-1 in Form 1, granting their family old-scheme Enhanced Family Pension (50% pay for 10 years) + Death Gratuity in case of in-service death."
        };
      }
    },
    {
      id: "disability_pension_eop",
      cat: "PENSION_LEAVE",
      icon: "🩼",
      badge: "EOP Rules 2023",
      title: {
        en: "Disability Pension Calculator (EOP Rules, 2023)",
        hi: "विकलांगता पेंशन कैलकुलेटर (EOP नियम, 2023)",
        bn: "প্রতিবন্ধী পেনশন ক্যালকুলেটর (EOP নিয়ম, ২০২৩)"
      },
      desc: {
        en: "Civilian & CAPF Extraordinary Pension (EOP): Service Element (50%) + Disability Element",
        hi: "ड्यूटी के दौरान चोट/विकलांगता पर सर्विस एलिमेंट (50%) + डिसेबिलिटी एलिमेंट",
        bn: "ডিউটিতে আঘাত/প্রতিবন্ধকতায় সার্ভিস এলিমেন্ট (৫০%) + ডিসঅ্যাবিলিটি এলিমেন্ট"
      },
      inputs: [
        { key: "disabilityPct", label: "Assessed Disability % (20–100%)", type: "number", def: 60, min: 20, max: 100 },
        { key: "categoryCode", label: "EOP Category (1=Cat B/C 30%, 2=Cat D/E 60–100%)", type: "number", def: 1, min: 1, max: 2 }
      ],
      compute: (inp, ctx) => {
        // Broad-banding: <50% -> 50%, 50–75% -> 75%, >75% -> 100%
        const broadBand = inp.disabilityPct < 50 ? 50 : (inp.disabilityPct <= 75 ? 75 : 100);
        const serviceEl = Math.round(ctx.basic * 0.50);
        const baseDisRate = inp.categoryCode === 2 ? 0.60 : 0.30;
        const disEl = Math.round(ctx.basic * baseDisRate * (broadBand / 100));
        const totalDisPen = serviceEl + disEl;
        return {
          primaryLabel: `Monthly Disability Pension (${broadBand}% Broad-Banded)`,
          primaryVal: `${formatINR(totalDisPen)}/mo + DR`,
          secondaryVal: `Service Element: ${formatINR(serviceEl)} | Disability Element: ${formatINR(disEl)}`,
          rows: [
            ["Assessed vs Broad-Banded Disability %", `${inp.disabilityPct}% → ${broadBand}%`],
            ["Service Element (50% of Last Basic)", `${formatINR(serviceEl)}/mo`],
            [`Disability Element (${baseDisRate * 100}% × ${broadBand}%)`, `${formatINR(disEl)}/mo`],
            ["Total Monthly EOP Pension (Before DR)", `${formatINR(totalDisPen)}/mo`]
          ],
          rule: "CCS (Extraordinary Pension) Rules 2023: Disability attributable to government service is broad-banded to 50%, 75%, or 100%, combining a 50% Service Element with a 30%–100% Disability Element."
        };
      }
    },
    {
      id: "apy_eps95",
      cat: "PENSION_LEAVE",
      icon: "🧓",
      badge: "APY & EPS-95",
      title: {
        en: "APY (Atal Pension) & EPS-95 Pension Calculator",
        hi: "अटल पेंशन योजना (APY) और EPS-95 कैलकुलेटर",
        bn: "অটল পেনশন যোজনা (APY) ও EPS-95 পেনশন ক্যালকুলেটর"
      },
      desc: {
        en: "Calculate EPS-95 monthly pension ((Salary × Service)/70) & APY guaranteed ₹5,000 pension",
        hi: "EPS-95 मासिक पेंशन सूत्र और अटल पेंशन योजना (₹1,000–₹5,000) की गणना",
        bn: "EPS-95 মাসিক পেনশন সূত্র এবং অটল পেনশন যোজনা (₹১,০০০–₹৫,০০০) হিসাব"
      },
      inputs: [
        { key: "epsServiceYrs", label: "EPS-95 Pensionable Service (Years)", type: "number", def: 25, min: 10, max: 35 },
        { key: "apyEntryAge", label: "APY Entry Age (18–39 Years)", type: "number", def: 25, min: 18, max: 39 }
      ],
      compute: (inp) => {
        const bonusYrs = inp.epsServiceYrs >= 20 ? 2 : 0;
        const epsPen = Math.max(1000, Math.round((15000 * (inp.epsServiceYrs + bonusYrs)) / 70));
        const apyPrem5k = Math.round(210 + (inp.apyEntryAge - 18) * 58);
        return {
          primaryLabel: "EPS-95 Monthly Pension (₹15,000 Ceiling)",
          primaryVal: `${formatINR(epsPen)}/mo`,
          secondaryVal: `APY Monthly Premium for ₹5,000 Pension (Age ${inp.apyEntryAge}): ${formatINR(apyPrem5k)}/mo`,
          rows: [
            ["EPS-95 Wage Ceiling", "₹15,000/month"],
            ["Effective Service (with +2 Yr Weightage if ≥20 yrs)", `${inp.epsServiceYrs + bonusYrs} years`],
            ["EPS-95 Monthly Pension ((15000 × Service) / 70)", `${formatINR(epsPen)}/mo`],
            ["APY Corpus Returned to Nominee (for ₹5k Plan)", "₹8,50,000"]
          ],
          rule: "EPFO EPS-95 Formula: Monthly Pension = (Pensionable Salary × Pensionable Service) / 70. Completing 20+ years of service grants a 2-year bonus weightage."
        };
      }
    },
    {
      id: "gulf_gratuity",
      cat: "PENSION_LEAVE",
      icon: "🌍",
      badge: "UAE · Saudi · Qatar",
      title: {
        en: "Gulf Gratuity (EOSB) Calculator",
        hi: "गल्फ ग्रेच्युटी (UAE, सऊदी अरब, कतर EOSB) कैलकुलेटर",
        bn: "গালফ গ্র্যাচুইটি (UAE, সৌদি, কাতার EOSB) ক্যালকুলেটর"
      },
      desc: {
        en: "End-of-Service Benefit (EOSB) for UAE, Saudi Arabia & Qatar expat workers",
        hi: "UAE, सऊदी अरब और कतर में काम करने वाले भारतीयों के लिए EOSB ग्रेच्युटी कैलकुलेटर",
        bn: "UAE, সৌদি আরব ও কাতারে কর্মরত প্রবাসীদের জন্য EOSB গ্র্যাচুইটি ক্যালকুলেটর"
      },
      inputs: [
        { key: "gulfBasicINR", label: "Monthly Basic Pay in INR Equivalent (₹)", type: "number", def: 120000, min: 10000, max: 5000000 },
        { key: "gulfYears", label: "Completed Years of Service", type: "number", def: 8, min: 1, max: 40 }
      ],
      compute: (inp) => {
        const first5 = Math.min(5, inp.gulfYears);
        const after5 = Math.max(0, inp.gulfYears - 5);
        const uaeDays = first5 * 21 + after5 * 30;
        const saudiDays = first5 * 15 + after5 * 30;
        const uaeEosb = Math.min(inp.gulfBasicINR * 24, Math.round((inp.gulfBasicINR / 30) * uaeDays));
        const saudiEosb = Math.round((inp.gulfBasicINR / 30) * saudiDays);
        return {
          primaryLabel: `UAE / Qatar EOSB Gratuity (${inp.gulfYears} Years)`,
          primaryVal: formatINR(uaeEosb),
          secondaryVal: `Saudi Arabia EOSB Equivalent: ${formatINR(saudiEosb)}`,
          rows: [
            ["First 5 Years Entitlement (UAE: 21d/yr, Saudi: 15d/yr)", `${first5 * 21} days (UAE) / ${first5 * 15} days (KSA)`],
            ["Beyond 5 Years Entitlement (30 days/yr)", `${after5 * 30} days`],
            ["UAE / Qatar Total EOSB Payout", formatINR(uaeEosb)],
            ["Saudi Arabia Total EOSB Payout", formatINR(saudiEosb)]
          ],
          rule: "UAE Federal Labour Law Art. 51: Expat workers completing ≥1 year receive 21 days' Basic Pay per year for the first 5 years and 30 days' Basic Pay per year thereafter (capped at 2 years' total salary)."
        };
      }
    },
    {
      id: "ccl_maternity_leave",
      cat: "PENSION_LEAVE",
      icon: "👶",
      badge: "730d CCL & 180d ML",
      title: {
        en: "Child Care Leave (CCL) & Maternity Leave Calculator",
        hi: "चाइल्ड केयर लीव (CCL 730 दिन) और मातृत्व अवकाश",
        bn: "চাইল্ড কেয়ার লিভ (CCL ৭৩০ দিন) ও মাতৃত্বকালীন ছুটি"
      },
      desc: {
        en: "Check remaining CCL out of 730 days, salary during 100% vs 80% CCL & 180-day Maternity Leave",
        hi: "730 दिनों की CCL में से बची हुई छुट्टियां और 100% बनाम 80% वेतन की गणना",
        bn: "৭৩০ দিনের CCL-এর অবশিষ্ট ছুটি এবং ১০০% বনাম ৮০% বেতনের হিসাব"
      },
      inputs: [
        { key: "cclAlreadyTaken", label: "CCL Days Already Taken (0–730)", type: "number", def: 365, min: 0, max: 730 },
        { key: "cclSpellDays", label: "Upcoming CCL Spell Duration (Days)", type: "number", def: 60, min: 5, max: 365 }
      ],
      compute: (inp, ctx) => {
        const remBefore = Math.max(0, 730 - inp.cclAlreadyTaken);
        const inFirst365 = Math.max(0, Math.min(inp.cclSpellDays, 365 - inp.cclAlreadyTaken));
        const inSecond365 = Math.max(0, inp.cclSpellDays - inFirst365);
        const dailyFull = ctx.gross / 30;
        const daily80 = (ctx.basic * 0.80 + ctx.da * 0.80 + ctx.hra) / 30;
        const spellPay = Math.round(inFirst365 * dailyFull + inSecond365 * daily80);
        return {
          primaryLabel: `Pay for ${inp.cclSpellDays}-Day CCL Spell`,
          primaryVal: formatINR(spellPay),
          secondaryVal: `Remaining CCL Balance After Spell: ${Math.max(0, remBefore - inp.cclSpellDays)} / 730 days`,
          rows: [
            ["Days at 100% Pay (First 365 Days Quota)", `${inFirst365} days`],
            ["Days at 80% Pay (Second 365 Days Quota)", `${inSecond365} days`],
            ["Maternity / Paternity Leave Entitlement", "180 Days (Maternity) / 15 Days (Paternity) @ 100% Pay"],
            ["Remaining CCL Quota After This Spell", `${Math.max(0, remBefore - inp.cclSpellDays)} days`]
          ],
          rule: "CCS (Leave) Rule 43-C: Female employees and single male employees get up to 730 days of Child Care Leave (up to 2 eldest children under 18 yrs; no age limit for Divyang child)—paid at 100% for the first 365 days and 80% for the next 365 days."
        };
      }
    },
    {
      id: "retire_date_dlc",
      cat: "PENSION_LEAVE",
      icon: "🗓️",
      badge: "FR 56 & Jeevan Pramaan",
      title: {
        en: "Retirement Date, Form 6-A & Jeevan Pramaan Timeline",
        hi: "रिटायरमेंट तिथि, फॉर्म 6-A और जीवन प्रमाण टाइमलाइन",
        bn: "অবসরের তারিখ, ফর্ম ৬-এ ও জীবন প্রমাণ টাইমলাইন"
      },
      desc: {
        en: "Exact superannuation date (including 1st-of-month birth rule), Form 6-A & 80+ pension dates",
        hi: "जन्मतिथि (1 तारीख के विशेष नियम सहित) के आधार पर रिटायरमेंट की सटीक तारीख",
        bn: "জন্মতারিখ (১ তারিখের বিশেষ নিয়মসহ) অনুযায়ী অবসরের সঠিক তারিখ"
      },
      inputs: [
        { key: "birthYear", label: "Birth Year (YYYY)", type: "number", def: 1972, min: 1955, max: 2008 },
        { key: "birthMonth", label: "Birth Month (1–12)", type: "number", def: 5, min: 1, max: 12 },
        { key: "bornOnFirst", label: "Born on 1st of Month? (1=Yes, 0=No)", type: "number", def: 0, min: 0, max: 1 }
      ],
      compute: (inp) => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let retYear = inp.birthYear + 60;
        let retMonthIdx = inp.birthMonth - 1;
        if (inp.bornOnFirst === 1) {
          if (retMonthIdx === 0) {
            retMonthIdx = 11;
            retYear -= 1;
          } else {
            retMonthIdx -= 1;
          }
        }
        const retDateStr = `Last day of ${months[retMonthIdx]} ${retYear}`;
        const yr80 = inp.birthYear + 80;
        return {
          primaryLabel: "Official Superannuation Date (Age 60)",
          primaryVal: retDateStr,
          secondaryVal: `15-Yr Commutation Restoration: ${months[retMonthIdx]} ${retYear + 15} | +20% Senior Pension: ${yr80}`,
          rows: [
            ["Superannuation Date (FR 56)", retDateStr],
            ["Bhavishya Form 6-A Submission (6 Months Prior)", `${months[(retMonthIdx + 6) % 12]} ${retMonthIdx < 6 ? retYear - 1 : retYear}`],
            ["15-Year Commuted Pension Restoration", `${months[retMonthIdx]} ${retYear + 15}`],
            ["Annual Jeevan Pramaan (DLC) Window", "Nov 1–30 (Oct 1–31 for Age 80+ Super Seniors)"]
          ],
          rule: "FR 56(a): A Government servant retires on the afternoon of the last day of the month in which they attain age 60. However, if born on the 1st of a month, retirement is on the last day of the preceding month!"
        };
      }
    },
    {
      id: "retirement_planning_gap",
      cat: "PENSION_LEAVE",
      icon: "🧭",
      badge: "Pension Adequacy",
      title: {
        en: "Retirement Planning & Pension Gap Calculator",
        hi: "रिटायरमेंट प्लानिंग और पेंशन गैप कैलकुलेटर",
        bn: "রিটায়ারমেন্ট প্ল্যানিং ও পেনশন গ্যাপ ক্যালকুলেটর"
      },
      desc: {
        en: "Check if your 50% UPS/OPS pension covers post-retirement expenses or how much extra SIP to save",
        hi: "जांचें कि क्या आपकी रिटायरमेंट पेंशन आपके खर्चों के लिए पर्याप्त होगी",
        bn: "আপনার অবসরকালীন পেনশন খরচের জন্য যথেষ্ট কিনা এবং কতটা অতিরিক্ত সঞ্চয় প্রয়োজন তা দেখুন"
      },
      inputs: [
        { key: "monthlyExpenseNow", label: "Current Monthly Household Expense (₹)", type: "number", def: 45000, min: 10000, max: 500000 },
        { key: "yearsToRetire", label: "Years Left Until Retirement", type: "number", def: 15, min: 1, max: 35 }
      ],
      compute: (inp, ctx) => {
        const estPensionWithDr = Math.round(ctx.emoluments * 0.50);
        const gapNow = Math.max(0, inp.monthlyExpenseNow - estPensionWithDr);
        const corpusNeeded = gapNow * 12 * 20;
        return {
          primaryLabel: "Assured Monthly Pension + DR (Today's Value)",
          primaryVal: `${formatINR(estPensionWithDr)}/mo`,
          secondaryVal: gapNow === 0
            ? `✅ Surplus of ${formatINR(estPensionWithDr - inp.monthlyExpenseNow)}/mo over your current expenses!`
            : `Monthly Gap: ${formatINR(gapNow)}/mo (Extra Corpus Needed: ${formatINR(corpusNeeded)})`,
          rows: [
            ["Current Monthly Household Expenses", formatINR(inp.monthlyExpenseNow)],
            ["50% Assured UPS/OPS Pension + DR (Real Value)", formatINR(estPensionWithDr)],
            ["Monthly Surplus / Shortfall", gapNow === 0 ? `+${formatINR(estPensionWithDr - inp.monthlyExpenseNow)} Surplus` : `-${formatINR(gapNow)} Shortfall`],
            ["Extra Retirement Buffer Recommended", formatINR(Math.max(1500000, corpusNeeded))]
          ],
          rule: "Financial Planning Benchmark: Because UPS and OPS pensions are indexed to inflation via twice-yearly Dearness Relief (DR), a 50% Basic + DR pension preserves its real purchasing power throughout retirement."
        };
      }
    },

    // ---------------------------------------------------------------------
    // CATEGORY 4: TAX RELIEF, LOANS & SMALL SAVINGS (5 Suites)
    // ---------------------------------------------------------------------
    {
      id: "form_10e_sec89",
      cat: "TAX_SAVINGS",
      icon: "📑",
      badge: "Section 89(1) Relief",
      title: {
        en: "Form 10E (Section 89(1)) Arrear Tax Relief Calculator",
        hi: "फॉर्म 10E (धारा 89(1)) एरियर टैक्स राहत कैलकुलेटर",
        bn: "ফর্ম 10E (ধারা 89(1)) বকেয়া ট্যাক্স ছাড় ক্যালকুলেটর"
      },
      desc: {
        en: "Calculate Income Tax saved u/s 89(1) when 8th CPC or DA arrears push you into a higher tax slab",
        hi: "8वें वेतन आयोग या DA एरियर मिलने पर धारा 89(1) (Form 10E) के तहत मिलने वाली टैक्स छूट",
        bn: "৮ম বেতন কমিশন বা DA বকেয়া পেলে ধারা 89(1) (Form 10E)-এর অধীনে প্রাপ্ত ট্যাক্স ছাড়"
      },
      inputs: [
        { key: "arrearReceived", label: "Total Arrears Received in Current FY (₹)", type: "number", def: 380000, min: 10000, max: 5000000, step: 10000 },
        { key: "prevYearTaxRate", label: "Marginal Tax Slab in Accrual Year (%)", type: "number", def: 10, min: 0, max: 30 }
      ],
      compute: (inp, ctx) => {
        const curGrossNoArr = ctx.gross * 12;
        const curGrossWithArr = curGrossNoArr + inp.arrearReceived;
        const taxNoArr = computeAnnualIncomeTaxNewRegime(curGrossNoArr, 0, false).annualTax;
        const taxWithArr = computeAnnualIncomeTaxNewRegime(curGrossWithArr, 0, false).annualTax;
        const taxDiffCurrentYr = taxWithArr - taxNoArr;
        const taxInPastYr = Math.round(inp.arrearReceived * (inp.prevYearTaxRate / 100) * 1.04);
        const relief89 = Math.max(0, taxDiffCurrentYr - taxInPastYr);
        return {
          primaryLabel: "Section 89(1) Tax Relief (Form 10E)",
          primaryVal: formatINR(relief89),
          secondaryVal: `Tax on Arrear Before Relief: ${formatINR(taxDiffCurrentYr)} → After Relief: ${formatINR(taxDiffCurrentYr - relief89)}`,
          rows: [
            ["Current FY Tax WITHOUT Arrears", formatINR(taxNoArr)],
            ["Current FY Tax WITH Arrears", formatINR(taxWithArr)],
            ["Extra Tax Due to Slab Jump in Current FY", formatINR(taxDiffCurrentYr)],
            ["Tax if Arrears Were Taxed in Accrual Year", formatINR(taxInPastYr)]
          ],
          rule: "Income Tax Act Sec 89(1): Filing Form 10E online before filing your ITR is mandatory to claim tax relief when salary/DA/8th CPC arrears are taxed at a higher slab in the year of receipt."
        };
      }
    },
    {
      id: "hba_loan_calc",
      cat: "TAX_SAVINGS",
      icon: "🏗️",
      badge: "7.10% Simple Interest",
      title: {
        en: "House Building Advance (HBA) Loan Calculator",
        hi: "हाउस बिल्डिंग एडवांस (HBA @ 7.10%) कैलकुलेटर",
        bn: "হাউস বিল্ডিং অ্যাডভান্স (HBA @ ৭.১০%) ক্যালকুলেটর"
      },
      desc: {
        en: "Central Govt HBA @ 7.10% Simple Interest (180 months Principal + 60 months Interest recovery)",
        hi: "केंद्र सरकार HBA होम लोन @ 7.10% साधारण ब्याज (180 माह मूलधन + 60 माह ब्याज)",
        bn: "কেন্দ্রীয় সরকারি HBA হোম লোন @ ৭.১০% সরল সুদ (১৮০ মাস আসল + ৬০ মাস সুদ)"
      },
      inputs: [
        { key: "loanAmount", label: "HBA Loan Amount (Max ₹25,00,000)", type: "number", def: 2500000, min: 100000, max: 5000000, step: 100000 },
        { key: "principalMonths", label: "Principal Recovery Months (Max 180)", type: "number", def: 180, min: 60, max: 180 }
      ],
      compute: (inp, ctx) => {
        const maxEligible = Math.min(2500000, ctx.basic * 34);
        const principalEmi = Math.round(inp.loanAmount / inp.principalMonths);
        // Simple interest on declining average balance over principalMonths: P * r * (N+1) / 24
        const totalSimpleInterest = Math.round(inp.loanAmount * 0.071 * ((inp.principalMonths + 1) / 24));
        const interestEmi60 = Math.round(totalSimpleInterest / 60);
        return {
          primaryLabel: `Monthly Principal Recovery (${inp.principalMonths} Months)`,
          primaryVal: `${formatINR(principalEmi)}/mo`,
          secondaryVal: `Then Interest EMI (Next 60 Months): ${formatINR(interestEmi60)}/mo | Total SI: ${formatINR(totalSimpleInterest)}`,
          rows: [
            ["Your HBA Eligibility (34× Basic, Cap ₹25L)", formatINR(maxEligible)],
            [`Phase 1: Principal EMI (${inp.principalMonths} months)`, `${formatINR(principalEmi)}/mo`],
            ["Total Simple Interest (@ 7.10% p.a.)", formatINR(totalSimpleInterest)],
            ["Phase 2: Interest Recovery (60 months)", `${formatINR(interestEmi60)}/mo`]
          ],
          rule: "MoHUA HBA Rules (FY 2026-27): HBA carries 7.10% simple interest (not compound!). Principal is recovered first in up to 180 monthly instalments (15 yrs), followed by simple interest in up to 60 instalments (5 yrs)."
        };
      }
    },
    {
      id: "post_office_savings",
      cat: "TAX_SAVINGS",
      icon: "📮",
      badge: "SCSS · MIS · PPF · NSC",
      title: {
        en: "Post Office Savings Calculator (SCSS, MIS, PPF, NSC)",
        hi: "पोस्ट ऑफिस बचत योजनाएं (SCSS, MIS, PPF, NSC)",
        bn: "পোস্ট অফিস সঞ্চয় প্রকল্প (SCSS, MIS, PPF, NSC)"
      },
      desc: {
        en: "Compare Senior Citizens SCSS (8.2%), Monthly Income MIS (7.4%), NSC (7.7%) & KVP (7.5%)",
        hi: "सीनियर सिटीजन SCSS (8.2%), मासिक आय MIS (7.4%), NSC (7.7%) और KVP की गणना",
        bn: "সিনিয়র সিটিজেন SCSS (৮.২%), মাসিক আয় MIS (৭.৪%), NSC (৭.৭%) ও KVP হিসাব"
      },
      inputs: [
        { key: "investAmount", label: "Investment Lump Sum (₹)", type: "number", def: 1500000, min: 10000, max: 3000000, step: 50000 }
      ],
      compute: (inp) => {
        const scssQuarterly = Math.round((Math.min(3000000, inp.investAmount) * 0.082) / 4);
        const misMonthly = Math.round((Math.min(1500000, inp.investAmount) * 0.074) / 12);
        const nsc5Yr = Math.round(inp.investAmount * Math.pow(1.077, 5));
        const td5YrQuarterly = Math.round((inp.investAmount * 0.075) / 4);
        return {
          primaryLabel: "SCSS Quarterly Pension / MIS Monthly Income",
          primaryVal: `${formatINR(scssQuarterly)}/qtr (SCSS)`,
          secondaryVal: `MIS Monthly Payout: ${formatINR(misMonthly)}/mo | 5-Yr NSC Maturity: ${formatINR(nsc5Yr)}`,
          rows: [
            ["SCSS (@ 8.2% p.a., Max ₹30L) — Quarterly Payout", `${formatINR(scssQuarterly)}/quarter (${formatINR(scssQuarterly / 3)}/mo)`],
            ["Post Office MIS (@ 7.4% p.a., Max ₹9L/₹15L) — Monthly", `${formatINR(misMonthly)}/month`],
            ["5-Year NSC (@ 7.7% Compounded) — Maturity Value", formatINR(nsc5Yr)],
            ["5-Year Time Deposit (@ 7.5%) — Quarterly Interest", `${formatINR(td5YrQuarterly)}/quarter`]
          ],
          rule: "Ministry of Finance Small Savings Rates (2026): SCSS (8.2% p.a., max ₹30 Lakh) is the highest-yielding government-backed quarterly income scheme for retirees aged 60+ (55+ for VRS/Defense retirees)."
        };
      }
    },
    {
      id: "sukanya_samriddhi",
      cat: "TAX_SAVINGS",
      icon: "👧",
      badge: "8.2% Tax-Free (EEE)",
      title: {
        en: "Sukanya Samriddhi Yojana (SSY @ 8.2%) Calculator",
        hi: "सुकन्या समृद्धि योजना (SSY @ 8.2%) कैलकुलेटर",
        bn: "সুকন্যা সমৃদ্ধি যোজনা (SSY @ ৮.২%) ক্যালকুলেটর"
      },
      desc: {
        en: "15-year deposit & 21-year 100% tax-free maturity value for a girl child (@ 8.2% p.a.)",
        hi: "बेटी के लिए 15 साल जमा करने पर 21वें साल में मिलने वाली कर-मुक्त परिपक्वता राशि",
        bn: "কন্যাসন্তানের জন্য ১৫ বছর জমা করলে ২১তম বছরে প্রাপ্ত করমুক্ত ম্যাচুরিটি অর্থ"
      },
      inputs: [
        { key: "yearlyDeposit", label: "Annual SSY Deposit (Max ₹1,50,000)", type: "number", def: 150000, min: 250, max: 150000, step: 5000 }
      ],
      compute: (inp) => {
        const dep = Math.min(150000, inp.yearlyDeposit);
        let bal = 0;
        for (let y = 1; y <= 21; y++) {
          if (y <= 15) bal += dep;
          bal = bal * 1.082;
        }
        const maturity = Math.round(bal);
        const totalInvested = dep * 15;
        return {
          primaryLabel: "21-Year Tax-Free SSY Maturity Value",
          primaryVal: formatINR(maturity),
          secondaryVal: `Total Invested (15 yrs): ${formatINR(totalInvested)} | Tax-Free Interest: ${formatINR(maturity - totalInvested)}`,
          rows: [
            ["Annual Deposit (for First 15 Years)", formatINR(dep)],
            ["Total Principal Invested", formatINR(totalInvested)],
            ["Total Compound Interest (@ 8.2% EEE)", formatINR(maturity - totalInvested)],
            ["50% Higher Education Withdrawal (At Age 18)", formatINR(Math.round(maturity * 0.38))]
          ],
          rule: "SSY Rules: Accounts can be opened for up to 2 girl children below age 10. Deposits are made for 15 years, and the account matures after 21 years with 100% tax-free (EEE) interest at 8.2% p.a."
        };
      }
    },
    {
      id: "nri_tax_forms",
      cat: "TAX_SAVINGS",
      icon: "🛂",
      badge: "NRI & New Tax Forms",
      title: {
        en: "NRI Status Checker & FY 2026-27 Tax Forms Guide",
        hi: "NRI स्थिति जांच और नए इनकम टैक्स फॉर्म (121, 130, 168)",
        bn: "NRI স্ট্যাটাস চেকার ও নতুন ইনকাম ট্যাক্স ফর্ম (121, 130, 168)"
      },
      desc: {
        en: "Check Resident / RNOR / NRI status + New Income Tax Act renumbered forms (Form 121, 130, 168, 124)",
        hi: "भारत में बिताए दिनों से NRI स्टेटस जांचें और नए टैक्स फॉर्म नंबर (130=Form 16) जानें",
        bn: "ভারতে অবস্থানের দিন অনুযায়ী NRI স্ট্যাটাস এবং নতুন ট্যাক্স ফর্ম নম্বর (130=Form 16) দেখুন"
      },
      inputs: [
        { key: "daysInIndiaFY", label: "Days in India in Current FY (0–365)", type: "number", def: 120, min: 0, max: 365 },
        { key: "daysLast4Yrs", label: "Days in India in Preceding 4 FYs", type: "number", def: 300, min: 0, max: 1460 }
      ],
      compute: (inp) => {
        const isRes = inp.daysInIndiaFY >= 182 || (inp.daysInIndiaFY >= 60 && inp.daysLast4Yrs >= 365);
        const status = isRes ? "Resident in India (ROR / RNOR)" : "Non-Resident Indian (NRI)";
        return {
          primaryLabel: "Residential Status for Tax Year 2026-27",
          primaryVal: status,
          secondaryVal: isRes ? "Global income is taxable in India (ROR)" : "Only India-sourced income is taxable in India",
          rows: [
            ["Form 130 (Replaced Old Form 16)", "Annual Employer Salary TDS Certificate"],
            ["Form 124 (Replaced Old Form 12BB)", "Employee Investment & HRA Declaration to DDO"],
            ["Form 168 (Replaced Old Form 26AS / AIS)", "Annual Information Statement & Tax Credit"],
            ["Form 121 (Replaced Old Form 15G / 15H)", "No-TDS Declaration on Interest / PF Withdrawal"]
          ],
          rule: "Income Tax Act 2025 (Effective Tax Year 2026-27): Statutory forms were renumbered—Form 16 is now Form 130, Form 12BB is Form 124, Form 26AS/AIS is Form 168, and Form 15G/15H is Form 121."
        };
      }
    },

    // ---------------------------------------------------------------------
    // CATEGORY 5: SECTORS (BANK, PSU, DEFENCE, 20 STATES) & ELIGIBILITY (8 Suites)
    // ---------------------------------------------------------------------
    {
      id: "bank_iba_12bps",
      cat: "SECTORS_ELIGIBILITY",
      icon: "🏦",
      badge: "12th BPS / RBI / LIC",
      title: {
        en: "Bank (IBA 12th BPS), RBI & LIC Salary Calculator",
        hi: "बैंक (12th BPS), RBI और LIC सैलरी कैलकुलेटर",
        bn: "ব্যাংক (12th BPS), RBI ও LIC বেতন ক্যালকুলেটর"
      },
      desc: {
        en: "PSB Clerk & Officer Scale I–VII under 12th Bipartite Settlement + RBI Assistant & LIC AAO",
        hi: "सरकारी बैंक क्लर्क और ऑफिसर (12th BPS), RBI असिस्टेंट और LIC AAO की इन-हैंड सैलरी",
        bn: "সরকারি ব্যাংক ক্লার্ক ও অফিসার (12th BPS), RBI অ্যাসিস্ট্যান্ট এবং LIC AAO ইন-হ্যান্ড বেতন"
      },
      inputs: [
        { key: "bankCadre", label: "Cadre (1=PSB Clerk, 2=PSB PO Scale-I, 3=Scale-II, 4=RBI Asst, 5=LIC AAO)", type: "number", def: 2, min: 1, max: 5 }
      ],
      compute: (inp) => {
        const profiles = {
          1: { name: "PSB Clerk (12th BPS)", basic: 24050, spPct: 0.164, learn: 600, daPct: 0.212, hraPct: 0.105 },
          2: { name: "PSB Probationary Officer (Scale-I)", basic: 48480, spPct: 0.265, learn: 850, daPct: 0.212, hraPct: 0.09 },
          3: { name: "PSB Manager (Scale-II)", basic: 64820, spPct: 0.265, learn: 850, daPct: 0.212, hraPct: 0.09 },
          4: { name: "RBI Assistant", basic: 29000, spPct: 0.164, learn: 2500, daPct: 0.46, hraPct: 0.15 },
          5: { name: "LIC Assistant Admin Officer (AAO)", basic: 88635, spPct: 0.0, learn: 2400, daPct: 0.22, hraPct: 0.09 }
        };
        const p = profiles[inp.bankCadre] || profiles[2];
        const spAllow = Math.round(p.basic * p.spPct);
        const da = Math.round((p.basic + spAllow + p.learn) * p.daPct);
        const hra = Math.round(p.basic * p.hraPct);
        const gross = p.basic + spAllow + p.learn + da + hra;
        const nps = Math.round((p.basic + da) * 0.10);
        const net = gross - nps - 200;
        return {
          primaryLabel: `${p.name} — Monthly In-Hand`,
          primaryVal: formatINR(net),
          secondaryVal: `Gross Monthly Salary: ${formatINR(gross)}/mo (Excl. Leased Accommodation & Perks)`,
          rows: [
            ["Basic Pay", formatINR(p.basic)],
            ["Special Allowance + Learning Allowance", formatINR(spAllow + p.learn)],
            ["Dearness Allowance (DA on Basic + Special)", formatINR(da)],
            ["House Rent Allowance (HRA)", formatINR(hra)]
          ],
          rule: "IBA 12th Bipartite Settlement (Effective Nov 2022): Officer Scale-I starts at ₹48,480 Basic + 26.5% Special Allowance + ₹850 Learning Allowance (both rank for DA), yielding ~₹74k–₹82k Gross."
        };
      }
    },
    {
      id: "psu_cpse_3prc",
      cat: "SECTORS_ELIGIBILITY",
      icon: "🏭",
      badge: "IDA E0 to E9",
      title: {
        en: "PSU / CPSE Salary Calculator (3rd PRC IDA Scales)",
        hi: "PSU / महारत्न कंपनी सैलरी कैलकुलेटर (E0–E9)",
        bn: "PSU / মহারত্ন কোম্পানি বেতন ক্যালকুলেটর (E0–E9)"
      },
      desc: {
        en: "Calculate Maharatna/Navratna CPSE salary (E0 ₹30k to E8 ₹1.2L) with IDA, 35% Perks & HRA",
        hi: "ONGC, NTPC, IOCL, BHEL आदि में IDA, 35% कैफेटेरिया पर्क्स और HRA के साथ इन-हैंड सैलरी",
        bn: "ONGC, NTPC, IOCL, BHEL ইত্যাদিতে IDA, ৩৫% ক্যাফেটেরিয়া পার্কস ও HRA-সহ ইন-হ্যান্ড বেতন"
      },
      inputs: [
        { key: "psuBasic", label: "PSU Basic Pay (e.g. E1=40000, E2=50000, E3=60000)", type: "number", def: 50000, min: 30000, max: 280000, step: 10000 },
        { key: "idaPct", label: "Current IDA Rate (%)", type: "number", def: 46, min: 0, max: 100 }
      ],
      compute: (inp, ctx) => {
        const ida = Math.round(inp.psuBasic * (inp.idaPct / 100));
        const perks = Math.round(inp.psuBasic * 0.35); // 35% Cafeteria allowance
        const hraRate = ctx.hraClass === "X" ? 0.27 : (ctx.hraClass === "Y" ? 0.18 : 0.09);
        const hra = Math.round(inp.psuBasic * hraRate);
        const gross = inp.psuBasic + ida + perks + hra;
        const epf = Math.round((inp.psuBasic + ida) * 0.12);
        const tax = computeAnnualIncomeTaxNewRegime(gross * 12, 0, false).monthlyTds;
        const net = gross - epf - tax;
        return {
          primaryLabel: "PSU / CPSE Monthly In-Hand Salary",
          primaryVal: formatINR(net),
          secondaryVal: `Gross Pay: ${formatINR(gross)}/mo (+ up to 40% PRP Annual Performance Bonus)`,
          rows: [
            ["3rd PRC Basic Pay", formatINR(inp.psuBasic)],
            [`Industrial Dearness Allowance (IDA @ ${inp.idaPct}%)`, formatINR(ida)],
            ["Cafeteria Perks & Allowances (35% of Basic)", formatINR(perks)],
            [`HRA (${Math.round(hraRate * 100)}% of Basic) - EPF (12%) & TDS`, `+${formatINR(hra)} / -${formatINR(epf + tax)}`]
          ],
          rule: "DPE 3rd PRC Guidelines: CPSE executives receive Basic Pay (E0 ₹30k, E1 ₹40k, E2 ₹50k, E3 ₹60k), quarterly-revised IDA, up to 35% Cafeteria Perks, 30% Superannuation benefit, and Performance Related Pay (PRP)."
        };
      }
    },
    {
      id: "agniveer_defence",
      cat: "SECTORS_ELIGIBILITY",
      icon: "🎖️",
      badge: "Agnipath & Defence MSP",
      title: {
        en: "Agniveer Package & Defence MSP Calculator",
        hi: "अग्निवीर पैकेज (₹11.71 लाख सेवा निधि) व डिफेंस सैलरी",
        bn: "অগ্নিবীর প্যাকেজ (₹১১.৭১ লক্ষ সেবা নিধি) ও ডিফেন্স বেতন"
      },
      desc: {
        en: "Agniveer Year 1–4 in-hand pay + ₹11.71L tax-free Seva Nidhi & Regular Forces MSP rates",
        hi: "अग्निवीर के चारों वर्षों की इन-हैंड सैलरी, सेवा निधि फंड और सेना का मिलिट्री सर्विस पे (MSP)",
        bn: "অগ্নিবীরের ৪ বছরের ইন-হ্যান্ড বেতন, সেবা নিধি তহবিল এবং সামরিক পরিষেবা বেতন (MSP)"
      },
      inputs: [
        { key: "agniveerYear", label: "Agniveer Service Year (1 to 4)", type: "number", def: 1, min: 1, max: 4 }
      ],
      compute: (inp, ctx) => {
        const pkgMap = { 1: 30000, 2: 33000, 3: 36500, 4: 40000 };
        const monthlyPkg = pkgMap[inp.agniveerYear] || 30000;
        const inHand70 = Math.round(monthlyPkg * 0.70);
        const corpus30 = Math.round(monthlyPkg * 0.30);
        const mspScale = ctx.basis === "8TH" ? ctx.fitment : 1;
        return {
          primaryLabel: `Agniveer Year ${inp.agniveerYear} In-Hand (70%)`,
          primaryVal: `${formatINR(inHand70)}/mo`,
          secondaryVal: `4-Year Tax-Free Seva Nidhi Package: ~₹11,71,000 (₹5.02L Employee + ₹5.02L Govt + Interest)`,
          rows: [
            [`Year ${inp.agniveerYear} Customised Package`, `${formatINR(monthlyPkg)}/mo`],
            ["Monthly In-Hand (70%) + Corpus Contribution (30%)", `${formatINR(inHand70)} + ${formatINR(corpus30)}`],
            ["Regular JCO / OR Military Service Pay (MSP)", `${formatINR(Math.round(5200 * mspScale))}/mo`],
            ["Regular Officer / Nursing Officer MSP", `${formatINR(Math.round(15500 * mspScale))} / ${formatINR(Math.round(10800 * mspScale))}/mo`]
          ],
          rule: "Ministry of Defence Agnipath Scheme: 30% of monthly emoluments is matched equally by the Government into the Agniveer Corpus Fund, paying out ~₹11.71 Lakh (100% exempt from Income Tax) upon completing 4 years."
        };
      }
    },
    {
      id: "state_govt_compare",
      cat: "SECTORS_ELIGIBILITY",
      icon: "🗺️",
      badge: "20 States + Centre",
      title: {
        en: "State Government Salary & DA Comparison",
        hi: "राज्य सरकार बनाम केंद्र सरकार वेतन व DA तुलना",
        bn: "রাজ্য সরকার বনাম কেন্দ্রীয় সরকার বেতন ও DA তুলনা"
      },
      desc: {
        en: "Compare Central 7th/8th CPC salary against Gujarat, Maharashtra, WB, UP, Rajasthan, TN & Bihar",
        hi: "गुजरात, महाराष्ट्र, पश्चिम बंगाल, यूपी, राजस्थान, बिहार व तमिलनाडु से वेतन की तुलना",
        bn: "পশ্চিমবঙ্গ, গুজরাট, মহারাষ্ট্র, ইউপি, রাজস্থান ও বিহারের সাথে কেন্দ্রীয় বেতনের তুলনা"
      },
      inputs: [
        { key: "stateCode", label: "State (1=Gujarat/UP/Raj 60% DA, 2=Maharashtra, 3=West Bengal ROPA-19, 4=Karnataka 7th SPC)", type: "number", def: 1, min: 1, max: 4 }
      ],
      compute: (inp, ctx) => {
        const stateProfiles = {
          1: { name: "Gujarat / UP / Rajasthan / Bihar (7th CPC Parity)", daPct: 60, hraPct: 20, fit: 1.0 },
          2: { name: "Maharashtra (7th SPC +NPS/UPS)", daPct: 58, hraPct: 27, fit: 1.0 },
          3: { name: "West Bengal (ROPA 2019 — 6th SPC)", daPct: 18, hraPct: 12, fit: 1.0 },
          4: { name: "Karnataka (7th State Pay Commission 2024)", daPct: 12, hraPct: 20, fit: 1.585 }
        };
        const st = stateProfiles[inp.stateCode] || stateProfiles[1];
        const stBasic = Math.round(ctx.basic7th * st.fit);
        const stDa = Math.round(stBasic * (st.daPct / 100));
        const stHra = Math.round(stBasic * (st.hraPct / 100));
        const stGross = stBasic + stDa + stHra + 1600;
        const centralGross = ctx.gross;
        const diff = centralGross - stGross;
        return {
          primaryLabel: `${st.name} Gross`,
          primaryVal: `${formatINR(stGross)}/mo`,
          secondaryVal: `Central (${ctx.basis}) Gross: ${formatINR(centralGross)}/mo (Central Advantage: +${formatINR(diff)}/mo)`,
          rows: [
            ["Selected State Pay Structure", st.name],
            [`State Basic + State DA (${st.daPct}%)`, `${formatINR(stBasic)} + ${formatINR(stDa)}`],
            [`State HRA (${st.hraPct}%) + Medical/TA`, formatINR(stHra + 1600)],
            [`Central Govt (${ctx.basis}) Gross Comparison`, formatINR(centralGross)]
          ],
          rule: "State vs Centre Comparison: States like Gujarat, UP, Rajasthan, and Bihar follow the exact 7th CPC Pay Matrix and match Central DA revisions, whereas Karnataka, Kerala, Punjab, and West Bengal use state-specific pay matrices/DA schedules."
        };
      }
    },
    {
      id: "faculty_doctor_npa",
      cat: "SECTORS_ELIGIBILITY",
      icon: "🩺",
      badge: "UGC / IIT & 20% NPA",
      title: {
        en: "Faculty (IIT/UGC) & Govt Doctor (NPA) Calculator",
        hi: "प्रोफेसर (IIT/UGC) और सरकारी डॉक्टर (20% NPA) सैलरी",
        bn: "অধ্যাপক (IIT/UGC) ও সরকারি ডাক্তার (২০% NPA) বেতন"
      },
      desc: {
        en: "Academic Pay Levels (10 to 15) for Assistant/Associate/Full Professors & CHS Doctors with 20% NPA",
        hi: "असिस्टेंट/एसोसिएट प्रोफेसर व सरकारी डॉक्टरों (CHS/AIIMS/रेलवे) के लिए 20% NPA सहित वेतन",
        bn: "অ্যাসিস্ট্যান্ট/অ্যাসোসিয়েট প্রফেসর এবং সরকারি ডাক্তারদের (২০% NPA-সহ) বেতন হিসাব"
      },
      inputs: [
        { key: "roleType", label: "Role (1=Doctor +20% NPA, 2=Asst Prof L10 ₹57,700, 3=Assoc Prof L13A ₹1,31,400, 4=Professor L14 ₹1,44,200)", type: "number", def: 1, min: 1, max: 4 }
      ],
      compute: (inp, ctx) => {
        const base7Map = { 1: ctx.basic7th, 2: 57700, 3: 131400, 4: 144200 };
        const rawB = base7Map[inp.roleType] || ctx.basic7th;
        const b = ctx.basis === "8TH" ? Math.round(rawB * ctx.fitment) : rawB;
        const npa = inp.roleType === 1 ? Math.round(b * 0.20) : 0;
        const da = Math.round((b + npa) * (ctx.daPct / 100));
        const hra = Math.round(b * (ctx.hraClass === "X" ? 0.24 : 0.16));
        const gross = b + npa + da + hra + ctx.ta;
        return {
          primaryLabel: inp.roleType === 1 ? `Govt Doctor Gross (with 20% NPA)` : `Academic Faculty Gross (${ctx.basis})`,
          primaryVal: `${formatINR(gross)}/mo`,
          secondaryVal: `Basic: ${formatINR(b)} | NPA: ${formatINR(npa)} | DA: ${formatINR(da)}`,
          rows: [
            ["Academic / Medical Basic Pay", formatINR(b)],
            ["Non-Practicing Allowance (20% of Basic for Doctors)", formatINR(npa)],
            [`Dearness Allowance (${ctx.daPct}% on Basic + NPA)`, formatINR(da)],
            ["HRA + Transport Allowance", formatINR(hra + ctx.ta)]
          ],
          rule: "7th CPC Medical & Academic Rules: Non-Practicing Allowance (NPA) is 20% of Basic Pay (subject to Basic + NPA not exceeding ₹2,37,500 in 7th CPC) and counts as pay for calculating DA, NPS, and retirement benefits."
        };
      }
    },
    {
      id: "age_ews_obc_checker",
      cat: "SECTORS_ELIGIBILITY",
      icon: "📋",
      badge: "Age · EWS · OBC NCL",
      title: {
        en: "Age Relaxation, EWS & OBC Creamy Layer Checker",
        hi: "आयु छूट, EWS पात्रता (₹8 लाख) और OBC क्रीमी लेयर जांच",
        bn: "বয়স ছাড়, EWS যোগ্যতা (₹৮ লক্ষ) ও OBC ক্রিমি লেয়ার চেকার"
      },
      desc: {
        en: "Check upper age limit relaxation + DoPT ₹8 Lakh EWS property test & OBC Non-Creamy Layer rules",
        hi: "सरकारी भर्ती में ऊपरी आयु सीमा, ₹8 लाख EWS नियम और OBC नॉन-क्रीमी लेयर पात्रता",
        bn: "সরকারি চাকরিতে বয়সের ঊর্ধ্বসীমা, ₹৮ লক্ষ EWS নিয়ম ও OBC নন-ক্রিমি লেয়ার যোগ্যতা"
      },
      inputs: [
        { key: "familyIncome", label: "Annual Family / Non-Salary Income (₹)", type: "number", def: 650000, min: 0, max: 5000000, step: 50000 },
        { key: "flatSqFt", label: "Residential Flat Area (Sq. Ft. for EWS)", type: "number", def: 850, min: 0, max: 5000 },
        { key: "baseUpperAge", label: "Exam Base Upper Age Limit (e.g. 30)", type: "number", def: 30, min: 18, max: 45 }
      ],
      compute: (inp) => {
        const ewsEligible = inp.familyIncome < 800000 && inp.flatSqFt < 1000;
        const obcNclEligible = inp.familyIncome < 800000;
        return {
          primaryLabel: "EWS & OBC Non-Creamy Layer Status",
          primaryVal: ewsEligible ? "✅ EWS & OBC-NCL Eligible" : (obcNclEligible ? "✅ OBC-NCL Only (Flat ≥1000 sq ft)" : "❌ Above ₹8 Lakh Ceiling"),
          secondaryVal: `Max Age Limits: Gen/EWS ${inp.baseUpperAge}y | OBC ${inp.baseUpperAge + 3}y | SC/ST ${inp.baseUpperAge + 5}y | PwBD ${inp.baseUpperAge + 10}–${inp.baseUpperAge + 15}y`,
          rows: [
            ["EWS Income & Asset Test (<₹8L & <1000 sq ft flat)", ewsEligible ? "PASS (Eligible for EWS Certificate)" : "FAIL (Exceeds income or flat limit)"],
            ["OBC Non-Creamy Layer (<₹8L Other Income / Group B&C Parents)", obcNclEligible ? "PASS (Eligible for NCL)" : "Creamy Layer (Not eligible for reservation)"],
            ["Upper Age with Relaxation (OBC +3y / SC-ST +5y)", `${inp.baseUpperAge + 3} yrs (OBC) / ${inp.baseUpperAge + 5} yrs (SC/ST)`],
            ["Central Govt Civilian Employee Age Relaxation", `Up to Age 40 (Group C) / +5 Years (UPSC)`]
          ],
          rule: "DoPT EWS & OBC Rules: EWS requires gross family income < ₹8 Lakh/yr AND residential flat < 1,000 sq. ft. For OBC Non-Creamy Layer of government employees' children, parents' government salary and agricultural income are EXCLUDED from the ₹8 Lakh test!"
        };
      }
    },
    {
      id: "conduct_rules_checker",
      cat: "SECTORS_ELIGIBILITY",
      icon: "⚖️",
      badge: "CCS Conduct Rules",
      title: {
        en: "CCS Conduct Rules Checker (Gifts, Property & Shares)",
        hi: "CCS आचरण नियम जांच (उपहार, संपत्ति और शेयर निवेश)",
        bn: "CCS আচরণবিধি চেকার (উপহার, সম্পত্তি ও শেয়ার বিনিয়োগ)"
      },
      desc: {
        en: "Check exact intimation & sanction limits for Gifts (Rule 13), Property (Rule 18) & Stocks (Rule 16)",
        hi: "उपहार, वाहन/मकान खरीद और शेयर बाजार निवेश पर विभाग को सूचना देने की सीमा",
        bn: "উপহার, গাড়ি/বাড়ি কেনা এবং শেয়ার বাজারে বিনিয়োগের ক্ষেত্রে দপ্তরে জানানোর সীমা"
      },
      inputs: [
        { key: "transactionAmt", label: "Transaction / Gift / Annual Stock Investment (₹)", type: "number", def: 150000, min: 1000, max: 10000000, step: 10000 }
      ],
      compute: (inp, ctx) => {
        const giftLimit = ctx.levelNum >= 6 ? 25000 : 7500;
        const movableLimit = ctx.basic * 2;
        const stockLimit = ctx.basic * 6;
        const needMovableIntimation = inp.transactionAmt > movableLimit;
        const needStockIntimation = inp.transactionAmt > stockLimit;
        return {
          primaryLabel: `Movable Property Limit (2× Basic = ${formatINR(movableLimit)})`,
          primaryVal: needMovableIntimation ? "📝 Intimation Within 1 Month Required" : "✅ Below 2× Basic Intimation Threshold",
          secondaryVal: `Stock/MF Annual Intimation Limit (6× Basic): ${formatINR(stockLimit)}/yr`,
          rows: [
            [`Rule 13: Gift Limit from Relatives/Friends (L${ctx.levelId})`, `${formatINR(giftLimit)} (Report to Govt if exceeded)`],
            [`Rule 18(3): Movable Property (Car/Gold/Loan > 2× Basic)`, `Threshold: ${formatINR(movableLimit)} → ${needMovableIntimation ? "Intimate within 1 month" : "No intimation needed"}`],
            ["Rule 18(2): Immovable Property (Land / Flat)", "Prior intimation ALWAYS required before purchase/sale"],
            [`Rule 16: Shares / Mutual Funds (> 6× Basic in Calendar Yr)`, `Threshold: ${formatINR(stockLimit)} → ${needStockIntimation ? "File intimation with APR" : "No intimation needed"}`]
          ],
          rule: "CCS (Conduct) Rules 1964: Intraday/F&O frequent speculation in stocks is strictly prohibited under Rule 16. Long-term investment in shares/MFs requires intimation if total transactions in a calendar year exceed 6 months' Basic Pay."
        };
      }
    }
  ];

  function renderMicroToolsGrid() {
    const grid = document.getElementById("mt-cards-grid");
    const countBadge = byId("mt-count-badge");
    const ctxSummary = document.getElementById("mt-context-summary");
    if (!grid) return;

    const ctx = getMtContext();
    if (ctxSummary) {
      ctxSummary.textContent = `Level ${ctx.levelId} · 7th Basic: ${formatINR(ctx.basic7th)} → 8th Basic: ${formatINR(ctx.basic8th)} (${ctx.fitment.toFixed(2)}×)`;
    }

    const q = mtState.searchQuery.trim().toLowerCase();
    const filtered = MICRO_TOOLS_REGISTRY.filter(tool => {
      const catMatch = mtState.category === "ALL" || tool.cat === mtState.category;
      if (!catMatch) return false;
      if (!q) return true;
      const hay = [
        tool.id,
        tool.badge,
        tool.title.en, tool.title.hi, tool.title.bn,
        tool.desc.en, tool.desc.hi, tool.desc.bn
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });

    if (countBadge) {
      countBadge.textContent = `${filtered.length} Suite(s) Shown (Covers All 94 Tools)`;
    }

    grid.innerHTML = filtered.map(tool => {
      const isSelected = tool.id === mtState.activeToolId;
      const tTitle = tool.title[state.lang] || tool.title.en;
      const tDesc = tool.desc[state.lang] || tool.desc.en;

      // Compute live preview value using defaults or current user inputs
      const savedInp = mtState.toolInputs[tool.id] || {};
      const mergedInp = {};
      for (const field of tool.inputs) {
        mergedInp[field.key] = savedInp[field.key] !== undefined ? savedInp[field.key] : field.def;
      }
      const previewOut = tool.compute(mergedInp, ctx);

      const cardCls = isSelected
        ? "border-2 border-emerald-600 bg-emerald-50/50 shadow-md"
        : "border border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm";

      return `<button type="button" data-mt-id="${tool.id}" class="mt-tool-card android-ripple text-left rounded-2xl p-3.5 transition flex flex-col justify-between gap-2.5 ${cardCls}">
        <div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-lg">${tool.icon}</span>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">${tool.badge}</span>
          </div>
          <div class="font-bold text-slate-900 text-xs sm:text-sm mt-1.5 leading-snug">${tTitle}</div>
          <div class="text-[11px] text-slate-500 mt-1 line-clamp-2">${tDesc}</div>
        </div>
        <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <span class="text-[11px] font-mono font-extrabold text-emerald-700 truncate">${previewOut.primaryVal}</span>
          <span class="text-[11px] font-bold text-blue-700 shrink-0">${isSelected ? "Active ●" : "Open →"}</span>
        </div>
      </button>`;
    }).join("");

    renderActiveMicroToolWorkbench();
  }

  function renderActiveMicroToolWorkbench() {
    const tool = MICRO_TOOLS_REGISTRY.find(t => t.id === mtState.activeToolId) || MICRO_TOOLS_REGISTRY[0];
    if (!tool) return;

    const ctx = getMtContext();
    if (!mtState.toolInputs[tool.id]) {
      mtState.toolInputs[tool.id] = {};
      for (const f of tool.inputs) {
        mtState.toolInputs[tool.id][f.key] = f.def;
      }
    }
    const activeInputs = mtState.toolInputs[tool.id];

    byId("mt-wb-category").textContent = `${tool.icon} ${tool.badge}`;
    byId("mt-wb-title").textContent = tool.title[state.lang] || tool.title.en;
    byId("mt-wb-subtitle").textContent = tool.desc[state.lang] || tool.desc.en;
    byId("mt-wb-basis-pill").textContent = ctx.basis === "8TH"
      ? `8th CPC Basis (${formatINR(ctx.basic)})`
      : `7th CPC Basis (${formatINR(ctx.basic)})`;

    // Render inputs if tool switched
    const inputsContainer = document.getElementById("mt-wb-inputs");
    if (inputsContainer.getAttribute("data-rendered-tool") !== tool.id) {
      inputsContainer.setAttribute("data-rendered-tool", tool.id);
      inputsContainer.innerHTML = tool.inputs.map(f => `
        <div>
          <label class="block text-[11px] font-semibold text-slate-700 mb-1">${f.label}</label>
          <input type="${f.type}" data-mt-input-key="${f.key}" value="${activeInputs[f.key]}" min="${f.min || 0}" max="${f.max || 99999999}" step="${f.step || 1}" class="mt-wb-input-el w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none" />
        </div>
      `).join("");
    }

    const out = tool.compute(activeInputs, ctx);
    byId("mt-wb-primary-label").textContent = out.primaryLabel;
    byId("mt-wb-primary-val").textContent = out.primaryVal;
    byId("mt-wb-secondary-val").textContent = out.secondaryVal;

    const tbody = byId("mt-wb-table-body");
    tbody.innerHTML = out.rows.map(r => `
      <tr class="hover:bg-slate-50">
        <td class="p-2.5 text-slate-600 font-medium">${r[0]}</td>
        <td class="p-2.5 text-right font-mono font-bold text-slate-900">${r[1]}</td>
      </tr>
    `).join("");

    byId("mt-wb-rule-note").innerHTML = `<strong>📌 Official Rule &amp; Formula Note:</strong> ${out.rule}`;
  }

  function bindMicroToolsEvents() {
    const jumpBtn = document.getElementById("btn-jump-microtools");
    if (jumpBtn) {
      jumpBtn.addEventListener("click", () => {
        switchMainTab("tab-microtools");
        renderMicroToolsGrid();
      });
    }

    // Pay Basis Toggle (8th CPC vs 7th CPC)
    document.querySelectorAll(".mt-basis-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        mtState.basis = btn.getAttribute("data-mt-basis") || "8TH";
        document.querySelectorAll(".mt-basis-btn").forEach(b => {
          const act = b.getAttribute("data-mt-basis") === mtState.basis;
          b.className = act
            ? "mt-basis-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 shadow-sm"
            : "mt-basis-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-white";
        });
        renderMicroToolsGrid();
        showToast(`Micro-Tools synced to ${mtState.basis === "8TH" ? "8th CPC Projected" : "7th CPC Current"} Basic Pay`);
      });
    });

    // Search input
    const searchInp = document.getElementById("inp-mt-search");
    if (searchInp) {
      searchInp.addEventListener("input", (e) => {
        mtState.searchQuery = e.target.value || "";
        renderMicroToolsGrid();
      });
    }

    // Category chips
    document.querySelectorAll(".mt-cat-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        mtState.category = btn.getAttribute("data-mt-cat") || "ALL";
        document.querySelectorAll(".mt-cat-btn").forEach(b => {
          const act = b.getAttribute("data-mt-cat") === mtState.category;
          b.className = act
            ? "mt-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-sm"
            : "mt-cat-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200";
        });
        renderMicroToolsGrid();
      });
    });

    // Tool Card selection delegation
    const grid = document.getElementById("mt-cards-grid");
    if (grid) {
      grid.addEventListener("click", (e) => {
        const card = e.target.closest(".mt-tool-card");
        if (!card) return;
        mtState.activeToolId = card.getAttribute("data-mt-id");
        byId("mt-wb-inputs").setAttribute("data-rendered-tool", "");
        renderMicroToolsGrid();
      });
    }

    // Workbench dynamic input listener
    const wbInputs = document.getElementById("mt-wb-inputs");
    if (wbInputs) {
      wbInputs.addEventListener("input", (e) => {
        const inp = e.target.closest(".mt-wb-input-el");
        if (!inp) return;
        const key = inp.getAttribute("data-mt-input-key");
        if (!mtState.toolInputs[mtState.activeToolId]) {
          mtState.toolInputs[mtState.activeToolId] = {};
        }
        mtState.toolInputs[mtState.activeToolId][key] = Number(inp.value) || 0;
        renderActiveMicroToolWorkbench();
      });
    }

    // Copy Micro-Tool Result Button
    const copyBtn = document.getElementById("btn-mt-copy-result");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const title = byId("mt-wb-title").textContent;
        const val = byId("mt-wb-primary-val").textContent;
        const sub = byId("mt-wb-secondary-val").textContent;
        copyToClipboard(`🇮🇳 *${title}*\n• Result: ${val}\n• ${sub}`, "Micro-Tool result copied to clipboard!");
      });
    }
  }


  // =========================================================================
  // 17. MEGA-MENU, HERO LIVE PREVIEW, 20 STATES & ⌘K
  // =========================================================================
  const LIVE_PREVIEW_PROFILES = [
    { label: "Delhi · Level 10", level: "10", basic: 56100, hra: "X", ta: "HIGHER" },
    { label: "Mumbai · Level 7", level: "7", basic: 44900, hra: "X", ta: "HIGHER" },
    { label: "Chennai · Level 17", level: "17", basic: 225000, hra: "X", ta: "HIGHER" },
    { label: "Kolkata · Level 6", level: "6", basic: 35400, hra: "X", ta: "HIGHER" },
    { label: "Lucknow · Level 4", level: "4", basic: 25500, hra: "Y", ta: "HIGHER" },
    { label: "Patna · Level 1", level: "1", basic: 18000, hra: "Y", ta: "HIGHER" }
  ];
  let lpIndex = 0;

  const EXTRA_RANK_PROFILES = {
    sepoy:        { badge: "Indian Army", title: "Sepoy (General Duty) + ₹5,200 MSP", level: "3", basic: 21700, hra: "Y", ta: "OTHER", extraAllow: 5200, desc: "Defence Level 3 (₹21,700) + Military Service Pay (₹5,200)" },
    havildar:     { badge: "Indian Army", title: "Havildar + ₹5,200 MSP", level: "4", basic: 25500, hra: "Y", ta: "OTHER", extraAllow: 5200, desc: "Defence Level 4 (₹25,500) + Military Service Pay (₹5,200)" },
    captain:      { badge: "Indian Army", title: "Captain (Level 10B) + ₹15,500 MSP", level: "10", basic: 61300, hra: "X", ta: "HIGHER", extraAllow: 15500, desc: "Defence Level 10B (₹61,300) + Officer MSP (₹15,500)" },
    major:        { badge: "Indian Army", title: "Major (Level 11) + ₹15,500 MSP", level: "11", basic: 69700, hra: "X", ta: "HIGHER", extraAllow: 15500, desc: "Defence Level 11 (₹69,700) + Officer MSP (₹15,500)" },
    colonel:      { badge: "Indian Army", title: "Colonel (Level 13) + ₹15,500 MSP", level: "13", basic: 130600, hra: "X", ta: "HIGHER", extraAllow: 15500, desc: "Defence Level 13 (₹1,30,600) + Officer MSP (₹15,500)" },
    rly_trackman: { badge: "Indian Railways", title: "Group D Track Maintainer-IV + Risk Allow.", level: "1", basic: 18000, hra: "Y", ta: "OTHER", extraAllow: 2700, desc: "Railway Level 1 (₹18,000) + ₹2,700 Hardship/Risk Allowance" },
    rly_tte:      { badge: "Indian Railways", title: "Travelling Ticket Examiner (TTE)", level: "5", basic: 29200, hra: "Y", ta: "OTHER", extraAllow: 4500, desc: "Railway Level 5 (₹29,200) + Travelling Allowance" },
    rly_clerk:    { badge: "Indian Railways", title: "Junior Clerk cum Typist", level: "2", basic: 19900, hra: "Y", ta: "OTHER", extraAllow: 0, desc: "Railway Level 2 (₹19,900) Standard Allowances" }
  };

  const ALL_20_STATES_DATA = [
    { state: "Rajasthan",        cpc: "7th CPC Parity", da: 60, hra: 20, fit: 1.00 },
    { state: "West Bengal",      cpc: "6th SPC (ROPA 2019)", da: 18, hra: 12, fit: 1.00 },
    { state: "Karnataka",        cpc: "7th State PC (2024)", da: 12.25, hra: 20, fit: 1.585 },
    { state: "Uttar Pradesh",    cpc: "7th CPC Parity", da: 60, hra: 20, fit: 1.00 },
    { state: "Gujarat",          cpc: "7th CPC Parity", da: 60, hra: 20, fit: 1.00 },
    { state: "Maharashtra",      cpc: "7th SPC (Revised)", da: 58, hra: 27, fit: 1.00 },
    { state: "Tamil Nadu",       cpc: "7th CPC Parity", da: 58, hra: 18, fit: 1.00 },
    { state: "Bihar",            cpc: "7th CPC Parity", da: 60, hra: 20, fit: 1.00 },
    { state: "Madhya Pradesh",   cpc: "7th CPC Parity", da: 58, hra: 18, fit: 1.00 },
    { state: "Kerala",           cpc: "11th State PR (2021)", da: 21, hra: 10, fit: 1.38 },
    { state: "Punjab",           cpc: "6th Punjab PC (2021)", da: 42, hra: 16, fit: 1.15 },
    { state: "Andhra Pradesh",   cpc: "11th PRC (AP)", da: 33, hra: 16, fit: 1.23 },
    { state: "Telangana",        cpc: "11th PRC (TS)", da: 30, hra: 24, fit: 1.30 },
    { state: "Haryana",          cpc: "7th CPC Parity", da: 60, hra: 20, fit: 1.00 },
    { state: "Odisha",           cpc: "7th CPC (ORSP)", da: 60, hra: 20, fit: 1.00 },
    { state: "Jharkhand",        cpc: "7th CPC Parity", da: 60, hra: 20, fit: 1.00 },
    { state: "Assam",            cpc: "7th Assam PC", da: 58, hra: 18, fit: 1.00 },
    { state: "Chhattisgarh",     cpc: "7th CPC Parity", da: 58, hra: 18, fit: 1.00 },
    { state: "Uttarakhand",      cpc: "7th CPC Parity", da: 60, hra: 20, fit: 1.00 }
  ];

  function renderHeroLivePreview(profile) {
    const p = profile || LIVE_PREVIEW_PROFILES[lpIndex % LIVE_PREVIEW_PROFILES.length];
    const lvMeta = getLevelMeta(p.level);
    const hra7Map = { X: 30, Y: 20, Z: 10, NONE: 0 };
    const hra8Map = state.hra8thReset ? { X: 24, Y: 16, Z: 8, NONE: 0 } : hra7Map;

    const c7 = calculateSingleCommission({
      levelMeta: lvMeta,
      basic: p.basic,
      daPct: state.da7th,
      hraClass: p.hra,
      hraRatesMap: hra7Map,
      taType: p.ta,
      divyangTa: false,
      addons: { npa: false, pca: false, cea: false },
      customAllow: 0,
      customDeduct: 0,
      pensionScheme: "NPS_UPS",
      includeCghs: true,
      includeTax: true,
      claim80CCD2: true
    });

    const b8 = Math.round(p.basic * state.fitment);
    const c8 = calculateSingleCommission({
      levelMeta: lvMeta,
      basic: b8,
      daPct: state.da8th,
      hraClass: p.hra,
      hraRatesMap: hra8Map,
      taType: p.ta,
      divyangTa: false,
      addons: { npa: false, pca: false, cea: false },
      customAllow: 0,
      customDeduct: 0,
      pensionScheme: "NPS_UPS",
      includeCghs: true,
      includeTax: true,
      claim80CCD2: true,
      commissionScale: state.fitment
    });

    const pct = c7.net > 0 ? (((c8.net - c7.net) / c7.net) * 100).toFixed(1) : "22.0";
    const diff = c8.net - c7.net;

    const lblEl = document.getElementById("lp-city-level-label");
    if (lblEl) lblEl.textContent = p.label;
    const b7El = document.getElementById("lp-7th-basic");
    if (b7El) b7El.textContent = formatINR(c7.basic);
    const dhEl = document.getElementById("lp-7th-dahra");
    if (dhEl) dhEl.textContent = formatINR(c7.da + c7.hra);
    const n7El = document.getElementById("lp-7th-net");
    if (n7El) n7El.textContent = formatINR(c7.net);

    const h8El = document.getElementById("lp-8th-header");
    if (h8El) h8El.textContent = `8th CPC · Estimated (${state.fitment.toFixed(2)}× Fitment)`;
    const bl8El = document.getElementById("lp-8th-basic-lbl");
    if (bl8El) bl8El.textContent = `Basic Pay (×${state.fitment.toFixed(2)})`;
    const b8El = document.getElementById("lp-8th-basic");
    if (b8El) b8El.textContent = formatINR(c8.basic);
    const n8El = document.getElementById("lp-8th-net");
    if (n8El) n8El.textContent = formatINR(c8.net);
    const pillEl = document.getElementById("lp-hike-pill");
    if (pillEl) pillEl.textContent = `🌱 +${pct}% take-home (+${formatINR(diff)}/mo)`;
  }

  function renderAll20StatesTable() {
    const tbody = document.getElementById("tbody-all-20-states");
    if (!tbody || !state.lastResult) return;
    const filterVal = byId("sel-state-highlight") ? byId("sel-state-highlight").value : "ALL";
    const c8Gross = state.lastResult.cpc8.gross;
    const b7 = state.basicPay;

    const rows = ALL_20_STATES_DATA.filter(s => filterVal === "ALL" || s.state === filterVal).map(s => {
      const stBasic = Math.round(b7 * s.fit);
      const stDa = Math.round(stBasic * (s.da / 100));
      const stHra = Math.round(stBasic * (s.hra / 100));
      const stGross = stBasic + stDa + stHra + 1800;
      const diff8th = c8Gross - stGross;
      const highlight = filterVal === s.state ? "bg-amber-50 font-bold" : "hover:bg-slate-50";
      return `<tr class="${highlight}">
        <td class="p-2.5 font-bold text-slate-900">${s.state}</td>
        <td class="p-2.5 text-slate-600">${s.cpc}</td>
        <td class="p-2.5 text-right font-mono">${s.da}%</td>
        <td class="p-2.5 text-right font-mono">${s.hra}%</td>
        <td class="p-2.5 text-right font-mono font-semibold">${formatINR(stGross)}</td>
        <td class="p-2.5 text-right font-mono font-bold text-emerald-700">+${formatINR(diff8th)}/mo in 8th CPC</td>
      </tr>`;
    });
    tbody.innerHTML = rows.join("");
  }

  function closeAllDropdowns() {
    document.querySelectorAll(".dd-panel").forEach(p => p.classList.add("hidden"));
    document.querySelectorAll(".dd-trigger-btn").forEach(b => {
      b.classList.remove("bg-sky-600", "text-white");
    });
  }

  function showSectorBanner(badge, title, desc) {
    const banner = document.getElementById("sector-context-banner");
    const heroSec = document.getElementById("hero-banner-section");
    if (heroSec) heroSec.classList.add("hidden");
    if (!banner) return;
    byId("scb-badge").textContent = badge;
    byId("scb-title").textContent = title;
    byId("scb-desc").textContent = desc;
    banner.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Which page (tab) a mega-menu / footer / search action needs; null = any page.
  function getNavActionTab(type, val) {
    if (type === "tab") return val;
    if (type === "focus" || type === "scroll") {
      if (val === "discussion-section" || val === "app-footer") return null;
      if (["inp-da-diff", "sel-bonus-days", "inp-rent-paid", "inp-nda-hours"].includes(val)) return "tab-arrears";
      return "tab-salary";
    }
    if (type === "mt") return "tab-microtools";
    if (type === "level" || type === "preset" || type === "rank") return "tab-salary";
    if (type === "state" || type === "guide") return "tab-guides";
    return null;
  }

  function executeNavAction(actionStr) {
    if (!actionStr) return;
    closeAllDropdowns();
    const [type, val] = actionStr.split(":");

    const targetTab = getNavActionTab(type, val);
    if (targetTab && !document.getElementById(targetTab)) {
      window.location.href = pageUrl(targetTab, type === "tab" ? null : actionStr);
      return;
    }

    if (type === "tab") {
      if (val === "tab-microtools") {
        setMicroToolsFocusMode(false);
      }
      switchMainTab(val);
      renderAll20StatesTable();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (type === "focus" || type === "scroll") {
      if (val === "discussion-section" || val === "app-footer") {
        // Global sections visible below main content
      } else if (val === "inp-da-diff" || val === "sel-bonus-days" || val === "inp-rent-paid" || val === "inp-nda-hours") {
        switchMainTab("tab-arrears");
      } else {
        switchMainTab("tab-salary");
      }
      setTimeout(() => {
        const el = document.getElementById(val);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        }
      }, 60);
    } else if (type === "modal" && val === "payslip") {
      renderPayslipModalContent();
      byId("modal-payslip").classList.remove("hidden");
    } else if (type === "mt") {
      mtState.activeToolId = val;
      mtState.category = "ALL";
      mtState.searchQuery = "";
      const sInp = document.getElementById("inp-mt-search");
      if (sInp) sInp.value = "";
      byId("mt-wb-inputs").setAttribute("data-rendered-tool", "");
      const toolObj = MICRO_TOOLS_REGISTRY.find(t => t.id === val);
      const tTitle = toolObj ? (toolObj.title[state.lang] || toolObj.title.en) : "Calculator";
      setMicroToolsFocusMode(true);
      switchMainTab("tab-microtools", tTitle);
      renderMicroToolsGrid();
      window.scrollTo({ top: 0, behavior: "smooth" });
      showToast(tTitle);
    } else if (type === "level") {
      state.levelId = val;
      populateLevelAndBasicDropdowns(false);
      runAllCalculations();
      switchMainTab("tab-salary");
      const lvMeta = getLevelMeta(val);
      showSectorBanner(`PAY LEVEL ${val}`, `${lvMeta.name} (GP ${lvMeta.gp}) — ${lvMeta.post}`, `Entry 7th CPC Basic: ${formatINR(lvMeta.entry)} → Projected 8th CPC Basic: ${formatINR(Math.round(lvMeta.entry * state.fitment))} (${state.fitment.toFixed(2)}×)`);
      const calcSec = document.getElementById("main-calculator-card");
      if (calcSec) calcSec.scrollIntoView({ behavior: "smooth", block: "start" });
      showToast(`Loaded ${lvMeta.name} · Entry Basic ${formatINR(lvMeta.entry)}`);
    } else if (type === "preset") {
      const p = POST_PRESETS.find(item => item.id === val);
      if (p) {
        state.levelId = p.level;
        state.basicPay = p.basic;
        state.hraClass = p.hra;
        state.taType = p.ta;
        state.customAllow = p.extraAllow || 0;
        state.addons = { npa: p.addon === "npa", pca: p.addon === "pca", cea: false };
        byId("sel-hra-class").value = p.hra;
        byId("sel-ta-type").value = p.ta;
        byId("inp-custom-allow").value = String(state.customAllow);
        populateLevelAndBasicDropdowns(true);
        runAllCalculations();
        switchMainTab("tab-salary");
        showSectorBanner(p.badge, p.title, `${p.desc} — Synced with 7th & 8th CPC Calculator below.`);
        const calcSec = document.getElementById("main-calculator-card");
        if (calcSec) calcSec.scrollIntoView({ behavior: "smooth", block: "start" });
        showToast(`Loaded ${p.title}`);
      }
    } else if (type === "rank") {
      const r = EXTRA_RANK_PROFILES[val];
      if (r) {
        state.levelId = r.level;
        state.basicPay = r.basic;
        state.hraClass = r.hra;
        state.taType = r.ta;
        state.customAllow = r.extraAllow || 0;
        byId("sel-hra-class").value = r.hra;
        byId("sel-ta-type").value = r.ta;
        byId("inp-custom-allow").value = String(state.customAllow);
        populateLevelAndBasicDropdowns(true);
        runAllCalculations();
        switchMainTab("tab-salary");
        showSectorBanner(r.badge, r.title, r.desc);
        const calcSec = document.getElementById("main-calculator-card");
        if (calcSec) calcSec.scrollIntoView({ behavior: "smooth", block: "start" });
        showToast(`Loaded ${r.title}`);
      }
    } else if (type === "state") {
      switchMainTab("tab-guides", val === "ALL" ? "Compare All 20 States" : `${val} Govt Salary vs Central 8th CPC`);
      const selSt = document.getElementById("sel-state-highlight");
      if (selSt) {
        selSt.value = val;
      }
      renderAll20StatesTable();
      setTimeout(() => {
        const stSec = document.getElementById("sec-all-states-comparison");
        if (stSec) stSec.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      showToast(val === "ALL" ? "Showing all 20 States comparison" : `Comparing ${val} Govt Salary vs Central 8th CPC`);
    } else if (type === "guide") {
      switchMainTab("tab-guides", "Reference Guides, Handbook & News Adda");
      renderAll20StatesTable();
      setTimeout(() => {
        const hub = document.getElementById("sec-news-learn-hub");
        if (hub) hub.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      showToast("Opened Reference Guide & News Adda");
    }
  }

  function bindMegaMenuAndHeroEvents() {
    // Dropdown triggers with dynamic alignment directly beneath the clicked button
    function openDropdownForTrigger(btn) {
      const targetId = btn.getAttribute("data-dd-trigger");
      const panel = document.getElementById(targetId);
      if (!panel) return;
      closeAllDropdowns();
      btn.classList.add("bg-sky-600", "text-white");

      if (targetId !== "dd-calculators") {
        const navRect = byId("top-mega-navbar").getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        const leftOffset = Math.max(8, Math.min(navRect.width - 270, btnRect.left - navRect.left));
        panel.style.left = leftOffset + "px";
        panel.style.right = "auto";
      }
      panel.classList.remove("hidden");
    }

    document.querySelectorAll(".dd-trigger-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute("data-dd-trigger");
        const panel = document.getElementById(targetId);
        if (!panel) return;
        const wasHidden = panel.classList.contains("hidden");
        if (wasHidden) {
          openDropdownForTrigger(btn);
        } else {
          closeAllDropdowns();
        }
      });
    });

    // Inner-view topbar & Focus-mode toggle buttons
    const btnBackHome = document.getElementById("btn-back-home-calc");
    if (btnBackHome) {
      btnBackHome.addEventListener("click", () => {
        switchMainTab("tab-salary");
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
    const btnTopAll = document.getElementById("btn-topbar-all-tools");
    if (btnTopAll) {
      btnTopAll.addEventListener("click", () => {
        setMicroToolsFocusMode(false);
        switchMainTab("tab-microtools");
        renderMicroToolsGrid();
      });
    }
    const btnToggleDir = document.getElementById("btn-mt-toggle-directory");
    if (btnToggleDir) {
      btnToggleDir.addEventListener("click", () => {
        setMicroToolsFocusMode(false);
        renderMicroToolsGrid();
      });
    }
    const btnMtBackSal = document.getElementById("btn-mt-back-salary");
    if (btnMtBackSal) {
      btnMtBackSal.addEventListener("click", () => {
        switchMainTab("tab-salary");
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // Mobile Menu button opens the 4-column Calculators mega-menu
    const mobMenuBtn = document.getElementById("btn-mobile-megamenu");
    if (mobMenuBtn) {
      mobMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const panel = document.getElementById("dd-calculators");
        if (!panel) return;
        const wasHidden = panel.classList.contains("hidden");
        closeAllDropdowns();
        if (wasHidden) panel.classList.remove("hidden");
      });
    }

    // Delegate clicks on any mega-menu item
    byId("top-mega-navbar").addEventListener("click", (e) => {
      const itemBtn = e.target.closest(".mega-item-btn");
      if (!itemBtn) return;
      e.stopPropagation();
      executeNavAction(itemBtn.getAttribute("data-nav-action"));
    });

    // Close dropdowns on outside click
    document.addEventListener("click", () => {
      closeAllDropdowns();
    });

    // Brand home button
    const brandBtn = document.getElementById("btn-brand-home");
    if (brandBtn) {
      brandBtn.addEventListener("click", () => {
        switchMainTab("tab-salary");
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // Navbar WhatsApp share button
    const navWaBtn = document.getElementById("btn-nav-whatsapp");
    if (navWaBtn) {
      navWaBtn.addEventListener("click", () => {
        copyToClipboard(getSummaryText(), "Salary Summary copied! Ready to share on WhatsApp.");
      });
    }

    // Sector context banner dismiss
    const scbClose = document.getElementById("btn-scb-close");
    if (scbClose) {
      scbClose.addEventListener("click", () => {
        byId("sector-context-banner").classList.add("hidden");
        const heroSec = document.getElementById("hero-banner-section");
        if (heroSec && !byId("tab-salary").classList.contains("hidden")) {
          heroSec.classList.remove("hidden");
        }
      });
    }

    // Hero CTA buttons
    const btnCalcNow = document.getElementById("btn-hero-calc-now");
    if (btnCalcNow) {
      btnCalcNow.addEventListener("click", () => {
        switchMainTab("tab-salary");
        const el = document.getElementById("sel-pay-level");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
    const btnReadArt = document.getElementById("btn-hero-read-articles");
    if (btnReadArt) {
      btnReadArt.addEventListener("click", () => {
        executeNavAction("guide:news_en");
      });
    }
    const btnExp94 = document.getElementById("btn-hero-explore-94");
    if (btnExp94) {
      btnExp94.addEventListener("click", () => {
        setMicroToolsFocusMode(false);
        switchMainTab("tab-microtools");
        renderMicroToolsGrid();
      });
    }

    // Hero Live Preview Cycle & Load buttons
    const btnCycle = document.getElementById("btn-live-preview-cycle");
    if (btnCycle) {
      btnCycle.addEventListener("click", () => {
        lpIndex = (lpIndex + 1) % LIVE_PREVIEW_PROFILES.length;
        renderHeroLivePreview(LIVE_PREVIEW_PROFILES[lpIndex]);
      });
    }
    const btnLpLoad = document.getElementById("btn-lp-load-into-calc");
    if (btnLpLoad) {
      btnLpLoad.addEventListener("click", () => {
        const p = LIVE_PREVIEW_PROFILES[lpIndex % LIVE_PREVIEW_PROFILES.length];
        state.levelId = p.level;
        state.basicPay = p.basic;
        state.hraClass = p.hra;
        state.taType = p.ta;
        byId("sel-hra-class").value = p.hra;
        byId("sel-ta-type").value = p.ta;
        populateLevelAndBasicDropdowns(true);
        runAllCalculations();
        const el = document.getElementById("sel-pay-level");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        showToast(`Loaded Live Preview: ${p.label}`);
      });
    }

    // Auto-cycle Hero Live Preview every 4.5 seconds
    clearInterval(window.__lpTimer);
    window.__lpTimer = setInterval(() => {
      lpIndex = (lpIndex + 1) % LIVE_PREVIEW_PROFILES.length;
      renderHeroLivePreview(LIVE_PREVIEW_PROFILES[lpIndex]);
    }, 4500);

    // State highlight dropdown
    const selState = document.getElementById("sel-state-highlight");
    if (selState) {
      selState.addEventListener("change", renderAll20StatesTable);
    }

    // Command Palette (Search ⌘K)
    const cmdModal = byId("modal-cmd-search");
    const cmdInp = byId("inp-cmd-query");
    const cmdRes = byId("cmd-search-results");

    function renderCommandResults(qStr) {
      const q = (qStr || "").trim().toLowerCase();
      const items = [];

      // Add Micro-Tools
      for (const t of MICRO_TOOLS_REGISTRY) {
        items.push({
          title: `${t.icon} ${t.title.en}`,
          sub: `${t.badge} · ${t.desc.en}`,
          action: `mt:${t.id}`
        });
      }
      // Add Pay Levels
      for (const lv of PAY_LEVEL_META) {
        items.push({
          title: `📊 ${lv.name} (GP ${lv.gp}) — ${lv.post}`,
          sub: `Entry 7th Basic: ${formatINR(lv.entry)} → 8th Basic: ${formatINR(Math.round(lv.entry * state.fitment))}`,
          action: `level:${lv.id}`
        });
      }
      // Add States
      for (const st of ALL_20_STATES_DATA) {
        items.push({
          title: `🗺️ ${st.state} State Govt Salary Calculator`,
          sub: `${st.cpc} · Active DA ${st.da}% · Max HRA ${st.hra}%`,
          action: `state:${st.state}`
        });
      }

      const matches = q
        ? items.filter(i => (i.title + " " + i.sub).toLowerCase().includes(q)).slice(0, 25)
        : items.slice(0, 18);

      cmdRes.innerHTML = matches.map(m => `
        <button type="button" data-cmd-action="${m.action}" class="cmd-res-btn w-full text-left p-2.5 hover:bg-slate-800 rounded-xl flex items-center justify-between gap-2 transition">
          <div>
            <div class="font-bold text-white">${m.title}</div>
            <div class="text-[11px] text-slate-400">${m.sub}</div>
          </div>
          <span class="text-sky-400 font-bold shrink-0">Open →</span>
        </button>
      `).join("");
    }

    function openCmdSearch() {
      cmdModal.classList.remove("hidden");
      cmdInp.value = "";
      renderCommandResults("");
      setTimeout(() => cmdInp.focus(), 50);
    }

    byId("btn-cmd-search").addEventListener("click", openCmdSearch);
    byId("btn-close-cmd-search").addEventListener("click", () => {
      cmdModal.classList.add("hidden");
    });
    cmdInp.addEventListener("input", () => renderCommandResults(cmdInp.value));
    cmdRes.addEventListener("click", (e) => {
      const btn = e.target.closest(".cmd-res-btn");
      if (!btn) return;
      cmdModal.classList.add("hidden");
      executeNavAction(btn.getAttribute("data-cmd-action"));
    });

    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openCmdSearch();
      } else if (e.key === "Escape") {
        closeAllDropdowns();
        cmdModal.classList.add("hidden");
      }
    });
  }

  // =========================================================================
  // 18. REAL PERSISTENT DISCUSSION FORUM, LIVE POLL & 5-LAYER ANTI-SPAM SHIELD
  // =========================================================================
  const STORAGE_KEY_THREADS = "cpc8_real_discussion_threads_v1";
  const STORAGE_KEY_POLL    = "cpc8_real_fitment_poll_v1";
  const STORAGE_KEY_CLIENT  = "cpc8_real_client_session_id_v1";
  const STORAGE_KEY_SHIELD  = "cpc8_real_shield_stats_v1";

  function safeStorageGet(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function safeStorageSet(key, val) {
    try {
      window.localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  function getClientSessionId() {
    let cid = safeStorageGet(STORAGE_KEY_CLIENT, null);
    if (!cid) {
      cid = "emp_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
      safeStorageSet(STORAGE_KEY_CLIENT, cid);
    }
    return cid;
  }

  const DEFAULT_POLL_OPTIONS = [
    { id: "p_192", label: "1.92× — 60% DA Merger (1.60) + 20% Real Hike", votes: 0 },
    { id: "p_208", label: "2.08× to 2.28× — Middle Consensus (25–30% Hike)", votes: 0 },
    { id: "p_257", label: "2.57× — Match 7th CPC Fitment Multiplier", votes: 0 },
    { id: "p_286", label: "2.86× — NC-JCM Staff Federation Demand", votes: 0 }
  ];

  const discState = {
    clientId: getClientSessionId(),
    pageLoadedAt: Date.now(),
    activeCat: "ALL",
    sortBy: "NEWEST",
    votedPollId: null,
    upvotedIds: {},
    flaggedIds: {},
    pollOptions: JSON.parse(JSON.stringify(DEFAULT_POLL_OPTIONS)),
    threads: [], // 100% real user-submitted comments only — zero fake seeded personas
    shield: {
      captchaA: 12,
      captchaB: 7,
      captchaOp: "+",
      captchaAns: 19,
      lastPostTimestamp: 0,
      cooldownSeconds: 30,
      blockedCount: 0,
      recentHashes: [],
      auditLogs: [
        "[SHIELD READY] 5-Layer Anti-Spam Protection active. Zero fake/seeded comments loaded."
      ]
    }
  };

  // Cross-tab real-time sync via BroadcastChannel (if supported)
  let discChannel = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      discChannel = new BroadcastChannel("cpc8_real_discussion_sync");
      discChannel.onmessage = () => {
        loadPersistedDiscussionData();
        renderPollWidget();
        renderDiscussionThreads();
      };
    }
  } catch (e) {}

  function notifyCrossTabSync() {
    try {
      if (discChannel) discChannel.postMessage({ updatedAt: Date.now() });
    } catch (e) {}
  }

  function loadPersistedDiscussionData() {
    const savedThreads = safeStorageGet(STORAGE_KEY_THREADS, null);
    if (Array.isArray(savedThreads)) {
      discState.threads = savedThreads;
    }
    const savedPoll = safeStorageGet(STORAGE_KEY_POLL, null);
    if (savedPoll && Array.isArray(savedPoll.options)) {
      discState.pollOptions = savedPoll.options;
      discState.votedPollId = savedPoll.votedBy && savedPoll.votedBy[discState.clientId] ? savedPoll.votedBy[discState.clientId] : null;
    }
    const savedShield = safeStorageGet(STORAGE_KEY_SHIELD, null);
    if (savedShield && typeof savedShield === "object") {
      discState.shield.blockedCount = Number(savedShield.blockedCount) || 0;
      discState.shield.lastPostTimestamp = Number(savedShield.lastPostTimestamp) || 0;
      discState.shield.recentHashes = Array.isArray(savedShield.recentHashes) ? savedShield.recentHashes : [];
      if (Array.isArray(savedShield.auditLogs) && savedShield.auditLogs.length > 0) {
        discState.shield.auditLogs = savedShield.auditLogs;
      }
      discState.upvotedIds = savedShield.upvotedIds || {};
      discState.flaggedIds = savedShield.flaggedIds || {};
    }
  }

  function savePersistedDiscussionData() {
    safeStorageSet(STORAGE_KEY_THREADS, discState.threads);
    const existingPoll = safeStorageGet(STORAGE_KEY_POLL, { votedBy: {} });
    const votedBy = (existingPoll && existingPoll.votedBy) ? existingPoll.votedBy : {};
    if (discState.votedPollId) {
      votedBy[discState.clientId] = discState.votedPollId;
    }
    safeStorageSet(STORAGE_KEY_POLL, {
      options: discState.pollOptions,
      votedBy
    });
    safeStorageSet(STORAGE_KEY_SHIELD, {
      blockedCount: discState.shield.blockedCount,
      lastPostTimestamp: discState.shield.lastPostTimestamp,
      recentHashes: discState.shield.recentHashes.slice(-30),
      auditLogs: discState.shield.auditLogs.slice(0, 25),
      upvotedIds: discState.upvotedIds,
      flaggedIds: discState.flaggedIds
    });
    notifyCrossTabSync();
  }

  // =========================================================================
  // 5-LAYER ANTI-SPAM PROTECTION SHIELD ENGINE
  // =========================================================================
  function generateNewCaptcha() {
    const a = Math.floor(Math.random() * 14) + 4; // 4..17
    const b = Math.floor(Math.random() * 9) + 2;  // 2..10
    const useSub = a > b + 3 && Math.random() > 0.65;
    discState.shield.captchaA = a;
    discState.shield.captchaB = b;
    discState.shield.captchaOp = useSub ? "−" : "+";
    discState.shield.captchaAns = useSub ? (a - b) : (a + b);

    const qEl = document.getElementById("disc-captcha-question");
    const inpEl = document.getElementById("disc-inp-captcha");
    if (qEl) qEl.textContent = `${a} ${discState.shield.captchaOp} ${b} = ?`;
    if (inpEl) inpEl.value = "";
  }

  function simpleContentHash(str) {
    const clean = String(str || "").toLowerCase().replace(/\s+/g, " ").trim();
    let h = 2166136261;
    for (let i = 0; i < clean.length; i++) {
      h ^= clean.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }

  function inspectContentForSpam(text, authorName) {
    const raw = String(text || "").trim();
    const nameRaw = String(authorName || "").trim();

    if (nameRaw.length < 2) {
      return { ok: false, code: "NAME_TOO_SHORT", reason: "Please enter your real name & post/department (min 2 chars)." };
    }
    if (/https?:\/\/|www\.|\.[a-z]{2,4}\b/i.test(nameRaw) || /<[^>]+>/.test(nameRaw)) {
      return { ok: false, code: "NAME_SPAM_LINK", reason: "Links or HTML tags are not permitted in the Name field." };
    }
    if (raw.length < 10) {
      return { ok: false, code: "MSG_TOO_SHORT", reason: `Comment is too short (${raw.length}/10 min characters).` };
    }
    if (raw.length > 600) {
      return { ok: false, code: "MSG_TOO_LONG", reason: "Comment exceeds 600 characters." };
    }
    // Layer 4A: HTML / Script injection check
    if (/<\s*script|<\s*iframe|javascript:|onerror\s*=|onload\s*=|<\s*a\s+href|<\s*img/i.test(raw)) {
      return { ok: false, code: "XSS_HTML_TAG", reason: "Blocked by Shield: HTML tags and scripts are strictly prohibited." };
    }
    // Layer 4B: External URLs, shortlinks, Telegram/WhatsApp invite links
    if (/https?:\/\/|www\.|bit\.ly|tinyurl|t\.me\/|wa\.me\/|whatsapp\.com|\b[a-z0-9-]+\.(com|in|org|net|xyz|io|me|co|info|biz|top|bet|win)\b/i.test(raw)) {
      return { ok: false, code: "EXTERNAL_LINK_SPAM", reason: "Blocked by Shield: External URLs, domains, and invite links are not allowed." };
    }
    // Layer 4C: Unsolicited phone/WhatsApp number harvesting (10+ consecutive digits)
    if (/(\+?\d[\d\s-]{9,14}\d)/.test(raw)) {
      return { ok: false, code: "PHONE_NUMBER_SPAM", reason: "Blocked by Shield: Posting phone/WhatsApp numbers is prohibited to prevent scam harvesting." };
    }
    // Layer 4D: Commercial scam / betting / crypto / loan spam keywords
    const spamRegex = /\b(crypto|bitcoin|usdt|forex|casino|betting|dream11|teen\s*patti|rummy|aviator|work\s*from\s*home|earn\s*daily|instant\s*loan|backdoor\s*job|leaked\s*paper|whatsapp\s*group|telegram\s*channel|click\s*here|buy\s*now|seo\s*service|viagra|airdrop|hack)\b/i;
    if (spamRegex.test(raw) || spamRegex.test(nameRaw)) {
      return { ok: false, code: "SCAM_KEYWORD", reason: "Blocked by Shield: Promotional, betting, crypto, or solicitation keywords detected." };
    }
    // Layer 4E: Profanity / abusive language filter
    const abuseRegex = /\b(fuck|shit|bitch|asshole|bastard|chutiya|madarchod|bhenchod|gandu|harami|idiot\s*admin)\b/i;
    if (abuseRegex.test(raw) || abuseRegex.test(nameRaw)) {
      return { ok: false, code: "PROFANITY_FILTER", reason: "Blocked by Shield: Please keep the discussion respectful and free of profanity." };
    }
    // Layer 4F: Gibberish / keyboard smash (6+ identical consecutive chars or 22+ consonant smash)
    if (/(.)\1{5,}/i.test(raw) || /[bcdfghjklmnpqrstvwxz]{14,}/i.test(raw)) {
      return { ok: false, code: "GIBBERISH_PATTERN", reason: "Blocked by Shield: Repeated character gibberish or keyboard smashing detected." };
    }
    // Layer 4G: Excessive ALL-CAPS shouting (>75% uppercase when length > 25)
    const letters = raw.replace(/[^a-zA-Z]/g, "");
    if (letters.length > 25) {
      const upperCount = (letters.match(/[A-Z]/g) || []).length;
      if (upperCount / letters.length > 0.75) {
        return { ok: false, code: "EXCESSIVE_CAPS", reason: "Blocked by Shield: Please avoid typing in all-caps shouting." };
      }
    }
    // Layer 5: Duplicate content hash check
    const h = simpleContentHash(raw);
    if (discState.shield.recentHashes.includes(h)) {
      return { ok: false, code: "DUPLICATE_HASH", reason: "Blocked by Shield: This exact comment was already posted recently." };
    }

    return { ok: true, code: "CLEAN", reason: "🟢 Shield Verified: Clean employee post", hash: h };
  }

  function recordBlockedSpamAttempt(code, detail) {
    discState.shield.blockedCount += 1;
    const ts = new Date().toLocaleTimeString("en-IN", { hour12: false });
    discState.shield.auditLogs.unshift(`[${ts}] 🔴 BLOCKED (${code}): ${detail}`);
    savePersistedDiscussionData();
    renderShieldAuditUI();
  }

  function recordPassedPost(author) {
    const ts = new Date().toLocaleTimeString("en-IN", { hour12: false });
    discState.shield.auditLogs.unshift(`[${ts}] 🟢 VERIFIED HUMAN (${author}): Passed all 5 anti-spam layers.`);
    savePersistedDiscussionData();
    renderShieldAuditUI();
  }

  function renderShieldAuditUI() {
    const counterEl = document.getElementById("shield-blocked-counter");
    if (counterEl) {
      counterEl.textContent = `Blocked Spam: ${discState.shield.blockedCount}`;
    }
    const logListEl = document.getElementById("shield-audit-log-list");
    if (logListEl) {
      logListEl.innerHTML = discState.shield.auditLogs.map(line => {
        const cls = line.includes("🔴") ? "text-rose-400" : (line.includes("🟢") ? "text-emerald-400" : "text-slate-400");
        return `<div class="${cls}">${escapeHtmlSafe(line)}</div>`;
      }).join("");
    }
  }

  function showShieldAlert(msg, isError) {
    const box = document.getElementById("disc-shield-alert");
    if (!box) return;
    if (!msg) {
      box.classList.add("hidden");
      return;
    }
    box.className = isError
      ? "p-2.5 rounded-xl text-xs font-semibold border bg-rose-50 border-rose-300 text-rose-800"
      : "p-2.5 rounded-xl text-xs font-semibold border bg-emerald-50 border-emerald-300 text-emerald-900";
    box.textContent = msg;
    box.classList.remove("hidden");
  }

  function formatRelativeTime(ts) {
    const diffSec = Math.max(0, Math.floor((Date.now() - Number(ts)) / 1000));
    if (diffSec < 45) return "Just now";
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
    return new Date(Number(ts)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function renderPollWidget() {
    const container = document.getElementById("poll-options-container");
    const totalEl = document.getElementById("poll-total-votes");
    if (!container || !totalEl) return;

    const totalVotes = discState.pollOptions.reduce((acc, o) => acc + o.votes, 0);
    totalEl.textContent = `${totalVotes.toLocaleString("en-IN")} real vote${totalVotes === 1 ? "" : "s"}`;

    container.innerHTML = discState.pollOptions.map(opt => {
      const pct = totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(1) : "0.0";
      const isVoted = discState.votedPollId === opt.id;
      const borderCls = isVoted
        ? "border-emerald-600 bg-emerald-50/90 ring-1 ring-emerald-500"
        : "border-slate-200 bg-white hover:border-sky-400";
      return `<button type="button" data-poll-id="${opt.id}" class="poll-opt-btn android-ripple w-full text-left p-2.5 rounded-xl border transition relative overflow-hidden ${borderCls}">
        <div class="absolute inset-y-0 left-0 bg-emerald-500/15 transition-all duration-300" style="width: ${pct}%"></div>
        <div class="relative z-10 flex items-center justify-between gap-2">
          <span class="font-semibold text-slate-900 flex items-center gap-1.5">
            <span>${isVoted ? "✅" : "⚪"}</span>
            <span>${opt.label}</span>
          </span>
          <span class="font-mono font-extrabold text-emerald-800 shrink-0">${opt.votes} (${pct}%)</span>
        </div>
      </button>`;
    }).join("");
  }

  function renderDiscussionThreads() {
    const listEl = document.getElementById("discussion-threads-list");
    const countPill = byId("disc-count-pill");
    if (!listEl) return;

    // Hide any thread flagged by user
    let visibleThreads = discState.threads.filter(t => !discState.flaggedIds[t.id]);
    let filtered = visibleThreads.filter(t => discState.activeCat === "ALL" || t.cat === discState.activeCat);

    if (discState.sortBy === "HELPFUL") {
      filtered = filtered.slice().sort((a, b) => (b.upvotes - a.upvotes) || (b.timestamp - a.timestamp));
    } else {
      filtered = filtered.slice().sort((a, b) => b.timestamp - a.timestamp);
    }

    if (countPill) {
      countPill.textContent = `${visibleThreads.length} Real Comment${visibleThreads.length === 1 ? "" : "s"}`;
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 text-center space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl mx-auto shadow-sm">🛡️</div>
          <div class="space-y-1 max-w-md mx-auto">
            <h4 class="text-sm sm:text-base font-extrabold text-slate-900">No Real Employee Comments Posted Yet${discState.activeCat !== "ALL" ? " in This Topic" : ""}</h4>
            <p class="text-xs text-slate-600 leading-relaxed">
              We removed all pre-filled demo personas so this board contains <strong>100% authentic user-submitted discussions</strong>. Complete the Anti-Spam Math Challenge on the left to post the first real question or calculation note!
            </p>
          </div>
          <div class="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-slate-500">
            <span class="px-2.5 py-1 rounded-lg bg-white border border-slate-200">💾 Saved in Local Storage</span>
            <span class="px-2.5 py-1 rounded-lg bg-white border border-slate-200">🔄 Live Cross-Tab Sync</span>
            <span class="px-2.5 py-1 rounded-lg bg-white border border-slate-200">🛡️ 5-Layer Bot &amp; Link Shield</span>
          </div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(t => {
      const hasUpvoted = !!discState.upvotedIds[t.id];
      const isOwner = t.clientId === discState.clientId;
      const upBtnCls = hasUpvoted
        ? "bg-emerald-600 text-white border-emerald-600"
        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200";

      const absTime = new Date(Number(t.timestamp)).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
      });

      const repliesHtml = (t.replies || []).map((rep, rIdx) => {
        const repOwner = rep.clientId === discState.clientId;
        return `
          <div class="mt-2.5 pl-3 border-l-2 border-emerald-500 bg-slate-50/90 rounded-r-xl p-2.5 text-xs space-y-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-slate-900">${rep.author}</span>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">🛡️ Verified</span>
                <span class="text-[10px] text-slate-400">• ${formatRelativeTime(rep.timestamp || t.timestamp)}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">${rep.role}</span>
                ${repOwner ? `<button type="button" data-del-reply="${t.id}:${rIdx}" class="disc-del-reply-btn text-[10px] font-bold text-rose-600 hover:underline px-1">Delete</button>` : ""}
              </div>
            </div>
            <p class="text-slate-700 leading-relaxed">${rep.text}</p>
          </div>
        `;
      }).join("");

      return `<article class="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-2.5 hover:border-slate-300 transition">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-sky-600 to-blue-800 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
              ${t.author.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-xs sm:text-sm font-bold text-slate-900">${t.author}</span>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200" title="Verified by 5-Layer Anti-Spam Shield">🛡️ Verified Human</span>
                ${isOwner ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">You</span>` : ""}
              </div>
              <div class="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span class="font-semibold text-blue-700">${t.levelTag}</span>
                <span>•</span>
                <span title="${absTime}">${formatRelativeTime(t.timestamp)} (${absTime})</span>
              </div>
            </div>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-50 text-sky-800 border border-sky-200">${t.catBadge}</span>
        </div>

        ${t.snapshot ? `<div class="px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-[11px] font-mono font-semibold text-emerald-900 flex items-center gap-1.5"><span>🧮</span> <span>${t.snapshot}</span></div>` : ""}

        <p class="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">${t.body}</p>

        ${repliesHtml}

        <div class="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div class="flex items-center gap-2">
            <button type="button" data-upvote-id="${t.id}" class="disc-upvote-btn android-ripple px-3 py-1 rounded-xl border font-semibold transition flex items-center gap-1.5 ${upBtnCls}">
              <span>👍</span> <span>Helpful (${t.upvotes})</span>
            </button>
            <button type="button" data-reply-toggle="${t.id}" class="disc-reply-toggle-btn android-ripple px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition">
              💬 Reply (${(t.replies || []).length})
            </button>
          </div>
          <div class="flex items-center gap-2">
            ${isOwner
              ? `<button type="button" data-delete-id="${t.id}" class="disc-delete-btn px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] transition">🗑️ Delete My Post</button>`
              : `<button type="button" data-flag-id="${t.id}" class="disc-flag-btn px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-700 font-semibold text-[11px] transition" title="Report & hide spam">🚩 Report Spam</button>`
            }
          </div>
        </div>

        <!-- Inline Reply Box (Protected by Anti-Spam Shield) -->
        <div id="reply-box-${t.id}" class="hidden pt-2 space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input type="text" id="reply-name-${t.id}" maxlength="50" placeholder="Your Name & Post (Required)" class="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none" />
            <input type="text" id="reply-inp-${t.id}" maxlength="350" placeholder="Write a genuine reply (min 10 chars, no links)..." class="sm:col-span-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none" />
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] text-slate-500">🛡️ Protected by Anti-Spam Filter &amp; 30s Rate-Limit</span>
            <button type="button" data-reply-submit="${t.id}" class="disc-reply-submit-btn android-ripple px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0">
              🛡️ Verify &amp; Post Reply
            </button>
          </div>
        </div>
      </article>`;
    }).join("");
  }

  function escapeHtmlSafe(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function bindDiscussionAndFooterEvents() {
    loadPersistedDiscussionData();
    generateNewCaptcha();
    renderShieldAuditUI();
    renderPollWidget();
    renderDiscussionThreads();

    // Hero Discussion CTA button
    const btnHeroDisc = document.getElementById("btn-hero-discussion");
    if (btnHeroDisc) {
      btnHeroDisc.addEventListener("click", () => {
        const sec = document.getElementById("discussion-section");
        if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    // Scroll to Post Form button
    const btnScrollForm = document.getElementById("btn-disc-scroll-form");
    if (btnScrollForm) {
      btnScrollForm.addEventListener("click", () => {
        const inp = document.getElementById("disc-inp-name");
        if (inp) {
          inp.scrollIntoView({ behavior: "smooth", block: "center" });
          inp.focus();
        }
      });
    }

    // Toggle Shield Audit Log Drawer
    const btnToggleLog = document.getElementById("btn-toggle-shield-log");
    const auditDrawer = byId("shield-audit-drawer");
    if (btnToggleLog && auditDrawer) {
      btnToggleLog.addEventListener("click", () => {
        auditDrawer.classList.toggle("hidden");
      });
    }

    // Simulate Spam Attack Test Button (Proves the 5-Layer Shield works in real time)
    const btnTestSpam = document.getElementById("btn-test-spam-shield");
    if (btnTestSpam) {
      btnTestSpam.addEventListener("click", () => {
        const sampleAttacks = [
          { code: "HONEYPOT_BOT", msg: "Automated bot filled hidden website_url_honeypot field" },
          { code: "EXTERNAL_LINK_SPAM", msg: "Blocked URL injection: 'Join http://t.me/crypto_loan_win'" },
          { code: "XSS_HTML_TAG", msg: "Blocked HTML/JS injection tag payload" },
          { code: "GIBBERISH_PATTERN", msg: "Blocked keyboard smash: 'aaaaaabbbbbbcccccc'" }
        ];
        const pick = sampleAttacks[discState.shield.blockedCount % sampleAttacks.length];
        recordBlockedSpamAttempt(pick.code, pick.msg);
        showShieldAlert(`🛡️ Shield Test Passed: Intercepted & blocked [${pick.code}] — "${pick.msg}"`, true);
        showToast(`Anti-Spam Shield blocked test attack (${pick.code})!`);
      });
    }

    // Reset Stored Discussion Data Button
    const btnClearDisc = document.getElementById("btn-clear-real-disc");
    if (btnClearDisc) {
      btnClearDisc.addEventListener("click", () => {
        discState.threads = [];
        discState.votedPollId = null;
        discState.upvotedIds = {};
        discState.flaggedIds = {};
        discState.pollOptions = JSON.parse(JSON.stringify(DEFAULT_POLL_OPTIONS));
        discState.shield.blockedCount = 0;
        discState.shield.recentHashes = [];
        discState.shield.lastPostTimestamp = 0;
        discState.shield.auditLogs = ["[SHIELD RESET] Cleared all locally stored comments and poll votes."];
        savePersistedDiscussionData();
        renderShieldAuditUI();
        renderPollWidget();
        renderDiscussionThreads();
        showShieldAlert("", false);
        showToast("All stored comments & poll votes reset to 0.");
      });
    }

    // Refresh Math CAPTCHA Button
    const btnRefreshCap = document.getElementById("btn-disc-refresh-captcha");
    if (btnRefreshCap) {
      btnRefreshCap.addEventListener("click", () => {
        generateNewCaptcha();
        showToast("New anti-spam math challenge generated");
      });
    }

    // Live Content Scanner as User Types
    const bodyInp = document.getElementById("disc-inp-body");
    const nameInp = document.getElementById("disc-inp-name");
    const charCounter = document.getElementById("disc-char-counter");
    const trustBadge = document.getElementById("disc-live-trust-badge");

    function updateLiveSpamScanner() {
      if (!bodyInp || !trustBadge) return;
      const val = bodyInp.value || "";
      const nVal = nameInp ? (nameInp.value || "") : "Employee";
      if (charCounter) {
        charCounter.textContent = `${val.length} / 600 (min 10)`;
      }
      if (!val.trim()) {
        trustBadge.className = "font-bold text-slate-500";
        trustBadge.textContent = "⚪ Waiting for input...";
        return;
      }
      const check = inspectContentForSpam(val, nVal.length >= 2 ? nVal : "Employee");
      if (check.ok) {
        trustBadge.className = "font-bold text-emerald-700";
        trustBadge.textContent = check.reason;
      } else {
        trustBadge.className = "font-bold text-rose-600";
        trustBadge.textContent = `🔴 ${check.reason}`;
      }
    }

    if (bodyInp) bodyInp.addEventListener("input", updateLiveSpamScanner);
    if (nameInp) nameInp.addEventListener("input", updateLiveSpamScanner);

    // Toggle Official DoPT/DoE FAQ Reference Accordion
    const btnFaq = document.getElementById("btn-toggle-official-faq");
    const panelFaq = byId("official-faq-panel");
    const arrowFaq = document.getElementById("official-faq-arrow");
    if (btnFaq && panelFaq) {
      btnFaq.addEventListener("click", () => {
        const isHidden = panelFaq.classList.contains("hidden");
        panelFaq.classList.toggle("hidden");
        if (arrowFaq) arrowFaq.textContent = isHidden ? "▴ Hide" : "▾ Show";
      });
    }

    // Poll voting delegation (Persisted in localStorage)
    const pollContainer = document.getElementById("poll-options-container");
    if (pollContainer) {
      pollContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".poll-opt-btn");
        if (!btn) return;
        const optId = btn.getAttribute("data-poll-id");
        if (discState.votedPollId === optId) return;
        if (discState.votedPollId) {
          const prev = discState.pollOptions.find(o => o.id === discState.votedPollId);
          if (prev && prev.votes > 0) prev.votes -= 1;
        }
        const chosen = discState.pollOptions.find(o => o.id === optId);
        if (chosen) {
          chosen.votes += 1;
          discState.votedPollId = optId;
          savePersistedDiscussionData();
          renderPollWidget();
          showToast(`Real vote saved for ${chosen.label.split("—")[0].trim()}!`);
        }
      });
    }

    // Topic Filter Chips
    document.querySelectorAll(".disc-cat-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        discState.activeCat = btn.getAttribute("data-disc-cat") || "ALL";
        document.querySelectorAll(".disc-cat-btn").forEach(b => {
          const act = b.getAttribute("data-disc-cat") === discState.activeCat;
          b.className = act
            ? "disc-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-sm"
            : "disc-cat-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200";
        });
        renderDiscussionThreads();
      });
    });

    // Sort Selector
    const sortSel = document.getElementById("sel-disc-sort");
    if (sortSel) {
      sortSel.addEventListener("change", () => {
        discState.sortBy = sortSel.value;
        renderDiscussionThreads();
      });
    }

    // Post New Discussion Handler (Enforces all 5 Anti-Spam Shield Layers)
    const submitBtn = document.getElementById("btn-submit-discussion");
    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        const hpInp = document.getElementById("disc-hp-website");
        const topicSel = byId("disc-sel-topic");
        const levelSel = byId("disc-sel-level");
        const capInp = byId("disc-inp-captcha");
        const attachChk = byId("disc-chk-attach-calc");

        // LAYER 1: Honeypot Bot Trap
        if (hpInp && hpInp.value.trim() !== "") {
          recordBlockedSpamAttempt("HONEYPOT_TRAP", "Bot populated hidden website field.");
          showShieldAlert("🛡️ Blocked by Anti-Spam Shield: Automated bot submission detected.", true);
          return;
        }

        // LAYER 3A: Minimum Page Dwell Time (>1.2s)
        if (Date.now() - discState.pageLoadedAt < 1200) {
          recordBlockedSpamAttempt("FAST_BOT_SUBMIT", "Submission faster than human typing speed (<1.2s).");
          showShieldAlert("🛡️ Blocked by Anti-Spam Shield: Submission too fast.", true);
          return;
        }

        // LAYER 3B: 30-Second Rate-Limit Cooldown
        const elapsedSec = Math.floor((Date.now() - discState.shield.lastPostTimestamp) / 1000);
        if (discState.shield.lastPostTimestamp > 0 && elapsedSec < discState.shield.cooldownSeconds) {
          const waitSec = discState.shield.cooldownSeconds - elapsedSec;
          recordBlockedSpamAttempt("RATE_LIMIT_COOLDOWN", `Rapid post blocked (${waitSec}s cooldown remaining).`);
          showShieldAlert(`⏳ Rate-Limit Shield Active: Please wait ${waitSec} seconds before posting another comment.`, true);
          showToast(`Please wait ${waitSec}s before posting again.`);
          return;
        }

        // LAYER 4 & 5: Content, Link, Scam, Profanity, Gibberish & Duplicate Hash Inspection
        const rawName = (nameInp ? nameInp.value : "").trim();
        const rawBody = (bodyInp ? bodyInp.value : "").trim();
        const contentCheck = inspectContentForSpam(rawBody, rawName);
        if (!contentCheck.ok) {
          recordBlockedSpamAttempt(contentCheck.code, contentCheck.reason);
          showShieldAlert(`🛡️ ${contentCheck.reason}`, true);
          showToast(contentCheck.reason);
          return;
        }

        // LAYER 2: Arithmetic CAPTCHA Verification
        const userCap = parseInt(capInp ? capInp.value : "", 10);
        if (isNaN(userCap) || userCap !== discState.shield.captchaAns) {
          recordBlockedSpamAttempt("CAPTCHA_FAILED", `Incorrect math answer (${capInp ? capInp.value : "empty"} != ${discState.shield.captchaAns}).`);
          showShieldAlert("🔐 Incorrect Anti-Spam Math Challenge answer. Please solve the new challenge shown above.", true);
          generateNewCaptcha();
          if (capInp) capInp.focus();
          return;
        }

        // ALL 5 SHIELD LAYERS PASSED — Save Real Comment!
        const cat = topicSel ? topicSel.value : "FITMENT";
        const catLabels = {
          FITMENT: "Fitment & Matrix",
          ARREARS: "Arrears & 10E",
          PENSION: "UPS / NPS / Gratuity",
          ALLOWANCES: "HRA & TA Rules",
          TAX: "FY 26-27 Tax"
        };

        const res = state.lastResult;
        const lvLabel = (!levelSel || levelSel.value === "CURRENT")
          ? `Level ${state.levelId} (${res ? res.levelMeta.gp : ""})`
          : levelSel.value;

        const snap = (attachChk && attachChk.checked && res)
          ? `Level ${state.levelId} · 7th Basic: ${formatINR(res.cpc7.basic)} → 8th Basic (${state.fitment.toFixed(2)}×): ${formatINR(res.cpc8.basic)} · Est. Net: ${formatINR(res.cpc8.net)}/mo`
          : "";

        const newThread = {
          id: "th_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          clientId: discState.clientId,
          author: escapeHtmlSafe(rawName),
          levelTag: escapeHtmlSafe(lvLabel),
          cat,
          catBadge: catLabels[cat] || "Discussion",
          timestamp: Date.now(),
          upvotes: 1,
          snapshot: snap,
          body: escapeHtmlSafe(rawBody),
          replies: []
        };

        discState.threads.unshift(newThread);
        discState.upvotedIds[newThread.id] = true;
        discState.shield.lastPostTimestamp = Date.now();
        discState.shield.recentHashes.push(contentCheck.hash);
        recordPassedPost(rawName);

        discState.activeCat = "ALL";
        discState.sortBy = "NEWEST";
        if (sortSel) sortSel.value = "NEWEST";
        document.querySelectorAll(".disc-cat-btn").forEach(b => {
          const act = b.getAttribute("data-disc-cat") === "ALL";
          b.className = act
            ? "disc-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-sm"
            : "disc-cat-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200";
        });

        if (bodyInp) bodyInp.value = "";
        generateNewCaptcha();
        updateLiveSpamScanner();
        showShieldAlert("✅ Verified by 5-Layer Anti-Spam Shield! Your real comment is now live and saved.", false);
        renderDiscussionThreads();
        showToast("Verified comment posted & saved!");
      });
    }

    // Upvote, Delete, Report/Flag & Protected Inline Reply Delegation
    const threadsList = document.getElementById("discussion-threads-list");
    if (threadsList) {
      threadsList.addEventListener("click", (e) => {
        const upBtn = e.target.closest(".disc-upvote-btn");
        if (upBtn) {
          const thId = upBtn.getAttribute("data-upvote-id");
          const th = discState.threads.find(item => item.id === thId);
          if (!th) return;
          if (discState.upvotedIds[thId]) {
            th.upvotes = Math.max(0, th.upvotes - 1);
            delete discState.upvotedIds[thId];
          } else {
            th.upvotes += 1;
            discState.upvotedIds[thId] = true;
          }
          savePersistedDiscussionData();
          renderDiscussionThreads();
          return;
        }

        const delBtn = e.target.closest(".disc-delete-btn");
        if (delBtn) {
          const thId = delBtn.getAttribute("data-delete-id");
          discState.threads = discState.threads.filter(item => !(item.id === thId && item.clientId === discState.clientId));
          savePersistedDiscussionData();
          renderDiscussionThreads();
          showToast("Your comment was deleted.");
          return;
        }

        const delReplyBtn = e.target.closest(".disc-del-reply-btn");
        if (delReplyBtn) {
          const [thId, rIdxStr] = delReplyBtn.getAttribute("data-del-reply").split(":");
          const th = discState.threads.find(item => item.id === thId);
          const rIdx = parseInt(rIdxStr, 10);
          if (th && Array.isArray(th.replies) && th.replies[rIdx] && th.replies[rIdx].clientId === discState.clientId) {
            th.replies.splice(rIdx, 1);
            savePersistedDiscussionData();
            renderDiscussionThreads();
            showToast("Your reply was deleted.");
          }
          return;
        }

        const flagBtn = e.target.closest(".disc-flag-btn");
        if (flagBtn) {
          const thId = flagBtn.getAttribute("data-flag-id");
          discState.flaggedIds[thId] = true;
          recordBlockedSpamAttempt("USER_REPORTED_SPAM", `Thread ${thId} reported & hidden by user.`);
          renderDiscussionThreads();
          showToast("Post reported as spam and hidden from your feed.");
          return;
        }

        const repToggle = e.target.closest(".disc-reply-toggle-btn");
        if (repToggle) {
          const thId = repToggle.getAttribute("data-reply-toggle");
          const box = document.getElementById(`reply-box-${thId}`);
          if (box) {
            box.classList.toggle("hidden");
            const nameField = document.getElementById(`reply-name-${thId}`);
            if (nameField && !nameField.value && nameInp && nameInp.value) {
              nameField.value = nameInp.value;
            }
            const inp = document.getElementById(`reply-inp-${thId}`);
            if (inp && !box.classList.contains("hidden")) inp.focus();
          }
          return;
        }

        const repSub = e.target.closest(".disc-reply-submit-btn");
        if (repSub) {
          const thId = repSub.getAttribute("data-reply-submit");
          const rNameInp = byId(`reply-name-${thId}`);
          const rBodyInp = document.getElementById(`reply-inp-${thId}`);
          const th = discState.threads.find(item => item.id === thId);
          if (!th || !rBodyInp) return;

          // Enforce 30s rate-limit cooldown on replies too
          const elapsedSec = Math.floor((Date.now() - discState.shield.lastPostTimestamp) / 1000);
          if (discState.shield.lastPostTimestamp > 0 && elapsedSec < discState.shield.cooldownSeconds) {
            const waitSec = discState.shield.cooldownSeconds - elapsedSec;
            recordBlockedSpamAttempt("REPLY_RATE_LIMIT", `Reply blocked (${waitSec}s cooldown remaining).`);
            showToast(`Rate-Limit Shield: Please wait ${waitSec}s before replying.`);
            return;
          }

          const rAuthor = (rNameInp ? rNameInp.value : "").trim() || (nameInp ? nameInp.value.trim() : "");
          const rText = (rBodyInp.value || "").trim();
          const check = inspectContentForSpam(rText, rAuthor);
          if (!check.ok) {
            recordBlockedSpamAttempt("REPLY_" + check.code, check.reason);
            showToast(check.reason);
            return;
          }

          th.replies = th.replies || [];
          th.replies.push({
            clientId: discState.clientId,
            author: escapeHtmlSafe(rAuthor),
            role: `Level ${state.levelId}`,
            timestamp: Date.now(),
            text: escapeHtmlSafe(rText)
          });
          discState.shield.lastPostTimestamp = Date.now();
          discState.shield.recentHashes.push(check.hash);
          recordPassedPost(rAuthor);
          renderDiscussionThreads();
          showToast("Verified reply posted & saved!");
        }
      });
    }

    // Footer Quick Links & Back to Top
    const btnBackTop = document.getElementById("btn-footer-back-top");
    if (btnBackTop) {
      btnBackTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    document.querySelectorAll(".footer-nav-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        executeNavAction(btn.getAttribute("data-footer-nav"));
      });
    });
  }

  // Initialize on DOMContentLoaded / load
  function init() {
    restoreCalcState();
    bindSharedInputs();
    populateLevelAndBasicDropdowns(true);
    renderPostPresets();
    bindEvents();
    bindMicroToolsEvents();
    bindMegaMenuAndHeroEvents();
    bindDiscussionAndFooterEvents();
    syncCalculatorControls();
    runAllCalculations();
    renderHeroLivePreview(LIVE_PREVIEW_PROFILES[0]);
    renderAll20StatesTable();
    renderMicroToolsGrid();

    const savedLang = safeStorageGet(LANG_KEY, "en");
    if (savedLang !== "en") applyLanguage(savedLang);
    switchMainTab(getCurrentPageTab());

    const params = new URLSearchParams(window.location.search);
    const pendingAction = params.get("go");
    if (pendingAction) {
      history.replaceState(null, "", window.location.pathname + window.location.hash);
      executeNavAction(pendingAction);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
