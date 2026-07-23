'use client'

import { motion } from 'framer-motion'
import { Settings, Github, Cpu } from 'lucide-react'

interface NavbarProps {
  onSettingsToggle: () => void
}

export function Navbar({ onSettingsToggle }: NavbarProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-zinc-200">
            Prompt Engine
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-all duration-200"
          >
            <Github className="w-[18px] h-[18px]" />
          </a>
          <button
            onClick={onSettingsToggle}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-all duration-200"
          >
            <Settings className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </motion.header>
  )
}

