import type {
  Settings, AnalysisResult, JobEvent, FetchedProviderModels,
  ProviderDef, AdminProviderInfo, AdminConfig,
} from '@/types'

const API = process.env.NEXT_PUBLIC_API_URL || ''

export async function fetchProviders(): Promise<ProviderDef[]> {
  const res = await fetch(`${API}/api/providers`)
  if (!res.ok) throw new Error('Failed to fetch providers')
  const data = await res.json()
  return data.providers || []
}

export async function fetchModels(provider?: string): Promise<string[]> {
  const url = provider
    ? `${API}/api/models?provider=${encodeURIComponent(provider)}`
    : `${API}/api/models`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch models')
  const data = await res.json()
  return data.models || []
}

export async function fetchAllModels(
  credentials: Record<string, { api_key?: string; base_url?: string }>,
  adminToken?: string,
): Promise<Record<string, FetchedProviderModels>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (adminToken) headers['X-Admin-Token'] = adminToken
  const res = await fetch(`${API}/api/models/fetch`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ credentials }),
  })
  if (!res.ok) throw new Error('Failed to fetch all models')
  const data = await res.json()
  return data.providers || {}
}

// ── 管理员接口 ──
async function adminReq<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    let msg = res.statusText
    try {
      const data = await res.json()
      msg = data.detail || msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  return res.json()
}

export function adminFetchConfig(token: string): Promise<AdminConfig> {
  return adminReq(token, '/api/admin/config')
}

export function adminUpsertProvider(
  token: string,
  p: AdminProviderInfo & { key: string },
): Promise<{ ok: boolean }> {
  return adminReq(token, '/api/admin/providers', { method: 'POST', body: JSON.stringify(p) })
}

export function adminDeleteProvider(token: string, key: string): Promise<{ ok: boolean }> {
  return adminReq(token, `/api/admin/providers/${encodeURIComponent(key)}`, { method: 'DELETE' })
}

export function adminSetDisabled(
  token: string, key: string, disabled: boolean,
): Promise<{ ok: boolean }> {
  return adminReq(token, `/api/admin/providers/${encodeURIComponent(key)}/disabled`, {
    method: 'POST',
    body: JSON.stringify({ disabled }),
  })
}

export function adminSetModels(
  token: string, allowed: Record<string, string[]>,
): Promise<{ ok: boolean; allowed: Record<string, string[]> }> {
  return adminReq(token, '/api/admin/models', { method: 'POST', body: JSON.stringify({ allowed }) })
}

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
  }
}

export async function startAnalysis(
  files: File[],
  settings: Settings,
): Promise<{ jobId: string; totalImages: number }> {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))
  formData.append('settings', JSON.stringify(buildSettingsPayload(settings)))

  const res = await fetch(`${API}/api/analyze`, { method: 'POST', body: formData })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  const data = await res.json()
  return { jobId: data.job_id, totalImages: data.total_images }
}

export function subscribeToJob(
  jobId: string,
  onEvent: (evt: JobEvent) => void,
  onError: (err: Error) => void,
): () => void {
  const es = new EventSource(`${API}/api/jobs/${jobId}/stream`)

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
    onError(new Error('Connection lost'))
    es.close()
  }

  return () => es.close()
}

export function getDownloadUrl(jobId: string, type: 'all' | 'txt') {
  return `${API}/api/download/${jobId}/${type}`
}

export async function expandTags(tags: string, settings: Settings): Promise<string> {
  const enabledDims = Object.entries(settings.dimensions)
    .filter(([, v]) => v)
    .map(([k]) => k)

  const res = await fetch(`${API}/api/expand`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
      enabled_dims: enabledDims,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  const data = await res.json()
  return data.result
}

