import {
  buildOverpassQuery,
  pharmaciesFromOverpass,
  PHARMACY_RESULT_LIMIT,
  SEARCH_RADII_METERS,
  sortByDistance,
  type OverpassResponse,
} from '../../src/pharmacy'
import type { Pharmacy } from '../../src/data'
import { error, handleError, isRecord, json, ResponseError } from './_shared/http'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
] as const
const ENDPOINT_TIMEOUT_MS = 12_000

function coordinate(value: string | null, minimum: number, maximum: number) {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null
}

function isOverpassResponse(value: unknown): value is OverpassResponse {
  return isRecord(value) && Array.isArray(value.elements)
}

async function queryOverpass(query: string) {
  const failures: string[] = []
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), ENDPOINT_TIMEOUT_MS)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'MediCycle/1.0 (pharmacy locator prototype)',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })
      if (!response.ok) {
        failures.push(`${new URL(endpoint).hostname}:${response.status}`)
        continue
      }
      const payload: unknown = await response.json()
      if (!isOverpassResponse(payload)) {
        failures.push(`${new URL(endpoint).hostname}:invalid-json`)
        continue
      }
      return payload
    } catch (cause) {
      failures.push(
        `${new URL(endpoint).hostname}:${cause instanceof Error ? cause.name : 'error'}`,
      )
    } finally {
      clearTimeout(timeoutId)
    }
  }
  console.error(JSON.stringify({ message: 'All Overpass endpoints failed', failures }))
  throw new ResponseError('All pharmacy search providers are unavailable.', 502)
}

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  try {
    const url = new URL(request.url)
    const lat = coordinate(url.searchParams.get('lat'), -90, 90)
    const lon = coordinate(url.searchParams.get('lon'), -180, 180)
    if (lat === null || lon === null) {
      return error('Valid lat and lon query parameters are required.')
    }

    let pharmacies: Pharmacy[] = []
    let radiusUsed = SEARCH_RADII_METERS[SEARCH_RADII_METERS.length - 1]
    for (const radius of SEARCH_RADII_METERS) {
      let payload: OverpassResponse
      try {
        payload = await queryOverpass(buildOverpassQuery(lat, lon, radius))
      } catch (cause) {
        if (pharmacies.length > 0) break
        throw cause
      }
      pharmacies = sortByDistance(
        pharmaciesFromOverpass(payload.elements),
        lat,
        lon,
      )
      radiusUsed = radius
      if (pharmacies.length >= PHARMACY_RESULT_LIMIT) break
    }

    return json({
      center: { lat, lon },
      pharmacies,
      radiusKm: radiusUsed / 1_000,
    })
  } catch (cause) {
    return handleError(cause)
  }
}
