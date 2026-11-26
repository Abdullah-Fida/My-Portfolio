import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { heroPanels } from './content';
import { scene as sceneState, setCursor } from './store';

const PANEL_W = 3.2;
const PANEL_H = 2;
const GAP = 0.5;
const COUNT = heroPanels.length;
const RADIUS = (COUNT * (PANEL_W + GAP)) / (Math.PI * 2);
const BG = new THREE.Color('#111110');
const ACCENT = new THREE.Color('#7b8cff');

/** A plane bent onto the ring's cylinder, so raycasting matches what you see. */
function useBentPlane() {
  return useMemo(() => {
    const geo = new THREE.PlaneGeometry(PANEL_W, PANEL_H, 32, 6);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const theta = pos.getX(i) / RADIUS;
      pos.setX(i, Math.sin(theta) * RADIUS);
      pos.setZ(i, Math.cos(theta) * RADIUS - RADIUS);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
}

const vertex = /* glsl */ `
  uniform float uVelocity;
  uniform float uHover;
  uniform float uIntro;
  uniform float uTime;
  uniform float uIndex;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec3 p = position;
    float arch = sin(uv.x * 3.14159) * sin(uv.y * 3.14159);
    // Scroll speed flexes the screens like paper; hover lifts them toward you.
    p.z += sin(uv.y * 3.14159) * uVelocity * 0.25;
    p.z += uHover * 0.16 * arch;
    // A slow wave travels across the ring.
    p.y += sin(uTime * 0.9 + uIndex * 0.8 + uv.x * 2.0) * 0.06;
    // Intro: screens unfurl from flat strips.
    p.y *= mix(0.02, 1.0, uIntro);
    p.z -= (1.0 - uIntro) * 2.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHover;
  uniform float uImageAspect;
  uniform float uFar;
  uniform float uIntro;
  uniform vec3 uBg;
  uniform vec3 uAccent;
  varying vec2 vUv;
  varying float vDepth;

  float roundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 size = vec2(${PANEL_W.toFixed(2)}, ${PANEL_H.toFixed(2)});
    float d = roundBox((vUv - 0.5) * size, size * 0.5, 0.08);
    float aa = fwidth(d);
    float alpha = 1.0 - smoothstep(-aa, aa, d);
    if (alpha < 0.01) discard;

    float planeAspect = size.x / size.y;
    vec2 uv = vUv - 0.5;
    if (uImageAspect > planeAspect) uv.x *= planeAspect / uImageAspect;
    else uv.y *= uImageAspect / planeAspect;
    uv *= 1.0 - 0.05 * uHover;
    vec3 col = texture2D(uMap, uv + 0.5).rgb;

    float grey = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(grey), col, mix(0.7, 1.0, uHover));

    float edge = smoothstep(-0.018, -0.004, d);
    col = mix(col, mix(vec3(1.0), uAccent, uHover), edge * mix(0.1, 0.9, uHover));

    if (!gl_FrontFacing) col = mix(uBg, vec3(0.2), 0.35);

    col = mix(col, uBg, smoothstep(uFar - 8.0, uFar, vDepth) * 0.88);
    col = mix(uAccent, col, smoothstep(0.0, 0.6, uIntro));
    gl_FragColor = vec4(col, alpha * smoothstep(0.0, 0.25, uIntro));
    #include <colorspace_fragment>
  }
`;

function Panel({ index, image, project, label, geometry, onOpen }: {
  index: number; image: string; project: string; label: string; geometry: THREE.BufferGeometry; onOpen: (id: string) => void;
}) {
  const texture = useTexture(image);
  const material = useRef<THREE.ShaderMaterial>(null);
  const hover = useRef(0);
  const target = useRef(0);
  const angle = (index / COUNT) * Math.PI * 2;

  const uniforms = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.generateMipmaps = true;
    const img = texture.image as { width: number; height: number };
    return {
      uMap: { value: texture },
      uHover: { value: 0 },
      uVelocity: { value: 0 },
      uIntro: { value: 0 },
      uTime: { value: 0 },
      uIndex: { value: index },
      uImageAspect: { value: img.width / img.height },
      uFar: { value: 20 },
      uBg: { value: BG },
      uAccent: { value: ACCENT },
    };
  }, [texture, index]);

  useFrame((state, delta) => {
    hover.current = THREE.MathUtils.damp(hover.current, target.current, 7, delta);
    const u = material.current?.uniforms;
    if (!u) return;
    const t = state.clock.elapsedTime;
    u.uHover.value = hover.current;
    u.uVelocity.value = sceneState.smoothVelocity;
    u.uTime.value = t;
    u.uIntro.value = THREE.MathUtils.smootherstep(t, index * 0.06, 0.9 + index * 0.06);
    u.uFar.value = state.camera.position.z + RADIUS;
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    target.current = 1;
    setCursor(label);
    document.body.style.cursor = 'pointer';
  };
  const out = () => {
    target.current = 0;
    setCursor(null);
    document.body.style.cursor = '';
  };

  return (
    <group rotation={[0, angle, 0]}>
      <mesh
        geometry={geometry}
        position={[0, 0, RADIUS]}
        onPointerOver={over}
        onPointerOut={out}
        onClick={e => {
          e.stopPropagation();
          if (sceneState.dragDistance > 6) return;
          out();
          onOpen(project);
        }}
      >
        <shaderMaterial ref={material} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} side={THREE.DoubleSide} transparent />
      </mesh>
    </group>
  );
}

