import { useFrame } from '@react-three/fiber'
import { useRef, useMemo, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'

const vertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
uniform float uTime;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
uniform float uTime;
uniform float uEnvStrength;
uniform float uFresnelPower;
uniform vec3 uTint;

void main() {
  float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), uFresnelPower);

  // Subtle chroma shift via per-channel fresnel offset
  float fresnelR = pow(1.0 - max(dot(vNormal, vViewDir + vec3(0.01, 0.0, 0.0)), 0.0), uFresnelPower);
  float fresnelB = pow(1.0 - max(dot(vNormal, vViewDir - vec3(0.01, 0.0, 0.0)), 0.0), uFresnelPower);

  // Base glass color — very dark interior, bright edges
  vec3 baseColor = uTint * 0.08;
  vec3 fresnelColor = vec3(fresnelR * 0.9 + 0.1, fresnel * 0.96 + 0.04, fresnelB * 0.98 + 0.05);
  vec3 color = mix(baseColor, fresnelColor, fresnel);

  // Subtle iridescent shimmer over time
  float shimmer = sin(uTime * 0.4 + vUv.x * 6.0 + vUv.y * 4.0) * 0.03;
  color += vec3(shimmer * 0.5, shimmer * 0.8, shimmer * 1.2);

  float alpha = 0.12 + fresnel * 0.75;
  gl_FragColor = vec4(color * uEnvStrength, alpha);
}
`

export interface GlassMeshRef {
  mesh: THREE.Mesh | null
}

const GlassMaterial = forwardRef<GlassMeshRef>((_, ref) => {
  const meshRef = useRef<THREE.Mesh>(null)

  useImperativeHandle(ref, () => ({ mesh: meshRef.current }))

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEnvStrength: { value: 1.2 },
      uFresnelPower: { value: 3.5 },
      uTint: { value: new THREE.Vector3(0.85, 0.92, 1.0) },
    }),
    []
  )

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1.8, 1.8, 1.8]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
})

GlassMaterial.displayName = 'GlassMaterial'

export default GlassMaterial
