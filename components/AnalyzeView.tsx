'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Download, Copy, Check, Loader2,
  ChevronDown, Image as ImageIcon, AlertCircle,
  SkipForward, CheckCircle2, XCircle,
} from 'lucide-react'
import type { Settings, AnalysisResult } from '@/types'
import { startAnalysis, subscribeToJob, getDownloadUrl } from '@/lib/api'
import { UploadZone } from './UploadZone'

interface Props {
  settings: Settings
  onSettingsChange: (s: Settings) => void
}

export function AnalyzeView({ settings, onSettingsChange }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [results, setResults] = useState<AnalysisResult[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const unsubRef = useRef<(() => void) | null>(null)

  const handleStart = useCallback(async () => {
    if (!files.length) return
    setProcessing(true)
    setProgress(0)
    setProgressMsg('Uploading...')
    setResults([])
    setError(null)
    setJobId(null)

    try {
      const { jobId: jid } = await startAnalysis(files, settings)
      setJobId(jid)
      setProgressMsg('Processing...')

      const unsub = subscribeToJob(
        jid,
        (evt) => {
          if (evt.type === 'progress') {
            setProgress(evt.progress ?? 0)
            setProgressMsg(evt.message ?? '')
          } else if (evt.type === 'complete') {
            setResults(evt.results ?? [])
            setProgress(1)
            setProcessing(false)
          } else if (evt.type === 'error') {
            setError(evt.message ?? 'Unknown error')
            setProcessing(false)
          }
        },
        (err) => {
          setError(err.message)
          setProcessing(false)
        },
      )
      unsubRef.current = unsub
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start')
      setProcessing(false)
    }
  }, [files, settings])

  const allText = results
    .map((r, i) => {
      const status = r.success ? (r.cached ? 'CACHED' : 'OK') : 'ERROR'
      const content = r.success ? r.prompt : `Error: ${r.error}`
      return `[${i + 1}] ${r.filename} [${status}]\n${'─'.repeat(40)}\n${content}`
    })
    .join('\n\n')

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(allText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [allText])

  const successCount = results.filter((r) => r.success).length
  const errorCount = results.filter((r) => !r.success).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8"
    >
      {/* Controls row */}
      <div className="glass rounded-2xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Images per batch</label>
            <input
              type="range"
              min={1}
              max={15}
              value={settings.imagesPerRequest}
              onChange={(e) =>
                onSettingsChange({ ...settings, imagesPerRequest: parseInt(e.target.value) })
              }
              className="w-full h-1.5 rounded-full bg-white/[0.06] appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-xs text-zinc-500 mt-1 block">{settings.imagesPerRequest}</span>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Concurrency</label>
            <input
              type="range"
              min={1}
              max={8}
              value={settings.maxConcurrent}
              onChange={(e) =>
                onSettingsChange({ ...settings, maxConcurrent: parseInt(e.target.value) })
              }
              className="w-full h-1.5 rounded-full bg-white/[0.06] appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-xs text-zinc-500 mt-1 block">{settings.maxConcurrent}</span>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.skipCompleted}
                  onChange={(e) => onSettingsChange({ ...settings, skipCompleted: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 rounded-full bg-white/[0.06] peer-checked:bg-purple-500/40 transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-zinc-400 peer-checked:bg-purple-400 peer-checked:translate-x-4 transition-all" />
              </div>
              <span className="text-xs text-zinc-400">Skip completed</span>
            </label>
          </div>
        </div>

        {/* Custom prompt */}
        <details className="group">
          <summary className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors">
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
            Custom template override
          </summary>
          <textarea
            value={settings.customPrompt}
            onChange={(e) => onSettingsChange({ ...settings, customPrompt: e.target.value })}
            placeholder="Overrides all mode settings when provided..."
            rows={3}
            className="input-dark w-full mt-3 text-xs font-mono resize-none"
          />
        </details>
      </div>

      {/* Upload */}
      <UploadZone files={files} onChange={setFiles} />

      {/* Start button */}
      <div className="flex justify-center">
        <motion.button
          onClick={handleStart}
          disabled={processing || !files.length}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative px-10 py-4 rounded-2xl font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
            boxShadow: '0 8px 32px rgba(168,85,247,0.3)',
          }}
        >
          <span className="relative z-10 flex items-center gap-2.5">
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Analysis
              </>
            )}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      </div>

      {/* Progress */}
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">{progressMsg}</p>
              <span className="text-xs text-zinc-500 font-mono">
                {Math.round(progress * 100)}%
              </span>
            </div>
            <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full progress-glow"
                style={{ background: 'linear-gradient(90deg, #a855f7, #6366f1)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl p-5 border-red-500/20 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-300">Analysis failed</p>
              <p className="text-xs text-zinc-500 mt-1">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Stats + Downloads */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> {successCount} success
                </span>
                {errorCount > 0 && (
                  <span className="flex items-center gap-1.5 text-red-400">
                    <XCircle className="w-4 h-4" /> {errorCount} failed
                  </span>
                )}
              </div>
              {jobId && (
                <div className="flex items-center gap-2">
                  <a
                    href={getDownloadUrl(jobId, 'all')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-zinc-300 hover:bg-white/[0.08] transition-all"
                  >
                    <Download className="w-4 h-4" /> All files
                  </a>
                  <a
                    href={getDownloadUrl(jobId, 'txt')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-zinc-300 hover:bg-white/[0.08] transition-all"
                  >
                    <Download className="w-4 h-4" /> Text only
                  </a>
                </div>
              )}
            </div>

            {/* Gallery toggle */}
            <div>
              <button
                onClick={() => setShowGallery(!showGallery)}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                <span>{showGallery ? 'Hide' : 'Show'} gallery preview</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showGallery ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showGallery && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {results.filter((r) => r.success).map((r, idx) => {
                        const file = files.find((f) => f.name === r.filename)
                        return (
                          <motion.div
                            key={r.filename}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.04 }}
                            className="glass rounded-xl overflow-hidden group"
                          >
                            {file && file.type.startsWith('image/') ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={URL.createObjectURL(file)}
                                alt={r.filename}
                                className="w-full aspect-square object-cover"
                              />
                            ) : (
                              <div className="w-full aspect-square bg-white/[0.02] flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-zinc-700" />
                              </div>
                            )}
                            <div className="p-2.5">
                              <p className="text-[10px] text-zinc-500 truncate">{r.filename}</p>
                              <p className="text-[11px] text-zinc-400 mt-1 line-clamp-3 leading-relaxed">
                                {r.prompt}
                              </p>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Text summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-300">Text Summary</h3>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy all'}
                </button>
              </div>
              <div className="glass rounded-2xl p-5 max-h-[500px] overflow-y-auto">
                <div className="space-y-6 stagger-children">
                  {results.map((r, idx) => (
                    <div key={r.filename} className="space-y-2">
                      <div className="flex items-center gap-2">
                        {r.success ? (
                          r.cached ? (
                            <SkipForward className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                        )}
                        <span className="text-xs font-medium text-zinc-400">
                          [{idx + 1}] {r.filename}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300 font-mono leading-relaxed pl-5 border-l border-white/[0.04]">
                        {r.success ? r.prompt : `Error: ${r.error}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

