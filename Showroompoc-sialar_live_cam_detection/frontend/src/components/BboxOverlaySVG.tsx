import type { Detection } from '../types/api'

interface Props {
  detections: Detection[]
  width: number
  height: number
  zonePolygon?: number[][]  // [[x,y],...] normalized coords
}

const ENTITY_COLORS: Record<string, string> = {
  person: '#3b82f6',
  vehicle: '#f97316',
  animal: '#22c55e',
}

function getEntityColor(className: string): string {
  if (className === 'person') return ENTITY_COLORS.person
  if (['car', 'bus', 'truck', 'motorcycle', 'bicycle'].includes(className)) return ENTITY_COLORS.vehicle
  return ENTITY_COLORS.animal
}

export default function BboxOverlaySVG({ detections, width, height, zonePolygon }: Props) {
  if (detections.length === 0 && !zonePolygon) return null

  const zonePoints = zonePolygon
    ? zonePolygon.map(([x, y]) => `${x * width},${y * height}`).join(' ')
    : null

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {zonePoints && (
        <polygon
          points={zonePoints}
          fill="rgba(234, 179, 8, 0.12)"
          stroke="#eab308"
          strokeWidth={2}
          strokeDasharray="6 3"
        />
      )}

      {detections.map((det, i) => {
        const [x1, y1, x2, y2] = det.bbox
        const px = x1 * width
        const py = y1 * height
        const pw = (x2 - x1) * width
        const ph = (y2 - y1) * height
        const color = getEntityColor(det.class_name)
        const labelHeight = 18
        const labelWidth = String(det.track_id).length * 8 + 10
        const labelY = py < labelHeight ? py + 4 : py - labelHeight + 2

        return (
          <g key={i}>
            <rect
              x={px} y={py}
              width={pw} height={ph}
              fill="none"
              stroke={color}
              strokeWidth={det.in_zone ? 3 : 2}
              strokeDasharray={det.in_zone ? undefined : '4 2'}
            />
            <rect
              x={px} y={labelY}
              width={labelWidth} height={labelHeight}
              fill={color}
              rx={2}
            />
            <text
              x={px + 4}
              y={labelY + 13}
              fill="white"
              fontSize={12}
              fontFamily="sans-serif"
            >
              {det.track_id}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
