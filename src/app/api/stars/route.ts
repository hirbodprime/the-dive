import { db, tooMany, clientIp, dirty } from '@/lib/db';

export const dynamic = 'force-dynamic';

export function GET() {
  const rows = db.prepare('SELECT id, name, message, x, y, z, created_at FROM stars WHERE approved = 1 ORDER BY id DESC LIMIT 400').all();
  return Response.json(rows);
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim().slice(0, 24), message = String(body.message ?? '').trim().slice(0, 120);
  if (body.website) return Response.json({ error: 'nope' }, { status: 400 }); // honeypot
  if (!name || !message) return Response.json({ error: 'Name and message are required.' }, { status: 400 });
  if (dirty(name) || dirty(message)) return Response.json({ error: 'The galaxy rejected that message. Keep it friendly (and link-free).' }, { status: 422 });
  if (tooMany('stars', ip, 3, 60 * 24)) return Response.json({ error: 'You already lit 3 stars today.' }, { status: 429 });
  // place the star somewhere in the project field
  const a = Math.random() * Math.PI * 2, d = 15 + Math.random() * 60;
  const x = Math.cos(a) * d, y = (Math.random() - 0.5) * 30, z = -Math.random() * 90;
  const r = db.prepare('INSERT INTO stars (name, message, x, y, z, ip) VALUES (?, ?, ?, ?, ?, ?)').run(name, message, x, y, z, ip);
  return Response.json({ id: Number(r.lastInsertRowid), name, message, x, y, z, created_at: new Date().toISOString() });
}
