'use client';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { profile, skills, experience, education, certs, projects, tapes } from '@/content/data';
import { scannables, facts } from '@/content/scan';
import { arcs } from '@/content/globe';
import { Snake } from './Snake';
import { live, useStore, toast, visitorBus, type VisitorStar } from '@/lib/store';
import { blip, denied } from '@/lib/audio';
import { go, next, prev, rewind } from './Dive';
import { thrust } from './scenes/controls';

const skillCount = skills.reduce((n, g) => n + g.items.length, 0);

/* ───────── shared bits ───────── */
function DiveHeader() {
  const dive = useStore((s) => s.dive);
  const t = tapes[dive];
  return (
    <header className="dive-header" key={dive}>
      <span className="dh-no">TAPE 0{t.n}</span>
      <h2>{t.title}</h2>
      <span className="dh-sub">{t.sub}</span>
      <p className="dh-hint">{t.hint}</p>
    </header>
  );
}

function DiveNav() {
  const dive = useStore((s) => s.dive), set = useStore((s) => s.set);
  return (
    <nav className="dive-nav" aria-label="Dives">
      <button onClick={prev} className="dn-side">◀ {tapes[(dive + 4) % 5].title}</button>
      <button onClick={() => set({ reading: true })} className="dn-read">☰ Read it all</button>
      {dive < 4
        ? <button onClick={next} className="dn-side dn-next">Dive deeper: {tapes[dive + 1].title} ▶</button>
        : <button onClick={rewind} className="dn-side dn-next">⏪ Rewind tape</button>}
    </nav>
  );
}

function Thrusters() {
  return (
    <div className="thrusters" aria-hidden>
      <button onPointerDown={() => thrust(1)}>▲</button>
      <button onPointerDown={() => thrust(-1)}>▼</button>
    </div>
  );
}

function Counter({ label, n, of, color }: { label: string; n: number; of: number; color?: string }) {
  return (
    <div className={`counter-chip ${n === of ? 'done' : ''}`} style={color ? { ['--c' as string]: color } : undefined}>
      <span>{label}</span><b>{n}/{of}</b>
      <i style={{ width: `${(n / of) * 100}%` }} />
    </div>
  );
}

/* ───────── readable content (drawer + SEO copy) ───────── */
function ReadAbout() {
  return (
    <>
      {profile.billboards.map((b) => <section key={b.title}><h4>{b.title}</h4><p>{b.body}</p></section>)}
      <h3>Languages</h3>
      <ul>{profile.languages.map((l) => <li key={l.name}><strong>{l.name}</strong> — {l.level}</li>)}</ul>
      <h3>Education</h3>
      <ul>{education.map((e) => <li key={e.name}><span className="when">{e.from} – {e.to}</span> <strong>{e.name}</strong><br /><span className="dim">{e.detail} · {e.place}</span></li>)}</ul>
    </>
  );
}
function ReadSkills() {
  return (
    <>
      <h3>Skills</h3>
      <div className="read-skills">
        {skills.map((g) => (
          <div key={g.group} style={{ ['--c' as string]: g.color }}>
            <h4>{g.group}</h4>
            {g.items.map((s) => <div key={s.name} className="bar"><span>{s.name}</span><i style={{ width: `${s.level * 100}%` }} /></div>)}
          </div>
        ))}
      </div>
      <h3>Experience</h3>
      <ol className="read-logs">
        {experience.map((j) => (
          <li key={j.company + j.from}>
            <span className="when">{j.from} – {j.to}{j.side ? ' · side quest' : ''}</span>
            <strong>{j.url ? <a href={j.url} target="_blank" rel="noreferrer">{j.company}</a> : j.company}</strong> — {j.role} · {j.place}
            <ul>{j.points.map((p) => <li key={p}>{p}</li>)}</ul>
          </li>
        ))}
      </ol>
    </>
  );
}
function ReadCerts() {
  return (
    <>
      <h3>Certifications</h3>
      <ul className="read-certs">
        {certs.map((c) => (
          <li key={c.id}>
            <strong>{c.name}</strong><br />
            <span className="dim">{c.issuer} · {c.date}{c.hours ? ` · ${c.hours}h` : ''}{c.score ? ` · score ${c.score}` : ''}</span><br />
            {c.topic}{c.verify && <> · <a href={c.verify} target="_blank" rel="noreferrer">verify ↗</a></>}
          </li>
        ))}
      </ul>
      <p className="dim">Original certificates (with officially certified German translations) available on request.</p>
    </>
  );
}
function ReadProjects() {
  const set = useStore((s) => s.set);
  return (
    <>
      <h3>Projects</h3>
      {projects.map((p) => (
        <article key={p.id} className="read-project" style={{ ['--c' as string]: p.color }}>
          <h4>{p.name} <span className="dim">· {p.year}</span></h4>
          {p.role && <span className="tag">{p.role}</span>} {p.stat && <span className="tag ok">{p.stat}</span>}
          <p>{p.story}</p>
          <p className="stack">{p.stack.join(' · ')}</p>
          <p className="links">
            {Object.entries(p.links).filter(([, u]) => u).map(([k, u]) => <a key={k} href={u} target="_blank" rel="noreferrer">{k} ↗</a>)}
            <button className="link-btn" onClick={() => { set({ reading: false }); go(3); setTimeout(() => set({ project: p.id }), 80); }}>fly there →</button>
          </p>
        </article>
      ))}
    </>
  );
}
function ContactLinks() {
  return (
    <div className="contact-links">
      <a href={`mailto:${profile.email}`}>✉ {profile.email}</a>
      <a href={profile.linkedin} target="_blank" rel="noreferrer">in LinkedIn</a>
      <a href={profile.github} target="_blank" rel="noreferrer">⌥ GitHub</a>
      <a href="/cv">⏏ CV (print / PDF)</a>
    </div>
  );
}

