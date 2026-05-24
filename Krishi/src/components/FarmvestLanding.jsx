import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ScrollControls } from '@react-three/drei'
import Experience from './Experience'
import Overlay from './Overlay'
import { useFarmvestStore } from '../store/useFarmvestStore'

export default function FarmvestLanding() {
  const { theme, view } = useFarmvestStore()
  const isDark = theme === 'dark'

  return (
    <div className="w-full h-screen relative bg-[#07111F] overflow-hidden">
      {/* 3D Canvas Background */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: '100%', height: '100%' }}
        >
          <Suspense fallback={null}>
            <ScrollControls pages={8} distance={1.2}>
              <Experience isDark={isDark} view={view} />
              <Overlay />
            </ScrollControls>
          </Suspense>
        </Canvas>
      </div>

      {/* Futuristic Grid Overlay */}
      <div 
        className="absolute inset-0 z-1 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(34, 197, 94, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(34, 197, 94, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  )
}
