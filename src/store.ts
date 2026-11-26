/** Mutable state shared between the DOM and the WebGL scene, read every frame without re-rendering React. */
export const scene = {
  progress: 0, // 0 → 1 as the hero scrolls out of view
  velocity: 0, // raw scroll velocity from Lenis
  smoothVelocity: 0,
  rotation: 0,
  dragVelocity: 0,
  dragDistance: 0,
  pointerX: 0, // -1 … 1
  pointerY: 0,
};

type Listener = (label: string | null) => void;
const listeners = new Set<Listener>();
export function setCursor(label: string | null) { listeners.forEach(fn => fn(label)); }
export function onCursor(fn: Listener) { listeners.add(fn); return () => { listeners.delete(fn); }; }
