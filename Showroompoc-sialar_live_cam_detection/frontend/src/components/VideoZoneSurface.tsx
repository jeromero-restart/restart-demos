import { useRef, useState, useEffect } from 'react'
import { useConfigStore } from '../store/configStore'
import KonvaZoneCanvas from './KonvaZoneCanvas'

interface Props {
  videoSrc: string
}

export default function VideoZoneSurface({ videoSrc }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const { setStageDimensions } = useConfigStore()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      const h = Math.round(w * 9 / 16)
      setSize({ width: w, height: h })
      setStageDimensions({ width: w, height: h })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [setStageDimensions])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', aspectRatio: '16/9', position: 'relative' }}
      className="overflow-hidden rounded-lg"
    >
      <video
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        className="block w-full h-full object-cover select-none pointer-events-none"
      />
      {size.width > 0 && (
        <KonvaZoneCanvas width={size.width} height={size.height} />
      )}
    </div>
  )
}
