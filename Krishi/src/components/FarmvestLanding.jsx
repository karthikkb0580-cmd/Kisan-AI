import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, useInView } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import {
  ArrowRight, Leaf, Shield, BarChart3, Sprout, Globe, Users, Star,
  TrendingUp, Cpu, Droplets, Wind, MapPin, Zap, DollarSign, Lock,
  Smartphone, ChevronRight, Check, ArrowUpRight, Sparkles, Eye
} from 'lucide-react'
import { useFarmvestStore } from '../store/useFarmvestStore'

gsap.registerPlugin(ScrollTrigger)

/* ═══════════════════════════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════════════════════════ */
function AnimatedCounter({ target, suffix = '', prefix = '' }) {
  const ref = useRef(null)
  const [count, setCount] = useState(0)
  const triggered = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true
          const end = parseInt(target)
          const duration = 2000
          const steps = 60
          const stepTime = duration / steps
          const increment = Math.ceil(end / steps)
          let current = 0

          const timer = setInterval(() => {
            current += increment
            if (current >= end) {
              clearInterval(timer)
              setCount(end)
            } else {
              setCount(current)
            }
          }, stepTime)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>
}

/* ═══════════════════════════════════════════════════════════════
   INVESTMENT CARD
   ═══════════════════════════════════════════════════════════════ */
