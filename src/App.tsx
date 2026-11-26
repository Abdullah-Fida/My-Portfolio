import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode, RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { ArrowRight, ArrowUpRight, CheckCheck, Code2, DoorOpen, FileText, Fingerprint, Menu, Play, Scissors, Send, Sparkles, X } from 'lucide-react';
import { Github, Linkedin } from './BrandIcons';
import GitHubActivity from './GitHubActivity';
import { projectPreviews } from './LiveProjectPreview';
import { ContactModal, ProjectModal } from './Modals';
import { categoryLabels, profile, projects, services } from './content';
import type { Project } from './content';
import { onCursor, scene } from './store';
import activity from './data/github-activity.json';

gsap.registerPlugin(ScrollTrigger, SplitText);

const heroSceneImport = import('./HeroScene'); // start downloading the 3D code immediately
const HeroScene = lazy(() => heroSceneImport);
const FlowScene = lazy(() => import('./Scenes').then(m => ({ default: m.FlowScene })));
const ShapesScene = lazy(() => import('./Scenes').then(m => ({ default: m.ShapesScene })));
const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const workIds = ['the-tcg-plug', 'wovenaa', 'pressvane', 'ahsantechlink', 'zonyx', 'ikonnect'];
const workProjects = workIds.map(id => projects.find(p => p.id === id)!).filter(Boolean);
const systemIds = ['gym-management', 'social-agent', 'stream-clips'];
const systemProjects = systemIds.map(id => projects.find(p => p.id === id)!).filter(Boolean);
const pipelines: Record<string, { label: string; Icon: typeof Play }[]> = {
  'gym-management': [{ label: 'Fingerprint', Icon: Fingerprint }, { label: 'Membership', Icon: CheckCheck }, { label: 'Door opens', Icon: DoorOpen }],
  'social-agent': [{ label: 'Write post', Icon: Sparkles }, { label: 'Prepare', Icon: Code2 }, { label: 'Publish', Icon: Send }],
  'stream-clips': [{ label: 'Watch stream', Icon: Play }, { label: 'Cut highlight', Icon: Scissors }, { label: 'Publish', Icon: Send }],
};
const clients = ['The TCG Plug', 'Wovenaa', 'PressVane', 'Ahsan Techlink', 'Zonyx', 'Ikonnect'];

class SceneBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? (this.props.fallback ?? null) : this.props.children; }
}

/** Mount a 3D scene once it's near the viewport; run its render loop only while visible. */
function useInView(ref: RefObject<HTMLElement | null>, margin = '200px') {
  const [state, setState] = useState({ seen: false, visible: false });
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => setState(s => ({ seen: s.seen || e.isIntersecting, visible: e.isIntersecting })), { rootMargin: margin });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref, margin]);
  return state;
}

function SceneSlot({ className, children }: { className: string; children: (active: boolean) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { seen, visible } = useInView(ref);
  return <div className={className} ref={ref} aria-hidden="true">
    {seen && <SceneBoundary><Suspense fallback={null}>{children(visible)}</Suspense></SceneBoundary>}
  </div>;
}

function HeroCaption() {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => onCursor(setLabel), []);
  return <p className="hero-caption" data-intro aria-live="polite">
    {label ? <>Open <strong>{label}</strong> <ArrowRight size={14} /></> : 'Drag to rotate. Click a screen to open the project.'}
  </p>;
}

function SectionHead({ label, title, text, id }: { label: string; title: string; text?: string; id: string }) {
  return <div className="section-head">
    <p className="eyebrow" data-reveal>{label}</p>
    <h2 id={id} data-split>{title}</h2>
    {text && <p className="section-text" data-reveal>{text}</p>}
  </div>;
}

