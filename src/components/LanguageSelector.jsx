/**
 * LanguageSelector - Native select for reliable cross-platform language picking
 */
import { Globe } from 'lucide-react'

const LANGUAGES = [
  { code: 'auto', name: 'Auto Detect', emoji: '🌐' },
  { code: 'en',  name: 'English',    emoji: '🇺🇸' },
  { code: 'es',  name: 'Spanish',    emoji: '🇪🇸' },
  { code: 'fr',  name: 'French',     emoji: '🇫🇷' },
  { code: 'de',  name: 'German',     emoji: '🇩🇪' },
  { code: 'it',  name: 'Italian',    emoji: '🇮🇹' },
  { code: 'pt',  name: 'Portuguese', emoji: '🇧🇷' },
  { code: 'ru',  name: 'Russian',    emoji: '🇷🇺' },
  { code: 'zh',  name: 'Chinese',    emoji: '🇨🇳' },
  { code: 'ja',  name: 'Japanese',   emoji: '🇯🇵' },
  { code: 'ko',  name: 'Korean',     emoji: '🇰🇷' },
  { code: 'ar',  name: 'Arabic',     emoji: '🇸🇦' },
  { code: 'hi',  name: 'Hindi',      emoji: '🇮🇳' },
  { code: 'bn',  name: 'Bengali',    emoji: '🇧🇩' },
  { code: 'te',  name: 'Telugu',     emoji: '🇮🇳' },
  { code: 'ta',  name: 'Tamil',      emoji: '🇮🇳' },
  { code: 'ur',  name: 'Urdu',       emoji: '🇵🇰' },
  { code: 'nl',  name: 'Dutch',      emoji: '🇳🇱' },
  { code: 'pl',  name: 'Polish',     emoji: '🇵🇱' },
  { code: 'sv',  name: 'Swedish',    emoji: '🇸🇪' },
  { code: 'tr',  name: 'Turkish',    emoji: '🇹🇷' },
  { code: 'vi',  name: 'Vietnamese', emoji: '🇻🇳' },
  { code: 'th',  name: 'Thai',       emoji: '🇹🇭' },
  { code: 'id',  name: 'Indonesian', emoji: '🇮🇩' },
  { code: 'ms',  name: 'Malay',      emoji: '🇲🇾' },
]

export default function LanguageSelector({ value, onChange, showAuto = true, label }) {
  const available = showAuto ? LANGUAGES : LANGUAGES.filter((l) => l.code !== 'auto')
  const selected = available.find((l) => l.code === value) || available[0]

  return (
    <div className="relative flex flex-col">
      {label && (
        <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">
          {label}
        </p>
      )}

      <div className="relative flex items-center">
        {/* Flag / globe icon */}
        <span className="absolute left-3 text-lg pointer-events-none z-10 leading-none select-none">
          {selected.emoji}
        </span>

        {/* Native select — perfectly reliable */}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none pl-9 pr-8 py-2 min-w-[150px] w-full
                     bg-dark-700/80 border border-white/10 rounded-xl
                     text-sm font-medium text-slate-200
                     hover:border-primary-500/50 focus:border-primary-500/70
                     focus:outline-none focus:ring-1 focus:ring-primary-500/30
                     transition-all duration-200 cursor-pointer"
        >
          {available.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.emoji} {lang.name}
            </option>
          ))}
        </select>

        {/* Chevron arrow */}
        <svg
          className="absolute right-2.5 w-4 h-4 text-slate-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}

export { LANGUAGES }
