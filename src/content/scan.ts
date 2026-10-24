// Kiroshi scanner (Night City). Props are real CC0 models from Poly Haven, towers are the real ones in the panorama.
// `t` = horizontal position in the panorama image (0–1), `top` / `w` = elevation of its top and width, in degrees.
export type Scannable = {
  id: string; name: string; kind: string; threat: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';
  lines: [string, string][];
  model?: string; at?: [number, number]; y?: number; rot?: number; scale?: number;   // props: [yaw, distance] from you
  t?: number; top?: number; w?: number;                                            // panorama towers
};

export const scannables: Scannable[] = [
  { id: 'rat', name: 'Street rat', kind: 'CREATURE · Rattus norvegicus', threat: 'LOW', model: 'street_rat', at: [-1.45, 2.6], scale: 2.2,
    lines: [['Status', 'Foraging. Unbothered by you.'], ['Network', 'None. Lucky rat.'], ['Note', 'Has survived more prod incidents than most servers.']] },
  { id: 'cat', name: 'Concrete cat', kind: 'STATUE · CAST CONCRETE', threat: 'NONE', model: 'concrete_cat_statue', at: [-0.62, 3.3], rot: 2.4, scale: 1.7,
    lines: [['Owner', 'Unregistered'], ['Behaviour', 'Judging you silently'], ['Uptime', '100 %. Never needed a restart.']] },
  { id: 'hydrant', name: 'Fire hydrant', kind: 'CITY INFRASTRUCTURE', threat: 'NONE', model: 'fire_hydrant', at: [-1.12, 4.2], rot: 0.6,
    lines: [['Pressure', '5.2 bar, nominal'], ['Maintainer', 'District utilities'], ['Last inspection', 'Overdue by 3 years']] },
  { id: 'lamp', name: 'Street lamp', kind: 'CITY INFRASTRUCTURE', threat: 'NONE', model: 'street_lamp_01', at: [-0.95, 6.5], rot: -0.9,
    lines: [['Power draw', '120 W, LED retrofit'], ['Grid', 'Sector 4 · online'], ['Note', 'The camera on top is not the city’s.']] },
  { id: 'camera', name: 'Security camera', kind: 'DEVICE · SURVEILLANCE', threat: 'MODERATE', model: 'security_camera_01', at: [-0.95, 6.15], y: 3.2, rot: 2.3, scale: 1.8,
    lines: [['Feed', 'Encrypted, unknown endpoint'], ['Resolution', '1080p @ 15 fps'], ['Recommendation', 'Smile. Then patch your firmware.']] },
  { id: 'car', name: 'Covered car', kind: 'VEHICLE · UNREGISTERED', threat: 'LOW', model: 'covered_car', at: [-0.35, 10], rot: 1.2,
    lines: [['Plate', 'Hidden under tarp'], ['Parked', '41 days, never moved'], ['Owner', 'Records wiped']] },
  { id: 'payphone', name: 'Public payphone', kind: 'DEVICE · LEGACY TELECOM', threat: 'NONE', model: 'korean_public_payphone_01', at: [0.25, 4.8], rot: -0.4, scale: 1.4,
    lines: [['Line', 'Dead since 2009'], ['Firmware', 'None. Pure hardware.'], ['Note', 'Netrunners still love an air gap.']] },
  { id: 'aircon', name: 'Aircon unit', kind: 'APPLIANCE · HVAC', threat: 'NONE', model: 'exterior_aircon_unit', at: [0.62, 5.6], y: 0.32, rot: -0.6,
    lines: [['Load', '87 %, running hot'], ['Refrigerant', 'R-32'], ['Note', 'Like a server room fan, but outside.']] },
  { id: 'trash', name: 'Trash can', kind: 'CITY INFRASTRUCTURE', threat: 'NONE', model: 'metal_trash_can', at: [1.05, 5.2], rot: -1.1,
    lines: [['Fill level', '96 %'], ['Contents', 'Noodle boxes, one shard'], ['Note', 'Garbage collection is not automatic here.']] },
  { id: 'pearl', name: 'Oriental Pearl Tower', kind: 'BUILDING · TV & RADIO TOWER', threat: 'NONE', t: 0.5875, top: 27, w: 2.6,
    lines: [['Height', '468 m'], ['Completed', '1994'], ['Function', 'Broadcasting, observation decks']] },
  { id: 'jinmao', name: 'Jin Mao Tower', kind: 'BUILDING · SKYSCRAPER', threat: 'NONE', t: 0.631, top: 12.5, w: 2.2,
    lines: [['Height', '420.5 m'], ['Completed', '1999'], ['Floors', '88: a lucky number in Chinese culture']] },
  { id: 'swfc', name: 'Shanghai World Financial Center', kind: 'BUILDING · SKYSCRAPER', threat: 'NONE', t: 0.645, top: 15.2, w: 2.2,
    lines: [['Height', '492 m'], ['Completed', '2008'], ['Nickname', '“The bottle opener”']] },
  { id: 'shanghai', name: 'Shanghai Tower', kind: 'BUILDING · MEGATALL', threat: 'NONE', t: 0.661, top: 21.5, w: 2.6,
    lines: [['Height', '632 m, tallest in China'], ['Completed', '2015'], ['Twist', 'Rotates ~120° top to bottom to cut wind load']] },
  { id: 'sassoon', name: 'Sassoon House', kind: 'BUILDING · ART DECO HOTEL', threat: 'NONE', t: 0.9825, top: 35, w: 5,
    lines: [['Height', '77 m'], ['Completed', '1929'], ['Today', 'The Fairmont Peace Hotel']] },
];

export const facts = [
  'The first computer “bug” was a real moth, taped into the Harvard Mark II logbook in 1947.',
  'Python is named after Monty Python’s Flying Circus, not the snake.',
  'Django is named after the jazz guitarist Django Reinhardt.',
  'Redis stands for REmote DIctionary Server.',
  'Linus Torvalds started Git in April 2005, and within days Git was tracking its own source code.',
  'Brendan Eich wrote the first version of JavaScript in about 10 days in 1995.',
  'Ada Lovelace published the first algorithm meant for a machine in 1843, for computing Bernoulli numbers.',
  'In IEEE 754 floating point, NaN is not equal to itself.',
  '0.1 + 0.2 === 0.30000000000000004 in JavaScript and Python, because of binary floating point.',
  'HTTP 418 “I’m a teapot” comes from an April Fools’ RFC (2324) from 1998.',
  'Type `import this` in Python to get The Zen of Python by Tim Peters.',
  'Python’s sort() uses Timsort, which Tim Peters designed in 2002.',
  'SQL started out at IBM as SEQUEL and was renamed because of a trademark clash.',
  'Linux was announced on 25 August 1991 as “just a hobby, won’t be big and professional”.',
  'PostgreSQL grew out of the POSTGRES project that Michael Stonebraker started at UC Berkeley in 1986.',
  'Signed 32-bit Unix time overflows on 19 January 2038, the “Y2038 problem”.',
  'The first website, info.cern.ch, was put online by Tim Berners-Lee in 1991.',
  'Kubernetes is Greek for “helmsman”, which is why its logo is a ship’s wheel.',
  'Docker was first shown to the public in a lightning talk at PyCon 2013.',
  '“Hello, world” first appeared in Brian Kernighan’s 1972 tutorial for the B language.',
];
