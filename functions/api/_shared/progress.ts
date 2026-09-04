import {
  EMPTY_PROGRESS,
  mergeProgress,
  normalizeProgress,
  type MediCycleProgress,
} from '../../../shared/progress'

type ProgressRow = {
  data_json: string
}

export async function getProgress(env: Env, userId: string) {
  const row = await env.DB.prepare(
    'SELECT data_json FROM progress WHERE user_id = ?1',
  )
    .bind(userId)
    .first<ProgressRow>()
  if (!row) return structuredClone(EMPTY_PROGRESS)
  try {
    return normalizeProgress(JSON.parse(row.data_json))
  } catch {
    return structuredClone(EMPTY_PROGRESS)
  }
}

export async function replaceProgress(
  env: Env,
  userId: string,
  progress: MediCycleProgress,
) {
  const normalized = normalizeProgress(progress)
  await env.DB.prepare(
    `INSERT INTO progress (user_id, data_json, updated_at)
     VALUES (?1, ?2, ?3)
     ON CONFLICT(user_id) DO UPDATE SET
       data_json = excluded.data_json,
       updated_at = excluded.updated_at`,
  )
    .bind(userId, JSON.stringify(normalized), new Date().toISOString())
    .run()
  return normalized
}

export async function mergeAndSaveProgress(
  env: Env,
  userId: string,
  incoming: unknown,
) {
  const current = await getProgress(env, userId)
  const merged = mergeProgress(current, normalizeProgress(incoming))
  return replaceProgress(env, userId, merged)
}
