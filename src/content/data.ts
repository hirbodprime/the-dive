// All site content lives here. Edit freely; the UI reads only from this file.

export const profile = {
  name: 'Hirbod Aflaki Manjili',
  short: 'HIRBOD',
  role: 'Backend Software Engineer · Python / Django',
  location: 'Duisburg, Germany',
  email: 'hirbodprime@gmail.com',
  github: 'https://github.com/hirbodprime',
  githubUser: 'hirbodprime',
  source: 'https://github.com/hirbodprime/the-dive',   // this site's own repo
  linkedin: 'https://www.linkedin.com/in/hirbodprime/',
  cv: '/cv',
  tagline: 'Build something useful. Understand how it works. Keep improving it.',
  billboards: [
    { title: 'WHO', body: "I'm Hirbod — a backend engineer who builds web apps, APIs and automation in Python and Django. 4+ years shipping real systems." },
    { title: 'WHAT', body: 'API design, JWT auth, PostgreSQL tuning, Celery/Redis pipelines, payout engines, Telegram bots with hundreds of daily users.' },
    { title: 'WHERE', body: 'From Tehran to Germany. Now in Duisburg, sharpening my German and preparing for the Studienkolleg (T-Kurs) from Oct 2026.' },
    { title: 'HOW', body: 'I learn by building. Every project here started as "I wonder how that works" — and ended in production.' },
  ],
  languages: [
    { name: 'Persian', level: 'Native' },
    { name: 'English', level: 'Fluent — used daily since childhood' },
    { name: 'German', level: 'B1 certified, actively working above B1' },
  ],
};

export type Skill = { name: string; level: number };
export const skills: { group: string; color: string; items: Skill[] }[] = [
  { group: 'CORE', color: '#00f0ff', items: [{ name: 'Python', level: 0.95 }, { name: 'Django', level: 0.95 }, { name: 'Django REST Framework', level: 0.9 }, { name: 'REST APIs', level: 0.9 }, { name: 'JWT Auth', level: 0.8 }] },
  { group: 'DATA', color: '#ff2bd6', items: [{ name: 'PostgreSQL', level: 0.85 }, { name: 'MySQL', level: 0.75 }, { name: 'Redis', level: 0.75 }, { name: 'Celery', level: 0.7 }] },
  { group: 'SYSTEMS', color: '#f8e602', items: [{ name: 'Linux', level: 0.85 }, { name: 'Bash', level: 0.7 }, { name: 'Git / GitHub', level: 0.9 }, { name: 'Docker', level: 0.5 }, { name: 'WebSockets', level: 0.65 }] },
  { group: 'FRONT', color: '#7cff6b', items: [{ name: 'JavaScript', level: 0.65 }, { name: 'TailwindCSS', level: 0.65 }, { name: 'Vue', level: 0.4 }] },
  { group: 'HUMAN', color: '#ff8a3d', items: [{ name: 'Teamwork', level: 0.9 }, { name: 'Problem solving', level: 0.9 }, { name: 'Mentoring', level: 0.7 }, { name: 'Agile / Scrum', level: 0.7 }] },
];

