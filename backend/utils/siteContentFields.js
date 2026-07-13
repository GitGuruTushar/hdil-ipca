// Canonical field contract for SiteContent.data, per page. Every user-facing text
// field is { en, hi, mr } so the admin editor and public pages agree on shape without
// a shared cross-runtime import (backend is CommonJS, frontend is a separate Next.js
// process) — this module is the reference the frontend form mirrors by hand.
//
// Bump SCHEMA_VERSION whenever a field is added/removed/renamed here.
const SCHEMA_VERSION = 2;

const loc = (en = '', hi = '', mr = '') => ({ en, hi, mr });

const DEFAULT_SITE_CONTENT = {
  home: {
    heroKicker: loc('HDIL Industrial Park · Virar (East)'),
    heroTitleLead: loc('Where industry'),
    heroTitleEm: loc('meets community.'),
    heroSubtitle: loc(
      'HDIL-IPCA represents the owners and tenants of the industrial park, keeping members informed and connected.'
    ),
    heroPrimaryCtaLabel: loc('Explore the park'),
    heroPrimaryCtaHref: '/about',
    heroSecondaryCtaLabel: loc('Our story'),
    heroSecondaryCtaHref: '/about',
    heroImageUrl: '',
    heroImageAlt: loc(''),
    stats: [
      { value: 14, suffix: '+', label: loc('Buildings'), short: loc('Buildings'), featured: false },
      { value: 620, suffix: '+', label: loc('Gala numbers'), short: loc('Galas'), featured: false },
      { value: 300, suffix: '+', label: loc('Member businesses'), short: loc('Members'), featured: true }
    ],
    introEyebrow: loc('About the park'),
    introTitle: loc('One federation, every building.'),
    introText: loc(
      'The HDIL Industrial Park Association represents the owners and occupiers of galas across the park, coordinating on everything from emergency services to common infrastructure.'
    ),
    introImageUrl: '',
    introImageAlt: loc(''),
    introLinkLabel: loc('Read our story'),
    introLinkHref: '/about',
    industriesMarqueeItems: [],
    newsTeaserEyebrow: loc('Latest'),
    newsTeaserTitle: loc('News & updates'),
    newsTeaserLinkLabel: loc('View all updates'),
    newsTeaserCount: 3,
    galleryTeaserEyebrow: loc('Gallery'),
    galleryTeaserTitle: loc('Moments from the park'),
    galleryTeaserLinkLabel: loc('View gallery'),
    helplineStripTitle: loc('Emergency lines, one tap away'),
    helplineStripText: loc('Security, fire, medical and park service numbers, always up to date.'),
    helplineStripCtaLabel: loc('View helpline'),
    contactStrip: {
      titleLead: loc('Have a question'),
      titleEm: loc('for the federation?'),
      text: loc('Reach the office directly for anything from maintenance to membership.'),
      ctaLabel: loc('Contact us')
    }
  },
  about: {
    heroEyebrow: loc('About us'),
    heroTitleLead: loc('Built by owners,'),
    heroTitleEm: loc('run for the park.'),
    heroSub: loc('The story, mission and people behind HDIL-IPCA.'),
    historyEyebrow: loc('Our history'),
    historyTitle: loc('How the federation began'),
    historyIntro: loc(
      'HDIL Industrial Park is developed and the first galas are allotted to owners, laying the ground for what becomes the federation.'
    ),
    history: [
      { year: '2009', title: loc('The park is developed'), text: loc('HDIL Industrial Park is developed and the first galas are allotted to owners.') },
      { year: '2014', title: loc('An informal committee forms'), text: loc('A group of founding members forms an informal owners’ committee to coordinate common concerns.') },
      { year: '2018', title: loc('Formal registration'), text: loc('The association is formally registered to represent owners and tenants collectively.') },
      { year: '2023', title: loc('300+ members'), text: loc('Membership crosses 300 businesses across 12 buildings in the park.') }
    ],
    missionVisionEyebrow: loc('Mission & vision'),
    missionTitle: loc('Our mission'),
    missionText: loc('To give every owner and tenant a unified voice in how the park is run, maintained and represented.'),
    visionTitle: loc('Our vision'),
    visionText: loc(
      'A park where infrastructure, safety and services are managed collectively, so every business can focus on running its operations.'
    ),
    values: [
      { index: '01', title: loc('Transparency'), text: loc('Open books, open decisions, open communication with every member.') },
      { index: '02', title: loc('Accountability'), text: loc('Service providers and vendors are held to the standards members expect.') },
      { index: '03', title: loc('Community'), text: loc('The park works best when owners and tenants work together.') }
    ],
    stats: [
      { value: 14, suffix: '+', label: loc('Buildings'), short: loc('Buildings'), featured: false },
      { value: 620, suffix: '+', label: loc('Gala numbers'), short: loc('Galas'), featured: false },
      { value: 300, suffix: '+', label: loc('Member businesses'), short: loc('Members'), featured: true }
    ],
    leadershipEyebrow: loc('Leadership'),
    leadershipTitle: loc('Who runs the federation'),
    leadershipText: loc('An elected committee representing owners and tenants across the park.'),
    leadership: [
      { name: 'Ramesh Patil', role: loc('President'), photoUrl: '', bio: loc('Leading the federation since 2021, focused on infrastructure upgrades and member services.') },
      { name: 'Sunita Deshmukh', role: loc('Vice President'), photoUrl: '', bio: loc('Represents tenant interests and coordinates safety and compliance initiatives.') },
      { name: 'Anil Kadam', role: loc('Treasurer'), photoUrl: '', bio: loc('Oversees association finances and vendor contracts.') },
      { name: 'Farhan Sheikh', role: loc('Secretary'), photoUrl: '', bio: loc('Manages member communications, notices, and day-to-day administration.') }
    ]
  },
  contact: {
    heroEyebrow: loc('Get in touch'),
    heroTitleLead: loc("We're here to help"),
    heroTitleEm: loc('the park’s owners and tenants.'),
    heroSub: loc('Reach the federation office for anything from maintenance to membership.'),
    mapEmbedUrl: 'https://www.google.com/maps?q=Virar+East+Palghar+Maharashtra&output=embed',
    directionsUrl: 'https://www.google.com/maps/search/?api=1&query=HDIL+Industrial+Park+Virar+East',
    responsePromise: loc('We usually respond within one business day.'),
    intents: [loc('General enquiry'), loc('Maintenance'), loc('Membership'), loc('Vendor / vacancy')],
    formNote: loc('Fields marked required must be filled in before sending.'),
    formSuccessTitle: loc('Message ready to send'),
    formSuccessText: loc('Your email app should have opened with your message pre-filled.'),
    formNameLabel: loc('Your name'),
    formPhoneLabel: loc('Phone (optional)'),
    formMessageLabel: loc('Your message'),
    formNameError: loc('Please enter your name.'),
    formPhoneError: loc('Please enter a valid phone number.'),
    formMessageError: loc('Please write a short message.'),
    formSubmitLabel: loc('Open email & send'),
    formIntentLegend: loc('What brings you here?'),
    formIntentError: loc('Please choose one option.')
  },
  // gallery/updates/helpline only need hero copy here — their body content
  // (albums/updates/emergency contacts) already lives in its own dedicated
  // model with working admin CRUD (see Milestone 2), not duplicated into
  // SiteContent.
  gallery: {
    heroEyebrow: loc('Gallery'),
    heroTitleLead: loc('The park,'),
    heroTitleEm: loc('framed.'),
    heroSub: loc('Events, works and everyday life across the park.')
  },
  updates: {
    heroEyebrow: loc('News · Bulletins · Work updates'),
    heroTitleLead: loc('The park,'),
    heroTitleEm: loc('in print.'),
    heroSub: loc('Circulars, works and wins — straight from the office.')
  },
  helpline: {
    heroEyebrow: loc('Emergency contacts · Helpline'),
    heroTitleLead: loc('Help,'),
    heroTitleEm: loc('one tap away.'),
    heroSub: loc('Every critical number for the park. Tap to call.')
  }
};

module.exports = { SCHEMA_VERSION, DEFAULT_SITE_CONTENT, loc };
