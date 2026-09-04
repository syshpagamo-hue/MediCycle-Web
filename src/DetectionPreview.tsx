import { useCallback, useEffect, useRef, useState } from 'react'
import type { Detection } from './inference/yolo'
import { layoutDetectionLabels, type LayoutRect } from './detectionLabelLayout'
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
  const wrapperRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [denseMode, setDenseMode] = useState(false)

  const draw = useCallback(() => {
    const wrapper = wrapperRef.current
    const image = imageRef.current
    const canvas = canvasRef.current
    if (!wrapper || !image || !canvas || !image.naturalWidth || !image.naturalHeight) return

    const width = wrapper.clientWidth
    const height = wrapper.clientHeight
    const pixelRatio = window.devicePixelRatio || 1
    canvas.width = Math.round(width * pixelRatio)
    canvas.height = Math.round(height * pixelRatio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const context = canvas.getContext('2d')
    if (!context) return
    context.scale(pixelRatio, pixelRatio)
    context.clearRect(0, 0, width, height)

    const imageScale = Math.min(width / image.naturalWidth, height / image.naturalHeight)
    const renderedWidth = image.naturalWidth * imageScale
    const renderedHeight = image.naturalHeight * imageScale
    const offsetX = (width - renderedWidth) / 2
    const offsetY = (height - renderedHeight) / 2

    const boxes = detections.map((detection, index) => ({
      detection,
      index,
      rect: {
        x: offsetX + detection.x * imageScale,
        y: offsetY + detection.y * imageScale,
        width: detection.width * imageScale,
        height: detection.height * imageScale,
      },
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
    const shouldUseDenseMode = detections.length > 0 && layout === null
    setDenseMode((current) => current === shouldUseDenseMode ? current : shouldUseDenseMode)

    boxes.forEach(({ detection, rect }) => {
      const color = getMedicineColor(detection.label, detection.classId)
      context.strokeStyle = color
      context.lineWidth = Math.max(2, width / 320)
      context.strokeRect(rect.x, rect.y, rect.width, rect.height)
    })

    if (layout) {
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
  }, [detections])

  useEffect(() => {
    draw()
    const wrapper = wrapperRef.current
    if (!wrapper || !('ResizeObserver' in window)) return
    const observer = new ResizeObserver(draw)
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [draw, src])

  return (
    <div className="annotated-image">
      <div className="annotated-image-stage" ref={wrapperRef}>
        <img ref={imageRef} src={src} alt={alt} onLoad={draw} />
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
