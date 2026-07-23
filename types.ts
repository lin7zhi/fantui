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
  { value: 'qwen', label: 'Qwen' },
  { value: 'custom', label: 'Custom' },
]

