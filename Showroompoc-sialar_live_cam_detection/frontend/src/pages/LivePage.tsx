import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import type { EventObject } from '../types/api'

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatEntity(className: string): string {
  // Backend emits the macro entity class ("person" | "vehicle" | "animal"),
  // not the YOLO-specific label. Specific labels are kept as fallback in case
  // the rule engine is ever changed to pass through the detected class.
  if (className === 'person') return 'Persona'
  if (className === 'vehicle' || ['car', 'bus', 'truck', 'motorcycle', 'bicycle'].includes(className)) return 'Vehículo'
  if (className === 'animal' || ['cat', 'dog', 'horse', 'sheep', 'cow'].includes(className)) return 'Animal'
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

type StreamStatus = 'connecting' | 'streaming' | 'ended' | 'error'

export default function LivePage() {
  const { cameraId } = useParams<{ cameraId: string }>()
  const [searchParams] = useSearchParams()
  const areaId = searchParams.get('area_id')

  const [events, setEvents] = useState<EventObject[]>([])
  const [status, setStatus] = useState<StreamStatus>('connecting')
  // Bumped by Reiniciar / Iniciar to force a fresh MJPEG <img> connection AND a new SSE.
  // The backend session auto-rebuilds when subscriber count drops to 0 and the
  // next subscriber arrives.
  const [streamKey, setStreamKey] = useState(0)
  // Operator-driven session lifecycle. When false, the user clicked Detener:
  // the <img> is unmounted, no SSE is open, and only an "Iniciar" button shows.
  const [active, setActive] = useState(true)

  const restart = () => setStreamKey(k => k + 1)

  const stop = async () => {
    setActive(false)
    setStatus('ended')
    try {
      await fetch(`/api/cameras/${cameraId}/live/session?area_id=${areaId}`, { method: 'DELETE' })
    } catch {
      // best-effort: even if the request fails, the UI is already detached
    }
  }

  const start = () => {
    setActive(true)
    setStreamKey(k => k + 1)
  }

  // Subscribe to the SSE event channel. The MJPEG video stream is wired by the
  // <img src=...> below; the browser owns its lifecycle directly.
  useEffect(() => {
    if (!cameraId || !areaId) return
    if (!active) return

    setStatus('connecting')
    setEvents([])

    const es = new EventSource(`/api/cameras/${cameraId}/live/events?area_id=${areaId}`)
    es.onopen = () => setStatus(prev => (prev === 'connecting' ? 'streaming' : prev))

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'event') {
          const { type: _t, ...event } = msg
          setEvents(prev => [...prev, event as EventObject])
          setStatus(prev => (prev === 'connecting' ? 'streaming' : prev))
        } else if (msg.type === 'ended') {
          setStatus('ended')
          es.close()
        } else if (msg.type === 'error') {
          setStatus('error')
          es.close()
        }
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      setStatus(prev => (prev === 'ended' ? prev : 'error'))
      es.close()
    }

    return () => es.close()
  }, [cameraId, areaId, streamKey, active])

  if (!areaId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-100 text-sm">Falta el área de configuración.</p>
        <Link to={`/cameras/${cameraId}/config`} className="text-blue-400 hover:text-blue-300 text-sm">
          ← Volver a configuración
        </Link>
      </div>
    )
  }

  const videoSrc = `/api/cameras/${cameraId}/live/video?area_id=${areaId}`

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Link
          to={`/cameras/${cameraId}/config`}
          className="text-gray-400 hover:text-gray-100 text-sm"
        >
          ← Volver a configuración
        </Link>

        <div className="flex items-center gap-3">
          {active && (status === 'streaming' || status === 'connecting') && (
            <button
              onClick={stop}
              className="bg-gray-700 hover:bg-gray-600 text-gray-100 text-xs px-3 py-1 rounded"
            >
              Detener
            </button>
          )}
          {!active && (
            <span className="text-xs text-gray-400">Detenido</span>
          )}
          {active && status === 'connecting' && (
            <span className="text-xs text-gray-400">Conectando...</span>
          )}
          {active && status === 'streaming' && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">En Vivo</span>
            </div>
          )}
          {active && status === 'ended' && (
            <span className="text-xs text-gray-400">Stream finalizado</span>
          )}
          {active && status === 'error' && (
            <span className="text-xs text-red-400">Error en la conexión</span>
          )}
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* MJPEG video — bboxes and zone are burned in by the backend */}
        <div className="flex-1">
          <div
            style={{ width: '100%', aspectRatio: '16/9', position: 'relative' }}
            className="overflow-hidden rounded-lg bg-black"
          >
            {active ? (
              <img
                key={streamKey}
                src={videoSrc}
                alt="Live camera stream"
                className="block w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={start}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded shadow-lg"
                >
                  Iniciar
                </button>
              </div>
            )}

            {active && status === 'connecting' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-blue-300">Conectando...</span>
                </div>
              </div>
            )}

            {active && status === 'ended' && (
              <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
                <button
                  onClick={restart}
                  className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded shadow-lg"
                >
                  Reiniciar stream
                </button>
              </div>
            )}

            {active && status === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center">
                  <p className="text-gray-100 text-sm mb-3">Error al conectar con la detección</p>
                  <button
                    onClick={restart}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live events panel */}
        <div className="w-80 bg-gray-800 rounded-lg flex flex-col overflow-hidden" style={{ minHeight: '200px', maxHeight: '480px' }}>
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
            <span className="text-xs uppercase text-gray-400 font-normal tracking-wide">Eventos</span>
            <span className="text-xs text-gray-400">{events.length} total</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 gap-2">
                <p className="text-sm text-gray-100 text-center">
                  {status === 'connecting' ? 'Conectando...' : 'Sin eventos aún'}
                </p>
                <p className="text-xs text-gray-400 text-center">
                  Los eventos aparecen al dispararse las alarmas
                </p>
              </div>
            ) : (
              [...events].reverse().map((event, idx) => (
                <div
                  key={`${event.event_id}-${idx}`}
                  className="px-4 py-3 border-b border-gray-700/50"
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
