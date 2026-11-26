import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Preload } from '@react-three/drei';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as THREE from 'three';
import { Ring } from './HeroScene';
import { Cluster, Pipeline, Studio } from './Scenes';
import { scene } from './store';

/**
 * One 3D world behind the whole page. The camera moves with the page scroll 1:1, so anything
 * placed at z = 0 stays glued to its DOM section, while objects at other depths drift with parallax.
 */
const FOV = 32;
const D = 15.5; // camera distance to the z = 0 "page" plane
const H = 2 * D * Math.tan(THREE.MathUtils.degToRad(FOV / 2)); // world units per viewport height

/* ———————————————— DOM anchoring ———————————————— */

type Box = { x: number; y: number; w: number; h: number; ok: boolean };
const measurers = new Set<() => void>();
let queued = false;
function remeasureAll() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; measurers.forEach(fn => fn()); });
}
if (typeof window !== 'undefined') {
  window.addEventListener('resize', remeasureAll);
  new ResizeObserver(remeasureAll).observe(document.documentElement);
  document.fonts?.ready.then(remeasureAll);
}

/** World-space box of a DOM element (centre, width, height), kept up to date on layout changes. */
function useAnchor(selector: string) {
  const box = useRef<Box>({ x: 0, y: 0, w: 0, h: 0, ok: false });
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector(selector);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const k = H / innerHeight;
      box.current = {
        x: (r.left + r.width / 2 - innerWidth / 2) * k,
        y: -(r.top + scrollY + r.height / 2 - innerHeight / 2) * k,
        w: r.width * k,
        h: r.height * k,
        ok: true,
      };
    };
    measure();
    measurers.add(measure);
    const late = setTimeout(measure, 1200);
    return () => { measurers.delete(measure); clearTimeout(late); };
  }, [selector]);
  return box;
}

const viewW = () => H * (innerWidth / innerHeight);

/** Places children on a DOM element. `layout` returns position offset and scale from the element box. */
function Anchor({ selector, layout, children }: {
  selector: string;
  layout: (b: Box, w: number) => { x?: number; y?: number; z?: number; s?: number; visible?: boolean };
  children: ReactNode;
}) {
  const box = useAnchor(selector);
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const b = box.current;
    if (!b.ok) { g.visible = false; return; }
    const l = layout(b, viewW());
    g.visible = l.visible ?? true;
    g.position.set(b.x + (l.x ?? 0), b.y + (l.y ?? 0), l.z ?? 0);
    g.scale.setScalar(l.s ?? 1);
  });
  return <group ref={group} visible={false}>{children}</group>;
}

/* ———————————————— Camera ———————————————— */

function Rig() {
  useFrame((state, delta) => {
    const s = scene;
    s.smoothVelocity = THREE.MathUtils.damp(s.smoothVelocity, THREE.MathUtils.clamp(s.velocity / 50, -1, 1), 4, delta);
    const cam = state.camera;
    // Exact, undamped: keeps z = 0 objects locked to the DOM.
    cam.position.y = -scrollY * (H / innerHeight);
    cam.position.x = THREE.MathUtils.damp(cam.position.x, s.pointerX * 0.12, 3, delta);
    cam.position.z = D;
  });
  return null;
}

/* ———————————————— Section pieces ———————————————— */

/** Wireframe orb with a glossy core, beside "Selected work". */
function Orb() {
  const shell = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const moons = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (shell.current) { shell.current.rotation.y = t * 0.15 + scrollY * 0.0008; shell.current.rotation.x = t * 0.07; }
    if (core.current) core.current.rotation.y -= delta * 0.3;
    if (moons.current) moons.current.rotation.y = t * 0.6;
  });
  return <group>
    <mesh ref={shell}>
      <icosahedronGeometry args={[1.7, 1]} />
      <meshBasicMaterial color="#7b8cff" wireframe transparent opacity={0.35} />
    </mesh>
    <mesh ref={core}>
      <icosahedronGeometry args={[0.95, 6]} />
      <meshPhysicalMaterial color="#1b1b1a" metalness={0.7} roughness={0.15} clearcoat={1} clearcoatRoughness={0.1} />
    </mesh>
    <group ref={moons} rotation={[0.4, 0, 0.2]}>
      {[0, 1, 2].map(i => <mesh key={i} position={[Math.cos(i * 2.09) * 2.3, 0, Math.sin(i * 2.09) * 2.3]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color="#a9b6ff" />
      </mesh>)}
    </group>
  </group>;
}

/** Three nested rings turning on different axes, beside "What I can help with". */
function Gyro() {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(state => {
    const t = state.clock.elapsedTime;
    const [a, b, c] = rings.current;
    if (a) { a.rotation.x = t * 0.5; a.rotation.y = t * 0.2; }
    if (b) { b.rotation.y = t * 0.6; b.rotation.z = t * 0.25; }
    if (c) { c.rotation.x = -t * 0.4; c.rotation.z = t * 0.5; }
  });
  return <group>
    {[1.6, 1.25, 0.9].map((r, i) => <mesh key={r} ref={el => { rings.current[i] = el; }}>
      <torusGeometry args={[r, 0.055, 24, 120]} />
      <meshPhysicalMaterial color={i === 1 ? '#7b8cff' : '#d8d6d0'} metalness={i === 1 ? 0.2 : 0.9} roughness={0.2} clearcoat={1} />
    </mesh>)}
    <mesh><sphereGeometry args={[0.28, 32, 32]} /><meshPhysicalMaterial color="#7b8cff" roughness={0.2} clearcoat={1} /></mesh>
  </group>;
}

/* ———————————————— Ambient depth ———————————————— */

