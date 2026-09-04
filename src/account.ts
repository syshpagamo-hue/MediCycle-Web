import { normalizeProgress, type MediCycleProgress } from '../shared/progress'

type AccountResponse = {
  authenticated: boolean
  progress?: unknown
  created?: boolean
  error?: string
}

async function readResponse(response: Response): Promise<AccountResponse> {
  const payload = (await response.json().catch(() => ({}))) as AccountResponse
  if (!response.ok) {
    throw new Error(payload.error || 'The account service is unavailable.')
  }
  return payload
}

export async function restoreAccount() {
  const response = await fetch('/api/progress', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  if (response.status === 401) return null
  const payload = await readResponse(response)
  return payload.progress ? normalizeProgress(payload.progress) : null
}

export async function authenticateAccount(
  mode: 'register' | 'login',
  phone: string,
  pin: string,
  localProgress: MediCycleProgress,
) {
  const response = await fetch(`/api/auth/${mode}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ phone, pin, localProgress }),
  })
  const payload = await readResponse(response)
  return {
    progress: normalizeProgress(payload.progress),
    created: payload.created === true,
  }
}

export async function syncAccountProgress(progress: MediCycleProgress) {
  const response = await fetch('/api/progress', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ progress }),
  })
  const payload = await readResponse(response)
  return normalizeProgress(payload.progress)
}
export async function logoutAccount() {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  await readResponse(response)
}

export async function resetAccountProgress() {
  const response = await fetch('/api/progress', {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  const payload = await readResponse(response)
  return normalizeProgress(payload.progress)
}