function InvestmentCard({ farm, index, onInvest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="investment-card group"
    >
      <div
        className="card-gradient h-48 flex items-center justify-center relative overflow-hidden"
        style={{ background: farm.imageGradient }}
      >
        <Sprout size={56} className="text-white/60 drop-shadow-[0_3px_0_rgba(15,23,42,0.9)] group-hover:scale-115 group-hover:rotate-12 transition-all duration-500 relative z-10" />
        
        {/* Cartoon Badge - Top Left */}
        <div className="absolute top-4 left-4 z-10">
          <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-300 border-2 border-slate-900 text-slate-900 px-3.5 py-1.5 rounded-full shadow-[2px_2px_0px_0px_#0F172A]">
            {farm.type}
          </span>
        </div>

        {/* Cartoon Badge - Top Right */}
        <div className="absolute top-4 right-4 z-10">
          <span className="text-xs font-black bg-yellow-300 border-2 border-slate-900 text-slate-900 px-3 py-1.5 rounded-full shadow-[2px_2px_0px_0px_#0F172A] flex items-center gap-1.5 rotate-[2deg]">
            <TrendingUp size={13} className="stroke-[3px]" /> {farm.roi}% ROI
          </span>
        </div>
      </div>

      <div className="p-6">
        <h3 className="font-display font-black text-xl text-gray-900 mb-1.5 group-hover:text-green-600 transition-colors duration-300 leading-snug">
          {farm.name}
        </h3>
        <p className="text-sm font-bold text-slate-600 flex items-center gap-1.5 mb-3">
          <MapPin size={13} className="text-slate-900 stroke-[2.5px]" /> {farm.location}
        </p>
        <p className="text-sm text-gray-500 leading-relaxed mb-5 line-clamp-2">
          {farm.desc}
        </p>

        {/* Progress */}
        <div className="mb-5">
          <div className="flex justify-between text-xs font-extrabold mb-2">
            <span className="text-slate-500 uppercase tracking-wider">Progress</span>
            <span className="text-green-600 font-black">{farm.progress}%</span>
          </div>
          <div className="w-full h-4 bg-white border-2 border-slate-900 rounded-full overflow-hidden p-[1px]">
            <motion.div
              className="h-full rounded-full bg-green-400 border-r-2 border-slate-900"
              initial={{ width: 0 }}
              whileInView={{ width: `${farm.progress}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>

        <div className="flex justify-between text-xs font-bold text-slate-500 mb-6 bg-slate-50 border-2 border-slate-900/10 rounded-xl px-3 py-2">
          <span className="flex items-center gap-1"><Users size={12} className="stroke-[2.5px]" /> {farm.investors.toLocaleString()} backers</span>
          <span>{farm.timeline}</span>
        </div>

        <button
          onClick={onInvest}
          className="btn-magnetic w-full py-4.5 rounded-2xl text-sm font-black bg-green-400 text-slate-900 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
        >
          Invest Now <ArrowRight size={16} className="stroke-[3px]" />
        </button>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SVG FARM ILLUSTRATION (Hand-drawn Cartoon Style)
   ═══════════════════════════════════════════════════════════════ */
function FarmScene() {
  return (
    <div className="absolute bottom-0 left-0 w-full pointer-events-none select-none" style={{ zIndex: 2 }}>
      <svg
        viewBox="0 0 1440 520"
        className="w-full h-auto block"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax slice"
      >
        {/* ── SUN with rays ── */}
        <g>
          <circle cx="1280" cy="90" r="105" fill="#FEF08A" opacity="0.18"/>
          <circle cx="1280" cy="90" r="75" fill="#FDE68A" opacity="0.25"/>
          {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg,i) => {
            const r = Math.PI * deg / 180
            return <line key={i} x1={1280 + Math.cos(r)*58} y1={90 + Math.sin(r)*58} x2={1280 + Math.cos(r)*82} y2={90 + Math.sin(r)*82} stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" opacity="0.7"/>
          })}
          <circle cx="1280" cy="90" r="52" fill="#FCD34D" stroke="#0F172A" strokeWidth="4"/>
          <circle cx="1265" cy="78" r="10" fill="#FDE68A" opacity="0.6"/>
        </g>

        {/* ── CLOUDS ── */}
        <g className="animate-cloud-slow" style={{ animationDelay: '0s' }}>
          <ellipse cx="220" cy="115" rx="70" ry="30" fill="white" stroke="#0F172A" strokeWidth="3" />
          <ellipse cx="265" cy="100" rx="52" ry="26" fill="white" stroke="#0F172A" strokeWidth="3" />
          <ellipse cx="180" cy="108" rx="40" ry="22" fill="white" stroke="#0F172A" strokeWidth="3" />
          <ellipse cx="235" cy="97" rx="30" ry="20" fill="white" stroke="#0F172A" strokeWidth="3" />
        </g>
        <g className="animate-cloud-fast" style={{ animationDelay: '18s' }}>
          <ellipse cx="750" cy="82" rx="60" ry="28" fill="white" stroke="#0F172A" strokeWidth="3" />
          <ellipse cx="795" cy="70" rx="46" ry="22" fill="white" stroke="#0F172A" strokeWidth="3" />
          <ellipse cx="715" cy="78" rx="36" ry="18" fill="white" stroke="#0F172A" strokeWidth="3" />
          <ellipse cx="760" cy="67" rx="28" ry="18" fill="white" stroke="#0F172A" strokeWidth="3" />
        </g>
        <g className="animate-cloud-slow" style={{ animationDelay: '30s' }}>
          <ellipse cx="1050" cy="132" rx="54" ry="24" fill="white" stroke="#0F172A" strokeWidth="3" />
          <ellipse cx="1090" cy="120" rx="40" ry="20" fill="white" stroke="#0F172A" strokeWidth="3" />
          <ellipse cx="1020" cy="126" rx="30" ry="16" fill="white" stroke="#0F172A" strokeWidth="3" />
        </g>

        {/* ── BIRDS ── */}
        <g opacity="0.8" stroke="#0F172A" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <path d="M415,142 Q425,130 435,142"/>
          <path d="M447,135 Q455,124 463,135"/>
          <path d="M395,154 Q404,143 413,154"/>
          <path d="M470,148 Q477,139 484,148"/>
        </g>

        {/* ── FAR HILLS ── */}
        <path
          className="farm-parallax-1"
          d="M0,340 Q130,285 260,320 Q390,270 520,310 Q650,260 780,305 Q910,255 1040,295 Q1170,265 1300,305 Q1380,290 1440,330 L1440,520 L0,520 Z"
          fill="#BBF7D0"
          stroke="#0F172A"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* ── MID HILLS ── */}
        <path
          className="farm-parallax-2"
          d="M0,375 Q160,335 320,360 Q480,315 640,350 Q800,310 960,345 Q1120,315 1280,350 Q1380,340 1440,370 L1440,520 L0,520 Z"
          fill="#86EFAC"
          stroke="#0F172A"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* ── BARN ── */}
        <g className="farm-parallax-2">
          {/* Shadow */}
          <rect x="386" y="384" width="100" height="8" rx="4" fill="#0F172A" opacity="0.12"/>
          {/* Body */}
          <rect x="378" y="322" width="108" height="63" rx="4" fill="#B45309" stroke="#0F172A" strokeWidth="3.5" strokeLinejoin="round"/>
          {/* Side shading */}
          <rect x="454" y="322" width="32" height="63" rx="2" fill="#92400E" opacity="0.4"/>
          {/* Ledge */}
          <rect x="368" y="319" width="128" height="7" rx="2" fill="#92400E" stroke="#0F172A" strokeWidth="3"/>
          {/* Door */}
          <rect x="390" y="350" width="26" height="35" rx="3" fill="#78350F" stroke="#0F172A" strokeWidth="3"/>
          <line x1="403" y1="350" x2="403" y2="385" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
          <circle cx="408" cy="368" r="3" fill="#FCD34D" stroke="#0F172A" strokeWidth="1.5"/>
          {/* Windows */}
          <rect x="428" y="334" width="18" height="18" rx="2" fill="#FEF9C3" stroke="#0F172A" strokeWidth="2.5"/>
          <line x1="437" y1="334" x2="437" y2="352" stroke="#0F172A" strokeWidth="1.5" opacity="0.5"/>
          <line x1="428" y1="343" x2="446" y2="343" stroke="#0F172A" strokeWidth="1.5" opacity="0.5"/>
          <rect x="452" y="334" width="18" height="18" rx="2" fill="#FEF9C3" stroke="#0F172A" strokeWidth="2.5"/>
          <line x1="461" y1="334" x2="461" y2="352" stroke="#0F172A" strokeWidth="1.5" opacity="0.5"/>
          <line x1="452" y1="343" x2="470" y2="343" stroke="#0F172A" strokeWidth="1.5" opacity="0.5"/>
          {/* Roof */}
          <polygon points="362,322 502,322 432,282" fill="#DC2626" stroke="#0F172A" strokeWidth="3.5" strokeLinejoin="round"/>
          <polygon points="370,322 494,322 432,288" fill="#EF4444" opacity="0.5"/>
          {/* Roof ridge */}
          <line x1="432" y1="282" x2="432" y2="322" stroke="#0F172A" strokeWidth="2" opacity="0.3"/>
          {/* Weathervane */}
          <line x1="432" y1="264" x2="432" y2="283" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round"/>
          <polygon points="432,264 445,270 432,268" fill="#FCD34D" stroke="#0F172A" strokeWidth="1.5"/>
          <circle cx="432" cy="268" r="3" fill="#0F172A"/>
        </g>

        {/* ── SILO ── */}
        <g className="farm-parallax-2">
          <rect x="510" y="300" width="34" height="86" rx="6" fill="#D1D5DB" stroke="#0F172A" strokeWidth="3.5" strokeLinejoin="round"/>
          <rect x="514" y="304" width="22" height="78" rx="3" fill="#F1F5F9" opacity="0.7"/>
          {[310,325,340,355,370].map((y,i) => <line key={i} x1="510" y1={y} x2="544" y2={y} stroke="#0F172A" strokeWidth="1.5" opacity="0.2"/>)}
          <ellipse cx="527" cy="300" rx="17" ry="7" fill="#9CA3AF" stroke="#0F172A" strokeWidth="3.5"/>
          <path d="M510,300 Q527,284 544,300" fill="#B0BEC5" stroke="#0F172A" strokeWidth="3.5" strokeLinejoin="round"/>
        </g>

        {/* ── WINDMILL ── */}
        <g className="farm-parallax-2">
          <rect x="795" y="298" width="10" height="90" fill="#94A3B8" stroke="#0F172A" strokeWidth="3.5" rx="2"/>
          <rect x="792" y="385" width="16" height="4" rx="1" fill="#94A3B8" stroke="#0F172A" strokeWidth="3.5"/>
          <g style={{ transformOrigin: '800px 298px', animation: 'spin-windmill 8s linear infinite' }}>
            <rect x="796" y="248" width="8" height="50" rx="4" fill="#CBD5E1" stroke="#0F172A" strokeWidth="2.5"/>
            <rect x="796" y="298" width="8" height="50" rx="4" fill="#CBD5E1" stroke="#0F172A" strokeWidth="2.5" transform="rotate(120, 800, 298)"/>
            <rect x="796" y="298" width="8" height="50" rx="4" fill="#CBD5E1" stroke="#0F172A" strokeWidth="2.5" transform="rotate(240, 800, 298)"/>
          </g>
          <circle cx="800" cy="298" r="7" fill="#E2E8F0" stroke="#0F172A" strokeWidth="3"/>
          <circle cx="800" cy="298" r="4" fill="#94A3B8"/>
        </g>

        {/* ── PINE TREES ── */}
        <g className="farm-parallax-2">
          <rect x="636" y="348" width="9" height="20" rx="2" fill="#7C3F1A" stroke="#0F172A" strokeWidth="3"/>
          <polygon points="618,352 640,274 662,352" fill="#16A34A" stroke="#0F172A" strokeWidth="3.5" strokeLinejoin="round"/>
          <polygon points="622,328 640,262 658,328" fill="#15803D" stroke="#0F172A" strokeWidth="2"/>
          <polygon points="626,308 640,274 654,308" fill="#166534" stroke="#0F172A" strokeWidth="1.5"/>

          <rect x="691" y="353" width="9" height="18" rx="2" fill="#7C3F1A" stroke="#0F172A" strokeWidth="3"/>
          <polygon points="676,357 695,293 714,357" fill="#16A34A" stroke="#0F172A" strokeWidth="3.5" strokeLinejoin="round"/>
          <polygon points="680,334 695,282 710,334" fill="#15803D" stroke="#0F172A" strokeWidth="2"/>
          <polygon points="684,314 695,293 706,314" fill="#166534" stroke="#0F172A" strokeWidth="1.5"/>
        </g>

        {/* ── ROUND TREES ── */}
        <g className="farm-parallax-2">
          <rect x="267" y="368" width="7" height="18" rx="2" fill="#7C3F1A" stroke="#0F172A" strokeWidth="3"/>
          <circle cx="270" cy="352" r="26" fill="#059669" stroke="#0F172A" strokeWidth="3.5"/>
          <circle cx="270" cy="352" r="22" fill="#10B981" opacity="0.5"/>
          <circle cx="262" cy="344" r="12" fill="#34D399" opacity="0.5"/>
          <circle cx="280" cy="346" r="10" fill="#34D399" opacity="0.35"/>

          <rect x="1077" y="358" width="7" height="20" rx="2" fill="#7C3F1A" stroke="#0F172A" strokeWidth="3"/>
          <circle cx="1080" cy="337" r="30" fill="#059669" stroke="#0F172A" strokeWidth="3.5"/>
          <circle cx="1080" cy="337" r="25" fill="#10B981" opacity="0.5"/>
          <circle cx="1070" cy="328" r="14" fill="#34D399" opacity="0.45"/>
          <circle cx="1092" cy="330" r="11" fill="#34D399" opacity="0.35"/>

          <rect x="1137" y="360" width="7" height="14" rx="2" fill="#7C3F1A" stroke="#0F172A" strokeWidth="3"/>
          <circle cx="1140" cy="347" r="22" fill="#059669" stroke="#0F172A" strokeWidth="3.5"/>
          <circle cx="1140" cy="347" r="18" fill="#10B981" opacity="0.5"/>
          <circle cx="1132" cy="340" r="10" fill="#34D399" opacity="0.4"/>
        </g>

        {/* ── NEAR HILLS ── */}
        <path
          d="M0,410 Q180,380 360,400 Q540,370 720,395 Q900,365 1080,392 Q1260,375 1440,405 L1440,520 L0,520 Z"
          fill="#4ADE80"
          stroke="#0F172A"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* ── CROP ROWS ── */}
        <g opacity="0.6" stroke="#0D5C3A" strokeWidth="3" strokeLinecap="round">
          <line x1="100" y1="435" x2="280" y2="428"/>
          <line x1="100" y1="445" x2="280" y2="438"/>
          <line x1="100" y1="455" x2="280" y2="448"/>
          <line x1="850" y1="422" x2="1020" y2="418"/>
          <line x1="850" y1="432" x2="1020" y2="428"/>
          <line x1="850" y1="442" x2="1020" y2="438"/>
        </g>

        {/* ── FENCE ── */}
        <g stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round">
          <line x1="540" y1="408" x2="540" y2="440"/>
          <line x1="570" y1="406" x2="570" y2="438"/>
          <line x1="600" y1="404" x2="600" y2="436"/>
          <line x1="540" y1="418" x2="600" y2="414"/>
          <line x1="540" y1="432" x2="600" y2="428"/>
        </g>

        {/* ── FOREGROUND HILL ── */}
        <path
          d="M0,465 Q200,440 400,455 Q600,435 800,450 Q1000,432 1200,450 Q1350,442 1440,460 L1440,520 L0,520 Z"
          fill="#22C55E"
          stroke="#0F172A"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* ── WILDFLOWERS ── */}
        <g strokeLinecap="round">
          {[
            {x:155,y:462,r:5,c:'#FCD34D'},{x:170,y:458,r:4,c:'#F472B6'},
            {x:315,y:456,r:5,c:'#FB923C'},{x:330,y:453,r:3.5,c:'#FCD34D'},
            {x:518,y:452,r:5,c:'#F472B6'},{x:534,y:449,r:4,c:'#FB923C'},
            {x:678,y:448,r:4.5,c:'#FCD34D'},{x:692,y:446,r:3.5,c:'#F472B6'},
            {x:915,y:445,r:5,c:'#FB923C'},{x:930,y:442,r:4,c:'#FCD34D'},
            {x:1098,y:448,r:4.5,c:'#F472B6'},{x:1113,y:445,r:3.5,c:'#FB923C'},
            {x:1296,y:452,r:5,c:'#FCD34D'},{x:1311,y:449,r:4,c:'#F472B6'},
          ].map((f,i)=>(
            <g key={i}>
              <line x1={f.x} y1={f.y+f.r} x2={f.x} y2={f.y+f.r+10} stroke="#16A34A" strokeWidth="2"/>
              <circle cx={f.x} cy={f.y} r={f.r} fill={f.c} stroke="#0F172A" strokeWidth="1.5"/>
              <circle cx={f.x} cy={f.y} r={f.r*0.4} fill="#FEF9C3"/>
            </g>
          ))}
        </g>

        {/* ── TRACTOR ── */}
        <g transform="translate(1192, 418) scale(0.72)">
          {/* exhaust */}
          <rect x="52" y="-18" width="7" height="16" rx="3" fill="#374151" stroke="#0F172A" strokeWidth="2"/>
          <ellipse cx="55" cy="-20" rx="6" ry="4" fill="#6B7280" opacity="0.5"/>
          {/* cab */}
          <rect x="28" y="-12" width="30" height="32" rx="4" fill="#16A34A" stroke="#0F172A" strokeWidth="3.5" strokeLinejoin="round"/>
          <rect x="31" y="-9" width="22" height="16" rx="3" fill="#BAE6FD" stroke="#0F172A" strokeWidth="2" opacity="0.9"/>
          {/* body */}
          <rect x="0" y="4" width="46" height="22" rx="4" fill="#DC2626" stroke="#0F172A" strokeWidth="3.5" strokeLinejoin="round"/>
          {/* exhaust pipe detail */}
          <rect x="-10" y="6" width="12" height="5" rx="2" fill="#6B7280" stroke="#0F172A" strokeWidth="2"/>
          {/* big rear wheel */}
          <circle cx="12" cy="30" r="14" fill="#1F2937" stroke="#0F172A" strokeWidth="3.5"/>
          <circle cx="12" cy="30" r="9" fill="#374151"/>
          <circle cx="12" cy="30" r="4" fill="#6B7280"/>
          {[0,60,120,180,240,300].map((d,i)=>{const a=d*Math.PI/180;return <line key={i} x1={12+Math.cos(a)*5} y1={30+Math.sin(a)*5} x2={12+Math.cos(a)*9} y2={30+Math.sin(a)*9} stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>})}
          {/* small front wheel */}
          <circle cx="50" cy="28" r="9" fill="#1F2937" stroke="#0F172A" strokeWidth="3.5"/>
          <circle cx="50" cy="28" r="5" fill="#374151"/>
          <circle cx="50" cy="28" r="2" fill="#6B7280"/>
        </g>
      </svg>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function FarmvestLanding() {
  const mainRef = useRef()
  const cursorRef = useRef(null)
  const dotRef = useRef(null)
  const { farms, setView, setActiveTab, activeFilter, setActiveFilter } = useFarmvestStore()
  const [scrollProgress, setScrollProgress] = useState(0)

  const categories = ['all', 'agriculture', 'dairy', 'organic', 'sustainable', 'renewable']
  const filteredFarms = farms.filter(f => activeFilter === 'all' || f.type === activeFilter)

  const handleInvest = useCallback((farm) => {
    setView('dashboard')
    setActiveTab('investments')
  }, [setView, setActiveTab])

  // ── GSAP + LENIS SETUP ──
  useEffect(() => {
    // Custom cursor hover handlers
    const addHoverClass = () => {
      cursorRef.current?.classList.add('hovered')
      dotRef.current?.classList.add('hovered')
    }
    const removeHoverClass = () => {
      cursorRef.current?.classList.remove('hovered')
      dotRef.current?.classList.remove('hovered')
    }

    // Attach custom cursor mousemove
    const onMouseMove = (e) => {
      const { clientX: x, clientY: y } = e
      
      // Move inner dot instantly
      gsap.to(dotRef.current, {
        x,
        y,
        duration: 0.08,
        ease: 'power2.out'
      })
      
      // Move outer ring with slight lag
      gsap.to(cursorRef.current, {
        x,
        y,
        duration: 0.3,
        ease: 'power2.out'
      })
    }

    window.addEventListener('mousemove', onMouseMove)

    // Setup interactive hovers
    const setupInteractions = () => {
      const interactives = document.querySelectorAll('button, a, input, select, textarea, .interactive, [onClick]')
      interactives.forEach(el => {
        el.addEventListener('mouseenter', addHoverClass)
        el.addEventListener('mouseleave', removeHoverClass)
      })

      // Magnetic buttons
      const magneticBtns = document.querySelectorAll('.btn-magnetic')
      magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
          const rect = btn.getBoundingClientRect()
          const x = e.clientX - rect.left - rect.width / 2
          const y = e.clientY - rect.top - rect.height / 2
          
          gsap.to(btn, {
            x: x * 0.35,
            y: y * 0.35,
            duration: 0.3,
            ease: 'power2.out'
          })
        })
        
        btn.addEventListener('mouseleave', () => {
          gsap.to(btn, {
            x: 0,
            y: 0,
            duration: 0.5,
            ease: 'elastic.out(1, 0.3)'
          })
        })
      })

      // Card cursor tracking
      const cards = document.querySelectorAll('.feature-card, .investment-card')
      cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          card.style.setProperty('--mouse-x', `${x}px`)
          card.style.setProperty('--mouse-y', `${y}px`)
        })
      })
    }

    // Small delay to ensure all DOM elements are mounted and parsed
    const t = setTimeout(setupInteractions, 300)

    // Smooth scrolling
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    lenis.on('scroll', (e) => {
      ScrollTrigger.update()
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(docHeight > 0 ? (e.scroll / docHeight) * 100 : 0)
    })

    gsap.ticker.add((time) => { lenis.raf(time * 1000) })
    gsap.ticker.lagSmoothing(0)

    // GSAP animations
    const ctx = gsap.context(() => {
      // Hero elements stagger
      gsap.from('.hero-animate', {
        y: 80,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: 'power4.out',
        delay: 0.2,
      })

      // Each scroll section fades/slides in
      gsap.utils.toArray('.scroll-reveal').forEach((el) => {
        gsap.from(el, {
          y: 60,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        })
      })

      // Stagger children
      gsap.utils.toArray('.stagger-children').forEach((parent) => {
        gsap.from(parent.children, {
          y: 50,
          opacity: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: parent,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        })
      })

      // Farm parallax layers
      gsap.to('.farm-parallax-1', {
        y: -25,
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: 1.5,
        },
      })
      gsap.to('.farm-parallax-2', {
        y: -50,
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: 1.5,
        },
      })
    }, mainRef)

    return () => {
      ctx.revert()
      lenis.destroy()
      window.removeEventListener('mousemove', onMouseMove)
      clearTimeout(t)
    }
  }, [])

  /* ───────────────────── FEATURES DATA ───────────────────── */
  const features = [
    { icon: Shield, title: 'Real Physical Assets', desc: 'Every investment is backed by real, physical farmland with verified GPS-tracked boundaries.', color: 'bg-green-50 text-green-600' },
    { icon: DollarSign, title: 'Quarterly Returns', desc: 'Receive automated quarterly payouts directly to your wallet or bank account.', color: 'bg-blue-50 text-blue-600' },
    { icon: Cpu, title: 'AI-Powered Analytics', desc: 'Our AI models analyze satellite data, soil health, and weather to maximize yields.', color: 'bg-purple-50 text-purple-600' },
    { icon: Lock, title: 'Blockchain Secured', desc: 'All transactions are recorded on-chain for maximum transparency and auditability.', color: 'bg-orange-50 text-orange-600' },
    { icon: Globe, title: 'Global Diversification', desc: 'Invest across farms in 15+ countries to build a resilient agricultural portfolio.', color: 'bg-cyan-50 text-cyan-600' },
    { icon: Smartphone, title: 'Mobile Dashboard', desc: 'Track your investments, yields, and returns from anywhere with our mobile app.', color: 'bg-pink-50 text-pink-600' },
  ]

  /* ───────────────────── TESTIMONIALS DATA ───────────────── */
  const testimonials = [
    { name: 'Marcus Thorne', role: 'Angel Investor', country: '🇬🇧 UK', profit: '+$12,400', quote: 'Farmvest completely changed my portfolio allocation. Seeing real crop growth metrics online is incredibly reassuring.' },
    { name: 'Elena Rostova', role: 'Fund Manager', country: '🇩🇪 Germany', profit: '+$8,950', quote: 'Outstanding platform! The AI insights suggested citrus groves in Spain which yielded exceptional payouts.' },
    { name: 'Siddharth Mehta', role: 'Tech Entrepreneur', country: '🇮🇳 India', profit: '+$24,000', quote: 'Fractional investing lets me diversify across regions. The telemetry data ensures maximum crop yields.' },
    { name: 'Jane Foster', role: 'ESG Analyst', country: '🇨🇦 Canada', profit: '+$15,600', quote: 'Perfect ESG investment vehicle. Solar cooperatives with stable dividends easily beats traditional bonds.' },
    { name: 'Kenji Yamamoto', role: 'Portfolio Manager', country: '🇯🇵 Japan', profit: '+$19,200', quote: 'The transparency is unmatched. Real-time satellite imagery of my invested farms gives me full confidence.' },
    { name: 'Amara Osei', role: 'Impact Investor', country: '🇬🇭 Ghana', profit: '+$11,800', quote: 'Finally an investment platform that creates real impact while delivering consistent returns.' },
  ]

  /* ───────────────────── HOW IT WORKS STEPS ───────────────── */
  const steps = [
    { num: '01', title: 'Create Account', desc: 'Sign up in under 3 minutes with email or social login. Verify your identity securely.', icon: Users },
    { num: '02', title: 'Choose Your Farm', desc: 'Browse available farm projects. Review ROI projections, satellite data, and risk assessments.', icon: Sprout },
    { num: '03', title: 'Earn Returns', desc: 'Receive quarterly payouts as crops are harvested and sold. Track everything live.', icon: TrendingUp },
  ]

  return (
    <div ref={mainRef} className="relative">
      {/* ── CUSTOM CURSOR ── */}
      <div ref={cursorRef} className="custom-cursor" />
      <div ref={dotRef} className="custom-cursor-dot" />

      {/* ── SCROLL PROGRESS BAR ── */}
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />

      {/* ═══════════════════════════════════════════════════════
          SECTION 1: HERO
          ═══════════════════════════════════════════════════════ */}
      <section className="hero-section relative min-h-[100vh] flex flex-col items-center justify-center overflow-hidden py-16"
        style={{ 
          background: 'radial-gradient(#cbd5e1 1.5px, #FFFDF0 1.5px)', 
          backgroundSize: '28px 28px' 
        }}
      >
        <FarmScene />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto pt-24 pb-60 sm:pb-72">
          {/* Illustrated Sticker Badge */}
          <div className="hero-animate inline-flex items-center gap-2.5 bg-yellow-300 border-3 border-slate-900 text-slate-900 text-xs font-black uppercase tracking-widest px-6 py-3 rounded-full mb-8 shadow-[3px_3px_0px_0px_#0F172A] rotate-[-1deg]">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 border-1.5 border-slate-900 animate-pulse" />
            Smart Agricultural Investing Platform
          </div>

          {/* Headline */}
          <h1 className="hero-animate hero-title-responsive font-display font-black text-5xl sm:text-6xl md:text-7xl tracking-tight text-slate-900 mb-7 leading-[1.08]">
            Invest in the Future<br />
            of <span className="inline-block px-5 py-2 bg-green-400 border-3 border-slate-900 text-slate-900 shadow-[5px_5px_0px_0px_#0F172A] rounded-2xl rotate-[-2deg] my-2">Agriculture</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-animate text-base sm:text-lg md:text-xl font-bold text-slate-700 max-w-2xl mx-auto mb-10 leading-relaxed">
            Grow your wealth through smart, fractional, and sustainable agricultural investments.
            Backed by real physical farm assets and AI-powered satellite analytics.
          </p>

          {/* CTA Buttons */}
          <div className="hero-animate flex flex-wrap items-center justify-center gap-5 mb-14">
            <button
              onClick={() => setView('get-started')}
              className="btn-magnetic px-8 py-4.5 rounded-2xl text-sm sm:text-base font-black bg-green-400 hover:bg-green-300 text-slate-900 flex items-center gap-2.5 cursor-pointer shadow-lg"
            >
              Start Investing <ArrowRight size={18} className="stroke-[3px]" />
            </button>
            <button
              onClick={() => setView('dashboard')}
              className="btn-magnetic px-8 py-4.5 rounded-2xl text-sm sm:text-base font-black bg-white hover:bg-slate-50 text-slate-900 flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Eye size={18} className="stroke-[3px]" /> View Dashboard
            </button>
          </div>

          {/* Quick Stats (Postcards Style) */}
          <div className="hero-animate flex flex-wrap justify-center gap-6 sm:gap-8">
            {[
              { label: 'Total Invested', value: '$35M+', bg: 'bg-amber-100', rotate: 'rotate-[-1.5deg]' },
              { label: 'Active Investors', value: '12,000+', bg: 'bg-cyan-100', rotate: 'rotate-[1.5deg]' },
              { label: 'Avg. Annual ROI', value: '16.8%', bg: 'bg-pink-100', rotate: 'rotate-[-2deg]' },
            ].map((stat) => (
              <div key={stat.label} className={`text-center ${stat.bg} border-3 border-slate-900 rounded-2xl px-6 py-4 shadow-[4px_4px_0px_0px_#0F172A] ${stat.rotate} hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-pointer`}>
                <p className="font-display font-black text-2xl sm:text-3xl text-slate-900 leading-none">{stat.value}</p>
                <p className="text-[10px] text-slate-700 mt-1.5 font-black uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 opacity-85">
          <span className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-800">Scroll to explore</span>
          <div className="w-6 h-9 rounded-full border-3 border-slate-900 flex justify-center pt-1.5 bg-white shadow-[2px_2px_0px_0px_#0F172A]">
            <div className="w-1.5 h-2.5 rounded-full bg-slate-900 animate-bounce-soft" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          TRUST BAR / MARQUEE (Chunky Warning-Tape Style)
          ═══════════════════════════════════════════════════════ */}
      <section className="py-8 bg-yellow-300 border-y-4 border-slate-900 overflow-hidden transform rotate-[1deg] w-[105%] -left-[2.5%] relative z-20 shadow-[0px_4px_0px_0px_#0F172A]">
        <div className="flex items-center animate-marquee w-max">
          {[...Array(2)].map((_, setIdx) => (
            <div key={setIdx} className="flex items-center gap-12 px-6">
              {['AgriTech Global', 'CropChain', 'GreenField DAO', 'SoilSense AI', 'FarmFi Protocol', 'TerraByte Labs', 'AquaHarvest', 'Yield Network'].map((name) => (
                <div key={name + setIdx} className="flex items-center gap-2 text-slate-900 hover:text-green-700 transition-colors">
                  <Leaf size={20} className="stroke-[3.5px] text-slate-900" />
                  <span className="font-display font-black text-lg uppercase tracking-wider whitespace-nowrap">{name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2: OPEN FOR INVESTMENT
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 px-6 bg-[#FAFAF5]" id="investments"
        style={{ 
          backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', 
          backgroundSize: '24px 24px' 
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="scroll-reveal text-center mb-16">
            <span className="inline-flex items-center gap-2 text-xs font-black bg-green-400 border-2 border-slate-900 text-slate-900 px-4 py-2 rounded-full shadow-[2.5px_2.5px_0px_0px_#0F172A] uppercase tracking-widest mb-4">
              <Sprout size={14} className="stroke-[2.5px]" /> Open Projects
            </span>
            <h2 className="font-display font-black text-3xl sm:text-4xl md:text-5xl text-slate-900 mb-5 leading-tight">
              Open for Investment
            </h2>
            <p className="text-slate-600 font-bold text-base sm:text-lg max-w-2xl mx-auto">
              Browse verified farm projects with transparent financials, satellite monitoring, and guaranteed quarterly payouts.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="scroll-reveal flex flex-wrap justify-center gap-3 mb-12">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer border-3 border-slate-900 ${
                  activeFilter === cat
                    ? 'bg-green-400 text-slate-900 shadow-[3px_3px_0px_0px_#0F172A] translate-x-[-1px] translate-y-[-1px]'
                    : 'bg-white text-slate-700 hover:bg-slate-50 shadow-[3px_3px_0px_0px_#0F172A] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#0F172A]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredFarms.map((farm, i) => (
              <InvestmentCard key={farm.id} farm={farm} index={i} onInvest={() => handleInvest(farm)} />
            ))}
          </div>

          {filteredFarms.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <Sprout size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No projects in this category yet.</p>
            </div>
          )}

          <p className="scroll-reveal text-center text-xs font-bold text-slate-500 mt-10">
            * Fractional allocations are locked to real assets. Expected returns are paid quarterly.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3: HOW IT WORKS
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 px-6 bg-white" id="how-it-works">
        <div className="max-w-5xl mx-auto">
          <div className="scroll-reveal text-center mb-20">
            <span className="inline-flex items-center gap-2 text-xs font-black bg-cyan-300 border-2 border-slate-900 text-slate-900 px-4 py-2 rounded-full shadow-[2.5px_2.5px_0px_0px_#0F172A] uppercase tracking-widest mb-4">
              <Zap size={14} className="stroke-[2.5px] fill-slate-900" /> Simple Process
            </span>
            <h2 className="font-display font-black text-3xl sm:text-4xl md:text-5xl text-slate-900 mb-5 leading-tight">
              How It Works
            </h2>
            <p className="text-slate-600 font-bold text-base sm:text-lg max-w-xl mx-auto">
              Start investing in sustainable agriculture in three simple steps.
            </p>
          </div>

          <div className="stagger-children grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {steps.map((step, i) => (
              <div key={step.num} className="relative text-center border-3 border-slate-900 bg-amber-50/80 rounded-3xl p-8 shadow-[5px_5px_0px_0px_#0F172A] hover:translate-y-[-4px] hover:rotate-[1deg] transition-all duration-300">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="step-connector hidden md:block" />
                )}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-200 text-slate-900 border-3 border-slate-900 shadow-[3px_3px_0px_0px_#0F172A] mb-6 mx-auto">
                  <step.icon size={28} className="stroke-[2.5px]" />
                </div>
                <div className="text-xs font-black bg-slate-900 text-white rounded-lg px-3 py-1.5 inline-block shadow-[2px_2px_0px_0px_#22C55E] mb-4 uppercase tracking-widest">{step.num}</div>
                <h3 className="font-display font-black text-xl text-slate-900 mb-3">{step.title}</h3>
                <p className="text-sm font-bold text-slate-600 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4: WHY FARMVEST (FEATURES)
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 px-6 bg-[#FAFAF5]" id="features"
        style={{ 
          backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', 
          backgroundSize: '24px 24px' 
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="scroll-reveal text-center mb-16">
            <span className="inline-flex items-center gap-2 text-xs font-black bg-pink-300 border-2 border-slate-900 text-slate-900 px-4 py-2 rounded-full shadow-[2.5px_2.5px_0px_0px_#0F172A] uppercase tracking-widest mb-4">
              <Shield size={14} className="stroke-[2.5px]" /> Why Farmvest
            </span>
            <h2 className="font-display font-black text-3xl sm:text-4xl md:text-5xl text-slate-900 mb-5 leading-tight">
              Built for Smart Investors
            </h2>
            <p className="text-slate-600 font-bold text-base sm:text-lg max-w-2xl mx-auto">
              Everything you need to invest confidently in sustainable agriculture.
            </p>
          </div>

          <div className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => (
              <div key={feat.title} className="feature-card group">
                <div className={`icon-wrap ${feat.color} shadow-[3px_3px_0px_0px_#0F172A]`}>
                  <feat.icon size={26} className="stroke-[2.5px]" />
                </div>
                <h3 className="font-display font-black text-lg text-slate-900 mb-2 group-hover:text-green-600 transition-colors">
                  {feat.title}
                </h3>
                <p className="text-sm font-bold text-slate-600 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5: LIVE STATS (Retro Console Style)
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 px-6 relative overflow-hidden border-y-4 border-slate-900 bg-emerald-900" id="stats">
        {/* Retro dots grid overlay */}
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="scroll-reveal text-center mb-16">
            <span className="inline-flex items-center gap-2 text-xs font-black bg-yellow-300 border-2 border-slate-900 text-slate-900 px-4 py-2 rounded-full shadow-[2.5px_2.5px_0px_0px_#0F172A] uppercase tracking-widest mb-4">
              <Globe size={14} className="stroke-[3px]" /> Live Platform
            </span>
            <h2 className="font-display font-black text-3xl sm:text-4xl md:text-5xl text-white mb-5 leading-tight">
              Growing Every Day
            </h2>
            <p className="text-emerald-100 font-bold text-base sm:text-lg max-w-xl mx-auto">
              Real numbers from our platform, updated in real-time.
            </p>
          </div>

          <div className="stagger-children grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              { label: 'Total Invested', value: '35480000', prefix: '$', suffix: '', icon: DollarSign, bg: 'bg-[#FFFDF0]' },
              { label: 'Active Investors', value: '12450', prefix: '', suffix: '+', icon: Users, bg: 'bg-[#FFFDF0]' },
              { label: 'Avg ROI Paid', value: '16', prefix: '', suffix: '.8%', icon: TrendingUp, bg: 'bg-[#FFFDF0]' },
              { label: 'Acres Managed', value: '8200', prefix: '', suffix: ' Ac', icon: Leaf, bg: 'bg-[#FFFDF0]' },
            ].map((stat) => (
              <div key={stat.label} className={`text-center ${stat.bg} text-slate-900 border-3 border-slate-900 rounded-3xl p-6 sm:p-8 shadow-[5px_5px_0px_0px_#0F172A] hover:translate-y-[-4px] hover:rotate-[-1deg] transition-all duration-300 group`}>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-yellow-300 border-2 border-slate-900 text-slate-900 shadow-[2px_2px_0px_0px_#22C55E] mb-4 group-hover:scale-110 transition-transform">
                  <stat.icon size={22} className="stroke-[2.5px]" />
                </div>
                <h3 className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-slate-900 mb-2 leading-none">
                  <AnimatedCounter target={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-600 font-black uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6: TESTIMONIALS
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 px-6 bg-white overflow-hidden" id="testimonials">
        <div className="max-w-7xl mx-auto">
          <div className="scroll-reveal text-center mb-16">
            <span className="inline-flex items-center gap-2 text-xs font-black bg-orange-300 border-2 border-slate-900 text-slate-900 px-4 py-2 rounded-full shadow-[2.5px_2.5px_0px_0px_#0F172A] uppercase tracking-widest mb-4">
              <Star size={14} className="stroke-[2.5px] fill-slate-900 text-slate-900" /> Testimonials
            </span>
            <h2 className="font-display font-black text-3xl sm:text-4xl md:text-5xl text-slate-900 mb-5 leading-tight">
              Loved by Investors
            </h2>
            <p className="text-slate-600 font-bold text-base sm:text-lg max-w-xl mx-auto">
              Hear from our community of smart agricultural investors worldwide.
            </p>
          </div>
        </div>

        {/* Marquee Row 1 */}
        <div className="relative w-full flex items-center overflow-hidden mb-6">
          <div className="flex gap-6 animate-marquee w-max py-2">
            {[...testimonials, ...testimonials].map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-yellow-300 flex items-center justify-center text-slate-900 font-black text-sm shadow-[1.5px_1.5px_0px_0px_#0F172A]">
                      {t.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{t.name}</p>
                      <p className="text-[10px] font-bold text-slate-500">{t.role} · {t.country}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-slate-900 bg-green-300 border-2 border-slate-900 px-2.5 py-1 rounded-full shadow-[1.5px_1.5px_0px_0px_#0F172A]">{t.profit}</span>
                </div>
                <p className="text-sm font-bold text-slate-600 leading-relaxed italic">"{t.quote}"</p>
                <div className="flex gap-0.5 mt-4">
                  {[...Array(5)].map((_, s) => <Star key={s} size={14} className="text-yellow-400 fill-yellow-400" />)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Marquee Row 2 (reverse) */}
        <div className="relative w-full flex items-center overflow-hidden">
          <div className="flex gap-6 animate-marquee-reverse w-max py-2">
            {[...testimonials.reverse(), ...testimonials].map((t, i) => (
              <div key={i + 100} className="testimonial-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-cyan-300 flex items-center justify-center text-slate-900 font-black text-sm shadow-[1.5px_1.5px_0px_0px_#0F172A]">
                      {t.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{t.name}</p>
                      <p className="text-[10px] font-bold text-slate-500">{t.role} · {t.country}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-slate-900 bg-green-300 border-2 border-slate-900 px-2.5 py-1 rounded-full shadow-[1.5px_1.5px_0px_0px_#0F172A]">{t.profit}</span>
                </div>
                <p className="text-sm font-bold text-slate-600 leading-relaxed italic">"{t.quote}"</p>
                <div className="flex gap-0.5 mt-4">
                  {[...Array(5)].map((_, s) => <Star key={s} size={14} className="text-yellow-400 fill-yellow-400" />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7: CTA
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 sm:py-32 px-6 bg-[#FAFAF5]" id="cta">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-[36px] overflow-hidden p-12 sm:p-16 text-center border-4 border-slate-900 bg-yellow-300 shadow-[8px_8px_0px_0px_#0F172A]"
          >
            {/* Retro dots overlay */}
            <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(#000_1px,transparent_1px)] bg-[size:16px_16px]" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-slate-900 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#22C55E] text-xs font-black px-5 py-2.5 rounded-full mb-8 uppercase tracking-widest">
                <Sparkles size={14} className="text-yellow-300 stroke-[2.5px]" /> Limited slots available
              </div>

              <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-white mb-6 leading-tight">
                Ready to Grow<br />Your Wealth?
              </h2>
              <p className="text-slate-800 font-bold text-base sm:text-lg max-w-lg mx-auto mb-10 leading-relaxed">
                Join 12,000+ investors earning sustainable returns from real agricultural assets.
                Get started in under 3 minutes.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-5">
                <button
                  onClick={() => setView('get-started')}
                  className="btn-magnetic px-8 py-4.5 rounded-2xl text-base font-black bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2.5 cursor-pointer shadow-[3px_3px_0px_0px_rgba(15,23,42,0.15)]"
                >
                  Create Free Account <ArrowRight size={18} className="stroke-[3px] text-green-400" />
                </button>
                <button
                  onClick={() => setView('login')}
                  className="btn-magnetic px-8 py-4.5 rounded-2xl text-base font-black bg-white hover:bg-slate-50 text-slate-900 flex items-center gap-2 cursor-pointer shadow-[3px_3px_0px_0px_#0F172A] border-3 border-slate-900"
                >
                  Sign In
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER (Comic Layout)
          ═══════════════════════════════════════════════════════ */}
      <footer className="py-16 sm:py-20 px-6 bg-slate-900 text-slate-400 border-t-4 border-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-5 select-none cursor-pointer" onClick={() => setView('home')}>
                <div className="w-10 h-10 rounded-xl bg-green-400 border-2.5 border-slate-900 flex items-center justify-center text-slate-900 font-black text-base shadow-[2px_2px_0px_0px_#FFFDF0]">
                  F
                </div>
                <span className="font-display font-black text-2xl text-white">Farmvest</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-400 mb-6 font-bold">
                The world's most trusted platform for fractional agricultural investing. Real farms, real returns.
              </p>
              <div className="flex gap-3">
                {['Twitter', 'LinkedIn', 'Discord'].map(s => (
                  <a key={s} href="#" className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-black border-2 border-slate-700 hover:border-green-400 hover:text-white hover:bg-slate-700 transition-all shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,0.05)]">{s}</a>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider mb-5 bg-slate-800 border-2 border-slate-700 px-3 py-1.5 rounded-lg inline-block">Platform</h4>
              <ul className="space-y-3 text-sm font-bold">
                {['Investments', 'Dashboard', 'Analytics', 'Mobile App'].map(link => (
                  <li key={link}><a href="#" className="hover:text-green-400 transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider mb-5 bg-slate-800 border-2 border-slate-700 px-3 py-1.5 rounded-lg inline-block">Company</h4>
              <ul className="space-y-3 text-sm font-bold">
                {['About Us', 'Careers', 'Press Kit', 'Blog'].map(link => (
                  <li key={link}><a href="#" className="hover:text-green-400 transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider mb-5 bg-slate-800 border-2 border-slate-700 px-3 py-1.5 rounded-lg inline-block">Newsletter</h4>
              <p className="text-sm text-slate-400 mb-4 font-bold">Get weekly updates on high-yield farm opportunities.</p>
              <form className="flex gap-2.5" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-green-400 transition-colors placeholder:text-slate-500 font-bold"
                />
                <button type="submit" className="px-4 py-3 bg-green-400 hover:bg-green-300 text-slate-900 border-2 border-slate-900 rounded-xl transition-all cursor-pointer shadow-[2px_2px_0px_0px_#FFFDF0]">
                  <ArrowRight size={16} className="stroke-[3.5px]" />
                </button>
              </form>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t-2 border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-500">
            <p>© 2026 Farmvest Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-green-400 transition-colors">Terms</a>
              <a href="#" className="hover:text-green-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-green-400 transition-colors">SEC Disclosures</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
