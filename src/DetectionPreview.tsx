import { useCallback, useEffect, useRef } from 'react'
import type { Detection } from './inference/yolo'

const colors = ['#5eb7dd', '#ff8a3d', '#ffce54', '#745bd8', '#20a67a', '#e6537c']

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

    detections.forEach((detection) => {
      const color = colors[detection.classId % colors.length]
      const x = offsetX + detection.x * imageScale
      const y = offsetY + detection.y * imageScale
      const boxWidth = detection.width * imageScale
      const boxHeight = detection.height * imageScale
      const label = `${detection.label} ${(detection.confidence * 100).toFixed(1)}%`

      context.strokeStyle = color
      context.lineWidth = Math.max(2, width / 320)
      context.strokeRect(x, y, boxWidth, boxHeight)
      context.font = `600 ${Math.max(12, width / 38)}px Arial, sans-serif`
      const textWidth = context.measureText(label).width
      const labelHeight = Math.max(22, width / 22)
      const labelY = Math.max(0, y - labelHeight)
      context.fillStyle = color
      context.fillRect(x, labelY, textWidth + 14, labelHeight)
      context.fillStyle = '#050505'
      context.textBaseline = 'middle'
      context.fillText(label, x + 7, labelY + labelHeight / 2)
    })
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
    <div className="annotated-image" ref={wrapperRef}>
      <img ref={imageRef} src={src} alt={alt} onLoad={draw} />
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  )
}
