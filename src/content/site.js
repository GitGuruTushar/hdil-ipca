// =====================================================================
// HDIL-IPCA — CENTRAL SITE CONTENT (Phase 1)
// ---------------------------------------------------------------------
// Every word, number, photo and contact detail on the public site lives
// in THIS one file. To replace placeholder content with real data, edit
// only this file — no component needs to change.
//
// Anything marked  [EDIT]  is realistic placeholder content awaiting
// the federation's real information:
//   1. brand.fullForm            — confirm the official full form
//   2. stats.*                   — real building / gala / member counts
//   3. about.timeline + history  — real years and milestones
//   4. about.leadership          — real names, roles (photos optional)
//   5. contact.email / phone     — the federation's real email & phone
//   6. helpline.park + providers — real internal numbers & vendors
//   7. news.items                — real updates (or manage via Phase 2)
//   8. gallery.albums            — real park photographs
// Photos on https://images.unsplash.com are placeholders — swap the URL
// strings for real photos (put files in /public and use "/your.jpg").
// =====================================================================

const u = (id, w = 1600) =>
  `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`;

// Prefixes local assets with the deployment base path (GitHub Pages serves
// the site under /hdil-ipca). Empty in dev and on Vercel.
const bp = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const site = {
  brand: {
    name: "HDIL-IPCA",
    short: "IPCA",
    // [EDIT] Confirm the official full form of IPCA:
    fullForm: "HDIL Industrial Premises Co-operative Association",
    tagline: "Where industry meets community.",
    logo: `${bp}/ipcalogo.png`,
  },

  nav: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "News", href: "/updates" },
    { label: "Gallery", href: "/gallery" },
    { label: "Helpline", href: "/helpline" },
    { label: "Contact", href: "/contact" },
  ],

  contact: {
    addressLines: [
      "HDIL Industrial Park",
      "Chandansar, Virar (East)",
      "Palghar, Maharashtra 401305",
    ],
    officeLine: "Federation Office — Building No. 7", // [EDIT]
    email: "office@hdilipca.in", // [EDIT] real federation email
    phone: "+91 98200 00000", // [EDIT] real federation phone
    whatsapp: null, // [EDIT] e.g. "919820000000" to enable the WhatsApp channel
    hours: [
      { days: "Monday – Saturday", time: "10:00 – 18:00 IST" }, // [EDIT]
      { days: "Sunday & public holidays", time: "Closed" },
    ],
    mapEmbedSrc:
      "https://www.google.com/maps?q=HDIL+Industrial+Park+Chandansar+Virar+East&output=embed",
    directionsUrl:
      "https://www.google.com/maps/dir/?api=1&destination=HDIL+Industrial+Park+Chandansar+Virar+East",
    responsePromise: "We reply within 1 business day.",
  },

  // [EDIT] Real federation statistics
  stats: [
    { value: 22, suffix: "+", label: "Years of the federation", short: "Years", featured: true },
    { value: 24, suffix: "", label: "Buildings in the park", short: "Buildings" },
    { value: 850, suffix: "+", label: "Galas & industrial units", short: "Galas" },
    { value: 600, suffix: "+", label: "Member businesses", short: "Members" },
  ],

  home: {
    hero: {
      eyebrow: "HDIL Industrial Park · Virar (East)",
      // The <em> word is rendered in italic display serif
      titleLead: "Where Virar",
      titleEm: "builds.",
      sub: "600+ businesses. One address. One voice.",
      primaryCta: { label: "Explore the federation", href: "/about" },
      secondaryCta: { label: "Emergency helpline", href: "/helpline" },
      image: `${bp}/home/hero.jpg`,
      imageAlt: "Buildings of the HDIL Industrial Park with IPCA billboards",
    },
    intro: {
      eyebrow: "01 — Who we are",
      title: "One park. One voice.",
      text: "Two decades of roads, power, water and security — maintained together, argued for together, built together.", // [EDIT]
      link: { label: "About the federation", href: "/about" },
      image: u("photo-1541888946425-d81bb19240f5"),
      imageAlt: "Construction work inside an industrial estate",
    },
    industries: [
      "Engineering",
      "Textiles & Garments",
      "Printing & Packaging",
      "Pharma & Chemicals",
      "Logistics & Warehousing",
      "Food Processing",
      "Electronics",
      "Fabrication",
    ],
    newsTeaser: {
      eyebrow: "02 — Latest from the park",
      title: "News & updates",
      link: { label: "All updates", href: "/updates" },
      count: 3, // newest N items from news.items
    },
    galleryTeaser: {
      eyebrow: "03 — Life in the park",
      title: "Moments that build community",
      link: { label: "Open the gallery", href: "/gallery" },
    },
    helplineStrip: {
      title: "Emergencies don't wait.",
      text: "Fire, police, medical, park security — one tap away.",
      cta: { label: "Open the helpline", href: "/helpline" },
    },
    contactStrip: {
      titleLead: "Have something to",
      titleEm: "say?",
      text: "Questions, suggestions or a business enquiry — the federation office is listening.",
      cta: { label: "Contact us", href: "/contact" },
    },
  },

  about: {
    hero: {
      eyebrow: "About the federation",
      titleLead: "Built by industry,",
      titleEm: "run by its people.",
      sub: "The story, the mission, the people.",
    },
    history: {
      eyebrow: "01 — Our story",
      title: "A quarter century in the making",
      // [EDIT] Real history of the park & federation
      paragraphs: [
        "From open fields in Chandansar to one of the region's busiest industrial estates — and a federation born to give it one voice.",
      ],
      timeline: [
        // [EDIT] Real milestones and years
        { year: "1998", title: "The park takes shape", text: "The first buildings rise, the first units switch on." },
        { year: "2004", title: "The federation is formed", text: "Owners unite behind one body for the whole park." },
        { year: "2015", title: "The modernisation drive", text: "Roads, lighting and security upgraded estate-wide." },
        { year: "2026", title: "A connected community", text: "The federation goes digital, on every screen in the park." },
      ],
    },
    missionVision: {
      eyebrow: "02 — Why we exist",
      mission: {
        title: "Mission",
        text: "Protect the park's shared infrastructure and speak for everyone inside it — with one strong, fair voice.", // [EDIT]
      },
      vision: {
        title: "Vision",
        text: "The benchmark industrial park of the region — safe, clean and thriving.", // [EDIT]
      },
      values: [
        { index: "01", title: "Advocacy", text: "One voice before civic bodies, utilities and government." },
        { index: "02", title: "Infrastructure", text: "Roads, drainage, lighting, water, security — for everyone." },
        { index: "03", title: "Community", text: "Workshops and festivals that make an estate a neighbourhood." },
      ],
    },
    leadership: {
      eyebrow: "03 — Leadership",
      title: "The people who carry the park",
      text: "Elected by members. Serving voluntarily.", // [EDIT]
      members: [
        // [EDIT] Real names, roles and (optionally) photos — photo: "/team/name.jpg"
        { name: "Rajesh Sharma", role: "President", photo: null },
        { name: "Sunita Patil", role: "Vice President", photo: null },
        { name: "Amit Desai", role: "Hon. Secretary", photo: null },
        { name: "Priya Joshi", role: "Treasurer", photo: null },
        { name: "Vikram Mehta", role: "Jt. Secretary", photo: null },
        { name: "Anil Gupta", role: "Committee Member", photo: null },
      ],
    },
  },

  news: {
    hero: {
      eyebrow: "News · Bulletins · Work updates",
      titleLead: "The park,",
      titleEm: "in print.",
      sub: "Circulars, works and wins — straight from the office.",
    },
    categories: ["All", "Maintenance", "Events", "Achievements"],
    // [EDIT] Real news items (newest first). In Phase 2 these move to the admin panel.
    items: [
      {
        slug: "monsoon-readiness-2026",
        title: "Monsoon-ready: annual drainage desilting completed across the park",
        category: "Maintenance",
        date: "2026-06-18",
        excerpt: "All internal storm-water drains have been desilted and tested ahead of the monsoon, with pumping arrangements on standby for low-lying stretches.",
        body: "The federation's pre-monsoon programme wrapped up this week with the desilting of every internal storm-water drain in the park. Contractors worked building-by-building over three weeks, clearing culverts and testing outflows.\n\nPumping arrangements are on standby for the low-lying stretch near the main gate. Members are requested to keep gala frontages clear of material that could block drain covers.",
        image: u("photo-1541888946425-d81bb19240f5"),
      },
      {
        slug: "led-highmast-lighting",
        title: "New LED high-mast lighting switched on at the main gate",
        category: "Maintenance",
        date: "2026-05-30",
        excerpt: "The main gate and primary internal roads now run on energy-efficient LED high-mast lighting, cutting power costs and brightening night shifts.",
        body: "The long-planned lighting upgrade is live. High-mast LED fixtures now cover the main gate, the weighbridge yard and the primary internal roads.\n\nBeyond safety, the switch is expected to reduce the park's common electricity bill by nearly a third.",
        image: u("photo-1486406146926-c627a92ad1ab"),
      },
      {
        slug: "agm-2026-notice",
        title: "Annual General Meeting 2026: notice and agenda",
        category: "Events",
        date: "2026-05-12",
        excerpt: "The AGM will be held at the federation office grounds. Accounts, the annual maintenance plan and committee elections are on the agenda.",
        body: "All members are invited to the Annual General Meeting of the federation. The agenda includes adoption of audited accounts, the maintenance plan for the coming year, and elections to the managing committee.\n\nMembers should carry their gala ownership or tenancy documents for registration at the venue.", // [EDIT] real date/venue
        image: u("photo-1517048676732-d65bc937f952"),
      },
      {
        slug: "fire-safety-drill-2026",
        title: "Fire safety and evacuation drill held with Virar Fire Brigade",
        category: "Events",
        date: "2026-03-21",
        excerpt: "Over 200 workers participated in a park-wide evacuation drill, with hands-on extinguisher training conducted by the fire brigade.",
        body: "In coordination with the Virar Fire Brigade, the federation conducted its annual fire safety drill across the park. Over two hundred workers from member units practised evacuation routes and assembly-point discipline.\n\nHands-on sessions covered extinguisher use and LPG cylinder safety. The federation thanks the brigade and every participating unit.",
        image: u("photo-1504307651254-35680f356dfd"),
      },
      {
        slug: "cctv-full-coverage",
        title: "CCTV network upgraded to full park coverage",
        category: "Achievements",
        date: "2026-02-27",
        excerpt: "Sixty-four new cameras complete the park's surveillance grid, monitored 24×7 from the security control room.",
        body: "The final phase of the CCTV upgrade is complete. Sixty-four new cameras now cover every internal road, gate and common area, monitored round the clock from the security control room.\n\nFootage retention has been extended, and members can request incident footage through the federation office.",
        image: u("photo-1557597774-9d273605dfa9"),
      },
      {
        slug: "gst-compliance-workshop",
        title: "GST & compliance workshop draws a full house",
        category: "Events",
        date: "2026-02-07",
        excerpt: "Chartered accountants walked member units through GST filing changes, e-invoicing and MSME registration benefits.",
        body: "The federation's first workshop of the year focused on what small units actually deal with: GST filing changes, e-invoicing thresholds and the benefits of MSME registration.\n\nThe session ended with an open Q&A that ran well past its slot — a follow-up session is being planned.",
        image: u("photo-1556761175-b413da4baf72"),
      },
      {
        slug: "road-resurfacing-phase1",
        title: "Internal road resurfacing: first phase complete",
        category: "Achievements",
        date: "2026-01-19",
        excerpt: "1.2 km of the park's most heavily used internal roads have been resurfaced, with the second phase scheduled after the monsoon.",
        body: "The first phase of the road programme — covering 1.2 km of the busiest internal stretches — has been completed ahead of schedule.\n\nPhase two, covering the eastern loop, is scheduled after the monsoon. Members are thanked for their patience during the works.", // [EDIT]
        image: u("photo-1517089596392-fb9a9033e05b"),
      },
      {
        slug: "skill-development-drive",
        title: "120 park workers certified in the skill development drive",
        category: "Achievements",
        date: "2025-12-15",
        excerpt: "A three-month training partnership closed with 120 workers earning certifications in welding, electrical work and warehouse operations.",
        body: "The federation's skill development drive concluded with 120 workers from member units receiving trade certifications in welding, electrical maintenance and warehouse operations.\n\nThe programme returns next year with expanded seats — units can nominate workers through the federation office.", // [EDIT]
        image: u("photo-1581091226825-a6a2a5aee158"),
      },
    ],
  },

  gallery: {
    hero: {
      eyebrow: "Gallery",
      titleLead: "The park,",
      titleEm: "framed.",
      sub: "Events, works and everyday life across the park.",
    },
    // [EDIT] Real park photographs — group by event or date
    albums: [
      {
        title: "Fire Safety Drill 2026",
        date: "March 2026",
        description: "The annual park-wide evacuation drill with the Virar Fire Brigade.",
        images: [
          { src: u("photo-1504307651254-35680f356dfd"), alt: "Workers during a safety drill" },
          { src: u("photo-1601058268499-e52658b8bb88"), alt: "Protective gear demonstration" },
          { src: u("photo-1541888946425-d81bb19240f5"), alt: "Safety inspection on site" },
          { src: u("photo-1516216628859-9bccecab13ca"), alt: "Harness training at height" },
        ],
      },
      {
        title: "Annual General Meeting 2025",
        date: "December 2025",
        description: "Members gathered for accounts, plans and elections.",
        images: [
          { src: u("photo-1517048676732-d65bc937f952"), alt: "Members at the AGM" },
          { src: u("photo-1556761175-b413da4baf72"), alt: "Committee addressing members" },
          { src: u("photo-1521737604893-d14cc237f11d"), alt: "Discussion between members" },
          { src: u("photo-1552664730-d307ca884978"), alt: "Planning session" },
        ],
      },
      {
        title: "Infrastructure Upgrades",
        date: "2025 – 2026",
        description: "Roads, lighting and security works across the estate.",
        images: [
          { src: u("photo-1486406146926-c627a92ad1ab"), alt: "Park buildings" },
          { src: u("photo-1504328345606-18bbc8c9d7d1"), alt: "Industrial machinery" },
          { src: u("photo-1553413077-190dd305871c"), alt: "Warehouse interior" },
          { src: u("photo-1487958449943-2429e8be8625"), alt: "Building facade" },
        ],
      },
      {
        title: "Workshops & Training",
        date: "2025 – 2026",
        description: "GST clinics, skill certification and safety training for member units.",
        images: [
          { src: u("photo-1524178232363-1fb2b075b655"), alt: "Training session" },
          { src: u("photo-1581091226825-a6a2a5aee158"), alt: "Technical training" },
          { src: u("photo-1454165804606-c3d57bc86b40"), alt: "Compliance planning" },
          { src: u("photo-1497366216548-37526070297c"), alt: "Workshop venue" },
        ],
      },
    ],
  },

  helpline: {
    hero: {
      eyebrow: "Emergency contacts · Helpline",
      titleLead: "Help,",
      titleEm: "one tap away.",
      sub: "Every critical number for the park. Tap to call.",
    },
    // National emergency numbers (India) — these are real
    emergency: [
      { name: "Police", number: "100", note: "Law & order emergencies" },
      { name: "Fire Brigade", number: "101", note: "Fire & rescue" },
      { name: "Ambulance", number: "108", note: "Medical emergencies" },
      { name: "National Emergency", number: "112", note: "All-in-one emergency line" },
      { name: "Gas Leak (LPG)", number: "1906", note: "24×7 LPG emergency" },
      { name: "Electricity (MSEDCL)", number: "1912", note: "Power failure & line faults" },
    ],
    park: [
      // [EDIT] Real park numbers
      { name: "Park Security Control Room", number: "+91 98200 00001", hours: "24×7", available247: true },
      { name: "Federation Office", number: "+91 98200 00002", hours: "Mon–Sat, 10:00–18:00", available247: false },
      { name: "Maintenance Desk", number: "+91 98200 00003", hours: "24×7", available247: true },
    ],
    providers: {
      eyebrow: "Service providers",
      title: "Who handles what",
      note: "Empanelled by the federation. Ratings collected at the office — online ratings arrive with the members' portal (Phase 2).",
      list: [
        // [EDIT] Real empanelled vendors
        { name: "Om Sai Electricals", service: "Electrical maintenance", phone: "+91 98200 00004", rating: 4.6 },
        { name: "Shree Ganesh Plumbing Works", service: "Plumbing & water lines", phone: "+91 98200 00005", rating: 4.3 },
        { name: "Falcon Facility Services", service: "Housekeeping & waste management", phone: "+91 98200 00006", rating: 4.5 },
        { name: "Sable Security Services", service: "Security staffing", phone: "+91 98200 00007", rating: 4.7 },
        { name: "Virar Borewell & Tankers", service: "Water supply & tankers", phone: "+91 98200 00008", rating: 4.2 },
      ],
    },
  },

  contactPage: {
    hero: {
      eyebrow: "Contact us",
      titleLead: "Baat",
      titleEm: "karein?",
      sub: "The federation office is listening.",
    },
    intents: [
      "I own a gala here",
      "I'm a tenant",
      "Looking for space",
      "General enquiry",
    ],
    form: {
      note: "This form opens your email app with the message pre-filled — hit send there and it reaches the federation office.",
      successTitle: "Your email app should be open.",
      successText: "Press send there and your message reaches the federation office. We reply within 1 business day.",
    },
  },

  footer: {
    blurb: "The federation of the HDIL Industrial Park, Virar (East) — since 2004.", // [EDIT] year
    copyright: `© ${new Date().getFullYear()} HDIL-IPCA. All rights reserved.`,
    phaseNote: null,
  },
};

// Convenience exports
export const { brand, nav, contact, stats } = site;
export const newsItems = site.news.items;
export const fmtDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
