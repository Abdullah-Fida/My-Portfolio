import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { heroPanels } from './content';
import { scene as sceneState, setCursor } from './store';

const PANEL_W = 3.2;
const PANEL_H = 2;
const GAP = 0.42;
const COUNT = heroPanels.length;
const RADIUS = (COUNT * (PANEL_W + GAP)) / (Math.PI * 2);

/** A plane bent to sit on the surface of the ring's cylinder, so raycasting matches what you see. */
function useBentPlane() {
  return useMemo(() => {
    const geo = new THREE.PlaneGeometry(PANEL_W, PANEL_H, 48, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const theta = x / RADIUS;
      pos.setX(i, Math.sin(theta) * RADIUS);
      pos.setZ(i, Math.cos(theta) * RADIUS - RADIUS);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
}

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uVelocity;
  uniform float uHover;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec3 p = position;
    float centered = uv.x - 0.5;
    // Scroll speed flexes the screens; hover lifts them gently toward the viewer.
    p.z += sin(uv.y * 3.14159) * uVelocity * 0.35;
    p.y += sin(centered * 3.0 + uTime * 0.8) * 0.03;
    p.z += uHover * 0.18 * sin(uv.x * 3.14159) * sin(uv.y * 3.14159);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHover;
  uniform float uVelocity;
  uniform float uImageAspect;
  uniform vec3 uAccent;
  uniform float uFar;
  varying vec2 vUv;
  varying float vDepth;

  float roundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 size = vec2(${PANEL_W.toFixed(2)}, ${PANEL_H.toFixed(2)});
    float d = roundBox((vUv - 0.5) * size, size * 0.5, 0.1);
    float aa = fwidth(d);
    float alpha = 1.0 - smoothstep(-aa, aa, d);
    if (alpha < 0.01) discard;

    // object-fit: cover, plus a slight zoom-out on hover.
    float planeAspect = size.x / size.y;
    vec2 uv = vUv - 0.5;
    if (uImageAspect > planeAspect) uv.x *= planeAspect / uImageAspect;
    else uv.y *= uImageAspect / planeAspect;
    uv *= 1.0 - 0.07 * uHover;
    uv += 0.5;

    float shift = uVelocity * 0.012;
    vec3 col = vec3(
      texture2D(uMap, uv + vec2(shift, 0.0)).r,
      texture2D(uMap, uv).g,
      texture2D(uMap, uv - vec2(shift, 0.0)).b
    );

    // Dimmed at rest, full brightness on hover.
    col *= mix(0.62, 1.05, uHover);
    float vignette = smoothstep(0.85, 0.25, length(vUv - 0.5));
    col *= mix(0.7, 1.0, vignette);

    // Thin accent rim on hover.
    float rim = smoothstep(-0.045, -0.012, d);
    col = mix(col, uAccent, rim * uHover * 0.9);

    if (!gl_FrontFacing) col = col * 0.16 + vec3(0.02);
    // Depth fade into the page background.
    col = mix(col, vec3(0.0044), smoothstep(uFar - 9.0, uFar, vDepth) * 0.92);
    gl_FragColor = vec4(col, alpha);
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
    texture.anisotropy = 8;
    const img = texture.image as { width: number; height: number };
    return {
      uMap: { value: texture },
      uTime: { value: 0 },
      uHover: { value: 0 },
      uVelocity: { value: 0 },
      uImageAspect: { value: img.width / img.height },
      uAccent: { value: new THREE.Color('#ff5b2e') },
      uFar: { value: 20 },
    };
  }, [texture]);

  useFrame((state, delta) => {
    hover.current = THREE.MathUtils.damp(hover.current, target.current, 6, delta);
    if (!material.current) return;
    material.current.uniforms.uHover.value = hover.current;
    material.current.uniforms.uTime.value = state.clock.elapsedTime + index;
    material.current.uniforms.uVelocity.value = sceneState.smoothVelocity;
    material.current.uniforms.uFar.value = state.camera.position.z + RADIUS + 1;
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    target.current = 1;
    setCursor(`View ${label}`);
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
        <shaderMaterial
          ref={material}
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          side={THREE.DoubleSide}
          transparent
        />
      </mesh>
    </group>
  );
}

function Dust() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const count = 700;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 6 + Math.random() * 10;
      const t = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 9;
      arr.set([Math.cos(t) * r, y, Math.sin(t) * r], i * 3);
    }
    return arr;
  }, []);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.015; });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.028} color="#f3d7c8" transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Ring({ onOpen, motion }: { onOpen: (id: string) => void; motion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const geometry = useBentPlane();
  const { camera, size } = useThree();
  const narrow = size.width < 760;

  useFrame((_, delta) => {
    const s = sceneState;
    s.smoothVelocity = THREE.MathUtils.damp(s.smoothVelocity, THREE.MathUtils.clamp(s.velocity / 40, -1, 1), 5, delta);
    // Constant drift + scroll speed + drag momentum.
    const auto = motion ? 0.07 : 0.015;
    s.rotation += delta * auto + s.smoothVelocity * delta * 1.4 + s.dragVelocity;
    s.dragVelocity *= Math.pow(0.04, delta);
    if (spin.current) spin.current.rotation.y = s.rotation;

    if (group.current) {
      // Gentle tilt toward the pointer.
      const tx = 0.16 + s.pointerY * 0.06;
      const tz = -0.07 + s.pointerX * 0.04;
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, tx, 3, delta);
      group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, tz, 3, delta);
    }

    // Pull the camera back and up as the hero scrolls away.
    const p = s.progress;
    const baseZ = narrow ? 17 : 14.5;
    camera.position.z = THREE.MathUtils.damp(camera.position.z, baseZ + p * 5, 4, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 1.4 + p * 3 + s.pointerY * -0.3, 4, delta);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, s.pointerX * 0.5, 4, delta);
    camera.lookAt(0, narrow ? -1.2 : -1.1, 0);
  });

  return (
    <group ref={group} position={[0, narrow ? 1.4 : 0.9, 0]}>
      <group ref={spin}>
        {heroPanels.map((panel, i) => (
          <Panel key={i} index={i} {...panel} geometry={geometry} onOpen={onOpen} />
        ))}
      </group>
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
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 1.4, 12.5], fov: 35, near: 0.1, far: 60 }}
      onPointerMissed={() => setCursor(null)}
    >
      <Ring onOpen={onOpen} motion={motion} />
      <Dust />
      <ReadySignal onReady={onReady} />
    </Canvas>
  );
}

export { RADIUS };
