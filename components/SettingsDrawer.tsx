'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronDown, User, Heart, Shirt, Move,
  AlertTriangle, Frame, Mountain, Palette,
  Camera, ShieldOff, RefreshCw,
} from 'lucide-react'
import { useState, useCallback } from 'react'
import type { Settings } from '@/types'
import { PROVIDERS } from '@/types'
import { fetchModels } from '@/lib/api'

const DIM_ICONS: Record<string, React.ReactNode> = {
  appearance: <User className="w-3.5 h-3.5" />,
  body: <Heart className="w-3.5 h-3.5" />,
  clothing: <Shirt className="w-3.5 h-3.5" />,
  pose: <Move className="w-3.5 h-3.5" />,
  nsfw_detail: <AlertTriangle className="w-3.5 h-3.5" />,
  composition: <Frame className="w-3.5 h-3.5" />,
  background: <Mountain className="w-3.5 h-3.5" />,
  style: <Palette className="w-3.5 h-3.5" />,
}

const DIM_LABELS: Record<string, string> = {
  appearance: '人物外观',
  body: '身体细节',
  clothing: '服装状态',
  pose: '姿势动作',
  nsfw_detail: '性相关细节',
  composition: '构图镜头',
  background: '背景环境',
  style: '画风质量',
}

interface Props {
  open: boolean
  onClose: () => void
  settings: Settings
  onChange: (s: Settings) => void
}

export function SettingsDrawer({ open, onClose, settings, onChange }: Props) {
  const [apiOpen, setApiOpen] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [modelStatus, setModelStatus] = useState('')

  const update = useCallback(
    (partial: Partial<Settings>) => onChange({ ...settings, ...partial }),
    [settings, onChange],
  )

  const toggleDim = useCallback(
    (key: string) => {
      const next = { ...settings.dimensions, [key]: !settings.dimensions[key] }
      onChange({ ...settings, dimensions: next })
    },
    [settings, onChange],
  )

  const loadModels = useCallback(async () => {
    try {
      setModelStatus('加载中...')
      const m = await fetchModels()
      setModels(m)
      if (m.length > 0 && !settings.model) update({ model: m[0] })
      setModelStatus(`已加载 ${m.length} 个模型`)
    } catch {
      setModelStatus('加载失败')
    }
  }, [settings.model, update])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[70] w-full max-w-md bg-[#0a0a0a] border-l border-white/[0.06] overflow-y-auto"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.04]">
              <h2 className="text-lg font-semibold text-zinc-200">配置面板</h2>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-8">
              {/* API 设置 */}
              <section>
                <button
                  onClick={() => setApiOpen(!apiOpen)}
                  className="flex items-center justify-between w-full text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4"
                >
                  <span>API 连接设置</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${apiOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {apiOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-4"
                    >
                      <div>
                        <label className="text-xs text-zinc-500 mb-1.5 block">AI 提供商</label>
                        <select
                          value={settings.provider}
                          onChange={(e) => update({ provider: e.target.value })}
                          className="input-dark w-full"
                        >
                          {PROVIDERS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-zinc-500 mb-1.5 block">API 密钥</label>
                        <input
                          type="password"
                          value={settings.apiKey}
                          onChange={(e) => update({ apiKey: e.target.value })}
                          placeholder="留空则使用环境变量"
                          className="input-dark w-full"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-500 mb-1.5 block">接口地址</label>
                        <input
                          value={settings.baseUrl}
                          onChange={(e) => update({ baseUrl: e.target.value })}
                          placeholder="留空则使用默认地址"
                          className="input-dark w-full"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-500 mb-1.5 block">模型选择</label>
                        <div className="flex gap-2">
                          {models.length > 0 ? (
                            <select
                              value={settings.model}
                              onChange={(e) => update({ model: e.target.value })}
                              className="input-dark flex-1"
                            >
                              {models.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={settings.model}
                              onChange={(e) => update({ model: e.target.value })}
                              placeholder="如 gpt-4o"
                              className="input-dark flex-1"
                            />
                          )}
                          <button
                            onClick={loadModels}
                            className="px-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] transition-all"
                            title="从环境变量获取模型列表"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                        {modelStatus && (
                          <p className="text-xs text-zinc-600 mt-1.5">{modelStatus}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* 肖像模式 */}
              <section className="glass rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Camera className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-zinc-200">肖像标注模式</span>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settings.portraitMode}
                      onChange={(e) => update({ portraitMode: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 rounded-full bg-white/[0.06] peer-checked:bg-purple-500/40 transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-zinc-400 peer-checked:bg-purple-400 peer-checked:translate-x-4 transition-all" />
                  </div>
                  <span className="text-xs text-zinc-500">客观肖像标注，训练 LoRA 推荐</span>
                </label>
                {settings.portraitMode && (
                  <input
                    value={settings.portraitSuffix}
                    onChange={(e) => update({ portraitSuffix: e.target.value })}
                    placeholder="自定义人物后缀，如：章鱼"
                    className="input-dark w-full text-sm"
                  />
                )}
              </section>

              {/* NSFW 模式 */}
              <section className="glass rounded-2xl p-5 space-y-4 border-red-500/10">
                <div className="flex items-center gap-3">
                  <ShieldOff className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-zinc-200">NSFW 无限制模式</span>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settings.nsfwMode}
                      onChange={(e) => {
                        const v = e.target.checked
                        const dims = { ...settings.dimensions, nsfw_detail: v }
                        onChange({ ...settings, nsfwMode: v, dimensions: dims })
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 rounded-full bg-white/[0.06] peer-checked:bg-red-500/40 transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-zinc-400 peer-checked:bg-red-400 peer-checked:translate-x-4 transition-all" />
                  </div>
                  <span className="text-xs text-zinc-500">多层破限 + 防截断自动重跑</span>
                </label>
                {settings.nsfwMode && (
                  <div>
                    <label className="text-xs text-zinc-500 mb-2 block">
                      截断重跑次数：{settings.nsfwMaxRolls}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={settings.nsfwMaxRolls}
                      onChange={(e) => update({ nsfwMaxRolls: parseInt(e.target.value) })}
                      className="w-full h-1.5 rounded-full bg-white/[0.06] appearance-none cursor-pointer accent-red-500"
                    />
                  </div>
                )}
              </section>

              {/* 描述维度 */}
              <section>
                <p className="text-sm font-medium text-zinc-400 tracking-wider mb-4">
                  描述维度开关
                </p>
                <p className="text-xs text-zinc-600 mb-3">关闭的维度将被强制禁止描述，反推和扩写均生效</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(DIM_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => toggleDim(key)}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                        settings.dimensions[key]
                          ? 'bg-purple-500/10 border border-purple-500/20 text-purple-300'
                          : 'bg-white/[0.02] border border-white/[0.04] text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04]'
                      }`}
                    >
                      {DIM_ICONS[key]}
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
