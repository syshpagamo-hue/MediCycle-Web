export type OverlaySize = {
  cssWidth: number
  cssHeight: number
  bitmapWidth: number
  bitmapHeight: number
}

export type DenseModeDecision = {
  key: string
  dense: boolean
}

export function normalizeOverlaySize(
  width: number,
  height: number,
  devicePixelRatio: number,
): OverlaySize {
  const cssWidth = Math.max(0, Math.round(width))
  const cssHeight = Math.max(0, Math.round(height))
  const pixelRatio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
    ? devicePixelRatio
    : 1

  return {
    cssWidth,
    cssHeight,
    bitmapWidth: Math.round(cssWidth * pixelRatio),
    bitmapHeight: Math.round(cssHeight * pixelRatio),
  }
}

export function resolveDenseMode(
  previous: DenseModeDecision | null,
  key: string,
  candidate: boolean,
): DenseModeDecision {
  // Showing the dense legend changes the flex child's height. Keep the mode
  // chosen for the stable outer container so that change cannot feed back into
  // the next label-layout result and make the two modes oscillate.
  if (previous?.key === key) return previous
  return { key, dense: candidate }
}

