import { useFarmvestStore } from '../../store/useFarmvestStore'

/**
 * Dashboard — Investor portfolio overview.
 * Tab-based navigation: Dashboard | Portfolio | Investments | Transactions | Settings
 */
export default function Dashboard() {
  const { user, farms, transactions, notifications, activeTab, setActiveTab, setView } = useFarmvestStore()

  const tabs = [
    { id: 'dashboard',    label: '📊 Overview'      },
    { id: 'portfolio',    label: '🌾 Portfolio'      },
    { id: 'investments',  label: '💰 Investments'    },
    { id: 'transactions', label: '📋 Transactions'   },
    { id: 'settings',     label: '⚙️ Settings'       },
  ]

  const myFarms = farms.filter(f => f.amountInvested > 0)
  const totalEarnings = myFarms.reduce((sum, f) => sum + f.earnings, 0)

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] transition-colors duration-300 pt-20">

      {/* ── Sidebar + Main layout ── */}
      <div className="flex max-w-7xl mx-auto px-4 sm:px-6 gap-6 py-8">

        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 gap-2">
          {/* User card */}
          <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_#0F172A] p-5 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-400 border-2 border-slate-900 flex items-center justify-center font-black text-slate-900 text-lg mb-3">
              {user.avatar}
            </div>
            <p className="font-black text-slate-900 text-sm">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>

          {/* Nav tabs */}
          {tabs.map(tab => (
            <button
              key={tab.id}
              id={`sidebar-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-green-300 border-2 border-slate-900 text-slate-900 shadow-[2px_2px_0px_0px_#0F172A]'
                  : 'text-slate-600 hover:bg-white hover:border-2 border-2 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            onClick={() => setView('home')}
            className="mt-auto w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-red-600 border-2 border-red-300 hover:bg-red-50 transition-all cursor-pointer"
          >
            🚪 Log Out
          </button>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">

          {/* ── Overview tab ── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h1 className="font-display font-black text-2xl text-slate-900">
                Good morning, {user.name.split(' ')[0]} 👋
              </h1>

              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Balance',   value: `$${user.balance.toLocaleString()}`,      color: 'bg-green-300'  },
                  { label: 'Total Invested',  value: `$${user.totalInvested.toLocaleString()}`, color: 'bg-blue-200'   },
                  { label: 'Total Profit',    value: `$${user.totalProfit.toLocaleString()}`,   color: 'bg-yellow-200' },
                  { label: "Today's Profit",  value: `$${user.dailyProfit.toFixed(2)}`,         color: 'bg-pink-200'   },
                ].map(stat => (
                  <div key={stat.label} className={`${stat.color} border-2 border-slate-900 rounded-2xl p-5 shadow-[3px_3px_0px_0px_#0F172A]`}>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-700 mb-1">{stat.label}</p>
                    <p className="font-display font-black text-xl text-slate-900">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Notifications */}
              {notifications.length > 0 && (
                <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_#0F172A] p-5">
                  <h2 className="font-black text-sm uppercase tracking-wider text-slate-700 mb-3">🔔 Notifications</h2>
                  <div className="space-y-2">
                    {notifications.slice(0, 3).map(n => (
                      <div key={n.id} className="flex items-start gap-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                        <span className="flex-1">{n.message}</span>
                        <span className="text-xs text-slate-400 shrink-0">{n.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Portfolio tab ── */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              <h1 className="font-display font-black text-2xl text-slate-900">My Portfolio</h1>
              {myFarms.length === 0 ? (
                <div className="bg-white border-2 border-slate-900 rounded-2xl p-10 text-center shadow-[4px_4px_0px_0px_#0F172A]">
                  <p className="text-slate-500 text-sm">You haven't invested yet.</p>
                  <button
                    onClick={() => setActiveTab('investments')}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-green-400 border-2 border-slate-900 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_#0F172A] cursor-pointer"
                  >
                    Browse Investments →
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {myFarms.map(farm => (
                    <div key={farm.id} className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[4px_4px_0px_0px_#0F172A] flex justify-between items-center flex-wrap gap-4">
                      <div>
                        <p className="font-black text-slate-900">{farm.name}</p>
                        <p className="text-xs text-slate-500">{farm.location} · {farm.timeline}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-green-600">${farm.amountInvested.toLocaleString()} invested</p>
                        <p className="text-xs text-slate-500">+${farm.earnings.toFixed(2)} earned</p>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className="h-full bg-green-400 rounded-full transition-all"
                            style={{ width: `${farm.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{farm.progress}% funded · {farm.roi}% ROI</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Investments tab ── */}
          {activeTab === 'investments' && (
            <div className="space-y-6">
              <h1 className="font-display font-black text-2xl text-slate-900">Available Investments</h1>
              <div className="grid gap-4">
                {farms.map(farm => (
                  <div key={farm.id} className="investment-card p-6 cursor-pointer">
                    <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
                      <div>
                        <span className="inline-block text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg border-2 border-slate-900 bg-green-200 mb-2">{farm.type}</span>
                        <h3 className="font-display font-black text-lg text-slate-900">{farm.name}</h3>
                        <p className="text-xs text-slate-500">{farm.location} · {farm.timeline}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-2xl text-green-600">{farm.roi}%</p>
                        <p className="text-xs text-slate-400">Expected ROI</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">{farm.desc}</p>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 mb-1">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: `${farm.progress}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>${farm.raised.toLocaleString()} raised</span>
                      <span>{farm.progress}% of ${farm.goal.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-4 flex-wrap">
                      <span className="text-xs font-black text-slate-500">Risk: {farm.risk}</span>
                      <span className="text-xs font-black text-slate-500">· {farm.investors.toLocaleString()} investors</span>
                      <span className="text-xs font-black text-green-700 ml-auto">♻ {farm.sustainability}% sustainable</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Transactions tab ── */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <h1 className="font-display font-black text-2xl text-slate-900">Transaction History</h1>
              <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_#0F172A] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-900 bg-slate-50">
                      <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-700">Farm</th>
                      <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-700">Type</th>
                      <th className="text-right px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-700">Amount</th>
                      <th className="text-right px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, i) => (
                      <tr key={tx.id} className={`border-b border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                        <td className="px-5 py-3 font-medium text-slate-800">{tx.farmName}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black uppercase border ${
                            tx.type === 'payout'
                              ? 'bg-green-100 border-green-400 text-green-700'
                              : 'bg-blue-100 border-blue-400 text-blue-700'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className={`px-5 py-3 text-right font-black ${tx.type === 'payout' ? 'text-green-600' : 'text-slate-900'}`}>
                          {tx.type === 'payout' ? '+' : '-'}${tx.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-400 text-xs">{tx.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Settings tab ── */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h1 className="font-display font-black text-2xl text-slate-900">Settings</h1>
              <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_#0F172A] p-6 space-y-5">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">Full Name</label>
                  <input
                    defaultValue={user.name}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 bg-[#FAFAF5] text-slate-900 text-sm font-medium outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">Email Address</label>
                  <input
                    defaultValue={user.email}
                    type="email"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 bg-[#FAFAF5] text-slate-900 text-sm font-medium outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <button className="px-6 py-3 rounded-xl bg-green-400 border-2 border-slate-900 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_#0F172A] hover:translate-y-[-1px] transition-all cursor-pointer">
                  Save Changes
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
