'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Copy, Check, Loader2, AlertCircle } from 'lucide-react'
import type { Settings } from '@/types'
import { expandTags } from '@/lib/api'

interface Props {
  settings: Settings
}

export function ExpandView({ settings }: Props) {
  const [tags, setTags] = useState('')
  const [result, setResult] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleExpand = useCallback(async () => {
    if (!tags.trim()) return
    setProcessing(true)
    setError(null)
    setResult('')
    try {
      const res = await expandTags(tags, settings)
      setResult(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Expansion failed')
    } finally {
      setProcessing(false)
    }
  }, [tags, settings])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [result])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8"
    >
      {/* Info */}
      <div className="glass rounded-2xl p-5 border-l-2 border-purple-500/30">
        <p className="text-sm text-zinc-400 leading-relaxed">
          Enter basic tags or elements below. The AI will expand them into a detailed natural
          language description based on your dimension and mode settings.
        </p>
      </div>

      {/* Input */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300 block">Input Tags</label>
        <textarea
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. 1girl, forest, mage, night, moonlight, flowing robes..."
          rows={5}
          className="input-dark w-full resize-none font-mono text-sm"
        />
      </div>

      {/* Button */}
      <div className="flex justify-center">
        <motion.button
          onClick={handleExpand}
          disabled={processing || !tags.trim()}
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
                Expanding...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Expand Tags
              </>
            )}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      </div>

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
            <p className="text-sm text-red-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-300">Expansion Result</h3>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="glass rounded-2xl p-6">
              <p className="text-sm text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap">
                {result}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

