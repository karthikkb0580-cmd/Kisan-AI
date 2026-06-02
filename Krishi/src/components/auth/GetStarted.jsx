import { useFarmvestStore } from '../../store/useFarmvestStore'
import { translations } from '../../translations'

/**
 * GetStarted — Registration / onboarding screen.
 * Dynamic translations enabled.
 */
export default function GetStarted({ setView }) {
  const { language } = useFarmvestStore()

  const t = (key, fallback) => {
    return translations[language]?.[key] || translations['en']?.[key] || fallback || key
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 border-3 border-slate-900 rounded-3xl shadow-[6px_6px_0px_0px_#0F172A] p-10">
        {/* Logo mark */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-green-400 border-2 border-slate-900 flex items-center justify-center text-slate-900 font-black text-sm shadow-[2px_2px_0px_0px_#0F172A]">
            K
          </div>
          <span className="font-display font-black text-2xl text-slate-900 dark:text-white tracking-tight">
            Krishi AI
          </span>
        </div>

        <h1 className="font-display font-black text-3xl text-slate-900 dark:text-white mb-2">
          {t('initializeNode', 'Create Account')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
          {t('connectGrid', 'Start your agritech investment journey today.')}
        </p>

        <form onSubmit={(e) => { e.preventDefault(); setView('dashboard') }} className="space-y-4">
          <div>
            <label htmlFor="register-name" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              id="register-name"
              type="text"
              placeholder="Alex Mercer"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 bg-[#FAFAF5] dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-medium outline-none focus:border-green-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              {t('gmailAccount', 'Email Address')}
            </label>
            <input
              id="register-email"
              type="email"
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 bg-[#FAFAF5] dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-medium outline-none focus:border-green-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              {t('password', 'Password')}
            </label>
            <input
              id="register-password"
              type="password"
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 bg-[#FAFAF5] dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-medium outline-none focus:border-green-500 transition-colors"
            />
          </div>

          <button
            id="btn-register-submit"
            type="submit"
            className="w-full mt-2 py-3.5 rounded-xl text-sm font-black uppercase tracking-wider bg-green-400 hover:bg-green-300 text-slate-900 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0F172A] transition-all hover:translate-y-[-2px] active:translate-y-[1px] cursor-pointer"
          >
            {t('getStarted', 'Create Account')} →
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          {t('alreadyHaveNode', 'Already have an account?')}{' '}
          <button
            onClick={() => setView('login')}
            className="font-black text-slate-900 dark:text-white underline underline-offset-2 cursor-pointer hover:text-green-600 transition-colors"
          >
            {t('login', 'Sign In')}
          </button>
        </p>
      </div>
    </div>
  )
}
