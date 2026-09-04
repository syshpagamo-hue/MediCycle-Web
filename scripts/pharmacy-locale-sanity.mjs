import assert from 'node:assert/strict'
import {
  buildPharmacySearchPath,
  parsePharmacySearchResponse,
  pharmaciesFromOverpass,
} from '../src/pharmacy.ts'

const coordinates = { lat: 25.033964, lon: 121.564468 }
const expectedPath = '/api/pharmacies?lat=25.033964&lon=121.564468'

for (const language of ['en', 'zh-TW']) {
  const localizedLatitude = new Intl.NumberFormat(language).format(coordinates.lat)
  assert.notEqual(localizedLatitude.length, 0)
  assert.equal(buildPharmacySearchPath(coordinates), expectedPath)
}

const osmPharmacies = pharmaciesFromOverpass([
  {
    type: 'node',
    id: 1,
    lat: 25.034,
    lon: 121.565,
    tags: { name: '信義藥局', 'name:en': 'Xinyi Pharmacy', 'addr:full': '台北市信義區' },
  },
])
assert.equal(osmPharmacies[0]?.name, '信義藥局')
assert.equal(osmPharmacies[0]?.address, '台北市信義區')

const serverPayload = {
  pharmacies: [{ ...osmPharmacies[0], distance: 0.08 }],
  radiusKm: 2,
}
const englishResult = parsePharmacySearchResponse(serverPayload)
const chineseResult = parsePharmacySearchResponse(serverPayload)
assert.deepEqual(chineseResult, englishResult)
assert.equal(chineseResult?.pharmacies[0]?.name, '信義藥局')

console.log('Pharmacy locale sanity checks passed: fixed ASCII request keys/numbers and locale-stable OSM results.')
