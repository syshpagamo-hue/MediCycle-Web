import * as ort from 'onnxruntime-web/webgpu'

const MODEL_URL = '/models/best.onnx'
const LABELS_URL = '/models/classes.json'
const DEFAULT_INPUT_SIZE = 640

export type InferenceStage = 'loading-model' | 'preprocessing' | 'running'
export type InferenceBackend = 'webgpu' | 'wasm'

export type Detection = {
  classId: number
  label: string
  confidence: number
  x: number
  y: number
  width: number
  height: number
}

export type YoloInferenceResult = {
  detections: Detection[]
  backend: InferenceBackend
  inferenceMs: number
  imageWidth: number
  imageHeight: number
}

export type YoloInferenceOptions = {
  confidenceThreshold?: number
  iouThreshold?: number
  maxDetections?: number
  hasObjectness?: boolean
  labels?: string[]
  onStage?: (stage: InferenceStage) => void
}

type LoadedModel = {
  session: ort.InferenceSession
  backend: InferenceBackend
  labels: string[]
}

type LetterboxTransform = {
  imageWidth: number
  imageHeight: number
  inputWidth: number
  inputHeight: number
  scale: number
  padX: number
  padY: number
}

type Candidate = Detection & {
  x2: number
  y2: number
}

let modelPromise: Promise<LoadedModel> | null = null

export class ModelUnavailableError extends Error {
  constructor(message = `Model unavailable. Add ${MODEL_URL} and try again.`) {
    super(message)
    this.name = 'ModelUnavailableError'
  }
}

async function fetchModelBytes() {
  const response = await fetch(MODEL_URL)
  const contentType = response.headers.get('content-type') || ''
  if (!response.ok || contentType.includes('text/html')) {
    throw new ModelUnavailableError()
  }
  return response.arrayBuffer()
}

async function fetchLabels() {
  try {
    const response = await fetch(LABELS_URL)
    if (!response.ok) return []
    const value: unknown = await response.json()
    return Array.isArray(value) && value.every((item) => typeof item === 'string')
      ? value
      : []
  } catch {
    return []
  }
}

async function createSession(
  modelBytes: ArrayBuffer,
  backend: InferenceBackend,
) {
  return ort.InferenceSession.create(modelBytes.slice(0), {
    executionProviders: [backend],
    graphOptimizationLevel: 'all',
  })
}

async function loadModel(): Promise<LoadedModel> {
  if (modelPromise) return modelPromise

  const loadPromise: Promise<LoadedModel> = (async (): Promise<LoadedModel> => {
    ort.env.logLevel = 'warning'
    const [modelBytes, labels] = await Promise.all([fetchModelBytes(), fetchLabels()])

    if ('gpu' in navigator) {
      try {
        const session = await createSession(modelBytes, 'webgpu')
        return { session, backend: 'webgpu', labels }
      } catch (error) {
        console.warn('WebGPU initialization failed; falling back to WASM.', error)
      }
    }

    const session = await createSession(modelBytes, 'wasm')
    return { session, backend: 'wasm', labels }
  })().catch((error) => {
    modelPromise = null
    throw error
  })

  modelPromise = loadPromise
  return loadPromise
}

function getInputSize(session: ort.InferenceSession) {
  const metadata = session.inputMetadata[0]
  if (!metadata?.isTensor) {
    return { width: DEFAULT_INPUT_SIZE, height: DEFAULT_INPUT_SIZE }
  }

  const shape = metadata.shape
  const height = typeof shape[2] === 'number' && shape[2] > 0
    ? shape[2]
    : DEFAULT_INPUT_SIZE
  const width = typeof shape[3] === 'number' && shape[3] > 0
    ? shape[3]
    : DEFAULT_INPUT_SIZE
  return { width, height }
}

