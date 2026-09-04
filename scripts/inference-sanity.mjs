import fs from 'node:fs'
import * as ort from 'onnxruntime-web'

const modelPath = new URL('../public/models/best.onnx', import.meta.url)
const expectedInput = [1, 3, 640, 640]
const expectedOutput = [1, 17, 8400]

if (!fs.existsSync(modelPath)) {
  throw new Error('Missing public/models/best.onnx')
}

const session = await ort.InferenceSession.create(fs.readFileSync(modelPath), {
  executionProviders: ['wasm'],
  graphOptimizationLevel: 'all',
})

const inputShape = session.inputMetadata[0]?.shape
const outputShape = session.outputMetadata[0]?.shape
const matches = (actual, expected) =>
  Array.isArray(actual) && actual.length === expected.length &&
  actual.every((value, index) => value === expected[index])

if (!matches(inputShape, expectedInput)) {
  throw new Error(`Unexpected input shape: ${inputShape?.join(' x ')}`)
}
if (!matches(outputShape, expectedOutput)) {
  throw new Error(`Unexpected output shape: ${outputShape?.join(' x ')}`)
}

console.log(
  `ONNX sanity check passed: ${session.inputNames[0]} [${inputShape.join(', ')}] -> ${session.outputNames[0]} [${outputShape.join(', ')}]`,
)
