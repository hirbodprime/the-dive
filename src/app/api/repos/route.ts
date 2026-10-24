import { REPOS } from '@/content/globe';

// Stars + description for the repos on the Moon's globe. Fixed list (no user input), cached for an hour.
type Repo = { stars: number; description: string | null; language: string | null };
let cache: { at: number; data: Record<string, Repo> } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 3600_000) return Response.json(cache.data);
  const headers = { accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
  const data: Record<string, Repo> = {};
  await Promise.all(REPOS.map(async (name) => {
    try {
      const r = await fetch(`https://api.github.com/repos/${name}`, { headers });
      if (!r.ok) return;
      const j = (await r.json()) as { stargazers_count: number; description: string | null; language: string | null };
      data[name] = { stars: j.stargazers_count, description: j.description, language: j.language };
    } catch { /* offline or rate-limited: the card falls back to the note */ }
  }));
  if (Object.keys(data).length) cache = { at: Date.now(), data };
  return Response.json(data);
}