async function decodeImage(file: File) {
  if ('createImageBitmap' in window) return createImageBitmap(file)

  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function preprocessImage(
  file: File,
  inputWidth: number,
  inputHeight: number,
) {
  const image = await decodeImage(file)
  const imageWidth = image.width
  const imageHeight = image.height
  const scale = Math.min(inputWidth / imageWidth, inputHeight / imageHeight)
  const resizedWidth = Math.round(imageWidth * scale)
  const resizedHeight = Math.round(imageHeight * scale)
  const padX = (inputWidth - resizedWidth) / 2
  const padY = (inputHeight - resizedHeight) / 2

  const canvas = document.createElement('canvas')
  canvas.width = inputWidth
  canvas.height = inputHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas 2D is unavailable in this browser.')

  context.fillStyle = 'rgb(114, 114, 114)'
  context.fillRect(0, 0, inputWidth, inputHeight)
  context.drawImage(image, padX, padY, resizedWidth, resizedHeight)
  if (image instanceof ImageBitmap) image.close()

  const pixels = context.getImageData(0, 0, inputWidth, inputHeight).data
  const planeSize = inputWidth * inputHeight
  const tensorData = new Float32Array(planeSize * 3)
  for (let index = 0; index < planeSize; index += 1) {
    const source = index * 4
    tensorData[index] = pixels[source] / 255
    tensorData[planeSize + index] = pixels[source + 1] / 255
    tensorData[planeSize * 2 + index] = pixels[source + 2] / 255
  }

  return {
    tensor: new ort.Tensor('float32', tensorData, [1, 3, inputHeight, inputWidth]),
    transform: {
      imageWidth,
      imageHeight,
      inputWidth,
      inputHeight,
      scale,
      padX,
      padY,
    } satisfies LetterboxTransform,
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

function restoreBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  transform: LetterboxTransform,
) {
  const left = clamp((x1 - transform.padX) / transform.scale, 0, transform.imageWidth)
  const top = clamp((y1 - transform.padY) / transform.scale, 0, transform.imageHeight)
  const right = clamp((x2 - transform.padX) / transform.scale, 0, transform.imageWidth)
  const bottom = clamp((y2 - transform.padY) / transform.scale, 0, transform.imageHeight)
  return { left, top, right, bottom }
}

function labelFor(classId: number, labels: string[]) {
  return labels[classId] || `Class ${classId}`
}

function getValue(
  data: Float32Array,
  rows: number,
  columns: number,
  row: number,
  column: number,
  attributesFirst: boolean,
) {
  return attributesFirst
    ? data[column * rows + row]
    : data[row * columns + column]
}

function parseRawOutput(
  data: Float32Array,
  dimensions: readonly number[],
  transform: LetterboxTransform,
  labels: string[],
  confidenceThreshold: number,
  hasObjectness: boolean,
) {
  const first = dimensions[dimensions.length - 2]
  const second = dimensions[dimensions.length - 1]
  const attributesFirst = first < second
  const rows = attributesFirst ? second : first
  const columns = attributesFirst ? first : second
  const scoreStart = hasObjectness ? 5 : 4
  const classCount = columns - scoreStart
  if (rows <= 0 || classCount <= 0) {
    throw new Error(`Unsupported YOLO output shape: ${dimensions.join(' × ')}`)
  }

  const candidates: Candidate[] = []
  for (let row = 0; row < rows; row += 1) {
    let classId = 0
    let classScore = -Infinity
    for (let classIndex = 0; classIndex < classCount; classIndex += 1) {
      const score = getValue(data, rows, columns, row, scoreStart + classIndex, attributesFirst)
      if (score > classScore) {
        classScore = score
        classId = classIndex
      }
    }

    const objectness = hasObjectness
      ? getValue(data, rows, columns, row, 4, attributesFirst)
      : 1
    const confidence = objectness * classScore
    if (!Number.isFinite(confidence) || confidence < confidenceThreshold) continue

    let centerX = getValue(data, rows, columns, row, 0, attributesFirst)
    let centerY = getValue(data, rows, columns, row, 1, attributesFirst)
    let width = getValue(data, rows, columns, row, 2, attributesFirst)
    let height = getValue(data, rows, columns, row, 3, attributesFirst)
    if (Math.max(centerX, centerY, width, height) <= 2) {
      centerX *= transform.inputWidth
      centerY *= transform.inputHeight
      width *= transform.inputWidth
      height *= transform.inputHeight
    }

    const box = restoreBox(
      centerX - width / 2,
      centerY - height / 2,
      centerX + width / 2,
      centerY + height / 2,
      transform,
    )
    if (box.right <= box.left || box.bottom <= box.top) continue
    candidates.push({
      classId,
      label: labelFor(classId, labels),
      confidence,
      x: box.left,
      y: box.top,
      width: box.right - box.left,
      height: box.bottom - box.top,
      x2: box.right,
      y2: box.bottom,
    })
  }
  return candidates
}

function parseEndToEndOutput(
  data: Float32Array,
  dimensions: readonly number[],
  transform: LetterboxTransform,
  labels: string[],
  confidenceThreshold: number,
) {
  const first = dimensions[dimensions.length - 2]
  const second = dimensions[dimensions.length - 1]
  const attributesFirst = first === 6 && second !== 6
  const rows = attributesFirst ? second : first
  const columns = 6
  const candidates: Candidate[] = []

  for (let row = 0; row < rows; row += 1) {
    const read = (column: number) => getValue(data, rows, columns, row, column, attributesFirst)
    let x1 = read(0)
    let y1 = read(1)
    let x2 = read(2)
    let y2 = read(3)
    const confidence = read(4)
    const classId = Math.max(0, Math.round(read(5)))
    if (!Number.isFinite(confidence) || confidence < confidenceThreshold) continue
    if (Math.max(x1, y1, x2, y2) <= 2) {
      x1 *= transform.inputWidth
      x2 *= transform.inputWidth
      y1 *= transform.inputHeight
      y2 *= transform.inputHeight
    }
    const box = restoreBox(x1, y1, x2, y2, transform)
    if (box.right <= box.left || box.bottom <= box.top) continue
    candidates.push({
      classId,
      label: labelFor(classId, labels),
      confidence,
      x: box.left,
      y: box.top,
      width: box.right - box.left,
      height: box.bottom - box.top,
      x2: box.right,
      y2: box.bottom,
    })
  }
  return candidates
}

function intersectionOverUnion(first: Candidate, second: Candidate) {
  const left = Math.max(first.x, second.x)
  const top = Math.max(first.y, second.y)
  const right = Math.min(first.x2, second.x2)
  const bottom = Math.min(first.y2, second.y2)
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top)
  const firstArea = first.width * first.height
  const secondArea = second.width * second.height
  return intersection / Math.max(firstArea + secondArea - intersection, Number.EPSILON)
}

function nonMaximumSuppression(
  candidates: Candidate[],
  iouThreshold: number,
  maxDetections: number,
) {
  const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence)
  const selected: Candidate[] = []
  while (sorted.length > 0 && selected.length < maxDetections) {
    const current = sorted.shift()
    if (!current) break
    selected.push(current)
    for (let index = sorted.length - 1; index >= 0; index -= 1) {
      const candidate = sorted[index]
      if (
        candidate.classId === current.classId &&
        intersectionOverUnion(current, candidate) > iouThreshold
      ) {
        sorted.splice(index, 1)
      }
    }
  }
  return selected.map(({ x2: _x2, y2: _y2, ...detection }) => detection)
}

