/**
 * Zustand Global Store - App-wide state management
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Theme ──────────────────────────────────────────────────────────────
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        document.documentElement.className = next
      },

      // ── Auth ───────────────────────────────────────────────────────────────
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),

      // ── Translation Settings ───────────────────────────────────────────────
      sourceLang: 'auto',
      targetLang: 'en',
      tone: 'formal',
      setSourceLang: (lang) => set({ sourceLang: lang }),
      setTargetLang: (lang) => set({ targetLang: lang }),
      setTone: (tone) => set({ tone }),
      swapLanguages: () => {
        const { sourceLang, targetLang } = get()
        if (sourceLang !== 'auto') {
          set({ sourceLang: targetLang, targetLang: sourceLang })
        }
      },

      // ── Translation History ────────────────────────────────────────────────
      history: [],
      addToHistory: (item) =>
        set((s) => ({ history: [item, ...s.history].slice(0, 100) })),
      toggleBookmarkLocal: (id) =>
        set((s) => ({
          history: s.history.map((h) =>
            h._id === id ? { ...h, isBookmarked: !h.isBookmarked } : h
          ),
        })),
      clearHistoryLocal: () => set({ history: [] }),

      // ── UI State ───────────────────────────────────────────────────────────
      activePanel: 'translator', // 'translator' | 'conversation' | 'history'
      setActivePanel: (panel) => set({ activePanel: panel }),

      showAuthModal: false,
      authMode: 'login',
      openAuthModal: (mode = 'login') => set({ showAuthModal: true, authMode: mode }),
      closeAuthModal: () => set({ showAuthModal: false }),

      showExplainModal: false,
      explainData: null,
      openExplainModal: (data) => set({ showExplainModal: true, explainData: data }),
      closeExplainModal: () => set({ showExplainModal: false, explainData: null }),

      // ── Context Memory (last 5 translations for AI context) ───────────────
      translationContext: [],
      addContext: (item) =>
        set((s) => ({
          translationContext: [
            ...s.translationContext,
            { original: item.originalText, translated: item.translatedText },
          ].slice(-5),
        })),
      clearContext: () => set({ translationContext: [] }),
    }),
    {
      name: 'translator-ai-store',
      partialize: (s) => ({
        theme: s.theme,
        sourceLang: s.sourceLang,
        targetLang: s.targetLang,
        tone: s.tone,
        token: s.token,
        user: s.user,
      }),
    }
  )
)
