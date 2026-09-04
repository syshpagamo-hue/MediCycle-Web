import assert from 'node:assert/strict'
import { layoutDetectionLabels, rectsOverlap } from '../src/detectionLabelLayout.ts'

const bounds = { x: 0, y: 0, width: 390, height: 300 }
const closeBoxes = Array.from({ length: 5 }, (_, id) => ({
  id,
  priority: 1 - id / 10,
  anchor: { x: 135 + id * 15, y: 120 + id * 5, width: 58, height: 64 },
  width: 92,
  height: 20,
}))
const placements = layoutDetectionLabels(closeBoxes, bounds)

assert.ok(placements, 'Expected nearby boxes to receive collision-free labels')
for (const placement of placements) {
  assert.ok(placement.rect.x >= bounds.x && placement.rect.y >= bounds.y)
  assert.ok(placement.rect.x + placement.rect.width <= bounds.width)
  assert.ok(placement.rect.y + placement.rect.height <= bounds.height)
  for (const other of placements) {
    if (placement.id !== other.id) assert.equal(rectsOverlap(placement.rect, other.rect, 4), false)
  }
}

const impossible = layoutDetectionLabels([
  { id: 0, priority: 1, anchor: { x: 0, y: 0, width: 48, height: 48 }, width: 90, height: 20 },
], { x: 0, y: 0, width: 48, height: 48 })
assert.equal(impossible, null, 'Expected dense fallback when no valid label position exists')

console.log('Label layout sanity check passed: nearby labels avoid collisions and dense scenes fall back safely.')
