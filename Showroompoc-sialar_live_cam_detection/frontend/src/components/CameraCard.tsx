import { useNavigate } from 'react-router-dom'
import type { Camera, Area } from '../types/api'

interface Props {
  camera: Camera
  area?: Area | null
}

export default function CameraCard({ camera, area }: Props) {
  const navigate = useNavigate()

  // Convert normalized polygon [0.0-1.0] to SVG percentage points string for <polygon>
  const svgPoints = area
    ? area.polygon.map(([x, y]) => `${x * 100}% ${y * 100}%`).join(', ')
    : null

  return (
    <div
      onClick={() => navigate(`/cameras/${camera.id}/config`)}
      className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-700 transition-colors"
    >
      {/* 16:9 video container — the focal point of the card */}
      <div className="relative" style={{ aspectRatio: '16/9' }}>
        <video
          src={camera.video_url}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />
        {/* SVG polygon overlay — read-only mini preview (per D-04) */}
        {svgPoints && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <polygon
              points={svgPoints}
              fill="rgba(37, 99, 235, 0.25)"
              stroke="#3b82f6"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </div>
      {/* Footer */}
      <div className="p-3">
        <span className="text-xs font-normal leading-tight text-gray-100">{camera.name}</span>
      </div>
    </div>
  )
}
