'use client'

import { useCallback, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, ImagePlus, X, FileArchive } from 'lucide-react'

interface Props {
  files: File[]
  onChange: (files: File[]) => void
}

export function UploadZone({ files, onChange }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const removeFile = useCallback(
    (idx: number) => {
      onChange(files.filter((_, i) => i !== idx))
    },
    [files, onChange],
  )

  const previews = files.slice(0, 12)

  return (
    <div className="space-y-4">
      {/* Drop zone */}
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
              {dragging ? 'Drop files here' : 'Drop images or ZIP archive'}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              JPG, PNG, WebP, BMP, GIF or .zip
            </p>
          </div>
        </div>
      </motion.div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 font-medium">
            {files.length} file{files.length > 1 ? 's' : ''} selected
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
                +{files.length - 12} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

