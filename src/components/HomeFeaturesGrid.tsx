"use client"

import { useT } from "@/lib/contexts/TranslationContext"
import { Layers, Star, Zap, Globe, Sparkles, Sliders, Server } from "lucide-react"

export function HomeFeaturesGrid() {
  const { t } = useT()

  const features = [
    {
      icon: <Layers className="w-5 h-5 text-amber-300" />,
      title: "HD Vector Logos & Clean Artwork",
      desc: "High-resolution vector logos automatically placed on textless movie and TV artwork with pixel-perfect alignment.",
      badge: "Vector Engine",
    },
    {
      icon: <Star className="w-5 h-5 text-yellow-400" />,
      title: "Dynamic Rating Badges",
      desc: "IMDb, Rotten Tomatoes, and TMDB scores rendered dynamically with customizable badge styles and rank ribbons.",
      badge: "Live Ratings",
    },
    {
      icon: <Zap className="w-5 h-5 text-purple-400" />,
      title: "Stremio & Nuvio Sync",
      desc: "Zero-latency addon integration for Stremio and Nuvio. Sync your customized posters across devices instantly.",
      badge: "Addon Ready",
    },
    {
      icon: <Globe className="w-5 h-5 text-cyan-400" />,
      title: "Multi-Language & Regions",
      desc: "Localized posters, titles, rating formats, and regional streaming provider ribbons across 10+ languages.",
      badge: "10+ Languages",
    },
    {
      icon: <Sliders className="w-5 h-5 text-emerald-400" />,
      title: "Custom Poster Studio",
      desc: "Fine-tune badge positions, custom image URLs, gradient masks, blur overlays, and edge lighting in real-time.",
      badge: "Full Customization",
    },
    {
      icon: <Server className="w-5 h-5 text-rose-400" />,
      title: "Global Edge Caching",
      desc: "Optimized poster delivery powered by high-speed edge nodes for instant image loading without buffering.",
      badge: "Instant Load",
    },
  ]

  return (
    <section className="my-12 md:my-16 max-w-6xl mx-auto px-4">
      {/* Kicker & Section Header */}
      <div className="text-center mb-8 md:mb-12">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-zinc-200 border border-white/15 mb-3 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Platform Capabilities</span>
        </span>
        <h2 className="text-2xl md:text-4xl font-extrabold text-zinc-100 tracking-tight">
          Why we are <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400">Different?</span>
        </h2>
        <p className="mt-2 text-sm md:text-base text-zinc-400 max-w-2xl mx-auto">
          SpatialPosters generates high-definition, dynamic posters on-the-fly for your Stremio and media setups with ratings, vector logos, and custom customization options.
        </p>
      </div>

      {/* Feature Cards Grid (3 columns desktop, 2 tablet, 1 mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {features.map((item, i) => (
          <div
            key={i}
            className="group relative p-5 md:p-6 rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-white/10 hover:border-white/25 hover:bg-zinc-900/80 transition-all duration-300 shadow-xl shadow-black/40 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div>
              {/* Top Icon & Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  {item.icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  {item.badge}
                </span>
              </div>

              {/* Title & Desc */}
              <h3 className="text-base font-bold text-zinc-100 mb-1.5 group-hover:text-white transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
                {item.desc}
              </p>
            </div>

            {/* Subtle Bottom Accent Glow */}
            <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl bg-gradient-to-r from-transparent via-amber-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ))}
      </div>
    </section>
  )
}
