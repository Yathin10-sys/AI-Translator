/**
 * App.jsx - Root component with routing, theme, and toast provider
 */
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useStore } from './store/useStore'
import Navbar from './components/Navbar'
import TranslatorPanel from './components/TranslatorPanel'
import ConversationMode from './components/ConversationMode'
import HistoryPanel from './components/HistoryPanel'
import AuthModal from './components/AuthModal'
import ExplainModal from './components/ExplainModal'

export default function App() {
  const { theme, activePanel } = useStore()

  // Sync theme class on mount
  useEffect(() => {
    document.documentElement.className = theme
  }, [theme])

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${
      theme === 'dark' ? 'bg-dark-900 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: theme === 'dark' ? '#1e1e30' : '#fff',
            color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      {/* Background gradient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activePanel === 'translator' && <TranslatorPanel />}
          {activePanel === 'conversation' && <ConversationMode />}
          {activePanel === 'history' && <HistoryPanel />}
        </main>
      </div>

      {/* Modals */}
      <AuthModal />
      <ExplainModal />
    </div>
  )
}
