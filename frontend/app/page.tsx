'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScanSearch, Sparkles } from 'lucide-react'

import { Background } from '@/components/Background'
import { Navbar } from '@/components/Navbar'
import { SettingsDrawer } from '@/components/SettingsDrawer'
import { AnalyzeView } from '@/components/AnalyzeView'
import { ExpandView } from '@/components/ExpandView'
import { DEFAULT_SETTINGS } from '@/types'
import type { Settings } from '@/types'

const TABS = [
  { key: 'analyze' as const, label: 'Analyze', icon: ScanSearch },
  { key: 'expand' as const, label: 'Expand', icon: Sparkles },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState<'analyze' | 'expand'>('analyze')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  // Update tab indicator position
  useEffect(() => {
    const idx = TABS.findIndex((t) => t.key === activeTab)
    const el = tabRefs.current[idx]
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth })
    }
  }, [activeTab])

  return (
    <div className="min-h-screen relative noise-overlay">
      <Background />
      <Navbar onSettingsToggle={() => setSettingsOpen(true)} />

      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-28 pb-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-none">
            <span className="gradient-text">Vision</span>
            <span className="text-zinc-500 mx-3 font-light">/</span>
            <span className="gradient-text">Words</span>
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-5 text-zinc-500 text-lg max-w-lg mx-auto leading-relaxed"
          >
            Transform images into precise prompt descriptions. Concurrent processing, checkpoint
            resume, single-image fallback.
          </motion.p>
        </motion.div>

        {/* Tab navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex justify-center mb-12"
        >
          <div className="relative inline-flex gap-1 p-1.5 rounded-2xl glass">
            {/* Sliding indicator */}
            <div
              className="absolute top-1.5 h-[calc(100%-12px)] rounded-xl bg-white/[0.06] tab-indicator"
              style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
            />

            {TABS.map((tab, idx) => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  ref={(el) => { tabRefs.current[idx] = el }}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative z-10 flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-medium transition-colors duration-200 ${
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

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === 'analyze' ? (
            <AnalyzeView key="analyze" settings={settings} onSettingsChange={setSettings} />
          ) : (
            <ExpandView key="expand" settings={settings} />
          )}
        </AnimatePresence>
      </main>

      {/* Settings drawer */}
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={setSettings}
      />
    </div>
  )
}

