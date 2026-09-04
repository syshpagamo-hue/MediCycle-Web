import { assertSameOrigin, handleError, json } from '../_shared/http'
import { clearSessionCookie, deleteSession } from '../_shared/session'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    assertSameOrigin(request)
    await deleteSession(request, env)
    return json(
      { authenticated: false },
      200,
      { 'Set-Cookie': clearSessionCookie(request) },
    )
  } catch (cause) {
    return handleError(cause)
  }
}