export type Job = { from: string; to: string; company: string; role: string; place: string; url?: string; points: string[]; side?: boolean };
export const experience: Job[] = [
  { from: '2025.07', to: '2025.12', company: 'Artonomy', role: 'Founder', place: 'Remote', points: ['Co-developed a community platform in Django/Python — users, feeds, creator features', 'Drove the MVP from idea to implementation'] },
  { from: '2025.07', to: '2025.09', company: 'HaftoHasht Incubator', role: 'Entrepreneurship Program', place: 'Tehran', url: 'https://haftohasht.studio/en', points: ['Built and pitched a startup: business model, planning, MVP'] },
  { from: '2025.03', to: '2025.11', company: 'HaftoHasht', role: 'Software Engineer', place: 'Tehran', url: 'https://haftohasht.studio/en', points: ['Full-stack Django + TailwindCSS apps for a community platform', 'Communication & networking features, Telegram integration', 'Worked closely with UX/UI; code reviews and documentation'] },
  { from: '2023.01', to: '2024.03', company: 'Flibbo', role: 'Senior Backend Developer', place: 'Türkiye', url: 'https://flibbo.com/', points: ['Django/DRF backends: REST APIs, JWT auth, deployments', 'Rebuilt and heavily optimized a multi-level payout system', 'PostgreSQL performance work; mentored two junior Django devs'] },
  { from: '2022.08', to: '2022.11', company: 'DigiNext', role: 'Backend Developer', place: 'Tehran', url: 'https://diginext.ir/', points: ['Python/Django/DRF backends, API testing and docs, frontend integration'] },
  { from: '2021.01', to: '2022.12', company: 'JaccuziWal', role: 'Full-Stack / Backend Developer', place: 'Tehran', points: ['E-commerce startup: products, orders, user management', 'Scalable auth & data processing on PostgreSQL/MySQL'] },
  { from: '2026.05', to: '2026.08', company: 'Kiel — Chagall & Blåvand Eiscafé', role: 'Barkeeper / Barista', place: 'Kiel', side: true, points: ['Side quest after moving to Germany: fast-paced service, German every day'] },
];

export const education = [
  { from: '2026.10', to: '2027.10', name: 'Rheinland Privatschule — Studienkolleg', detail: 'T-Kurs, preparing for the Feststellungsprüfung (FSP)', place: 'Duisburg' },
  { from: '2022.10', to: '2024', name: 'Payam Noor University (PNU)', detail: 'Computer Engineering — 6 semesters, paused by the move to Germany', place: 'Karaj' },
  { from: '2019.09', to: '2022.06', name: 'Molavi Vocational School', detail: 'Diploma, Network & Computer Software — final grade 20/20', place: 'Karaj' },
];

// Credentials used to breach the Blackwall. Scans contain ID numbers, so they are not published; verify on request.
export type Cert = { id: string; name: string; issuer: string; date: string; hours?: number; score?: string; topic: string; verify?: string };
export const certs: Cert[] = [
  { id: 'TIT-HACK', name: 'Hack Pack — OS & Web Pentesting', issuer: 'Tehran Institute of Technology', date: '2021.11', hours: 144, score: '96/100', topic: 'IT security & vulnerability awareness', verify: 'https://mftplus.com' },
  { id: 'TIT-PY', name: 'Programming with Python', issuer: 'Tehran Institute of Technology', date: '2021.02', hours: 60, score: '89/100', topic: 'Python fundamentals', verify: 'https://mftplus.com' },
  { id: 'TIT-DJ', name: 'Python Web Development with Django', issuer: 'Tehran Institute of Technology', date: '2022.04', hours: 50, score: '100/100', topic: 'Django web development', verify: 'https://mftplus.com' },
  { id: 'DGX-Z2H', name: '"Zero to Hero" Summer Bootcamp', issuer: 'DigiNext', date: '2022.09', hours: 70, topic: '50h back/front-end + 20h soft skills', verify: 'https://diginext.ir/' },
  { id: 'MOLAVI', name: 'Vocational Diploma — Network & Computer Software', issuer: 'Molavi Vocational School', date: '2022.06', score: '20/20', topic: 'Networking, software, practical training' },
];

