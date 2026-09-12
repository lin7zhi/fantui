'use client'

import { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Film, Plus, X, Video } from 'lucide-react'

interface Props {
  files: File[]
  onChange: (files: File[]) => void
}

const VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.m4v', '.mpeg', '.mpg']

export function VideoRefZone({ files, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const added = Array.from(incoming).filter((file) => {
      const typeOk = file.type.startsWith('video/')
      const extOk = VIDEO_EXTS.some((ext) => file.name.toLowerCase().endsWith(ext))
      return typeOk || extOk
    })
    if (added.length) onChange([...files, ...added])
  }, [files, onChange])

  const remove = useCallback((idx: number) => {
    onChange(files.filter((_, i) => i !== idx))
  }, [files, onChange])

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
        className={`rounded-2xl border border-dashed px-4 sm:px-5 py-5 sm:py-6 text-center cursor-pointer transition-all ${
          dragging
            ? 'border-cyan-500/50 bg-cyan-500/[0.05]'
            : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={VIDEO_EXTS.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <Film className="w-6 h-6 mx-auto text-zinc-500 mb-2" />
        <p className="text-sm text-zinc-400">拖入或点击添加参考视频</p>
        <p className="text-xs text-zinc-600 mt-1">
          支持 {VIDEO_EXTS.join(' / ')}，每条视频映射为 <span className="font-mono text-cyan-300">&lt;Video N&gt;</span>
        </p>
      </div>

      <AnimatePresence initial={false}>
        {files.map((file, idx) => (
          <motion.div
            key={`${file.name}-${file.size}-${idx}`}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-2xl p-3.5 sm:p-4"
          >
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <Video className="w-4 h-4 text-cyan-300 shrink-0" />
              <span className="text-xs font-mono text-cyan-300 shrink-0">&lt;Video {idx + 1}&gt;</span>
              <span className="text-xs text-zinc-400 truncate min-w-0 flex-1">{file.name}</span>
              <span className="text-[11px] text-zinc-600 font-mono shrink-0">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(idx) }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-300 hover:bg-white/[0.05] transition-all shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {files.length > 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 bg-white/[0.03] border border-white/[0.04] transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          再加一条视频
        </button>
      )}
    </div>
  )
}
