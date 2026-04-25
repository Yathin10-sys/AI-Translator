/**
 * ConversationMode - Live WebSocket chat with real-time translation
 */
import { useState, useEffect, useRef } from 'react'
import {
  Users, MessageSquare, Mic, MicOff, Send, PhoneOff,
  Link, Copy, Check, Info, Loader2, Volume2
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { getSocket, connectSocket, disconnectSocket } from '../services/socket'
import { useVoice } from '../hooks/useVoice'
import LanguageSelector from './LanguageSelector'
import WaveformAnimation from './WaveformAnimation'
import EmotionBadge from './EmotionBadge'
import toast from 'react-hot-toast'

export default function ConversationMode() {
  const { user, sourceLang, setSourceLang, theme } = useStore()
  const [roomId, setRoomId] = useState('')
  const [inRoom, setInRoom] = useState(false)
  const [messages, setMessages] = useState([])
  const [participants, setParticipants] = useState([])
  const [myRole, setMyRole] = useState('')
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [textMode, setTextMode] = useState('')
  const [copied, setCopied] = useState(false)

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const socketRef = useRef(null)

  const voiceIn = useVoice({
    language: sourceLang === 'auto' ? 'en' : sourceLang,
    onTranscript: (t) => setTextMode(t),
  })

  // ── Socket Connection & Handlers ──────────────────────────────────────────
  useEffect(() => {
    socketRef.current = connectSocket()
    const socket = socketRef.current

    socket.on('connect', () => console.log('Socket connected'))

    socket.on('room_joined', (data) => {
      setInRoom(true)
      setParticipants(data.participants)
      if (data.yourRole) setMyRole(data.yourRole)
      if (!roomId) setRoomId(data.roomId)
      toast.success('Joined conversation!')
    })

    socket.on('room_full', () => {
      toast.error('Room is full (max 2 participants)')
      disconnectSocket()
    })

    socket.on('message', (msg) => {
      // Show original message instantly
      setMessages((prev) => [...prev, msg])
      scrollToBottom()
    })

    socket.on('message_translated', (msg) => {
      // Update message with translation
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === msg.id || (m.originalText === msg.originalText && m.isTranslating))
        if (idx >= 0) {
          const newMsgs = [...prev]
          newMsgs[idx] = { ...msg, isTranslating: false }
          return newMsgs
        }
        return [...prev, msg]
      })
      scrollToBottom()
      setPartnerTyping(false)
    })

    socket.on('partner_typing', (data) => {
      if (data.isTyping) {
        setPartnerTyping(data.name || 'Partner')
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => setPartnerTyping(false), 3000)
      } else {
        setPartnerTyping(false)
      }
    })

    socket.on('language_changed', (data) => {
      setParticipants((prev) =>
        prev.map((p) => (p.role === data.role ? { ...p, language: data.language } : p))
      )
      if (data.role !== myRole) {
        toast(`${data.name} changed language to ${data.language.toUpperCase()}`, { icon: '🔄' })
      }
    })

    socket.on('partner_left', (data) => {
      toast(data.message, { icon: '👋' })
      setParticipants((prev) => prev.filter((p) => p.name !== data.name))
    })

    socket.on('translation_error', (data) => {
      toast.error(data.error)
      setMessages((prev) => prev.map((m) => (m.isTranslating ? { ...m, isTranslating: false, error: true } : m)))
    })

    return () => {
      disconnectSocket()
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, []) // eslint-disable-line

  // ── Chat Actions ──────────────────────────────────────────────────────────
  const joinRoom = (e) => {
    e?.preventDefault()
    if (!socketRef.current?.connected) socketRef.current?.connect()
    socketRef.current?.emit('join_room', {
      roomId: roomId.trim() || undefined,
      userName: user?.name || `Guest_${Math.floor(Math.random() * 1000)}`,
      language: sourceLang === 'auto' ? 'en' : sourceLang,
    })
  }

  const leaveRoom = () => {
    socketRef.current?.emit('leave_room', { roomId })
    setInRoom(false)
    setMessages([])
    setParticipants([])
    setRoomId('')
    disconnectSocket()
  }

  const sendMessage = () => {
    if (!textMode.trim()) return
    socketRef.current?.emit('send_message', { text: textMode, roomId })
    setTextMode('')
    socketRef.current?.emit('typing', { roomId, isTyping: false })
  }

  const handleTyping = (e) => {
    setTextMode(e.target.value)
    socketRef.current?.emit('typing', { roomId, isTyping: e.target.value.length > 0 })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { roomId, isTyping: false })
    }, 2000)
  }

  const handleLanguageChange = (lang) => {
    setSourceLang(lang)
    socketRef.current?.emit('change_language', { roomId, language: lang })
  }

  const copyRoomLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}?room=${roomId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Invite link copied!')
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // Effect to handle voice input submitting when stopped
  useEffect(() => {
    if (!voiceIn.isRecording && textMode && textMode.endsWith('.')) {
      // Auto send if it looks like a complete sentence from voice
      // but let's just leave it in the input box for user to review
    }
  }, [voiceIn.isRecording])

  const partner = participants.find((p) => p.role !== myRole)

  return (
    <div className="glass rounded-2xl border border-white/5 h-[80vh] min-h-[600px] flex flex-col slide-up overflow-hidden shadow-2xl relative">

      {!inRoom ? (
        // ── Join Screen ───────────────────────────────────────────────────────
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-dark-900/50">
          <div className="w-20 h-20 bg-primary-500/20 rounded-full flex items-center justify-center mb-6 glow-primary">
            <Users className="w-10 h-10 text-primary-400" />
          </div>
          <h2 className="text-3xl font-bold text-slate-100 mb-2">Live Conversation</h2>
          <p className="text-slate-400 max-w-md mx-auto mb-8">
            Start a real-time, bilingual chat session. AI will instantly translate
            messages so both people see the chat in their native language.
          </p>

          <form onSubmit={joinRoom} className="w-full max-w-sm space-y-4">
            <div className="text-left">
              <LanguageSelector
                value={sourceLang === 'auto' ? 'en' : sourceLang}
                onChange={setSourceLang}
                showAuto={false}
                label="Your Language"
              />
            </div>

            <div className="pt-2">
              <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide text-left">Room ID (Optional)</p>
              <input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Leave blank to create new"
                className="input-base"
              />
            </div>

            <button type="submit" className="w-full btn-primary justify-center py-3 mt-4 text-base shadow-lg shadow-primary-500/20">
              <MessageSquare className="w-5 h-5" />
              Start Conversation
            </button>
          </form>
        </div>
      ) : (
        // ── Chat Interface ────────────────────────────────────────────────────
        <>
          {/* Header */}
          <div className="bg-dark-800/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between shrink-0 sticky top-0 z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                <span className="font-semibold text-slate-200">Live Chat</span>
              </div>
              <button
                onClick={copyRoomLink}
                className="flex items-center gap-1.5 text-xs px-2 py-1 bg-dark-600 rounded-md text-slate-400 hover:text-white transition-colors"
                title="Copy invite link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Link className="w-3.5 h-3.5" />}
                Room: {roomId.slice(0, 8)}...
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3 mr-4">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-slate-500">You</span>
                  <span className="text-sm font-medium text-primary-400">{sourceLang.toUpperCase()}</span>
                </div>
                <Users className="w-4 h-4 text-slate-600" />
                <div className="flex flex-col items-start">
                  <span className="text-xs text-slate-500">{partner?.name || 'Waiting...'}</span>
                  <span className="text-sm font-medium text-accent-400">{partner?.language?.toUpperCase() || '--'}</span>
                </div>
              </div>
              <button onClick={leaveRoom} className="btn-danger p-2" title="Leave room">
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin bg-black/20">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
                <Info className="w-8 h-8 opacity-50" />
                <p>Waiting for messages...</p>
                {!partner && (
                  <p className="text-xs opacity-70">Share the room ID with your partner to join.</p>
                )}
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.senderRole === myRole
                return (
                  <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full`}>
                    <span className="text-xs text-slate-500 mb-1 ml-1 mr-1">
                      {isMe ? 'You' : msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {isMe ? (
                      // MY MESSAGE (Right side)
                      <div className="bubble-sent group relative">
                        <p className="text-sm">{msg.originalText}</p>
                        {msg.translatedText && (
                          <div className="mt-2 pt-2 border-t border-white/20 text-xs text-primary-100 flex items-start gap-2">
                            <span className="opacity-70 mt-0.5">{msg.targetLang?.toUpperCase()}</span>
                            <span>{msg.translatedText}</span>
                          </div>
                        )}
                        {msg.isTranslating && (
                          <div className="absolute -bottom-5 right-0 flex items-center gap-1 text-[10px] text-slate-500">
                            <Loader2 className="w-3 h-3 animate-spin" /> Translating...
                          </div>
                        )}
                      </div>
                    ) : (
                      // PARTNER MESSAGE (Left side)
                      <div className="bubble-received group relative">
                        {msg.isTranslating ? (
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-pulse" />
                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-pulse decoration-delay-75" />
                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-pulse decoration-delay-150" />
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium">{msg.translatedText}</p>
                            <div className="mt-2 pt-2 border-t border-white/10 text-xs text-slate-400 flex items-start gap-2">
                              <span className="opacity-70 mt-0.5">{msg.sourceLang?.toUpperCase()}</span>
                              <span>{msg.originalText}</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {partnerTyping && (
              <div className="flex items-center gap-2 text-xs text-slate-500 pb-2">
                <span className="w-1.5 h-1.5 bg-accent-400 rounded-full animate-bounce" />
                {partnerTyping} is typing...
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>

          {/* Input Area */}
          <div className="bg-dark-800/80 backdrop-blur-md border-t border-white/5 p-4 shrink-0">
            <div className="max-w-4xl mx-auto flex items-end gap-2 sm:gap-3">

              {/* Language Switcher (quick change) */}
              <div className="hidden sm:block mb-1">
                <LanguageSelector
                  value={sourceLang === 'auto' ? 'en' : sourceLang}
                  onChange={handleLanguageChange}
                  showAuto={false}
                />
              </div>

              {/* Text Input */}
              <div className="flex-1 bg-dark-900 border border-white/10 flex items-center rounded-2xl focus-within:border-primary-500/50 focus-within:ring-1 focus-within:ring-primary-500/20 transition-all overflow-hidden min-h-[50px]">
                <textarea
                  value={textMode}
                  onChange={handleTyping}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-sm max-h-32 text-slate-200 placeholder-slate-600 block w-full focus:outline-none"
                  rows={Math.min(Math.max((textMode.match(/\n/g) || []).length + 1, 1), 4)}
                />
              </div>

              {/* Voice Button */}
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={voiceIn.toggleRecording}
                  className={`p-3 rounded-xl transition-all duration-200 shadow-lg ${
                    voiceIn.isRecording
                      ? 'bg-red-500 text-white recording-pulse'
                      : 'bg-dark-600 text-slate-300 hover:bg-dark-500 hover:text-white border border-white/5'
                  }`}
                  title={voiceIn.isRecording ? 'Stop Recording' : 'Hold to Speak'}
                >
                  {voiceIn.isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* Send Button */}
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!textMode.trim() && !voiceIn.isRecording}
                  className="p-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white transition-all disabled:opacity-50 disabled:hover:bg-primary-600 shadow-lg shadow-primary-500/20"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

            </div>
            {/* Mobile language selector */}
            <div className="sm:hidden mt-3 mb-1">
               <LanguageSelector
                  value={sourceLang === 'auto' ? 'en' : sourceLang}
                  onChange={handleLanguageChange}
                  showAuto={false}
                />
            </div>
            {voiceIn.isRecording && (
                <div className="mt-4 flex justify-center pb-2">
                    <WaveformAnimation data={voiceIn.waveformData} isActive={true} color="red" />
                </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