/** Soft contact shadow on an invisible floor under the ring. */
function FloorShadow() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(123,140,255,0.16)');
    grad.addColorStop(0.55, 'rgba(123,140,255,0.05)');
    grad.addColorStop(1, 'rgba(123,140,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.7, 0]}>
    <planeGeometry args={[RADIUS * 2.9, RADIUS * 2.9]} />
    <meshBasicMaterial map={tex} transparent depthWrite={false} />
  </mesh>;
}

function Ring({ onOpen, motion }: { onOpen: (id: string) => void; motion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const geometry = useBentPlane();
  const { camera, size } = useThree();
  const narrow = size.width < 760;

  useFrame((state, delta) => {
    const s = sceneState;
    const t = state.clock.elapsedTime;
    s.smoothVelocity = THREE.MathUtils.damp(s.smoothVelocity, THREE.MathUtils.clamp(s.velocity / 50, -1, 1), 4, delta);
    // Intro spin that settles into a slow drift.
    const introBoost = motion ? Math.max(0, 1.1 - t) * 1.2 : 0;
    s.rotation += delta * ((motion ? 0.06 : 0.012) + introBoost) + s.smoothVelocity * delta * 0.9 + s.dragVelocity;
    s.dragVelocity *= Math.pow(0.03, delta);
    if (spin.current) spin.current.rotation.y = s.rotation;

    if (group.current) {
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, 0.13 + s.pointerY * 0.05 + s.progress * 0.25, 2.5, delta);
      group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, -0.05 + s.pointerX * 0.035, 2.5, delta);
      group.current.position.y = THREE.MathUtils.damp(group.current.position.y, (narrow ? 1.6 : 1.1) + Math.sin(t * 0.6) * 0.08, 2, delta);
    }

    const p = s.progress;
    camera.position.z = THREE.MathUtils.damp(camera.position.z, (narrow ? 17.5 : 15) + p * 4, 3, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 1.3 + p * 2.4, 3, delta);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, s.pointerX * 0.4, 3, delta);
    camera.lookAt(0, narrow ? -1.2 : -0.75, 0);
  });

  return (
    <group ref={group} position={[0, narrow ? 1.6 : 1.1, 0]}>
      <group ref={spin}>
        {heroPanels.map((panel, i) => <Panel key={i} index={i} {...panel} geometry={geometry} onOpen={onOpen} />)}
      </group>
      <FloorShadow />
    </group>
  );
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady(); }, [onReady]);
  return null;
}

export default function HeroScene({ onOpen, onReady, active, motion }: {
  onOpen: (id: string) => void; onReady: () => void; active: boolean; motion: boolean;
}) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 1.3, 15], fov: 32, near: 0.1, far: 60 }}
      onPointerMissed={() => setCursor(null)}
    >
      <Ring onOpen={onOpen} motion={motion} />
      <ReadySignal onReady={onReady} />
    </Canvas>
  );
}
