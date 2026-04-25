/**
 * useTranslation Hook - Debounced real-time translation with AI features
 */
import { useState, useCallback, useRef } from 'react'
import { translateAPI } from '../services/api'
import { useStore } from '../store/useStore'
import toast from 'react-hot-toast'

const DEBOUNCE_MS = 600

export function useTranslation() {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [emotion, setEmotion] = useState(null)
  const [detectedLang, setDetectedLang] = useState(null)
  const [charCount, setCharCount] = useState(0)

  const { sourceLang, targetLang, tone, addToHistory, addContext, translationContext } = useStore()
  const debounceTimer = useRef(null)
  const abortRef = useRef(null)

  const performTranslation = useCallback(
    async (text) => {
      if (!text.trim()) {
        setOutputText('')
        setEmotion(null)
        return
      }

      // Cancel previous request
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      setIsTranslating(true)
      try {
        const data = await translateAPI.translate({
          text,
          sourceLang,
          targetLang,
          tone,
          context: translationContext,
        })

        setOutputText(data.translation)
        setEmotion(data.emotion)
        setDetectedLang(data.detectedLang)

        const historyItem = {
          _id: Date.now().toString(),
          originalText: text,
          translatedText: data.translation,
          sourceLang,
          detectedLang: data.detectedLang,
          targetLang,
          tone,
          emotion: data.emotion?.emotion,
          isBookmarked: false,
          createdAt: new Date().toISOString(),
        }
        addToHistory(historyItem)
        addContext(historyItem)
      } catch (err) {
        if (err?.name !== 'AbortError') {
          toast.error('Translation failed. Check your connection.')
        }
      } finally {
        setIsTranslating(false)
      }
    },
    [sourceLang, targetLang, tone, translationContext, addToHistory, addContext]
  )

  const handleInputChange = useCallback(
    (text) => {
      setInputText(text)
      setCharCount(text.length)

      if (debounceTimer.current) clearTimeout(debounceTimer.current)

      if (!text.trim()) {
        setOutputText('')
        setEmotion(null)
        return
      }

      debounceTimer.current = setTimeout(() => {
        performTranslation(text)
      }, DEBOUNCE_MS)
    },
    [performTranslation]
  )

  const translateNow = useCallback(
    (text) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      performTranslation(text || inputText)
    },
    [performTranslation, inputText]
  )

  const clearAll = useCallback(() => {
    setInputText('')
    setOutputText('')
    setEmotion(null)
    setDetectedLang(null)
    setCharCount(0)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
  }, [])

  return {
    inputText,
    outputText,
    isTranslating,
    emotion,
    detectedLang,
    charCount,
    handleInputChange,
    translateNow,
    clearAll,
    setInputText,
    setOutputText,
  }
}
