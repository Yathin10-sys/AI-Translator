/**
 * API Service - Axios instance with auth interceptors
 */
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('translator-ai-store')
  if (stored) {
    try {
      const { state } = JSON.parse(stored)
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`
      }
    } catch {}
  }
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('translator-ai-store')
    }
    return Promise.reject(err.response?.data || err)
  }
)

// ── Translation APIs ─────────────────────────────────────────────────────────
export const translateAPI = {
  translate: (payload) => api.post('/translate', payload),
  explain: (payload) => api.post('/translate/explain', payload),
  enhance: (payload) => api.post('/translate/enhance', payload),
  wordInsights: (payload) => api.post('/translate/word-insights', payload),
  alternatives: (payload) => api.post('/translate/alternatives', payload),
  detectLanguage: (text) => api.post('/translate/detect-language', { text }),
  getLanguages: () => api.get('/translate/languages'),
}

// ── Auth APIs ────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (payload) => api.post('/auth/login', payload),
  register: (payload) => api.post('/auth/register', payload),
  getProfile: () => api.get('/auth/profile'),
  updatePreferences: (payload) => api.put('/auth/preferences', payload),
  addDictionaryEntry: (payload) => api.post('/auth/dictionary', payload),
}

// ── History APIs ─────────────────────────────────────────────────────────────
export const historyAPI = {
  getHistory: (params) => api.get('/history', { params }),
  toggleBookmark: (id) => api.patch(`/history/${id}/bookmark`),
  deleteItem: (id) => api.delete(`/history/${id}`),
  clearAll: () => api.delete('/history'),
  getConversation: (id) => api.get(`/history/conversation/${id}`),
}

// ── OCR APIs ─────────────────────────────────────────────────────────────────
export const ocrAPI = {
  extractText: (file) => {
    const form = new FormData()
    form.append('image', file)
    return api.post('/ocr/extract', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export default api
