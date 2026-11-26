import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { ArrowDown, ArrowRight, ArrowUpRight, CheckCheck, Code2, DoorOpen, FileText, Fingerprint, Menu, Play, Scissors, Send, Sparkles, X } from 'lucide-react';
import { Github, Linkedin } from './BrandIcons';
import GitHubActivity from './GitHubActivity';
import { projectPreviews } from './LiveProjectPreview';
import { ContactModal, ProjectModal } from './Modals';
import { Cursor, Preloader, useMagnetic } from './UI';
import { profile, projects, services } from './content';
import type { Project } from './content';
import { scene } from './store';
import activity from './data/github-activity.json';

gsap.registerPlugin(ScrollTrigger, SplitText);

const HeroScene = lazy(() => import('./HeroScene'));
const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const workIds = ['the-tcg-plug', 'wovenaa', 'pressvane', 'ahsantechlink', 'zonyx', 'ikonnect'];
const workProjects = workIds.map(id => projects.find(p => p.id === id)!).filter(Boolean);
const systemIds = ['gym-management', 'social-agent', 'stream-clips'];
const systemProjects = systemIds.map(id => projects.find(p => p.id === id)!).filter(Boolean);
const pipelines: Record<string, { label: string; Icon: typeof Play }[]> = {
  'gym-management': [{ label: 'Fingerprint', Icon: Fingerprint }, { label: 'Membership', Icon: CheckCheck }, { label: 'Door opens', Icon: DoorOpen }],
  'social-agent': [{ label: 'Create post', Icon: Sparkles }, { label: 'Prepare', Icon: Code2 }, { label: 'Publish', Icon: Send }],
  'stream-clips': [{ label: 'Watch stream', Icon: Play }, { label: 'Find & cut', Icon: Scissors }, { label: 'Publish clips', Icon: Send }],
};

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function SceneFallback({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady(); }, [onReady]);
  return <div className="hero-fallback"><img src="/assets/previews/tcg-nl-desktop.jpg" alt="" /></div>;
}

function Chars({ text }: { text: string }) {
  return <>{text.split('').map((c, i) => <span className="char" key={i}>{c === ' ' ? ' ' : c}</span>)}</>;
}

function SectionLabel({ n, children }: { n: string; children: ReactNode }) {
  return <div className="section-label" data-reveal><span>({n})</span><span>{children}</span></div>;
}