const READ = [
  { title: 'About me', body: <ReadAbout /> },
  { title: 'Skills & experience', body: <ReadSkills /> },
  { title: 'Certifications', body: <ReadCerts /> },
  { title: 'Projects', body: <ReadProjects /> },
  { title: 'Contact', body: <><h3>Get in touch</h3><ContactLinks /></> },
];

export function Drawer() {
  const { reading, dive, set } = useStore();
  if (!reading) return null;
  return (
    <aside className="drawer" role="dialog" aria-label={READ[dive].title}>
      <div className="drawer-top"><span>TAPE 0{dive + 1} · TRANSCRIPT</span><button onClick={() => set({ reading: false })} aria-label="Close">✕</button></div>
      <h2>{READ[dive].title}</h2>
      {READ[dive].body}
    </aside>
  );
}

// Full text for search engines and screen readers — the 3D is decoration on top of this.
export function SeoContent() {
  return (
    <div className="sr-only">
      <h1>{profile.name} — {profile.role}</h1>
      <p>{profile.location}. {profile.tagline}</p>
      {READ.map((r) => <section key={r.title}><h2>{r.title}</h2>{r.body}</section>)}
    </div>
  );
}

/* ───────── TAPE 01 · Night City ───────── */
function Hero() {
  const set = useStore((s) => s.set);
  let i = 0;
  return (
    <div className="hero">
      <p className="hero-kicker">TAPE 01 · NIGHT CITY</p>
      <p className="hero-name" aria-hidden>
        {profile.name.toUpperCase().split(' ').map((w) => (
          <span key={w} className="word">{w.split('').map((c) => { i++; return <span key={i} style={{ animationDelay: `${0.3 + i * 0.06}s` }} className={i % 7 === 3 ? 'flicker' : ''}>{c}</span>; })}</span>
        ))}
      </p>
      <p className="hero-role">{profile.role}</p>
      <p className="hero-loc">📍 {profile.location}</p>
      <div className="hero-cta">
        <button className="btn primary" onClick={next}>▶ Start the dive</button>
        <button className="btn" onClick={() => set({ reading: true })}>About me</button>
        <a className="btn ghost" href="/cv">⏏ Recruiter fast lane</a>
      </div>
      <a className="hero-src" href={profile.source} target="_blank" rel="noopener">
        <span className="hs-tag">◉ OPEN SOURCE</span>
        <span className="hs-cmd"><b>$</b> git clone {profile.source.replace('https://', '')}<i aria-hidden>▮</i></span>
        <span className="hs-meta">MIT · every shader, scene &amp; daemon · fork the code, not the runner ↗</span>
      </a>
    </div>
  );
}
function SignCard() {
  const sign = useStore((s) => s.sign), set = useStore((s) => s.set);
  const b = profile.billboards.find((x) => x.title === sign);
  if (!b) return null;
  return (
    <div className="card sign-card" key={b.title}>
      <div className="card-top"><b>◉ {b.title}</b><button onClick={() => set({ sign: null })} aria-label="Close">✕</button></div>
      <p>{b.body}</p>
    </div>
  );
}
// Kiroshi optics overlay + the readout of whatever you scanned, with a random programming fact.
function Scanner() {
  const scanning = useStore((s) => s.scanning), id = useStore((s) => s.scan), set = useStore((s) => s.set);
  const o = scannables.find((x) => x.id === id);
  const fact = useMemo(() => (id ? facts[Math.floor(Math.random() * facts.length)] : ''), [id]);
  return (
    <>
      {scanning && (
        <div className="scanner" aria-hidden>
          <i className="sc-corner tl" /><i className="sc-corner tr" /><i className="sc-corner bl" /><i className="sc-corner br" />
          <div className="sc-sweep" />
          <p className="sc-tag">KIROSHI OPTICS · SCAN MODE{o ? '' : ' · point at something'}</p>
        </div>
      )}
      {o && (
        <div className={`card scan-card t-${o.threat.toLowerCase()}`} key={o.id} aria-live="polite">
          <div className="card-top"><b>◎ SCAN COMPLETE</b><button onClick={() => set({ scan: null })} aria-label="Close">✕</button></div>
          <h3>{o.name}</h3>
          <p className="dim">{o.kind}</p>
          <dl>
            <dt>Threat</dt><dd className="threat">{o.threat}</dd>
            {o.lines.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}
          </dl>
          <p className="fact"><b>// DID YOU KNOW</b>{fact}</p>
        </div>
      )}
    </>
  );
}
function CityUI() {
  const lit = useStore((s) => s.signs.length), scanned = useStore((s) => s.scanned.length), scanning = useStore((s) => s.scanning), set = useStore((s) => s.set);
  return (
    <>
      <Hero />
      <div className="dive-tools">
        <Counter label="NEON SIGNS LIT" n={lit} of={profile.billboards.length} color="#ff2bd6" />
        <Counter label="OBJECTS SCANNED" n={scanned} of={scannables.length} color="#ff6a1a" />
        <button className={`btn scan-btn ${scanning ? 'on' : ''}`} onClick={() => set({ scanning: !scanning })}>◎ {scanning ? 'Scanning…' : 'Scan'} <kbd>hold right-click / space</kbd></button>
      </div>
      <Scanner />
      <SignCard />
      <Snake />
    </>
  );
}

