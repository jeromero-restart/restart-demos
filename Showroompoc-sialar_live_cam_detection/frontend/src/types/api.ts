export interface Camera {
  id: string
  name: string
  video_url: string
  description: string
  resolution: string
  fps: number
}

// Matches backend TriggerConfig Pydantic schema EXACTLY — do not use UI-SPEC field names
export type TriggerType = 'count' | 'dwell' | 'direction'
export type EntityType = 'person' | 'vehicle' | 'animal'
export type DirectionValue = 'N' | 'S' | 'E' | 'W'

export interface TriggerParams {
  min_count?: number       // count trigger — int > 0
  threshold_s?: number     // dwell trigger — float > 0 (NOT dwell_seconds)
  direction?: DirectionValue  // direction trigger — N/S/E/W only (NOT north/south/east/west)
}

export interface TriggerConfig {
  type: TriggerType
  params: TriggerParams
}

export interface AreaCreate {
  camera_id: string
  polygon: number[][]      // [[x,y],...] — 4 corners normalized [0.0-1.0]
  entity_type: EntityType
  trigger: TriggerConfig   // nested — NOT trigger_type/trigger_params flat
}

export interface AreaResponse {
  area_id: string
}

export interface Area {
  area_id: string
  camera_id: string
  polygon: number[][]
  entity_type: EntityType
  trigger: TriggerConfig
  created_at: string
}

export interface VideoMetadata {
  fps: number
  processed_fps: number
  total_frames: number
  video_duration: number
  area_id: string
}

export interface Detection {
  track_id: number
  class_name: string
  confidence: number
  bbox: [number, number, number, number]
  in_zone: boolean
}

export interface EventObject {
  event_id: string
  frame_number: number
  timestamp_s: number
  track_id: number
  class_name: string
  trigger_type: 'count' | 'dwell' | 'direction'
  trigger_params: Record<string, unknown>
}

export interface DetectionResult {
  metadata: VideoMetadata
  frames: Record<string, Detection[]>
  events: EventObject[]
}

export interface JobResponse {
  job_id: string
  status: string
}
