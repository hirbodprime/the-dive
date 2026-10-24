export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json({ ok: true, uptime: Math.round(process.uptime()), t: Date.now() });
}
