import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, Text } from "@react-three/drei";
import { useRef, useEffect, useState, Suspense } from "react";
import * as THREE from "three";

const MODEL_PATH = "/Diet%20Soda/scene.gltf";
const TEXT_STRING = "SOMETHING BEAUTIFUL • SOMETHING BEAUTIFUL • ";

function CurvedText({ radius, y, fontSize }: { radius: number; y: number; fontSize: number }) {
  const chars = TEXT_STRING.split("");
  const anglePerChar = (2 * Math.PI) / chars.length;

  return (
    <>
      {chars.map((char, i) => {
        const angle = -i * anglePerChar;
        const x = radius * Math.sin(angle);
        const z = radius * Math.cos(angle);
        return (
          <Text
            key={i}
            position={[x, y, z]}
            rotation={[0, angle, 0]}
            fontSize={fontSize}
            color="rgb(250, 103, 129)"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.05}
          >
            {char}
          </Text>
        );
      })}
    </>
  );
}

function CanScene() {
  const { scene } = useGLTF(MODEL_PATH);
  const groupRef = useRef<THREE.Group>(null);
  const scrollY = useRef(0);
  const { camera } = useThree();
  const [textRadius, setTextRadius] = useState(0);
  const [textY, setTextY] = useState(0);
  const [textFontSize, setTextFontSize] = useState(0);

  useEffect(() => {
    if (!groupRef.current) return;

    const box = new THREE.Box3().setFromObject(groupRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    groupRef.current.position.sub(center);

    // Horizontal radius of the can + generous margin for text
    const canRadiusXZ = Math.max(size.x, size.z) / 2;
    setTextRadius(canRadiusXZ * 1.5);
    setTextFontSize(canRadiusXZ * 0.18);
    setTextY(0);

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

  useFrame(() => {
    if (!groupRef.current) return;
    const target = scrollY.current * 0.004;
    groupRef.current.rotation.y += (target - groupRef.current.rotation.y) * 0.08;
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
      {textRadius > 0 && <CurvedText radius={textRadius} y={textY} fontSize={textFontSize} />}
    </group>
  );
}

useGLTF.preload(MODEL_PATH);

export default function Hero() {
  return (
    <main className="relative h-[300vh] bg-brand-cream">
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
