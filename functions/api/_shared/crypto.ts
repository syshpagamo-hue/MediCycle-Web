const encoder = new TextEncoder()
const PIN_ITERATIONS = 100_000

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function sha256(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}

export function normalizePhone(value: unknown) {
  if (typeof value !== 'string') return null
  const digits = value.normalize('NFKC').replace(/\D/g, '')
  return /^\d{8,15}$/.test(digits) ? digits : null
}

export function isValidPin(value: unknown): value is string {
  return typeof value === 'string' && /^\d{6}$/.test(value)
}

export async function hashPhone(phone: string, pepper: string) {
  if (!pepper || pepper.length < 24) {
    throw new Error('PHONE_HASH_PEPPER is not configured')
  }
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(phone))
  return bytesToBase64Url(new Uint8Array(signature))
}

export function createSalt() {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  return bytesToBase64Url(salt)
}

export async function derivePinHash(pin: string, salt: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: base64UrlToBytes(salt),
      iterations: PIN_ITERATIONS,
    },
    key,
    256,
  )
  return bytesToBase64Url(new Uint8Array(derived))
}

export function safeEqual(first: string, second: string) {
  const firstBytes = base64UrlToBytes(first)
  const secondBytes = base64UrlToBytes(second)
  if (firstBytes.length !== secondBytes.length) return false
  let difference = 0
  for (let index = 0; index < firstBytes.length; index += 1) {
    difference |= firstBytes[index] ^ secondBytes[index]
  }
  return difference === 0
}

export function createSessionToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return bytesToBase64Url(bytes)
}

export async function hashSessionToken(token: string) {
  return bytesToBase64Url(await sha256(token))
}
