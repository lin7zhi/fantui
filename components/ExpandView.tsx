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
  const [copiedScene, setCopiedScene] = useState<number | null>(null)

  const theater = settings.theaterMode

  const scenes: { idx: number; text: string }[] = (() => {
    if (!theater || !result) return []
    const parts = result.split(/\[\s*SCENE\s*(\d+)\s*\]/i)
    const out: { idx: number; text: string }[] = []
    for (let i = 1; i < parts.length - 1; i += 2) {
      out.push({ idx: parseInt(parts[i]), text: parts[i + 1].trim() })
    }
    return out
  })()

  const handleCopyScene = useCallback((idx: number, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedScene(idx)
    setTimeout(() => setCopiedScene(null), 2000)
  }, [])

  const handleExpand = useCallback(async () => {
    if (!tags.trim()) return
    setProcessing(true)
    setError(null)
    setResult('')
    try {
      const res = await expandTags(tags, settings)
      setResult(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '扩写失败')
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
      {/* 说明 */}
      <div className="glass rounded-2xl p-5 border-l-2 border-purple-500/30">
        <p className="text-sm text-zinc-400 leading-relaxed">
          {theater
            ? `输入一段故事大纲,AI 将按大纲续写为 ${settings.theaterCount} 幕前后连贯的出图提示词,同一角色与画风贯穿全篇,像漫画分镜一样。`
            : '输入简单的标签或元素关键词,AI 将根据左侧配置面板中的维度开关和模式设置,扩写为细节饱满的中文自然语言长段落描述。'}
        </p>
      </div>

      {/* 输入 */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300 block">
          {theater ? '输入故事大纲' : '输入基础标签'}
        </label>
        <textarea
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="例如：1girl, 森林, 魔法师, 夜晚, 月光, 飘逸长袍..."
          rows={5}
          className="input-dark w-full resize-none font-mono text-sm"
        />
      </div>

      {/* 按钮 */}
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
                扩写中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                开始扩写
              </>
            )}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      </div>

      {/* 错误 */}
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

      {/* 结果 */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-300">扩写结果</h3>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? '已复制' : '复制结果'}
              </button>
            </div>
            {theater && scenes.length > 0 ? (
              <div className="space-y-4">
                {scenes.map((s) => (
                  <div key={s.idx} className="glass rounded-2xl p-5 space-y-3 border-amber-500/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-400 tracking-wider">
                        第 {s.idx} 幕
                      </span>
                      <button
                        onClick={() => handleCopyScene(s.idx, s.text)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all"
                      >
                        {copiedScene === s.idx ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copiedScene === s.idx ? '已复制' : '复制本幕'}
                      </button>
                    </div>
                    <p className="text-sm text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap">
                      {s.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass rounded-2xl p-6">
                <p className="text-sm text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap">
                  {result}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
