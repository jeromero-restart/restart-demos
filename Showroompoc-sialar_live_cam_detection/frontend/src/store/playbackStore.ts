import { create } from 'zustand'
import type { VideoMetadata, Detection, EventObject, DetectionResult } from '../types/api'

interface PlaybackStore {
  jobId: string | null
  metadata: VideoMetadata | null
  frames: Record<string, Detection[]>
  sortedFrameKeys: number[]
  events: EventObject[]
  activeEventIdx: number | null
  jobStatus: 'idle' | 'queued' | 'processing' | 'done' | 'error'
  progressPct: number
  errorMessage: string | null
  setJob: (jobId: string) => void
  setResults: (result: DetectionResult) => void
  setProgress: (pct: number, status: PlaybackStore['jobStatus']) => void
  setActiveEventIdx: (idx: number | null) => void
  setError: (msg: string) => void
  reset: () => void
}

const initialState = {
  jobId: null,
  metadata: null,
  frames: {},
  sortedFrameKeys: [],
  events: [],
  activeEventIdx: null,
  jobStatus: 'idle' as const,
  progressPct: 0,
  errorMessage: null,
}

export const usePlaybackStore = create<PlaybackStore>(set => ({
  ...initialState,
  setJob: (jobId) => set({ jobId, jobStatus: 'queued', progressPct: 0, errorMessage: null }),
  setResults: (result) => set({
    metadata: result.metadata,
    frames: result.frames,
    sortedFrameKeys: Object.keys(result.frames).map(Number).sort((a, b) => a - b),
    events: result.events,
    jobStatus: 'done',
  }),
  setProgress: (pct, status) => set({ progressPct: pct, jobStatus: status }),
  setActiveEventIdx: (idx) => set({ activeEventIdx: idx }),
  setError: (msg) => set({ jobStatus: 'error', errorMessage: msg }),
  reset: () => set(initialState),
}))
