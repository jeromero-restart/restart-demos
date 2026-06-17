import { create } from 'zustand'
import type { EntityType, TriggerType, DirectionValue } from '../types/api'

export interface NormalizedPoint {
  x: number  // [0.0, 1.0]
  y: number  // [0.0, 1.0]
}

// Default 4-corner zone (25% inset from each edge).
// To support more vertices in the future: add points here — no other code changes needed.
export const DEFAULT_ZONE: NormalizedPoint[] = [
  { x: 0.25, y: 0.25 },
  { x: 0.75, y: 0.25 },
  { x: 0.75, y: 0.75 },
  { x: 0.25, y: 0.75 },
]

interface ConfigStore {
  selectedCameraId: string | null
  zone: NormalizedPoint[] | null     // polygon vertices in [0,1] — source of truth, survives resize
  stageDimensions: { width: number; height: number }
  entityType: EntityType | null
  triggerType: TriggerType | null
  triggerParams: {
    min_count?: number
    threshold_s?: number
    direction?: DirectionValue
  }
  saveStatus: 'idle' | 'saving' | 'success' | 'error'
  savedAreaId: string | null
  setCamera: (id: string) => void
  setZone: (points: NormalizedPoint[]) => void
  updateVertex: (index: number, nx: number, ny: number) => void
  setStageDimensions: (d: { width: number; height: number }) => void
  setEntityType: (t: EntityType | null) => void
  setTriggerType: (t: TriggerType | null) => void
  setTriggerParams: (p: ConfigStore['triggerParams']) => void
  setSaveStatus: (s: ConfigStore['saveStatus']) => void
  setSavedAreaId: (id: string | null) => void
  reset: () => void
}

const initialState = {
  selectedCameraId: null,
  zone: null,
  stageDimensions: { width: 0, height: 0 },
  entityType: null,
  triggerType: null,
  triggerParams: {},
  saveStatus: 'idle' as const,
  savedAreaId: null,
}

export const useConfigStore = create<ConfigStore>(set => ({
  ...initialState,
  setCamera: id => set({ selectedCameraId: id }),
  setZone: points => set({ zone: points }),
  // Update a single vertex without cloning the whole array — keeps drag smooth at 60fps
  updateVertex: (index, nx, ny) =>
    set(state => {
      if (!state.zone) return state
      const zone = state.zone.map((p, i) => (i === index ? { x: nx, y: ny } : p))
      return { zone }
    }),
  setStageDimensions: d => set({ stageDimensions: d }),
  setEntityType: t => set({ entityType: t }),
  setTriggerType: t => set({ triggerType: t, triggerParams: {} }),
  setTriggerParams: p => set({ triggerParams: p }),
  setSaveStatus: s => set({ saveStatus: s }),
  setSavedAreaId: id => set({ savedAreaId: id }),
  reset: () => set(initialState),
}))
