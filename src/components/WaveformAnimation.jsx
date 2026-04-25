/**
 * WaveformAnimation - Live audio waveform bars
 */
export default function WaveformAnimation({ data, isActive, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-400',
    accent: 'bg-accent-400',
    red: 'bg-red-400',
    green: 'bg-green-400',
  }

  return (
    <div className="flex items-center justify-center gap-0.5 h-8">
      {(data || new Array(20).fill(0.2)).map((val, i) => (
        <div
          key={i}
          className={`w-0.5 sm:w-1 rounded-full transition-all duration-100 ${colors[color] || colors.primary} ${
            isActive ? '' : 'opacity-30'
          }`}
          style={{
            height: `${Math.max(4, val * 32)}px`,
            animationDelay: `${i * 0.05}s`,
            animation: isActive ? `wave 1.2s ease-in-out ${i * 0.05}s infinite` : 'none',
          }}
        />
      ))}
    </div>
  )
}
