import type { Settings, AnalysisResult, JobEvent } from '@/types'
import { authHeaders, clearSession, getToken, type AuthUser } from '@/lib/auth'
import { extractImagesFromZip, isZipFile } from '@/lib/zip'

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

/** 浏览器级传输失败（连响应都没拿到）：Safari 报 Load failed，Chrome 报 Failed to fetch。 */
export class UploadInterruptedError extends Error {}

function interruptedMessage(raw: string): string {
  return `上传中断：浏览器没能完成这次请求（${raw}）。通常是网络中途断开、上传体积过大或代理/VPN 掐断长连接。`
    + '可以开启「上传前压缩」、切到 Wi-Fi、或减少一次提交的图片数量后重试。'
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...authHeaders() }
  if (init.body && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const backendPath = path.startsWith('/api/') ? path.slice(4) : path
  let res: Response
  try {
    res = await fetch(`${API}${backendPath}`, {
      ...init,
      headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    })
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err)
    throw new UploadInterruptedError(interruptedMessage(raw))
  }
  if (res.status === 401) {
    clearSession()
    throw new Error(await readError(res))
  }
  if (!res.ok) throw new Error(await readError(res))
  return (await res.json()) as T
}

/* ───────── 上传前压缩 ───────── */
/** 这些格式交给浏览器解码后按 JPEG 重压；其余（GIF/SVG/视频等）原样上传。 */
const DECODABLE_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/heic', 'image/heif', 'image/avif',
])

async function decodeImage(file: File) {
  if (typeof createImageBitmap === 'function') {
    try {
      // imageOrientation: 'none' 与后端的 PIL 处理保持一致：不按 EXIF 旋转像素。
      const bitmap = await createImageBitmap(file, { imageOrientation: 'none' })
      return { src: bitmap as CanvasImageSource, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() }
    } catch {
      /* 桌面端解不了 HEIC 之类，退回 <img> 再试一次 */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('decode failed'))
      el.src = url
    })
    return {
      src: img as CanvasImageSource,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      release: () => URL.revokeObjectURL(url),
    }
  } catch (err) {
    URL.revokeObjectURL(url)
    throw err
  }
}