function seeded(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

/** Glossy shapes scattered down the whole page at different depths, hugging the edges. */
function Ambient() {
  const [length, setLength] = useState(() => Math.round(document.documentElement.scrollHeight * (H / innerHeight)));
  useEffect(() => {
    const measure = () => setLength(Math.round(document.documentElement.scrollHeight * (H / innerHeight)));
    measure();
    measurers.add(measure);
    return () => { measurers.delete(measure); };
  }, []);

  const geometries = useMemo(() => [
    new RoundedBoxGeometry(1, 1, 1, 4, 0.18),
    new THREE.TorusGeometry(0.6, 0.22, 20, 64),
    new THREE.IcosahedronGeometry(0.7, 0),
  ], []);
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({ metalness: 0.5, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 }), []);
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const items = useMemo(() => {
    if (!length) return [];
    const rand = seeded(7);
    const count = Math.max(12, Math.round(length / 4));
    return Array.from({ length: count }, (_, i) => {
      const side = i % 2 ? 1 : -1;
      return {
        kind: i % 3,
        x: side * (0.8 + rand() * 0.35),   // fraction of half the view width, at the page edges
        y: -(i / count) * length + (rand() - 0.5) * 3 - 6,
        z: -5 - rand() * 9,
        s: 0.35 + rand() * 0.55,
        rx: rand() * 6, ry: rand() * 6,
        spin: 0.1 + rand() * 0.3,
        accent: rand() < 0.22,
      };
    });
  }, [length]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    const ink = new THREE.Color('#2a2a28');
    const accent = new THREE.Color('#7b8cff');
    meshes.current.forEach((mesh, kind) => {
      if (!mesh) return;
      let n = 0;
      items.forEach(it => { if (it.kind === kind) mesh.setColorAt(n++, it.accent ? accent : ink); });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [items]);

  useFrame(state => {
    const t = state.clock.elapsedTime;
    const halfW = viewW() / 2;
    const counters = [0, 0, 0];
    items.forEach(it => {
      const mesh = meshes.current[it.kind];
      if (!mesh) return;
      // Deeper objects need to sit wider to appear at the screen edge.
      const depthScale = (D - it.z) / D;
      dummy.position.set(it.x * halfW * depthScale, it.y * depthScale + Math.sin(t * 0.5 + it.rx) * 0.25, it.z);
      dummy.rotation.set(it.rx + t * it.spin, it.ry + t * it.spin * 0.7, 0);
      dummy.scale.setScalar(it.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(counters[it.kind]++, dummy.matrix);
    });
    meshes.current.forEach(m => { if (m) m.instanceMatrix.needsUpdate = true; });
  });

  if (!items.length) return null;
  return <>
    {geometries.map((geo, kind) => {
      const n = items.filter(it => it.kind === kind).length;
      return <instancedMesh key={`${kind}-${n}`} ref={el => { meshes.current[kind] = el; }} args={[geo, material, n]} frustumCulled={false} />;
    })}
  </>;
}

/** Faint dust through the full depth of the page. */
function Dust() {
  const geo = useMemo(() => {
    const rand = seeded(3);
    const n = 900;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([(rand() - 0.5) * 40, -rand() * 160 + 6, -2 - rand() * 18], i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  return <points geometry={geo}>
    <pointsMaterial size={0.035} color="#a9b6ff" transparent opacity={0.35} sizeAttenuation depthWrite={false} />
  </points>;
}

/* ———————————————— World ———————————————— */

/** Fires once shaders are compiled, textures uploaded and two frames drawn: nothing pops in afterwards. */
function Ready({ onReady }: { onReady: () => void }) {
  const { gl, scene: root, camera } = useThree();
  useEffect(() => {
    gl.compile(root, camera);
    let a = 0; let b = 0;
    a = requestAnimationFrame(() => { b = requestAnimationFrame(() => onReady()); });
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
  }, [gl, root, camera, onReady]);
  return null;
}

export default function World({ onOpen, onReady, paused, motion }: {
  onOpen: (id: string) => void; onReady: () => void; paused: boolean; motion: boolean;
}) {
  const [dpr, setDpr] = useState(1.5);
  return (
    <Canvas
      eventSource={document.getElementById('root')!}
      eventPrefix="client"
      frameloop={paused ? 'never' : 'always'}
      dpr={[1, dpr]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, D], fov: FOV, near: 0.1, far: 80 }}
      onPointerMissed={() => { /* clicks on empty space do nothing */ }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} />
      <Rig />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 8]} intensity={1.1} />
      <Studio />

      {/* Hero: the project ring, centred a little above the middle of the hero. */}
      <Anchor selector=".hero" layout={(b, w) => {
        const s = THREE.MathUtils.clamp(w / 7.2, 0.5, 0.86);
        scene.ringScale = s;
        return { y: b.h * (w < 7 ? 0.2 : 0.235), s };
      }}>
        <Ring onOpen={onOpen} motion={motion} />
      </Anchor>

      <Anchor selector=".work .section-head" layout={(_, w) => ({ x: w / 2 - 3.2 - _.x, y: -0.3, s: 1, visible: w > 9 })}>
        <Orb />
      </Anchor>

      <Anchor selector=".flow" layout={(b) => ({ s: Math.min(b.w / 19, b.h / 4.4) })}>
        <Pipeline />
      </Anchor>

      <Anchor selector=".services .section-head" layout={(b, w) => ({ x: w / 2 - 3 - b.x, y: 0.45, s: 0.9, visible: w > 9 })}>
        <Gyro />
      </Anchor>

      <Anchor selector=".contact-canvas" layout={(b) => ({ s: Math.min(b.h / 7.2, b.w / 7.4) })}>
        <Cluster />
      </Anchor>

      <Ambient />
      <Dust />
      <Preload all />
      <Ready onReady={onReady} />
    </Canvas>
  );
}