// links: label → url. Empty url = slot reserved (e.g. repo going public soon) and is hidden until filled.
export type Project = { id: string; name: string; year: string; weight: number; color: string; summary: string; story: string; stack: string[]; links: Record<string, string>; stat?: string; role?: string };
export const projects: Project[] = [
  { id: 'flibbo', name: 'Flibbo AI', year: '2024', weight: 1.15, color: '#00f0ff', role: 'Built the entire backend', summary: 'AI video, images and music from one line of text — with a social feed on the other side.', story: 'Flibbo turns one prompt into cinematic AI video, images and copyright-free music using frontier models, then puts it in front of an audience. I designed and built the whole backend: Django/DRF APIs with JWT + Google/Apple login, posts, podcasts and books, real-time chat, points and referrals, an AI studio wrapping OpenAI, Stability, HeyGen, D-ID and Fliki, crypto checkout via Plisio and Firebase push notifications. Live on Google Play and iOS.', stack: ['Django', 'DRF', 'Channels', 'AI APIs', 'Firebase'], links: { 'Google Play': 'https://play.google.com/store/apps/details?id=com.flibbo.app', Website: 'https://flibbo.com/', GitHub: 'https://github.com/hirbodprime/flibbo' }, stat: 'Live on Google Play' },
  { id: 'artonomy', name: 'Artonomy', year: '2025', weight: 0.9, color: '#ff8a3d', role: 'Founder', summary: 'A platform for artists: portfolios, a marketplace and discovery by category.', story: 'My own startup. Artists get a public profile and portfolio, publish art posts, sell products and offer services, and get discovered through a category-based explore section. A spotlight system with stars, referrals and boosts promotes profiles; the site also has homepage ads, support tickets and visit tracking for admins.', stack: ['Django', 'Python', 'PostgreSQL', 'Email verification'], links: { GitHub: 'https://github.com/hirbodprime/artonomy' } },
  { id: 'flhub', name: 'FLHub', year: '2026', weight: 1, color: '#ff2bd6', summary: 'MLM platform with crypto checkout, referral trees and multi-wallet payouts.', story: 'Users buy subscription levels with USDT via Plisio and land in an MPTT referral tree. Multiple wallets per user, bonus + promotion engine, withdrawals, and a simulator to test the reward model without touching real money.', stack: ['Django', 'DRF', 'Celery', 'django-mptt', 'Plisio'], links: { GitHub: 'https://github.com/hirbodprime/flhub' } },
  { id: 'blackjack', name: 'BlackJack Casino Bot', year: '2024', weight: 0.95, color: '#f8e602', summary: 'Django-backed Telegram casino: multiplayer blackjack, horse racing, minigames.', story: 'A full Telegram casino on a Django backend: multiplayer blackjack, horse racing and minigames, player progression, quests, inventory, referrals and an admin control panel. Game rules live in independently tested services. Grew to 200+ active users.', stack: ['Python', 'Django', 'Telegram API', 'PostgreSQL'], links: { GitHub: 'https://github.com/hirbodprime/blackjack' }, stat: '200+ active users' },
  { id: 'jobcollector', name: 'Job Collector', year: '2025', weight: 0.8, color: '#00f0ff', summary: 'Crawlers + Telegram delivery for job postings, scheduled with asyncio.', story: 'Scrapes job boards, normalizes listings and pushes them to Telegram channels on async schedules.', stack: ['Python', 'Django', 'asyncio', 'Telegram'], links: { GitHub: 'https://github.com/hirbodprime/jobcollector' } },
  { id: 'fridays', name: 'Fridays', year: '2026', weight: 0.7, color: '#7cff6b', summary: 'REST backend for a weekly class group: attendance, wallets, tasks.', story: 'Invite-code signup, JWT auth, per-class wallet charging, receipts, attendance history, tasks with deadlines, comments, quotes and video uploads.', stack: ['Django 5', 'DRF', 'JWT'], links: { GitHub: 'https://github.com/hirbodprime/fridays' } },
  { id: 'dobare', name: 'Dobare', year: '2026', weight: 0.6, color: '#ff8a3d', summary: 'Second-hand clothing intake + catalog with QR-linked product stories.', story: '"Dobare" means "again". People submit used clothes with photos; each product gets a story and a public page reachable from a generated QR code.', stack: ['Django', 'SQLite', 'Pillow', 'qrcode'], links: { GitHub: 'https://github.com/hirbodprime/dobare' } },
  { id: 'asmodel', name: 'Asmodel', year: '2022', weight: 0.55, color: '#b48cff', summary: 'Shop web app: catalog, carts, wishlists, accounts, payments.', story: 'An early full e-commerce build — product browsing, carts, wishlists, accounts and payment integration with Redis caching.', stack: ['Django', 'Redis', 'E-commerce'], links: { GitHub: 'https://github.com/hirbodprime/asmodel-webapplication' } },
  { id: 'coinmarketcap', name: 'Django CoinMarketCap', year: '2023', weight: 0.45, color: '#4dd2ff', summary: 'Collects crypto data, coins and logos by symbol.', story: 'A scraper plus Django interface to fetch and serve coin data and logos by symbol.', stack: ['Django', 'Scraping'], links: { GitHub: 'https://github.com/hirbodprime/django-coinmarketcap' } },
  { id: 'deev', name: 'DEEV Studio', year: '2025', weight: 0.6, color: '#b48cff', summary: 'Portfolio site for a video, design and illustration studio.', story: 'Designed and built the web presence for DEEV — a studio for video, design and illustration by Parsa and Pantea.', stack: ['Web', 'Design', 'Deployment'], links: { Website: 'https://deev.studio' } },
  { id: 'kambiz', name: 'Ghesse-Go — Kambiz Aflaki', year: '2025', weight: 0.65, color: '#f8e602', summary: 'Persian storytelling platform: short stories, readings, podcast, gallery and book shop.', story: '"Stories of humans, knowledge, life and history." A full RTL Persian site for author Kambiz Aflaki with short stories, audio readings, a literary podcast, magazine, art gallery and a book store.', stack: ['Django', 'RTL / Persian', 'Audio', 'E-commerce'], links: { Website: 'https://kambizaflaki.com' } },
  { id: 'bigpapa', name: 'Big Papa Games', year: '2026', weight: 0.8, color: '#7cff6b', summary: 'Papa Chop: an HTML5 tree-chopping game launched inside Telegram as a Mini App.', story: 'A visual canvas game at bigpapagames.com/play, launched from @Big_PapaGamesBot as a Telegram Mini App. Original woodland + lumberjack art, server-validated runs and best scores, zero framework dependencies beyond Python 3.12. The root domain is the one-page home of the multi-game brand.', stack: ['Python 3.12', 'HTML5 Canvas', 'Telegram Mini App'], links: { Play: 'https://bigpapagames.com/play', Telegram: 'https://t.me/Big_PapaGamesBot', GitHub: 'https://github.com/hirbodprime/BigPapa' } },
  { id: 'gesture', name: 'Gesture Mouse', year: '2024', weight: 0.4, color: '#ff5470', summary: 'Control the computer with hand gestures and voice.', story: 'Computer-vision mouse control using MediaPipe hand tracking plus a voice assistant — no extra hardware.', stack: ['Python', 'MediaPipe', 'OpenCV'], links: { GitHub: 'https://github.com/hirbodprime/Gesture-Controlled-Virtual-Mouse-main' } },
];

export const tapes = [
  { n: 1, id: 'night-city', title: 'NIGHT CITY', sub: 'about', hint: 'Drag to look around. Four neon signs in the skyline are dead: find them and switch them on. Hold right-click (or Space) to scan things with your Kiroshi optics.' },
  { n: 2, id: 'jacking-in', title: 'JACKING IN', sub: 'skills + experience', hint: 'Drag to look · scroll or W/S to fly · touch a glass orb (or click it) to download the skill · my work history hangs from the great tree: click a lantern, or pick a job from the list.' },
  { n: 3, id: 'blackwall', title: 'THE BLACKWALL', sub: 'certifications', hint: 'Upload daemons with the breach protocol. Each one verifies credentials and cracks the wall.' },
  { n: 4, id: 'deep-space', title: 'DEEP SPACE', sub: 'projects', hint: 'Every planet is a project. Drag to steer, scroll or W/S to fly, click a planet to land and play its footage.' },
  { n: 5, id: 'moon', title: 'THE MOON', sub: 'contact', hint: 'Point the antenna at Earth and hold it there to lock the uplink. Hover the glowing arcs on the globe: famous repos and mine. Then send a transmission.' },
] as const;
