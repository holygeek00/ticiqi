const NEXT_KEYS = new Set([
  'ArrowRight',
  'PageDown',
  'AudioVolumeUp',
  'VolumeUp',
  'MediaTrackNext',
  'MediaNextTrack',
])

const PREVIOUS_KEYS = new Set([
  'ArrowLeft',
  'PageUp',
  'AudioVolumeDown',
  'VolumeDown',
  'MediaTrackPrevious',
  'MediaPreviousTrack',
])

export const getNavigationDirectionFromKey = ({ key = '', code = '' }) => {
  if (NEXT_KEYS.has(key) || NEXT_KEYS.has(code)) return 1
  if (PREVIOUS_KEYS.has(key) || PREVIOUS_KEYS.has(code)) return -1
  return 0
}

export const getNavigationDirectionFromSwipe = (start, end) => {
  if (!start || !end) return 0

  const horizontalDistance = end.x - start.x
  const verticalDistance = end.y - start.y
  const isIntentionalSwipe =
    Math.abs(horizontalDistance) >= 56 &&
    Math.abs(horizontalDistance) > Math.abs(verticalDistance) * 1.35

  if (!isIntentionalSwipe) return 0
  return horizontalDistance < 0 ? 1 : -1
}
