import { useEffect, useState } from 'react'
import { getCameras, getAreas } from '../api/client'
import type { Camera, Area } from '../types/api'
import CameraCard from '../components/CameraCard'

export default function CameraSelectionPage() {
  const [cameras, setCameras] = useState<Camera[]>([])
  const [areas, setAreas] = useState<Record<string, Area | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(false)
    try {
      const { cameras: cams } = await getCameras()
      setCameras(cams)
      // Fetch area config for each camera for polygon overlay (tolerates 404 until 03-02)
      const areaMap: Record<string, Area | null> = {}
      await Promise.all(
        cams.map(async cam => {
          try {
            const result = await getAreas(cam.id)
            areaMap[cam.id] = Array.isArray(result) && result.length > 0 ? result[0] : null
          } catch {
            areaMap[cam.id] = null
          }
        })
      )
      setAreas(areaMap)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-100 text-sm">No se pudieron cargar las cámaras</p>
        <button
          onClick={load}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-semibold leading-tight text-gray-100 mb-6">Seleccionar Cámara</h1>
      <div className="grid grid-cols-2 gap-6 max-w-[900px]">
        {cameras.map(cam => (
          <CameraCard key={cam.id} camera={cam} area={areas[cam.id]} />
        ))}
      </div>
    </div>
  )
}
