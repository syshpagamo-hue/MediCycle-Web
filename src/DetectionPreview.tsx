import { useCallback, useEffect, useRef, useState } from 'react'
import type { Detection } from './inference/yolo'
import { createContainTransform, projectOriginalBox } from './bboxMapping'
import { layoutDetectionLabels, type LayoutRect } from './detectionLabelLayout'
import {
  normalizeOverlaySize,
  resolveDenseMode,
  type DenseModeDecision,
} from './detectionOverlayStability'
import { getMedicineColor, getMedicineDisplayName, getMedicineTextColor } from './medicineMeta'

export function DetectionPreview({
  src,
  alt,
  detections,
}: {
  src: string
  alt: string
  detections: Detection[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const denseModeDecisionRef = useRef<DenseModeDecision | null>(null)
  const lastFrameKeyRef = useRef<string | null>(null)
  const pendingFrameRef = useRef<number | null>(null)
  const [denseMode, setDenseMode] = useState(false)

  const draw = useCallback(() => {
    const container = containerRef.current
    const wrapper = wrapperRef.current
    const image = imageRef.current
    const canvas = canvasRef.current
    if (!container || !wrapper || !image || !canvas || !image.naturalWidth || !image.naturalHeight) return

    const pixelRatio = window.devicePixelRatio || 1
    const size = normalizeOverlaySize(wrapper.clientWidth, wrapper.clientHeight, pixelRatio)
    const containerSize = normalizeOverlaySize(container.clientWidth, container.clientHeight, 1)
    const { cssWidth: width, cssHeight: height } = size
    if (!width || !height) return

    const context = canvas.getContext('2d')
    if (!context) return

    // Detection coordinates are always in the auto-oriented original image.
    // Project them to the CSS viewport exactly once, matching object-fit: contain.
    const projection = createContainTransform(
      { width: image.naturalWidth, height: image.naturalHeight },
      { width, height },
    )
    const { offsetX, offsetY, renderedWidth, renderedHeight } = projection

    const boxes = detections.map((detection, index) => ({
      detection,
      index,
      rect: projectOriginalBox(detection, projection),
    }))
    const fontSize = Math.max(12, Math.min(16, width / 38))
    const labelHeight = fontSize + 8
    const horizontalPadding = 5
    context.font = `600 ${fontSize}px Arial, sans-serif`

    const layout = layoutDetectionLabels(
      boxes.map(({ detection, index, rect }) => ({
        id: index,
        priority: detection.confidence,
        anchor: rect,
        width: context.measureText(`${getMedicineDisplayName(detection.label, detection.classId)} ${(detection.confidence * 100).toFixed(1)}%`).width + horizontalPadding * 2,
        height: labelHeight,
      })),
      { x: offsetX, y: offsetY, width: renderedWidth, height: renderedHeight },
    )
    const detectionKey = detections.map((detection) => [
      detection.classId,
      detection.label,
      detection.confidence,
      detection.x,
      detection.y,
      detection.width,
      detection.height,
    ].join(':')).join('|')
    const modeKey = `${src}|${detectionKey}|${containerSize.cssWidth}x${containerSize.cssHeight}`
    const decision = resolveDenseMode(
      denseModeDecisionRef.current,
      modeKey,
      detections.length > 0 && layout === null,
    )
    denseModeDecisionRef.current = decision
    setDenseMode((current) => current === decision.dense ? current : decision.dense)

    const frameKey = [
      modeKey,
      `${width}x${height}`,
      `${size.bitmapWidth}x${size.bitmapHeight}`,
      `${image.naturalWidth}x${image.naturalHeight}`,
      decision.dense ? 'dense' : 'labels',
    ].join('|')
    if (lastFrameKeyRef.current === frameKey) return
    lastFrameKeyRef.current = frameKey

    if (canvas.width !== size.bitmapWidth) canvas.width = size.bitmapWidth
    if (canvas.height !== size.bitmapHeight) canvas.height = size.bitmapHeight
    if (canvas.style.width !== `${width}px`) canvas.style.width = `${width}px`
    if (canvas.style.height !== `${height}px`) canvas.style.height = `${height}px`
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    context.clearRect(0, 0, width, height)
    context.font = `600 ${fontSize}px Arial, sans-serif`

    boxes.forEach(({ detection, rect }) => {
      const color = getMedicineColor(detection.label, detection.classId)
      context.strokeStyle = color
      context.lineWidth = Math.max(2, width / 320)
      context.strokeRect(rect.x, rect.y, rect.width, rect.height)
    })

    if (!decision.dense && layout) {
      layout.forEach(({ id, rect, connector }) => {
        const detection = detections[id]
        const color = getMedicineColor(detection.label, detection.classId)
        const label = `${getMedicineDisplayName(detection.label, detection.classId)} ${(detection.confidence * 100).toFixed(1)}%`

        context.beginPath()
        context.moveTo(connector.fromX, connector.fromY)
        context.lineTo(connector.toX, connector.toY)
        context.strokeStyle = color
        context.lineWidth = Math.max(1.5, width / 480)
        context.stroke()
        context.fillStyle = color
        context.fillRect(rect.x, rect.y, rect.width, rect.height)
        context.fillStyle = getMedicineTextColor(detection.label, detection.classId)
        context.textBaseline = 'middle'
        context.fillText(label, rect.x + horizontalPadding, rect.y + rect.height / 2)
      })
    } else {
      boxes.forEach(({ detection, index, rect }) => {
        const color = getMedicineColor(detection.label, detection.classId)
        const badgeSize = Math.max(18, Math.min(24, width / 20))
        const badge: LayoutRect = {
          x: Math.min(Math.max(rect.x, offsetX), offsetX + renderedWidth - badgeSize),
          y: Math.min(Math.max(rect.y, offsetY), offsetY + renderedHeight - badgeSize),
          width: badgeSize,
          height: badgeSize,
        }
        context.fillStyle = color
        context.fillRect(badge.x, badge.y, badge.width, badge.height)
        context.fillStyle = getMedicineTextColor(detection.label, detection.classId)
        context.font = `700 ${Math.max(11, badgeSize * 0.55)}px Arial, sans-serif`
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(String(index + 1), badge.x + badge.width / 2, badge.y + badge.height / 2)
      })
      context.textAlign = 'start'
    }
  }, [detections, src])

  const scheduleDraw = useCallback(() => {
    if (pendingFrameRef.current !== null) return
    pendingFrameRef.current = window.requestAnimationFrame(() => {
      pendingFrameRef.current = null
      draw()
    })
  }, [draw])

  useEffect(() => {
    draw()
    const container = containerRef.current
    const wrapper = wrapperRef.current
    if (!container || !wrapper || !('ResizeObserver' in window)) return
    const observer = new ResizeObserver(scheduleDraw)
    observer.observe(container)
    observer.observe(wrapper)
    return () => {
      observer.disconnect()
      if (pendingFrameRef.current !== null) {
        window.cancelAnimationFrame(pendingFrameRef.current)
        pendingFrameRef.current = null
      }
    }
  }, [draw, scheduleDraw])

  return (
    <div className="annotated-image" ref={containerRef}>
      <div className="annotated-image-stage" ref={wrapperRef}>
        <img ref={imageRef} src={src} alt={alt} onLoad={scheduleDraw} />
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>
      {denseMode && (
        <ol className="detection-legend" aria-label="Detection labels">
          {detections.map((detection, index) => (
            <li key={`${detection.classId}-${index}`}>
              <span style={{ backgroundColor: getMedicineColor(detection.label, detection.classId), color: getMedicineTextColor(detection.label, detection.classId) }}>{index + 1}</span>
              <b>{getMedicineDisplayName(detection.label, detection.classId)}</b>
              <small>{(detection.confidence * 100).toFixed(1)}%</small>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
