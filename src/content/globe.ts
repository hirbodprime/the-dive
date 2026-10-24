// The Moon's globe (GitHub-homepage style). Famous repos arc from where they started to Duisburg; mine arc out of Tehran and Duisburg.
export type Place = { name: string; lat: number; lng: number; tz?: string };
export const HOME: Place = { name: 'Duisburg', lat: 51.43, lng: 6.76, tz: 'Europe/Berlin' };
export const TEHRAN: Place = { name: 'Tehran', lat: 35.69, lng: 51.39, tz: 'Asia/Tehran' };

export type RepoArc = { repo: string; mine?: boolean; from: Place; to: Place; note: string };
export const arcs: RepoArc[] = [
  { repo: 'torvalds/linux', from: { name: 'Helsinki', lat: 60.17, lng: 24.94 }, to: HOME, note: 'Started by Linus Torvalds at the University of Helsinki, 1991.' },
  { repo: 'git/git', from: { name: 'Portland', lat: 45.52, lng: -122.68 }, to: HOME, note: 'Linus wrote Git in 2005, while living near Portland, Oregon.' },
  { repo: 'python/cpython', from: { name: 'Amsterdam', lat: 52.37, lng: 4.9 }, to: HOME, note: 'Guido van Rossum began Python at CWI in Amsterdam, 1989.' },
  { repo: 'django/django', from: { name: 'Lawrence, KS', lat: 38.97, lng: -95.24 }, to: HOME, note: 'Born in the Lawrence Journal-World newsroom, Kansas, 2003.' },
  { repo: 'facebook/react', from: { name: 'Menlo Park', lat: 37.48, lng: -122.15 }, to: HOME, note: 'Created by Jordan Walke at Facebook, open-sourced in 2013.' },
  { repo: 'redis/redis', from: { name: 'Catania', lat: 37.5, lng: 15.09 }, to: HOME, note: 'Salvatore Sanfilippo wrote Redis in Sicily, 2009.' },
  { repo: 'postgres/postgres', from: { name: 'Berkeley', lat: 37.87, lng: -122.27 }, to: HOME, note: 'Grew out of the POSTGRES project at UC Berkeley, 1986.' },
  { repo: 'hirbodprime/dobare', mine: true, from: TEHRAN, to: HOME, note: 'Built in Tehran, carried to Duisburg.' },
  { repo: 'hirbodprime/jobcollector', mine: true, from: TEHRAN, to: HOME, note: 'Built in Tehran, carried to Duisburg.' },
  { repo: 'hirbodprime/blackjack', mine: true, from: TEHRAN, to: { name: 'Istanbul', lat: 41.01, lng: 28.98 }, note: 'A Telegram bot with hundreds of daily players.' },
  { repo: 'hirbodprime/artonomy', mine: true, from: HOME, to: TEHRAN, note: 'Founded from Duisburg, built with a team in Tehran.' },
];
export const REPOS = arcs.map((a) => a.repo);

// Cities with a live local clock.
export const clocks: Place[] = [HOME, TEHRAN,
  { name: 'London', lat: 51.51, lng: -0.13, tz: 'Europe/London' }, { name: 'New York', lat: 40.71, lng: -74.01, tz: 'America/New_York' },
  { name: 'San Francisco', lat: 37.77, lng: -122.42, tz: 'America/Los_Angeles' }, { name: 'Tokyo', lat: 35.68, lng: 139.69, tz: 'Asia/Tokyo' }];
