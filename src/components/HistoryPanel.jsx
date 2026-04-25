/**
 * HistoryPanel - Translation history with bookmarks, search, and delete
 */
import { useState, useEffect } from 'react'
import {
  History, Bookmark, BookmarkCheck, Trash2, Search,
  RefreshCw, Volume2, Globe, Filter, X
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { historyAPI } from '../services/api'
import { useVoice } from '../hooks/useVoice'
import toast from 'react-hot-toast'

export default function HistoryPanel() {
  const { history, addToHistory, toggleBookmarkLocal, clearHistoryLocal, user } = useStore()
  const [serverHistory, setServerHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterBookmarked, setFilterBookmarked] = useState(false)
  const voiceOut = useVoice({ language: 'en' })

  const items = user ? serverHistory : history

  useEffect(() => {
    if (user) fetchServerHistory()
  }, [user])

  const fetchServerHistory = async () => {
    setLoading(true)
    try {
      const data = await historyAPI.getHistory({ limit: 50 })
      setServerHistory(data.translations)
    } catch {
      toast.error('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const handleBookmark = async (item) => {
    if (user) {
      try {
        await historyAPI.toggleBookmark(item._id)
        setServerHistory((prev) =>
          prev.map((h) => h._id === item._id ? { ...h, isBookmarked: !h.isBookmarked } : h)
        )
      } catch { toast.error('Failed to bookmark') }
    } else {
      toggleBookmarkLocal(item._id)
    }
  }

  const handleDelete = async (id) => {
    if (user) {
      try {
        await historyAPI.deleteItem(id)
        setServerHistory((prev) => prev.filter((h) => h._id !== id))
      } catch { toast.error('Failed to delete') }
    } else {
      // Local delete
      clearHistoryLocal()
      toast.success('Cleared local history')
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm('Clear all history? This cannot be undone.')) return
    if (user) {
      try {
        await historyAPI.clearAll()
        setServerHistory([])
      } catch { toast.error('Failed to clear') }
    } else {
      clearHistoryLocal()
    }
    toast.success('History cleared')
  }

  // Filter
  const filtered = items.filter((item) => {
    const matchSearch = !search
      || item.originalText?.toLowerCase().includes(search.toLowerCase())
      || item.translatedText?.toLowerCase().includes(search.toLowerCase())
    const matchBookmark = !filterBookmarked || item.isBookmarked
    return matchSearch && matchBookmark
  })

  const EMOTION_EMOJI = {
    happy: '😊', sad: '😢', angry: '😠', neutral: '😐',
    excited: '🤩', fearful: '😨', surprised: '😲',
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="glass rounded-2xl p-4 border border-white/5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-slate-100">
              Translation History
            </h2>
            <span className="text-xs bg-dark-500 text-slate-400 px-2 py-0.5 rounded-full">
              {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button onClick={fetchServerHistory} className="btn-ghost text-xs py-1.5 px-3" title="Refresh">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            {items.length > 0 && (
              <button onClick={handleClearAll} className="btn-danger text-xs py-1.5 px-3">
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter bar */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 flex items-center gap-2 bg-dark-700/80 rounded-xl px-3 py-2 border border-white/5">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search translations..."
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            )}
          </div>
          <button
            onClick={() => setFilterBookmarked(!filterBookmarked)}
            className={`p-2.5 rounded-xl border transition-all ${
              filterBookmarked
                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                : 'glass border-white/10 text-slate-500 hover:text-slate-300'
            }`}
            title="Show bookmarks only"
          >
            <Bookmark className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* History List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-4 border border-white/5 h-28 shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 border border-white/5 text-center">
          <History className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No translations yet</p>
          <p className="text-slate-600 text-sm mt-1">
            {filterBookmarked ? 'No bookmarked translations' : 'Start translating to see your history here'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item, idx) => (
            <div
              key={item._id || idx}
              className="glass rounded-2xl p-4 border border-white/5 hover:border-white/10
                         transition-all duration-200 slide-up group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Original */}
                  <div className="flex items-start gap-2">
                    <span className="lang-tag shrink-0 mt-0.5">
                      {(item.detectedLang || item.sourceLang || '??').toUpperCase()}
                    </span>
                    <p className="text-sm text-slate-400 truncate">{item.originalText}</p>
                    {item.emotion && (
                      <span className="text-base shrink-0" title={item.emotion}>
                        {EMOTION_EMOJI[item.emotion] || ''}
                      </span>
                    )}
                  </div>
                  {/* Translation */}
                  <div className="flex items-start gap-2">
                    <span className="lang-tag shrink-0 mt-0.5">
                      {(item.targetLang || 'en').toUpperCase()}
                    </span>
                    <p className="text-sm text-slate-200 line-clamp-2">{item.translatedText}</p>
                  </div>
                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    {item.tone && (
                      <span className="capitalize flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {item.tone}
                      </span>
                    )}
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    {item.model && (
                      <span className="font-mono text-slate-700">{item.model}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => voiceOut.speak(item.translatedText, item.targetLang)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 transition-all"
                    title="Read aloud"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleBookmark(item)}
                    className={`p-1.5 rounded-lg transition-all ${
                      item.isBookmarked
                        ? 'text-yellow-400 hover:bg-yellow-500/10'
                        : 'text-slate-500 hover:text-yellow-400 hover:bg-yellow-500/10'
                    }`}
                    title={item.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                  >
                    {item.isBookmarked
                      ? <BookmarkCheck className="w-3.5 h-3.5" />
                      : <Bookmark className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!user && items.length > 0 && (
        <p className="text-center text-xs text-slate-600">
          💡 <button onClick={() => useStore.getState().openAuthModal('register')} className="text-primary-400 hover:underline">Sign in</button> to sync history across devices
        </p>
      )}
    </div>
  )
}
