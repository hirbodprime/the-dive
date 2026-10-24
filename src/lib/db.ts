import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const dir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
fs.mkdirSync(dir, { recursive: true });

export const db = new Database(path.join(dir, 'dive.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS stars (id INTEGER PRIMARY KEY, name TEXT NOT NULL, message TEXT NOT NULL,
    x REAL, y REAL, z REAL, ip TEXT, approved INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS transmissions (id INTEGER PRIMARY KEY, name TEXT, email TEXT, message TEXT, ip TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP);
`);

// Simple per-IP rate limit backed by the tables themselves.
export function tooMany(table: 'stars' | 'transmissions', ip: string, max: number, minutes: number) {
  const row = db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE ip = ? AND created_at > datetime('now', ?)`).get(ip, `-${minutes} minutes`) as { n: number };
  return row.n >= max;
}

export function clientIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? req.headers.get('x-real-ip') ?? 'local';
}

// Small profanity / spam filter (EN + DE + FA transliterations). Extend as needed.
const BAD = ['fuck', 'shit', 'bitch', 'cunt', 'nigg', 'fag', 'whore', 'slut', 'rape', 'nazi', 'hitler', 'scheiß', 'scheiss', 'hurensohn', 'fotze', 'wichser', 'kos', 'kir', 'jende', 'koskesh', 'http', 'www.', '.com', 'casino', 'viagra', 'crypto'];
export function dirty(s: string) {
  const t = s.toLowerCase().normalize('NFKD').replace(/[0@]/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/\$/g, 's');
  return BAD.some((w) => (w.length <= 4 ? new RegExp(`\\b${w}\\b`).test(t) : t.includes(w)));
}
