'use client'

import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, LogIn, UserPlus, Loader2, AlertCircle, KeyRound, User } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'

interface Props {
  open: boolean
  onClose: () => void
}

export function AuthDialog({ open, onClose }: Props) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(async () => {
    setError(null)
    if (!username.trim() || !password) {
      setError('请输入用户名和密码')
      return
    }
    if (mode === 'register' && password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') await login(username.trim(), password)
      else await register(username.trim(), password)
      setPassword('')
      setConfirm('')
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }, [mode, username, password, confirm, login, register, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[90] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm"
          >
            <div className="glass rounded-3xl p-6 space-y-5 bg-[#0a0a0a]/95">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-100">
                  {mode === 'login' ? '登录账号' : '注册账号'}
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-500 leading-relaxed">
                登录后反推、扩写、H3 的生成结果会自动记录到你自己的账号下，记录保留 24 小时后自动清除。
              </p>

              <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03]">
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError(null) }}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      mode === m ? 'bg-white/[0.08] text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {m === 'login' ? '登录' : '注册'}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="用户名"
                    autoComplete="username"
                    className="input-dark w-full pl-10"
                  />
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
                    placeholder="密码（至少 6 位）"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="input-dark w-full pl-10"
                  />
                </div>
                {mode === 'register' && (
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
                      placeholder="确认密码"
                      autoComplete="new-password"
                      className="input-dark w-full pl-10"
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={submit}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-40 transition-all"
                style={{ background: 'linear-gradient(135deg, #a855f7, #22d3ee)' }}
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === 'login' ? (
                  <LogIn className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {mode === 'login' ? '登录' : '注册并登录'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
