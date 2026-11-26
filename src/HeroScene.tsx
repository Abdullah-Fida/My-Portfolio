import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { heroPanels } from './content';
import { scene as sceneState, setCursor, setFocus } from './store';

const PANEL_W = 3.4;
const PANEL_H = 2.2;
const GAP = 0.55;
const COUNT = heroPanels.length;
const STEP = (Math.PI * 2) / COUNT;
const RADIUS = (COUNT * (PANEL_W + GAP)) / (Math.PI * 2);
const FLOOR = -PANEL_H / 2 - 0.12;
const DWELL = 3.2; // seconds each project stays at the front
const BG = new THREE.Color('#111110');
const ACCENT = new THREE.Color('#7b8cff');

/** A plane bent onto the ring's cylinder, so raycasting matches what you see. */
function useBentPlane() {
  return useMemo(() => {
    const geo = new THREE.PlaneGeometry(PANEL_W, PANEL_H, 36, 6);
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
    p.z += sin(uv.y * 3.14159) * uVelocity * 0.25;
    p.z += uHover * 0.12 * arch;
    p.y += sin(uTime * 0.8 + uIndex * 0.8 + uv.x * 2.0) * 0.035;
    // Intro: screens unfurl from thin strips.
    p.y *= mix(0.02, 1.0, uIntro);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHover;
  uniform float uFocus;
  uniform float uFacing;
  uniform float uImageAspect;
  uniform float uFar;
  uniform float uIntro;
  uniform float uTime;
  uniform float uReflect;
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
    vec2 p = (vUv - 0.5) * size;
    float d = roundBox(p, size * 0.5, 0.09);
    float aa = fwidth(d);
    float alpha = 1.0 - smoothstep(-aa, aa, d);
    if (alpha < 0.01) discard;

    // Browser chrome: a slim bar with three dots and an address pill.
    float barH = 0.15;
    float top = size.y * 0.5 - p.y;
    vec3 col;
    if (top < barH) {
      col = vec3(0.012);
      for (int i = 0; i < 3; i++) {
        vec2 c = vec2(-size.x * 0.5 + 0.17 + float(i) * 0.12, size.y * 0.5 - barH * 0.5);
        col = mix(col, vec3(0.07), 1.0 - smoothstep(0.028, 0.034, length(p - c)));
      }
      float pill = roundBox(p - vec2(0.0, size.y * 0.5 - barH * 0.5), vec2(0.62, 0.035), 0.035);
      col = mix(col, vec3(0.032), 1.0 - smoothstep(-0.006, 0.0, pill));
    } else {
      // Image below the bar, object-fit: cover, slight zoom-out when in focus.
      vec2 area = vec2(size.x, size.y - barH);
      vec2 uv = vec2(vUv.x, (p.y + size.y * 0.5) / area.y) - 0.5;
      float planeAspect = area.x / area.y;
      if (uImageAspect > planeAspect) uv.x *= planeAspect / uImageAspect;
      else uv.y *= uImageAspect / planeAspect;
      uv *= 1.0 - 0.04 * max(uHover, uFocus);
      col = texture2D(uMap, uv + 0.5).rgb;
    }

    // Side screens are muted and dimmer; the front one is in full colour.
    float lit = max(uHover, uFocus);
    float grey = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(grey), col, mix(0.45, 1.0, lit));
    col *= mix(0.42, 1.0, smoothstep(-0.3, 1.0, uFacing)) * mix(0.85, 1.0, lit);

    // A soft light sheen sweeps across the front screen.
    float band = fract((vUv.x * 0.8 + vUv.y * 0.35) - uTime * 0.12);
    col += smoothstep(0.0, 0.08, band) * smoothstep(0.2, 0.08, band) * 0.07 * uFocus;

    // Hairline edge; accent when hovered.
    float edge = smoothstep(-0.02, -0.005, d);
    col = mix(col, mix(vec3(1.0), uAccent, uHover), edge * mix(0.12, 0.9, uHover));

    bool front = uReflect > 0.5 ? !gl_FrontFacing : gl_FrontFacing;
    if (!front) col = mix(uBg, vec3(0.2), 0.35);

    col = mix(col, uBg, smoothstep(uFar - 8.0, uFar, vDepth) * 0.9);

    float a = alpha * smoothstep(0.0, 0.25, uIntro);
    // Reflection fades out with distance from the floor.
    if (uReflect > 0.5) a *= smoothstep(0.55, 0.0, vUv.y) * 0.22;
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

function Panel({ index, image, project, label, geometry, onOpen, reflect = false }: {
  index: number; image: string; project: string; label: string; geometry: THREE.BufferGeometry; onOpen: (id: string) => void; reflect?: boolean;
}) {
  const texture = useTexture(image);
  const material = useRef<THREE.ShaderMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const hover = useRef(0);
  const target = useRef(0);
  const focus = useRef(0);
  const start = useRef<number | null>(null);
  const angle = index * STEP;

  const uniforms = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const img = texture.image as { width: number; height: number };
    return {
      uMap: { value: texture },
      uHover: { value: 0 },
      uFocus: { value: 0 },
      uFacing: { value: 0 },
      uVelocity: { value: 0 },
      uIntro: { value: 0 },
      uTime: { value: 0 },
      uIndex: { value: index },
      uReflect: { value: reflect ? 1 : 0 },
      uImageAspect: { value: img.width / img.height },
      uFar: { value: 20 },
      uBg: { value: BG },
      uAccent: { value: ACCENT },
    };
  }, [texture, index, reflect]);

  useFrame((state, delta) => {
    const u = material.current?.uniforms;
    if (!u) return;
    const t = state.clock.elapsedTime;
    const facing = Math.cos(sceneState.rotation + angle);
    focus.current = THREE.MathUtils.damp(focus.current, THREE.MathUtils.smoothstep(facing, 0.93, 1), 6, delta);
    hover.current = THREE.MathUtils.damp(hover.current, target.current, 7, delta);
    u.uHover.value = hover.current;
    u.uFocus.value = focus.current;
    u.uFacing.value = facing;
    u.uVelocity.value = sceneState.smoothVelocity;
    u.uTime.value = t;
    if (sceneState.revealed && start.current === null) start.current = t;
    const since = start.current === null ? 0 : t - start.current;
    u.uIntro.value = THREE.MathUtils.smootherstep(since, 0.15 + index * 0.07, 1.25 + index * 0.07);
    u.uFar.value = state.camera.position.z + RADIUS * sceneState.ringScale;
    // The front screen steps slightly out of the ring.
    if (mesh.current) mesh.current.position.z = RADIUS + focus.current * 0.45 + hover.current * 0.1;
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    target.current = 1;
    sceneState.hovering = true;
    setCursor(label);
    document.body.style.cursor = 'pointer';
  };
  const out = () => {
    target.current = 0;
    sceneState.hovering = false;
    setCursor(null);
    document.body.style.cursor = '';
  };

  return (
    <group rotation={[0, angle, 0]}>
      <mesh
        ref={mesh}
        geometry={geometry}
        position={[0, 0, RADIUS]}
        raycast={reflect ? () => null : undefined}
        onPointerOver={reflect ? undefined : over}
        onPointerOut={reflect ? undefined : out}
        onClick={reflect ? undefined : e => {
          e.stopPropagation();
          if (sceneState.dragDistance > 6) return;
          if ((e.nativeEvent.target as HTMLElement | null)?.closest?.('a, button, dialog, input, textarea, select')) return;
          out();
          onOpen(project);
        }}
      >
        <shaderMaterial ref={material} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} side={THREE.DoubleSide} forceSinglePass transparent depthWrite={!reflect} />
      </mesh>
    </group>
  );
}

