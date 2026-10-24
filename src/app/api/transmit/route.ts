import { db, tooMany, clientIp } from '@/lib/db';

export async function POST(req: Request) {
  const ip = clientIp(req);
  const b = await req.json().catch(() => ({}));
  if (b.website) return Response.json({ ok: true }); // honeypot: pretend success
  const name = String(b.name ?? '').trim().slice(0, 80), email = String(b.email ?? '').trim().slice(0, 120), message = String(b.message ?? '').trim().slice(0, 3000);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !message) return Response.json({ error: 'invalid' }, { status: 400 });
  if (tooMany('transmissions', ip, 5, 60)) return Response.json({ error: 'slow down' }, { status: 429 });
  db.prepare('INSERT INTO transmissions (name, email, message, ip) VALUES (?, ?, ?, ?)').run(name, email, message, ip);
  // Optional instant notification: set NOTIFY_WEBHOOK (e.g. a Telegram bot sendMessage URL or Discord webhook).
  if (process.env.NOTIFY_WEBHOOK) {
    fetch(process.env.NOTIFY_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: `📡 ${name} <${email}>\n${message}`, content: `📡 ${name} <${email}>\n${message}` }) }).catch(() => {});
  }
  return Response.json({ ok: true });
}
