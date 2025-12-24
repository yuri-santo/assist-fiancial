"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Float, MeshDistortMaterial, Sphere, Environment, Text } from "@react-three/drei"
import { Suspense } from "react"

function FloatingOrb({
  position,
  color,
  size = 1,
  speed = 1,
}: { position: [number, number, number]; color: string; size?: number; speed?: number }) {
  return (
    <Float speed={speed} rotationIntensity={0.5} floatIntensity={2}>
      <Sphere args={[size, 64, 64]} position={position}>
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0}
          metalness={0.8}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </Sphere>
    </Float>
  )
}

function CurrencySymbol() {
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={1.5}>
      <Text
        font="/fonts/Inter_Bold.json"
        fontSize={1.5}
        color="#00e5ff"
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 0]}
      >
        R$
        <meshStandardMaterial
          color="#00e5ff"
          emissive="#00e5ff"
          emissiveIntensity={0.5}
          metalness={0.9}
          roughness={0.1}
        />
      </Text>
    </Float>
  )
}

function GridFloor() {
  return <gridHelper args={[20, 20, "#00e5ff", "#00e5ff"]} position={[0, -3, 0]} rotation={[0, 0, 0]} />
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} color="#00e5ff" intensity={1} />
      <pointLight position={[-10, -10, -10]} color="#a855f7" intensity={0.5} />
      <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} color="#00e5ff" intensity={1} />

      {/* Main currency symbol */}
      <CurrencySymbol />

      {/* Floating orbs representing financial elements */}
      <FloatingOrb position={[3, 1, -1]} color="#00e5ff" size={0.5} speed={1.2} />
      <FloatingOrb position={[-3, -1, 1]} color="#a855f7" size={0.4} speed={0.8} />
      <FloatingOrb position={[2, -2, 2]} color="#ec4899" size={0.3} speed={1.5} />
      <FloatingOrb position={[-2, 2, -2]} color="#22c55e" size={0.35} speed={1} />
      <FloatingOrb position={[0, 3, 0]} color="#00e5ff" size={0.25} speed={2} />

      {/* Grid floor for depth */}
      <GridFloor />

      <Environment preset="night" />
    </>
  )
}

export function HeroScene() {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden glass">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <Suspense fallback={null}>
          <Scene />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 3}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
