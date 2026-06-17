import { useRef, useState, useEffect, RefObject } from 'react'
import { usePlaybackStore } from '../store/playbackStore'
import BboxOverlaySVG from './BboxOverlaySVG'
import type { Detection } from '../types/api'

interface Props {
  videoSrc: string
  videoRef: RefObject<HTMLVideoElement>
}

// Nearest-past frame lookup — uses pre-sorted keys from playbackStore to avoid sort on every tick
function nearestPastLookup(
  sortedKeys: number[],
  frames: Record<string, Detection[]>,
  currentFrame: number
): Detection[] {
  let best = -1
  for (const k of sortedKeys) {
    if (k <= currentFrame) best = k
    else break
  }
  return best >= 0 ? frames[String(best)] : []
}

export default function VideoPlayerSurface({ videoSrc, videoRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [currentDetections, setCurrentDetections] = useState<Detection[]>([])

  const { frames, sortedFrameKeys, metadata } = usePlaybackStore(s => ({
    frames: s.frames,
    sortedFrameKeys: s.sortedFrameKeys,
    metadata: s.metadata,
  }))

  // ResizeObserver — exact pattern from VideoZoneSurface.tsx
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      setSize({ width: w, height: Math.round(w * 9 / 16) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ontimeupdate — drives bbox sync
  // CRITICAL: use metadata.fps (source FPS, e.g. 25.0) NOT metadata.processed_fps (5)
  // Frame keys in detections.json are actual source frame numbers, not processed frame indexes
  useEffect(() => {
    const video = videoRef.current
    if (!video || !metadata) return

    const handler = () => {
      const currentFrame = Math.round(video.currentTime * metadata.fps)
      setCurrentDetections(nearestPastLookup(sortedFrameKeys, frames, currentFrame))
    }

    video.addEventListener('timeupdate', handler)
    return () => video.removeEventListener('timeupdate', handler)
  }, [videoRef, frames, sortedFrameKeys, metadata])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', aspectRatio: '16/9', position: 'relative' }}
      className="overflow-hidden rounded-lg bg-black"
    >
      <video
        ref={videoRef}
        src={videoSrc}
        controls
        playsInline
        className="block w-full h-full object-contain"
      />
      {size.width > 0 && (
        <BboxOverlaySVG
          detections={currentDetections}
          width={size.width}
          height={size.height}
        />
      )}
    </div>
  )
}
