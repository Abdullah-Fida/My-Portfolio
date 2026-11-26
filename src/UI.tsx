import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { onCursor } from './store';

/** Counts up while the hero textures load, then wipes away. Never blocks longer than ~4s. */
export function Preloader({ sceneReady, onDone }: { sceneReady: boolean; onDone: () => void }) {
  const [progress, setProgress] = useState(12);
  useEffect(() => { const t = setInterval(() => setProgress(p => Math.min(90, p + 9)), 180); return () => clearInterval(t); }, []);
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const value = useRef({ n: 0 });
  const [done, setDone] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => { const t = setTimeout(() => setTimedOut(true), 4000); return () => clearTimeout(t); }, []);

  const target = sceneReady || timedOut ? 100 : Math.min(92, Math.max(12, progress));
  useEffect(() => {
    const tween = gsap.to(value.current, {
      n: target, duration: target === 100 ? 0.6 : 1.2, ease: 'power2.out',
      onUpdate: () => { if (count.current) count.current.textContent = String(Math.round(value.current.n)).padStart(3, '0'); },
      onComplete: () => { if (target === 100) setDone(true); },
    });
    return () => { tween.kill(); };
  }, [target]);

  useEffect(() => {
    if (!done || !root.current) return;
    const tl = gsap.timeline({ onComplete: () => setGone(true) });
    tl.to(root.current.querySelector('.preloader-inner'), { yPercent: -40, opacity: 0, duration: 0.5, ease: 'power3.in' })
      .to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, '-=0.15')
      .add(onDone, '-=0.55');
    return () => { tl.kill(); };
  }, [done, onDone]);

  if (gone) return null;
  return <div className={`preloader ${done ? 'is-done' : ''}`} ref={root} aria-hidden="true">
    <div className="preloader-inner">
      <span className="preloader-name">Abdullah Fida</span>
      <span className="preloader-count" ref={count}>000</span>
      <span className="preloader-tag">Shopify · Web apps · AI automation</span>
    </div>
  </div>;
}

/** A dot that trails the pointer and expands into a label over interactive things. Desktop only. */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches || !dot.current) return;
    document.documentElement.classList.add('has-cursor');
    const xTo = gsap.quickTo(dot.current, 'x', { duration: 0.35, ease: 'power3' });
    const yTo = gsap.quickTo(dot.current, 'y', { duration: 0.35, ease: 'power3' });
    const move = (e: PointerEvent) => { xTo(e.clientX); yTo(e.clientY); };
    const over = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('a, button, [data-cursor], select, input, textarea, label');
      setHovering(!!el);
      const text = el?.dataset.cursor;
      if (text) setLabel(text);
      else if (el) setLabel(null);
    };
    const leave = () => setHovering(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerover', over);
    document.addEventListener('pointerleave', leave);
    const off = onCursor(next => { setLabel(next); setHovering(!!next); });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', over);
      document.removeEventListener('pointerleave', leave);
      document.documentElement.classList.remove('has-cursor');
      off();
    };
  }, []);

  return <div className={`cursor ${hovering ? 'is-hover' : ''} ${label ? 'has-label' : ''}`} ref={dot} aria-hidden="true">
    <span>{label}</span>
  </div>;
}

/** Pulls an element slightly toward the pointer. */
export function useMagnetic<T extends HTMLElement>(strength = 0.3) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => { xTo(0); yTo(0); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [strength]);
  return ref;
}
