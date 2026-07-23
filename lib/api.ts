import type { Settings, AnalysisResult, JobEvent } from '@/types'

const API = process.env.NEXT_PUBLIC_API_URL || ''

export async function fetchModels(): Promise<string[]> {
  const res = await fetch(`${API}/api/models`)
  if (!res.ok) throw new Error('Failed to fetch models')
  const data = await res.json()
  return data.models || []
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

