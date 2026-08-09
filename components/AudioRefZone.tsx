'use client'

import { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Music, Plus, X, AudioLines } from 'lucide-react'
import type { H3AudioRef, H3AudioRole } from '@/lib/api'

interface Props {
  refs: H3AudioRef[]
  onChange: (refs: H3AudioRef[]) => void
  roles: H3AudioRole[]
  defaultRole: string
  accept: string[]
  /** 当前模型是否能真的“听”音频 */
  canHear: boolean
}

export function AudioRefZone({ refs, onChange, roles, defaultRole, accept, canHear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const allowed = accept.length ? accept : ['.mp3', '.wav']
      const added = Array.from(incoming)
        .filter((f) => allowed.some((ext) => f.name.toLowerCase().endsWith(ext)))
        .map((file) => ({ file, role: defaultRole, notes: '' }))
      if (added.length) onChange([...refs, ...added])
    },
    [refs, onChange, defaultRole, accept],
  )

  const update = useCallback(
    (idx: number, partial: Partial<H3AudioRef>) => {
      onChange(refs.map((r, i) => (i === idx ? { ...r, ...partial } : r)))
    },
    [refs, onChange],
  )

  const remove = useCallback(
    (idx: number) => onChange(refs.filter((_, i) => i !== idx)),
    [refs, onChange],
  )

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-2xl border border-dashed px-5 py-6 text-center cursor-pointer transition-all ${
          dragging
            ? 'border-cyan-500/50 bg-cyan-500/[0.05]'
            : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={(accept.length ? accept : ['.mp3', '.wav']).join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <Music className="w-6 h-6 mx-auto text-zinc-500 mb-2" />
        <p className="text-sm text-zinc-400">拖入或点击添加参考音频</p>
        <p className="text-xs text-zinc-600 mt-1">
          支持 {(accept.length ? accept : ['.mp3', '.wav']).join(' / ')}，每条音频映射为{' '}
          <span className="font-mono text-cyan-300">&lt;Audio N&gt;</span>
        </p>
      </div>

      {refs.length > 0 && !canHear && (
        <p className="text-xs text-amber-300/80 leading-relaxed">
          当前模型不支持直接听音频，音频不会上传，只会按你选择的引用角色写进 H3 提示词。
          想让模型真的听内容，请换 Gemini 或带 audio / omni 的模型。
        </p>
      )}
      {refs.length > 0 && canHear && (
        <p className="text-xs text-emerald-300/80">
          当前模型支持音频输入，音频会转码为单声道 mp3（最长 2 分钟）一起发给模型。
        </p>
      )}

      <AnimatePresence initial={false}>
        {refs.map((ref, idx) => (
          <motion.div
            key={`${ref.file.name}-${idx}`}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center gap-2.5">
              <AudioLines className="w-4 h-4 text-cyan-300 shrink-0" />
              <span className="text-xs font-mono text-cyan-300 shrink-0">
                &lt;Audio {idx + 1}&gt;
              </span>
              <span className="text-xs text-zinc-400 truncate">{ref.file.name}</span>
              <span className="text-[11px] text-zinc-600 font-mono ml-auto shrink-0">
                {(ref.file.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <button
                onClick={() => remove(idx)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-300 hover:bg-white/[0.05] transition-all shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5">
              <select
                value={ref.role}
                onChange={(e) => update(idx, { role: e.target.value })}
                className="input-dark w-full text-sm"
              >
                {roles.map((r) => (
                  <option key={r.key} value={r.key} className="bg-zinc-900">
                    {r.label}
                  </option>
                ))}
              </select>
              <input
                value={ref.notes}
                onChange={(e) => update(idx, { notes: e.target.value })}
                placeholder="补充说明，如：只用前 5 秒的鼓点"
                className="input-dark w-full text-sm"
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {refs.length > 0 && (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 bg-white/[0.03] border border-white/[0.04] transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          再加一条音频
        </button>
      )}
    </div>
  )
}
