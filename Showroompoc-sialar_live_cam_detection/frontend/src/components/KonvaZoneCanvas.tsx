import { useEffect, useRef, useState } from 'react'
import { useConfigStore, DEFAULT_ZONE } from '../store/configStore'

interface Props {
  width: number
  height: number
}

type PixelPoint = { x: number; y: number }

export default function KonvaZoneCanvas({ width, height }: Props) {
  const { zone, setZone } = useConfigStore()

  const svgRef = useRef<SVGSVGElement>(null)
  const dragState = useRef<{ index: number; offsetX: number; offsetY: number } | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [draftPoints, setDraftPoints] = useState<PixelPoint[]>(() => {
    const pts = zone ?? DEFAULT_ZONE
    return pts.map(p => ({ x: p.x * width, y: p.y * height }))
  })

  useEffect(() => {
    if (dragState.current) return
    const pts = zone ?? DEFAULT_ZONE
    const next = pts.map(p => ({ x: p.x * width, y: p.y * height }))
    setDraftPoints(prev => {
      if (
        prev.length === next.length &&
        prev.every((p, i) => p.x === next[i].x && p.y === next[i].y)
      ) return prev
      return next
    })
  }, [zone, width, height])

  if (draftPoints.length < 3 || width <= 0 || height <= 0) return null

  const svgPolygonPoints = draftPoints.map(p => `${p.x},${p.y}`).join(' ')

  const clamp = (v: number, max: number) => Math.max(0, Math.min(v, max))

  const getSvgPoint = (e: React.MouseEvent<SVGSVGElement>): PixelPoint => {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: clamp(e.clientX - rect.left, width),
      y: clamp(e.clientY - rect.top, height),
    }
  }

  const handleCircleMouseDown = (index: number, e: React.MouseEvent<SVGCircleElement>) => {
    e.stopPropagation()
    const rect = svgRef.current!.getBoundingClientRect()
    dragState.current = {
      index,
      offsetX: e.clientX - rect.left - draftPoints[index].x,
      offsetY: e.clientY - rect.top - draftPoints[index].y,
    }
  }

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragState.current) return
    const rect = svgRef.current!.getBoundingClientRect()
    const { index, offsetX, offsetY } = dragState.current
    const next: PixelPoint = {
      x: clamp(e.clientX - rect.left - offsetX, width),
      y: clamp(e.clientY - rect.top - offsetY, height),
    }
    setDraftPoints(prev => prev.map((p, i) => (i === index ? next : p)))
  }

  const handleSvgMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragState.current) return
    const { index } = dragState.current
    dragState.current = null
    setZone(draftPoints.map(p => ({ x: p.x / width, y: p.y / height })))
    void index
  }

  return (
    <svg
      ref={svgRef}
      style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
      width={width}
      height={height}
      onMouseMove={handleSvgMouseMove}
      onMouseUp={handleSvgMouseUp}
      onMouseLeave={handleSvgMouseUp}
    >
      <polygon
        points={svgPolygonPoints}
        fill="rgba(37,99,235,0.20)"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeDasharray="6 3"
        style={{ pointerEvents: 'none' }}
      />
      {draftPoints.map((pt, i) => (
        <circle
          key={i}
          cx={pt.x}
          cy={pt.y}
          r={10}
          fill="#3b82f6"
          stroke="#ffffff"
          strokeWidth={hoveredIndex === i ? 3 : 1}
          style={{ cursor: 'pointer' }}
          onMouseDown={e => handleCircleMouseDown(i, e)}
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
        />
      ))}
    </svg>
  )
}
