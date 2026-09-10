"use client"

import React, { useState } from "react"
import { posterUrl } from "@/lib/utils"
import { useT } from "@/lib/contexts/TranslationContext"
import { Check, ArrowRight, Grid } from "lucide-react"
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
  const [isHovered, setIsHovered] = useState(false)
  const [isTouched, setIsTouched] = useState(false)

  // Show top 6 items in preview stack for optimal fanning
  const displayItems = items.slice(0, 6)
  const isSingle = displayItems.length <= 1
  const count = totalCount ?? items.length

  const imgSrc = (item: SimklCardItem) => {
    const path = item.poster_path || item.posterPath
    return path ? posterUrl(path, "w185") : ""
  }

  const handlePosterClick = (e: React.MouseEvent, item: SimklCardItem) => {
    e.stopPropagation()
    onItemClick?.(item)
  }

  const isExpanded = isHovered || isTouched

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden p-4 sm:p-5 ${
        isExpanded
          ? "bg-zinc-900/90 border-white/25 shadow-2xl shadow-black/80 scale-[1.01]"
          : "bg-surface/80 hover:bg-zinc-900/70 border-white/10 hover:border-white/20 shadow-lg shadow-black/40"
      } ${className || ""}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsTouched(false)
      }}
      onTouchStart={() => {
        setIsTouched((prev) => !prev)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between gap-3 mb-4 z-10 relative">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-white tracking-wide group-hover:text-zinc-100 transition-colors flex items-center gap-2 truncate">
            <span className="truncate">{title}</span>
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {count > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">
                {count} {count === 1 ? t("ui.itemOne") : t("ui.itemMany")}
              </span>
            )}
            {meta.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
                {meta.map((m, i) => (
                  <span key={i}>{m}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* View All Button */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 group-hover:bg-white/15 text-xs font-semibold text-zinc-300 group-hover:text-white border border-white/10 transition-all duration-200 shrink-0">
          <Grid className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t("ui.viewAll")}</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      </div>

      {/* Stacked Poster Canvas */}
      <div className="relative h-[160px] sm:h-[180px] w-full flex items-center overflow-x-auto scrollbar-none py-1">
        <div
          className="relative flex items-center h-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            minWidth: isExpanded ? `${Math.max(300, displayItems.length * 95 + 25)}px` : "220px",
          }}
        >
          {displayItems.map((item, idx) => {
            const src = imgSrc(item)
            const mediaType = item.media_type || item.mediaType || "movie"
            const tmdbId = item.tmdbId ?? item.id
            const itemKey = `${mediaType}:${tmdbId}`
            const isSaved = tmdbId && savedKeys?.has(itemKey)

            const total = displayItems.length
            const stackOffsetX = idx * (isSingle ? 0 : 26)
            const stackScale = 1 - idx * 0.035
            const stackRotate = (idx % 2 === 0 ? 1 : -1) * (idx * 1.8)
            const stackZIndex = total - idx

            const expandedOffsetX = idx * (isSingle ? 0 : 92)

            return (
              <div
                key={`${mediaType}:${tmdbId ?? "item"}-${idx}`}
                className="absolute top-0 rounded-xl overflow-hidden shadow-xl border border-white/15 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:z-50 hover:scale-105 hover:-translate-y-2 hover:border-white/40"
                style={{
                  width: "110px",
                  height: "165px",
                  zIndex: isExpanded ? stackZIndex + 10 : stackZIndex,
                  transform: isExpanded
                    ? `translateX(${expandedOffsetX}px) scale(1) rotate(0deg)`
                    : `translateX(${stackOffsetX}px) scale(${stackScale}) rotate(${stackRotate}deg)`,
                  opacity: isExpanded ? 1 : Math.max(0.7, 1 - idx * 0.08),
                  boxShadow: isExpanded
                    ? "0 12px 28px -4px rgba(0, 0, 0, 0.7), 0 0 15px rgba(255, 255, 255, 0.08)"
                    : "0 6px 16px -4px rgba(0, 0, 0, 0.6)",
                }}
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
                <div className="relative w-full h-full">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={item.title ?? item.name ?? ""}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 p-2 text-center">
                      {item.title ?? item.name ?? "No Poster"}
                    </div>
                  )}

                  {isSaved && (
                    <div
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg z-10"
                      title={t("ui.alreadyCustomized")}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  {/* Title overlay on individual poster hover */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-[10px] font-bold text-white truncate opacity-0 hover:opacity-100 transition-opacity duration-200">
                    {item.title ?? item.name}
                  </div>
                </div>
                <PosterDepthSheen sheenStrength={20} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
