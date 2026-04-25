/**
 * WordInsightTooltip - Hover any word to see AI-powered definition, synonyms, and part of speech
 */
import { useState, useRef } from 'react'
import { translateAPI } from '../services/api'
import { Loader2 } from 'lucide-react'

export default function WordInsightTooltip({ text, language }) {
  const [tooltip, setTooltip] = useState(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [loading, setLoading] = useState(false)
  const [activeWord, setActiveWord] = useState(null)
  const cacheRef = useRef({})
  const timerRef = useRef(null)

  const handleMouseEnter = (word, e) => {
    const clean = word.replace(/[^a-zA-Z\u0080-\uFFFF'-]/g, '').trim()
    if (!clean || clean.length < 2) return

    const rect = e.target.getBoundingClientRect()
    setPos({ x: rect.left + window.scrollX, y: rect.top + window.scrollY - 10 })
    setActiveWord(clean)

    if (cacheRef.current[clean]) {
      setTooltip(cacheRef.current[clean])
      return
    }

    // Delay to avoid unnecessary calls on fast mouseover
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      setTooltip(null)
      try {
        const data = await translateAPI.wordInsights({
          word: clean,
          language,
          context: text.slice(0, 200),
        })
        cacheRef.current[clean] = data
        setTooltip(data)
      } catch {
        setTooltip(null)
      } finally {
        setLoading(false)
      }
    }, 600)
  }

  const handleMouseLeave = () => {
    clearTimeout(timerRef.current)
    setTooltip(null)
    setActiveWord(null)
    setLoading(false)
  }

  const words = text.split(/(\s+)/)

  return (
    <div className="relative">
      <p className="text-sm text-slate-200 leading-relaxed">
        {words.map((word, i) =>
          /\s+/.test(word) ? (
            <span key={i}>{word}</span>
          ) : (
            <span
              key={i}
              className={`cursor-help transition-colors duration-100 rounded px-0.5 ${
                activeWord === word.replace(/[^a-zA-Z\u0080-\uFFFF'-]/g, '').trim()
                  ? 'bg-primary-500/20 text-primary-300'
                  : 'hover:bg-white/5'
              }`}
              onMouseEnter={(e) => handleMouseEnter(word, e)}
              onMouseLeave={handleMouseLeave}
            >
              {word}
            </span>
          )
        )}
      </p>

      {/* Floating tooltip */}
      {(loading || tooltip) && (
        <div
          className="fixed z-50 glass rounded-xl border border-white/10 shadow-2xl p-3 w-56 text-left pointer-events-none slide-up"
          style={{ left: `${Math.min(pos.x, window.innerWidth - 240)}px`, top: `${pos.y - 115}px` }}
        >
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs">Looking up...</span>
            </div>
          ) : tooltip ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">{activeWord}</span>
                {tooltip.partOfSpeech && (
                  <span className="text-xs text-primary-400 font-mono">{tooltip.partOfSpeech}</span>
                )}
              </div>
              {tooltip.definition && (
                <p className="text-xs text-slate-400">{tooltip.definition}</p>
              )}
              {tooltip.synonyms?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {tooltip.synonyms.slice(0, 3).map((s, i) => (
                    <span key={i} className="text-xs bg-dark-500/80 text-slate-400 px-1.5 py-0.5 rounded-md">
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {tooltip.example && (
                <p className="text-xs text-slate-600 italic border-t border-white/5 pt-1.5">
                  "{tooltip.example}"
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
