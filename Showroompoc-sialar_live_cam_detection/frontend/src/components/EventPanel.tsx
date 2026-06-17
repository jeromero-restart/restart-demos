import { useEffect, useRef, RefObject } from 'react'
import { usePlaybackStore } from '../store/playbackStore'
import type { EventObject } from '../types/api'

interface Props {
  videoRef: RefObject<HTMLVideoElement>
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatEntity(className: string): string {
  if (className === 'person') return 'Persona'
  if (['car', 'bus', 'truck', 'motorcycle', 'bicycle'].includes(className)) return 'Vehículo'
  if (['cat', 'dog', 'horse', 'sheep', 'cow'].includes(className)) return 'Animal'
  return className
}

function formatTrigger(event: EventObject): string {
  switch (event.trigger_type) {
    case 'count':
      return `${event.trigger_params.min_count} en zona`
    case 'dwell':
      return `Permanencia ${event.trigger_params.threshold_s}s`
    case 'direction': {
      const map: Record<string, string> = { N: 'Norte', S: 'Sur', E: 'Este', W: 'Oeste' }
      return `Ingreso desde ${map[event.trigger_params.direction as string] ?? String(event.trigger_params.direction)}`
    }
    default:
      return String(event.trigger_type)
  }
}

// Find index of last event where timestamp_s <= currentTime
function findActiveEventIdx(events: EventObject[], currentTime: number): number | null {
  let idx: number | null = null
  for (let i = 0; i < events.length; i++) {
    if (events[i].timestamp_s <= currentTime) idx = i
    else break
  }
  return idx
}

export default function EventPanel({ videoRef }: Props) {
  const { events, activeEventIdx, setActiveEventIdx } = usePlaybackStore(s => ({
    events: s.events,
    activeEventIdx: s.activeEventIdx,
    setActiveEventIdx: s.setActiveEventIdx,
  }))

  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  // Sync active event to video playback position via ontimeupdate
  useEffect(() => {
    const video = videoRef.current
    if (!video || events.length === 0) return

    const handler = () => {
      const newIdx = findActiveEventIdx(events, video.currentTime)
      const currentActive = usePlaybackStore.getState().activeEventIdx
      if (newIdx !== currentActive) {
        setActiveEventIdx(newIdx)
        if (newIdx !== null) {
          rowRefs.current[newIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }
    }

    video.addEventListener('timeupdate', handler)
    return () => video.removeEventListener('timeupdate', handler)
  }, [videoRef, events])

  // Click-to-seek: set currentTime, pause video, and immediately update active index
  // Sets activeEventIdx BEFORE ontimeupdate fires to avoid Pitfall 3 (seek race condition)
  const handleEventClick = (event: EventObject, idx: number) => {
    const video = videoRef.current
    if (!video) return
    setActiveEventIdx(idx)  // set immediately — bypass ontimeupdate for this tick
    video.currentTime = event.timestamp_s
    video.pause()
  }

  const eventCount = events.length
  const countLabel = eventCount === 1 ? '1 evento' : `${eventCount} eventos`

  return (
    <div className="w-80 bg-gray-800 rounded-lg flex flex-col overflow-hidden" style={{ minHeight: '200px' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <span className="text-xs uppercase text-gray-400 font-normal tracking-wide">Eventos</span>
        <span className="text-xs text-gray-400">{countLabel}</span>
      </div>

      {/* Scrollable event list */}
      <div className="flex-1 overflow-y-auto">
        {eventCount === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 px-4 gap-2">
            <p className="text-sm text-gray-100 text-center">Sin eventos detectados</p>
            <p className="text-xs text-gray-400 text-center">
              El análisis no encontró eventos con la regla configurada.
            </p>
          </div>
        ) : (
          events.map((event, idx) => {
            const isActive = activeEventIdx === idx
            return (
              <div
                key={event.event_id}
                ref={el => { rowRefs.current[idx] = el }}
                onClick={() => handleEventClick(event, idx)}
                className={
                  isActive
                    ? 'px-4 py-3 border-b border-gray-700/50 border-l-4 border-l-blue-500 bg-blue-900/30 cursor-pointer'
                    : 'px-4 py-3 border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/40 border-l-4 border-l-transparent'
                }
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-mono text-gray-400 flex-shrink-0">
                    {formatTimestamp(event.timestamp_s)}
                  </span>
                  <div className="flex flex-col items-end min-w-0">
                    <span className="text-sm text-gray-100">{formatEntity(event.class_name)}</span>
                    <span className="text-xs text-gray-400 text-right">{formatTrigger(event)}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
