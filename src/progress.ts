import { marineCards } from './data'
import {
  EMPTY_PROGRESS,
  mergeProgress,
  normalizeProgress,
  type MediCycleProgress,
} from '../shared/progress'

export { EMPTY_PROGRESS, mergeProgress, type MediCycleProgress }

const PROGRESS_KEY = 'medicycle-progress-v1'
const DEMO_PROGRESS_KEY = 'medicycle-demo-recycled-count'
const LEGACY_PROGRESS_KEY = 'medicine-recycled'

export function getLocalProgress(): MediCycleProgress {
  try {
    const saved = window.localStorage.getItem(PROGRESS_KEY)
    const normalized = saved
      ? normalizeProgress(JSON.parse(saved))
      : structuredClone(EMPTY_PROGRESS)
    const legacyCount = Number(
      window.localStorage.getItem(DEMO_PROGRESS_KEY) ??
        window.localStorage.getItem(LEGACY_PROGRESS_KEY) ??
        '0',
    )
    const safeLegacyCount = Number.isFinite(legacyCount)
      ? Math.min(Math.max(Math.floor(legacyCount), 0), marineCards.length)
      : 0
    const legacyProgress = normalizeProgress({
      ...EMPTY_PROGRESS,
      marineCollection: marineCards
        .slice(0, safeLegacyCount)
        .map((card) => card.name),
      recycledDemoCount: safeLegacyCount,
    })
    return mergeProgress(normalized, legacyProgress)
  } catch {
    return structuredClone(EMPTY_PROGRESS)
  }
}

export function saveLocalProgress(progress: MediCycleProgress) {
  const normalized = normalizeProgress(progress)
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(normalized))
  window.localStorage.setItem(
    DEMO_PROGRESS_KEY,
    String(normalized.marineCollection.length),
  )
  window.localStorage.removeItem(LEGACY_PROGRESS_KEY)
}

export function clearLocalProgress() {
  window.localStorage.removeItem(PROGRESS_KEY)
  window.localStorage.removeItem(DEMO_PROGRESS_KEY)
  window.localStorage.removeItem(LEGACY_PROGRESS_KEY)
}
