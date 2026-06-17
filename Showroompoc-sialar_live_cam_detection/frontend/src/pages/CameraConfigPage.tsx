import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useConfigStore } from '../store/configStore'
import { getCameras, getAreas } from '../api/client'
import RuleConfigPanel from '../components/RuleConfigPanel'
import type { Camera } from '../types/api'
import VideoZoneSurface from '../components/VideoZoneSurface'

export default function CameraConfigPage() {
  const { cameraId } = useParams<{ cameraId: string }>()
  const navigate = useNavigate()

  const [camera, setCamera] = useState<Camera | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading')
  const [panelOpen, setPanelOpen] = useState(true)

  const {
    setCamera: setStoreCamera,
    setZone,
    setEntityType,
    setTriggerType,
    setTriggerParams,
    setSavedAreaId,
    reset,
  } = useConfigStore()

  useEffect(() => {
    if (!cameraId) {
      setLoadState('notfound')
      return
    }

    setStoreCamera(cameraId)

    let cancelled = false

    const init = async () => {
      try {
        const { cameras } = await getCameras()
        const cam = cameras.find(c => c.id === cameraId)

        if (cancelled) return
        if (!cam) {
          setLoadState('notfound')
          return
        }

        setCamera(cam)

        try {
          const areas = await getAreas(cameraId)
          if (!cancelled && areas.length > 0) {
            const area = areas[0]
            setZone(area.polygon.map(([x, y]) => ({ x, y })))
            setEntityType(area.entity_type)
            setTriggerType(area.trigger.type)
            setTriggerParams(area.trigger.params as Parameters<typeof setTriggerParams>[0])
            setSavedAreaId(area.area_id)
          }
        } catch {
          // ignore
        }

        if (!cancelled) setLoadState('ready')
      } catch {
        if (!cancelled) setLoadState('error')
      }
    }

    init()

    return () => {
      cancelled = true
      reset()
    }
  }, [cameraId])

  if (loadState === 'loading') {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (loadState === 'notfound') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-100 text-sm">Camara no encontrada</p>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded"
        >
          Volver a camaras
        </button>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-100 text-sm">No se pudo cargar la camara</p>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded"
        >
          Volver a camaras
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate('/')}
        className="text-gray-400 hover:text-gray-100 text-sm mb-4 block"
      >
        &lt; Volver a camaras
      </button>

      <h1 className="text-xl font-semibold leading-tight text-gray-100 mb-4">
        Configurar Zona de Control
        {camera && <span className="text-gray-400 font-normal text-base ml-2">— {camera.name}</span>}
      </h1>

      <p className="text-xs font-normal text-gray-400 mb-4">
        Arrastra los puntos para ajustar la zona de control
      </p>

      <div className="flex gap-8 items-start">
        <div
          className="flex-shrink-0"
          style={{ width: panelOpen ? '60%' : '100%' }}
        >
          {camera && (
            <VideoZoneSurface
              videoSrc={camera.video_url}
            />
          )}
        </div>

        <div className="flex items-start gap-0 flex-1">
          <button
            onClick={() => setPanelOpen(o => !o)}
            className="bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-100 px-1 py-4 rounded-l text-xs self-stretch flex items-center"
            title={panelOpen ? 'Colapsar panel' : 'Expandir panel'}
          >
            {panelOpen ? '<' : '>'}
          </button>

          <div
            className={`bg-gray-800 rounded-r-lg overflow-hidden ${
              panelOpen ? 'w-full p-6' : 'w-0 p-0'
            }`}
          >
            <RuleConfigPanel />
          </div>
        </div>
      </div>
    </div>
  )
}