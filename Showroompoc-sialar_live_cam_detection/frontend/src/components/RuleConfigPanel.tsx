import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConfigStore, DEFAULT_ZONE } from '../store/configStore'
import { createArea, startJob } from '../api/client'
import type { EntityType, TriggerType, DirectionValue, AreaCreate } from '../types/api'

export default function RuleConfigPanel() {
  const {
    selectedCameraId,
    zone,
    stageDimensions,
    entityType,
    triggerType,
    triggerParams,
    saveStatus,
    savedAreaId,
    setSavedAreaId,
    setEntityType,
    setTriggerType,
    setTriggerParams,
    setSaveStatus,
    setZone,
  } = useConfigStore()

  const navigate = useNavigate()
  const [analyzing, setAnalyzing] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up toast timer on unmount to prevent setState-after-unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  const { width, height } = stageDimensions
  const canSave =
    !!entityType &&
    !!triggerType &&
    zone !== null &&
    zone.length >= 3 &&
    width > 0 &&
    height > 0

  const handleEntityChange = (t: EntityType) => {
    setEntityType(t)
    if (saveStatus === 'error') setSaveStatus('idle')
  }

  const handleTriggerChange = (t: TriggerType) => {
    // setTriggerType resets triggerParams per store definition
    setTriggerType(t)
    if (saveStatus === 'error') setSaveStatus('idle')
    // Apply defaults per trigger type
    if (t === 'count') setTriggerParams({ min_count: 1 })
    else if (t === 'dwell') setTriggerParams({ threshold_s: 30 })
    else if (t === 'direction') setTriggerParams({ direction: 'N' })
  }

  // Full form reset: geometry + entity + trigger (per review: partial clear is confusing)
  const handleClear = () => {
    setZone(DEFAULT_ZONE)
    setEntityType(null)
    setTriggerType(null)
    setSaveStatus('idle')
  }

  const handleAnalyze = async () => {
    if (!savedAreaId || !selectedCameraId) return
    setAnalyzing(true)
    try {
      const { job_id } = await startJob(savedAreaId)
      navigate(`/cameras/${selectedCameraId}/results?job_id=${job_id}`)
    } catch {
      setAnalyzing(false)
      // TODO: show error toast in Phase 5 polish
    }
  }

  const handleSave = async () => {
    if (!canSave || !selectedCameraId || !zone) return
    setSaveStatus('saving')

    // Build polygon directly from normalized vertices — no rect math needed
    const polygon: number[][] = zone.map(p => [p.x, p.y])

    // Build trigger params — MUST match backend schema exactly (not UI-SPEC flat shape)
    let params: Record<string, unknown> = {}
    if (triggerType === 'count') {
      params = { min_count: triggerParams.min_count ?? 1 }
    } else if (triggerType === 'dwell') {
      params = { threshold_s: triggerParams.threshold_s ?? 30 }
    } else if (triggerType === 'direction') {
      params = { direction: triggerParams.direction ?? 'N' }
    }

    const body: AreaCreate = {
      camera_id: selectedCameraId,
      polygon,
      entity_type: entityType!,
      trigger: { type: triggerType!, params },
    }

    try {
      const response = await createArea(body)
      setSavedAreaId(response.area_id)
      setSaveStatus('success')
      // Auto-dismiss toast after 3s; clean up ref on dismiss
      toastTimerRef.current = setTimeout(() => {
        toastTimerRef.current = null
        setSaveStatus('idle')
      }, 3000)
    } catch {
      setSaveStatus('error')
    }
  }

  const inputClass =
    'bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Section: Entidad */}
      <div>
        <h2 className="text-xs font-normal leading-tight text-gray-400 uppercase mb-3">
          Entidad
        </h2>
        <div className="flex flex-col gap-2">
          {([
            ['person',  'Persona'],
            ['vehicle', 'Vehiculo'],
            ['animal',  'Animal'],
          ] as [EntityType, string][]).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="entity"
                value={value}
                checked={entityType === value}
                onChange={() => handleEntityChange(value)}
                className="accent-blue-600"
              />
              <span className="text-gray-100 text-sm">{label}</span>
            </label>
          ))}
        </div>
        {!entityType && saveStatus === 'error' && (
          <p className="text-xs text-red-400 mt-1">Selecciona una entidad para continuar</p>
        )}
      </div>

      {/* Section: Disparador */}
      <div>
        <h2 className="text-xs font-normal leading-tight text-gray-400 uppercase mb-3">
          Disparador
        </h2>
        <div className="flex flex-col gap-2">
          {([
            ['count',     'Cantidad'],
            ['dwell',     'Permanencia'],
            ['direction', 'Direccion'],
          ] as [TriggerType, string][]).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="trigger"
                value={value}
                checked={triggerType === value}
                onChange={() => handleTriggerChange(value)}
                className="accent-blue-600"
              />
              <span className="text-gray-100 text-sm">{label}</span>
            </label>
          ))}
        </div>
        {!triggerType && saveStatus === 'error' && (
          <p className="text-xs text-red-400 mt-1">Selecciona un disparador para continuar</p>
        )}

        {/* Conditional parameter inputs */}
        <div className="overflow-hidden mt-3">
          {triggerType === 'count' && (
            <div>
              <label className="block text-xs font-normal leading-tight text-gray-400 mb-1">
                Cantidad minima simultanea en zona
              </label>
              <input
                type="number"
                min={1}
                max={99}
                value={triggerParams.min_count ?? 1}
                onChange={e => {
                  const v = parseInt(e.target.value) || 1
                  setTriggerParams({ min_count: Math.min(99, Math.max(1, v)) })
                }}
                className={inputClass}
              />
            </div>
          )}

          {triggerType === 'dwell' && (
            <div>
              <label className="block text-xs font-normal leading-tight text-gray-400 mb-1">
                Tiempo maximo de permanencia (segundos)
              </label>
              <input
                type="number"
                min={1}
                max={600}
                value={triggerParams.threshold_s ?? 30}
                onChange={e => {
                  const v = parseFloat(e.target.value) || 1
                  setTriggerParams({ threshold_s: Math.min(600, Math.max(1, v)) })
                }}
                className={inputClass}
              />
            </div>
          )}

          {triggerType === 'direction' && (
            <div>
              <label className="block text-xs font-normal leading-tight text-gray-400 mb-1">
                Sentido de ingreso al area
              </label>
              {/*
                Backend validator accepts only N/S/E/W.
                "Cualquier direccion" is excluded — no backend equivalent exists in PoC scope.
              */}
              <select
                value={triggerParams.direction ?? 'N'}
                onChange={e =>
                  setTriggerParams({ direction: e.target.value as DirectionValue })
                }
                className={inputClass}
              >
                <option value="N">Norte</option>
                <option value="S">Sur</option>
                <option value="E">Este</option>
                <option value="W">Oeste</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Spacer pushes buttons to bottom */}
      <div className="flex-1" />

      {/* Error message */}
      {saveStatus === 'error' && (
        <p className="text-xs text-red-400">
          No se pudo guardar la configuracion. Verifica la conexion e intenta de nuevo.
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleSave}
          disabled={!canSave || saveStatus === 'saving'}
          className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded w-full transition-colors ${
            !canSave || saveStatus === 'saving' ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {saveStatus === 'saving' ? 'Guardando...' : 'Guardar Configuracion'}
        </button>

        {savedAreaId && (
          <>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded w-full transition-colors ${
                analyzing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {analyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Iniciando análisis...
                </span>
              ) : (
                'Analizar'
              )}
            </button>

            <button
              onClick={() => navigate(`/cameras/${selectedCameraId}/live?area_id=${savedAreaId}`)}
              className="bg-red-700 hover:bg-red-600 text-white font-semibold px-6 py-2 rounded w-full transition-colors flex items-center justify-center gap-2"
            >
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Ver en Vivo
            </button>
          </>
        )}

        <button
          onClick={handleClear}
          className="bg-transparent border border-red-600 text-red-400 hover:bg-red-600 hover:text-white px-4 py-2 rounded text-sm w-full transition-colors"
        >
          Limpiar zona
        </button>
      </div>

      {/* Success toast — fixed bottom-right, auto-dismiss 3s */}
      {saveStatus === 'success' && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white text-sm font-normal px-4 py-3 rounded shadow-lg">
          Configuracion guardada correctamente
        </div>
      )}
    </div>
  )
}
