export interface DimensionDef {
  key: string
  label: string
}

export interface Settings {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
  portraitMode: boolean
  portraitSuffix: string
  theaterMode: boolean
  theaterCount: number
  nsfwMode: boolean
  nsfwMaxRolls: number
  dimensions: Record<string, boolean>
  imagesPerRequest: number
  maxConcurrent: number
  skipCompleted: boolean
  compressUpload: boolean
  uploadMaxEdge: number
  customPrompt: string
  krea2: boolean
  krea2EvidenceMode: boolean
}

export interface AnalysisResult {
  filename: string
  prompt: string
  success: boolean
  error?: string
  cached?: boolean
  chinese?: string
  english?: string
}

export interface JobEvent {
  type: 'progress' | 'complete' | 'error' | 'heartbeat'
  progress?: number
  message?: string
  results?: AnalysisResult[]
}

export const DEFAULT_SETTINGS: Settings = {
  provider: 'openai',
  apiKey: '',
  baseUrl: '',
  model: '',
  portraitMode: false,
  portraitSuffix: '',
  theaterMode: false,
  theaterCount: 6,
  nsfwMode: false,
  nsfwMaxRolls: 3,
  dimensions: {
    appearance: true,
    body: true,
    clothing: true,
    pose: true,
    nsfw_detail: false,
    composition: true,
    background: true,
    style: true,
  },
  imagesPerRequest: 5,
  maxConcurrent: 3,
  skipCompleted: true,
  // 上传前把图片压到最长边 uploadMaxEdge 的 JPEG：手机上一批几十张原图动辄上百 MB，
  // 传输中途极易被切断（Safari 直接报 Load failed），压缩后降到几 MB。模型看到的
  // 本来就是后端压过的 1024px 版本，反推结果不受影响。
  compressUpload: true,
  uploadMaxEdge: 1536,
  customPrompt: '',
  krea2: false,
  krea2EvidenceMode: false,
}

export const DIMENSION_ICONS: Record<string, string> = {
  appearance: 'User',
  body: 'Heart',
  clothing: 'Shirt',
  pose: 'Move',
  nsfw_detail: 'AlertTriangle',
  composition: 'Frame',
  background: 'Mountain',
  style: 'Palette',
}

export const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'claude', label: 'Claude' },
  { value: 'qwen', label: '通义千问' },
  { value: 'custom', label: '自定义' },
]