/** 单张图片按最长边缩放并转成 JPEG；解不了或压不小就原样返回。 */
export async function shrinkImage(file: File, maxEdge: number, quality = 0.9): Promise<File> {
  if (maxEdge <= 0 || !DECODABLE_IMAGE_TYPES.has(file.type)) return file

  let decoded
  try {
    decoded = await decodeImage(file)
  } catch {
    return file
  }

  try {
    const scale = Math.min(1, maxEdge / Math.max(decoded.width, decoded.height))
    if (scale >= 1 && file.size <= 300 * 1024) return file
    const width = Math.max(1, Math.round(decoded.width * scale))
    const height = Math.max(1, Math.round(decoded.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(decoded.src, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file
    const name = file.name.replace(/\.[^.\\/]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified })
  } finally {
    decoded.release()
  }
}

export interface PrepareStage {
  phase: 'compress' | 'upload'
  done: number
  total: number
  bytes: number
  /** 上传阶段：已经发出去的字节数（XHR upload.onprogress） */
  sent?: number
  /** 阶段性说明（例如「正在解压 xxx.zip 3/48」） */
  note?: string
}

export async function prepareUpload(
  files: File[],
  settings: Settings,
  onStage?: (stage: PrepareStage) => void,
): Promise<File[]> {
  if (!settings.compressUpload) return files

  // .zip 不参与压缩（shrinkImage 只认图片 MIME），几百 MB 的包会原样直传，
  // 就是「上传传半天」。先在本地把包拆成图片，再逐张压成 JPEG 一起传。
  const expanded: File[] = []
  for (const file of files) {
    if (!isZipFile(file)) {
      expanded.push(file)
      continue
    }
    try {
      let skipped = 0
      const { files: inner, skipped: bad } = await extractImagesFromZip(
        file,
        (done, total, name) => {
          onStage?.({
            phase: 'compress',
            done,
            total,
            bytes: file.size,
            note: `正在本地解压 ${file.name} ${done}/${total}（${name}）...`,
          })
        },
      )
      skipped = bad
      if (!inner.length) {
        expanded.push(file)
        continue
      }
      expanded.push(...inner)
      onStage?.({
        phase: 'compress',
        done: 0,
        total: inner.length,
        bytes: file.size,
        note: `${file.name} 解出 ${inner.length} 张图片${skipped ? `（跳过 ${skipped} 个无法解包的条目）` : ''}，开始压缩...`,
      })
    } catch {
      // 加密封包 / 异常结构 / 不支持的打包方式：回退原样直传，后端照样能解
      expanded.push(file)
      onStage?.({
        phase: 'compress',
        done: 0,
        total: files.length,
        bytes: file.size,
        note: `${file.name} 无法在本地解压，改为原样上传（由后端解压）...`,
      })
    }
  }

  const out: File[] = []
  let bytes = 0
  for (let i = 0; i < expanded.length; i++) {
    const shrunk = await shrinkImage(expanded[i], settings.uploadMaxEdge)
    out.push(shrunk)
    bytes += shrunk.size
    onStage?.({ phase: 'compress', done: i + 1, total: expanded.length, bytes })
  }
  return out
}

function detailFromText(text: string): string {
  try {
    const data = JSON.parse(text)
    if (typeof data?.detail === 'string') return data.detail
    if (Array.isArray(data?.detail)) return data.detail.map((d: { msg?: string }) => d.msg).join('; ')
  } catch {
    /* not JSON */
  }
  return text
}

/** XHR 上传：fetch 拿不到上传进度，几百 MB 的包在界面上只能看到卡在 0% 的进度条。 */
function uploadWithProgress<T>(
  path: string,
  body: FormData,
  onProgress?: (sent: number, total: number) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const backendPath = path.startsWith('/api/') ? path.slice(4) : path
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API}${backendPath}`)
    const headers = authHeaders()
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v))
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded, e.total)
    }
    xhr.onload = () => {
      const text = xhr.responseText || ''
      if (xhr.status === 401) {
        clearSession()
        reject(new Error(detailFromText(text) || '登录已过期'))
        return
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(detailFromText(text) || `HTTP ${xhr.status}`))
        return
      }
      try {
        resolve(JSON.parse(text) as T)
      } catch {
        reject(new Error('响应不是 JSON'))
      }
    }
    xhr.onerror = () => reject(new UploadInterruptedError(interruptedMessage('network error')))
    xhr.onabort = () => reject(new UploadInterruptedError(interruptedMessage('aborted')))
    xhr.ontimeout = () => reject(new UploadInterruptedError(interruptedMessage('timeout')))
    xhr.send(body)
  })
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
  onStage?: (stage: PrepareStage) => void,
): Promise<{ jobId: string; totalImages: number }> {
  const prepared = await prepareUpload(files, settings, onStage)
  return uploadAnalysis(prepared, settings, onStage)
}

/** 压缩好之后单独发这一步，传输中断时可以在不重新压缩的前提下重发。 */
export async function uploadAnalysis(
  prepared: File[],
  settings: Settings,
  onStage?: (stage: PrepareStage) => void,
): Promise<{ jobId: string; totalImages: number }> {
  const formData = new FormData()
  prepared.forEach((f) => formData.append('files', f))
  formData.append('settings', JSON.stringify(buildSettingsPayload(settings)))

  const totalBytes = prepared.reduce((sum, f) => sum + f.size, 0)
  onStage?.({
    phase: 'upload',
    done: prepared.length,
    total: prepared.length,
    bytes: totalBytes,
    sent: 0,
  })

  const data = await uploadWithProgress<{ job_id: string; total_images: number }>(
    '/api/analyze',
    formData,
    (sent) =>
      onStage?.({
        phase: 'upload',
        done: prepared.length,
        total: prepared.length,
        bytes: totalBytes,
        sent,
      }),
  )
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
  // API 已经是 /api/backend，Next 的 rewrite 会补上后端的 /api，这里不能再写一遍。
  return `${API}/download/${jobId}/${type}`
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
