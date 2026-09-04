import {
  derivePinHash,
  hashPhone,
  isValidPin,
  normalizePhone,
  safeEqual,
} from '../_shared/crypto'
import {
  assertSameOrigin,
  error,
  handleError,
  isRecord,
  json,
  readJson,
} from '../_shared/http'
import { mergeAndSaveProgress } from '../_shared/progress'
import { createSession } from '../_shared/session'

type UserRow = {
  id: string
  pin_hash: string
  pin_salt: string
  failed_attempts: number
  locked_until: string | null
}

const DUMMY_SALT = 'AAAAAAAAAAAAAAAAAAAAAA'
const MAX_FAILED_ATTEMPTS = 5
const LOCK_MINUTES = 15

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    assertSameOrigin(request)
    const body = await readJson(request)
    if (!isRecord(body)) return error('Invalid account details.')
    const phone = normalizePhone(body.phone)
    if (!phone || !isValidPin(body.pin)) {
      return error('Phone number or PIN is incorrect.', 401)
    }

    const phoneHash = await hashPhone(phone, env.PHONE_HASH_PEPPER)
    const user = await env.DB.prepare(
      `SELECT id, pin_hash, pin_salt, failed_attempts, locked_until
       FROM users WHERE phone_hash = ?1`,
    )
      .bind(phoneHash)
      .first<UserRow>()

    if (user?.locked_until && Date.parse(user.locked_until) > Date.now()) {
      return error('Too many attempts. Try again in 15 minutes.', 429)
    }

    const candidateHash = await derivePinHash(body.pin, user?.pin_salt || DUMMY_SALT)
    if (!user || !safeEqual(candidateHash, user.pin_hash)) {
      if (user) {
        const nextAttempts = user.failed_attempts + 1
        const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS
        const lockedUntil = shouldLock
          ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
          : null
        await env.DB.prepare(
          'UPDATE users SET failed_attempts = ?1, locked_until = ?2 WHERE id = ?3',
        )
          .bind(shouldLock ? 0 : nextAttempts, lockedUntil, user.id)
          .run()
      }
      return error('Phone number or PIN is incorrect.', 401)
    }

    await env.DB.prepare(
      'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?1',
    )
      .bind(user.id)
      .run()
    const progress = await mergeAndSaveProgress(env, user.id, body.localProgress)
    const cookie = await createSession(env, user.id, request)
    return json(
      { authenticated: true, created: false, progress },
      200,
      { 'Set-Cookie': cookie },
    )
  } catch (cause) {
    return handleError(cause)
  }
}
