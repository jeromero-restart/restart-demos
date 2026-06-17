import axios from 'axios'
import type { Camera, AreaCreate, AreaResponse, Area, JobResponse, DetectionResult } from '../types/api'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
})

export const getCameras = (): Promise<{ cameras: Camera[] }> =>
  api.get('/api/cameras').then(r => r.data)

export const getAreas = (camera_id: string): Promise<Area[]> =>
  api.get('/api/areas', { params: { camera_id } }).then(r => r.data)

export const getArea = (camera_id: string, area_id: string): Promise<Area | null> =>
  getAreas(camera_id).then(areas => areas.find(a => a.area_id === area_id) ?? null)

export const createArea = (body: AreaCreate): Promise<AreaResponse> =>
  api.post('/api/areas', body).then(r => r.data)

export const startJob = (area_id: string): Promise<JobResponse> =>
  api.post('/api/jobs', { area_id }).then(r => r.data)

export const getJobResults = (job_id: string): Promise<DetectionResult> =>
  api.get(`/api/jobs/${job_id}/results`).then(r => r.data)

export default api
