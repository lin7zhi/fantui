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
  nsfwMode: boolean
  nsfwMaxRolls: number
  dimensions: Record<string, boolean>
  imagesPerRequest: number
  maxConcurrent: number
  skipCompleted: boolean
  customPrompt: string
}

export interface AnalysisResult {
  filename: string
  prompt: string
  success: boolean
  error?: string
  cached?: boolean
}

export interface JobEvent {
  type: 'progress' | 'complete' | 'error' | 'heartbeat'
  progress?: number
  message?: string
  results?: AnalysisResult[]
}

export interface FetchedProviderModels {
  models: string[]
  error?: string | null
  /** 'admin' 表示这批模型来自管理员配置，而非上游实时返回 */
  source?: 'admin' | null
}

export interface ProviderDef {
  value: string
  label: string
}

export interface AdminProviderInfo {
  label: string
  type: string
  base_url: string
  api_key: string
  model: string
}

export interface AdminConfig {
  builtin: { value: string; label: string; disabled: boolean }[]
  custom_providers: Record<string, AdminProviderInfo>
  allowed_models: Record<string, string[]>
}

export const DEFAULT_SETTINGS: Settings = {
  provider: 'openai',
  apiKey: '',
  baseUrl: '',
  model: '',
  portraitMode: false,
  portraitSuffix: '',
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
  customPrompt: '',
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
  { value: 'zhipu', label: '智谱 GLM' },
  { value: 'moonshot', label: 'Kimi 月之暗面' },
  { value: 'doubao', label: '豆包' },
  { value: 'siliconflow', label: '硅基流动' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'xai', label: 'Grok (xAI)' },
  { value: 'ollama', label: 'Ollama 本地' },
  { value: 'custom', label: '自定义' },
]
