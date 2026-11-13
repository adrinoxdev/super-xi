// Duração legível para missões longas: 45s, 12min, 1h05.
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  if (s < 60) return `${s}s`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  return sec === 0 ? `${m}min` : `${m}min ${String(sec).padStart(2, '0')}s`
}
