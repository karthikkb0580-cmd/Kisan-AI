import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll, Environment, Float, Text } from '@react-three/drei'
import * as THREE from 'three'

function roundedRect(w, h, r) {
  const s = new THREE.Shape()
  const x = -w/2, y = -h/2
  s.moveTo(x, y+r)
  s.lineTo(x, y+h-r); s.quadraticCurveTo(x, y+h, x+r, y+h)
  s.lineTo(x+w-r, y+h); s.quadraticCurveTo(x+w, y+h, x+w, y+h-r)
  s.lineTo(x+w, y+r); s.quadraticCurveTo(x+w, y, x+w-r, y)
  s.lineTo(x+r, y); s.quadraticCurveTo(x, y, x, y+r)
  return s
}

// A simple flat card panel rendered in 3D
function ScreenCard({ position, color, w=1.9, h=0.55, children }) {
  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={color} transparent opacity={0.88} roughness={0.1} metalness={0.1} />
      </mesh>
      {children}
    </group>
  )
}

// High-tech glowing HUD callout pointing outside the phone frame
function HUDCallout({ start, end, label, isDark, align = 'right' }) {
  const D = isDark
  const color = D ? '#22c55e' : '#16a34a'

  // Angled pointer line points: start -> elbow -> end
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(start[0] + (end[0] - start[0]) * 0.35, end[1], start[2]),
    new THREE.Vector3(...end)
  ], [start, end])

  const lineGeom = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points])

  return (
    <group>
      {/* Anchor Dot */}
      <mesh position={start}>
        <sphereGeometry args={[0.032, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Leader line */}
      <line geometry={lineGeom}>
        <lineBasicMaterial color={color} transparent opacity={0.5} />
      </line>

      {/* Floating Callout Text Box */}
      <group position={end}>
        <Text
          fontSize={0.16}
          color={D ? '#4ade80' : '#15803d'}
          anchorX={align === 'left' ? 'right' : 'left'}
          anchorY="middle"
        >
          {label}
        </Text>
      </group>
    </group>
  )
}

