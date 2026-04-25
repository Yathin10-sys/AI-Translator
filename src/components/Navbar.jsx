/**
 * Navbar - Top navigation with theme toggle, panel switcher, and auth
 */
import { Languages, MessageSquare, History, LogIn, LogOut, User, Moon, Sun, Zap } from 'lucide-react'
import { useStore } from '../store/useStore'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { id: 'translator', label: 'Translator', icon: Languages },
  { id: 'conversation', label: 'Live Chat', icon: MessageSquare },
  { id: 'history', label: 'History', icon: History },
]

export default function Navbar() {
  const {
    theme, toggleTheme,
    activePanel, setActivePanel,
    user, clearAuth,
    openAuthModal,
  } = useStore()

  const handleLogout = () => {
    clearAuth()
    toast.success('Logged out')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/5">
      <div className={`${theme === 'dark' ? 'glass' : 'glass-light'} transition-all`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg glow-primary">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg gradient-text">AI Translator</span>
                <span className="hidden sm:inline text-xs text-slate-500 ml-2">Pro</span>
              </div>
            </div>

            {/* Nav Pills */}
            <nav className="flex items-center bg-dark-700/80 rounded-xl p-1 border border-white/5">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActivePanel(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activePanel === id
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </nav>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dark-500 transition-all"
                title="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Auth */}
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 glass rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xs text-white font-bold">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-300">{user.name}</span>
                  </div>
                  <button onClick={handleLogout} className="btn-ghost text-sm">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => openAuthModal('login')}
                  className="btn-primary text-sm"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
