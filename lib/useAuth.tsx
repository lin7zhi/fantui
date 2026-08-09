'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import {
  fetchMe, login as loginApi, logout as logoutApi, register as registerApi,
  type RecordStats,
} from '@/lib/api'
import {
  clearSession, getStoredUser, getToken, saveSession, type AuthUser,
} from '@/lib/auth'

interface AuthContextValue {
  user: AuthUser | null
  stats: RecordStats | null
  ready: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [stats, setStats] = useState<RecordStats | null>(null)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setStats(null)
      return
    }
    try {
      const data = await fetchMe()
      setUser(data.user)
      setStats(data.stats)
    } catch {
      clearSession()
      setUser(null)
      setStats(null)
    }
  }, [])

  useEffect(() => {
    setUser(getStoredUser())
    refresh().finally(() => setReady(true))
  }, [refresh])

  const login = useCallback(async (username: string, password: string) => {
    const data = await loginApi(username, password)
    saveSession(data.token, data.user)
    setUser(data.user)
    await refresh()
  }, [refresh])

  const register = useCallback(async (username: string, password: string) => {
    const data = await registerApi(username, password)
    saveSession(data.token, data.user)
    setUser(data.user)
    await refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } catch {
      /* 忽略网络错误，本地照样退出 */
    }
    clearSession()
    setUser(null)
    setStats(null)
  }, [])

  const value = useMemo(
    () => ({ user, stats, ready, login, register, logout, refresh }),
    [user, stats, ready, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
