"use client"

import { memo } from "react"
import { usePSelector } from "@/lib/context"

export const AmbientBackground = memo(function AmbientBackground() {
  const accentColor = usePSelector((v) => v.accentColor)

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none aria-hidden:true contain-paint">
      {/* Noise Texture Layer */}
      <div className="noise-overlay" />

      {/* Dynamic Smooth Motion Blobs */}
      <div className="absolute inset-0 overflow-hidden opacity-80 transition-opacity duration-1000">
        {/* Blob 1: Top Left Glowing Accent */}
        <div
          className="ambient-blob-1 absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full blur-[64px] opacity-25 transform-gpu"
          style={{
            background: accentColor
              ? `radial-gradient(circle, ${accentColor} 0%, rgba(99, 102, 241, 0.4) 60%, transparent 100%)`
              : "radial-gradient(circle, rgba(99, 102, 241, 0.45) 0%, rgba(168, 85, 247, 0.3) 50%, transparent 100%)",
          }}
        />

        {/* Blob 2: Bottom Right Warm Accent */}
        <div
          className="ambient-blob-2 absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full blur-[72px] opacity-20 transform-gpu"
          style={{
            background: "radial-gradient(circle, rgba(236, 72, 153, 0.35) 0%, rgba(249, 115, 22, 0.25) 60%, transparent 100%)",
          }}
        />

        {/* Blob 3: Center Subtly Floating Mesh Glow */}
        <div
          className="ambient-blob-3 absolute top-[30%] left-[25%] w-[45vw] h-[45vw] max-w-[600px] max-h-[600px] rounded-full blur-[60px] opacity-15 transform-gpu"
          style={{
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.2) 70%, transparent 100%)",
          }}
        />
      </div>
    </div>
  )
})
