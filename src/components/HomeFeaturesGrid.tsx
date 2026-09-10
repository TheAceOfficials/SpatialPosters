"use client"

import { useT } from "@/lib/contexts/TranslationContext"
import { Layers, Star, Zap, Globe, Sparkles, ShieldCheck, Palette, RefreshCw } from "lucide-react"

export function HomeFeaturesGrid() {
  const { t } = useT()

  const features = [
    {
      icon: <Layers className="w-5 h-5 text-zinc-100" />,
      title: t("ui.welcomeFeature1Title") || "Vector Logos & Clean Posters",
      desc: t("ui.welcomeFeature1Desc") || "High-resolution vector logos automatically placed on textless movie and TV artwork.",
      badge: "HD Vector Logos",
    },
    {
      icon: <Star className="w-5 h-5 text-zinc-100" />,
      title: t("ui.welcomeFeature2Title") || "Dynamic Rating Badges",
      desc: t("ui.welcomeFeature2Desc") || "IMDb, Rotten Tomatoes, and TMDB scores rendered dynamically with custom badge styles.",
      badge: "IMDb / RT / TMDB",
    },
    {
      icon: <Zap className="w-5 h-5 text-zinc-100" />,
      title: t("ui.welcomeFeature3Title") || "Stremio Catalog Sync",
      desc: t("ui.welcomeFeature3Desc") || "Zero-latency Stremio addon integration. Sync your custom library instantly.",
      badge: "Stremio Addon",
    },
    {
      icon: <Globe className="w-5 h-5 text-zinc-100" />,
      title: "Multi-Language & Regions",
      desc: "Localized posters, titles, rating formats, and OTT provider ribbons across 10+ languages.",
      badge: "10+ Languages",
    },
  ]

  return (
    <section className="my-12 md:my-16 max-w-6xl mx-auto px-4">
      {/* Kicker & Section Header */}
      <div className="text-center mb-8 md:mb-12">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-zinc-200 border border-white/15 mb-3 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
          <span>Platform Capabilities</span>
        </span>
        <h2 className="text-2xl md:text-4xl font-extrabold text-zinc-100 tracking-tight">
          Everything you need for a <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500">Cinematic Library</span>
        </h2>
        <p className="mt-2 text-sm md:text-base text-zinc-400 max-w-2xl mx-auto">
          SpatialPosters generates high-definition, dynamic posters on-the-fly for your Stremio media setup with rating badges, custom logos, and OTT ribbons.
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {features.map((item, i) => (
          <div
            key={i}
            className="group relative p-5 md:p-6 rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-white/10 hover:border-white/25 hover:bg-zinc-900/80 transition-all duration-300 shadow-xl shadow-black/40 hover:-translate-y-1"
          >
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

            {/* Subtle Bottom Accent Glow */}
            <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ))}
      </div>
    </section>
  )
}
