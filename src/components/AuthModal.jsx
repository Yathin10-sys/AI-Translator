/**
 * AuthModal - Login / Register with glassmorphism design
 */
import { useState } from 'react'
import { X, Eye, EyeOff, Zap, Loader2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function AuthModal() {
  const { showAuthModal, authMode, closeAuthModal, setAuth } = useStore()
  const [mode, setMode] = useState(authMode)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  if (!showAuthModal) return null

  const toggleMode = () => setMode((m) => (m === 'login' ? 'register' : 'login'))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const fn = mode === 'login' ? authAPI.login : authAPI.register
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : form
      const data = await fn(payload)
      setAuth(data.user, data.token)
      toast.success(mode === 'login' ? 'Welcome back! 👋' : 'Account created! 🎉')
      closeAuthModal()
    } catch (err) {
      toast.error(err?.error || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeAuthModal} />

      <div className="relative glass rounded-2xl border border-white/10 w-full max-w-sm shadow-2xl slide-up">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold gradient-text">AI Translator</span>
            </div>
            <button onClick={closeAuthModal} className="btn-ghost p-2 rounded-xl">
              <X className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-xl font-bold text-slate-100">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'login'
              ? 'Sign in to save your history & preferences'
              : 'Start translating with AI superpowers'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="input-base"
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className="input-base"
          />
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
              className="input-base pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary justify-center py-3 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>

          <button
            type="button"
            onClick={toggleMode}
            className="w-full text-center text-sm text-slate-500 hover:text-slate-300 transition-colors py-1"
          >
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span className="text-primary-400 font-medium">
              {mode === 'login' ? 'Register' : 'Sign In'}
            </span>
          </button>
        </form>
      </div>
    </div>
  )
}
