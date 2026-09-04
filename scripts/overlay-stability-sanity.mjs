import assert from 'node:assert/strict'
import { normalizeOverlaySize, resolveDenseMode } from '../src/detectionOverlayStability.ts'

const firstSize = normalizeOverlaySize(504.49, 559.44, 2)
const subpixelNoise = normalizeOverlaySize(504.4, 559.48, 2)
assert.deepEqual(
  subpixelNoise,
  firstSize,
  'Subpixel ResizeObserver noise must normalize to the same canvas dimensions',
)

const initial = resolveDenseMode(null, 'photo|505x560', true)
const feedbackAttempt = resolveDenseMode(initial, 'photo|505x560', false)
assert.strictEqual(
  feedbackAttempt,
  initial,
  'A legend-induced stage resize must not reverse the mode chosen for the stable container',
)

const resizedContainer = resolveDenseMode(feedbackAttempt, 'photo|720x560', false)
assert.deepEqual(
  resizedContainer,
  { key: 'photo|720x560', dense: false },
  'A genuine outer-container resize must allow the label mode to be recalculated',
)

console.log('Overlay stability sanity check passed: subpixel sizes coalesce and dense-mode feedback cannot oscillate.')
