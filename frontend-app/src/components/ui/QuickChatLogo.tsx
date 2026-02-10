import React from 'react'
import { Bot } from 'lucide-react'

export const QuickChatLogo: React.FC<{ size?: number; className?: string }> = ({ size = 44, className }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-500 shadow-lg shadow-primary/35 ${className ?? ''}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Bot color="white" size={Math.max(16, Math.round(size * 0.48))} strokeWidth={2.2} />
      <span
        className="absolute rounded-full bg-white/80"
        style={{ width: Math.max(5, Math.round(size * 0.14)), height: Math.max(5, Math.round(size * 0.14)), top: Math.max(4, Math.round(size * 0.12)), right: Math.max(4, Math.round(size * 0.14)) }}
      />
    </div>
  )
}
