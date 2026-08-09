'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScanSearch, Sparkles, Film, History } from 'lucide-react'

import { Background } from '@/components/Background'
import { Navbar } from '@/components/Navbar'
import { SettingsDrawer } from '@/components/SettingsDrawer'
import { AnalyzeView } from '@/components/AnalyzeView'
import { ExpandView } from '@/components/ExpandView'
import { H3View } from '@/components/H3View'
import { HistoryView } from '@/components/HistoryView'
import { AuthDialog } from '@/components/AuthDialog'
import { DEFAULT_SETTINGS } from '@/types'
import type { Settings } from '@/types'

const TABS = [
  { key: 'analyze' as const, label: '图像反推', icon: ScanSearch },
  { key: 'expand' as const, label: '标签扩写', icon: Sparkles },
  { key: 'h3' as const, label: 'H3视频', icon: Film },
  { key: 'history' as const, label: '词记录', icon: History },
]

type TabKey = (typeof TABS)[number]['key']

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('analyze')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, top: 0, width: 0, height: 0 })

  useEffect(() => {
    const measure = () => {
      const idx = TABS.findIndex((t) => t.key === activeTab)
      const el = tabRefs.current[idx]
      if (el) {
        setIndicatorStyle({
          left: el.offsetLeft,
          top: el.offsetTop,
          width: el.offsetWidth,
          height: el.offsetHeight,
        })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeTab])

  return (
    <div className="min-h-screen relative noise-overlay">
      <Background />
      <Navbar
        onSettingsToggle={() => setSettingsOpen(true)}
        onAuthToggle={() => setAuthOpen(true)}
      />

      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-28 pb-20">
        {/* 主标题 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-none">
            <span className="gradient-text">视觉</span>
            <span className="text-zinc-500 mx-3 font-light">/</span>
            <span className="gradient-text">语言</span>
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-5 text-zinc-500 text-lg max-w-lg mx-auto leading-relaxed"
          >
            图像反推智能提示词，并发处理、断点续跑、标签扩写、H3 视频提示词，全部结果自动留档 24 小时
          </motion.p>
        </motion.div>

        {/* Tab 导航 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex justify-center mb-12"
        >
          <div className="relative inline-flex flex-wrap justify-center gap-1 p-1.5 rounded-2xl glass">
            <div
              className="absolute rounded-xl bg-white/[0.06] tab-indicator"
              style={{
                left: indicatorStyle.left,
                top: indicatorStyle.top,
                width: indicatorStyle.width,
                height: indicatorStyle.height,
              }}
            />

            {TABS.map((tab, idx) => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  ref={(el) => { tabRefs.current[idx] = el }}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative z-10 flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-medium transition-colors duration-200 ${
                    active ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Tab 内容 */}
        <AnimatePresence mode="wait">
          {activeTab === 'analyze' && (
            <AnalyzeView key="analyze" settings={settings} onSettingsChange={setSettings} />
          )}
          {activeTab === 'expand' && (
            <ExpandView key="expand" settings={settings} />
          )}
          {activeTab === 'h3' && (
            <H3View key="h3" settings={settings} />
          )}
          {activeTab === 'history' && (
            <HistoryView key="history" onRequireLogin={() => setAuthOpen(true)} />
          )}
        </AnimatePresence>
      </main>

      {/* 登录 / 注册 */}
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* 设置抽屉 */}
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={setSettings}
      />
    </div>
  )
}
