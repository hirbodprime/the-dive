import type { Metadata } from 'next';
import { profile, experience, education, skills, certs, projects } from '@/content/data';
import { PrintButton } from './PrintButton';
import './cv.css';

export const metadata: Metadata = { title: `${profile.name} — CV` };

// ⏏ EJECT: the recruiter fast lane. No 3D, no effects, prints cleanly to A4.
export default function CV() {
  return (
    <div className="cv">
      <nav className="cv-nav"><a href="/">◀ back to the tape</a><PrintButton /></nav>
      <header>
        <img src="/me.jpg" alt={profile.name} width={120} height={120} />
        <div>
          <h1>{profile.name}</h1>
          <p className="role">{profile.role}</p>
          <p className="meta">{profile.location} · <a href={`mailto:${profile.email}`}>{profile.email}</a> · <a href={profile.github}>github.com/{profile.githubUser}</a> · <a href={profile.linkedin}>linkedin.com/in/hirbodprime</a></p>
        </div>
      </header>
      <section><h2>Profile</h2><p>Backend Software Engineer (Python/Django) with 4+ years building scalable web applications and REST APIs — API design, JWT authentication, PostgreSQL performance, Celery/Redis and Telegram integrations. Built the complete backend of Flibbo AI (live on Google Play). Now based in Germany.</p></section>
      <section><h2>Experience</h2>
        {experience.map((j) => (
          <div key={j.company + j.from} className="item">
            <div className="row"><strong>{j.role} — {j.company}</strong><span>{j.from.replace('.', '/')} – {j.to.replace('.', '/')} · {j.place}</span></div>
            <ul>{j.points.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        ))}
      </section>
      <section><h2>Selected projects</h2>
        {projects.slice(0, 8).map((p) => (
          <div key={p.id} className="item">
            <div className="row"><strong>{p.name}</strong><span>{p.stack.join(' · ')}</span></div>
            <p>{p.summary} {Object.entries(p.links).filter(([, u]) => u).map(([k, u]) => <a key={k} href={u}>{k}</a>).reduce<React.ReactNode[]>((a, l, i) => (i ? [...a, ' · ', l] : [l]), [])}</p>
          </div>
        ))}
      </section>
      <div className="cols">
        <section><h2>Skills</h2>{skills.map((g) => <p key={g.group}><strong>{g.group[0] + g.group.slice(1).toLowerCase()}:</strong> {g.items.map((s) => s.name).join(', ')}</p>)}</section>
        <section><h2>Languages</h2>{profile.languages.map((l) => <p key={l.name}><strong>{l.name}:</strong> {l.level}</p>)}</section>
      </div>
      <section><h2>Education</h2>{education.map((e) => <div key={e.name} className="row"><span><strong>{e.name}</strong> — {e.detail}</span><span>{e.from.replace('.', '/')} – {e.to.replace('.', '/')}</span></div>)}</section>
      <section><h2>Certifications</h2>{certs.map((c) => <div key={c.id} className="row"><span><strong>{c.name}</strong> — {c.issuer}{c.hours ? `, ${c.hours}h` : ''}{c.score ? `, ${c.score}` : ''}</span><span>{c.date.replace('.', '/')}</span></div>)}</section>
    </div>
  );
}
