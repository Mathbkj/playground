import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import { useRef, useEffect, useMemo, Suspense } from "react";
import * as THREE from "three";

const MODEL_PATH = "/Diet%20Soda/scene.gltf";

const TINTS: (THREE.Color | null)[] = [
  null,
  new THREE.Color(1, 0.15, 0.15),
  new THREE.Color(0.15, 0.85, 0.35),
];

function cloneWithTint(source: THREE.Object3D, tint: THREE.Color | null): THREE.Object3D {
  const cloned = source.clone(true);
  if (!tint) return cloned;
  cloned.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const newMats = mats.map((m) => {
      const mat = (m as THREE.MeshStandardMaterial).clone();
      mat.color.multiply(tint);
      return mat;
    });
    mesh.material = Array.isArray(mesh.material) ? newMats : newMats[0];
  });
  return cloned;
}

function CanScene() {
  const { scene } = useGLTF(MODEL_PATH);
  const groupRef = useRef<THREE.Group>(null);
  const scrollY = useRef(0);
  const { camera } = useThree();
  const phaseRef = useRef(0);

  const variants = useMemo(() =>
    TINTS.map((tint, i) => {
      const s = cloneWithTint(scene, tint);
      s.visible = i === 0;
      return s;
    }),
    [scene]
  );

  useEffect(() => {
    if (!groupRef.current) return;
    const box = new THREE.Box3().setFromObject(groupRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    groupRef.current.position.sub(center);
    const fovRad = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    const distance = (maxDim / 2 / Math.tan(fovRad / 2)) * 1.8;
    camera.position.set(0, 0, distance);
    camera.near = distance / 100;
    camera.far = distance * 10;
    camera.updateProjectionMatrix();
  }, [camera]);

  useEffect(() => {
    const onScroll = () => { scrollY.current = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
    const t = scrollY.current / maxScroll;
    const newPhase = Math.min(2, Math.floor(t * 3));

    if (newPhase !== phaseRef.current) {
      phaseRef.current = newPhase;
      variants.forEach((v, i) => { v.visible = i === newPhase; });
      groupRef.current.scale.setScalar(0);
    }

    const s = groupRef.current.scale.x;
    groupRef.current.scale.setScalar(s + (1 - s) * Math.min(1, delta * 6));

    const target = scrollY.current * 0.004;
    groupRef.current.rotation.y += (target - groupRef.current.rotation.y) * 0.08;
  });

  return (
    <group ref={groupRef}>
      {variants.map((v, i) => (
        <primitive key={i} object={v} />
      ))}
    </group>
  );
}

useGLTF.preload(MODEL_PATH);

export default function Hero() {
  return (
    <main className="relative h-[900vh] bg-brand-cream">
      <div className="sticky top-0 h-screen overflow-hidden">
        <Canvas
          style={{ position: "absolute", inset: 0 }}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
          camera={{ position: [0, 0, 10], fov: 50 }}
        >
          <Suspense fallback={null}>
            <Environment preset="studio" />
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 5, 5]} intensity={1.5} />
            <CanScene />
          </Suspense>
        </Canvas>
      </div>
    </main>
  );
}
