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
  appearance: 'Appearance',
  body: 'Body Detail',
  clothing: 'Clothing',
  pose: 'Pose & Action',
  nsfw_detail: 'NSFW Detail',
  composition: 'Composition',
  background: 'Background',
  style: 'Art Style',
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
      const m = await fetchModels()
      setModels(m)
      if (m.length > 0 && !settings.model) update({ model: m[0] })
      setModelStatus(`${m.length} models loaded`)
    } catch {
      setModelStatus('Failed to load')
    }
  }, [settings.model, update])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[70] w-full max-w-md bg-[#0a0a0a] border-l border-white/[0.06] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.04]">
              <h2 className="text-lg font-semibold text-zinc-200">Configuration</h2>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-8">
              {/* API Settings */}
              <section>
                <button
                  onClick={() => setApiOpen(!apiOpen)}
                  className="flex items-center justify-between w-full text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4"
                >
                  <span>API Connection</span>
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
                      {/* Provider */}
                      <div>
                        <label className="text-xs text-zinc-500 mb-1.5 block">Provider</label>
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

                      {/* API Key */}
                      <div>
                        <label className="text-xs text-zinc-500 mb-1.5 block">API Key</label>
                        <input
                          type="password"
                          value={settings.apiKey}
                          onChange={(e) => update({ apiKey: e.target.value })}
                          placeholder="Uses environment variable if empty"
                          className="input-dark w-full"
                        />
                      </div>

                      {/* Base URL */}
                      <div>
                        <label className="text-xs text-zinc-500 mb-1.5 block">Base URL</label>
                        <input
                          value={settings.baseUrl}
                          onChange={(e) => update({ baseUrl: e.target.value })}
                          placeholder="Default endpoint"
                          className="input-dark w-full"
                        />
                      </div>

                      {/* Model */}
                      <div>
                        <label className="text-xs text-zinc-500 mb-1.5 block">Model</label>
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
                              placeholder="e.g. gpt-4o"
                              className="input-dark flex-1"
                            />
                          )}
                          <button
                            onClick={loadModels}
                            className="px-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] transition-all"
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

              {/* Portrait Mode */}
              <section className="glass rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Camera className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-zinc-200">Portrait Mode</span>
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
                  <span className="text-xs text-zinc-500">Objective portrait annotation for LoRA training</span>
                </label>
                {settings.portraitMode && (
                  <input
                    value={settings.portraitSuffix}
                    onChange={(e) => update({ portraitSuffix: e.target.value })}
                    placeholder="Character suffix"
                    className="input-dark w-full text-sm"
                  />
                )}
              </section>

              {/* NSFW Mode */}
              <section className="glass rounded-2xl p-5 space-y-4 border-red-500/10">
                <div className="flex items-center gap-3">
                  <ShieldOff className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-zinc-200">NSFW Mode</span>
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
                  <span className="text-xs text-zinc-500">Multi-layer bypass with anti-truncation roll</span>
                </label>
                {settings.nsfwMode && (
                  <div>
                    <label className="text-xs text-zinc-500 mb-2 block">
                      Roll retries: {settings.nsfwMaxRolls}
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

              {/* Dimensions */}
              <section>
                <p className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
                  Description Dimensions
                </p>
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

