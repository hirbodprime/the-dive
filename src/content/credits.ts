// Third-party assets used on the site. Shown in the CREDITS roll (HUD ⚙ → Credits, and at the end of the tape).
export type Credit = { what: string; title: string; author: string; license: string; url: string; where: string };
export const credits: Credit[] = [
  { what: 'Panorama', title: 'Shanghai Bund (HDRI)', author: 'Greg Zaal / Poly Haven', license: 'CC0', url: 'https://polyhaven.com/a/shanghai_bund', where: 'Night City skyline' },
  { what: 'Texture', title: 'Aerial Rocks 02', author: 'Poly Haven', license: 'CC0', url: 'https://polyhaven.com/a/aerial_rocks_02', where: 'Moon surface' },
  { what: '3D models', title: 'Street Rat, Concrete Cat Statue, Fire Hydrant, Street Lamp 01, Security Camera 01, Korean Public Payphone 01, Exterior Aircon Unit, Covered Car, Metal Trash Can', author: 'Poly Haven', license: 'CC0', url: 'https://polyhaven.com/models', where: 'Night City scanner props' },
  { what: '3D model', title: 'Island Tree 01', author: 'Poly Haven', license: 'CC0', url: 'https://polyhaven.com/a/island_tree_01', where: 'The tree of life in the Net' },
  { what: 'Textures', title: 'Planet, Sun, Earth & Milky Way maps', author: 'Solar System Scope (INOVE)', license: 'CC BY 4.0', url: 'https://www.solarsystemscope.com/textures/', where: 'Deep Space, the Moon' },
  { what: '3D model', title: 'Michelle (character + rig)', author: 'Adobe Mixamo, via the three.js examples', license: 'Mixamo license (royalty-free use in projects)', url: 'https://www.mixamo.com/', where: 'The netrunner beyond the Blackwall' },
  { what: 'Music', title: 'Digital Lemonade', author: 'Kevin MacLeod (incompetech.com)', license: 'CC BY 4.0', url: 'https://incompetech.com/', where: 'Tape 01 · Night City' },
  { what: 'Music', title: 'Cyborg Ninja', author: 'Kevin MacLeod (incompetech.com)', license: 'CC BY 4.0', url: 'https://incompetech.com/', where: 'Tape 02 · Jacking In' },
  { what: 'Music', title: 'Dark Fog', author: 'Kevin MacLeod (incompetech.com)', license: 'CC BY 4.0', url: 'https://incompetech.com/', where: 'Tape 03 · The Blackwall' },
  { what: 'Music', title: 'Deep Haze', author: 'Kevin MacLeod (incompetech.com)', license: 'CC BY 4.0', url: 'https://incompetech.com/', where: 'Tape 04 · Deep Space' },
  { what: 'Music', title: 'Ether Vox', author: 'Kevin MacLeod (incompetech.com)', license: 'CC BY 4.0', url: 'https://incompetech.com/', where: 'Tape 05 · The Moon' },
  { what: 'Icons', title: 'Python, Django, Redis, PostgreSQL, Celery, Docker, Linux, Git, Bash, JavaScript, Tailwind, Vue, MySQL, JWT logos', author: 'Simple Icons', license: 'CC0 (logos remain trademarks of their owners)', url: 'https://simpleicons.org/', where: 'Neon Snake food' },
  { what: 'Library', title: 'three-globe', author: 'Vasco Asturiano', license: 'MIT', url: 'https://github.com/vasturiano/three-globe', where: 'The GitHub-style globe on the Moon' },
  { what: 'Data', title: 'Admin 0 Countries (110m)', author: 'Natural Earth', license: 'Public domain', url: 'https://www.naturalearthdata.com/', where: 'Globe land dots' },
  { what: 'Textures', title: 'Saturn ring, Earth normal & specular maps', author: 'Solar System Scope (INOVE)', license: 'CC BY 4.0', url: 'https://www.solarsystemscope.com/textures/', where: 'Deep Space' },
  { what: 'Fonts', title: 'Inter, Chakra Petch, VT323, Permanent Marker', author: 'Google Fonts authors', license: 'SIL Open Font License', url: 'https://fonts.google.com/', where: 'Everywhere' },
];