/** Soft accent glow on the floor under the ring. */
function FloorGlow() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(123,140,255,0.18)');
    grad.addColorStop(0.5, 'rgba(123,140,255,0.06)');
    grad.addColorStop(1, 'rgba(123,140,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR - 0.01, 0]} raycast={() => null}>
    <planeGeometry args={[RADIUS * 3.2, RADIUS * 3.2]} />
    <meshBasicMaterial map={tex} transparent depthWrite={false} />
  </mesh>;
}

export function Ring({ onOpen, motion }: { onOpen: (id: string) => void; motion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const mirror = useRef<THREE.Group>(null);
  const geometry = useBentPlane();
  const timer = useRef(0);
  const wasDragging = useRef(false);
  const lastFocus = useRef(-1);

  useFrame((state, delta) => {
    const s = sceneState;
    const t = state.clock.elapsedTime;
    // Carousel: dwell on a project, then glide to the next. Drag and buttons override.
    if (s.dragging) {
      s.target += s.dragDelta * 0.005;
      timer.current = 0;
    } else if (wasDragging.current) {
      s.target = Math.round(s.target / STEP) * STEP;
    }
    s.dragDelta = 0;
    wasDragging.current = s.dragging;

    if (s.nudge) {
      s.target = Math.round(s.target / STEP) * STEP - s.nudge * STEP;
      s.nudge = 0;
      timer.current = 0;
    }
    if (!s.dragging && !s.hovering && t > 1.2) {
      timer.current += delta;
      if (timer.current > (motion ? DWELL : DWELL * 2)) {
        timer.current = 0;
        s.target = Math.round(s.target / STEP) * STEP - STEP;
      }
    }
    s.rotation = THREE.MathUtils.damp(s.rotation, s.target, s.dragging ? 12 : motion ? 2.6 : 8, delta);
    if (spin.current) spin.current.rotation.y = s.rotation;
    if (mirror.current) mirror.current.rotation.y = s.rotation;

    const focus = ((Math.round(-s.rotation / STEP) % COUNT) + COUNT) % COUNT;
    if (focus !== lastFocus.current) { lastFocus.current = focus; setFocus(focus); }

    if (group.current) {
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, 0.3 + s.pointerY * 0.04 + s.progress * 0.25, 2.5, delta);
      group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, s.pointerX * 0.025, 2.5, delta);
      group.current.position.y = Math.sin(t * 0.6) * 0.05;
    }
  });

  const panels = (reflect: boolean) => heroPanels.map((panel, i) => <Panel key={i} index={i} {...panel} geometry={geometry} onOpen={onOpen} reflect={reflect} />);

  return (
    <group ref={group}>
      <group ref={spin}>{panels(false)}</group>
      {/* Mirror image under the floor line for a glossy-floor reflection. */}
      <group position={[0, FLOOR * 2, 0]} scale={[1, -1, 1]}>
        <group ref={mirror}>{panels(true)}</group>
      </group>
      <FloorGlow />
    </group>
  );
}

