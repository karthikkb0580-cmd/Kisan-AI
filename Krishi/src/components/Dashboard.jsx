import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, DollarSign, Percent, Search, Bell, Menu, X,
  Shield, AlertCircle, Compass, Database, BarChart3, Wallet, Settings, ArrowUpRight,
  Sun, CloudRain, Thermometer, Wind, Zap, Brain, Calendar, Leaf, Sparkles, LogOut, CheckCircle2, ChevronRight, Filter, Globe
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { useFarmvestStore } from '../store/useFarmvestStore'

// Chart Mock Data
const growthData = [
  { month: 'Jan', balance: 42000, profit: 340 },
  { month: 'Feb', balance: 45000, profit: 410 },
  { month: 'Mar', balance: 52000, profit: 620 },
  { month: 'Apr', balance: 58000, profit: 890 },
  { month: 'May', balance: 65000, profit: 1120 },
  { month: 'Jun', balance: 78540, profit: 1440 }
]

const sectorData = [
  { name: 'Agriculture', value: 15000, color: '#10B981' },
  { name: 'Dairy', value: 10000, color: '#3B82F6' },
  { name: 'Organic', value: 10000, color: '#F59E0B' },
  { name: 'Renewable', value: 0, color: '#8B5CF6' }
]

export default function Dashboard() {
  const { 
    theme, 
    toggleTheme, 
    view, 
    setView, 
    activeTab, 
    setActiveTab, 
    user, 
    farms, 
    transactions, 
    notifications,
    addInvestment,
    dismissNotification
  } = useFarmvestStore()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFarm, setSelectedFarm] = useState(null)
  const [investAmount, setInvestAmount] = useState('')
  const [txFilter, setTxFilter] = useState('all')

  // AI chat states
  const [aiQuery, setAiQuery] = useState('')
  const [aiChat, setAiChat] = useState([
    { role: 'system', text: "Hello! I am your Farmvest AI Advisor. How can I optimize your agritech portfolio today? You can ask about high-yield farms, risk parameters, or predictive earnings." }
  ])
  const [isAiLoading, setIsAiLoading] = useState(false)

  const isDark = theme === 'dark'

  const handleInvestSubmit = (e) => {
    e.preventDefault()
    if (!selectedFarm || !investAmount) return
    const amt = parseFloat(investAmount)
    if (isNaN(amt) || amt <= 0 || amt > user.balance) {
      alert("Invalid investment amount or insufficient balance.")
      return
    }
    addInvestment(selectedFarm.id, amt)
    setSelectedFarm(null)
    setInvestAmount('')
  }

  const handleAiAsk = (e) => {
    e.preventDefault()
    if (!aiQuery.trim()) return
    const query = aiQuery
    setAiChat(prev => [...prev, { role: 'user', text: query }])
    setAiQuery('')
    setIsAiLoading(true)

    setTimeout(() => {
      let responseText = "Based on current market indexes, agricultural investments are highly resilient. I recommend looking into the Aurora Hydroponic Corn project, which has an expected ROI of 18.5% with reduced moisture risks due to automated hydroponics."
      const lower = query.toLowerCase()
      if (lower.includes('high') || lower.includes('yield') || lower.includes('return')) {
        responseText = "The highest yielding project currently is the Zephyr Agroforestry & Wind Project at 22.4% expected ROI, followed closely by Aurora Hydroponic Corn at 18.5% ROI. Note that Zephyr is rated as Medium risk while Aurora is Low risk."
      } else if (lower.includes('risk') || lower.includes('safety')) {
        responseText = "For maximum safety, Vanguard Solar Dairy Cooperative offers a Very Low risk rating with a stable 14.2% ROI, backed by physical dairy cattle and solar infrastructure assets."
      } else if (lower.includes('predict') || lower.includes('future') || lower.includes('growth')) {
        responseText = "Predictive analysis indicates a 14% supply shortage in organic citrus groves over the next two quarters. Investing in Verdant Organic Citrus Groves (16.8% ROI) presents an opportunistic arbitrage window."
      }

      setAiChat(prev => [...prev, { role: 'system', text: responseText }])
      setIsAiLoading(false)
    }, 1200)
  }

  // Filter transaction list
  const filteredTransactions = transactions.filter(tx => {
    if (txFilter === 'all') return true
    return tx.type === txFilter
  })

  // Filter farms list
  const activeFarmsList = farms.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const sidebarLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: Database },
    { id: 'portfolio', label: 'My Portfolio', icon: Compass },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'investments', label: 'Investments', icon: Leaf },
    { id: 'transactions', label: 'Transactions', icon: Wallet },
    { id: 'ai-advisor', label: 'AI Insights', icon: Brain },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  const ActiveIcon = sidebarLinks.find(l => l.id === activeTab)?.icon || Database

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#07111F] text-[#F8FAFC]' : 'bg-[#FAFAF7] text-[#0F172A]'} flex transition-colors duration-500 paper-texture`}>
      
      {/* ── SIDEBAR (DESKTOP) ── */}
      <aside className={`hidden md:flex flex-col w-64 border-r ${isDark ? 'bg-[#0E1728] border-white/5' : 'bg-white border-black/5'} p-6 shrink-0`}>
        <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0E7BEF] to-[#22C55E] flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-blue-500/20">
            F
          </div>
          <span className="font-display font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#0E7BEF] to-[#22C55E]">
            Farmvest
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          {sidebarLinks.map(link => {
            const Icon = link.icon
            const active = activeTab === link.id
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                  active 
                    ? 'bg-blue-600/10 text-blue-500 shadow-sm border border-blue-500/10' 
                    : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
                }`}
              >
                <Icon size={18} />
                {link.label}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-white/5 pt-4">
          <div className="flex items-center gap-3 p-2 rounded-xl mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold font-display text-sm">
              {user.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-xs truncate">{user.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={() => setView('home')} 
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg transition-all"
          >
            <LogOut size={14} />
            Logout Platform
          </button>
        </div>
      </aside>

      {/* ── MOBILE DRAWER ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed inset-y-0 left-0 w-72 z-50 p-6 md:hidden flex flex-col ${isDark ? 'bg-[#0E1728]' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0E7BEF] to-[#22C55E] flex items-center justify-center text-white font-extrabold shadow-md">
                    F
                  </div>
                  <span className="font-display font-extrabold text-lg">Farmvest</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg bg-white/5">
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 space-y-1">
                {sidebarLinks.map(link => {
                  const Icon = link.icon
                  const active = activeTab === link.id
                  return (
                    <button
                      key={link.id}
                      onClick={() => {
                        setActiveTab(link.id)
                        setMobileMenuOpen(false)
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm ${
                        active 
                          ? 'bg-blue-600/10 text-blue-500 border border-blue-500/10' 
                          : 'text-gray-400 hover:bg-white/5'
                      }`}
                    >
                      <Icon size={18} />
                      {link.label}
                    </button>
                  )
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTAINER ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        
        {/* ── TOPBAR ── */}
        <header className={`sticky top-0 z-30 px-6 py-4 flex items-center justify-between backdrop-blur-md border-b ${isDark ? 'bg-[#07111F]/80 border-white/5' : 'bg-white/80 border-black/5'}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-xl border border-white/10 md:hidden hover:bg-white/5">
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl border border-white/5 bg-white/5 w-64">
              <Search size={16} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search investments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-full text-gray-300 placeholder-gray-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <ActiveIcon size={18} className="text-blue-500" />
              <h1 className="font-display font-extrabold text-sm md:text-base capitalize">{activeTab}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition-all duration-300 hover:scale-105 ${isDark ? 'border-white/5 bg-white/5 text-yellow-400 hover:bg-white/10' : 'border-black/5 bg-black/5 text-gray-800 hover:bg-black/10'}`}
            >
              {isDark ? <Sun size={16} /> : <CloudRain size={16} />}
            </button>

            {/* Notifications Panel */}
            <div className="relative">
              <button 
                onClick={() => setNotificationOpen(!notificationOpen)}
                className={`p-2.5 rounded-xl border relative ${isDark ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-black/5 bg-black/5 hover:bg-black/10'}`}
              >
                <Bell size={16} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {notificationOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotificationOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      className={`absolute right-0 mt-3 w-80 rounded-2xl p-4 z-50 border shadow-2xl ${isDark ? 'bg-[#0E1728] border-white/10 text-white' : 'bg-white border-black/10 text-gray-900'}`}
                    >
                      <h4 className="font-display font-bold text-sm mb-3 flex items-center justify-between">
                        <span>Notifications</span>
                        <span className="text-[10px] text-blue-500 font-normal">{notifications.length} Unread</span>
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-4">No new notifications</p>
                        ) : (
                          notifications.map(notif => (
                            <div key={notif.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex gap-2 justify-between items-start">
                              <div>
                                <p className="text-xs font-medium leading-relaxed">{notif.message}</p>
                                <span className="text-[9px] text-gray-500 mt-1 block">{notif.time}</span>
                              </div>
                              <button 
                                onClick={() => dismissNotification(notif.id)}
                                className="text-[10px] text-rose-400 hover:text-rose-500 shrink-0"
                              >
                                Dismiss
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold font-display text-xs">
                {user.avatar}
              </div>
              <div className="hidden lg:block min-w-0">
                <span className="block text-xs font-semibold truncate leading-none">{user.name}</span>
                <span className="text-[10px] text-gray-500 block mt-1 uppercase font-semibold">Investor Node</span>
              </div>
            </div>
          </div>
        </header>

        {/* ── MAIN WORKSPACE CONTENT ── */}
        <main className="flex-1 p-6 space-y-6">

          {/* ───────────────── TAB: DASHBOARD ───────────────── */}
          {activeTab === 'dashboard' && (
            <>
              {/* Portfolio stats cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Balance", val: `$${user.balance.toLocaleString()}`, icon: DollarSign, color: "from-blue-500 to-cyan-500", desc: "Available cash reserves" },
                  { label: "Total Invested", val: `$${user.totalInvested.toLocaleString()}`, icon: Leaf, color: "from-green-500 to-emerald-500", desc: "Active farmland capital" },
                  { label: "Total Profit", val: `$${user.totalProfit.toLocaleString()}`, icon: TrendingUp, color: "from-purple-500 to-pink-500", desc: "Net payouts received" },
                  { label: "Daily Profit", val: `+$${user.dailyProfit.toFixed(2)}`, icon: Percent, color: "from-amber-500 to-orange-500", desc: "Accrued today" }
                ].map((stat, i) => {
                  const Icon = stat.icon
                  return (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`relative overflow-hidden rounded-3xl p-5 border ${isDark ? 'bg-[#0E1728] border-white/5 hover:border-blue-500/30' : 'bg-white border-black/5 hover:border-blue-600/30'} group transition-all duration-300 hover:shadow-lg`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-semibold text-gray-500">{stat.label}</span>
                        <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.color} text-white`}>
                          <Icon size={16} />
                        </div>
                      </div>
                      <h3 className="font-display font-extrabold text-xl md:text-2xl tracking-tight mb-1">{stat.val}</h3>
                      <p className="text-[10px] text-gray-400">{stat.desc}</p>
                      
                      {/* Subtle hover backlight */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    </motion.div>
                  )
                })}
              </div>

              {/* Main Charts & Overview Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Recharts AreaChart for Portfolio Growth */}
                <div className={`lg:col-span-8 rounded-3xl p-5 border ${isDark ? 'bg-[#0E1728] border-white/5' : 'bg-white border-black/5'}`}>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="font-display font-bold text-sm">Portfolio Growth</h3>
                      <p className="text-xs text-gray-500 mt-1">Monthly asset value evaluation</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-semibold border border-blue-500/15">Active ROI</span>
                    </div>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={growthData}>
                        <defs>
                          <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#38BDF8" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} />
                        <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: isDark ? '#0E1728' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', color: isDark ? '#fff' : '#000', borderRadius: '12px' }} />
                        <Area type="monotone" dataKey="balance" stroke="#38BDF8" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sector Allocation Donut Chart */}
                <div className={`lg:col-span-4 rounded-3xl p-5 border ${isDark ? 'bg-[#0E1728] border-white/5' : 'bg-white border-black/5'} flex flex-col`}>
                  <h3 className="font-display font-bold text-sm mb-1">Asset Allocation</h3>
                  <p className="text-xs text-gray-500 mb-6">Sector capitalization shares</p>

                  <div className="h-44 w-full flex justify-center items-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sectorData}
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {sectorData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-2xl font-extrabold font-display leading-none">35K</span>
                      <span className="text-[10px] text-gray-500 uppercase mt-1">Invested</span>
                    </div>
                  </div>

                  <div className="space-y-2 mt-auto pt-4 border-t border-white/5">
                    {sectorData.map((sect, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sect.color }} />
                          <span className="font-medium">{sect.name}</span>
                        </div>
                        <span className="text-gray-400 font-semibold">
                          {user.totalInvested > 0 ? `${Math.round((sect.value / user.totalInvested) * 100)}%` : '0%'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid: Table of Investments + Live Widgets */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Table of Active Investments */}
                <div className={`lg:col-span-8 rounded-3xl p-5 border ${isDark ? 'bg-[#0E1728] border-white/5' : 'bg-white border-black/5'} overflow-x-auto`}>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="font-display font-bold text-sm">Active Investments</h3>
                      <p className="text-xs text-gray-500 mt-1">Currently growing agricultural properties</p>
                    </div>
                  </div>

                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] text-gray-400 uppercase font-semibold">
                        <th className="py-3 pr-4">Farmland Share</th>
                        <th className="py-3 px-4">ROI Target</th>
                        <th className="py-3 px-4">Cap Invested</th>
                        <th className="py-3 px-4">Yield Accrued</th>
                        <th className="py-3 px-4 text-right">State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {farms.filter(f => f.amountInvested > 0).map((farm, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 pr-4 font-semibold flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full" style={{ background: farm.imageGradient }} />
                            <div>
                              <p className="font-medium text-xs">{farm.name}</p>
                              <span className="text-[10px] text-gray-500 font-normal">{farm.location}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-semibold text-emerald-400">{farm.roi}% p.a.</td>
                          <td className="py-4 px-4 font-medium">${farm.amountInvested.toLocaleString()}</td>
                          <td className="py-4 px-4 text-blue-400 font-medium">+${farm.earnings.toFixed(2)}</td>
                          <td className="py-4 px-4 text-right">
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-green-500/10 text-green-500 border border-green-500/10 uppercase">
                              {farm.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Live Market & Weather Widgets */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  {/* Weather widget */}
                  <div className={`rounded-3xl p-5 border ${isDark ? 'bg-[#0E1728] border-white/5' : 'bg-white border-black/5'} flex-1`}>
                    <h3 className="font-display font-bold text-sm mb-4">Weather Insights</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Thermometer className="text-orange-400 shrink-0" size={24} />
                        <div>
                          <p className="text-base font-extrabold font-display leading-tight">26.8°C</p>
                          <span className="text-[10px] text-gray-500">Soil Surface</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Sun className="text-yellow-400 shrink-0" size={24} />
                        <div>
                          <p className="text-base font-extrabold font-display leading-tight">95%</p>
                          <span className="text-[10px] text-gray-500">Solar Index</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Wind className="text-sky-400 shrink-0" size={24} />
                        <div>
                          <p className="text-base font-extrabold font-display leading-tight">12.5 km/h</p>
                          <span className="text-[10px] text-gray-500">Wind Speed</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <CloudRain className="text-blue-400 shrink-0" size={24} />
                        <div>
                          <p className="text-base font-extrabold font-display leading-tight">85%</p>
                          <span className="text-[10px] text-gray-500">Crop Moisture</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sustainability gauge */}
                  <div className={`rounded-3xl p-5 border ${isDark ? 'bg-[#0E1728] border-white/5' : 'bg-white border-black/5'} flex-1`}>
                    <h3 className="font-display font-bold text-sm mb-2 flex items-center justify-between">
                      <span>Sustainability Score</span>
                      <span className="text-xs text-green-400">95/100</span>
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">Averaged across all active crop nodes</p>
                    <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full" style={{ width: '95%' }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-500 mt-2 uppercase font-semibold">
                      <span>Low Footprint</span>
                      <span>Target: Carbon Neutral</span>
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}

          {/* ───────────────── TAB: MY PORTFOLIO ───────────────── */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              <div className={`rounded-3xl p-6 border ${isDark ? 'bg-[#0E1728] border-white/5' : 'bg-white border-black/5'}`}>
                <h2 className="font-display font-extrabold text-lg mb-2">Portfolio Diagnostics</h2>
                <p className="text-xs text-gray-500 mb-6">Detailed telemetry of your current investment node holdings.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {farms.filter(f => f.amountInvested > 0).map((farm, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/10 uppercase">
                            {farm.type}
                          </span>
                          <span className="text-xs font-semibold text-emerald-400">{farm.roi}% ROI</span>
                        </div>
                        <h4 className="font-display font-bold text-sm mb-1">{farm.name}</h4>
                        <p className="text-[10px] text-gray-500 mb-4 flex items-center gap-1">
                          <Globe size={11} /> {farm.location}
                        </p>
                        <p className="text-xs text-gray-400 leading-relaxed mb-6">{farm.desc}</p>
                      </div>

                      <div className="space-y-3 mt-auto pt-4 border-t border-white/5">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Invested Capital</span>
                          <span className="font-semibold">${farm.amountInvested.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Accrued Yield</span>
                          <span className="font-semibold text-blue-400">+${farm.earnings.toFixed(2)}</span>
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
                            <span>Maturity Timeline</span>
                            <span>{farm.timeline}</span>
                          </div>
                          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: '45%' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ───────────────── TAB: ANALYTICS ───────────────── */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className={`lg:col-span-8 rounded-3xl p-6 border ${isDark ? 'bg-[#0E1728] border-white/5' : 'bg-white border-black/5'}`}>
                <h3 className="font-display font-bold text-base mb-6">Historical Returns Analysis</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={growthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} />
                      <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: isDark ? '#0E1728' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', color: isDark ? '#fff' : '#000', borderRadius: '12px' }} />
                      <Bar dataKey="profit" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`lg:col-span-4 rounded-3xl p-6 border ${isDark ? 'bg-[#0E1728] border-white/5' : 'bg-white border-black/5'} flex flex-col justify-between`}>
                <div>
                  <h3 className="font-display font-bold text-base mb-2">Sustainability Yield Index</h3>
                  <p className="text-xs text-gray-500 mb-6">ESG scoring metric of active nodes</p>
                  
                  <div className="space-y-4">
                    {[
                      { label: "Carbon Offset", val: "+14.2 tons", rating: "Optimal" },
                      { label: "Water Reductions", val: "90% Saved", rating: "Critical" },
                      { label: "Eco-Chemical Use", val: "-80% Safe", rating: "Optimal" }
                    ].map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold">{item.label}</p>
                          <span className="text-[10px] text-gray-500 mt-1 block">Rating: {item.rating}</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 font-display">{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 mt-6">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    By investing in sustainable nodes, your portfolio offsets approximately <strong>24.5 tons of carbon dioxide equivalent</strong> annually.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────── TAB: INVESTMENTS (OPEN MARKET) ───────────────── */}
          {activeTab === 'investments' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="font-display font-extrabold text-lg">Agritech Investment Pools</h2>
                  <p className="text-xs text-gray-500 mt-1">Available sustainable farmland shares open for backing.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeFarmsList.map((farm, i) => (
                  <motion.div 
                    key={farm.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-3xl p-5 border ${isDark ? 'bg-[#0E1728] border-white/5' : 'bg-white border-black/5'} flex flex-col justify-between group relative overflow-hidden`}
                  >
                    <div>
                      <div className="h-28 rounded-2xl mb-4 relative overflow-hidden flex items-center justify-center text-white" style={{ background: farm.imageGradient }}>
                        <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
                        <Leaf size={32} className="relative z-10 opacity-70 animate-pulse" />
                        <span className="absolute bottom-3 left-3 text-[10px] font-bold bg-black/40 px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">
                          {farm.type}
                        </span>
                      </div>

                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-display font-bold text-sm leading-snug group-hover:text-blue-400 transition-colors">{farm.name}</h4>
                        <span className="text-xs font-extrabold text-emerald-400 shrink-0">{farm.roi}% ROI</span>
                      </div>

                      <p className="text-[10px] text-gray-500 mb-3 flex items-center gap-1">
                        <Globe size={11} /> {farm.location}
                      </p>
                      <p className="text-xs text-gray-400 leading-relaxed mb-6">{farm.desc}</p>
                    </div>

                    <div className="space-y-4 mt-auto">
                      <div>
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-semibold uppercase">
                          <span>Progress</span>
                          <span>{farm.progress}% Raised</span>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${farm.progress}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px] text-gray-500 mt-1 font-medium">
                          <span>${farm.raised.toLocaleString()} raised</span>
                          <span>Goal: ${farm.goal.toLocaleString()}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedFarm(farm)}
                        className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
                      >
                        Back This Project <ChevronRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ───────────────── TAB: TRANSACTIONS ───────────────── */}
          {activeTab === 'transactions' && (
            <div className={`rounded-3xl p-6 border ${isDark ? 'bg-[#0E1728] border-white/5' : 'bg-white border-black/5'}`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="font-display font-extrabold text-lg">Transaction Ledger</h2>
                  <p className="text-xs text-gray-500 mt-1">Audit log of your deposits, payouts, and node backing.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-gray-400" />
                  <select 
                    value={txFilter} 
                    onChange={(e) => setTxFilter(e.target.value)}
                    className={`text-xs px-2.5 py-1.5 rounded-xl border outline-none ${isDark ? 'bg-[#0E1728] border-white/10 text-white' : 'bg-white border-black/10 text-gray-900'}`}
                  >
                    <option value="all">All Transactions</option>
                    <option value="invest">Investments</option>
                    <option value="payout">Payouts</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] text-gray-400 uppercase font-semibold">
                      <th className="py-3">Transaction ID</th>
                      <th className="py-3 px-4">Farm Project</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredTransactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 font-mono text-[10px] text-gray-500">{tx.id}</td>
                        <td className="py-4 px-4 font-semibold">{tx.farmName}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            tx.type === 'invest' 
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-400">{tx.date}</td>
                        <td className={`py-4 px-4 text-right font-semibold font-display ${tx.type === 'invest' ? 'text-gray-300' : 'text-emerald-400'}`}>
                          {tx.type === 'invest' ? '-' : '+'}${tx.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ───────────────── TAB: AI ADVISOR ───────────────── */}
          {activeTab === 'ai-advisor' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Chat panel */}
              <div className={`lg:col-span-8 rounded-3xl p-6 border ${isDark ? 'bg-[#0E1728] border-white/5' : 'bg-white border-black/5'} flex flex-col h-[500px]`}>
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-500 flex items-center justify-center">
                    <Brain size={20} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm">Farmvest AI Copilot</h3>
                    <p className="text-[10px] text-gray-500">Realtime predictive analytics & advice</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
                  {aiChat.map((chat, i) => (
                    <div 
                      key={i} 
                      className={`flex gap-3 max-w-[85%] ${chat.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                        chat.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white/5 border border-white/5 text-blue-400'
                      }`}>
                        {chat.role === 'user' ? 'ME' : <Brain size={14} />}
                      </div>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        chat.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white/5 border border-white/5'
                      }`}>
                        {chat.text}
                      </div>
                    </div>
                  ))}
                  {isAiLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 text-blue-400 flex items-center justify-center">
                        <Brain size={14} />
                      </div>
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleAiAsk} className="flex gap-2 mt-auto pt-4 border-t border-white/5">
                  <input
                    type="text"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    placeholder="Ask about highest yield farms, sustainability scoring..."
                    className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-all"
                  >
                    Send <Sparkles size={14} />
                  </button>
                </form>
              </div>

              {/* Insights stats panel */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className={`rounded-3xl p-5 border ${isDark ? 'bg-[#0E1728] border-white/5' : 'bg-white border-black/5'} flex-1`}>
                  <h3 className="font-display font-bold text-sm mb-3">AI Recommendations</h3>
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase">Optimal Choice</span>
                      <h4 className="font-bold text-xs mt-1">Aurora Hydroponic Corn</h4>
                      <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">Hydroponic infrastructure reduces drought risk to 0%.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                      <span className="text-[10px] text-blue-400 font-bold uppercase">Safe Haven</span>
                      <h4 className="font-bold text-xs mt-1">Solar Dairy Cooperative</h4>
                      <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">Backed by cattle collateral & long-term solar contracts.</p>
                    </div>
                  </div>
                </div>

                <div className={`rounded-3xl p-5 border ${isDark ? 'bg-[#0E1728] border-white/5' : 'bg-white border-black/5'} flex-1 flex flex-col justify-between`}>
                  <div>
                    <h3 className="font-display font-bold text-sm mb-2">Predictive Value</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      AI systems estimate a **12.5% increase** in sustainable food demands by Q4 2026, driving asset prices upward.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/10 flex gap-2 items-start mt-4">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-relaxed">
                      <strong>Climate Alert:</strong> Rising heatwaves in Spain might impact citrus crops. Consider diversifying.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ───────────────── TAB: SETTINGS ───────────────── */}
          {activeTab === 'settings' && (
            <div className={`rounded-3xl p-6 border ${isDark ? 'bg-[#0E1728] border-white/5' : 'bg-white border-black/5'} max-w-2xl`}>
              <h2 className="font-display font-extrabold text-lg mb-6">Platform Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Investor Node Credentials</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-semibold mb-1 block">Full Name</label>
                      <input 
                        type="text" 
                        defaultValue={user.name} 
                        disabled 
                        className="w-full p-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-500 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-semibold mb-1 block">Email Node</label>
                      <input 
                        type="text" 
                        defaultValue={user.email} 
                        disabled 
                        className="w-full p-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-500 outline-none" 
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">System Preferences</h4>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <p className="text-xs font-semibold">Platform Theme</p>
                      <span className="text-[10px] text-gray-500 mt-1 block">Switch between light warm paper and deep space dark theme</span>
                    </div>
                    <button 
                      onClick={toggleTheme}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold transition-all hover:bg-blue-700"
                    >
                      Toggle to {isDark ? 'Light' : 'Dark'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── MODAL: BACK FARMLAND ── */}
      <AnimatePresence>
        {selectedFarm && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFarm(null)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md p-6 rounded-3xl border z-50 shadow-2xl ${
                isDark ? 'bg-[#0E1728] border-white/10 text-white' : 'bg-white border-black/10 text-gray-900'
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-extrabold text-base flex items-center gap-2">
                  <Leaf className="text-blue-500" size={18} />
                  Back Project
                </h3>
                <button onClick={() => setSelectedFarm(null)} className="p-1 rounded-lg bg-white/5 text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-400 font-semibold uppercase">Selected Share</p>
                <h4 className="font-display font-bold text-sm mt-1">{selectedFarm.name}</h4>
                <p className="text-[10px] text-gray-500 mt-1">{selectedFarm.location} • {selectedFarm.roi}% Expected ROI</p>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/10 mb-4 flex justify-between text-xs">
                <span className="text-gray-500">Your Wallet Balance</span>
                <span className="font-bold font-display text-blue-400">${user.balance.toLocaleString()}</span>
              </div>

              <form onSubmit={handleInvestSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold mb-1 block">Backing Amount ($)</label>
                  <input
                    type="number"
                    required
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    max={user.balance}
                    min="10"
                    placeholder="Enter investment amount (e.g. 5000)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-500 text-white"
                    style={{ color: isDark ? '#fff' : '#000' }}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFarm(null)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/5 text-center transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white text-center transition-all hover:shadow-lg shadow-blue-500/10"
                  >
                    Confirm Backing
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}
