"use client"

import { CheckCircle2, ShieldCheck, Zap } from "lucide-react"

export function CompatiblePlatforms() {
  return (
    <section className="my-12 md:my-16 max-w-5xl mx-auto px-4">
      <div className="p-6 md:p-8 rounded-3xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 hover:border-white/20 transition-all duration-300 group">
        {/* Background Subtle Accent */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Left Info Column */}
        <div className="flex-1 text-center md:text-left z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Verified Integrations</span>
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-100 tracking-tight">
            Compatible Platforms
          </h2>
          <p className="text-xs md:text-sm text-zinc-400 mt-2 max-w-md leading-relaxed">
            Native support for leading media player setup with zero-latency catalog syncing and high-definition poster rendering.
          </p>
        </div>

        {/* Right Platform Box */}
        <div className="z-10 shrink-0 w-full md:w-auto">
          <div className="flex items-center justify-center gap-4 md:gap-8 p-4 md:p-6 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md shadow-inner">
            {/* Stremio */}
            <div className="flex flex-col items-center gap-2.5 group/item cursor-pointer">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 flex items-center justify-center group-hover/item:scale-105 group-hover/item:border-purple-500/40 group-hover/item:bg-purple-500/10 transition-all duration-300 shadow-lg relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icon/stremio.png"
                  alt="Stremio"
                  className="w-full h-full object-contain filter drop-shadow-md group-hover/item:drop-shadow-[0_0_12px_rgba(168,85,247,0.5)] transition-all"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-zinc-300 group-hover/item:text-white transition-colors">Stremio</span>
                <CheckCircle2 className="w-3 h-3 text-purple-400" />
              </div>
            </div>

            {/* Separator Divider */}
            <div className="w-px h-16 bg-white/10" />

            {/* Nuvio */}
            <div className="flex flex-col items-center gap-2.5 group/item cursor-pointer">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 flex items-center justify-center group-hover/item:scale-105 group-hover/item:border-cyan-500/40 group-hover/item:bg-cyan-500/10 transition-all duration-300 shadow-lg relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icon/nuvio.png"
                  alt="Nuvio"
                  className="w-full h-full object-contain filter drop-shadow-md group-hover/item:drop-shadow-[0_0_12px_rgba(6,182,212,0.5)] transition-all"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-zinc-300 group-hover/item:text-white transition-colors">Nuvio</span>
                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
