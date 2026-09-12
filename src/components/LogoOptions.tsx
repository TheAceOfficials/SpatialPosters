"use client"

import React, { useEffect, useState } from "react"
import type { TMDBImage } from "@/lib/types"
import { LANG_NAMES, groupBy, limitBest, posterUrl } from "@/lib/utils"
import { useT } from "@/lib/contexts/TranslationContext"
import { usePosterEditor } from "@/lib/contexts/PosterEditorContext"
import { Check, Plus, Trash2, ChevronDown } from "lucide-react"

interface Props {
  logos: TMDBImage[]
  selectedLogo: TMDBImage | null
  lang: string
  selectLogo: (img: TMDBImage) => void
  removeLogo: () => void
  disabled?: boolean
}

export const LogoOptions = React.memo(function LogoOptions({ logos, selectedLogo, lang, selectLogo, removeLogo, disabled }: Props) {
  const { t } = useT()
  const { logoDisabled, setLogoDisabled } = usePosterEditor()
  const [activeLogoGroup, setActiveLogoGroup] = useState("all")
  const [visibleLogoCount, setVisibleLogoCount] = useState(10)

  useEffect(() => {
    setVisibleLogoCount(10)
  }, [logos, activeLogoGroup, lang])

  if (logos.length === 0) return (
    <div className="grid grid-cols-2 gap-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-20 rounded-xl border-2 border-dashed border-surface2 bg-surface/20 flex items-center justify-center">
          <Plus className="w-4 h-4 text-zinc-600" />
        </div>
      ))}
    </div>
  )
  const groups = groupBy(logos, (img) => img.iso_639_1 || "xx")
  const langGroups = Object.entries(groups).sort(([a], [b]) => {
    if (a === lang) return -1; if (b === lang) return 1
    if (a === "en") return -1; if (b === "en") return 1
    return a.localeCompare(b)
  })

  const logoTabs = [
    { key: "all", label: t("ui.all"), count: logos.length },
    { key: lang, label: LANG_NAMES[lang] || lang, count: groups[lang]?.length ?? 0 },
    ...(lang !== "en" ? [{ key: "en", label: "English", count: groups["en"]?.length ?? 0 }] : []),
    { key: "xx", label: t("ui.withoutLanguage"), count: groups["xx"]?.length ?? 0 },
  ].filter((tab) => tab.count > 0 || tab.key === "all")

  const visibleLogoGroups = activeLogoGroup === "all"
    ? langGroups
    : langGroups.filter(([language]) => language === activeLogoGroup)

  const totalAvailableLogos = visibleLogoGroups.reduce((acc, [, imgs]) => acc + imgs.length, 0)

  let renderedLogosCount = 0

  return (
    <div>
      <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-none py-0.5">
        {logoTabs.map((tab) => (
          <button type="button"
            aria-label={tab.label}
            key={tab.key}
            onClick={() => setActiveLogoGroup(tab.key)}
            className={`tab-chip h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all shrink-0 whitespace-nowrap ${activeLogoGroup === tab.key ? "tab-chip-active bg-accent-orange/15 text-accent-orange border-accent-orange/35" : "bg-white/5 text-muted border-white/10 hover:text-zinc-200 hover:bg-white/10"}`}
          >
            {tab.label}
            <span className="ml-1 text-[10px] opacity-60">{tab.count}</span>
          </button>
        ))}
      </div>
      {visibleLogoGroups.length === 0 ? (
        <p className="py-8 text-center text-xs text-zinc-500">{t("ui.noLogoInLanguage")}</p>
      ) : (
        visibleLogoGroups.map(([language, imgs]) => {
          const quotaLeft = visibleLogoCount - renderedLogosCount
          if (quotaLeft <= 0) return null
          const best = limitBest(imgs).slice(0, quotaLeft)
          if (best.length === 0) return null
          renderedLogosCount += best.length
          return (
            <div key={language} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-zinc-700/40" />
                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider shrink-0">{LANG_NAMES[language] || language} {best.length < imgs.length ? `• ${best.length}` : ""}</h4>
                <div className="h-px flex-1 bg-zinc-700/40" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {best.map((img) => {
                  const isActive = selectedLogo?.file_path === img.file_path
                  return (
                    <button type="button" key={img.file_path} disabled={disabled} onClick={() => selectLogo(img)} className={`poster-tile group relative p-2 rounded-xl transition-all duration-200 ease-out flex items-center justify-center h-20 ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${isActive ? "poster-tile-active bg-accent-orange/10" : ""}`} title={isActive ? t("ui.logoSelected") : undefined}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- TMDB dynamic URL */}
                      <img src={posterUrl(img.file_path, "w154")} alt="" loading="lazy" decoding="async" className="max-h-14 max-w-full object-contain transition-transform duration-200 group-hover:scale-110" />
                      {isActive && <div className="absolute top-1 right-1 rounded-md bg-accent-orange text-white p-0.5 shadow-sm shadow-accent-orange/40"><Check className="w-3 h-3" /></div>}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })
      )}

      {totalAvailableLogos > visibleLogoCount && (
        <button
          type="button"
          aria-label={t("ui.loadMoreLogosAria")}
          onClick={() => setVisibleLogoCount((prev) => prev + 10)}
          className="btn-secondary w-full mb-3 py-2 px-3 text-xs"
        >
          <ChevronDown className="w-4 h-4" />
          {t("ui.loadMoreLogos", { count: Math.min(10, totalAvailableLogos - visibleLogoCount) })}
          <span className="text-[10px] text-zinc-500 font-normal">{t("ui.xOfY", { current: visibleLogoCount, total: totalAvailableLogos })}</span>
        </button>
      )}

      {selectedLogo && (
        <div className="editor-pill mt-3">
          <Check className="w-3 h-3" />{t("ui.logoSelected")}
        </div>
      )}
      {!selectedLogo && (
        <button type="button" aria-label={logoDisabled ? t("ui.removeLogo") : t("ui.enableLogos")} disabled={disabled} onClick={() => setLogoDisabled(!logoDisabled)} className={`mt-3 w-full h-9 rounded-lg border text-[11px] font-semibold transition-all ${disabled ? "bg-surface2/30 text-zinc-600 cursor-not-allowed border-surface2" : logoDisabled ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-surface2 bg-white/[0.03] text-muted hover:text-zinc-200 hover:border-zinc-600"}`}>
          <span className="flex items-center justify-center gap-1.5">{logoDisabled ? t("ui.logosDisabled") : t("ui.disableLogos")}</span>
        </button>
      )}
      {selectedLogo && (
        <button type="button" aria-label={t("ui.removeLogo")} disabled={disabled} onClick={removeLogo} className={`mt-2 w-full h-9 rounded-lg border text-[11px] font-semibold transition-all ${disabled ? "bg-surface2/30 text-zinc-600 cursor-not-allowed border-surface2" : "border-surface2 bg-white/[0.03] text-muted hover:text-red-300 hover:border-red-500/30"}`}>
          <span className="flex items-center justify-center gap-1.5"><Trash2 className="w-3 h-3" />{t("ui.removeLogo")}</span>
        </button>
      )}
    </div>
  )
})
