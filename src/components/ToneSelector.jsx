/**
 * ToneSelector - Select AI translation tone/style
 */
import { Briefcase, Coffee, Heart, Mic, Wrench } from 'lucide-react'
import { useStore } from '../store/useStore'

const TONES = [
  { id: 'formal', label: 'Formal', icon: Briefcase, desc: 'Professional & respectful' },
  { id: 'casual', label: 'Casual', icon: Coffee, desc: 'Everyday conversational' },
  { id: 'business', label: 'Business', icon: Mic, desc: 'Corporate & precise' },
  { id: 'friendly', label: 'Friendly', icon: Heart, desc: 'Warm & encouraging' },
  { id: 'technical', label: 'Technical', icon: Wrench, desc: 'Preserve technical terms' },
]

export default function ToneSelector() {
  const { tone, setTone } = useStore()

  return (
    <div className="flex flex-wrap gap-2">
      {TONES.map(({ id, label, icon: Icon, desc }) => (
        <button
          key={id}
          onClick={() => setTone(id)}
          title={desc}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                     transition-all duration-200 border ${
            tone === id
              ? 'bg-primary-500/20 border-primary-500/60 text-primary-400 shadow-lg shadow-primary-500/10'
              : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}
