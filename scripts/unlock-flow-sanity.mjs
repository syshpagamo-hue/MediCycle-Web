import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const translations = await readFile(new URL('../src/i18n.tsx', import.meta.url), 'utf8')

const unlockFunction = appSource.slice(
  appSource.indexOf('const markAsRecycled'),
  appSource.indexOf('const closeUnlockedCard'),
)
const resultFlow = appSource.slice(
  appSource.indexOf('<section className="disposal-plan">'),
  appSource.indexOf('{recycledForResult && ('),
)

assert.match(unlockFunction, /if \(recycledForResult\) return/)
assert.doesNotMatch(unlockFunction, /returnPlanConfirmed|locatorState|selectedPharmacyId/)
assert.match(unlockFunction, /marineCollection: unlocked/)
assert.match(unlockFunction, /recycledDemoCount:/)
assert.match(resultFlow, /onClick=\{markAsRecycled\}/)
assert.ok(
  resultFlow.indexOf('result-action-panel') < resultFlow.indexOf('{pharmacySection}'),
  'The direct unlock action should appear before the optional pharmacy finder.',
)
assert.match(translations, /Find a nearby pharmacy — optional\./)
assert.match(translations, /尋找附近藥局（選用）/)
assert.match(translations, /no location or pharmacy search required/)
assert.match(translations, /不需要定位或搜尋藥局/)

console.log('Unlock flow sanity checks passed: education unlock is direct, pharmacy-independent, persistent, and bilingual.')
