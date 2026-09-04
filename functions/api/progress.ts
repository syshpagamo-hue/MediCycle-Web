import { EMPTY_PROGRESS } from '../../shared/progress'
import {
  assertSameOrigin,
  error,
  handleError,
  isRecord,
  json,
  readJson,
} from './_shared/http'
import {
  getProgress,
  mergeAndSaveProgress,
  replaceProgress,
} from './_shared/progress'
import { getSession } from './_shared/session'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const session = await getSession(request, env)
    if (!session) return error('Sign in to restore account progress.', 401)
    return json({ authenticated: true, progress: await getProgress(env, session.userId) })
  } catch (cause) {
    return handleError(cause)
  }
}
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  try {
    assertSameOrigin(request)
    const session = await getSession(request, env)
    if (!session) return error('Sign in to sync progress.', 401)
    const body = await readJson(request)
    if (!isRecord(body) || !('progress' in body)) {
      return error('Progress data is required.')
    }
    const progress = await mergeAndSaveProgress(env, session.userId, body.progress)
    return json({ authenticated: true, progress })
  } catch (cause) {
    return handleError(cause)
  }
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  try {
    assertSameOrigin(request)
    const session = await getSession(request, env)
    if (!session) return error('Sign in to reset progress.', 401)
    const progress = await replaceProgress(env, session.userId, EMPTY_PROGRESS)
    return json({ authenticated: true, progress })
  } catch (cause) {
    return handleError(cause)
  }
}
