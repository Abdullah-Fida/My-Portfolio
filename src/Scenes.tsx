import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Lightformer, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { scene as sceneState } from './store';

const COBALT = '#2f45d8';
const SKY = '#9eb0ff';
const PAPER = '#f3f2ee';

/* ——————————————————————————————————————————————
   Systems: a workflow pipeline. Data particles travel a winding path
   through three stations (trigger → agent → published).
   —————————————————————————————————————————————— */

const STATIONS = [new THREE.Vector3(-5.2, -0.2, 0), new THREE.Vector3(0, 0.25, 0.4), new THREE.Vector3(5.2, -0.1, 0)];

function usePath() {
  return useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-9.5, 1.4, -2),
    new THREE.Vector3(-7.4, 0.6, -0.6),
    STATIONS[0],
    new THREE.Vector3(-2.6, -1.1, 0.8),
    STATIONS[1],
    new THREE.Vector3(2.6, 1.2, -0.4),
    STATIONS[2],
    new THREE.Vector3(7.6, -0.9, 0.6),
    new THREE.Vector3(9.5, -1.6, -1.5),
  ], false, 'catmullrom', 0.4), []);
}

function Particles({ curve, count = 90 }: { curve: THREE.CatmullRomCurve3; count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({ t: i / count, jitter: new THREE.Vector3((Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.18), size: 0.035 + Math.random() * 0.05 })), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const progress = useRef(0);
  useFrame((_, delta) => {
    if (!mesh.current) return;
    progress.current += delta * (0.035 + Math.abs(sceneState.smoothVelocity) * 0.12);
    seeds.forEach((s, i) => {
      const t = (s.t + progress.current) % 1;
      curve.getPointAt(t, dummy.position);
      dummy.position.add(s.jitter);
      // Particles swell as they pass through a station.
      const near = STATIONS.reduce((m, st) => Math.min(m, st.distanceTo(dummy.position)), 99);
      dummy.scale.setScalar(s.size * (1 + Math.max(0, 1.4 - near) * 1.6));
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
    <sphereGeometry args={[1, 12, 12]} />
    <meshBasicMaterial color={SKY} toneMapped={false} />
  </instancedMesh>;
}

function Station({ position, index }: { position: THREE.Vector3; index: number }) {
  const ring = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Group>(null);
  useFrame(state => {
    const t = state.clock.elapsedTime;
    if (ring.current) { ring.current.rotation.x = t * 0.5 + index; ring.current.rotation.y = t * 0.7; }
    if (core.current) { core.current.rotation.y = t * 0.35 + index; core.current.rotation.x = Math.sin(t * 0.5 + index) * 0.25; }
  });
  return <group position={position}>
    <group ref={core}>
      <RoundedBox args={[1.15, 1.15, 1.15]} radius={0.22} smoothness={5}>
        <meshPhysicalMaterial color={index === 1 ? COBALT : '#1d1d1c'} metalness={0.3} roughness={0.25} clearcoat={1} clearcoatRoughness={0.15} />
      </RoundedBox>
    </group>
    <mesh ref={ring}>
      <torusGeometry args={[1.25, 0.012, 8, 96]} />
      <meshBasicMaterial color={SKY} transparent opacity={0.55} />
    </mesh>
  </group>;
}

function Pipeline() {
  const curve = usePath();
  const group = useRef<THREE.Group>(null);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 300, 0.014, 8, false), [curve]);
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, sceneState.pointerX * 0.12, 2, delta);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, sceneState.pointerY * 0.06, 2, delta);
  });
  return <group ref={group}>
    <mesh geometry={tube}><meshBasicMaterial color={SKY} transparent opacity={0.28} /></mesh>
    <Particles curve={curve} />
    {STATIONS.map((p, i) => <Station key={i} position={p} index={i} />)}
  </group>;
}

