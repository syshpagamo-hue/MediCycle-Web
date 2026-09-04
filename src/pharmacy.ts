import type { Pharmacy } from './data'

export const SEARCH_RADII_METERS = [2_000, 5_000, 10_000] as const
export const PHARMACY_RESULT_LIMIT = 5

export type OverpassElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export type OverpassResponse = {
  elements: OverpassElement[]
}

export type PharmacySearchResponse = {
  pharmacies: Pharmacy[]
  radiusKm: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parsePharmacySearchResponse(
  value: unknown,
): PharmacySearchResponse | null {
  if (!isRecord(value) || !Array.isArray(value.pharmacies)) return null
  if (typeof value.radiusKm !== 'number' || !Number.isFinite(value.radiusKm)) return null
  const pharmacies = value.pharmacies.filter((item): item is Pharmacy => {
    if (!isRecord(item)) return false
    return (
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.lat === 'number' &&
      typeof item.lon === 'number' &&
      (item.address === undefined || typeof item.address === 'string') &&
      typeof item.distance === 'number' &&
      (item.takeBackStatus === 'osm-listed' || item.takeBackStatus === 'unverified')
    )
  })
  if (pharmacies.length !== value.pharmacies.length) return null
  return { pharmacies, radiusKm: value.radiusKm }
}

export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const earthRadius = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function sortByDistance(
  items: Omit<Pharmacy, 'distance'>[],
  lat: number,
  lon: number,
  limit = PHARMACY_RESULT_LIMIT,
) {
  return items
    .map((item) => ({ ...item, distance: haversine(lat, lon, item.lat, item.lon) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
}

export function buildOverpassQuery(lat: number, lon: number, radius: number) {
  return `[out:json][timeout:10];(node["amenity"="pharmacy"](around:${radius},${lat},${lon});way["amenity"="pharmacy"](around:${radius},${lat},${lon});relation["amenity"="pharmacy"](around:${radius},${lat},${lon}););out center tags;`
}

function addressFromTags(tags: Record<string, string>) {
  if (tags['addr:full:en']) return tags['addr:full:en']
  if (tags['addr:full']) return tags['addr:full']
  return (
    [
      tags['addr:housenumber'],
      tags['addr:street:en'] || tags['addr:street'],
      tags['addr:district:en'] || tags['addr:district'],
      tags['addr:city:en'] || tags['addr:city'],
      tags['addr:postcode'],
    ]
      .filter(Boolean)
      .join(', ') || undefined
  )
}

export function pharmaciesFromOverpass(elements: OverpassElement[]) {
  return elements
    .map((element): Omit<Pharmacy, 'distance'> | null => {
      const lat = element.lat ?? element.center?.lat
      const lon = element.lon ?? element.center?.lon
      if (lat === undefined || lon === undefined) return null
      const tags = element.tags ?? {}
      return {
        id: `${element.type}-${element.id}`,
        name: tags['name:en'] || tags.name || 'Unnamed pharmacy',
        lat,
        lon,
        address: addressFromTags(tags),
        phone: tags['contact:phone'] || tags.phone,
        openingHours: tags.opening_hours,
        takeBackStatus:
          tags['recycling:drugs'] === 'yes' ? 'osm-listed' : 'unverified',
      }
    })
    .filter((item): item is Omit<Pharmacy, 'distance'> => item !== null)
}
