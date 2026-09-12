'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Film, Copy, Check, Loader2, AlertCircle, ShieldAlert } from 'lucide-react'
import type { Settings } from '@/types'
import { UploadZone } from '@/components/UploadZone'
import { AudioRefZone } from '@/components/AudioRefZone'
import { VideoRefZone } from '@/components/VideoRefZone'
import {
  fetchH3Modes, fetchH3AudioRoles, generateH3Video, modelSupportsAudio,
  type H3Mode, type H3AudioRole, type H3AudioRef,
} from '@/lib/api'
import { useAuth } from '@/lib/useAuth'

interface Props {
  settings: Settings
}

const MIN_DURATION = 2
const MAX_DURATION = 20
const DURATION_PRESETS = [5, 10, 15, 20]

const FALLBACK_AUDIO_ROLES: H3AudioRole[] = [
  { key: 'voice', label: '音色参考（配音/说话人）' },
  { key: 'dialogue', label: '台词/歌词复用' },
  { key: 'bgm', label: '配乐风格参考' },
  { key: 'bgm_copy', label: '配乐直接复用' },
  { key: 'ambience', label: '环境声/氛围层' },
  { key: 'sfx', label: '音效质感参考' },
  { key: 'rhythm', label: '节奏/卡点参考' },
  { key: 'full_copy', label: '整轨 1:1 复用' },
]

const FALLBACK_AUDIO_EXTS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.opus', '.flac']

const FALLBACK_MODES: H3Mode[] = [
  { key: 'ref2va', label: '参考图生视频 (Ref2VA)' },
  { key: 'i2va', label: '首帧生视频 (I2VA)' },
  { key: 'fl2va', label: '首尾帧生视频 (FL2VA)' },
  { key: 'l2va', label: '尾帧生视频 (L2VA)' },
  { key: 't2va', label: '文本生视频 (T2VA)' },
]

