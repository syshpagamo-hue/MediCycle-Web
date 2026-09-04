import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  createContainTransform,
  createLetterboxTransform,
  projectOriginalBox,
  restoreLetterboxBox,
} from '../src/bboxMapping.ts'

const cases = [
  { image: { width: 4032, height: 3024 }, box: { x: 731.25, y: 412.5, width: 988.75, height: 1201.25 } },
  { image: { width: 3024, height: 4032 }, box: { x: 251.5, y: 987.25, width: 1322.75, height: 841.5 } },
  { image: { width: 533, height: 762 }, box: { x: 103.2, y: 201.4, width: 188.8, height: 91.6 } },
]

const tolerance = 1
for (const { image, box } of cases) {
  const transform = createLetterboxTransform(image, { width: 640, height: 640 })
  const x1 = box.x * transform.scale + transform.padX
  const y1 = box.y * transform.scale + transform.padY
  const x2 = (box.x + box.width) * transform.scale + transform.padX
  const y2 = (box.y + box.height) * transform.scale + transform.padY
  const restored = restoreLetterboxBox(x1, y1, x2, y2, transform)

  for (const key of ['x', 'y', 'width', 'height']) {
    assert.ok(
      Math.abs(restored[key] - box[key]) < tolerance,
      `${image.width}x${image.height} ${key} round trip exceeded ${tolerance}px`,
    )
  }
}

const original = { x: 100, y: 200, width: 300, height: 150 }
const viewport = { width: 666, height: 436 }
const projection = createContainTransform({ width: 1332, height: 1000 }, viewport)
const displayed = projectOriginalBox(original, projection)
const expectedDisplayed = { x: 86.224, y: 87.2, width: 130.8, height: 65.4 }
for (const key of ['x', 'y', 'width', 'height']) {
  assert.ok(Math.abs(displayed[key] - expectedDisplayed[key]) < Number.EPSILON * 100)
}

const dpr = 2
assert.deepEqual(
  projectOriginalBox(original, projection),
  displayed,
  `DPR ${dpr} must affect only canvas backing pixels, never CSS bbox coordinates`,
)

const css = fs.readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')
assert.doesNotMatch(
  css,
  /\.result-image\s+img\s*{/,
  'Result sizing must not give the nested preview image a height different from its overlay stage',
)
assert.match(css, /\.annotated-image-stage img\s*{[^}]*position:\s*absolute/s)
assert.match(css, /\.annotated-image-stage img\s*{[^}]*height:\s*100%/s)

console.log('BBox mapping sanity passed: letterbox round trips are <1px and contain projection is applied once.')