export default function App() {
  const [sceneReady, setSceneReady] = useState(false);
  const [heroActive, setHeroActive] = useState(true);
  const [selected, setSelected] = useState<Project | null>(null);
  const [contact, setContact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lenis = useRef<Lenis | null>(null);
  const hero = useRef<HTMLElement>(null);
  const root = useRef<HTMLDivElement>(null);

  const onSceneReady = useCallback(() => setSceneReady(true), []);
  const closeProject = useCallback(() => setSelected(null), []);
  const closeContact = useCallback(() => setContact(false), []);
  const openProject = useCallback((id: string) => { const p = projects.find(x => x.id === id); if (p) setSelected(p); }, []);

  // Smooth scrolling on GSAP's ticker so ScrollTrigger stays in sync.
  useEffect(() => {
    if (reducedMotion) return;
    const l = new Lenis({ duration: 1.15, easing: t => 1 - Math.pow(1 - t, 4) });
    lenis.current = l;
    l.on('scroll', (e: Lenis) => { scene.velocity = e.velocity; ScrollTrigger.update(); });
    const raf = (t: number) => l.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(raf); l.destroy(); lenis.current = null; };
  }, []);

  useEffect(() => {
    const locked = !!selected || contact || menuOpen;
    if (locked) lenis.current?.stop(); else lenis.current?.start();
    document.documentElement.classList.toggle('is-locked', locked);
  }, [selected, contact, menuOpen]);

  useEffect(() => {
    if (!hero.current) return;
    const io = new IntersectionObserver(([e]) => setHeroActive(e.isIntersecting), { rootMargin: '100px' });
    io.observe(hero.current);
    return () => io.disconnect();
  }, []);

  // Pointer position for every scene, plus drag-to-spin on the hero ring.
  useEffect(() => {
    const el = hero.current;
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
      down = true; lastX = e.clientX; scene.dragDistance = 0; el?.classList.add('is-dragging');
    };
    const end = () => { down = false; el?.classList.remove('is-dragging'); };
    window.addEventListener('pointermove', move);
    el?.addEventListener('pointerdown', start);
    window.addEventListener('pointerup', end);
    return () => { window.removeEventListener('pointermove', move); el?.removeEventListener('pointerdown', start); window.removeEventListener('pointerup', end); };
  }, []);

  // Scroll choreography.
  useEffect(() => {
    if (!root.current) return;
    const motion = !reducedMotion;
    const ctx = gsap.context(() => {
      const heading = SplitText.create('.hero h1', { type: 'lines', mask: 'lines', linesClass: 'line' });
      gsap.timeline({ defaults: { ease: 'power4.out' }, delay: 0.15 })
        .from(heading.lines, { yPercent: motion ? 105 : 0, opacity: motion ? 1 : 0, duration: 1.3, stagger: 0.1 })
        .from('.hero [data-intro]', { y: motion ? 16 : 0, opacity: 0, duration: 1.1, stagger: 0.07 }, '-=1')
        .from('.site-header', { opacity: 0, duration: 1 }, 0);

      ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, onUpdate: self => { scene.progress = self.progress; } });
      if (motion) gsap.to('.hero-copy', { y: -60, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: '90% top', scrub: true } });

      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach(el => {
        gsap.from(el, { y: motion ? 24 : 0, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
      });
      gsap.utils.toArray<HTMLElement>('[data-split]').forEach(el => {
        const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line' });
        gsap.from(split.lines, { yPercent: motion ? 105 : 0, opacity: motion ? 1 : 0, duration: 1.15, stagger: 0.08, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
      });

      const intro = document.querySelector('.intro-text');
      if (intro) {
        const split = SplitText.create(intro, { type: 'words', wordsClass: 'word' });
        gsap.fromTo(split.words, { opacity: 0.18 }, { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: intro, start: 'top 82%', end: 'bottom 55%', scrub: true } });
      }

      if (motion) {
        gsap.utils.toArray<HTMLElement>('.case-media').forEach(media => {
          const img = media.querySelector('img');
          gsap.fromTo(media, { scale: 0.94, opacity: 0.4 }, { scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: media, start: 'top 95%', end: 'top 45%', scrub: 0.6 } });
          if (img) gsap.fromTo(img, { scale: 1.1 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
        });
      }

      gsap.utils.toArray<HTMLElement>('[data-count]').forEach(el => {
        const end = Number(el.dataset.count); const obj = { v: 0 };
        gsap.to(obj, { v: end, duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' }, onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString(); } });
      });

      const header = document.querySelector('.site-header');
      ScrollTrigger.create({ start: 0, end: 'max', onUpdate: self => { header?.classList.toggle('is-hidden', self.direction === 1 && self.scroll() > innerHeight * 0.6); header?.classList.toggle('is-scrolled', self.scroll() > 40); } });
      ['.systems', '.contact'].forEach(sel => ScrollTrigger.create({ trigger: sel, start: 'top 40px', end: 'bottom 40px', toggleClass: { targets: '.site-header', className: 'on-dark' } }));
    }, root);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => ctx.revert();
  }, []);

  const navLinks = [['#work', 'Work'], ['#systems', 'Systems'], ['#services', 'Services'], ['#about', 'About']];
  const scrollTo = (hash: string) => {
    setMenuOpen(false);
    const target = document.querySelector<HTMLElement>(hash);
    if (!target) return;
    if (lenis.current) { lenis.current.start(); lenis.current.scrollTo(target, { duration: 1.6 }); }
    else target.scrollIntoView();
  };
  const go = (hash: string) => (e: MouseEvent) => { e.preventDefault(); scrollTo(hash); };

  return <div className="app" ref={root}>
    <a className="skip-link" href="#work">Skip to projects</a>

    <header className="site-header">
      <a className="logo" href="#top" onClick={go('#top')} aria-label="Abdullah Fida, back to top">Abdullah Fida</a>
      <nav className="nav" aria-label="Main">{navLinks.map(([href, label]) => <a key={href} href={href} onClick={go(href)}>{label}</a>)}</nav>
      <div className="header-right">
        <button className="btn btn-dark btn-small header-cta" onClick={() => setContact(true)}>Contact</button>
        <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
    </header>
    <div className={`mobile-menu ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen}>
      {navLinks.map(([href, label], i) => <a key={href} href={href} tabIndex={menuOpen ? 0 : -1} style={{ transitionDelay: `${0.05 * i + 0.1}s` }} onClick={go(href)}>{label}</a>)}
      <button className="btn btn-dark" tabIndex={menuOpen ? 0 : -1} onClick={() => { setMenuOpen(false); setContact(true); }}>Start a project</button>
    </div>

    <main id="top">
      {/* Hero */}
      <section className="hero" ref={hero} aria-labelledby="hero-title">
        <div className={`hero-canvas ${sceneReady ? 'is-ready' : ''}`}>
          <SceneBoundary fallback={<div className="hero-fallback"><img src="/assets/previews/tcg-nl-desktop.jpg" alt="" /></div>}>
            <Suspense fallback={null}>
              <HeroScene onOpen={openProject} onReady={onSceneReady} active={heroActive && !selected && !contact} motion={!reducedMotion} />
            </Suspense>
          </SceneBoundary>
        </div>
        <div className="hero-copy">
          <div className="hero-main">
            <p className="hero-name" data-intro>Abdullah Fida, Shopify and full-stack developer</p>
            <h1 id="hero-title">I build Shopify stores, web apps and the automation between them.</h1>
            <div className="hero-actions" data-intro>
              <a className="btn btn-dark" href="#work" onClick={go('#work')}>View work</a>
              <button className="btn btn-line" onClick={() => setContact(true)}>Get in touch</button>
            </div>
          </div>
          <div className="hero-side">
            <div className="hero-stat" data-intro><strong>€300k</strong><span>monthly sales across the TCG Plug stores I manage</span></div>
            <HeroCaption />
          </div>
        </div>
      </section>

      {/* Clients */}
      <section className="clients" aria-label="Clients and projects">
        <p className="eyebrow">Clients and projects</p>
        <ul>{clients.map(c => <li key={c} data-reveal>{c}</li>)}</ul>
      </section>

      {/* Intro */}
      <section className="intro">
        <p className="eyebrow" data-reveal>Introduction</p>
        <p className="intro-text">I work with store owners and small teams. Most of my week goes into running two Shopify stores for The TCG Plug. The rest goes into websites, a gym access system, and agents that write, clip and publish content.</p>
      </section>

      {/* Work */}
      <section className="work" id="work" aria-labelledby="work-title">
        <SectionHead id="work-title" label="Selected work" title="Stores and websites" text="Live projects I've built or manage. Open any of them for the details and a preview." />
        <div className="cases">
          {workProjects.map((p, i) => {
            const preview = projectPreviews(p.id)[0];
            return <article className={`case ${i === 0 ? 'case-featured' : ''}`} key={p.id}>
              <button className="case-media" onClick={() => setSelected(p)} aria-label={`Open ${p.title}`}>
                <img src={preview?.desktop || p.image} alt={`${p.title} homepage`} loading="lazy" width={1280} height={800} />
                {i === 0 && <span className="case-badge"><strong>€300k</strong> monthly sales</span>}
              </button>
              <div className="case-info" data-reveal>
                <div className="case-meta"><span>{String(i + 1).padStart(2, '0')}</span><span>{categoryLabels[p.category]}</span></div>
                <h3><button onClick={() => setSelected(p)}>{p.title}</button></h3>
                <p className="case-desc">{p.description}</p>
                <p className="case-role">{p.role}</p>
                <div className="case-links">
                  <button className="link" onClick={() => setSelected(p)}>Case study <ArrowRight size={15} /></button>
                  {p.url && <a className="link" href={p.url} target="_blank" rel="noreferrer">{preview ? new URL(preview.url).hostname.replace('www.', '') : 'Live site'} <ArrowUpRight size={15} /></a>}
                </div>
              </div>
            </article>;
          })}
        </div>
      </section>

      {/* Systems (dark) */}
      <section className="systems" id="systems" aria-labelledby="systems-title">
        <SectionHead id="systems-title" label="Systems and automation" title="Software that runs on its own" text="These projects don't have a public homepage. Each one has a short walkthrough you can try." />
        <div className="flow">
          {!reducedMotion && <SceneSlot className="flow-canvas">{active => <FlowScene active={active} />}</SceneSlot>}
          <ol className="flow-steps"><li>Trigger</li><li>Agent</li><li>Published</li></ol>
        </div>
        <div className="systems-grid">
          {systemProjects.map(p => <article className="system" key={p.id} data-reveal>
            <div className="pipeline" aria-hidden="true">
              {pipelines[p.id].map(({ label, Icon }) => <div className="pipe-node" key={label}><span><Icon size={18} strokeWidth={1.6} /></span><small>{label}</small></div>)}
              <i className="pipe-line"><b /></i>
            </div>
            <p className="system-status">{p.status}</p>
            <h3>{p.title}</h3>
            <p className="system-desc">{p.description}</p>
            <button className="link link-light" onClick={() => setSelected(p)}>Try the walkthrough <ArrowRight size={15} /></button>
          </article>)}
        </div>
        <button className="press" onClick={() => openProject('pressvane')} data-reveal>
          <span>PressVane</span>
          <strong>A news site where an AI agent writes and publishes the articles.</strong>
          <ArrowUpRight size={20} />
        </button>
      </section>

      {/* Services */}
      <section className="services" id="services" aria-labelledby="services-title">
        <SectionHead id="services-title" label="Services" title="What I can help with" />
        <div className="service-grid">
          {services.map((s, i) => <article className="service" key={s.title} data-reveal>
            <span className="service-n">{String(i + 1).padStart(2, '0')}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            <ul>{s.points.map(pt => <li key={pt}>{pt}</li>)}</ul>
          </article>)}
        </div>
      </section>

      {/* About */}
      <section className="about" id="about" aria-labelledby="about-title">
        <div className="about-head">
          <p className="eyebrow" data-reveal>About</p>
          <h2 id="about-title" data-split>I stay involved after launch.</h2>
        </div>
        <div className="about-body" data-reveal>
          <p className="about-lead">I work on the part customers see and the systems behind it.</p>
          <p>My work ranges from Shopify store management to membership access, publishing tools and custom web applications. I currently manage the two TCG Plug stores. Alongside store work, I build with the MERN stack and connect AI agents to real publishing and content workflows.</p>
          <p className="stack"><span>Tools</span>Shopify, React, Node.js, Express, MongoDB, TypeScript, Git, AI agents</p>
          <div className="about-links">
            <a className="link" href={profile.github} target="_blank" rel="noreferrer"><Github size={16} />GitHub <ArrowUpRight size={14} /></a>
            <a className="link" href={profile.linkedin} target="_blank" rel="noreferrer"><Linkedin size={16} />LinkedIn <ArrowUpRight size={14} /></a>
            <a className="link" href="/cv/index.html" target="_blank" rel="noreferrer"><FileText size={16} />CV <ArrowUpRight size={14} /></a>
          </div>
        </div>
        <dl className="stats">
          <div data-reveal><dt>€<span data-count="300">300</span>k</dt><dd>Monthly sales across the TCG Plug stores I manage</dd></div>
          <div data-reveal><dt><span data-count={projects.length}>{projects.length}</span></dt><dd>Stores, systems and automations shipped</dd></div>
          <div data-reveal><dt><span data-count="3">3</span></dt><dd>Markets: Netherlands, Pakistan and the UK</dd></div>
          <div data-reveal><dt><span data-count={activity.total}>{activity.total}</span></dt><dd>GitHub contributions in the past year</dd></div>
        </dl>
      </section>

      <GitHubActivity />

      {/* Contact (dark) */}
      <section className="contact" id="contact" aria-labelledby="contact-heading">
        <div className="contact-copy">
          <p className="eyebrow" data-reveal>Contact</p>
          <h2 id="contact-heading" data-split>Tell me about your project.</h2>
          <p className="contact-text" data-reveal>A new store, a custom system, or a task you'd like to stop doing by hand. Send a message on LinkedIn or put a short brief together.</p>
          <div className="contact-actions" data-reveal>
            <button className="btn btn-light" onClick={() => setContact(true)}>Write a project brief</button>
            <a className="btn btn-line-light" href={profile.linkedin} target="_blank" rel="noreferrer"><Linkedin size={16} />LinkedIn</a>
          </div>
        </div>
        {!reducedMotion && <SceneSlot className="contact-canvas">{active => <ShapesScene active={active} />}</SceneSlot>}
      </section>
    </main>

    <footer className="footer">
      <div className="footer-cv">
        <div><strong>CV</strong><span>Projects, skills and roles on two pages.</span></div>
        <div className="footer-cv-actions"><a className="link link-light" href="/cv/index.html" target="_blank" rel="noreferrer">View <ArrowUpRight size={14} /></a><a className="link link-light" href="/cv/abdullah-fida-cv.pdf" download="Abdullah-Fida-CV.pdf">Download PDF <ArrowUpRight size={14} /></a></div>
      </div>
      <div className="footer-row">
        <span>© {new Date().getFullYear()} Abdullah Fida</span>
        <div><a href={profile.github} target="_blank" rel="noreferrer">GitHub</a><a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn</a><a href="#top" onClick={go('#top')}>Back to top</a></div>
      </div>
    </footer>

    {selected && <ProjectModal project={selected} onClose={closeProject} onContact={() => { setSelected(null); setContact(true); }} />}
    {contact && <ContactModal onClose={closeContact} />}
  </div>;
}