function Studio() {
  return <Environment resolution={256}>
    <Lightformer form="rect" intensity={2.2} position={[0, 5, -6]} scale={[12, 3, 1]} />
    <Lightformer form="rect" intensity={1.2} color={SKY} position={[-6, 1, 3]} scale={[4, 6, 1]} rotation-y={Math.PI / 2} />
    <Lightformer form="rect" intensity={0.9} position={[6, -1, 3]} scale={[4, 6, 1]} rotation-y={-Math.PI / 2} />
    <Lightformer form="ring" intensity={1.5} position={[0, 0, 8]} scale={3} />
  </Environment>;
}

export function FlowScene({ active }: { active: boolean }) {
  return <Canvas frameloop={active ? 'always' : 'never'} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0.3, 8.2], fov: 42 }}>
    <ambientLight intensity={0.4} />
    <Studio />
    <Pipeline />
  </Canvas>;
}

/* ——————————————————————————————————————————————
   Contact: a loose cluster of glossy shapes that drift and lean toward the pointer.
   —————————————————————————————————————————————— */

const SHAPES: { kind: 'knot' | 'box' | 'sphere' | 'torus' | 'ico' | 'capsule'; pos: [number, number, number]; color: string; scale: number }[] = [
  { kind: 'knot', pos: [0.2, 0.3, 0], color: COBALT, scale: 1.05 },
  { kind: 'box', pos: [-2.6, 1.3, -1], color: PAPER, scale: 0.85 },
  { kind: 'sphere', pos: [2.5, 1.5, -0.6], color: '#1d1d1c', scale: 0.7 },
  { kind: 'torus', pos: [-2.2, -1.6, 0.4], color: SKY, scale: 0.75 },
  { kind: 'ico', pos: [2.7, -1.4, 0.5], color: PAPER, scale: 0.75 },
  { kind: 'capsule', pos: [0.4, -2.4, -1.2], color: '#1d1d1c', scale: 0.6 },
];

function Shape({ kind, color }: { kind: (typeof SHAPES)[number]['kind']; color: string }) {
  const mat = <meshPhysicalMaterial color={color} metalness={color === '#1d1d1c' ? 0.6 : 0.1} roughness={0.18} clearcoat={1} clearcoatRoughness={0.1} />;
  switch (kind) {
    case 'knot': return <mesh><torusKnotGeometry args={[1, 0.32, 220, 32]} />{mat}</mesh>;
    case 'box': return <RoundedBox args={[1.5, 1.5, 1.5]} radius={0.3} smoothness={6}>{mat}</RoundedBox>;
    case 'sphere': return <mesh><sphereGeometry args={[1, 64, 64]} />{mat}</mesh>;
    case 'torus': return <mesh><torusGeometry args={[0.9, 0.36, 48, 96]} />{mat}</mesh>;
    case 'ico': return <mesh><icosahedronGeometry args={[1, 0]} />{mat}</mesh>;
    default: return <mesh><capsuleGeometry args={[0.55, 1.1, 16, 32]} />{mat}</mesh>;
  }
}

function Cluster() {
  const group = useRef<THREE.Group>(null);
  const spinners = useRef<(THREE.Group | null)[]>([]);
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, sceneState.pointerX * 0.5, 2, delta);
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, sceneState.pointerY * 0.3, 2, delta);
    }
    spinners.current.forEach((g, i) => { if (g) { g.rotation.x = t * (0.15 + i * 0.03); g.rotation.y = t * (0.2 + i * 0.04); } });
  });
  return <group ref={group}>
    {SHAPES.map((s, i) => <Float key={i} speed={1.2 + i * 0.2} rotationIntensity={0.4} floatIntensity={1.1}>
      <group position={s.pos} scale={s.scale} ref={el => { spinners.current[i] = el; }}>
        <Shape kind={s.kind} color={s.color} />
      </group>
    </Float>)}
  </group>;
}

export function ShapesScene({ active }: { active: boolean }) {
  return <Canvas frameloop={active ? 'always' : 'never'} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0, 10.5], fov: 40 }}>
    <ambientLight intensity={0.3} />
    <directionalLight position={[4, 6, 5]} intensity={1.2} />
    <Studio />
    <Cluster />
  </Canvas>;
}
