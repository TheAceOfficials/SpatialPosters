"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import { usePSelector } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { usePosterEditor } from "@/lib/contexts/PosterEditorContext"
import { PosterOptions } from "@/components/PosterOptions"
import { LogoOptions } from "@/components/LogoOptions"
import { EditorPanel } from "@/components/EditorPanel"
import { buildPreviewUrl } from "@/lib/poster-url"
import { SearchBar } from "@/components/SearchBar"
import { PosterCarousel } from "@/components/PosterCarousel"
import { ScrollReveal } from "@/components/ScrollReveal"
import { HomeHero } from "@/components/HomeHero"
import { HomeFeaturesGrid } from "@/components/HomeFeaturesGrid"
import { PosterPreview } from "@/components/PosterPreview"
import { PosterDepthEdge, PosterDepthSheen } from "@/components/PosterDepthGlow"
import { BadgeControls } from "@/components/BadgeControls"
import { TransformControls } from "@/components/TransformControls"
import { EpisodeGroupControls } from "@/components/EpisodeGroupControls"
import { JwRankBadge } from "@/components/JwRankBadge"
import { usePosterPreview } from "@/lib/usePosterPreview"
import { Check, ExternalLink, Save, Trash2, X, ChevronLeft } from "lucide-react"

export default function EditView() {
  const accentColor = usePSelector((v) => v.accentColor)
  const clearRecentSearches = usePSelector((v) => v.clearRecentSearches)
  const doSearch = usePSelector((v) => v.doSearch)
  const goHome = usePSelector((v) => v.goHome)
  const loadingImages = usePSelector((v) => v.loadingImages)
  const logos = usePSelector((v) => v.logos)
  const mappingsMap = usePSelector((v) => v.mappingsMap)
  const mdblistAnimeList = usePSelector((v) => v.mdblistAnimeList)
  const metaInfo = usePSelector((v) => v.metaInfo)
  const navigateToPoster = usePSelector((v) => v.navigateToPoster)
  const posterActivePath = usePSelector((v) => v.posterActivePath)
  const posters = usePSelector((v) => v.posters)
  const previewPoster = usePSelector((v) => v.previewPoster)
  const query = usePSelector((v) => v.query)
  const recentSearches = usePSelector((v) => v.recentSearches)
  const removeLogo = usePSelector((v) => v.removeLogo)
  const removeMapping = usePSelector((v) => v.removeMapping)
  const removeRecentSearch = usePSelector((v) => v.removeRecentSearch)
  const router = usePSelector((v) => v.router)
  const saveConfig = usePSelector((v) => v.saveConfig)
  const selected = usePSelector((v) => v.selected)
  const selectedLogo = usePSelector((v) => v.selectedLogo)
  const selectLogo = usePSelector((v) => v.selectLogo)
  const selectPoster = usePSelector((v) => v.selectPoster)
  const setPreviewId = usePSelector((v) => v.setPreviewId)
  const setPreviewPoster = usePSelector((v) => v.setPreviewPoster)
  const setQuery = usePSelector((v) => v.setQuery)
  const setSelected = usePSelector((v) => v.setSelected)
  const setSelectedLogo = usePSelector((v) => v.setSelectedLogo)
  const setSettingsOpen = usePSelector((v) => v.setSettingsOpen)
  const titleOf = usePSelector((v) => v.titleOf)
  const tmdbKey = usePSelector((v) => v.tmdbKey)
  const tvdbApiKey = usePSelector((v) => v.tvdbApiKey)
  const topEdgeColor = usePSelector((v) => v.topEdgeColor)
  const trendRank = usePSelector((v) => v.trendRank)
  const yearOf = usePSelector((v) => v.yearOf)
  const { t, lang } = useT()
  const ed = usePosterEditor()

  const [tvdbId, setTvdbId] = useState<number | null>(null)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const urlCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mobileSection, setMobileSection] = useState<"poster" | "preview" | "customize">("preview")
  const [activeRightTab, setActiveRightTab] = useState<"logo" | "badge" | "transform" | "stagioni">("logo")
  const [activePosterTab, setActivePosterTab] = useState("clean")
  const [testUrl, setTestUrl] = useState<string | null>(null)
  const [urlCopied, setUrlCopied] = useState(false)

  // Quando si seleziona un nuovo titolo, mostra sempre prima i clean (iso_639_1 === null)
  useEffect(() => {
    if (selected?.id) setActivePosterTab("clean")
  }, [selected?.id])

  // Lock body scroll when editor is open
  useEffect(() => {
    if (selected) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [selected])

  const { imageError, setImageError, previewLoading, loadProgress, imgSrc, retry } = usePosterPreview()

  const handleSave = useCallback(async () => {
    await saveConfig()
  }, [saveConfig])

  const handleBack = useCallback(() => {
    setSelected(null)
    setPreviewPoster(null)
    setSelectedLogo(null)
    setPreviewId(null)
  }, [setSelected, setPreviewPoster, setSelectedLogo, setPreviewId])

  const searchBar = (
    <div className={selected ? "w-full max-w-lg relative z-[100] isolate" : "max-w-lg mx-auto relative z-[100] isolate mb-8"}>
      <SearchBar
        tmdbKey={tmdbKey}
        value={query}
        onChange={setQuery}
        onSearch={(q) => { setQuery(q); router.push("search"); doSearch(q) }}
        onSelectResult={(item) => navigateToPoster(item)}
        recentSearches={recentSearches}
        onClearRecentSearches={clearRecentSearches}
        onRemoveRecentSearch={removeRecentSearch}
        large
      />
    </div>
  )

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
      if (urlCopiedTimerRef.current) clearTimeout(urlCopiedTimerRef.current)
    }
  }, [])

  // Ctrl+S to save
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSave()
      }
      // Escape to close editor
      if (e.key === "Escape" && selected && !testUrl) {
        handleBack()
      }
    }
    window.addEventListener("keydown", fn)
    return () => window.removeEventListener("keydown", fn)
  }, [handleSave, handleBack, selected, testUrl])

  // TVDB id
  const selectedId = selected?.id
  const selectedImdbId = selected?.imdb_id
  const selectedMediaType = selected?.media_type
  useEffect(() => {
    if (selectedMediaType !== "tv" || !tvdbApiKey) {
      setTvdbId(null)
      return
    }
    let active = true
    const candidates = [selectedImdbId, String(selectedId)].filter(Boolean) as string[]
    const fetchTvdbId = async (cid: string) => {
      try {
        const res = await fetch(`/api/tvdb/${encodeURIComponent(cid)}/seasonTypes?tvdb_key=${encodeURIComponent(tvdbApiKey)}&tmdb_key=${encodeURIComponent(tmdbKey || "")}`, {
          headers: { "x-api-key": tvdbApiKey, "x-tmdb-key": tmdbKey || "" },
        })
        const d = await res.json().catch(() => ({}))
        if (d?.tvdbId && Number.isFinite(d.tvdbId)) return d.tvdbId as number
        return null
      } catch { return null }
    }
    ;(async () => {
      for (const cid of candidates) {
        const id = await fetchTvdbId(cid)
        if (active && id) { setTvdbId(id); return }
      }
      if (active) setTvdbId(null)
    })()
    return () => { active = false }
  }, [selectedId, selectedImdbId, selectedMediaType, tvdbApiKey, tmdbKey])

  const cleanPoster = previewPoster?.iso_639_1 === null

  const rightTabs = useMemo(() => [
    { key: "logo", label: t("ui.logoSection") },
    { key: "badge", label: t("ui.badgeSection") },
    ...(selectedLogo ? [{ key: "transform", label: t("ui.transform") }] : []),
    ...(selected?.media_type === "tv" ? [{ key: "stagioni", label: t("ui.seasons") || "Stagioni" }] : []),
  ], [t, selectedLogo, selected?.media_type])

  useEffect(() => {
    if (!rightTabs.some((tab) => tab.key === activeRightTab)) {
      setActiveRightTab("logo")
    }
  }, [rightTabs, activeRightTab])

  const isSavedPoster = useMemo(() => {
    if (!selected) return false
    const key = `${selected.media_type}:${selected.id}`
    return mappingsMap.has(key)
  }, [mappingsMap, selected])

  // Build test URL helper
  const buildTestUrl = useCallback(() => {
    if (!selected || !previewPoster) return null
    const url = buildPreviewUrl({
      selected,
      previewPoster,
      selectedLogo,
      selectedBackdrop: ed.selectedBackdrop,
      logoScale: ed.logoScale,
      logoOffsetX: ed.logoOffsetX,
      logoOffsetY: ed.logoOffsetY,
      backdropScale: ed.backdropScale,
      backdropOffsetX: ed.backdropOffsetX,
      backdropOffsetY: ed.backdropOffsetY,
      metaInfo,
      trendRank,
      mdblistAnimeList,
      topEdgeColor,
      accentColor,
      lang,
      tmdbKey,
    }, {
      globalBadges: ed.globalBadges,
      rankingBadges: ed.rankingBadges,
      badgeGenre: ed.badgeGenre,
      badgeYear: ed.badgeYear,
      badgeRating: ed.badgeRating,
      badgeQuality: ed.badgeQuality,
      ratingSources: ed.ratingSources,
      badgeStyle: ed.badgeStyle,
      rankingBadgeStyle: ed.rankingBadgeStyle,
      customBadge: ed.customBadge,
      gradientHeight: ed.gradientHeight,
      blurIntensity: ed.blurIntensity,
      blurFade: ed.blurFade,
      blurDarkness: ed.blurDarkness,
      blurEnabled: ed.blurEnabled,
      networkLogo: ed.networkLogo,
      ribbonSide: ed.ribbonSide,
    })
    return url
  }, [selected, previewPoster, selectedLogo, ed, metaInfo, trendRank, mdblistAnimeList, topEdgeColor, accentColor, lang, tmdbKey])

  // ── Full-Page Editor (when a poster is selected) ──────────────────────────
  if (selected) {
    const titleText = titleOf(selected)
    const yearText = yearOf(selected)
    const mediaLabel = selected.media_type === "movie" ? t("ui.movie") : t("ui.tvSeries")

    return (
      <>
        {/* ═══ FULL-SCREEN EDITOR OVERLAY ═══ */}
        <div className="fullscreen-editor" role="main" aria-label={`Poster editor: ${titleText}`}>

          {/* ─── PREMIUM TOP BAR ─────────────────────────────────────── */}
          <div className="editor-topbar">
            {/* Back */}
            <button
              type="button"
              aria-label={t("ui.back")}
              onClick={handleBack}
              className="editor-back-btn"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden xs:inline">{t("ui.back")}</span>
            </button>

            {/* Title */}
            <div className="editor-topbar-title">
              <p className="text-[13px] sm:text-sm font-bold text-zinc-100 leading-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg">
                {titleText}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap justify-center">
                <span className="text-[10px] font-mono text-zinc-500">{yearText}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-zinc-600" />
                <span className="text-[10px] text-zinc-500">{mediaLabel}</span>
                {cleanPoster && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/[0.07] border border-white/10 text-zinc-400">
                    {t("ui.clean")}
                  </span>
                )}
                {isSavedPoster && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" /> {t("ui.savedShort")}
                  </span>
                )}
                <JwRankBadge tmdbId={selected.id} type={selected.media_type === "movie" ? "movie" : "tv"} regionCode={ed.defaultRegion} />
              </div>
            </div>

            {/* Actions */}
            <div className="editor-topbar-actions">
              {previewPoster && isSavedPoster && (
                <button
                  type="button"
                  aria-label={t("ui.remove")}
                  title={t("ui.remove")}
                  onClick={() => {
                    const key = `${selected.media_type}:${selected.id}`
                    const mapping = mappingsMap.get(key)
                    if (mapping) removeMapping(mapping).catch((e) => console.error("[pictorium] Remove mapping failed:", e))
                    handleBack()
                  }}
                  className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 active:scale-90"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {previewPoster && (
                <button
                  type="button"
                  aria-label={t("ui.testUrl")}
                  title={t("ui.testUrl")}
                  onClick={() => {
                    const url = buildTestUrl()
                    if (!url) return
                    setUrlCopied(false)
                    setTestUrl(`${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`)
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t("ui.testUrl")}</span>
                </button>
              )}

              {previewPoster && (
                <button
                  type="button"
                  aria-label={t("ui.savePoster")}
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-accent-orange to-amber-500 text-white font-bold text-xs shadow-md shadow-accent-orange/25 hover:shadow-accent-orange/40 hover:scale-[1.02] active:scale-[0.97] transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t("ui.savePoster")}</span>
                </button>
              )}
            </div>
          </div>

          {/* ─── EDITOR BODY ─────────────────────────────────────────── */}
          <div className="editor-body">

            {/* Mobile Segmented Switcher: Poster / Preview / Customize — only on mobile (<md) */}
            <div className="flex md:hidden items-center justify-center p-1 mx-3 mt-2.5 bg-surface/90 backdrop-blur-md rounded-2xl border border-white/[0.08] shadow-lg shadow-black/20 flex-shrink-0">
              {[
                { key: "poster", label: t("ui.poster"), sub: `(${posters.length})` },
                { key: "preview", label: t("ui.preview"), sub: "" },
                { key: "customize", label: t("ui.customize"), sub: "" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMobileSection(item.key as typeof mobileSection)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    mobileSection === item.key
                      ? "bg-accent-orange text-white shadow-md shadow-accent-orange/20"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span>{item.label}</span>
                  {item.sub && <span className="text-[10px] opacity-70 font-mono">{item.sub}</span>}
                </button>
              ))}
            </div>

            {/* 3-Column Workspace */}
            <div className="editor-workspace">

              {/* LEFT: Poster Selection */}
              <div className={`${mobileSection === "poster" ? "block" : "hidden md:block"} h-full min-w-0`}>
                <EditorPanel
                  className="animate-fade-scale-in-panel-left h-full"
                  aria-label={`${selected?.title || ""} — Poster selection`}
                  title={t("ui.posterAvailable")}
                  headerRight={
                    <span className="text-[10px] font-mono text-muted px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/10 tabular-nums">
                      {posters.length}
                    </span>
                  }
                >
                  {loadingImages ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-8 rounded-lg skeleton-shimmer" />
                      ))}
                    </div>
                  ) : (
                    <PosterOptions
                      posters={posters}
                      posterActivePath={posterActivePath}
                      lang={lang}
                      selectPoster={selectPoster}
                      activeGroup={activePosterTab}
                      onActiveGroupChange={setActivePosterTab}
                      showTabs
                    />
                  )}
                </EditorPanel>
              </div>

              {/* CENTER: Live Preview — visible on desktop always, on mobile only in "preview" tab */}
              <div className={`${mobileSection === "preview" ? "block" : "hidden md:block"} h-full min-w-0`}>
                <EditorPanel
                  className="animate-fade-scale-in h-full"
                  title={<><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 align-middle shadow-[0_0_6px_rgba(52,211,153,0.7)]" aria-hidden="true" />{t("ui.previewLive")}</>}
                  footer={
                    previewPoster && selected ? (
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {/* Remove mapping button */}
                        {(() => {
                          const key = `${selected.media_type}:${selected.id}`
                          const hasMapping = mappingsMap.get(key)
                          if (!hasMapping) return null
                          return (
                            <button
                              type="button"
                              aria-label={t("ui.remove")}
                              onClick={() => {
                                removeMapping(hasMapping).catch((e) => console.error("[pictorium] Remove mapping failed:", e))
                                handleBack()
                              }}
                              className="btn-danger min-h-[44px] px-4 rounded-xl text-xs"
                            >
                              <Trash2 className="w-4 h-4" />
                              {t("ui.remove")}
                            </button>
                          )
                        })()}
                        <button
                          type="button"
                          aria-label={t("ui.testUrl")}
                          onClick={() => {
                            const url = buildTestUrl()
                            if (!url) return
                            setUrlCopied(false)
                            setTestUrl(`${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`)
                          }}
                          className="btn-secondary min-h-[44px] px-4 rounded-xl text-xs"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {t("ui.testUrl")}
                        </button>
                        <button
                          type="button"
                          aria-label={t("ui.savePoster")}
                          onClick={handleSave}
                          className="btn-primary min-h-[44px] px-5 rounded-xl"
                        >
                          <Save className="w-4 h-4" />
                          {t("ui.savePoster")}
                        </button>
                      </div>
                    ) : undefined
                  }
                >
                  <div className="flex flex-col items-center h-full min-h-0">
                    <div className="flex-1 min-h-0 w-full flex items-center justify-center">
                      <div className="editor-preview-fit relative">
                        <div className={`editor-stage editor-stage-fill isolate ${previewPoster?.file_path ? "editor-stage-glow" : ""}`}>
                          <PosterDepthEdge edgeStrength={40} edgeCoverage={10} />
                          <div
                            className="absolute -inset-8 rounded-3xl opacity-45 blur-3xl pointer-events-none transition-all duration-700 ease-out z-0"
                            style={{
                              background: accentColor
                                ? `radial-gradient(circle at 50% 50%, ${accentColor}, transparent 70%)`
                                : "radial-gradient(circle at 50% 50%, rgba(232, 93, 42, 0.40), transparent 70%)",
                            }}
                          />
                          <div className="absolute inset-0 z-[1]">
                            <PosterPreview
                              previewLoading={previewLoading}
                              loadProgress={loadProgress}
                              imageError={imageError}
                              setImageError={setImageError}
                              imgSrc={imgSrc}
                              onRetry={retry}
                            />
                          </div>
                          <PosterDepthSheen sheenStrength={20} />
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-500 text-center mt-3 shrink-0">
                      {selectedLogo
                        ? t("ui.logoSelected")
                        : previewPoster?.iso_639_1 === null
                        ? `${t("ui.clean")} ${t("ui.selected").toLowerCase()}`
                        : previewPoster
                        ? t("ui.logoHint")
                        : t("ui.noPosterSelected")}
                    </p>
                  </div>
                </EditorPanel>
              </div>

              {/* RIGHT: Customization (hidden on tablet — shown via tab on mobile) */}
              <div className={`${mobileSection === "customize" ? "block" : "hidden md:block"} h-full min-w-0`}>
                <EditorPanel
                  className="animate-fade-scale-in-panel-right h-full"
                  title={t("ui.customize")}
                  tabs={rightTabs}
                  activeTab={activeRightTab}
                  onTabChange={(k) => setActiveRightTab(k as typeof activeRightTab)}
                >
                  {/* Details sub-header */}
                  <div className="mb-3 pb-3 border-b border-white/[0.08]">
                    <h3 className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">{t("ui.details")}</h3>
                    <p className="text-sm font-bold tracking-tight text-zinc-50 truncate">{titleOf(selected)}</p>
                    <p className="text-[11px] font-mono text-zinc-500 mt-1">
                      {yearOf(selected)} · {selected.media_type === "movie" ? t("ui.movie") : t("ui.tvSeries")} · TMDB{" "}
                      <a href={`https://www.themoviedb.org/${selected.media_type}/${selected.id}`} target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-white underline underline-offset-2">
                        {selected.id}
                      </a>
                      {selected.imdb_id ? (
                        <>
                          {" "}· IMDB{" "}
                          <a href={`https://www.imdb.com/title/${selected.imdb_id}`} target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-white underline underline-offset-2">
                            {selected.imdb_id}
                          </a>
                        </>
                      ) : ""}
                      {tvdbId ? (
                        <>
                          {" "}· TVDB{" "}
                          <a href={`https://thetvdb.com/?tab=series&id=${tvdbId}`} target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-white underline underline-offset-2">
                            {tvdbId}
                          </a>
                        </>
                      ) : ""}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      {cleanPoster && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-muted uppercase tracking-wide">
                          {t("ui.clean")}
                        </span>
                      )}
                      {isSavedPoster && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          {t("ui.savedShort")}
                        </span>
                      )}
                      <JwRankBadge tmdbId={selected.id} type={selected.media_type === "movie" ? "movie" : "tv"} regionCode={ed.defaultRegion} />
                    </div>
                  </div>

                  <div className="animate-tab-fade-in space-y-3">
                    {activeRightTab === "logo" && (
                      <>
                        <LogoOptions logos={logos} selectedLogo={selectedLogo} lang={lang} selectLogo={selectLogo} removeLogo={removeLogo} disabled={!cleanPoster} />
                        {!cleanPoster && <p className="text-xs text-zinc-500 text-center mt-2 px-1">{t("ui.logoHint")}</p>}
                      </>
                    )}
                    {activeRightTab === "badge" && <BadgeControls />}
                    {activeRightTab === "transform" && <TransformControls />}
                    {activeRightTab === "stagioni" && <EpisodeGroupControls />}
                  </div>
                </EditorPanel>
              </div>

            </div>
          </div>
        </div>

        {/* ─── Test URL Modal (portal) ──────────────────────────────── */}
        {testUrl && createPortal(
          <div
            className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm overflow-y-auto animate-fade-scale-in"
            onClick={() => setTestUrl(null)}
          >
            <div
              className="max-w-md mx-auto px-4 py-8 min-h-full flex flex-col justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-zinc-50">{t("ui.testUrlTitle")}</h3>
                <button
                  type="button"
                  onClick={() => setTestUrl(null)}
                  aria-label={t("ui.close")}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface2 hover:bg-zinc-700 text-muted hover:text-zinc-200 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-surface shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element -- poster reale renderizzato dal server */}
                <img src={testUrl} alt={t("ui.testUrlTitle")} className="w-full" />
              </div>
              <div className="mt-4 flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2">
                <code className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-mono text-muted select-text">
                  {testUrl}
                </code>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(testUrl)
                      setUrlCopied(true)
                      if (urlCopiedTimerRef.current) clearTimeout(urlCopiedTimerRef.current)
                      urlCopiedTimerRef.current = setTimeout(() => setUrlCopied(false), 2000)
                    } catch { /* clipboard not available */ }
                  }}
                  className="btn-secondary min-h-[44px] rounded-xl text-xs"
                >
                  {urlCopied ? t("ui.copied") : t("ui.copyPosterUrl")}
                </button>
                <button
                  type="button"
                  onClick={() => window.open(testUrl, "_blank")}
                  className="btn-primary min-h-[44px] rounded-xl text-xs"
                >
                  {t("ui.openInNewTab")}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    )
  }

  // ── HOME / SEARCH / LANDING STATE ────────────────────────────────────────
  return (
    <div>
      {searchBar}

      {!tmdbKey && (
        <div className="max-w-md mx-auto mt-16 mb-16">
          <div className="glass-panel relative overflow-hidden p-8 flex flex-col items-center text-center animate-fade-scale-in-hero">
            <div className="welcome-accent" />
            <span className="hero-kicker mb-4">{t("ui.welcomePanelKicker")}</span>
            <div className="w-14 h-14 rounded-2xl bg-accent-orange/15 border border-accent-orange/20 flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-accent-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <polygon points="9.5 8 15.5 12 9.5 16 9.5 8" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-zinc-100 mb-2">{t("ui.welcomePanelTitle")}</h2>
            <p className="text-sm text-muted mb-6 leading-relaxed">{t("ui.noKey")}</p>
            <button type="button" onClick={() => setSettingsOpen(true)} className="btn-primary px-5 py-2.5 text-sm">
              {t("ui.openSettings")}
            </button>
            <div className="grid grid-cols-3 gap-3 mt-8 w-full">
              <div className="feature-card">
                <div className="feature-icon">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="feature-card-title">{t("ui.welcomeFeature1Title")}</span>
                  <span className="feature-card-desc">{t("ui.welcomeFeature1Desc")}</span>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><polygon points="9.5 8 15.5 12 9.5 16 9.5 8" fill="currentColor" stroke="none"/></svg>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="feature-card-title">{t("ui.welcomeFeature2Title")}</span>
                  <span className="feature-card-desc">{t("ui.welcomeFeature2Desc")}</span>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="feature-card-title">{t("ui.welcomeFeature3Title")}</span>
                  <span className="feature-card-desc">{t("ui.welcomeFeature3Desc")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tmdbKey && (
        <>
          <HomeHero />
          <ScrollReveal animation="fade-up" threshold={0.05}>
            <HomeFeaturesGrid />
          </ScrollReveal>
          <ScrollReveal animation="fade-up" threshold={0.05}>
            <PosterCarousel />
          </ScrollReveal>
        </>
      )}
    </div>
  )
}
