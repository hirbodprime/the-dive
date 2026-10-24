import { profile } from '@/content/data';

// Cached proxy: commits pushed in the last 30 days light up the city's windows.
let cache: { at: number; data: unknown } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 3600_000) return Response.json(cache.data);
  try {
    const r = await fetch(`https://api.github.com/users/${profile.githubUser}/events/public?per_page=100`, {
      headers: { accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
    });
    const events = (await r.json()) as { type: string; created_at: string; repo: { name: string }; payload: { size?: number; commits?: unknown[] } }[];
    const since = Date.now() - 30 * 864e5;
    const pushes = events.filter((e) => e.type === 'PushEvent' && Date.parse(e.created_at) > since);
    const data = { commits: pushes.reduce((n, e) => n + (e.payload.size ?? e.payload.commits?.length ?? 1), 0), latest: pushes[0]?.repo.name ?? null };
    cache = { at: Date.now(), data };
    return Response.json(data);
  } catch {
    return Response.json({ commits: 30, latest: null });
  }
}
