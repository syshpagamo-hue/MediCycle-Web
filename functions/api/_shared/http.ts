const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  })
}

export function error(message: string, status = 400) {
  return json({ error: message }, status)
}

export async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') || ''
  const contentLength = Number(request.headers.get('content-length') || '0')
  if (!contentType.includes('application/json')) {
    throw new ResponseError('Expected a JSON request.', 415)
  }
  if (contentLength > 16_384) {
    throw new ResponseError('Request body is too large.', 413)
  }
  try {
    return await request.json()
  } catch {
    throw new ResponseError('Invalid JSON request.', 400)
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) {
    throw new ResponseError('Cross-origin request rejected.', 403)
  }
}

export class ResponseError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function handleError(cause: unknown) {
  if (cause instanceof ResponseError) return error(cause.message, cause.status)
  console.error(
    JSON.stringify({
      message: 'Pages Function request failed',
      error: cause instanceof Error ? cause.message : 'Unknown error',
    }),
  )
  return error('The service is temporarily unavailable.', 500)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
