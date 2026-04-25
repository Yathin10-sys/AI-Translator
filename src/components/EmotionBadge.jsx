/**
 * EmotionBadge - Shows detected emotion/sentiment of input text
 */
const EMOJI_MAP = {
  happy: '😊', sad: '😢', angry: '😠', neutral: '😐',
  excited: '🤩', fearful: '😨', surprised: '😲',
}

const LABEL_MAP = {
  positive: 'Positive', negative: 'Negative', neutral: 'Neutral',
}

export default function EmotionBadge({ emotion }) {
  if (!emotion?.emotion) return null

  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full border emotion-${emotion.emotion}`}
      >
        {EMOJI_MAP[emotion.emotion] || '🌀'} {emotion.emotion}
      </span>
      {emotion.sentiment && emotion.sentiment !== 'neutral' && (
        <span className="text-xs text-slate-500">
          {LABEL_MAP[emotion.sentiment]}
        </span>
      )}
    </div>
  )
}
