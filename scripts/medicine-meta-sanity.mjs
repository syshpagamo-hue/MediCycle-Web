import assert from 'node:assert/strict'
import { MEDICINE_META } from '../src/medicineMeta.ts'

const expectedLabels = [
  'canagliflozin', 'femara', 'henformin', 'januvia', 'kombiglyze',
  'methimazole', 'nolvadex', 'onglyza', 'oseni', 'panbiotic', 'qtern',
  'repaglinide', 'trajenta',
]

assert.deepEqual(MEDICINE_META.map(({ label }) => label), expectedLabels)
assert.deepEqual(MEDICINE_META.map(({ classId }) => classId), expectedLabels.map((_, index) => index))
assert.deepEqual(
  MEDICINE_META.filter(({ highlight }) => highlight).map(({ label, category }) => [label, category]),
  [
    ['femara', 'hormone-therapy'],
    ['methimazole', 'endocrine-related'],
    ['nolvadex', 'hormone-therapy'],
  ],
)
assert.equal(MEDICINE_META.find(({ label }) => label === 'henformin')?.category, 'other')
assert.equal(MEDICINE_META.find(({ label }) => label === 'panbiotic')?.category, 'other')

console.log('Medicine metadata sanity check passed: all 13 class indices and explicit highlights are stable.')
