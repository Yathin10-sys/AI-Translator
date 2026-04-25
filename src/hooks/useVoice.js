/**
 * useVoice Hook - Web Speech API for STT and TTS with waveform
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'

export function useVoice({ onTranscript, language = 'en-US' }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [waveformData, setWaveformData] = useState(new Array(20).fill(0.2))
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(true)

  const recognitionRef = useRef(null)
  const synthRef = useRef(window.speechSynthesis)
  const animFrameRef = useRef(null)
  const analyserRef = useRef(null)
  const streamRef = useRef(null)
  const audioCtxRef = useRef(null)

  // Language code map: ISO 639-1 → BCP-47
  const langToBCP47 = (code) => {
    const map = {
      en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE',
      it: 'it-IT', pt: 'pt-BR', ru: 'ru-RU', zh: 'zh-CN',
      ja: 'ja-JP', ko: 'ko-KR', ar: 'ar-SA', hi: 'hi-IN',
      bn: 'bn-BD', te: 'te-IN', ta: 'ta-IN', ur: 'ur-PK',
      nl: 'nl-NL', pl: 'pl-PL', sv: 'sv-SE', tr: 'tr-TR',
      vi: 'vi-VN', th: 'th-TH', id: 'id-ID', ms: 'ms-MY',
    }
    return map[code] || `${code}-${code.toUpperCase()}`
  }

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
    }
    return () => {
      stopRecording()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      audioCtxRef.current?.close()
    }
  }, [])

  // ── Waveform Animation ────────────────────────────────────────────────────
  const startWaveform = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      analyserRef.current = analyser

      const draw = () => {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        const bars = Array.from({ length: 20 }, (_, i) => {
          const idx = Math.floor((i / 20) * data.length)
          return Math.max(0.1, data[idx] / 255)
        })
        setWaveformData(bars)
        animFrameRef.current = requestAnimationFrame(draw)
      }
      draw()
    } catch {
      // Fallback: random animation
      const animate = () => {
        setWaveformData(Array.from({ length: 20 }, () => Math.random() * 0.8 + 0.2))
        animFrameRef.current = requestAnimationFrame(animate)
      }
      animate()
    }
  }

  const stopWaveform = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioCtxRef.current?.close()
    setWaveformData(new Array(20).fill(0.2))
  }

  // ── Speech Recognition (STT) ──────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Voice input not supported in this browser. Try Chrome.')
      return
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      toast.error('Microphone permission denied.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = langToBCP47(language)
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsRecording(true)
      startWaveform()
    }

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }
      const current = final || interim
      setTranscript(current)
      if (final && onTranscript) onTranscript(final)
    }

    recognition.onerror = (e) => {
      if (e.error !== 'aborted') toast.error(`Voice error: ${e.error}`)
      stopRecording()
    }

    recognition.onend = () => {
      setIsRecording(false)
      stopWaveform()
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [language, onTranscript])

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
    setIsRecording(false)
    stopWaveform()
  }, [])

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording()
    else startRecording()
  }, [isRecording, startRecording, stopRecording])

  // ── Speech Synthesis (TTS) ────────────────────────────────────────────────
  const speak = useCallback(
    (text, lang = language) => {
      if (!text || !synthRef.current) return
      synthRef.current.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = langToBCP47(lang)
      utterance.rate = 0.95
      utterance.pitch = 1
      utterance.volume = 1

      // Pick best voice for language
      const voices = synthRef.current.getVoices()
      const match = voices.find(
        (v) => v.lang.startsWith(lang) && v.localService
      ) || voices.find((v) => v.lang.startsWith(lang))
      if (match) utterance.voice = match

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      synthRef.current.speak(utterance)
    },
    [language]
  )

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel()
    setIsSpeaking(false)
  }, [])

  return {
    isRecording,
    isSpeaking,
    waveformData,
    transcript,
    isSupported,
    toggleRecording,
    startRecording,
    stopRecording,
    speak,
    stopSpeaking,
  }
}
