export type ImageSize = {
  width: number
  height: number
}

export type Box = {
  x: number
  y: number
  width: number
  height: number
}

export type LetterboxTransform = {
  imageWidth: number
  imageHeight: number
  inputWidth: number
  inputHeight: number
  scale: number
  padX: number
  padY: number
}

export type ContainTransform = {
  scale: number
  offsetX: number
  offsetY: number
  renderedWidth: number
  renderedHeight: number
}

export function createLetterboxTransform(
  image: ImageSize,
  input: ImageSize,
): LetterboxTransform {
  const scale = Math.min(input.width / image.width, input.height / image.height)
  const renderedWidth = image.width * scale
  const renderedHeight = image.height * scale

  return {
    imageWidth: image.width,
    imageHeight: image.height,
    inputWidth: input.width,
    inputHeight: input.height,
    scale,
    padX: (input.width - renderedWidth) / 2,
    padY: (input.height - renderedHeight) / 2,
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

export function restoreLetterboxBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  transform: LetterboxTransform,
): Box {
  const left = clamp((x1 - transform.padX) / transform.scale, 0, transform.imageWidth)
  const top = clamp((y1 - transform.padY) / transform.scale, 0, transform.imageHeight)
  const right = clamp((x2 - transform.padX) / transform.scale, 0, transform.imageWidth)
  const bottom = clamp((y2 - transform.padY) / transform.scale, 0, transform.imageHeight)

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

export function createContainTransform(
  image: ImageSize,
  viewport: ImageSize,
): ContainTransform {
  const scale = Math.min(viewport.width / image.width, viewport.height / image.height)
  const renderedWidth = image.width * scale
  const renderedHeight = image.height * scale

  return {
    scale,
    offsetX: (viewport.width - renderedWidth) / 2,
    offsetY: (viewport.height - renderedHeight) / 2,
    renderedWidth,
    renderedHeight,
  }
}

export function projectOriginalBox(box: Box, transform: ContainTransform): Box {
  return {
    x: transform.offsetX + box.x * transform.scale,
    y: transform.offsetY + box.y * transform.scale,
    width: box.width * transform.scale,
    height: box.height * transform.scale,
  }
}
