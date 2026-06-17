import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { usePlaybackStore } from '../store/playbackStore'
import { getCameras, getJobResults } from '../api/client'
import VideoPlayerSurface from '../components/VideoPlayerSurface'
import EventPanel from '../components/EventPanel'

// localStorage keys for persistence across page refresh
const STORAGE_KEY_JOB_ID = 'playback:jobId'
// Per-job key — prevents cross-job leakage when switching cameras/jobs
const resultsKey = (id: string) => `playback:results:${id}`

export default function ResultsPage() {
  const { cameraId } = useParams<{ cameraId: string }>()
  const [searchParams] = useSearchParams()
  const jobIdParam = searchParams.get('job_id')

  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const {
    jobId,
    jobStatus,
    progressPct,
    errorMessage,
    setJob,
    setProgress,
    setResults,
    setError,
    reset,
  } = usePlaybackStore()

  // Resolve camera video_url on mount
  useEffect(() => {
    if (!cameraId) return
    getCameras().then(({ cameras }) => {
      const cam = cameras.find(c => c.id === cameraId)
      if (cam) setVideoSrc(cam.video_url)
    }).catch(() => {})
  }, [cameraId])

  // Guard: no job_id in query params AND no stored job_id in localStorage
  // Restore from localStorage if available (page refresh recovery)
  useEffect(() => {
    if (jobIdParam) {
      // Job ID from URL query param (fresh navigation)
      setJob(jobIdParam)
      localStorage.setItem(STORAGE_KEY_JOB_ID, jobIdParam)
    } else {
      // Check localStorage for resumed job
      const storedJobId = localStorage.getItem(STORAGE_KEY_JOB_ID)
      if (storedJobId && usePlaybackStore.getState().jobId === null) {
        setJob(storedJobId)
      } else if (!storedJobId && !jobId) {
        setError('No se encontró el ID del análisis. Vuelve a la configuración e intenta de nuevo.')
      }
    }
  }, [jobIdParam])

  // Attempt to restore results from localStorage (page refresh recovery)
  useEffect(() => {
    if (jobStatus === 'done') return // Already loaded
    if (!jobId) return

    const stored = localStorage.getItem(resultsKey(jobId))
    if (stored && jobStatus !== 'processing') {
      try {
        const result = JSON.parse(stored)
        setResults(result)
      } catch {
        // localStorage corrupted; proceed with SSE
      }
    }
  }, [jobId, jobStatus])

  // SSE progress stream with comprehensive error handling
  useEffect(() => {
    if (!jobId || jobStatus === 'done' || jobStatus === 'error') return

    let es: EventSource | null = null
    let reconnectAttempts = 0
    const maxReconnectAttempts = 3

    const initializeSSE = () => {
      try {
        es = new EventSource(`/api/jobs/${jobId}/progress`)

        es.onmessage = (e) => {
          try {
            const msg: { progress_pct: number; status: string; job_id?: string; error?: string } = JSON.parse(e.data)

            if (msg.status === 'done') {
              setProgress(100, 'done')
              if (es) es.close()

              getJobResults(jobId)
                .then(result => {
                  setResults(result)
                  // Persist results for page refresh recovery
                  localStorage.setItem(resultsKey(jobId), JSON.stringify(result))
                })
                .catch(() => setError('No se pudieron cargar los resultados. Intenta de nuevo.'))
            } else if (msg.status === 'error') {
              setError(msg.error || 'El análisis falló. Verifica el video e intenta de nuevo.')
              if (es) es.close()
            } else {
              setProgress(msg.progress_pct, 'processing')
              reconnectAttempts = 0 // reset on successful message
            }
          } catch (parseErr) {
            // JSON parse error in SSE payload — don't close connection, wait for next message
          }
        }

        es.onerror = () => {
          if (es) es.close()

          const currentStatus = usePlaybackStore.getState().jobStatus
          if (currentStatus === 'done') {
            // Already completed, don't show error
            return
          }

          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts += 1
            // Retry after exponential backoff: 1s, 2s, 4s
            const backoffMs = Math.pow(2, reconnectAttempts - 1) * 1000
            setTimeout(initializeSSE, backoffMs)
          } else {
            setError('Error al recibir el progreso. Verifica la conexión e intenta de nuevo.')
          }
        }
      } catch (err) {
        // EventSource constructor error (shouldn't happen, but wrap defensively)
        setError('Error al iniciar la conexión de progreso. Intenta de nuevo.')
      }
    }

    initializeSSE()

    return () => {
      if (es) es.close()
    }
  }, [jobId, jobStatus])

  // Retry handler for error states
  const handleRetry = () => {
    setRetrying(true)
    reset()
    setRetrying(false)
    if (jobId) {
      setJob(jobId)
    }
  }

  // Reset store and localStorage on unmount
  useEffect(() => {
    return () => {
      reset()
      // Keep localStorage for potential recovery on next navigation
    }
  }, [])

  const currentJobId = jobIdParam || jobId

  if (!currentJobId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-100 text-sm">No se encontró el ID del análisis.</p>
        <Link to={`/cameras/${cameraId}/config`} className="text-blue-400 hover:text-blue-300 text-sm">
          ← Volver a configuración
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link
        to={`/cameras/${cameraId}/config`}
        className="text-gray-400 hover:text-gray-100 text-sm mb-4 block"
      >
        ← Volver a configuración
      </Link>

      {jobStatus === 'error' ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="text-center max-w-md">
            <p className="text-gray-100 text-sm mb-2">{errorMessage}</p>
            <p className="text-gray-400 text-xs">
              {errorMessage?.includes('progreso')
                ? 'La conexión con el servidor se ha perdido.'
                : 'Verifica que el video sea válido y no esté corrupto.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded text-sm"
            >
              {retrying ? 'Reintentando...' : 'Reintentar'}
            </button>
            <Link to={`/cameras/${cameraId}/config`} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-6 py-2 rounded text-sm">
              Volver a configuración
            </Link>
          </div>
        </div>
      ) : jobStatus !== 'done' ? (
        /* ProgressView */
        <div className="max-w-lg mx-auto py-24">
          <p className="text-sm text-gray-400 mb-2">Analizando video...</p>
          <div className="bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 rounded-full h-2 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 text-right mt-1">{progressPct}%</p>
        </div>
      ) : (
        /* Results view: video + event panel */
        <div className="flex gap-6 items-start">
          <div className="flex-1">
            {videoSrc && (
              <VideoPlayerSurface videoSrc={videoSrc} videoRef={videoRef} />
            )}
          </div>
          <EventPanel videoRef={videoRef} />
        </div>
      )}
    </div>
  )
}