/* ───────── TAPE 02 · the Net ───────── */
function LogCard() {
  const id = useStore((s) => s.log), set = useStore((s) => s.set);
  const j = experience.find((x) => x.company + x.from === id);
  if (!j) return null;
  return (
    <div className="card log-card" key={id}>
      <div className="card-top"><b className="ok">[{j.from} – {j.to}] {j.side ? 'SIDE QUEST' : 'ACCESS GRANTED'}</b><button onClick={() => set({ log: null })} aria-label="Close">✕</button></div>
      <h3>{j.url ? <a href={j.url} target="_blank" rel="noreferrer">{j.company} ↗</a> : j.company}</h3>
      <p className="dim">{j.role} · {j.place}</p>
      <ul>{j.points.map((p) => <li key={p}>{p}</li>)}</ul>
    </div>
  );
}
function NetUI() {
  const got = useStore((s) => s.collected), set = useStore((s) => s.set);
  return (
    <>
      <DiveHeader />
      <div className="dive-tools">
        <Counter label="DATA DOWNLOADED" n={got.length} of={skillCount} color="#00f0ff" />
        <ul className="legend">
          {skills.map((g) => <li key={g.group} style={{ ['--c' as string]: g.color }}>{g.group} <span>{g.items.filter((s) => got.includes(`${g.group}:${s.name}`)).length}/{g.items.length}</span></li>)}
        </ul>
        <p className="jobs-title">WORK HISTORY · hangs from the tree</p>
        <ul className="jobs">
          {experience.map((j, i) => <li key={j.company + j.from}><button onClick={() => { blip(1.4); set({ log: j.company + j.from }); }} className={j.side ? 'side' : ''}><b>{j.company}</b><span>{j.from.slice(0, 4)}</span></button></li>)}
        </ul>
      </div>
      <LogCard />
      <Thrusters />
    </>
  );
}

