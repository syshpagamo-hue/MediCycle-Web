import { createSessionToken, hashSessionToken } from './crypto'

const COOKIE_NAME = 'medicycle_session'
const SESSION_SECONDS = 60 * 60 * 24 * 30

type SessionRow = {
  user_id: string
}

function readCookie(request: Request, name: string) {
  const cookies = request.headers.get('cookie') || ''
  for (const part of cookies.split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) return value.join('=')
  }
  return null
}

export async function getSession(
  request: Request,
  env: Env,
): Promise<{ tokenHash: string; userId: string } | null> {
  const token = readCookie(request, COOKIE_NAME)
  if (!token || token.length > 128) return null
  const tokenHash = await hashSessionToken(token)
  const row = await env.DB.prepare(
    'SELECT user_id FROM sessions WHERE token_hash = ?1 AND expires_at > ?2',
  )
    .bind(tokenHash, new Date().toISOString())
    .first<SessionRow>()
  return row ? { tokenHash, userId: row.user_id } : null
}

export async function createSession(env: Env, userId: string, request: Request) {
  const token = createSessionToken()
  const tokenHash = await hashSessionToken(token)
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + SESSION_SECONDS * 1000)
  await env.DB.prepare(
    'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?1, ?2, ?3, ?4)',
  )
    .bind(tokenHash, userId, expiresAt.toISOString(), createdAt.toISOString())
    .run()
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}`
}

export function clearSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
}

export async function deleteSession(request: Request, env: Env) {
  const session = await getSession(request, env)
  if (session) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1')
      .bind(session.tokenHash)
      .run()
  }
}
