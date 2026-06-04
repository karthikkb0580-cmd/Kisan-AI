import { create } from 'zustand'
import { TokenStore } from '../services/api'

export const useFarmvestStore = create((set) => ({
  // UI Theme & Routing
  theme: 'dark',
  view: 'home', // 'home' | 'dashboard' | 'login' | 'register'
  activeHeroSection: 0,
  setActiveHeroSection: (section) => set({ activeHeroSection: section }),
  activeTab: 'dashboard', // 'dashboard' | 'portfolio' | 'analytics' | 'investments' | 'farms' | 'transactions' | 'wallet' | 'settings'
  language: 'en', // 'en' | 'hi' | 'pa' | 'te'
  setLanguage: (lang) => set({ language: lang }),
  
  // User Profile (initially loaded from localStorage)
  user: JSON.parse(localStorage.getItem('krishi_user')) || null,

  // Carousel filters
  activeFilter: 'all',

  // Available Farm Investments
  farms: [
    {
      id: 'fv-01',
      name: 'Aurora Hydroponic Corn',
      location: 'Bavaria, Germany',
      roi: 18.5,
      goal: 600000,
      raised: 485000,
      progress: 80.8,
      investors: 1420,
      timeline: '12 Months',
      type: 'agriculture',
      status: 'growing',
      amountInvested: 15000,
      earnings: 1245.50,
      risk: 'Low',
      demand: 'High',
      sustainability: 96,
      weather: '22°C Clear',
      imageGradient: 'linear-gradient(135deg, #10B981, #059669)',
      desc: 'Vertical automated hydroponic farming delivering high-yield pesticide-free organic sweet corn with 90% less water usage.'
    },
    {
      id: 'fv-02',
      name: 'Vanguard Solar Dairy Cooperative',
      location: 'California, USA',
      roi: 14.2,
      goal: 850000,
      raised: 720000,
      progress: 84.7,
      investors: 980,
      timeline: '18 Months',
      type: 'dairy',
      status: 'maturing',
      amountInvested: 10000,
      earnings: 850.00,
      risk: 'Very Low',
      demand: 'Stable',
      sustainability: 92,
      weather: '28°C Sunny',
      imageGradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
      desc: 'Smart dairy farm running fully on solar grid energy, utilizing automated IoT milking systems and high-comfort cow enclosures.'
    },
    {
      id: 'fv-03',
      name: 'Verdant Organic Citrus Groves',
      location: 'Valencia, Spain',
      roi: 16.8,
      goal: 450000,
      raised: 310000,
      progress: 68.8,
      investors: 710,
      timeline: '15 Months',
      type: 'organic',
      status: 'growing',
      amountInvested: 10000,
      earnings: 680.00,
      risk: 'Medium',
      demand: 'High',
      sustainability: 98,
      weather: '24°C Breezy',
      imageGradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
      desc: 'Drip-irrigated premium organic orange and lemon orchards employing ecological pest control and soil micro-biome enrichment.'
    },
    {
      id: 'fv-04',
      name: 'Zephyr Agroforestry & Wind Project',
      location: 'Jalandhar, Punjab',
      roi: 22.4,
      goal: 1200000,
      raised: 920000,
      progress: 76.6,
      investors: 2150,
      timeline: '24 Months',
      type: 'renewable',
      status: 'growing',
      amountInvested: 0,
      earnings: 0,
      risk: 'Medium',
      demand: 'Critical',
      sustainability: 99,
      weather: '32°C Dusty',
      imageGradient: 'linear-gradient(135deg, #10B981, #3B82F6)',
      desc: 'Dual-purpose project integrating high-capacity wind turbines with carbon-offset agroforestry and bio-crop fields.'
    },
    {
      id: 'fv-05',
      name: 'Helios Regenerative Wheat Fields',
      location: 'Kansas, USA',
      roi: 12.5,
      goal: 500000,
      raised: 150000,
      progress: 30.0,
      investors: 340,
      timeline: '9 Months',
      type: 'sustainable',
      status: 'growing',
      amountInvested: 0,
      earnings: 0,
      risk: 'Low',
      demand: 'Stable',
      sustainability: 90,
      weather: '26°C Wind 12mph',
      imageGradient: 'linear-gradient(135deg, #EC4899, #BE185D)',
      desc: 'No-till cover-cropped wheat farm restoring topsoil organic matter while yielding premium grain for sustainable bakers.'
    }
  ],

  // Transaction Logs
  transactions: [
    { id: 'tx-101', farmName: 'Aurora Hydroponic Corn', type: 'invest', amount: 15000, date: '2026-05-12', status: 'completed' },
    { id: 'tx-102', farmName: 'Vanguard Solar Dairy Cooperative', type: 'invest', amount: 10000, date: '2026-05-15', status: 'completed' },
    { id: 'tx-103', farmName: 'Verdant Organic Citrus Groves', type: 'invest', amount: 10000, date: '2026-05-18', status: 'completed' },
    { id: 'tx-104', farmName: 'Aurora Hydroponic Corn', type: 'payout', amount: 320, date: '2026-05-20', status: 'completed' }
  ],

  // Notifications
  notifications: [
    { id: 1, message: "Welcome to Farmvest! Secure your agricultural assets today.", time: "Just now", type: "system" },
    { id: 2, message: "Your investment in Aurora Hydroponic Corn yielded $320.", time: "2 days ago", type: "payout" }
  ],

  // Actions
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    }
    return { theme: nextTheme };
  }),

  setUser: (user) => {
    if (user) {
      localStorage.setItem('krishi_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('krishi_user')
    }
    set({ user })
  },

  logout: () => {
    TokenStore.clear()
    localStorage.removeItem('krishi_user')
    set({ user: null, view: 'home' })
  },

  setView: (view) => set({ view }),
  
  setActiveTab: (activeTab) => set({ activeTab }),

  setActiveFilter: (activeFilter) => set({ activeFilter }),

  addInvestment: (farmId, amount) => set((state) => {
    if (!state.user) return {};
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || state.user.balance < numericAmount) {
      return {};
    }

    const updatedFarms = state.farms.map(farm => {
      if (farm.id === farmId) {
        const newRaised = farm.raised + numericAmount;
        const newProgress = Math.min(100, parseFloat(((newRaised / farm.goal) * 100).toFixed(1)));
        return {
          ...farm,
          raised: newRaised,
          progress: newProgress,
          investors: farm.investors + 1,
          amountInvested: farm.amountInvested + numericAmount
        };
      }
      return farm;
    });

    const targetFarm = state.farms.find(f => f.id === farmId);
    const farmName = targetFarm ? targetFarm.name : "Farmland Project";

    const newTransaction = {
      id: `tx-${Date.now()}`,
      farmName,
      type: 'invest',
      amount: numericAmount,
      date: new Date().toISOString().split('T')[0],
      status: 'completed'
    };

    const newNotification = {
      id: Date.now(),
      message: `Successfully invested $${numericAmount.toLocaleString()} in ${farmName}!`,
      time: "Just now",
      type: "success"
    };

    return {
      user: {
        ...state.user,
        balance: state.user.balance - numericAmount,
        totalInvested: state.user.totalInvested + numericAmount
      },
      farms: updatedFarms,
      transactions: [newTransaction, ...state.transactions],
      notifications: [newNotification, ...state.notifications]
    };
  }),

  dismissNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),

  addNotification: (message, type = 'system') => set((state) => ({
    notifications: [
      { id: Date.now(), message, time: "Just now", type },
      ...state.notifications
    ]
  }))
}));