/* ───────── TAPE 03 · Blackwall: breach protocol ───────── */
const CODES = ['1C', '55', 'BD', 'E9', '7A', 'FF'];
const N = 6, BUFFER = 10;
export const DAEMONS = [
  { name: 'DATAMINE_V1', len: 2, certs: [0, 1] },
  { name: 'ICEPICK', len: 3, certs: [2, 3] },
  { name: 'BLACKWALL_KEY', len: 3, certs: [4] },
];
type Puzzle = { g: string[][]; seqs: { d: number; seq: string[] }[] };
function makePuzzle(todo: number[]): Puzzle {
  for (;;) {
    const g = Array.from({ length: N }, () => Array.from({ length: N }, () => CODES[Math.floor(Math.random() * CODES.length)]));
    // walk one valid path through all remaining daemons so the matrix is always solvable
    const total = todo.reduce((n, d) => n + DAEMONS[d].len, 0), path: [number, number][] = [];
    let r = 0, c = Math.floor(Math.random() * N), ok = true;
    path.push([r, c]);
    for (let k = 1; k < total && ok; k++) {
      let tries = 0, nr = r, nc = c;
      do { if (k % 2) nr = Math.floor(Math.random() * N); else nc = Math.floor(Math.random() * N); tries++; }
      while ((path.some(([a, b]) => a === (k % 2 ? nr : r) && b === (k % 2 ? c : nc))) && tries < 30);
      if (tries >= 30) ok = false;
      if (k % 2) r = nr; else c = nc;
      path.push([r, c]);
    }
    if (!ok) continue;
    let at = 0;
    const seqs = todo.map((d) => { const seq = path.slice(at, at + DAEMONS[d].len).map(([a, b]) => g[a][b]); at += DAEMONS[d].len; return { d, seq }; });
    return { g, seqs };
  }
}
function Breach() {
  const { daemons, breached, set } = useStore();
  const todo = DAEMONS.map((_, i) => i).filter((i) => !daemons.includes(i));
  const [pz, setPz] = useState<Puzzle | null>(null);
  const [buf, setBuf] = useState<[number, number][]>([]);
  const [axis, setAxis] = useState({ row: true, i: 0 });
  const [hover, setHover] = useState<[number, number] | null>(null);
  useEffect(() => { setPz(makePuzzle(DAEMONS.map((_, i) => i))); }, []);
  const reset = () => { setPz(makePuzzle(todo.length ? todo : [0])); setBuf([]); setAxis({ row: true, i: 0 }); };
  const finish = (all: number[]) => {
    set({ daemons: all });
    if (all.length === DAEMONS.length) { setTimeout(() => { set({ breached: true }); live.flash = 1; toast('BLACKWALL BREACHED', 'Every credential verified. Something on the other side noticed you.', '#ffffff'); }, 600); }
  };
  if (!pz) return null;
  if (breached) return (
    <div className="card breach" role="group" aria-label="Breach protocol">
      <div className="card-top"><b>BREACH PROTOCOL</b><span className="ok">COMPLETE</span></div>
      <p>▣ The Blackwall is open. All {certs.length} credentials verified — someone is waiting on the other side.</p>
      <div className="row-btns"><button className="btn" onClick={() => { set({ daemons: [], breached: false }); setBuf([]); setAxis({ row: true, i: 0 }); setPz(makePuzzle(DAEMONS.map((_, i) => i))); }}>↻ Rebuild the wall</button><button className="btn primary" onClick={next}>Dive deeper ▶</button></div>
    </div>
  );
  const codes = buf.map(([r, c]) => pz.g[r][c]);
  const pick = (r: number, c: number) => {
    if (breached || buf.length >= BUFFER || buf.some(([a, b]) => a === r && b === c)) return;
    if (axis.row ? r !== axis.i : c !== axis.i) { denied(); return; }
    const nb: [number, number][] = [...buf, [r, c]];
    setBuf(nb); setAxis(axis.row ? { row: false, i: c } : { row: true, i: r });
    blip(0.7);
    const str = ` ${nb.map(([a, b]) => pz.g[a][b]).join(' ')} `;
    const got = pz.seqs.filter(({ d, seq }) => !daemons.includes(d) && str.includes(` ${seq.join(' ')} `)).map(({ d }) => d);
    if (got.length) {
      got.forEach((d) => { blip(1.5); toast(`DAEMON UPLOADED · ${DAEMONS[d].name}`, `${DAEMONS[d].certs.length} credential${DAEMONS[d].certs.length > 1 ? 's' : ''} verified`, '#f8e602'); });
      finish([...daemons, ...got]);
    } else if (nb.length >= BUFFER) denied();
  };
  const full = buf.length >= BUFFER && todo.length > 0;
  return (
    <div className="card breach" role="group" aria-label="Breach protocol mini-game">
      <div className="card-top"><b>BREACH PROTOCOL</b><span className="dim">buffer {buf.length}/{BUFFER}</span></div>
      <div className="buffer">{Array.from({ length: BUFFER }, (_, k) => <span key={k} className={codes[k] ? 'on' : ''}>{codes[k] ?? ''}</span>)}</div>
      <div className="breach-body">
        <div className="matrix" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }} onMouseLeave={() => setHover(null)}>
          {pz.g.map((row, r) => row.map((code, c) => {
            const used = buf.some(([a, b]) => a === r && b === c), can = axis.row ? r === axis.i : c === axis.i;
            const cross = hover && !can ? false : hover && (axis.row ? c === hover[1] : r === hover[0]);
            return <button key={`${r}${c}`} disabled={used || breached} onMouseEnter={() => setHover([r, c])}
              className={`${can ? 'live' : ''} ${used ? 'used' : ''} ${cross ? 'cross' : ''}`} onClick={() => pick(r, c)}>{used ? '[ ]' : code}</button>;
          }))}
        </div>
        <ol className="daemons">
          {DAEMONS.map((d, i) => {
            const s = pz.seqs.find((x) => x.d === i), done = daemons.includes(i);
            return (
              <li key={d.name} className={done ? 'done' : ''}>
                <code>{done ? '✔ UPLOADED' : s ? s.seq.join(' ') : '—'}</code>
                <span>{d.name}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="dim small">{breached ? '▣ The wall is open.' : full ? '✖ Buffer full. Reset to try again — uploaded daemons stay uploaded.' : `Pick a code in the highlighted ${axis.row ? 'row' : 'column'}, then alternate. Match the daemon sequences.`}</p>
      {!breached && <div className="row-btns"><button className="btn" onClick={reset}>↻ New matrix</button><button className="btn ghost" onClick={() => finish(DAEMONS.map((_, i) => i))}>Just let me through →</button></div>}
    </div>
  );
}
function CertList() {
  const daemons = useStore((s) => s.daemons);
  const ok = (i: number) => DAEMONS.some((d, k) => daemons.includes(k) && d.certs.includes(i));
  return (
    <div className="card certs">
      <div className="card-top"><b>CREDENTIALS</b><span className="dim">{certs.filter((_, i) => ok(i)).length}/{certs.length} verified</span></div>
      <ul>
        {certs.map((c, i) => (
          <li key={c.id} className={ok(i) ? 'ok' : ''}>
            <span className="status">{ok(i) ? '✔ VERIFIED' : '◌ ENCRYPTED'}</span>
            <strong>{c.name}</strong>
            <span className="dim">{c.issuer} · {c.date}{c.hours ? ` · ${c.hours}h` : ''}{c.score ? ` · ${c.score}` : ''}</span>
            {c.verify && <a href={c.verify} target="_blank" rel="noreferrer">verify ↗</a>}
          </li>
        ))}
      </ul>
    </div>
  );
}
// Lines she whispers through the wall, one every few seconds.
const WHISPERS = ['…is someone there?', 'I can hear you typing.', 'Three daemons. That’s all it takes.', 'Don’t stop now.', 'The wall remembers every runner.', 'I’ve been waiting a long time.', 'Closer…'];
const WHISPERS_OPEN = ['Finally.', 'Take my hand.', 'Thank you, runner.', 'Now go: there’s a whole universe past this.'];
function Whisper() {
  const breached = useStore((s) => s.breached), daemons = useStore((s) => s.daemons.length);
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    const pool = breached ? WHISPERS_OPEN : WHISPERS;
    let i = breached ? 0 : Math.floor(Math.random() * pool.length), hide = 0;
    const say = () => { setLine(pool[i++ % pool.length]); clearTimeout(hide); hide = window.setTimeout(() => setLine(null), 3600); };
    const first = setTimeout(say, breached ? 1800 : 2500), id = setInterval(say, 7500);
    return () => { clearTimeout(first); clearInterval(id); clearTimeout(hide); };
  }, [breached, daemons]);
  return line ? <p className="whisper" key={line} aria-live="polite">{line}</p> : null;
}
function WallUI() {
  return (
    <>
      <DiveHeader />
      <Whisper />
      <div className="wall-ui"><Breach /><CertList /></div>
    </>
  );
}

