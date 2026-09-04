export const PROGRESS_VERSION = 1 as const
const MARINE_CARD_NAMES = [
  'Clownfish',
  'Beluga',
  'Green Sea Turtle',
  'Coral Reef',
  'Jellyfish',
  'Stingray',
] as const

export type QuizProgress = {
  completed: boolean
  bestScore: number
  total: number
}

export type MediCycleProgress = {
  version: typeof PROGRESS_VERSION
  marineCollection: string[]
  quiz: QuizProgress
  returnPlanCompleted: boolean
  recycledDemoCount: number
}

export const EMPTY_PROGRESS: MediCycleProgress = {
  version: PROGRESS_VERSION,
  marineCollection: [],
  quiz: { completed: false, bestScore: 0, total: 6 },
  returnPlanCompleted: false,
  recycledDemoCount: 0,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function boundedInteger(value: unknown, minimum: number, maximum: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return minimum
  return Math.min(Math.max(Math.floor(value), minimum), maximum)
}

export function normalizeProgress(value: unknown): MediCycleProgress {
  if (!isRecord(value)) return structuredClone(EMPTY_PROGRESS)

  const rawCollection = Array.isArray(value.marineCollection)
    ? value.marineCollection
    : []
  const marineCollection = MARINE_CARD_NAMES.filter((name) =>
    rawCollection.includes(name),
  )
  const quiz = isRecord(value.quiz) ? value.quiz : {}
  const bestScore = boundedInteger(quiz.bestScore, 0, 6)

  return {
    version: PROGRESS_VERSION,
    marineCollection,
    quiz: {
      completed: quiz.completed === true,
      bestScore,
      total: 6,
    },
    returnPlanCompleted: value.returnPlanCompleted === true,
    recycledDemoCount: boundedInteger(value.recycledDemoCount, 0, 1_000_000),
  }
}

export function mergeProgress(
  first: MediCycleProgress,
  second: MediCycleProgress,
): MediCycleProgress {
  return normalizeProgress({
    version: PROGRESS_VERSION,
    marineCollection: [...first.marineCollection, ...second.marineCollection],
    quiz: {
      completed: first.quiz.completed || second.quiz.completed,
      bestScore: Math.max(first.quiz.bestScore, second.quiz.bestScore),
      total: 6,
    },
    returnPlanCompleted:
      first.returnPlanCompleted || second.returnPlanCompleted,
    recycledDemoCount: Math.max(
      first.recycledDemoCount,
      second.recycledDemoCount,
    ),
  })
}
