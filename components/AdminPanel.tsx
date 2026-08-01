'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldCheck, Plus, Trash2, RefreshCw, ChevronDown } from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'
import type { AdminConfig, FetchedProviderModels } from '@/types'
import {
  adminFetchConfig, adminUpsertProvider, adminDeleteProvider,
  adminSetDisabled, adminSetModels, fetchAllModels,
} from '@/lib/api'

interface Props {
  open: boolean
  onClose: () => void
}

const EMPTY_FORM = { key: '', label: '', type: 'openai', base_url: '', api_key: '', model: '' }

export function AdminPanel({ open, onClose }: Props) {
  const [token, setToken] = useState('')
  const [authed, setAuthed] = useState(false)
  const [cfg, setCfg] = useState<AdminConfig | null>(null)
  const [status, setStatus] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fetched, setFetched] = useState<Record<string, FetchedProviderModels> | null>(null)
  const [checked, setChecked] = useState<Record<string, Set<string>>>({})

  const refresh = useCallback(async (t: string) => {
    const c = await adminFetchConfig(t)
    setCfg(c)
    setAuthed(true)
  }, [])

  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem('fantui_admin_token') || ''
      setToken(saved)
      if (saved) {
        refresh(saved).catch(() => setStatus('已保存的令牌无效，请重新输入'))
      }
    }
  }, [open, refresh])

  const login = useCallback(async () => {
    try {
      setStatus('验证中...')
      await refresh(token)
      localStorage.setItem('fantui_admin_token', token)
      setStatus('')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : '验证失败')
    }
  }, [token, refresh])

  const run = useCallback(
    async (fn: () => Promise<unknown>, okMsg: string) => {
      try {
        setStatus('处理中...')
        await fn()
        await refresh(token)
        setStatus(okMsg)
      } catch (e) {
        setStatus(e instanceof Error ? e.message : '操作失败')
      }
    },
    [token, refresh],
  )

  const addProvider = useCallback(() => {
    if (!form.key.trim() || !form.label.trim()) {
      setStatus('请填写供应商标识和名称')
      return
    }
    run(() => adminUpsertProvider(token, { ...form, key: form.key.trim() }), '已添加供应商').then(
      () => {
        setForm(EMPTY_FORM)
        setAddOpen(false)
      },
    )
  }, [form, token, run])

  const loadAllModels = useCallback(async () => {
    try {
      setStatus('正在从各供应商获取...')
      const result = await fetchAllModels({}, token)
      setFetched(result)
      const sel: Record<string, Set<string>> = {}
      for (const [p, info] of Object.entries(result)) {
        const allowed = cfg?.allowed_models[p]
        sel[p] = allowed ? new Set(allowed.filter((m) => info.models.includes(m))) : new Set(info.models)
      }
      setChecked(sel)
      setStatus('获取完成，勾选后保存即仅允许这些模型；全选 = 不限制')
    } catch {
      setStatus('获取失败')
    }
  }, [token, cfg])

  const toggleModel = useCallback((prov: string, m: string) => {
    setChecked((prev) => {
      const s = new Set(prev[prov] ?? [])
      if (s.has(m)) s.delete(m)
      else s.add(m)
      return { ...prev, [prov]: s }
    })
  }, [])

  const savePerms = useCallback(() => {
    if (!fetched) return
    const allowed: Record<string, string[]> = {}
    for (const [p, info] of Object.entries(fetched)) {
      const sel = checked[p] ?? new Set<string>()
      if (sel.size < info.models.length) allowed[p] = [...sel]
    }
    run(() => adminSetModels(token, allowed), '模型权限已保存')
  }, [fetched, checked, token, run])

  const labels: Record<string, string> = {}
  if (cfg) {
    for (const b of cfg.builtin) labels[b.value] = b.label
    for (const [k, v] of Object.entries(cfg.custom_providers)) labels[k] = v.label
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="fixed inset-x-4 top-[5vh] bottom-[5vh] md:inset-x-0 md:max-w-lg md:mx-auto z-[90] bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <h2 className="text-base font-semibold text-zinc-200">管理员设置</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {!authed ? (
                <div className="space-y-3 pt-4">
                  <p className="text-xs text-zinc-500">
                    输入管理员令牌（后端 ADMIN_TOKEN 环境变量）
                  </p>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && login()}
                    placeholder="管理员令牌"
                    className="input-dark w-full"
                  />
                  <button
                    onClick={login}
                    className="w-full px-3 py-2.5 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-300 text-sm font-medium hover:bg-purple-500/25 transition-all"
                  >
                    进入管理
                  </button>
                </div>
              ) : (
                cfg && (
                  <>
                    {/* 供应商管理 */}
                    <section className="space-y-2">
                      <p className="text-sm font-medium text-zinc-400 tracking-wider">供应商管理</p>
                      {cfg.builtin.map((b) => (
                        <div
                          key={b.value}
                          className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5"
                        >
                          <span className={`text-xs ${b.disabled ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
                            {b.label}
                            <span className="text-zinc-600 ml-1.5">{b.value}</span>
                          </span>
                          <button
                            onClick={() =>
                              run(() => adminSetDisabled(token, b.value, !b.disabled), b.disabled ? '已启用' : '已禁用')
                            }
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                              b.disabled
                                ? 'border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/10'
                                : 'border-red-500/25 text-red-300 hover:bg-red-500/10'
                            }`}
                          >
                            {b.disabled ? '启用' : '禁用'}
                          </button>
                        </div>
                      ))}
                      {Object.entries(cfg.custom_providers).map(([k, v]) => (
                        <div
                          key={k}
                          className="flex items-center justify-between rounded-xl border border-purple-500/15 bg-purple-500/[0.04] px-3.5 py-2.5"
                        >
                          <span className="text-xs text-zinc-300 min-w-0 truncate">
                            {v.label}
                            <span className="text-zinc-600 ml-1.5">
                              {k} · {v.type}
                            </span>
                          </span>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => run(() => adminDeleteProvider(token, k), '已删除')}
                              className="text-xs px-2.5 py-1 rounded-lg border border-red-500/25 text-red-300 hover:bg-red-500/10 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => setAddOpen(!addOpen)}
                        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors pt-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        添加供应商
                        <ChevronDown className={`w-3 h-3 transition-transform ${addOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {addOpen && (
                        <div className="space-y-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5">
                          <div className="flex gap-2">
                            <input
                              value={form.key}
                              onChange={(e) => setForm({ ...form, key: e.target.value })}
                              placeholder="标识，如 gcli"
                              className="input-dark flex-1 min-w-0"
                            />
                            <input
                              value={form.label}
                              onChange={(e) => setForm({ ...form, label: e.target.value })}
                              placeholder="显示名"
                              className="input-dark flex-1 min-w-0"
                            />
                          </div>
                          <select
                            value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value })}
                            className="input-dark w-full"
                          >
                            <option value="openai">OpenAI 兼容</option>
                            <option value="gemini">Gemini</option>
                            <option value="claude">Claude</option>
                          </select>
                          <input
                            value={form.base_url}
                            onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                            placeholder="接口地址（OpenAI 兼容必填）"
                            className="input-dark w-full"
                          />
                          <input
                            value={form.api_key}
                            onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                            placeholder="API 密钥（可留空，由用户填）"
                            className="input-dark w-full"
                          />
                          <input
                            value={form.model}
                            onChange={(e) => setForm({ ...form, model: e.target.value })}
                            placeholder="默认模型（可留空）"
                            className="input-dark w-full"
                          />
                          <button
                            onClick={addProvider}
                            className="w-full px-3 py-2 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-300 text-xs font-medium hover:bg-purple-500/25 transition-all"
                          >
                            添加
                          </button>
                        </div>
                      )}
                    </section>

                    {/* 模型权限 */}
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-zinc-400 tracking-wider">模型权限</p>
                        <button
                          onClick={loadAllModels}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-zinc-200 transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          获取全部模型
                        </button>
                      </div>
                      <p className="text-xs text-zinc-600">
                        取消勾选的模型将对用户隐藏并禁止使用；某供应商全选即不限制。
                      </p>
                      {fetched && (
                        <>
                          <div className="space-y-2">
                            {Object.entries(fetched).map(([prov, info]) => (
                              <div
                                key={prov}
                                className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"
                              >
                                <p className="text-xs font-medium text-zinc-400 mb-2">
                                  {labels[prov] || prov}
                                  {info.models.length > 0 && (
                                    <span className="text-zinc-600">
                                      （{checked[prov]?.size ?? 0}/{info.models.length}）
                                    </span>
                                  )}
                                </p>
                                {info.error ? (
                                  <p className="text-xs text-red-400/80 break-all">{info.error}</p>
                                ) : (
                                  <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {info.models.map((m) => (
                                      <label
                                        key={m}
                                        className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked[prov]?.has(m) ?? false}
                                          onChange={() => toggleModel(prov, m)}
                                          className="accent-purple-500 shrink-0"
                                        />
                                        <span className="truncate">{m}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={savePerms}
                            className="w-full px-3 py-2 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-300 text-xs font-medium hover:bg-purple-500/25 transition-all"
                          >
                            保存模型权限
                          </button>
                        </>
                      )}
                    </section>
                  </>
                )
              )}
            </div>

            {status && (
              <div className="px-6 py-3 border-t border-white/[0.04]">
                <p className="text-xs text-zinc-500 break-all">{status}</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
