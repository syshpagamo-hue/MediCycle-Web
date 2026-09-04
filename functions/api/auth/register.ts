import { normalizeProgress } from '../../../shared/progress'
import {
  createSalt,
  derivePinHash,
  hashPhone,
  isValidPin,
  normalizePhone,
} from '../_shared/crypto'
import {
  assertSameOrigin,
  error,
  handleError,
  isRecord,
  json,
  readJson,
} from '../_shared/http'
import { replaceProgress } from '../_shared/progress'
import { createSession } from '../_shared/session'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    assertSameOrigin(request)
    const body = await readJson(request)
    if (!isRecord(body)) return error('Invalid account details.')
    const phone = normalizePhone(body.phone)
    if (!phone) {
      return error('Enter a phone number with 8–15 digits, including country code.')
    }
    if (!isValidPin(body.pin)) return error('PIN must contain exactly 6 digits.')

    const phoneHash = await hashPhone(phone, env.PHONE_HASH_PEPPER)
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE phone_hash = ?1',
    )
      .bind(phoneHash)
      .first<{ id: string }>()
    if (existing) {
      return error('An account already exists for this phone number. Sign in instead.', 409)
    }

    const userId = crypto.randomUUID()
    const salt = createSalt()
    const pinHash = await derivePinHash(body.pin, salt)
    const createdAt = new Date().toISOString()
    await env.DB.prepare(
      `INSERT INTO users
       (id, phone_hash, pin_hash, pin_salt, failed_attempts, locked_until, created_at)
       VALUES (?1, ?2, ?3, ?4, 0, NULL, ?5)`,
    )
      .bind(userId, phoneHash, pinHash, salt, createdAt)
      .run()
    const progress = await replaceProgress(
      env,
      userId,
      normalizeProgress(body.localProgress),
    )
    const cookie = await createSession(env, userId, request)
    return json(
      { authenticated: true, created: true, progress },
      201,
      { 'Set-Cookie': cookie },
    )
  } catch (cause) {
    if (cause instanceof Error && cause.message.includes('UNIQUE constraint failed')) {
      return error('An account already exists for this phone number. Sign in instead.', 409)
    }
    return handleError(cause)
  }
}
