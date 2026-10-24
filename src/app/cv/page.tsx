import type { Metadata } from 'next';
import { profile, experience, education, skills, certs, projects } from '@/content/data';
import { PrintButton } from './PrintButton';
import './cv.css';

export const metadata: Metadata = {
  title: `${profile.name} — CV`,
  description: `CV of ${profile.name}, ${profile.role}, based in ${profile.location}.`,
};

// ⏏ EJECT: the recruiter fast lane. A classic tabular CV (dates left, photo top right) in English:
// no 3D, real text for ATS parsers, prints to A4 in two pages.
const SITE = 'hirbodaflaki.com';
const date = (d: string) => (d.includes('.') ? `${d.slice(5)}/${d.slice(0, 4)}` : d);
const range = (from: string, to: string) => `${date(from)} – ${date(to)}`;
const host = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const GROUPS: Record<string, string> = { CORE: 'Backend', DATA: 'Data', SYSTEMS: 'Systems & tooling', FRONT: 'Frontend', HUMAN: 'Ways of working' };

const jobs = experience.filter((j) => !j.side).sort((a, b) => b.from.localeCompare(a.from));
const sideJobs = experience.filter((j) => j.side);
const featured = projects.slice(0, 5).sort((a, b) => b.year.localeCompare(a.year));

const jsonLd = {
  '@context': 'https://schema.org', '@type': 'Person', name: profile.name, jobTitle: 'Backend Software Engineer',
  email: `mailto:${profile.email}`, url: `https://${SITE}`, image: `https://${SITE}/cv-photo.jpg`,
  address: { '@type': 'PostalAddress', addressLocality: 'Duisburg', addressCountry: 'DE' },
  sameAs: [profile.github, profile.linkedin], knowsLanguage: ['fa', 'en', 'de'],
};

function Row({ when, children }: { when: string; children: React.ReactNode }) {
  return <div className="cv-row"><div className="cv-when">{when}</div><div className="cv-what">{children}</div></div>;
}

export default function CV() {
  return (
    <div className="cv-page">
      <nav className="cv-nav" aria-label="CV actions">
        <a href="/">← Back to the portfolio</a>
        <PrintButton />
      </nav>

      <article className="cv">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <header className="cv-head">
          <div>
            <h1>{profile.name}</h1>
            <p className="cv-title">Backend Software Engineer · Python / Django</p>
            <ul className="cv-contact">
              <li>{profile.location}</li>
              <li><a href={`mailto:${profile.email}`}>{profile.email}</a></li>
              <li><a href={`https://${SITE}`}>{SITE}</a></li>
              <li><a href={profile.linkedin}>linkedin.com/in/hirbodprime</a></li>
              <li><a href={profile.github}>github.com/{profile.githubUser}</a></li>
            </ul>
          </div>
          <img className="cv-photo" src="/cv-photo.jpg" alt={`Portrait of ${profile.name}`} width={140} height={180} />
        </header>

        <section>
          <h2>Profile</h2>
          <p className="cv-summary">
            Backend engineer with 4+ years of experience building and running production web applications and REST APIs in
            Python and Django: API design, JWT authentication, PostgreSQL performance tuning, background processing with
            Celery/Redis and Telegram integrations. Built the complete backend of Flibbo AI (live on Google Play and iOS) and
            mentored junior developers. Based in Germany since 2026, German at certified B1 level and improving daily.
          </p>
        </section>

        <section>
          <h2>Professional experience</h2>
          {jobs.map((j) => (
            <Row key={j.company + j.from} when={range(j.from, j.to)}>
              <h3>{j.role}</h3>
              <p className="cv-org">{j.url ? <a href={j.url}>{j.company}</a> : j.company}<span> · {j.place}</span></p>
              <ul>{j.points.map((p) => <li key={p}>{p}</li>)}</ul>
            </Row>
          ))}
        </section>

        <section>
          <h2>Education</h2>
          {[...education].sort((a, b) => b.from.localeCompare(a.from)).map((e) => (
            <Row key={e.name} when={range(e.from, e.to)}>
              <h3>{e.name}</h3>
              <p className="cv-org">{e.detail}<span> · {e.place}</span></p>
            </Row>
          ))}
        </section>

        <section>
          <h2>Skills</h2>
          <dl className="cv-skills">
            {skills.map((g) => (
              <div key={g.group}><dt>{GROUPS[g.group] ?? g.group}</dt><dd>{g.items.map((s) => s.name).join(' · ')}</dd></div>
            ))}
          </dl>
        </section>

        <section>
          <h2>Languages</h2>
          <dl className="cv-skills">
            {profile.languages.map((l) => <div key={l.name}><dt>{l.name}</dt><dd>{l.level}</dd></div>)}
          </dl>
        </section>

        <section>
          <h2>Selected projects</h2>
          {featured.map((p) => {
            const link = p.links.Website || p.links.GitHub || Object.values(p.links).find(Boolean);
            return (
              <Row key={p.id} when={p.year}>
                <h3>{p.name}{link && <a className="cv-link" href={link}>{host(link)}</a>}</h3>
                <p>{p.summary} <span className="cv-stack">{p.stack.join(' · ')}</span></p>
              </Row>
            );
          })}
          <Row when="2026">
            <h3>The Dive — this portfolio<a className="cv-link" href={profile.source}>{host(profile.source)}</a></h3>
            <p>Interactive real-time 3D portfolio (Next.js, React Three Fiber, custom GLSL shaders), open source under MIT, self-hosted on a Linux VPS with CI/CD.</p>
          </Row>
        </section>

        <section>
          <h2>Certifications</h2>
          {[...certs].sort((a, b) => b.date.localeCompare(a.date)).map((c) => (
            <Row key={c.id} when={date(c.date)}>
              <h3>{c.name}</h3>
              <p className="cv-org">{c.issuer}<span>{[c.hours && ` · ${c.hours} h`, c.score && ` · score ${c.score}`].filter(Boolean).join('')}</span></p>
            </Row>
          ))}
        </section>

        {sideJobs.length > 0 && (
          <section>
            <h2>Other experience</h2>
            {sideJobs.map((j) => (
              <Row key={j.company} when={range(j.from, j.to)}>
                <h3>{j.role}</h3>
                <p className="cv-org">{j.company}<span> · {j.place}</span></p>
              </Row>
            ))}
          </section>
        )}

        <footer className="cv-foot">References and certificate copies available on request · Interactive portfolio: <a href={`https://${SITE}`}>{SITE}</a></footer>
      </article>
    </div>
  );
}
