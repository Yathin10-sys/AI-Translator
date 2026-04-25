/**
 * TranslatorPanel - Main split-screen translator with all AI features
 */
import { useState, useCallback } from 'react'
import {
  ArrowLeftRight, Copy, Check, Volume2, VolumeX, Mic, MicOff,
  Sparkles, X, Image, Loader2, Wand2, RefreshCw, Trash2
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { useTranslation } from '../hooks/useTranslation'
import { useVoice } from '../hooks/useVoice'
import { translateAPI } from '../services/api'
import LanguageSelector from './LanguageSelector'
import ToneSelector from './ToneSelector'
import WaveformAnimation from './WaveformAnimation'
import EmotionBadge from './EmotionBadge'
import OCRUpload from './OCRUpload'
import WordInsightTooltip from './WordInsightTooltip'
import toast from 'react-hot-toast'

const MAX_CHARS = 5000

export default function TranslatorPanel() {
  const {
    sourceLang, targetLang, tone,
    setSourceLang, setTargetLang, swapLanguages,
    openExplainModal,
  } = useStore()

  const {
    inputText, outputText, isTranslating, emotion, detectedLang,
    charCount, handleInputChange, translateNow, clearAll, setInputText,
  } = useTranslation()

  const voiceIn = useVoice({
    language: sourceLang === 'auto' ? 'en' : sourceLang,
    onTranscript: (text) => {
      handleInputChange(text)
    },
  })

  const voiceOut = useVoice({ language: targetLang })

  const [copiedIn, setCopiedIn] = useState(false)
  const [copiedOut, setCopiedOut] = useState(false)
  const [showOCR, setShowOCR] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [enhancedText, setEnhancedText] = useState('')

  // ── Copy handlers ───────────────────────────────────────────────────────────
  const copyInput = () => {
    if (!inputText) return
    navigator.clipboard.writeText(inputText)
    setCopiedIn(true)
    setTimeout(() => setCopiedIn(false), 2000)
  }
  const copyOutput = () => {
    if (!outputText) return
    navigator.clipboard.writeText(outputText)
    setCopiedOut(true)
    toast.success('Translation copied!')
    setTimeout(() => setCopiedOut(false), 2000)
  }

  // ── Explain Translation ─────────────────────────────────────────────────────
  const handleExplain = () => {
    if (!inputText || !outputText) {
      toast.error('Translate something first')
      return
    }
    openExplainModal({
      original: inputText,
      translated: outputText,
      sourceLang: detectedLang || sourceLang,
      targetLang,
      tone,
    })
  }

  // ── Enhance Output ──────────────────────────────────────────────────────────
  const handleEnhance = async () => {
    if (!outputText) return
    setEnhancing(true)
    setEnhancedText('')
    try {
      const data = await translateAPI.enhance({
        text: outputText,
        language: targetLang,
        mode: 'fluency',
      })
      setEnhancedText(data.enhanced)
      if (data.changes?.length) {
        toast.success(`${data.changes.length} improvement(s) made`)
      }
    } catch {
      toast.error('Enhancement failed')
    } finally {
      setEnhancing(false)
    }
  }

  // ── Swap Languages ──────────────────────────────────────────────────────────
  const handleSwap = () => {
    swapLanguages()
    if (outputText) {
      handleInputChange(outputText)
    }
  }

  const charPercent = Math.min((charCount / MAX_CHARS) * 100, 100)
  const charColor = charPercent > 90 ? 'text-red-400' : charPercent > 70 ? 'text-yellow-400' : 'text-slate-500'

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Top Controls ─────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-4 border border-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Language selectors + swap */}
          <div className="flex items-center gap-2 flex-wrap">
            <LanguageSelector
              value={sourceLang}
              onChange={setSourceLang}
              showAuto
              label="From"
            />
            <button
              onClick={handleSwap}
              className="p-2.5 glass rounded-xl border border-white/10 hover:border-primary-500/50
                         hover:text-primary-400 transition-all duration-200 text-slate-400 mt-4"
              title="Swap languages"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <LanguageSelector
              value={targetLang}
              onChange={setTargetLang}
              showAuto={false}
              label="To"
            />
          </div>

          {/* Tone selector */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Tone</p>
            <ToneSelector />
          </div>
        </div>
      </div>

      {/* ── OCR Panel ─────────────────────────────────────────────────────────── */}
      {showOCR && (
        <div className="glass rounded-2xl p-4 border border-primary-500/20 slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Image className="w-4 h-4 text-primary-400" /> Image → Text (OCR)
            </h3>
            <button onClick={() => setShowOCR(false)} className="btn-ghost p-1.5 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
          <OCRUpload onTextExtracted={handleInputChange} onClose={() => setShowOCR(false)} />
        </div>
      )}

      {/* ── Split Panels ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* INPUT PANEL */}
        <div className="glass rounded-2xl border border-white/5 flex flex-col min-h-[340px]">
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="lang-tag">
                {detectedLang && sourceLang === 'auto'
                  ? `🔍 ${detectedLang.toUpperCase()}`
                  : sourceLang.toUpperCase()}
              </span>
              {emotion && <EmotionBadge emotion={emotion} />}
            </div>
            <div className="flex items-center gap-1">
              {/* OCR button */}
              <button
                onClick={() => setShowOCR(!showOCR)}
                className={`btn-ghost py-1.5 px-2 text-xs rounded-lg ${showOCR ? 'text-primary-400' : ''}`}
                title="Upload image for OCR"
              >
                <Image className="w-3.5 h-3.5" />
              </button>
              {/* Copy input */}
              <button onClick={copyInput} className="btn-ghost py-1.5 px-2 text-xs rounded-lg" title="Copy">
                {copiedIn ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {/* Clear */}
              {inputText && (
                <button onClick={clearAll} className="btn-ghost py-1.5 px-2 text-xs rounded-lg text-slate-500" title="Clear">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Textarea */}
          <div className="flex-1 relative p-1">
            <textarea
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Type or paste text to translate... or use voice input below"
              maxLength={MAX_CHARS}
              className="w-full h-full min-h-[220px] bg-transparent resize-none p-3 text-slate-100
                         placeholder-slate-600 focus:outline-none text-sm leading-relaxed scrollbar-thin"
            />
          </div>

          {/* Bottom toolbar */}
          <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Voice input */}
              <button
                onClick={voiceIn.toggleRecording}
                className={`relative p-2 rounded-xl transition-all duration-200 ${
                  voiceIn.isRecording
                    ? 'bg-red-500 text-white recording-pulse'
                    : 'btn-ghost'
                }`}
                title={voiceIn.isRecording ? 'Stop recording' : 'Voice input'}
              >
                {voiceIn.isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Waveform */}
              {voiceIn.isRecording && (
                <WaveformAnimation data={voiceIn.waveformData} isActive={true} color="red" />
              )}
            </div>
            <span className={`text-xs font-mono ${charColor}`}>
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          </div>
        </div>

        {/* OUTPUT PANEL */}
        <div className="glass rounded-2xl border border-white/5 flex flex-col min-h-[340px]">
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/5">
            <span className="lang-tag">{targetLang.toUpperCase()}</span>
            <div className="flex items-center gap-1">
              {/* Speak output */}
              <button
                onClick={() =>
                  voiceOut.isSpeaking
                    ? voiceOut.stopSpeaking()
                    : voiceOut.speak(enhancedText || outputText, targetLang)
                }
                disabled={!outputText}
                className={`btn-ghost py-1.5 px-2 text-xs rounded-lg ${voiceOut.isSpeaking ? 'text-primary-400' : ''}`}
                title="Read aloud"
              >
                {voiceOut.isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              {/* Copy output */}
              <button onClick={copyOutput} disabled={!outputText} className="btn-ghost py-1.5 px-2 text-xs rounded-lg">
                {copiedOut ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Output text with word insights */}
          <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
            {isTranslating ? (
              <div className="space-y-2 pt-2">
                <div className="h-4 rounded-full bg-dark-500 shimmer w-4/5" />
                <div className="h-4 rounded-full bg-dark-500 shimmer w-full" />
                <div className="h-4 rounded-full bg-dark-500 shimmer w-3/5" />
              </div>
            ) : enhancedText ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-primary-400 font-medium flex items-center gap-1">
                    <Wand2 className="w-3 h-3" /> Enhanced
                  </span>
                  <button
                    onClick={() => setEnhancedText('')}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    Show original
                  </button>
                </div>
                <WordInsightTooltip text={enhancedText} language={targetLang} />
              </div>
            ) : outputText ? (
              <WordInsightTooltip text={outputText} language={targetLang} />
            ) : (
              <p className="text-slate-600 text-sm italic pt-2">
                Translation will appear here...
              </p>
            )}
          </div>

          {/* Action bar */}
          {outputText && (
            <div className="px-4 py-2 border-t border-white/5 flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExplain}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                           bg-primary-500/15 text-primary-400 hover:bg-primary-500/25 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" /> Explain
              </button>
              <button
                onClick={handleEnhance}
                disabled={enhancing}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                           bg-accent-500/15 text-accent-400 hover:bg-accent-500/25 transition-colors disabled:opacity-50"
              >
                {enhancing
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Wand2 className="w-3.5 h-3.5" />}
                Enhance
              </button>
              <button
                onClick={() => translateNow()}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                           bg-dark-500 text-slate-400 hover:text-white transition-colors ml-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