export function H3View({ settings }: Props) {
  const { user, refresh: refreshAuth } = useAuth()
  const [modes, setModes] = useState<H3Mode[]>(FALLBACK_MODES)
  const [mode, setMode] = useState('ref2va')
  const [files, setFiles] = useState<File[]>([])
  const [videoFiles, setVideoFiles] = useState<File[]>([])
  const [audioRefs, setAudioRefs] = useState<H3AudioRef[]>([])
  const [audioRoles, setAudioRoles] = useState<H3AudioRole[]>(FALLBACK_AUDIO_ROLES)
  const [defaultAudioRole, setDefaultAudioRole] = useState('bgm')
  const [audioAccept, setAudioAccept] = useState<string[]>(FALLBACK_AUDIO_EXTS)
  const [audioHeard, setAudioHeard] = useState<boolean | null>(null)
  const [brief, setBrief] = useState('')
  const [duration, setDuration] = useState(5)
  const [nsfw, setNsfw] = useState(settings.nsfwMode)
  const [result, setResult] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchH3Modes()
      .then((m) => { if (m.length) setModes(m) })
      .catch(() => {})
    fetchH3AudioRoles()
      .then((data) => {
        if (data.roles?.length) setAudioRoles(data.roles)
        if (data.default) setDefaultAudioRole(data.default)
        if (data.accept?.length) setAudioAccept(data.accept)
      })
      .catch(() => {})
  }, [])

  const canHearAudio = modelSupportsAudio(settings.provider, settings.model)

  const handleGenerate = useCallback(async () => {
    if (mode !== 't2va' && files.length === 0) {
      setError('请先上传参考图（T2VA 模式除外）')
      return
    }
    setProcessing(true)
    setError(null)
    setResult('')
    setAudioHeard(null)
    try {
      const imageFiles = files.filter((f) => f.type.startsWith('image/'))
      const res = await generateH3Video(imageFiles, {
        mode,
        brief,
        duration,
        settings: { ...settings, nsfwMode: nsfw },
        audioRefs,
        videoFiles,
      })
      setResult(res.result)
      setAudioHeard(res.audioCount > 0 ? res.audioHeard : null)
      if (res.duration && Math.abs(res.duration - duration) > 0.01) {
        setDuration(res.duration)
      }
      if (user) refreshAuth()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      setProcessing(false)
    }
  }, [mode, files, videoFiles, brief, duration, nsfw, settings, audioRefs, user, refreshAuth])

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
      className="space-y-6 sm:space-y-8"
    >
      {/* 说明 */}
      <div className="glass rounded-2xl p-4 sm:p-5 border-l-2 border-cyan-500/30">
        <p className="text-sm text-zinc-400 leading-relaxed">
          上传参考视频、参考图 / 参考音频并描述剧情，基于 MiniMax H3 提示词规范生成结构化视频提示词。
          Ref2VA 会把每张图映射为 <span className="font-mono text-cyan-300">&lt;Picture N&gt;</span>、
          每条音频映射为 <span className="font-mono text-cyan-300">&lt;Audio N&gt;</span>，
          输出 <span className="font-mono text-cyan-300 break-all">subject_definitions / summary / retention_analysis / detailed_description / overall_soundscape / non_diegetic_music</span> 六段。
        </p>
      </div>

      {/* 模式 + 时长 */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300 block">H3 模式</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="input-dark w-full text-sm"
          >
            {modes.map((m) => (
              <option key={m.key} value={m.key} className="bg-zinc-900">
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300 block">
            视频时长：<span className="text-cyan-300 font-mono">{duration.toFixed(1)}s</span>
            <span className="text-xs text-zinc-600 ml-2">支持 2~20 秒</span>
          </label>
          <input
            type="range"
            min={MIN_DURATION}
            max={MAX_DURATION}
            step={0.5}
            value={duration}
            onChange={(e) => setDuration(parseFloat(e.target.value))}
            className="w-full accent-cyan-500"
          />
          <div className="flex flex-wrap gap-1.5">
            {DURATION_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                  duration === d
                    ? 'border-cyan-500/40 bg-cyan-500/[0.08] text-cyan-200'
                    : 'border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 破限开关 */}
      <button
        type="button"
        onClick={() => setNsfw((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 border transition-all ${
          nsfw
            ? 'border-rose-500/40 bg-rose-500/[0.06]'
            : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
        }`}
      >
        <span className="flex items-center gap-3 min-w-0">
          <ShieldAlert className={`w-5 h-5 shrink-0 ${nsfw ? 'text-rose-400' : 'text-zinc-500'}`} />
          <span className="text-left">
            <span className={`block text-sm font-medium ${nsfw ? 'text-rose-200' : 'text-zinc-300'}`}>
              破限模式 (18+)
            </span>
            <span className="block text-xs text-zinc-500">
              成人参考图走破限：反回避、直白露骨、不淡出、不隐喻
            </span>
          </span>
        </span>
        <span
          className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${
            nsfw ? 'bg-rose-500/70' : 'bg-white/[0.12]'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              nsfw ? 'translate-x-5' : ''
            }`}
          />
        </span>
      </button>

      {/* 参考图上传 */}
      {mode !== 't2va' && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-300 block">参考图</label>
          <UploadZone files={files} onChange={setFiles} />
        </div>
      )}

      {/* 参考音频 */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300 block">
          参考音频
          <span className="text-xs text-zinc-600 ml-2 font-normal">可选，可多条</span>
        </label>
        <AudioRefZone
          refs={audioRefs}
          onChange={setAudioRefs}
          roles={audioRoles}
          defaultRole={defaultAudioRole}
          accept={audioAccept}
          canHear={canHearAudio}
        />
        {audioRefs.length > 0 && mode !== 'ref2va' && (
          <p className="text-xs text-zinc-500 leading-relaxed">
            {mode.toUpperCase()} 模式的规范里没有 <span className="font-mono">&lt;Audio N&gt;</span> 标签，
            音频特征会被写进 integrated_multimodal_description / overall_soundscape / non_diegetic_music。
          </p>
        )}
      </div>

      {/* 参考视频 */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300 block">
          参考视频
          <span className="text-xs text-zinc-600 ml-2 font-normal">可选，可多条</span>
        </label>
        <VideoRefZone files={videoFiles} onChange={setVideoFiles} />
        <p className="text-xs text-zinc-600">
          会参考镜头顺序、动作连续性、镜头运动、剪辑节奏和时间结构；当前不支持 Claude 视频输入。
        </p>
      </div>

      {/* 剧情输入 */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300 block">剧情 / 动作描述</label>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="例如：POV 视角过马路，狂按喇叭，半挂大卡车迎面撞来，最后黑屏，一镜到底无切画面"
          rows={4}
          className="input-dark w-full resize-none font-mono text-sm"
        />
      </div>

      {/* 按钮 */}
      <div className="flex justify-center">
        <motion.button
          onClick={handleGenerate}
          disabled={processing}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
            boxShadow: '0 8px 32px rgba(6,182,212,0.3)',
          }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2.5">
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Film className="w-5 h-5" />
                生成视频提示词
              </>
            )}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      </div>

      {/* 错误 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl p-4 sm:p-5 border-red-500/20 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300 whitespace-pre-wrap">{error}</p>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-zinc-300">
                H3 视频提示词
                {user && (
                  <span className="ml-2 text-xs font-normal text-emerald-400/70">已存入词记录 · 24h</span>
                )}
                {audioHeard !== null && (
                  <span className={`ml-2 text-xs font-normal ${audioHeard ? 'text-cyan-400/70' : 'text-amber-400/70'}`}>
                    {audioHeard ? '音频已送入模型' : '音频仅写入提示词'}
                  </span>
                )}
              </h3>
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
            <div className="glass rounded-2xl p-4 sm:p-6">
              <p className="text-sm text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap break-words">
                {result}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
