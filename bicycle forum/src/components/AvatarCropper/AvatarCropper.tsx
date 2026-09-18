import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import './AvatarCropper.css'

const VIEWPORT_SIZE = 260
const OUTPUT_SIZE = 320
const MIN_ZOOM = 1
const MAX_ZOOM = 3

export interface AvatarCropperHandle {
  // Renders the current crop to a fixed-size square JPEG blob, or null if
  // the image hasn't finished loading yet.
  getCroppedBlob: () => Promise<Blob | null>
}

export interface AvatarCropperProps {
  file: File
}

// Avatars are shown circularly (see #profile-avatar), so the crop viewport
// is a circle too - what you see while dragging/zooming here is what the
// final avatar looks like, not just a square preview of it.
const AvatarCropper = forwardRef<AvatarCropperHandle, AvatarCropperProps>(({ file }, ref) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null)
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragState = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setZoom(MIN_ZOOM)
    setNaturalSize(null)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const baseScale = naturalSize ? Math.max(VIEWPORT_SIZE / naturalSize.width, VIEWPORT_SIZE / naturalSize.height) : 1
  const scale = baseScale * zoom
  const displayWidth = naturalSize ? naturalSize.width * scale : 0
  const displayHeight = naturalSize ? naturalSize.height * scale : 0

  const clampOffset = (x: number, y: number, width: number, height: number) => {
    const minX = Math.min(0, VIEWPORT_SIZE - width)
    const minY = Math.min(0, VIEWPORT_SIZE - height)
    return { x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) }
  }

  const handleImageLoad = () => {
    const img = imgRef.current
    if (!img) return
    const width = img.naturalWidth
    const height = img.naturalHeight
    setNaturalSize({ width, height })
    const initialScale = Math.max(VIEWPORT_SIZE / width, VIEWPORT_SIZE / height)
    setOffset({
      x: (VIEWPORT_SIZE - width * initialScale) / 2,
      y: (VIEWPORT_SIZE - height * initialScale) / 2,
    })
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragState.current = { startX: event.clientX, startY: event.clientY, startOffsetX: offset.x, startOffsetY: offset.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return
    const dx = event.clientX - dragState.current.startX
    const dy = event.clientY - dragState.current.startY
    setOffset(clampOffset(dragState.current.startOffsetX + dx, dragState.current.startOffsetY + dy, displayWidth, displayHeight))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragState.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  // Re-centers on the same focal point the viewport was already showing,
  // so dragging to an edge and then zooming in doesn't fling the image
  // back to its center.
  const handleZoomChange = (nextZoom: number) => {
    if (!naturalSize) {
      setZoom(nextZoom)
      return
    }
    const oldScale = scale
    const newScale = baseScale * nextZoom
    const focalX = (VIEWPORT_SIZE / 2 - offset.x) / oldScale
    const focalY = (VIEWPORT_SIZE / 2 - offset.y) / oldScale
    const newWidth = naturalSize.width * newScale
    const newHeight = naturalSize.height * newScale
    setZoom(nextZoom)
    setOffset(
      clampOffset(VIEWPORT_SIZE / 2 - focalX * newScale, VIEWPORT_SIZE / 2 - focalY * newScale, newWidth, newHeight),
    )
  }

  useImperativeHandle(
    ref,
    () => ({
      getCroppedBlob: () =>
        new Promise((resolve) => {
          const img = imgRef.current
          if (!img || !naturalSize) {
            resolve(null)
            return
          }

          const canvas = document.createElement('canvas')
          canvas.width = OUTPUT_SIZE
          canvas.height = OUTPUT_SIZE
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(null)
            return
          }

          const sx = -offset.x / scale
          const sy = -offset.y / scale
          const sSize = VIEWPORT_SIZE / scale
          ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92)
        }),
    }),
    [offset, scale, naturalSize],
  )

  return (
    <div id="avatar-cropper">
      <div
        id="avatar-cropper-viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {imageUrl && (
          <img
            ref={imgRef}
            src={imageUrl}
            alt=""
            draggable={false}
            onLoad={handleImageLoad}
            style={{
              width: displayWidth,
              height: displayHeight,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
        )}
      </div>
      <div id="avatar-cropper-zoom">
        <span>Zoom</span>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(event) => handleZoomChange(Number(event.target.value))}
          disabled={!naturalSize}
        />
      </div>
    </div>
  )
})

AvatarCropper.displayName = 'AvatarCropper'

export default AvatarCropper
