export type LayoutRect = {
  x: number
  y: number
  width: number
  height: number
}

export type LabelLayoutItem = {
  id: number
  priority: number
  anchor: LayoutRect
  width: number
  height: number
}

export type LabelPlacement = {
  id: number
  rect: LayoutRect
  connector: { fromX: number; fromY: number; toX: number; toY: number }
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum)

const overlaps = (a: LayoutRect, b: LayoutRect, gap = 0) =>
  a.x < b.x + b.width + gap &&
  a.x + a.width + gap > b.x &&
  a.y < b.y + b.height + gap &&
  a.y + a.height + gap > b.y

const isInside = (rect: LayoutRect, bounds: LayoutRect) =>
  rect.x >= bounds.x &&
  rect.y >= bounds.y &&
  rect.x + rect.width <= bounds.x + bounds.width &&
  rect.y + rect.height <= bounds.y + bounds.height

function connectorBetween(anchor: LayoutRect, label: LayoutRect) {
  const anchorCenterX = anchor.x + anchor.width / 2
  const anchorCenterY = anchor.y + anchor.height / 2
  const labelCenterX = label.x + label.width / 2
  const labelCenterY = label.y + label.height / 2

  return {
    fromX: clamp(labelCenterX, anchor.x, anchor.x + anchor.width),
    fromY: clamp(labelCenterY, anchor.y, anchor.y + anchor.height),
    toX: clamp(anchorCenterX, label.x, label.x + label.width),
    toY: clamp(anchorCenterY, label.y, label.y + label.height),
  }
}

function candidatesFor(item: LabelLayoutItem, gap: number) {
  const { anchor, width, height } = item
  const centeredX = anchor.x + (anchor.width - width) / 2
  const centeredY = anchor.y + (anchor.height - height) / 2
  const candidates: LayoutRect[] = [
    { x: centeredX, y: anchor.y - height - gap, width, height },
    { x: centeredX, y: anchor.y + anchor.height + gap, width, height },
    { x: anchor.x - width - gap, y: centeredY, width, height },
    { x: anchor.x + anchor.width + gap, y: centeredY, width, height },
  ]

  // Keep searching vertically beside the box so nearby objects can form a
  // readable label stack without losing their visual connection to each box.
  for (let step = 1; step <= 8; step += 1) {
    const shift = step * (height + gap)
    for (const direction of [-1, 1]) {
      const y = centeredY + shift * direction
      candidates.push(
        { x: anchor.x - width - gap, y, width, height },
        { x: anchor.x + anchor.width + gap, y, width, height },
      )
    }
  }

  return candidates
}

export function layoutDetectionLabels(
  items: LabelLayoutItem[],
  bounds: LayoutRect,
  gap = 4,
): LabelPlacement[] | null {
  const placements: LabelPlacement[] = []
  const anchors = items.map((item) => item.anchor)
  const sortedItems = [...items].sort((a, b) => b.priority - a.priority || a.id - b.id)

  for (const item of sortedItems) {
    const rect = candidatesFor(item, gap).find((candidate) =>
      isInside(candidate, bounds) &&
      !anchors.some((anchor) => overlaps(candidate, anchor, 1)) &&
      !placements.some((placement) => overlaps(candidate, placement.rect, gap)),
    )

    if (!rect) return null
    placements.push({ id: item.id, rect, connector: connectorBetween(item.anchor, rect) })
  }

  return placements
}

export function rectsOverlap(a: LayoutRect, b: LayoutRect, gap = 0) {
  return overlaps(a, b, gap)
}
