import type { Settings, AnalysisResult, JobEvent } from '@/types'
import { authHeaders, clearSession, getToken, type AuthUser } from '@/lib/auth'

// Keep API calls same-origin so remote browser clients never resolve localhost locally.
const API = '/api/backend'

async function readError(res: Response): Promise<string> {
  const text = await res.text()
  try {
    const data = JSON.parse(text)
    if (typeof data?.detail === 'string') return data.detail
    if (Array.isArray(data?.detail)) return data.detail.map((d: { msg?: string }) => d.msg).join('; ')
  } catch {
    /* not JSON */
  }
  return text || res.statusText
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...authHeaders() }
  if (init.body && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const backendPath = path.startsWith('/api/') ? path.slice(4) : path
  const res = await fetch(`${API}${backendPath}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
  })
  if (res.status === 401) {
    clearSession()
    throw new Error(await readError(res))
  }
  if (!res.ok) throw new Error(await readError(res))
  return (await res.json()) as T
}

/* ───────── 模型 ───────── */
export interface ModelsResponse {
  models: string[]
  source?: string
  message?: string
}

export async function fetchModels(opts?: {
  provider?: string
  apiKey?: string
  baseUrl?: string
}): Promise<ModelsResponse> {
  if (opts?.provider) {
    return request<ModelsResponse>('/api/models', {
      method: 'POST',
      body: JSON.stringify({
        provider: opts.provider,
        api_key: opts.apiKey || null,
        base_url: opts.baseUrl || null,
      }),
    })
  }
  return request<ModelsResponse>('/api/models')
}

/* ───────── 账号 ───────── */
export interface AuthResponse {
  token: string
  expires_at: number
  user: AuthUser
}

export function register(username: string, password: string) {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function login(username: string, password: string) {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function logout() {
  return request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
}

export interface RecordStats {
  total: number
  by_kind: Record<string, number>
  ttl_seconds: number
}

export function fetchMe() {
  return request<{ user: AuthUser; stats: RecordStats }>('/api/auth/me')
}

export function changePassword(oldPassword: string, newPassword: string) {
  return request<{ ok: boolean }>('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  })
}

/* ───────── 词记录 ───────── */
export type RecordKind = 'analyze' | 'expand' | 'theater' | 'h3'

export interface RecordImage {
  id: string
  filename: string
  mime: string
  width: number
  height: number
}

export interface PromptRecord {
  id: string
  kind: RecordKind
  title: string
  input: string
  output?: string
  preview?: string
  meta: Record<string, unknown>
  images?: RecordImage[]
  created_at: number
  expires_at: number
}

/** 记录里的图片直接给 <img src> 用，走 query token（img 标签带不了请求头） */
export function getRecordImageUrl(imageId: string): string {
  const token = getToken()
  const qs = token ? `?token=${encodeURIComponent(token)}` : ''
  return `${API}/records/images/${imageId}${qs}`
}

export function fetchRecords(kind?: RecordKind) {
  const qs = kind ? `?kind=${kind}` : ''
  return request<{ records: PromptRecord[]; ttl_seconds: number; stats: RecordStats }>(
    `/api/records${qs}`,
  )
}

export function fetchRecord(id: string) {
  return request<{ record: PromptRecord }>(`/api/records/${id}`)
}

export function deleteRecord(id: string) {
  return request<{ ok: boolean }>(`/api/records/${id}`, { method: 'DELETE' })
}

export function clearRecords(kind?: RecordKind) {
  const qs = kind ? `?kind=${kind}` : ''
  return request<{ deleted: number }>(`/api/records${qs}`, { method: 'DELETE' })
}

/* ───────── 反推 ───────── */
function buildSettingsPayload(s: Settings) {
  const enabledDims = Object.entries(s.dimensions)
    .filter(([, v]) => v)
    .map(([k]) => k)

  return {
    provider: s.provider,
    api_key: s.apiKey || null,
    base_url: s.baseUrl || null,
    model: s.model || null,
    images_per_request: s.imagesPerRequest,
    max_concurrent: s.maxConcurrent,
    skip_completed: s.skipCompleted,
    nsfw: s.nsfwMode,
    nsfw_max_rolls: s.nsfwMaxRolls,
    portrait: s.portraitMode,
    portrait_suffix: s.portraitSuffix,
    custom_prompt: s.customPrompt || null,
    enabled_dims: enabledDims,
    krea2: s.krea2,
    krea2_evidence_mode: s.krea2EvidenceMode,
  }
}

export async function startAnalysis(
  files: File[],
  settings: Settings,
): Promise<{ jobId: string; totalImages: number }> {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))
  formData.append('settings', JSON.stringify(buildSettingsPayload(settings)))

  const data = await request<{ job_id: string; total_images: number }>('/api/analyze', {
    method: 'POST',
    body: formData,
  })
  return { jobId: data.job_id, totalImages: data.total_images }
}

export function subscribeToJob(
  jobId: string,
  onEvent: (evt: JobEvent) => void,
  onError: (err: Error) => void,
): () => void {
  const es = new EventSource(`${API}/jobs/${jobId}/stream`)

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as JobEvent
      onEvent(data)
      if (data.type === 'complete' || data.type === 'error') {
        es.close()
      }
    } catch (err) {
      console.error('SSE parse error', err)
    }
  }

  es.onerror = () => {
    // EventSource automatically reconnects using the server-provided retry delay.
    // Keep the subscription alive during transient proxy or network interruptions.
    if (es.readyState === EventSource.CLOSED) {
      onError(new Error('任务连接已关闭，请重新提交'))
    }
  }

  return () => es.close()
}

export function getDownloadUrl(jobId: string, type: 'all' | 'txt') {
  return `${API}/api/download/${jobId}/${type}`
}

export type { AnalysisResult }

/* ───────── 扩写 ───────── */
export async function expandTags(tags: string, settings: Settings): Promise<string> {
  const enabledDims = Object.entries(settings.dimensions)
    .filter(([, v]) => v)
    .map(([k]) => k)

  const data = await request<{ result: string }>('/api/expand', {
    method: 'POST',
    body: JSON.stringify({
      tags,
      provider: settings.provider,
      api_key: settings.apiKey || null,
      base_url: settings.baseUrl || null,
      model: settings.model || null,
      nsfw: settings.nsfwMode,
      nsfw_max_rolls: settings.nsfwMaxRolls,
      portrait: settings.portraitMode,
      portrait_suffix: settings.portraitSuffix,
      theater: settings.theaterMode,
      theater_count: settings.theaterCount,
      enabled_dims: enabledDims,
    }),
  })
  return data.result
}

/* ───────── H3 ───────── */
export interface H3Mode {
  key: string
  label: string
}

export async function fetchH3Modes(): Promise<H3Mode[]> {
  const data = await request<{ modes: H3Mode[] }>('/api/h3/modes')
  return data.modes || []
}

export interface H3AudioRole {
  key: string
  label: string
}

export async function fetchH3AudioRoles(): Promise<{
  roles: H3AudioRole[]
  default: string
  accept: string[]
}> {
  return request<{ roles: H3AudioRole[]; default: string; accept: string[] }>(
    '/api/h3/audio-roles',
  )
}

export interface H3AudioRef {
  file: File
  role: string
  notes: string
}

/** 与后端 api_clients.model_supports_audio 保持一致的粗略判断 */
export function modelSupportsAudio(provider: string, model: string): boolean {
  const p = (provider || '').toLowerCase()
  const m = (model || '').toLowerCase()
  if (p === 'claude') return false
  if (p === 'gemini') return !m.includes('embedding')
  return ['audio', 'omni', 'gemini', 'qwen2.5-omni', 'step-1o'].some((tag) => m.includes(tag))
}

export async function generateH3Video(
  files: File[],
  opts: {
    mode: string
    brief: string
    duration: number
    settings: Settings
    audioRefs?: H3AudioRef[]
    videoFiles?: File[]
  },
): Promise<{
  mode: string
  imageCount: number
  audioCount: number
  audioHeard: boolean
  duration: number
  result: string
}> {
  const { mode, brief, duration, settings, audioRefs = [], videoFiles = [] } = opts
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))
  videoFiles.forEach((file) => formData.append('video_files', file))
  audioRefs.forEach((a) => formData.append('audio_files', a.file))
  formData.append(
    'settings',
    JSON.stringify({
      mode,
      brief,
      duration,
      provider: settings.provider,
      api_key: settings.apiKey || null,
      base_url: settings.baseUrl || null,
      model: settings.model || null,
      nsfw: settings.nsfwMode,
      nsfw_max_rolls: settings.nsfwMaxRolls,
      video_filenames: videoFiles.map((file) => file.name),
       audio_refs: audioRefs.map((a) => ({
        filename: a.file.name,
        role: a.role,
        notes: a.notes,
      })),
    }),
  )

  const data = await request<{
    mode: string
    image_count: number
    audio_count: number
    audio_heard: boolean
    duration: number
    result: string
  }>('/api/h3/video', { method: 'POST', body: formData })
  return {
    mode: data.mode,
    imageCount: data.image_count,
    audioCount: data.audio_count ?? 0,
    audioHeard: Boolean(data.audio_heard),
    duration: data.duration ?? duration,
    result: data.result,
  }
}