async function parseOutput(
  tensor: ort.Tensor,
  transform: LetterboxTransform,
  labels: string[],
  options: Required<Pick<YoloInferenceOptions, 'confidenceThreshold' | 'iouThreshold' | 'maxDetections' | 'hasObjectness'>>,
) {
  if (tensor.type !== 'float32') {
    throw new Error(`Unsupported YOLO output type: ${tensor.type}. Expected float32.`)
  }
  const dimensions = tensor.dims
  if (dimensions.length < 2) {
    throw new Error(`Unsupported YOLO output shape: ${dimensions.join(' × ')}`)
  }
  const data = await tensor.getData()
  if (!(data instanceof Float32Array)) {
    throw new Error('The YOLO output could not be read as float32 data.')
  }
  const finalDimension = dimensions[dimensions.length - 1]
  const penultimateDimension = dimensions[dimensions.length - 2]
  const isEndToEnd = finalDimension === 6 || penultimateDimension === 6
  const candidates = isEndToEnd
    ? parseEndToEndOutput(data, dimensions, transform, labels, options.confidenceThreshold)
    : parseRawOutput(
        data,
        dimensions,
        transform,
        labels,
        options.confidenceThreshold,
        options.hasObjectness,
      )
  return nonMaximumSuppression(candidates, options.iouThreshold, options.maxDetections)
}

export async function runYoloInference(
  file: File,
  options: YoloInferenceOptions = {},
): Promise<YoloInferenceResult> {
  options.onStage?.('loading-model')
  const loaded = await loadModel()
  const inputSize = getInputSize(loaded.session)

  options.onStage?.('preprocessing')
  const { tensor, transform } = await preprocessImage(file, inputSize.width, inputSize.height)
  const labels = options.labels || loaded.labels
  const startedAt = performance.now()
  options.onStage?.('running')

  try {
    const outputs = await loaded.session.run({ [loaded.session.inputNames[0]]: tensor })
    try {
      const output = outputs[loaded.session.outputNames[0]]
      if (!(output instanceof ort.Tensor)) {
        throw new Error('The first model output is not a tensor.')
      }
      const detections = await parseOutput(output, transform, labels, {
        confidenceThreshold: options.confidenceThreshold ?? 0.25,
        iouThreshold: options.iouThreshold ?? 0.45,
        maxDetections: options.maxDetections ?? 100,
        hasObjectness: options.hasObjectness ?? false,
      })
      return {
        detections,
        backend: loaded.backend,
        inferenceMs: performance.now() - startedAt,
        imageWidth: transform.imageWidth,
        imageHeight: transform.imageHeight,
      }
    } finally {
      Object.values(outputs).forEach((value) => {
        if (value instanceof ort.Tensor) value.dispose()
      })
    }
  } finally {
    tensor.dispose()
  }
}
