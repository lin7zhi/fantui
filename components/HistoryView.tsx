'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History, Copy, Check, Trash2, RefreshCw, Loader2, AlertCircle,
  ScanSearch, Sparkles, Film, Clapperboard, LogIn, ChevronDown, Clock,
} from 'lucide-react'
import {
  fetchRecords, fetchRecord, deleteRecord, clearRecords,
  type PromptRecord, type RecordKind, type RecordStats,
} from '@/lib/api'
import { useAuth } from '@/lib/useAuth'

interface Props {
  onRequireLogin: () => void
}

const KIND_META: Record<RecordKind, { label: string; icon: typeof ScanSearch; color: string }> = {
  analyze: { label: '图像反推', icon: ScanSearch, color: 'text-purple-300' },
  expand: { label: '标签扩写', icon: Sparkles, color: 'text-indigo-300' },
  theater: { label: '剧场分幕', icon: Clapperboard, color: 'text-amber-300' },
  h3: { label: 'H3 视频', icon: Film, color: 'text-cyan-300' },
}

const FILTERS: { key: RecordKind | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'analyze', label: '反推' },
  { key: 'expand', label: '扩写' },
  { key: 'theater', label: '剧场' },
  { key: 'h3', label: 'H3' },
]

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleString('zh-CN', { hour12: false })
}

function remainingText(expiresAt: number) {
  const ms = expiresAt * 1000 - Date.now()
  if (ms <= 0) return '即将清除'
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  return hours > 0 ? `${hours} 小时 ${minutes} 分后清除` : `${minutes} 分后清除`
}

export function HistoryView({ onRequireLogin }: Props) {
  const { user, refresh: refreshAuth } = useAuth()
  const [filter, setFilter] = useState<RecordKind | 'all'>('all')
  const [records, setRecords] = useState<PromptRecord[]>([])
  const [stats, setStats] = useState<RecordStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, string>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) {
      setRecords([])
      setStats(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchRecords(filter === 'all' ? undefined : filter)
      setRecords(data.records)
      setStats(data.stats)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载失败')
      // token 失效时同步登录态，让界面回到未登录提示
      refreshAuth()
    } finally {
      setLoading(false)
    }
  }, [user, filter, refreshAuth])

  useEffect(() => { load() }, [load])

  const toggle = useCallback(async (rec: PromptRecord) => {
    if (openId === rec.id) {
      setOpenId(null)
      return
    }
    setOpenId(rec.id)
    if (expanded[rec.id]) return
    try {
      const data = await fetchRecord(rec.id)
      setExpanded((prev) => ({ ...prev, [rec.id]: data.record.output || '' }))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '记录已过期')
      load()
    }
  }, [openId, expanded, load])

  const copy = useCallback(async (rec: PromptRecord) => {
    let text = expanded[rec.id]
    if (!text) {
      try {
        const data = await fetchRecord(rec.id)
        text = data.record.output || ''
        setExpanded((prev) => ({ ...prev, [rec.id]: text }))
      } catch {
        text = rec.preview || ''
      }
    }
    navigator.clipboard.writeText(text)
    setCopiedId(rec.id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [expanded])

  const remove = useCallback(async (id: string) => {
    try {
      await deleteRecord(id)
      setRecords((prev) => prev.filter((r) => r.id !== id))
      refreshAuth()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }, [refreshAuth])

  const clearAll = useCallback(async () => {
    if (!window.confirm(filter === 'all' ? '清空全部记录？' : '清空该分类的记录？')) return
    try {
      await clearRecords(filter === 'all' ? undefined : filter)
      await load()
      refreshAuth()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '清空失败')
    }
  }, [filter, load, refreshAuth])

  const counts = useMemo(() => stats?.by_kind ?? {}, [stats])

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="glass rounded-2xl p-10 text-center space-y-4"
      >
        <History className="w-10 h-10 mx-auto text-zinc-600" />
        <p className="text-sm text-zinc-400">
          登录后才会记录你的反推、扩写、剧场和 H3 结果，每个账号的记录互相独立，保留 24 小时。
        </p>
        <button
          onClick={onRequireLogin}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #a855f7, #22d3ee)' }}
        >
          <LogIn className="w-4 h-4" />
          登录 / 注册
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <div className="glass rounded-2xl p-5 border-l-2 border-emerald-500/30 flex items-start gap-3">
        <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-sm text-zinc-400 leading-relaxed">
          <span className="text-zinc-200">{user.username}</span> 的词记录：反推、扩写、剧场分幕、H3
          全部自动留档，仅保留 24 小时，过期自动清除。当前共{' '}
          <span className="text-emerald-300 font-mono">{stats?.total ?? records.length}</span> 条。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key
          const count = f.key === 'all' ? stats?.total : counts[f.key]
          return (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setOpenId(null) }}
              className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                active
                  ? 'bg-white/[0.08] border-white/[0.12] text-zinc-100'
                  : 'bg-white/[0.02] border-white/[0.04] text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f.label}
              {typeof count === 'number' && count > 0 && (
                <span className="ml-1.5 font-mono text-zinc-500">{count}</span>
              )}
            </button>
          )
        })}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 bg-white/[0.03] border border-white/[0.04] transition-all"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            刷新
          </button>
          <button
            onClick={clearAll}
            disabled={!records.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-red-300/80 hover:text-red-200 bg-red-500/[0.06] border border-red-500/[0.12] disabled:opacity-30 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空
          </button>
        </div>
      </div>

      {error && (
        <div className="glass rounded-2xl p-4 border-red-500/20 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {!loading && records.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center text-sm text-zinc-500">
          暂无记录，去生成一条试试。
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {records.map((rec) => {
            const meta = KIND_META[rec.kind] ?? KIND_META.expand
            const Icon = meta.icon
            const open = openId === rec.id
            return (
              <motion.div
                key={rec.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="glass rounded-2xl overflow-hidden"
              >
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${meta.color} shrink-0`} />
                    <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                    <span className="text-xs text-zinc-600 font-mono">{formatTime(rec.created_at)}</span>
                    <span className="text-[11px] text-zinc-600 ml-auto hidden sm:inline">
                      {remainingText(rec.expires_at)}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-300 truncate">
                    {rec.title || rec.input || '(无标题)'}
                  </p>

                  {!open && rec.preview && (
                    <p className="text-xs text-zinc-500 font-mono line-clamp-2 whitespace-pre-wrap">
                      {rec.preview}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => toggle(rec)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 bg-white/[0.03] border border-white/[0.04] transition-all"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                      {open ? '收起' : '展开全文'}
                    </button>
                    <button
                      onClick={() => copy(rec)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 bg-white/[0.03] border border-white/[0.04] transition-all"
                    >
                      {copiedId === rec.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copiedId === rec.id ? '已复制' : '复制'}
                    </button>
                    <button
                      onClick={() => remove(rec.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-300/70 hover:text-red-200 bg-red-500/[0.05] border border-red-500/[0.1] transition-all ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      删除
                    </button>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-white/[0.04]"
                    >
                      <div className="p-4 space-y-3">
                        {rec.input && (
                          <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-wider text-zinc-600">输入</p>
                            <p className="text-xs text-zinc-400 font-mono whitespace-pre-wrap">{rec.input}</p>
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-wider text-zinc-600">输出</p>
                          <p className="text-sm text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap">
                            {expanded[rec.id] ?? '加载中...'}
                          </p>
                        </div>
                        {Object.keys(rec.meta || {}).length > 0 && (
                          <p className="text-[11px] text-zinc-600 font-mono break-all">
                            {JSON.stringify(rec.meta)}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