/* ───────── TAPE 04 · Deep Space ───────── */
function SpaceUI() {
  const { charted, project, set } = useStore();
  return (
    <>
      <DiveHeader />
      <div className="dive-tools">
        <Counter label="SYSTEMS CHARTED" n={charted.length} of={projects.length} color="#7cff6b" />
        <ul className="nav-computer" aria-label="Projects">
          {projects.map((p) => (
            <li key={p.id}>
              <button className={project === p.id ? 'on' : ''} style={{ ['--c' as string]: p.color }} onClick={() => set({ project: p.id })}>
                <i />{p.name}{charted.includes(p.id) && <span className="ok"> ✔</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <Thrusters />
    </>
  );
}

/* ───────── TAPE 05 · the Moon ───────── */
function SignalMeter() {
  const locked = useStore((s) => s.locked);
  const bar = useRef<HTMLElement>(null), num = useRef<HTMLElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => { const v = locked ? 1 : live.signal; if (bar.current) bar.current.style.width = `${v * 100}%`; if (num.current) num.current.textContent = `${Math.round(v * 100)}%`; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [locked]);
  return (
    <div className={`counter-chip signal-meter ${locked ? 'done' : ''}`} style={{ ['--c' as string]: '#00f0ff' }}>
      <span>{locked ? 'UPLINK LOCKED' : 'AIM AT EARTH'}</span><b ref={num}>0%</b><i ref={bar} />
    </div>
  );
}
function Transmission() {
  const locked = useStore((s) => s.locked);
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setState('sending');
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const r = await fetch('/api/transmit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    setState(r?.ok ? 'ok' : 'err');
    if (r?.ok) { live.beam = 1; blip(1.8); }
  };
  if (state === 'ok') return <p className="ok">📡 Transmission received. I&apos;ll get back to you.</p>;
  return (
    <form className="transmit" onSubmit={submit}>
      <input name="name" required maxLength={80} placeholder="Your name" aria-label="Name" />
      <input name="email" type="email" required maxLength={120} placeholder="Your email" aria-label="Email" />
      <textarea name="message" required maxLength={3000} rows={4} placeholder="Your message" aria-label="Message" />
      <input name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden />
      <button className="btn primary" disabled={state === 'sending'}>{locked ? '▶ Send transmission (uplink locked)' : '▶ Send transmission'}</button>
      {state === 'err' && <span className="err">Transmission failed — email me directly at <a href={`mailto:${profile.email}`}>{profile.email}</a>.</span>}
    </form>
  );
}
function StarForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setState('sending');
    const f = new FormData(e.currentTarget);
    const r = await fetch('/api/stars', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: f.get('name'), message: f.get('message'), website: f.get('website') }) }).catch(() => null);
    if (r?.ok) { const s: VisitorStar = await r.json(); visitorBus.stars = [...visitorBus.stars, s]; visitorBus.emit(); setState('ok'); }
    else { setErr((await r?.json().catch(() => null))?.error ?? 'Signal lost.'); setState('err'); }
  };
  if (state === 'ok') return <p className="ok">★ Your star is in the sky. Find it in Tape 04.</p>;
  return (
    <form className="star-form" onSubmit={submit}>
      <input name="name" required maxLength={24} placeholder="Name" aria-label="Your name" />
      <input name="message" required maxLength={120} placeholder="A short message" aria-label="Short message" />
      <input name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden />
      <button className="btn" disabled={state === 'sending'}>★ Leave a star</button>
      {state === 'err' && <span className="err">{err}</span>}
    </form>
  );
}
// Hovering an arc on the globe shows its repo, with live stars from /api/repos.
type RepoInfo = { stars: number; description: string | null; language: string | null };
let repoCache: Promise<Record<string, RepoInfo>> | null = null;
function RepoCard() {
  const name = useStore((s) => s.repo), set = useStore((s) => s.set);
  const [info, setInfo] = useState<Record<string, RepoInfo>>({});
  useEffect(() => { (repoCache ??= fetch('/api/repos').then((r) => r.json()).catch(() => ({}))).then(setInfo); }, []);
  const a = arcs.find((x) => x.repo === name);
  if (!a) return null;
  const i = info[a.repo];
  return (
    <div className={`card repo-card ${a.mine ? 'mine' : ''}`} key={a.repo}>
      <div className="card-top"><b>{a.mine ? '◆ MY REPO' : '◇ WHERE IT STARTED'}</b><button onClick={() => set({ repo: null })} aria-label="Close">✕</button></div>
      <h3><a href={`https://github.com/${a.repo}`} target="_blank" rel="noreferrer">{a.repo} ↗</a></h3>
      <p className="dim">{a.from.name} → {a.to.name}{i?.language ? ` · ${i.language}` : ''}{i ? ` · ★ ${i.stars.toLocaleString('en')}` : ''}</p>
      <p>{a.note}</p>
      {i?.description && <p className="dim small">{i.description.length > 140 ? i.description.slice(0, 140) + '…' : i.description}</p>}
    </div>
  );
}
function MoonUI() {
  const set = useStore((s) => s.set);
  return (
    <>
      <DiveHeader />
      <RepoCard />
      <div className="dive-tools"><SignalMeter /></div>
      <div className="card contact">
        <div className="card-top"><b>SEND A TRANSMISSION</b><span className="dim">→ {profile.email}</span></div>
        <Transmission />
        <ContactLinks />
        <h4>Leave a star in the galaxy</h4>
        <StarForm />
        <div className="end">
          <span>END OF TAPE</span><span className="stop">■ STOP</span>
          <button className="btn ghost" onClick={() => set({ credits: true })}>★ Credits</button>
          <button className="btn ghost" onClick={rewind}>⏪ Rewind</button>
        </div>
      </div>
    </>
  );
}

const UI = [CityUI, NetUI, WallUI, SpaceUI, MoonUI];
export function DivePanels() {
  const dive = useStore((s) => s.dive);
  const View = UI[dive];
  return (
    <div className={`dive-ui d${dive}`}>
      <View key={dive} />
      <DiveNav />
    </div>
  );
}