// A simple 3D bar in a bar chart
function Bar({ x, h, color }) {
  return (
    <mesh position={[x, h/2 - 0.18, 0.01]}>
      <boxGeometry args={[0.07, h, 0.01]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

export default function Experience({ isDark, view }) {
  const scroll = useScroll()
  const phoneGroup = useRef()
  const globeRef = useRef()
  const ring1 = useRef(), ring2 = useRef()
  const pinRef = useRef()
  const sonar1 = useRef(), sonar2 = useRef()
  const droneRef = useRef()
  const p1=useRef(), p2=useRef(), p3=useRef(), p4=useRef()

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    fn(); window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const themeT = useRef(isDark ? 1 : 0)

  const bezelShape = useMemo(() => roundedRect(2.8, 5.8, 0.38), [])
  const screenShape = useMemo(() => roundedRect(2.52, 5.3, 0.28), [])
  const islandShape = useMemo(() => roundedRect(0.6, 0.18, 0.09), [])

  const extOpts = useMemo(() => ({ depth:0.09, bevelEnabled:true, bevelSegments:2, bevelSize:0.018, bevelThickness:0.018, curveSegments:20 }), [])
  const screenOpts = useMemo(() => ({ depth:0.01, bevelEnabled:false }), [])

  // Hero, Crops, Location, AI, CTA group refs
  const g0 = useRef()
  const g1 = useRef()
  const g2 = useRef()
  const g3 = useRef()
  const g4 = useRef()

  const sectionScales = useRef([1,0,0,0,0])

  useFrame((state, dt) => {
    const r = scroll.range(0,1)
    const cam = state.camera
    cam.position.y = THREE.MathUtils.lerp(cam.position.y, -r*18, dt*4)

    // Dynamic viewport-based responsive alignment
    const viewport = state.viewport
    const localIsMobile = viewport.width < 5.2

    // Phone position
    if (phoneGroup.current) {
      let px = localIsMobile ? 0 : THREE.MathUtils.lerp(2.2, 2.8, Math.sin(r*Math.PI))
      let py = localIsMobile ? cam.position.y + viewport.height * 0.18 : cam.position.y
      let pScale = localIsMobile ? Math.min(viewport.width / 6.0, 0.42) : 0.78

      if (view === 'dashboard') {
        // Shift phone to the right and scale down as a diagnostic holographic widget
        px = localIsMobile ? 0 : (viewport.width * 0.25)
        py = localIsMobile ? cam.position.y + viewport.height * 0.22 : cam.position.y - 0.2
        pScale = localIsMobile ? Math.min(viewport.width / 7.0, 0.32) : 0.65
      }

      phoneGroup.current.position.x = THREE.MathUtils.lerp(phoneGroup.current.position.x, px, dt*3)
      phoneGroup.current.position.y = THREE.MathUtils.lerp(phoneGroup.current.position.y, py, dt*8)
      
      const s = THREE.MathUtils.lerp(phoneGroup.current.scale.x, pScale, dt*4)
      phoneGroup.current.scale.setScalar(s)
      
      if (view === 'dashboard') {
        // Futuristic auto rotating hologram
        phoneGroup.current.rotation.x = THREE.MathUtils.lerp(phoneGroup.current.rotation.x, 0.15, dt*3)
        phoneGroup.current.rotation.y += dt * 0.4
      } else {
        phoneGroup.current.rotation.x = THREE.MathUtils.lerp(phoneGroup.current.rotation.x, localIsMobile ? 0.05 : 0, dt*3)
        phoneGroup.current.rotation.y = THREE.MathUtils.lerp(phoneGroup.current.rotation.y, localIsMobile ? 0 : -0.18, dt*3)
      }
    }

    // Theme lerp
    themeT.current = THREE.MathUtils.lerp(themeT.current, isDark ? 1 : 0, dt*3)

    // Section visibility
    const targets = [
      r < 0.18 ? 1:0,
      r>=0.18&&r<0.42 ? 1:0,
      r>=0.42&&r<0.65 ? 1:0,
      r>=0.65&&r<0.87 ? 1:0,
      r>=0.87 ? 1:0
    ]
    const refsList = [g0, g1, g2, g3, g4]
    refsList.forEach((ref, i) => {
      if (!ref.current) return
      const ns = THREE.MathUtils.lerp(ref.current.scale.x, targets[i], dt*7)
      ref.current.scale.setScalar(ns)
      ref.current.visible = ns > 0.02
    })

    const t = state.clock.elapsedTime
    if (globeRef.current) globeRef.current.rotation.y = t*0.2
    if (ring1.current) ring1.current.rotation.z = t*0.7
    if (ring2.current) ring2.current.rotation.z = -t*0.4
    if (pinRef.current) pinRef.current.position.y = 0.15 + Math.abs(Math.sin(t*2.5))*0.14
    const rs = 1+(t*1.3)%2.4
    if (sonar1.current) { sonar1.current.scale.setScalar(rs); sonar1.current.material.opacity = Math.max(0, 1-(rs-1)/2.4) }
    const rs2 = 1+(t*1.3+1.2)%2.4
    if (sonar2.current) { sonar2.current.scale.setScalar(rs2); sonar2.current.material.opacity = Math.max(0, 1-(rs2-1)/2.4) }
    if (droneRef.current) {
      droneRef.current.position.y = 0.6 + Math.sin(t*2.2)*0.1
      droneRef.current.position.x = Math.sin(t*0.9)*0.25
    }
    if (p1.current) p1.current.rotation.z += dt*25
    if (p2.current) p2.current.rotation.z -= dt*25
    if (p3.current) p3.current.rotation.z += dt*25
    if (p4.current) p4.current.rotation.z -= dt*25
  })

  const D = isDark
  // Frame: deep forest titanium (dark) vs brushed silver (light)
  const frame = D ? '#0d1a10' : '#b0bec5'
  // Screen glass: near-black (dark) vs pearl white (light)
  const screen = D ? '#060e08' : '#ecf5fb'
  // UI panel inside screen
  const panelBg = D ? '#0f1f13' : '#ffffff'
  const green = D ? '#22c55e' : '#16a34a'
  const greenDim = D ? '#166534' : '#4ade80'
  // Dynamic island
  const islandCol = D ? '#020604' : '#334155'

  return (
    <>
      <ambientLight intensity={D ? 0.5 : 0.9} />
      <directionalLight position={[8,12,8]} intensity={D ? 1.6 : 1.4} color="#efffef" castShadow />
      <directionalLight position={[-8,4,-4]} intensity={D ? 0.5 : 0.4} color="#aef5c0" />
      <pointLight position={[2,3,6]} intensity={D ? 1.4 : 1.0} color={D ? '#4ade80' : '#22c55e'} distance={14} decay={2} />
      <pointLight position={[-2,-3,4]} intensity={D ? 0.3 : 0.5} color={D ? '#3b82f6' : '#60a5fa'} distance={10} decay={2} />
      <Environment preset="city" />

      <group ref={phoneGroup} position={[2.5, 0, 0]}>
        <Float speed={1.2} floatIntensity={0.2} floatingRange={[-0.03, 0.03]}>

          {/* Bezel frame */}
          <mesh position={[0,0,-0.055]} castShadow>
            <extrudeGeometry args={[bezelShape, extOpts]} />
            <meshStandardMaterial color={frame} metalness={0.92} roughness={0.16} envMapIntensity={1.8} />
          </mesh>

          {/* Screen surface */}
          <mesh position={[0,0,0.012]}>
            <extrudeGeometry args={[screenShape, screenOpts]} />
            <meshStandardMaterial color={screen} metalness={0.1} roughness={0.05} envMapIntensity={0.8} />
          </mesh>

          {/* Dynamic island */}
          <mesh position={[0, 2.5, 0.025]}>
            <extrudeGeometry args={[islandShape, { depth:0.005, bevelEnabled:false }]} />
            <meshBasicMaterial color={islandCol} />
          </mesh>

          {/* Screen content groups — positioned relative to screen center */}
          <group position={[0, -0.5, 0.05]}>

            {/* ── SECTION 1: HERO – Globe + stats ── */}
            <group ref={g0}>
              {/* Globe Callout pointing Left */}
              <HUDCallout
                start={[-0.28, 0.8, 0.08]}
                end={[-1.48, 1.1, 0.1]}
                label="Global AI Satellite"
                isDark={isDark}
                align="left"
              />
              {/* Stats Callout pointing Right */}
              <HUDCallout
                start={[0.42, -0.42, 0.08]}
                end={[1.48, -0.65, 0.1]}
                label="Live Yield Analytics"
                isDark={isDark}
                align="right"
              />
              {/* Wireframe globe */}
              <group position={[0, 0.8, 0.08]} ref={globeRef}>
                <mesh>
                  <sphereGeometry args={[0.48, 16, 16]} />
                  <meshStandardMaterial color={green} wireframe emissive={green} emissiveIntensity={D ? 0.7 : 0.5} />
                </mesh>
              </group>
              {/* HUD rings */}
              <group position={[0, 0.8, 0.06]}>
                <mesh ref={ring1}><ringGeometry args={[0.64,0.67,32]}/><meshBasicMaterial color={green} transparent opacity={D?0.6:0.8} side={THREE.DoubleSide}/></mesh>
                <mesh ref={ring2}><ringGeometry args={[0.74,0.76,32]}/><meshBasicMaterial color={green} transparent opacity={D?0.35:0.5} side={THREE.DoubleSide}/></mesh>
              </group>
              {/* Stat card with labels */}
              <ScreenCard position={[0, -0.55, 0.06]} color={panelBg}>
                {/* Bar chart — brighter in light theme */}
                <Bar x={-0.6} h={0.28} color={green} />
                <Bar x={-0.44} h={0.38} color={green} />
                <Bar x={-0.28} h={0.22} color={D?greenDim:green} />
                <Bar x={-0.12} h={0.42} color={green} />
                <Bar x={0.04} h={0.31} color={D?greenDim:green} />
                <mesh position={[0.55,0.1,0.01]}><planeGeometry args={[0.55,0.06]}/><meshBasicMaterial color={green}/></mesh>
                <mesh position={[0.55,-0.06,0.01]}><planeGeometry args={[0.4,0.05]}/><meshBasicMaterial color={D?greenDim:'#16a34a'}/></mesh>
                <mesh position={[0.55,-0.19,0.01]}><planeGeometry args={[0.3,0.04]}/><meshBasicMaterial color={D?'#1e3a24':'#94a3b8'}/></mesh>
              </ScreenCard>
            </group>

            {/* ── SECTION 2: CROPS ── */}
            <group ref={g1}>
              {/* Crop Growth Engine Callout pointing Left */}
              <HUDCallout
                start={[-0.2, 0.1, 0.08]}
                end={[-1.48, 0.35, 0.1]}
                label="Crop Growth Engine"
                isDark={isDark}
                align="left"
              />
              {/* Hydration Telemetry Callout pointing Right */}
              <HUDCallout
                start={[0.48, 0.95, 0.08]}
                end={[1.48, 0.72, 0.1]}
                label="Hydration Telemetry"
                isDark={isDark}
                align="right"
              />
              {/* Three simple crops */}
              {[[-0.6,0],[0,0.1],[0.6,0]].map(([cx,cy],i) => (
                <group key={i} position={[cx, cy-0.25, 0.08]} scale={0.85+i*0.05}>
                  <mesh position={[0,0.2,0]}><cylinderGeometry args={[0.04,0.04,0.45,8]}/><meshStandardMaterial color={D?'#4ade80':'#15803d'} emissive={green} emissiveIntensity={D?0.6:0.4}/></mesh>
                  <mesh position={[0.08,0.35,0]} rotation={[0.2,-0.3,-0.5]}><coneGeometry args={[0.07,0.3,4]}/><meshStandardMaterial color={D?'#86efac':'#22c55e'} emissive={green} emissiveIntensity={D?0.3:0.2}/></mesh>
                  <mesh position={[-0.08,0.42,0]} rotation={[-0.2,0.3,0.5]}><coneGeometry args={[0.06,0.25,4]}/><meshStandardMaterial color={D?'#86efac':'#22c55e'} emissive={green} emissiveIntensity={D?0.3:0.2}/></mesh>
                  <mesh position={[0,0.62,0]}><sphereGeometry args={[0.065,8,8]}/><meshStandardMaterial color="#fde047" emissive="#ca8a04" emissiveIntensity={D?1.2:0.7}/></mesh>
                </group>
              ))}
              {/* Telemetry card */}
              <ScreenCard position={[0, 0.95, 0.07]} color={panelBg}>
                <mesh position={[-0.6,0,0.01]}><ringGeometry args={[0.13,0.17,24]}/><meshBasicMaterial color={green} side={THREE.DoubleSide}/></mesh>
                <mesh position={[-0.6,0,0.01]}><circleGeometry args={[0.065,24]}/><meshBasicMaterial color={D?'#052e16':'#f0fdf4'}/></mesh>
                <mesh position={[0.16,0.09,0.01]}><planeGeometry args={[0.65,0.05]}/><meshBasicMaterial color={green}/></mesh>
                <mesh position={[0.05,-0.04,0.01]}><planeGeometry args={[0.42,0.04]}/><meshBasicMaterial color="#3b82f6"/></mesh>
              </ScreenCard>
            </group>

            {/* ── SECTION 3: LOCATION ── */}
            <group ref={g2}>
              {/* Topography Map Callout pointing Left */}
              <HUDCallout
                start={[-0.4, -0.35, 0.08]}
                end={[-1.48, -0.05, 0.1]}
                label="3D Topography Map"
                isDark={isDark}
                align="left"
              />
              {/* GPS Tracker Callout pointing Right */}
              <HUDCallout
                start={[0.15, -0.22, 0.2]}
                end={[1.48, -0.38, 0.1]}
                label="Field GPS Tracker"
                isDark={isDark}
                align="right"
              />
              {/* Simple terrain mesh */}
              <mesh position={[0,-0.35,0.07]} rotation={[-0.9,0,0]}>
                <planeGeometry args={[2.0,2.0,10,10]} />
                <meshStandardMaterial color={D?'#052e16':'#dbeafe'} wireframe emissive={green} emissiveIntensity={D?0.4:0.05}/>
              </mesh>
              {/* GPS pin */}
              <group ref={pinRef} position={[0.15,-0.22,0.2]}>
                <mesh position={[0,0.16,0]}><sphereGeometry args={[0.09,14,14]}/><meshStandardMaterial color="#ef4444" emissive="#b91c1c" emissiveIntensity={D?1.0:0.2}/></mesh>
                <mesh position={[0,0.06,0]} rotation={[Math.PI,0,0]}><coneGeometry args={[0.07,0.2,14]}/><meshStandardMaterial color="#ef4444" emissive="#b91c1c" emissiveIntensity={D?1.0:0.2}/></mesh>
              </group>
              {/* Sonar rings */}
              <mesh ref={sonar1} position={[0.15,-0.34,0.15]} rotation={[-0.9,0,0]}>
                <ringGeometry args={[0.02,0.04,28]}/><meshBasicMaterial color={green} transparent side={THREE.DoubleSide}/>
              </mesh>
              <mesh ref={sonar2} position={[0.15,-0.34,0.15]} rotation={[-0.9,0,0]}>
                <ringGeometry args={[0.02,0.04,28]}/><meshBasicMaterial color={greenDim} transparent side={THREE.DoubleSide}/>
              </mesh>
              {/* Info card */}
              <ScreenCard position={[0, 0.92, 0.07]} color={panelBg} h={0.5}>
                <mesh position={[-0.6,0,0.01]}><planeGeometry args={[0.28,0.26]}/><meshBasicMaterial color="#ef4444"/></mesh>
                <mesh position={[0.2,0.08,0.01]}><planeGeometry args={[0.72,0.05]}/><meshBasicMaterial color={green}/></mesh>
                <mesh position={[0.12,-0.07,0.01]}><planeGeometry args={[0.56,0.04]}/><meshBasicMaterial color={greenDim}/></mesh>
              </ScreenCard>
            </group>

            {/* ── SECTION 4: AI DRONE ── */}
            <group ref={g3}>
              {/* Drone UAV Callout pointing Left */}
              <HUDCallout
                start={[-0.2, 0.5, 0.08]}
                end={[-1.48, 0.8, 0.1]}
                label="Computer Vision UAV"
                isDark={isDark}
                align="left"
              />
              {/* Target Spray Callout pointing Right */}
              <HUDCallout
                start={[0.3, -0.45, 0.08]}
                end={[1.48, -0.22, 0.1]}
                label="Precision Target Spray"
                isDark={isDark}
                align="right"
              />
              <group ref={droneRef} position={[0, 0.6, 0.12]} scale={0.7}>
                {/* Body */}
                <mesh><sphereGeometry args={[0.2,14,14]}/><meshStandardMaterial color={D?'#0f172a':'#475569'} metalness={0.9} roughness={0.15}/></mesh>
                {/* Arms */}
                <mesh rotation={[0,0,Math.PI/4]}><boxGeometry args={[0.9,0.03,0.03]}/><meshStandardMaterial color={D?'#334155':'#94a3b8'}/></mesh>
                <mesh rotation={[0,0,-Math.PI/4]}><boxGeometry args={[0.9,0.03,0.03]}/><meshStandardMaterial color={D?'#334155':'#94a3b8'}/></mesh>
                {/* Rotors */}
                {[[-0.32,0.32],[0.32,0.32],[-0.32,-0.32],[0.32,-0.32]].map(([rx,ry],i) => (
                  <group key={i} position={[rx,ry,0]}>
                    <mesh><cylinderGeometry args={[0.045,0.045,0.07,10]}/><meshStandardMaterial color={D?'#475569':'#cbd5e1'}/></mesh>
                    <mesh ref={[p1,p2,p3,p4][i]} position={[0,0,0.04]}><boxGeometry args={[0.32,0.013,0.008]}/><meshStandardMaterial color={D?'#64748b':'#94a3b8'}/></mesh>
                  </group>
                ))}
                {/* Camera eye */}
                <mesh position={[0,-0.14,0.07]}><sphereGeometry args={[0.068,12,12]}/><meshStandardMaterial color={D?'#06b6d4':'#0891b2'} emissive={D?'#06b6d4':'#0891b2'} emissiveIntensity={D?2.2:0.5}/></mesh>
                {/* Scan cone */}
                <mesh position={[0,-0.55,-0.04]}><coneGeometry args={[0.38,1.0,16,1,true]}/><meshBasicMaterial color={D?'#06b6d4':'#0891b2'} transparent opacity={D?0.14:0.07} side={THREE.DoubleSide}/></mesh>
              </group>
              {/* Three target plants */}
              {[[-0.55,-0.55],[0,-0.45],[0.55,-0.55]].map(([cx,cy],i)=>(
                <mesh key={i} position={[cx,cy,0.1]}><coneGeometry args={[0.055,0.18,4]}/><meshStandardMaterial color={D?'#22d3ee':'#0891b2'} emissive={D?'#0891b2':'#0284c7'} emissiveIntensity={D?0.5:0.1}/></mesh>
              ))}
              {/* Stat card */}
              <ScreenCard position={[0, 0.98, 0.07]} color={panelBg}>
                <mesh position={[-0.6,0.05,0.01]}><planeGeometry args={[0.34,0.08]}/><meshBasicMaterial color="#06b6d4"/></mesh>
                <mesh position={[0.12,0.09,0.01]}><planeGeometry args={[0.6,0.05]}/><meshBasicMaterial color={green}/></mesh>
                <mesh position={[0.04,-0.05,0.01]}><planeGeometry args={[0.44,0.04]}/><meshBasicMaterial color={greenDim}/></mesh>
              </ScreenCard>
            </group>

            {/* ── SECTION 5: CTA ── */}
            <group ref={g4}>
              {/* Orb Callout pointing Left */}
              <HUDCallout
                start={[-0.25, 0.6, 0.08]}
                end={[-1.48, 0.85, 0.1]}
                label="AI Intel Core"
                isDark={isDark}
                align="left"
              />
              {/* Community Callout pointing Right */}
              <HUDCallout
                start={[0.2, -0.5, 0.08]}
                end={[1.48, -0.7, 0.1]}
                label="50K+ Growers Network"
                isDark={isDark}
                align="right"
              />
              {/* Central glowing orb */}
              <group position={[0, 0.6, 0.1]}>
                <mesh><sphereGeometry args={[0.3,20,20]}/><meshStandardMaterial color={green} emissive={green} emissiveIntensity={D?1.0:0.15} metalness={0.2} roughness={0.2}/></mesh>
                <mesh><ringGeometry args={[0.44,0.47,32]}/><meshStandardMaterial color={D?'#4ade80':'#16a34a'} emissive={D?'#4ade80':'#16a34a'} emissiveIntensity={D?0.6:0.1} side={THREE.DoubleSide}/></mesh>
                <mesh><ringGeometry args={[0.56,0.59,32]}/><meshStandardMaterial color={greenDim} emissive={greenDim} emissiveIntensity={D?0.4:0.05} side={THREE.DoubleSide}/></mesh>
              </group>
              {/* Bottom stats card */}
              <ScreenCard position={[0,-0.55,0.07]} color={panelBg} h={0.65}>
                <mesh position={[-0.5,0.18,0.01]}><planeGeometry args={[0.55,0.06]}/><meshBasicMaterial color={green}/></mesh>
                <mesh position={[0.3,0.18,0.01]}><planeGeometry args={[0.3,0.05]}/><meshBasicMaterial color={greenDim}/></mesh>
                <mesh position={[-0.1,-0.02,0.01]}><planeGeometry args={[1.1,0.04]}/><meshBasicMaterial color={D?'#14532d':'#dcfce7'}/></mesh>
                <mesh position={[-0.1,-0.14,0.01]}><planeGeometry args={[0.85,0.04]}/><meshBasicMaterial color={D?'#14532d':'#dcfce7'}/></mesh>
              </ScreenCard>
            </group>

          </group>
        </Float>
      </group>
    </>
  )
}



