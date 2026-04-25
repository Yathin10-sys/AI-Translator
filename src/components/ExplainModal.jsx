/**
 * ExplainModal - AI explanation of translation with grammar notes and alternatives
 */
import { useState, useEffect } from 'react'
import { X, Sparkles, Loader2, Copy, Check } from 'lucide-react'
import { useStore } from '../store/useStore'
import { translateAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function ExplainModal() {
  const { showExplainModal, explainData, closeExplainModal } = useStore()
  const [explanation, setExplanation] = useState('')
  const [alternatives, setAlternatives] = useState([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (showExplainModal && explainData) {
      fetchExplanation()
    }
    if (!showExplainModal) {
      setExplanation('')
      setAlternatives([])
    }
  }, [showExplainModal, explainData])

  const fetchExplanation = async () => {
    setLoading(true)
    try {
      const [explainRes, altRes] = await Promise.all([
        translateAPI.explain({
          original: explainData.original,
          translated: explainData.translated,
          sourceLang: explainData.sourceLang,
          targetLang: explainData.targetLang,
          tone: explainData.tone,
        }),
        translateAPI.alternatives({
          text: explainData.translated,
          language: explainData.targetLang,
        }),
      ])
      setExplanation(explainRes.explanation || '')
      setAlternatives(altRes.alternatives || [])
    } catch {
      toast.error('Could not load explanation')
    } finally {
      setLoading(false)
    }
  }

  const copyExplanation = () => {
    navigator.clipboard.writeText(explanation)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!showExplainModal) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeExplainModal}
      />

      {/* Modal */}
      <div className="relative glass rounded-2xl border border-white/10 w-full max-w-lg shadow-2xl slide-up max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-100">AI Explanation</h2>
              <p className="text-xs text-slate-500">Grammar, tone & word choices</p>
            </div>
          </div>
          <button onClick={closeExplainModal} className="btn-ghost p-2 rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Original ↔ Translated */}
          {explainData && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark-700/80 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-1 font-medium">Original</p>
                <p className="text-sm text-slate-200 line-clamp-3">{explainData.original}</p>
              </div>
              <div className="bg-primary-500/10 rounded-xl p-3 border border-primary-500/20">
                <p className="text-xs text-primary-400 mb-1 font-medium">Translation</p>
                <p className="text-sm text-slate-200 line-clamp-3">{explainData.translated}</p>
              </div>
            </div>
          )}

          {/* Explanation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200">Explanation</h3>
              {explanation && (
                <button onClick={copyExplanation} className="btn-ghost text-xs py-1 px-2">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {loading ? (
              <div className="space-y-2">
                {[80, 100, 60, 90].map((w, i) => (
                  <div key={i} className={`h-3 rounded-full bg-dark-500 shimmer`} style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : explanation ? (
              <div className="bg-dark-700/50 rounded-xl p-4 border border-white/5">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{explanation}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No explanation available. Add a Groq API key.</p>
            )}
          </div>

          {/* Alternatives */}
          {alternatives.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-2">Alternative Phrasings</h3>
              <div className="space-y-2">
                {alternatives.map((alt, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 bg-dark-700/50 rounded-xl px-4 py-3 border border-white/5"
                  >
                    <span className="text-xs text-slate-600 font-mono mt-0.5">{i + 1}</span>
                    <p className="text-sm text-slate-300">{alt}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
