import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Leaf, MapPin, BarChart3, Sprout, Zap, Droplets, ArrowRight, Shield, Globe, Cpu, Users, Star, 
  ChevronLeft, ChevronRight, Wind, DollarSign, Calendar
} from 'lucide-react'
import { Scroll } from '@react-three/drei'
import { useFarmvestStore } from '../store/useFarmvestStore'

// Helper Component: Farmland Card
function InvestmentCard({ farm, onInvest }) {
  return (
    <motion.div 
      whileHover={{ y: -8 }}
      className="w-80 shrink-0 rounded-3xl p-5 bg-[#0E1728]/75 backdrop-blur-md border border-white/5 shadow-2xl flex flex-col justify-between group dark-glow-border transition-all duration-300"
    >
      <div>
        <div 
          className="h-28 rounded-2xl mb-4 relative overflow-hidden flex items-center justify-center text-white"
          style={{ background: farm.imageGradient }}
        >
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[1.5px]" />
          <Sprout size={32} className="relative z-10 opacity-70 group-hover:scale-110 transition-transform duration-300" />
          <span className="absolute bottom-3 left-3 text-[9px] font-bold bg-black/40 px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">
            {farm.type}
          </span>
        </div>

        <div className="flex justify-between items-start mb-2">
          <h4 className="font-display font-bold text-sm leading-snug group-hover:text-blue-400 transition-colors text-white">{farm.name}</h4>
          <span className="text-xs font-extrabold text-emerald-400 shrink-0">{farm.roi}% ROI</span>
        </div>

        <p className="text-[10px] text-gray-500 mb-3 flex items-center gap-1">
          <MapPin size={11} /> {farm.location}
        </p>
        <p className="text-xs text-gray-300 leading-relaxed mb-6 line-clamp-3">{farm.desc}</p>
      </div>

      <div className="space-y-4 mt-auto">
        <div>
          <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-semibold uppercase">
            <span>Funding Progress</span>
            <span>{farm.progress}%</span>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${farm.progress}%` }} />
          </div>
        </div>

        <button 
          onClick={onInvest}
          className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 transition-all duration-300"
        >
          Invest Now <ArrowRight size={14} />
        </button>
      </div>
    </motion.div>
  )
}

// Animated Stat Counter
function StatCounter({ target, suffix = "", duration = 2000 }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const end = parseInt(target)
    if (start === end) return

    const totalMiliseconds = duration
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 20)
    
    const timer = setInterval(() => {
      start += Math.ceil(end / 40)
      if (start >= end) {
        clearInterval(timer)
        setCount(end)
      } else {
        setCount(start)
      }
    }, incrementTime)

    return () => clearInterval(timer)
  }, [target, duration])

  return (
    <span>{count.toLocaleString()}{suffix}</span>
  )
}

export default function Overlay() {
  const { setView, setActiveTab, farms, activeFilter, setActiveFilter, theme } = useFarmvestStore()
  const [carouselIndex, setCarouselIndex] = useState(0)

  const isDark = theme === 'dark'

  // Categories list
  const categories = ['all', 'agriculture', 'dairy', 'organic', 'sustainable', 'renewable']

  // Filter farms by category
  const filteredFarms = farms.filter(farm => {
    if (activeFilter === 'all') return true
    return farm.type === activeFilter
  })

  const handleCarouselNext = () => {
    setCarouselIndex(prev => Math.min(filteredFarms.length - 1, prev + 1))
  }

  const handleCarouselPrev = () => {
    setCarouselIndex(prev => Math.max(0, prev - 1))
  }

  // Quick CTA link to Dashboard
  const handleQuickInvest = (farm) => {
    setView('dashboard')
    setActiveTab('investments')
  }

  return (
    <Scroll html style={{ width: '100%', pointerEvents: 'none' }}>
      <div className="w-full relative pointer-events-none">
      
      {/* ── BACKGROUND FLOATING ELEMENTS (HOMEPAGE EXCLUSIVE) ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* CSS Clouds */}
        <div className="absolute top-[10vh] left-0 w-32 h-16 bg-white/10 rounded-full blur-md animate-cloud-slow" />
        <div className="absolute top-[25vh] left-0 w-44 h-20 bg-white/5 rounded-full blur-lg animate-cloud-fast" style={{ animationDelay: '10s' }} />
        
        {/* Flying plane */}
        <div className="absolute animate-fly-plane z-20 pointer-events-none">
          <svg className="w-16 h-8 text-blue-500/20 fill-current" viewBox="0 0 100 50">
            <path d="M10 20 L40 20 L55 5 L65 5 L60 20 L85 20 L92 12 L98 12 L94 25 L98 38 L92 38 L85 30 L60 30 L65 45 L55 45 L40 30 L10 30 Z" />
          </svg>
        </div>
      </div>

      {/* ── HTML CONTENT SECTIONS ── */}
      <div className="html-content relative z-10 w-full">

        {/* ── SECTION 1: HERO ── */}
        <section className="section hero-section flex items-start justify-center h-screen px-6 sm:px-16">
          <div className="section-content pointer-events-auto max-w-xl text-left">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="hero-eyebrow text-xs font-bold flex items-center gap-1.5 uppercase text-blue-500 tracking-widest mb-4"
            >
              <Zap size={14} className="animate-pulse" /> Platform Live version 2.4
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="hero-title font-display font-extrabold text-4xl sm:text-6xl tracking-tight leading-[1.05] mb-6"
            >
              Investing in <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-emerald-400 to-blue-500">
                Krishi AI.
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hero-subtitle text-sm sm:text-base text-gray-400 leading-relaxed mb-8 max-w-md"
            >
              Grow your wealth through smart, fractional, and sustainable agricultural investments. Backed by real physical land holdings and automated satellite telemetry.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="flex flex-wrap gap-4"
            >
              <button 
                onClick={() => { setView('dashboard'); setActiveTab('investments'); }}
                className="btn-primary px-6 py-3 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 hover:shadow-lg shadow-blue-500/10 transition-all duration-300 pointer-events-auto"
              >
                Explore Investments <ArrowRight size={14} />
              </button>
              <button 
                onClick={() => { setView('login') }}
                className="btn-ghost px-6 py-3 rounded-full text-xs font-semibold border border-white/10 hover:border-blue-500 hover:bg-blue-500/5 text-gray-400 hover:text-white transition-all duration-300 pointer-events-auto"
              >
                Access Dashboard
              </button>
            </motion.div>

            {/* Scroll Indicator */}
            <div className="scroll-cue mt-16 flex flex-col items-start gap-2 opacity-50">
              <span className="text-[9px] uppercase tracking-widest font-bold text-gray-500">Scroll to Explore</span>
              <div className="w-[1px] h-12 bg-gradient-to-b from-blue-500 to-transparent" />
            </div>
          </div>
        </section>

        {/* ── SECTION 2: PORTFOLIO TRACKING ── */}
        <section className="section feature-section flex items-start justify-center h-screen px-6 sm:px-16">
          <div className="section-content pointer-events-auto glass-panel p-6 sm:p-8 rounded-3xl max-w-lg border border-white/5">
            <div className="flex items-center gap-2 text-xs text-blue-400 font-bold uppercase tracking-wider mb-4">
              <BarChart3 size={16} /> Portfolio Tracking
            </div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight leading-tight mb-4 text-white">
              Track your portfolios <br />everywhere.
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed mb-6">
              Our advanced telemetry system generates a live digital twin of your back farmland holdings. Track real-time water tables, soil moisture indexes, and projected crop yield parameters from any desktop or mobile device.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                <span className="text-[10px] text-gray-500 uppercase font-semibold">Yield Precision</span>
                <p className="text-base font-bold text-emerald-400 font-display mt-1">99.8% Accuracy</p>
              </div>
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
                <span className="text-[10px] text-gray-500 uppercase font-semibold">Downlink Stream</span>
                <p className="text-base font-bold text-blue-400 font-display mt-1">100% Automated</p>
              </div>
            </div>

            <button 
              onClick={() => { setView('dashboard'); setActiveTab('portfolio'); }}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors pointer-events-auto"
            >
              Launch Diagnostics Live <ArrowRight size={14} />
            </button>
          </div>
        </section>

        {/* ── SECTION 3: OPEN FOR INVESTMENT (CAROUSEL) ── */}
        <section className="section feature-section flex flex-col items-start justify-center h-screen px-6 sm:px-16 overflow-hidden">
          <div className="section-content pointer-events-auto w-full max-w-5xl">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 text-xs text-green-400 font-bold uppercase tracking-wider mb-2">
                  <Sprout size={16} /> Open Projects
                </div>
                <h2 className="font-display font-extrabold text-2xl sm:text-4xl tracking-tight text-white leading-tight">
                  Open for Backing
                </h2>
              </div>

              {/* Filtering tabs */}
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveFilter(cat)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all border ${
                      activeFilter === cat 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white/5 border-white/5 hover:border-white/20 text-gray-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Horizontal Carousel */}
            <div className="relative flex items-center w-full">
              <div className="flex gap-6 overflow-x-auto no-scrollbar pb-6 scroll-smooth w-full">
                {filteredFarms.map((farm) => (
                  <InvestmentCard 
                    key={farm.id} 
                    farm={farm} 
                    onInvest={() => handleQuickInvest(farm)} 
                  />
                ))}
                {filteredFarms.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-12 w-full">No active farm listings in this sector.</p>
                )}
              </div>
            </div>
            
            <p className="text-[10px] text-gray-500 mt-2">
              * Fractional allocations are locked to real assets. Expected returns are paid quarterly in stable coin or direct wire payouts.
            </p>
          </div>
        </section>

        {/* ── SECTION 4: WHY BACK FARMVEST (DARK SOIL) ── */}
        <section className="section feature-section flex items-start justify-center h-screen px-6 sm:px-16">
          <div className="section-content pointer-events-auto glass-panel p-6 sm:p-8 rounded-3xl max-w-lg border border-white/5 bg-[#0e120e]/80">
            <div className="flex items-center gap-2 text-xs text-[#22C55E] font-bold uppercase tracking-wider mb-4">
              <Shield size={16} /> Security Framework
            </div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight leading-tight mb-4 text-white">
              Smart Sustainable <br />Farming Systems.
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed mb-6">
              Our backing integrates deep organic crop science with robotic automation. Crop duster systems scan leaf spectra utilizing computer vision, reducing chemical dependency by 80% and building richer soil structures.
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
                  <Wind size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Automated Windmills</p>
                  <span className="text-[10px] text-gray-500">Off-grid renewable power generation</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Cpu size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Robotic Crop Management</p>
                  <span className="text-[10px] text-gray-500">No-chemical targeted drip moisture valves</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 5: LIVE INVESTMENT STATS ── */}
        <section className="section feature-section flex items-start justify-center h-screen px-6 sm:px-16">
          <div className="section-content pointer-events-auto glass-panel p-6 sm:p-8 rounded-3xl max-w-lg border border-white/5">
            <div className="flex items-center gap-2 text-xs text-indigo-400 font-bold uppercase tracking-wider mb-6">
              <Globe size={16} /> Live Platform Stats
            </div>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-semibold">Total Capital Invested</span>
                <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white mt-1">
                  $<StatCounter target="35480000" />
                </h3>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-semibold">Active Global Backers</span>
                <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white mt-1">
                  <StatCounter target="12450" />
                </h3>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-semibold">Average ROI Paid</span>
                <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-emerald-400 mt-1">
                  16.8%
                </h3>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-semibold">Acres Managed</span>
                <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-blue-400 mt-1">
                  <StatCounter target="8200" suffix=" Ac" />
                </h3>
              </div>
            </div>

            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex gap-3 items-center">
              <div className="w-9 h-9 rounded-full bg-blue-600/10 text-blue-500 flex items-center justify-center shrink-0">
                <Users size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Platform Growth Index</p>
                <span className="text-[10px] text-gray-500">Up 14.5% month-over-month</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 6: TESTIMONIALS (MARQUEE) ── */}
        <section className="section feature-section flex flex-col items-center justify-center h-screen px-6 overflow-hidden">
          <div className="section-content pointer-events-auto w-full max-w-5xl">
            <div className="text-center mb-12">
              <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Testimonials</span>
              <h2 className="font-display font-extrabold text-2xl sm:text-4xl text-white mt-2">What Our Investors Say</h2>
            </div>

            <div className="relative w-full flex items-center overflow-hidden py-4">
              {/* Testimonials Infinite Marquee */}
              <div className="flex gap-6 animate-marquee w-max">
                {[
                  { name: "Marcus Thorne", profit: "+$12,400", duration: "12 Mos", country: "United Kingdom", quote: "Farmvest completely changed my allocation options. Seeing physical crop fields growth parameters online is incredibly reassuring." },
                  { name: "Elena Rostova", profit: "+$8,950", duration: "9 Mos", country: "Germany", quote: "Outstanding platform usability! The automated AI insights suggested Citruses groves in Spain which yielded high payouts." },
                  { name: "Siddharth Mehta", profit: "+$24,000", duration: "18 Mos", country: "India", quote: "Fractional backing allows diversifying crop regions across basins. Drip water telemetry ensures maximum crop yields." },
                  { name: "Jane Foster", profit: "+$15,600", duration: "24 Mos", country: "Canada", quote: "Perfect ESG platform. Building clean energy solar cooperators while securing stable dividends beats typical bonds." }
                ].map((item, idx) => (
                  <div key={idx} className="w-80 shrink-0 p-5 rounded-2xl bg-[#0E1728]/80 backdrop-blur-md border border-white/5 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-white">{item.name}</h4>
                        <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10 font-bold">{item.profit}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed italic">"{item.quote}"</p>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5 text-[10px] text-gray-500">
                      <span>Timeline: {item.duration}</span>
                      <span>{item.country}</span>
                    </div>
                  </div>
                ))}
                {/* Duplicate for Marquee looping */}
                {[
                  { name: "Marcus Thorne", profit: "+$12,400", duration: "12 Mos", country: "United Kingdom", quote: "Farmvest completely changed my allocation options. Seeing physical crop fields growth parameters online is incredibly reassuring." },
                  { name: "Elena Rostova", profit: "+$8,950", duration: "9 Mos", country: "Germany", quote: "Outstanding platform usability! The automated AI insights suggested Citruses groves in Spain which yielded high payouts." },
                  { name: "Siddharth Mehta", profit: "+$24,000", duration: "18 Mos", country: "India", quote: "Fractional backing allows diversifying crop regions across basins. Drip water telemetry ensures maximum crop yields." },
                  { name: "Jane Foster", profit: "+$15,600", duration: "24 Mos", country: "Canada", quote: "Perfect ESG platform. Building clean energy solar cooperators while securing stable dividends beats typical bonds." }
                ].map((item, idx) => (
                  <div key={idx + 4} className="w-80 shrink-0 p-5 rounded-2xl bg-[#0E1728]/80 backdrop-blur-md border border-white/5 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-white">{item.name}</h4>
                        <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10 font-bold">{item.profit}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed italic">"{item.quote}"</p>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5 text-[10px] text-gray-500">
                      <span>Timeline: {item.duration}</span>
                      <span>{item.country}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 7: CTA ── */}
        <section className="section cta-section flex items-start justify-center h-screen px-6 sm:px-16">
          <div className="section-content pointer-events-auto max-w-xl text-left">
            <span className="text-xs text-blue-500 font-bold uppercase tracking-widest mb-4 block">Get Started Today</span>
            <h2 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight leading-none text-white mb-6">
              Start investing in the <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400">
                future of agriculture.
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-8 max-w-md">
              Secure your account in under 3 minutes. Fund your wallet with direct bank wire, credit card, or digital stable coins.
            </p>

            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => { setView('get-started') }}
                className="btn-primary px-6 py-3 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 hover:shadow-lg shadow-blue-500/10 transition-all duration-300 pointer-events-auto"
              >
                Join Now <ArrowRight size={14} />
              </button>
              <button 
                onClick={() => { setView('dashboard') }}
                className="btn-ghost px-6 py-3 rounded-full text-xs font-semibold border border-white/10 hover:border-blue-500 hover:bg-blue-500/5 text-gray-400 hover:text-white transition-all duration-300 pointer-events-auto"
              >
                View Dashboard
              </button>
            </div>
          </div>
        </section>

        {/* ── SECTION 8: FOOTER ── */}
        <footer className={`w-full py-16 px-6 sm:px-16 border-t ${isDark ? 'bg-[#0E1728] border-white/5 text-gray-400' : 'bg-white border-black/5 text-gray-500'} pointer-events-auto z-20 relative`}>
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-green-500 text-slate-900 flex items-center justify-center font-extrabold text-sm shadow-md">K</div>
                <span className="font-display font-extrabold text-lg text-white">Krishi AI</span>
              </div>
              <p className="text-[11px] leading-relaxed text-gray-500">
                Immersive fractional agritech investments globally. Secure crop telemetry at 60 FPS.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Navigation</h4>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => setView('home')} className="hover:text-blue-500 transition-colors">Home</button></li>
                <li><button onClick={() => { setView('dashboard'); setActiveTab('investments'); }} className="hover:text-blue-500 transition-colors">Investments</button></li>
                <li><button onClick={() => setView('dashboard')} className="hover:text-blue-500 transition-colors">Dashboard</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">SEC Disclosures</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Newsletter</h4>
              <p className="text-[11px] text-gray-500 mb-3">Stay updated with high-yield crops allocations</p>
              <form className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Enter email" 
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 w-full"
                />
                <button type="submit" className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all">
                  <ArrowRight size={14} />
                </button>
              </form>
            </div>
          </div>
          
          <div className="max-w-5xl mx-auto mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-gray-500">
            <p>© 2026 Krishi AI Inc. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-blue-500">Twitter</a>
              <a href="#" className="hover:text-blue-500">LinkedIn</a>
              <a href="#" className="hover:text-blue-500">Telegram</a>
            </div>
          </div>
        </footer>

      </div>
    </div>
  </Scroll>
  )
}
