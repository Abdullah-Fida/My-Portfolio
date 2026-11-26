/** Mutable state shared between the DOM and the WebGL scenes, read every frame without re-rendering React. */
export const scene = {
  progress: 0, // 0 → 1 as the hero scrolls out of view
  velocity: 0, // raw scroll velocity from Lenis
  smoothVelocity: 0,
  rotation: 0,
  target: 0, // ring rotation the carousel is easing toward
  dragging: false,
  dragDelta: 0, // horizontal pixels dragged since the last frame
  dragDistance: 0,
  nudge: 0, // -1 / +1 requests from the prev/next buttons
  hovering: false,
  ringScale: 1,
  revealed: false, // set when the page reveals; 3D intros start from this moment
  pointerX: 0, // -1 … 1
  pointerY: 0,
};

type Listener<T> = (value: T) => void;
function channel<T>() {
  const set = new Set<Listener<T>>();
  return {
    emit: (v: T) => set.forEach(fn => fn(v)),
    on: (fn: Listener<T>) => { set.add(fn); return () => { set.delete(fn); }; },
  };
}

const hover = channel<string | null>();
export const setCursor = hover.emit;
export const onCursor = hover.on;

/** Index of the screen currently at the front of the ring. */
const focus = channel<number>();
export const setFocus = focus.emit;
export const onFocus = focus.on;
