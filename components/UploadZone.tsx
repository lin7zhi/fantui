'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ImagePlus, X, FileArchive, ClipboardPaste } from 'lucide-react'

interface Props {
  files: File[]
  onChange: (files: File[]) => void
}

export function UploadZone({ files, onChange }: Props) {
  const [dragging, setDragging] = useState(false)
  const [pasteHint, setPasteHint] = useState(false)
  const [pasteFlash, setPasteFlash] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const pasteCounterRef = useRef(0)

  const handleFiles = useCallback(
    (incoming: FileList | File[]) => {
      const arr = Array.from(incoming).filter(
        (f) =>
          f.type.startsWith('image/') ||
          f.name.toLowerCase().endsWith('.zip'),
      )
      onChange([...files, ...arr])
    },
    [files, onChange],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const images: File[] = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            pasteCounterRef.current += 1
            const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
            const renamed = new File(
              [file],
              `pasted-${Date.now()}-${pasteCounterRef.current}.${ext}`,
              { type: file.type },
            )
            images.push(renamed)
          }
        }
      }
      if (images.length) {
        e.preventDefault()
        onChange([...files, ...images])
        setPasteFlash(true)
        setTimeout(() => setPasteFlash(false), 1200)
        setPasteHint(false)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [files, onChange])

  const handlePasteClick = useCallback(() => {
    setPasteHint(true)
    setTimeout(() => setPasteHint(false), 4000)
  }, [])

  const removeFile = useCallback(
    (idx: number) => {
      onChange(files.filter((_, i) => i !== idx))
    },
    [files, onChange],
  )

  const previews = files.slice(0, 12)

  return (
    <div className="space-y-4">
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 ${
          dragging
            ? 'border-purple-500/60 bg-purple-500/[0.04]'
            : 'border-white/[0.08] hover:border-white/[0.15] bg-white/[0.01] hover:bg-white/[0.02]'
        } ${files.length === 0 ? 'py-16' : 'py-8'}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.zip"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
              dragging ? 'bg-purple-500/20 text-purple-400' : 'bg-white/[0.04] text-zinc-500'
            }`}
          >
            {dragging ? <ImagePlus className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-300">
              {dragging ? '松开鼠标上传' : '拖拽图片或 ZIP 压缩包到此处'}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              支持 JPG、PNG、WebP、BMP、GIF 或 .zip 压缩包
            </p>
          </div>

          <div className="flex items-center gap-3 mt-1">
            <div className="h-px w-10 bg-white/[0.06]" />
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest">或</span>
            <div className="h-px w-10 bg-white/[0.06]" />
          </div>

          <motion.button
            type="button"
            onClick={(e) => { e.stopPropagation(); handlePasteClick() }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
              pasteFlash
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] hover:border-white/[0.15]'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            {pasteFlash ? '已粘贴' : '粘贴图片'}
            <kbd className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-zinc-500 border border-white/[0.06]">
              Ctrl+V
            </kbd>
          </motion.button>

          <AnimatePresence>
            {pasteHint && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[11px] text-purple-400/80"
              >
                请按 Ctrl + V 粘贴剪贴板中的图片
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 font-medium">
            已选择 {files.length} 个文件
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {previews.map((file, idx) => (
              <motion.div
                key={`${file.name}-${idx}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="group relative glass rounded-xl overflow-hidden"
              >
                {file.type.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center bg-white/[0.02]">
                    <FileArchive className="w-8 h-8 text-zinc-600" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-[10px] text-zinc-400 truncate">{file.name}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(idx) }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
            {files.length > 12 && (
              <div className="glass rounded-xl flex items-center justify-center aspect-square text-zinc-500 text-sm">
                还有 {files.length - 12} 个
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
