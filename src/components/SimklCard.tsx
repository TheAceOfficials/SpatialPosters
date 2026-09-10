"use client"

import React, { useState } from "react"
import { posterUrl } from "@/lib/utils"
import { useT } from "@/lib/contexts/TranslationContext"
import { Check, Layers, ExternalLink, ArrowUpRight } from "lucide-react"
import { PosterDepthEdge, PosterDepthSheen } from "@/components/PosterDepthGlow"

export interface SimklCardItem {
  tmdbId?: number | null
  id?: number | null
  title?: string | null
  name?: string | null
  poster_path?: string | null
  posterPath?: string | null
  media_type?: string
  mediaType?: string
  rank?: number
}

interface SimklCardProps {
  items: SimklCardItem[]
  title: string
  totalCount?: number
  meta?: string[]
  onClick?: () => void
  onItemClick?: (item: SimklCardItem) => void
  savedKeys?: Set<string>
  className?: string
}

export function SimklCard({ items, title, totalCount, meta = [], onClick, onItemClick, savedKeys, className }: SimklCardProps) {
  const { t } = useT()
  const displayItems = items.slice(0, 7)
  const count = totalCount ?? items.length
  const [isHovered, setIsHovered] = useState(false)

  const imgSrc = (item: SimklCardItem) => {
    const path = item.poster_path || item.posterPath
    return path ? posterUrl(path, "w185") : ""
  }

  const handlePosterClick = (e: React.MouseEvent, item: SimklCardItem) => {
    e.stopPropagation()
    onItemClick?.(item)
  }

  return (
    <div
      className={`group relative rounded-2xl bg-surface/90 border border-white/10 p-4 sm:p-5 transition-all duration-300 hover:border-white/25 hover:bg-surface hover:shadow-2xl hover:shadow-black/70 cursor-pointer overflow-hidden flex flex-col justify-between ${className ?? ""}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      {/* Dynamic Background Glow */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none group-hover:bg-white/10 transition-all duration-500" />

      {/* Header Info */}
      <div className="flex items-center justify-between z-10 mb-4">
        <div className="flex items-center gap-2 max-w-[80%]">
          <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:text-white group-hover:border-white/20 transition-all">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-zinc-100 group-hover:text-white truncate transition-colors">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-zinc-300 group-hover:bg-white/15 group-hover:text-white transition-all backdrop-blur-md">
              {count} {count === 1 ? t("ui.itemOne") : t("ui.itemMany")}
            </span>
          )}
          <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-white/15 transition-all">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* Stacked Deck Preview Area */}
      <div className="catalog-deck-stack relative w-full h-[185px] sm:h-[195px] my-1 flex items-center overflow-hidden sm:overflow-visible">
        {displayItems.map((item, idx) => {
          const src = imgSrc(item)
          const mediaType = item.media_type || item.mediaType || "movie"
          const tmdbId = item.tmdbId ?? item.id
          const itemKey = `${mediaType}:${tmdbId}`
          const isSaved = tmdbId && savedKeys?.has(itemKey)

          return (
            <div
              key={`${mediaType}:${tmdbId ?? "item"}-${idx}`}
              className="catalog-deck-item relative isolate shrink-0 overflow-hidden cursor-pointer rounded-xl border border-white/10 bg-zinc-900"
              role="button"
              tabIndex={0}
              onClick={(e) => handlePosterClick(e, item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  e.stopPropagation()
                  onItemClick?.(item)
                }
              }}
            >
              <PosterDepthEdge edgeStrength={40} edgeCoverage={10} />
              <div className="relative w-full h-full z-[1]">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote TMDB poster tiles
                  <img
                    src={src}
                    alt={item.title ?? item.name ?? ""}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 p-1 text-center">
                    {item.title ?? item.name ?? ""}
                  </div>
                )}
                {isSaved && (
                  <div
                    className="absolute top-1.5 right-1.5 w-4.5 h-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg z-10"
                    title={t("ui.alreadyCustomized")}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>
              <PosterDepthSheen sheenStrength={20} />
            </div>
          )
        })}
      </div>

      {/* Footer / Hint */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 z-10">
        <span className="font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
          {isHovered ? t("ui.viewAll") : t("ui.catalogsSubtitle")}
        </span>
        <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors font-mono">
          Click for full list ⧉
        </span>
      </div>
    </div>
  )
}