export default function App() {
  const [sceneReady, setSceneReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [heroActive, setHeroActive] = useState(true);
  const [selected, setSelected] = useState<Project | null>(null);
  const [contact, setContact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lenis = useRef<Lenis | null>(null);
  const hero = useRef<HTMLElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const ctaRef = useMagnetic<HTMLButtonElement>(0.35);

  const onSceneReady = useCallback(() => setSceneReady(true), []);
  const onLoaded = useCallback(() => setLoaded(true), []);
  const closeProject = useCallback(() => setSelected(null), []);
  const closeContact = useCallback(() => setContact(false), []);
  const openProject = useCallback((id: string) => { const p = projects.find(x => x.id === id); if (p) setSelected(p); }, []);

  // Smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync.
  useEffect(() => {
    if (reducedMotion) return;
    const l = new Lenis({ lerp: 0.09, anchors: { offset: 0 } });
    lenis.current = l;
    l.on('scroll', (e: Lenis) => { scene.velocity = e.velocity; ScrollTrigger.update(); });
    const raf = (t: number) => l.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(raf); l.destroy(); lenis.current = null; };
  }, []);

  useEffect(() => {
    const locked = !!selected || contact || menuOpen || !loaded;
    if (locked) lenis.current?.stop(); else lenis.current?.start();
    document.documentElement.classList.toggle('is-locked', locked);
  }, [selected, contact, menuOpen, loaded]);

  // Only render WebGL while the hero is on screen.
  useEffect(() => {
    if (!hero.current) return;
    const io = new IntersectionObserver(([e]) => setHeroActive(e.isIntersecting), { rootMargin: '100px' });
    io.observe(hero.current);
    return () => io.disconnect();
  }, []);

  // Pointer tilt + drag-to-spin for the ring.
  useEffect(() => {
    const el = hero.current;
    if (!el) return;
    let down = false; let lastX = 0;
    const move = (e: PointerEvent) => {
      scene.pointerX = (e.clientX / innerWidth) * 2 - 1;
      scene.pointerY = (e.clientY / innerHeight) * 2 - 1;
      if (!down) return;
      const dx = e.clientX - lastX; lastX = e.clientX;
      scene.dragDistance += Math.abs(dx);
      scene.dragVelocity = dx * 0.0025;
    };
    const start = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('a, button')) return;
      down = true; lastX = e.clientX; scene.dragDistance = 0; el.classList.add('is-dragging');
    };
    const end = () => { down = false; el.classList.remove('is-dragging'); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', start);
    window.addEventListener('pointerup', end);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerdown', start); window.removeEventListener('pointerup', end); };
  }, []);

  // All scroll choreography, created once the preloader has cleared.
  useEffect(() => {
    if (!loaded || !root.current) return;
    const ctx = gsap.context(() => {
      const motion = !reducedMotion;

      // Hero intro.
      const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
      intro.from('.hero-title .char', { yPercent: motion ? 115 : 0, opacity: motion ? 1 : 0, duration: 1.4, stagger: 0.035 })
        .from('.hero [data-intro]', { y: motion ? 24 : 0, opacity: 0, duration: 1.1, stagger: 0.08 }, '-=1.1')
        .from('.hero-canvas', { opacity: 0, scale: motion ? 1.08 : 1, duration: 2, ease: 'power2.out' }, 0)
        .from('.site-header', { y: motion ? -30 : 0, opacity: 0, duration: 1 }, 0.3);

      // Hero exit: feed the 3D scene and drift the copy away.
      ScrollTrigger.create({
        trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
        onUpdate: self => { scene.progress = self.progress; },
      });
      if (motion) {
        gsap.to('.hero-copy', { yPercent: 30, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to('.hero-canvas', { opacity: 0.15, ease: 'none', scrollTrigger: { trigger: '.hero', start: '40% top', end: 'bottom top', scrub: true } });
      }

      // Generic fade-ups.
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach(el => {
        gsap.from(el, { y: motion ? 40 : 0, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
      });

      // Headline line reveals.
      gsap.utils.toArray<HTMLElement>('[data-split]').forEach(el => {
        const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line' });
        gsap.from(split.lines, { yPercent: motion ? 110 : 0, opacity: motion ? 1 : 0, duration: 1.2, stagger: 0.09, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
      });

      // Manifesto: words light up as you read.
      const manifesto = document.querySelector<HTMLElement>('.manifesto-text');
      if (manifesto) {
        const split = SplitText.create(manifesto.querySelectorAll('.m-words'), { type: 'words', wordsClass: 'word' });
        gsap.fromTo(split.words, { opacity: 0.14 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: manifesto, start: 'top 80%', end: 'bottom 45%', scrub: true } });
        gsap.from('.m-pill', { scale: 0, rotate: -8, duration: 1, ease: 'back.out(1.6)', stagger: 0.15, scrollTrigger: { trigger: manifesto, start: 'top 75%' } });
      }

      // Selected work: horizontal pinned scroll on wide screens.
      const mm = gsap.matchMedia();
      mm.add('(min-width: 960px) and (prefers-reduced-motion: no-preference)', () => {
        const track = document.querySelector<HTMLElement>('.work-track');
        if (!track) return;
        const distance = () => track.scrollWidth - innerWidth;
        const tween = gsap.to(track, {
          x: () => -distance(), ease: 'none',
          scrollTrigger: {
            trigger: '.work', pin: true, scrub: 1, start: 'top top', end: () => `+=${distance()}`, invalidateOnRefresh: true,
            onUpdate: self => {
              gsap.set('.work-progress i', { scaleX: self.progress });
              const n = Math.min(workProjects.length, Math.floor(self.progress * workProjects.length) + 1);
              const counter = document.querySelector('.work-counter b');
              if (counter) counter.textContent = String(n).padStart(2, '0');
            },
          },
        });
        gsap.utils.toArray<HTMLElement>('.work-card img').forEach(img => {
          gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: img, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
        });
      });

      // Count-up stats.
      gsap.utils.toArray<HTMLElement>('[data-count]').forEach(el => {
        const end = Number(el.dataset.count);
        const obj = { v: 0 };
        gsap.to(obj, { v: end, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' }, onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString(); } });
      });

      // Header: tuck away while reading down, return on scroll up; switch palette over the light chapter.
      const header = document.querySelector('.site-header');
      ScrollTrigger.create({ start: 0, end: 'max', onUpdate: self => header?.classList.toggle('is-hidden', self.direction === 1 && self.scroll() > innerHeight * 0.6) });
      ScrollTrigger.create({ trigger: '.services', start: 'top 60px', end: 'bottom 60px', toggleClass: { targets: '.site-header', className: 'on-light' } });

      // Footer wordmark.
      gsap.from('.footer-mark .char', { yPercent: motion ? 100 : 0, opacity: motion ? 1 : 0, stagger: 0.03, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.footer-mark', start: 'top 95%' } });
    }, root);
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    return () => ctx.revert();
  }, [loaded]);

  const navLinks = [['#work', 'Work'], ['#systems', 'Systems'], ['#services', 'Services'], ['#about', 'About']];
  const scrollTo = (hash: string) => {
    setMenuOpen(false);
    const target = document.querySelector<HTMLElement>(hash);
    if (!target) return;
    if (lenis.current) { lenis.current.start(); lenis.current.scrollTo(target, { duration: 1.6 }); }
    else target.scrollIntoView();
  };

  return <div className={`app ${loaded ? 'is-loaded' : ''}`} ref={root}>
    <Preloader sceneReady={sceneReady} onDone={onLoaded} />
    <Cursor />
    <div className="grain" aria-hidden="true" />
    <a className="skip-link" href="#work">Skip to projects</a>

    <header className="site-header">
      <a className="logo" href="#top" onClick={e => { e.preventDefault(); scrollTo('#top'); }} aria-label="Abdullah Fida, back to top"><span className="logo-mark">AF</span><span className="logo-text">Abdullah Fida</span></a>
      <nav className="nav" aria-label="Main">
        {navLinks.map(([href, label]) => <a key={href} href={href} onClick={e => { e.preventDefault(); scrollTo(href); }}>{label}</a>)}
      </nav>
      <div className="header-right">
        <button className="btn btn-pill" onClick={() => setContact(true)}>Let's talk <ArrowUpRight size={15} /></button>
        <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
    </header>
    <div className={`mobile-menu ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen}>
      {navLinks.map(([href, label], i) => <a key={href} href={href} tabIndex={menuOpen ? 0 : -1} style={{ transitionDelay: `${0.05 * i + 0.1}s` }} onClick={e => { e.preventDefault(); scrollTo(href); }}><small>0{i + 1}</small>{label}</a>)}
      <button className="btn btn-accent" tabIndex={menuOpen ? 0 : -1} onClick={() => { setMenuOpen(false); setContact(true); }}>Start a project <ArrowUpRight size={16} /></button>
    </div>

    <main id="top">
      {/* ——— Hero ——— */}
      <section className="hero" ref={hero} aria-labelledby="hero-title">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-canvas" data-cursor="Drag">
          <SceneBoundary fallback={<SceneFallback onReady={onSceneReady} />}>
            <Suspense fallback={null}>
              <HeroScene onOpen={openProject} onReady={onSceneReady} active={heroActive && !selected && !contact} motion={!reducedMotion} />
            </Suspense>
          </SceneBoundary>
        </div>
        <div className="hero-copy">
          <div className="hero-top">
            <p data-intro className="hero-kicker"><span className="dot" />Shopify · Full-stack · AI automation</p>
            <p data-intro className="hero-hint">Drag the ring · Click a screen</p>
          </div>
          <div className="hero-bottom">
            <div className="hero-meta">
              <p data-intro className="hero-lede">I build and manage Shopify stores, develop custom web apps, and automate the work between them.</p>
              <div data-intro className="hero-stat"><strong>€300k<small>/mo</small></strong><span>in sales across the TCG Plug stores I manage</span></div>
              <a data-intro className="hero-scroll" href="#manifesto" onClick={e => { e.preventDefault(); scrollTo('#manifesto'); }} aria-label="Scroll down"><ArrowDown size={18} /></a>
            </div>
            <h1 className="hero-title" id="hero-title" aria-label="Abdullah Fida"><span aria-hidden="true"><Chars text="Abdullah Fida" /></span></h1>
          </div>
        </div>
      </section>

      {/* ——— Client marquee ——— */}
      <section className="marquee" aria-label="Brands I've built for">
        <div className="marquee-track">
          {[0, 1].map(k => <div className="marquee-group" key={k} aria-hidden={k === 1}>
            {['The TCG Plug', 'Wovenaa', 'PressVane', 'Ahsan Techlink', 'Zonyx', 'Ikonnect'].map(n => <span key={n}>{n}<i>✳</i></span>)}
          </div>)}
        </div>
      </section>

      {/* ——— Manifesto ——— */}
      <section className="manifesto" id="manifesto">
        <SectionLabel n="01">The short version</SectionLabel>
        <p className="manifesto-text">
          <span className="m-words">I build</span>{' '}<span className="m-pill"><img src="/assets/tcg-hero.jpg" alt="" /></span>{' '}
          <span className="m-words">Shopify stores that sell, custom web apps that do the actual job, and AI agents</span>{' '}<span className="m-pill"><img src="/assets/automation-art.jpg" alt="" /></span>{' '}
          <span className="m-words">that keep publishing long after I log off.</span>
        </p>
      </section>

      {/* ——— Selected work ——— */}
      <section className="work" id="work" aria-labelledby="work-title">
        <div className="work-head">
          <div>
            <SectionLabel n="02">Selected work</SectionLabel>
            <h2 id="work-title" data-split>Live stores &amp; sites.</h2>
          </div>
          <div className="work-status" aria-hidden="true">
            <span className="work-counter"><b>01</b> / {String(workProjects.length).padStart(2, '0')}</span>
            <span className="work-progress"><i /></span>
          </div>
        </div>
        <div className="work-track">
          {workProjects.map((p, i) => {
            const preview = projectPreviews(p.id)[0];
            return <article className="work-card" key={p.id}>
              <button className="work-media" onClick={() => setSelected(p)} data-cursor="Open case" aria-label={`Open ${p.title} case study`}>
                <span className="browser-bar"><i /><i /><i /><em>{preview ? new URL(preview.url).hostname.replace('www.', '') : ''}</em></span>
                <span className="work-img"><img src={preview?.desktop || p.image} alt={`${p.title} website`} loading="lazy" width={1280} height={800} /></span>
                {p.id === 'the-tcg-plug' && <span className="work-badge"><strong>€300k</strong>monthly sales</span>}
              </button>
              <div className="work-info">
                <span className="work-index">{String(i + 1).padStart(2, '0')}</span>
                <div className="work-text">
                  <h3><button onClick={() => setSelected(p)}>{p.title}</button></h3>
                  <p>{p.role}</p>
                </div>
                <div className="work-tags">{p.tags.slice(0, 3).map(t => <span key={t}>{t}</span>)}</div>
              </div>
            </article>;
          })}
          <article className="work-card work-end">
            <p>More things that run on their own.</p>
            <a className="btn btn-accent" href="#systems" onClick={e => { e.preventDefault(); scrollTo('#systems'); }}>See the systems <ArrowRight size={16} /></a>
          </article>
        </div>
      </section>

      {/* ——— Systems & automation ——— */}
      <section className="systems" id="systems" aria-labelledby="systems-title">
        <div className="section-head">
          <SectionLabel n="03">Systems &amp; automation</SectionLabel>
          <h2 id="systems-title" data-split>Built to keep working after I log off.</h2>
          <p data-reveal>Some of my best work doesn't have a homepage. It opens doors, writes posts and cuts clips.</p>
        </div>
        <div className="systems-grid">
          {systemProjects.map((p, i) => <article className="system-card" key={p.id} data-reveal>
            <div className="system-top"><span>{String(i + 1).padStart(2, '0')}</span><span>{p.status}</span></div>
            <div className="pipeline" aria-hidden="true">
              {pipelines[p.id].map(({ label, Icon }, k) => <div className="pipe-node" key={label} style={{ animationDelay: `${k * 0.6}s` }}><span><Icon size={20} strokeWidth={1.5} /></span><small>{label}</small></div>)}
              <i className="pipe-line"><b /></i>
            </div>
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <ul>{p.features.slice(0, 3).map(f => <li key={f}>{f}</li>)}</ul>
            <button className="btn btn-line" onClick={() => setSelected(p)}>Try the walkthrough <ArrowRight size={16} /></button>
          </article>)}
        </div>
        <button className="system-press" onClick={() => openProject('pressvane')} data-reveal>
          <span className="label">Also: AI publishing</span>
          <strong>PressVane: a news site where an AI agent writes and publishes the articles.</strong>
          <ArrowUpRight size={22} />
        </button>
      </section>

      {/* ——— Services (light chapter) ——— */}
      <section className="services" id="services" aria-labelledby="services-title">
        <div className="section-head">
          <SectionLabel n="04">What I do</SectionLabel>
          <h2 id="services-title" data-split>Three things, done properly.</h2>
        </div>
        <div className="service-list">
          {services.map((s, i) => <article className="service" key={s.title} data-reveal>
            <span className="service-n">0{i + 1}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            <ul>{s.points.map(pt => <li key={pt}>{pt}</li>)}</ul>
          </article>)}
        </div>
        <div className="stats">
          <div className="stat" data-reveal><strong>€<span data-count="300">300</span>k</strong><span>monthly sales across the TCG Plug stores I manage</span></div>
          <div className="stat" data-reveal><strong><span data-count={projects.length}>{projects.length}</span></strong><span>stores, systems &amp; automations shipped</span></div>
          <div className="stat" data-reveal><strong><span data-count="3">3</span></strong><span>markets served: Netherlands, Pakistan &amp; UK</span></div>
          <div className="stat" data-reveal><strong><span data-count={activity.total}>{activity.total}</span></strong><span>GitHub contributions in the past year</span></div>
        </div>
      </section>

      {/* ——— About ——— */}
      <section className="about" id="about" aria-labelledby="about-title">
        <div className="about-left">
          <SectionLabel n="05">About</SectionLabel>
          <h2 id="about-title" data-split>A developer who stays involved.</h2>
        </div>
        <div className="about-right" data-reveal>
          <p className="about-lead">I work on the part customers see and the systems behind it.</p>
          <p>My work ranges from Shopify store management to membership access, publishing tools and custom web applications. I currently manage the two TCG Plug stores. Alongside store work, I build with the MERN stack and connect AI agents to real publishing and content workflows.</p>
          <div className="stack">{['Shopify', 'React', 'Node.js', 'Express', 'MongoDB', 'TypeScript', 'Git', 'AI agents'].map(s => <span key={s}>{s}</span>)}</div>
          <div className="about-links">
            <a className="link-arrow" href={profile.github} target="_blank" rel="noreferrer"><Github size={18} />GitHub <ArrowUpRight size={15} /></a>
            <a className="link-arrow" href={profile.linkedin} target="_blank" rel="noreferrer"><Linkedin size={18} />LinkedIn <ArrowUpRight size={15} /></a>
            <a className="link-arrow" href="/cv/index.html" target="_blank" rel="noreferrer"><FileText size={18} />View CV <ArrowUpRight size={15} /></a>
          </div>
        </div>
      </section>

      <GitHubActivity />

      {/* ——— Contact ——— */}
      <section className="contact" id="contact" aria-labelledby="contact-title-main">
        <SectionLabel n="06">Contact</SectionLabel>
        <h2 id="contact-title-main" data-split>Have a project in mind?</h2>
        <div className="contact-row">
          <p data-reveal>Tell me what you need built, or which part of the work could use some automation.</p>
          <button className="contact-cta" ref={ctaRef} onClick={() => setContact(true)} data-cursor="Let's go"><span>Start a project</span><ArrowUpRight size={34} strokeWidth={1.4} /></button>
        </div>
      </section>
    </main>

    <footer className="footer">
      <div className="footer-cv" data-reveal>
        <div><FileText size={22} strokeWidth={1.5} /><div><strong>The short version.</strong><span>My work and skills in a CV you can keep.</span></div></div>
        <div className="footer-cv-actions"><a className="btn btn-line" href="/cv/index.html" target="_blank" rel="noreferrer">View CV</a><a className="btn btn-accent" href="/cv/abdullah-fida-cv.pdf" download="Abdullah-Fida-CV.pdf">Download PDF</a></div>
      </div>
      <div className="footer-row">
        <span>Shopify, full-stack development &amp; useful automation.</span>
        <div><a href={profile.github} target="_blank" rel="noreferrer">GitHub</a><a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn</a><a href="#top" onClick={e => { e.preventDefault(); scrollTo('#top'); }}>Back to top ↑</a></div>
      </div>
      <div className="footer-mark" aria-hidden="true"><Chars text="Abdullah Fida" /></div>
      <p className="footer-legal">© {new Date().getFullYear()} Abdullah Fida. Designed &amp; built in-house with React, Three.js &amp; GSAP.</p>
    </footer>

    {selected && <ProjectModal project={selected} onClose={closeProject} onContact={() => { setSelected(null); setContact(true); }} />}
    {contact && <ContactModal onClose={closeContact} />}
  </div>;
}
