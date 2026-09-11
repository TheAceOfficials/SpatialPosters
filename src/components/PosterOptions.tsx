"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import type { TMDBImage } from "@/lib/types"
import { LANG_NAMES, groupBy } from "@/lib/utils"
import { PosterBtn } from "@/components/PosterBtn"
import { PosterTabs } from "@/components/PosterTabs"
import { FitDebugPanel } from "@/components/FitDebugPanel"
import { usePSelector } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { usePosterEditor } from "@/lib/contexts/PosterEditorContext"
import { usePosterFit } from "@/lib/usePosterFit"
import { RotateCcw, Check, Clock, Sparkles, ArrowUpDown, EyeOff, Eye, ChevronDown, Link, Plus } from "lucide-react"

interface Props {
  posters: TMDBImage[]
  posterActivePath: string | null
  lang: string
  selectPoster: (img: TMDBImage) => void
  activeGroup?: string
  onActiveGroupChange?: (key: string) => void
  showTabs?: boolean
}

export function PosterOptions({ posters, posterActivePath, lang, selectPoster, activeGroup: controlledActiveGroup, onActiveGroupChange, showTabs = true }: Props) {
  const selectedLogo = usePSelector((v) => v.selectedLogo)
  const selected = usePSelector((v) => v.selected)
  const mappingsMap = usePSelector((v) => v.mappingsMap)
  const autoSaveExcludedPosters = usePSelector((v) => v.autoSaveExcludedPosters)
  const { t } = useT()
  const ed = usePosterEditor()

  const excludedSet = useMemo(() => new Set(ed.excludedPosters), [ed.excludedPosters])

  const [customPosters, setCustomPosters] = useState<TMDBImage[]>([])
  const [customUrlInput, setCustomUrlInput] = useState("")
  const [showUrlInput, setShowUrlInput] = useState(false)

  const handleAddCustomUrl = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customUrlInput || (!customUrlInput.startsWith("http://") && !customUrlInput.startsWith("https://"))) {
      toast.error(t("ui.invalidUrl") || "Invalid URL")
      return
    }
    const newPoster: TMDBImage = {
      file_path: customUrlInput,
      width: 1000,
      height: 1500,
      iso_639_1: null,
      vote_average: 0
    }
    setCustomPosters((prev) => [newPoster, ...prev])
    setCustomUrlInput("")
    setShowUrlInput(false)
    toast.success(t("ui.urlAdded") || "URL Poster Added")
  }

  const cleanPosters = useMemo(() => {
    const defaultClean = posters.filter((img) => img.iso_639_1 === null && !excludedSet.has(img.file_path))
    const userClean = customPosters.filter((img) => !excludedSet.has(img.file_path))
    return [...userClean, ...defaultClean]
  }, [posters, excludedSet, customPosters])
  const hasClean = cleanPosters.length > 0
  const langGroups = useMemo(
    () => Object.entries(groupBy(posters.filter((img) => img.iso_639_1 !== null), (img) => img.iso_639_1 || "other")).sort(([a], [b]) => {
      if (a === lang) return -1; if (b === lang) return 1
      if (a === "en") return -1; if (b === "en") return 1
      return a.localeCompare(b)
    }),
    [lang, posters],
  )

  const posterTabs = useMemo(() => {
    const tabs: { key: string; label: string; count: number }[] = []
    if (hasClean) tabs.push({ key: "clean", label: "Clean", count: cleanPosters.length })
    for (const [language, imgs] of langGroups) {
      const unexcludedCount = imgs.filter(img => !excludedSet.has(img.file_path)).length
      if (unexcludedCount > 0) tabs.push({ key: language, label: LANG_NAMES[language] || language, count: unexcludedCount })
    }
    if (excludedSet.size > 0) {
      tabs.push({ key: "excluded", label: t("ui.excluded") || "Excluded", count: excludedSet.size })
    }
    return tabs
  }, [hasClean, cleanPosters.length, langGroups, excludedSet.size, t, excludedSet])

  const [internalActiveGroup, setInternalActiveGroup] = useState("clean")
  const activeGroup = controlledActiveGroup ?? internalActiveGroup
  const setActiveGroup = onActiveGroupChange ?? setInternalActiveGroup

  useEffect(() => {
    if (posterTabs.length > 0 && !posterTabs.some((t) => t.key === activeGroup)) {
      setActiveGroup(posterTabs[0]?.key ?? "clean")
    }
  }, [posterTabs, activeGroup, setActiveGroup])

  let idx = 0

  const { bestFitPath, results, loading: fitLoading, error: fitError } = usePosterFit({
    enabled: ed.defaultLogoFitEnabled,
    selectedLogo: selectedLogo,
    cleanPosters,
    logoScale: ed.logoScale,
    logoOffsetX: ed.logoOffsetX,
    logoOffsetY: ed.logoOffsetY,
    hasBadges: ed.globalBadges,
  })

  const scoreMap = useMemo(() => new Map(results.map((r) => [r.posterPath, r.adjustedScore])), [results])
  const hasFitData = results.length > 0

  const bestResult = bestFitPath ? results.find((r) => r.posterPath === bestFitPath) : undefined
  const bestScore = bestResult?.adjustedScore ?? 0
  const bestPoster = bestFitPath ? cleanPosters.find((p) => p.file_path === bestFitPath) : undefined
  const isBestSelected = bestPoster ? posterActivePath === bestPoster.file_path : false

  const isSavedPoster = useMemo(() => {
    if (!selected) return false
    const mediaType = selected.media_type === "tv" ? "tv" : "movie"
    return mappingsMap.has(`${mediaType}:${selected.id}`)
  }, [mappingsMap, selected])

  const topFitRotationPosters = useMemo(() => {
    if (results.length === 0) return []
    const cleanPosterPaths = new Set(cleanPosters.map((poster) => poster.file_path))
    return results
      .filter((result) => cleanPosterPaths.has(result.posterPath))
      .slice(0, 10)
      .map((result) => result.posterPath)
  }, [cleanPosters, results])

  const populatedRotationRef = useRef(false)
  useEffect(() => {
    populatedRotationRef.current = false
  }, [selected?.id])
  useEffect(() => {
    if (isSavedPoster) return
    if (topFitRotationPosters.length === 0 || fitLoading) return
    if (ed.rotationPosters.length > 0) { populatedRotationRef.current = false; return }
    if (populatedRotationRef.current) return
    populatedRotationRef.current = true
    ed.setRotationPosters(topFitRotationPosters)
    if (ed.defaultAutoRotateClean && topFitRotationPosters.length > 1) {
      ed.setAutoRotateClean(true)
    }
  }, [topFitRotationPosters, fitLoading, isSavedPoster]) // eslint-disable-line react-hooks/exhaustive-deps -- intentionally only on fit results

  const [sortByFit, setSortByFit] = useState(false)
  const [showFitDebug, setShowFitDebug] = useState(false)
  const autoSelectedFitKeyRef = useRef<string | null>(null)

  useEffect(() => {
    setSortByFit(false)
    autoSelectedFitKeyRef.current = null
  }, [selected?.id])

  const autoSelectFitKey = useMemo(() => {
    if (!ed.defaultLogoFitEnabled || !bestPoster || !selectedLogo) return null
    return JSON.stringify([
      bestPoster.file_path,
      cleanPosters.map((poster) => poster.file_path),
      selectedLogo.file_path,
      ed.globalBadges,
    ])
  }, [
    bestPoster,
    cleanPosters,
    ed.defaultLogoFitEnabled,
    ed.globalBadges,
    selectedLogo,
  ])

  useEffect(() => {
    if (isSavedPoster) {
      autoSelectedFitKeyRef.current = null
      return
    }
    if (!autoSelectFitKey || !bestPoster || fitLoading) {
      if (!autoSelectFitKey) autoSelectedFitKeyRef.current = null
      return
    }
    if (isBestSelected) {
      autoSelectedFitKeyRef.current = autoSelectFitKey
      return
    }
    if (autoSelectedFitKeyRef.current === autoSelectFitKey) return
    autoSelectedFitKeyRef.current = autoSelectFitKey
    setSortByFit(true)
    selectPoster(bestPoster)
  }, [autoSelectFitKey, bestPoster, fitLoading, isBestSelected, isSavedPoster, selectPoster])

  const displayPosters = useMemo(() => {
    if (!sortByFit) return cleanPosters
    return [...cleanPosters].sort(
      (a, b) => (scoreMap.get(b.file_path) ?? -1) - (scoreMap.get(a.file_path) ?? -1),
    )
  }, [sortByFit, cleanPosters, scoreMap])

  const [visibleCleanCount, setVisibleCleanCount] = useState(12)
  const [visibleLangCount, setVisibleLangCount] = useState(12)

  useEffect(() => {
    setVisibleCleanCount(12)
    setVisibleLangCount(12)
  }, [selected?.id, activeGroup, sortByFit])

  const visibleCleanPosters = useMemo(() => {
    return displayPosters.slice(0, visibleCleanCount)
  }, [displayPosters, visibleCleanCount])

  const activeClean = activeGroup === "clean"
  const activeLangImgs = useMemo(() => {
    if (activeGroup === "excluded") {
      return posters.filter(img => excludedSet.has(img.file_path))
    }
    const rawImgs = !activeClean ? langGroups.find(([l]) => l === activeGroup)?.[1] ?? [] : []
    return rawImgs.filter(img => !excludedSet.has(img.file_path))
  }, [activeClean, langGroups, activeGroup, posters, excludedSet])

  const visibleLangImgs = useMemo(() => {
    return activeLangImgs.slice(0, visibleLangCount)
  }, [activeLangImgs, visibleLangCount])

  const toggleRotation = (filePath: string) => {
    ed.setRotationPosters((prev) => {
      if (prev.includes(filePath)) return prev.filter((f) => f !== filePath)
      return [...prev, filePath]
    })
  }

  const toggleAutoRotateClean = () => {
    const next = !ed.autoRotateClean
    if (next && topFitRotationPosters.length > 0) {
      ed.setRotationPosters(topFitRotationPosters)
    }
    ed.setAutoRotateClean(next)
  }

  const [excludedSaveState, setExcludedSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")

  const toggleExcludePoster = (filePath: string) => {
    const prevExcluded = ed.excludedPosters
    const prevRotation = ed.rotationPosters
    const isExcluding = !ed.excludedPosters.includes(filePath)
    const nextExcluded = isExcluding
      ? Array.from(new Set([...ed.excludedPosters, filePath]))
      : ed.excludedPosters.filter((p) => p !== filePath)
    const nextRotationPosters = isExcluding
      ? ed.rotationPosters.filter((path) => path !== filePath)
      : ed.rotationPosters
    
    ed.setExcludedPosters(nextExcluded)
    ed.setRotationPosters(nextRotationPosters)
    setExcludedSaveState("saving")

    let fallback: TMDBImage | undefined
    if (posterActivePath === filePath && isExcluding) {
      fallback =
        cleanPosters.find((poster) => poster.file_path !== filePath) ??
        posters.find((poster) => poster.file_path !== filePath && !nextExcluded.includes(poster.file_path))
      if (fallback) selectPoster(fallback)
    }

    autoSaveExcludedPosters(nextExcluded, nextRotationPosters, fallback)
      .then(() => { setExcludedSaveState("saved"); toast.success(isExcluding ? t("ui.posterExcluded") : (t("ui.posterRestored") || "Poster restored")) })
      .catch(() => {
        ed.setExcludedPosters(prevExcluded)
        ed.setRotationPosters(prevRotation)
        setExcludedSaveState("error")
        toast.error(t("ui.saveError"))
      })
  }

  function shortPath(p: string): string {
    return p.length > 18 ? `${p.slice(0, 10)}...${p.slice(-6)}` : p
  }

  function scoreClass(s: number): string {
    if (s >= 0.65) return "text-green-400"
    if (s >= 0.45) return "text-amber-400"
    return "text-danger"
  }

  return (
    <div>
      {showTabs && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 overflow-x-auto scrollbar-none">
            <PosterTabs tabs={posterTabs} activeGroup={activeGroup} onSelect={setActiveGroup} />
          </div>
          <button type="button" aria-label="Add custom URL" onClick={() => setShowUrlInput(!showUrlInput)} className="h-7 w-9 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all shrink-0 flex items-center justify-center">
            <Link className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {showUrlInput && (
        <form onSubmit={handleAddCustomUrl} className="flex gap-2 mb-3 px-1">
          <input
            type="url"
            value={customUrlInput}
            onChange={(e) => setCustomUrlInput(e.target.value)}
            placeholder="https://..."
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-accent-orange/50"
            autoFocus
          />
          <button type="submit" className="px-3 rounded-lg bg-accent-orange/20 text-accent-orange hover:bg-accent-orange/30 font-semibold text-xs transition-colors flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> {t("ui.add") || "Add"}
          </button>
        </form>
      )}

      {activeClean && hasClean && (
        <div className="space-y-2 mb-2 px-1">
          {isBestSelected && (
            <div className="editor-pill">
              <Check className="w-3 h-3" />{t("ui.bestFitSelected")}
            </div>
          )}
          {ed.rotationPosters.length > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted flex items-center gap-1"><Clock className="w-3 h-3" />{t("ui.autoRotate")}</span>
              <button type="button"
                aria-label={ed.autoRotateClean ? t("ui.removeFromRotation") : t("ui.autoRotate")}
                onClick={toggleAutoRotateClean}
                className={`px-2 py-1 text-[11px] font-semibold rounded-lg border transition-all ${ed.autoRotateClean ? "bg-accent-orange/20 text-accent-orange border-accent-orange/25 animate-pulse-ring" : "bg-white/5 text-muted border-white/10"}`}
              >
                {ed.autoRotateClean ? <><Check className="w-3 h-3 inline mr-1" />ON</> : "OFF"}
              </button>
            </div>
          )}
          {hasFitData && (
            <div className="flex items-center justify-between">
              <span className="control-label flex items-center gap-1"><ArrowUpDown className="w-3 h-3" />{t("ui.posterOrder")}</span>
              <div className="segmented-control">
                <button type="button"
                  aria-label={t("ui.sortByTmdb")}
                  onClick={() => setSortByFit(false)}
                  className={`segmented-option ${!sortByFit ? "segmented-option-active" : ""}`}
                >
                  {t("ui.tmdb")}
                </button>
                <button type="button"
                  aria-label={t("ui.sortByBestFit")}
                  onClick={() => setSortByFit(true)}
                  className={`segmented-option ${sortByFit ? "segmented-option-active" : ""}`}
                >
                  {t("ui.bestFit")}
                </button>
              </div>
            </div>
          )}
          {(bestPoster && !isBestSelected && !fitLoading) && (
            <button type="button"
              aria-label={t("ui.chooseBestPosterAria")}
              onClick={() => selectPoster(bestPoster)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150 bg-accent-orange/15 text-accent-orange hover:bg-accent-orange/25 active:scale-[0.98]"
            >
              <Sparkles className="w-3 h-3" />{t("ui.chooseBestPoster")}
            </button>
          )}
          {fitLoading && (
            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] text-zinc-500">
              <Clock className="w-3 h-3 animate-spin" />{t("ui.analyzing")}
            </div>
          )}
          {fitError && !fitLoading && (
            <div className="px-3 py-1.5 text-[10px] text-amber-400/90 leading-relaxed">
              {fitError}
            </div>
          )}
          {hasFitData && (
            <button
              type="button"
              aria-label={showFitDebug ? t("ui.hideDebug") : t("ui.showDebug")}
              onClick={() => setShowFitDebug((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded-lg transition-all duration-150 text-zinc-600 hover:text-muted hover:bg-white/[0.03]"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              {showFitDebug ? t("ui.hide") : t("ui.debugFit")}
            </button>
          )}
        </div>
      )}

      {activeClean && hasClean && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {visibleCleanPosters.map((img) => {
              const stagger = idx++
              const inRotation = ed.rotationPosters.includes(img.file_path)
              const isBestFit = bestFitPath === img.file_path
              const showBadge = isBestFit && bestScore >= 0.45
              const isHighScore = bestScore >= 0.65
              return (
                <div key={img.file_path} className={`relative group rounded-xl overflow-hidden ${isBestFit && bestScore >= 0.45 ? `ring-1 ${isHighScore ? "ring-orange-400/70 shadow-[0_0_18px_rgba(232,93,42,0.12)]" : "ring-amber-400/50"}` : ""}`}>
                  <PosterBtn staggerIndex={stagger} img={img} active={posterActivePath === img.file_path} onSelect={selectPoster} />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
                  {showBadge && (
                    <div className={`fit-badge z-20 ${isHighScore ? "fit-badge-amber" : ""}`}>
                      <Sparkles className="w-2.5 h-2.5 inline mr-0.5" />
                      {isHighScore ? t("ui.bestFit") : t("ui.bestFitAlt")}
                    </div>
                  )}
                  <div className="absolute top-1.5 right-1.5 z-20 flex flex-col gap-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button type="button"
                      aria-label={inRotation ? t("ui.removeFromRotation") : t("ui.addToRotation")}
                      onClick={(e) => { e.stopPropagation(); toggleRotation(img.file_path) }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transition-all duration-200 hover:scale-110 ${inRotation ? "bg-accent-orange text-white" : "bg-black/60 text-white/80 hover:bg-accent-orange hover:text-white"}`}
                      title={inRotation ? t("ui.removeFromRotation") : t("ui.addToRotation")}
                    >
                      {inRotation ? <Check className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    </button>
                    <button type="button"
                      aria-label={t("ui.excludePoster")}
                      onClick={(e) => { e.stopPropagation(); toggleExcludePoster(img.file_path) }}
                      className="w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transition-all duration-200 hover:scale-110 bg-black/60 text-white/80 hover:bg-red-500 hover:text-white"
                      title={t("ui.excludePoster")}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {displayPosters.length > visibleCleanCount && (
            <button
              type="button"
              aria-label={t("ui.loadMorePostersAria")}
              onClick={() => setVisibleCleanCount((prev) => prev + 12)}
              className="btn-secondary w-full mt-3 py-2 px-3 text-xs"
            >
              <ChevronDown className="w-4 h-4" />
              {t("ui.loadMorePosters", { count: Math.min(12, displayPosters.length - visibleCleanCount) })}
              <span className="text-[10px] text-zinc-500 font-normal">{t("ui.xOfY", { current: visibleCleanCount, total: displayPosters.length })}</span>
            </button>
          )}
        </>
      )}

      {activeClean && showFitDebug && hasFitData && (
        <FitDebugPanel results={results} bestResult={bestResult} shortPath={shortPath} scoreClass={scoreClass} t={t} />
      )}

      {activeClean && !hasClean && (
        <p className="text-center py-12 text-muted text-xs">{t("ui.loading")}</p>
      )}

      {!activeClean && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {visibleLangImgs.map((img) => {
              const stagger = idx++
              const isExcluded = excludedSet.has(img.file_path)
              return (
                <div key={img.file_path} className="relative group rounded-xl overflow-hidden">
                  <PosterBtn staggerIndex={stagger} img={img} active={posterActivePath === img.file_path} onSelect={selectPoster} />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 to-transparent opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-1.5 right-1.5 z-20 flex flex-col gap-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button type="button"
                      aria-label={isExcluded ? (t("ui.restorePoster") || "Restore") : t("ui.excludePoster")}
                      onClick={(e) => { e.stopPropagation(); toggleExcludePoster(img.file_path) }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transition-all duration-200 hover:scale-110 ${isExcluded ? "bg-accent-orange text-white" : "bg-black/60 text-white/80 hover:bg-red-500 hover:text-white"}`}
                      title={isExcluded ? (t("ui.restorePoster") || "Restore") : t("ui.excludePoster")}
                    >
                      {isExcluded ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {activeLangImgs.length > visibleLangCount && (
            <button
              type="button"
              aria-label={t("ui.loadMorePostersAria")}
              onClick={() => setVisibleLangCount((prev) => prev + 12)}
              className="btn-secondary w-full mt-3 py-2 px-3 text-xs"
            >
              <ChevronDown className="w-4 h-4" />
              {t("ui.loadMorePosters", { count: Math.min(12, activeLangImgs.length - visibleLangCount) })}
              <span className="text-[10px] text-zinc-500 font-normal">{t("ui.xOfY", { current: visibleLangCount, total: activeLangImgs.length })}</span>
            </button>
          )}
        </>
      )}

      {activeClean && ed.rotationPosters.length > 0 && (
        <p className="text-[11px] text-zinc-500 mt-1.5 px-1">{ed.rotationPosters.length} {t("ui.selectedCount", { count: ed.rotationPosters.length })}</p>
      )}
      {activeClean && ed.excludedPosters.length > 0 && (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-surface2/70 bg-white/5 px-2.5 py-2">
          <span className="text-[11px] text-muted flex items-center gap-1.5">
            <span>{ed.excludedPosters.length} {ed.excludedPosters.length === 1 ? t("ui.excludedCountOne") : t("ui.excludedCountMany")}</span>
            {excludedSaveState === "saving" && <span className="text-[10px] text-zinc-500 animate-pulse">{t("ui.saveStateSaving")}</span>}
            {excludedSaveState === "saved" && <span className="text-[10px] text-green-500">{t("ui.saveStateSaved")}</span>}
            {excludedSaveState === "error" && <span className="text-[10px] text-danger">{t("ui.saveStateError")}</span>}
          </span>
          <button type="button" onClick={() => { ed.setExcludedPosters([]); setExcludedSaveState("saving"); autoSaveExcludedPosters([], ed.rotationPosters).then(() => { setExcludedSaveState("saved"); toast.success(t("ui.cancel")) }).catch(() => { setExcludedSaveState("error"); toast.error(t("ui.saveError")) }) }} className="text-[11px] text-accent-orange hover:text-orange-300">
            {t("ui.restore")}
          </button>
        </div>
      )}

      {posters.length === 0 && <p className="text-center py-12 text-muted">{t("ui.loading")}</p>}
    </div>
  )
}
