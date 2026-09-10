"use client"

import { usePSelector } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { usePosterEditor } from "@/lib/contexts/PosterEditorContext"
import { getRegionDef } from "@/lib/regions"
import { toSearchResult } from "@/lib/types"
import { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { ScrollReveal } from "@/components/ScrollReveal"
import { SimklCard, type SimklCardItem } from "@/components/SimklCard"
import { CustomCatalogModal } from "@/components/CustomCatalogModal"
import { CatalogManagerModal } from "@/components/CatalogManagerModal"
import { posterUrl } from "@/lib/utils"
import { X, Check, ListPlus, Trash2, Film, Tv, Shuffle, Power, SlidersHorizontal, Home } from "lucide-react"

interface GridViewItem {
  tmdbId: number | null
  mediaType: "movie" | "tv"
  title: string
  posterPath: string | null
}

/** Coppia di contenitori Film | Serie affiancati sulla stessa riga (2 colonne su desktop). */
function CatalogPair({
  movies,
  tv,
  totalMovies,
  totalTv,
  movieTitle,
  tvTitle,
  movieGridTitle,
  tvGridTitle,
  openGrid,
  onItemClick,
  savedKeys,
}: {
  movies: SimklCardItem[]
  tv: SimklCardItem[]
  totalMovies: number
  totalTv: number
  movieTitle: string
  tvTitle: string
  movieGridTitle: string
  tvGridTitle: string
  openGrid: (items: GridViewItem[], title: string) => void
  onItemClick: (item: SimklCardItem) => void
  savedKeys: Set<string>
}) {
  const hasMovies = movies.length > 0
  const hasTv = tv.length > 0
  if (!hasMovies && !hasTv) return null

  const toGrid = (list: SimklCardItem[]): GridViewItem[] =>
    list.map((it) => ({
      tmdbId: it.tmdbId ?? it.id ?? null,
      mediaType: (it.media_type || it.mediaType || "movie") as "movie" | "tv",
      title: it.title ?? it.name ?? "",
      posterPath: it.poster_path ?? it.posterPath ?? null,
    }))

  return (
    <div className={`grid gap-3 ${hasMovies && hasTv ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
      {hasMovies && (
        <SimklCard
          className="simkl-list-card--fill"
          items={movies}
          title={movieTitle}
          totalCount={totalMovies}
          onClick={() => openGrid(toGrid(movies), movieGridTitle)}
          onItemClick={onItemClick}
          savedKeys={savedKeys}
        />
      )}
      {hasTv && (
        <SimklCard
          className="simkl-list-card--fill"
          items={tv}
          title={tvTitle}
          totalCount={totalTv}
          onClick={() => openGrid(toGrid(tv), tvGridTitle)}
          onItemClick={onItemClick}
          savedKeys={savedKeys}
        />
      )}
    </div>
  )
}

function CustomCatalogEntry({
  cat,
  openGrid,
  onItemClick,
  savedKeys,
  toggleCustomCatalog,
  removeCustomCatalog,
  homeDisabledCatalogIds,
  toggleCatalogHome,
  tmdbKey,
  mdblistApiKey,
}: {
  cat: import("@/lib/types").CustomCatalogConfig
  openGrid: (items: GridViewItem[], title: string) => void
  onItemClick: (item: SimklCardItem) => void
  savedKeys: Set<string>
  toggleCustomCatalog: (id: string) => void
  removeCustomCatalog: (id: string) => void
  homeDisabledCatalogIds: string[]
  toggleCatalogHome: (id: string) => void
  tmdbKey: string
  mdblistApiKey: string
}) {
  const { t } = useT()
  const [items, setItems] = useState<SimklCardItem[]>([])
  const [loading, setLoading] = useState(true)
  const isEnabled = cat.enabled !== false
  const isHomeVisible = !homeDisabledCatalogIds.includes(cat.id)
  const isMixed = cat.type === "mixed"
  const isMovie = cat.type === "movie"

  useEffect(() => {
    let active = true
    const params = new URLSearchParams({
      url: cat.url,
      api_key: tmdbKey || "",
      mdblist_key: mdblistApiKey || "",
      limit: "500",
    })
    fetch(`/api/mdblist/custom?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return
        if (Array.isArray(data?.items)) {
          setItems(data.items)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [cat.url, tmdbKey, mdblistApiKey])

  const movies = items.filter((it) => (it.media_type || it.mediaType) === "movie")
  const tv = items.filter((it) => (it.media_type || it.mediaType) !== "movie")

  return (
    <div className={`p-4 rounded-2xl border transition-all duration-200 ${
      isEnabled ? "bg-surface border-white/10 shadow-sm" : "bg-surface/40 border-white/5 opacity-60"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
            isMixed
              ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
              : isMovie
              ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
              : "bg-purple-500/15 text-purple-400 border border-purple-500/20"
          }`}>
            {isMixed ? <Shuffle className="w-3 h-3" /> : isMovie ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
            {isMixed ? "Misto" : isMovie ? "Film" : "Serie TV"}
          </span>
          <h3 className="text-base font-bold text-white line-clamp-1">{cat.name}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleCatalogHome(cat.id)}
            title={
              isHomeVisible
                ? "Visibile nella Home di Stremio (clicca per nascondere dalla Home)"
                : "Nascosto dalla Home di Stremio (visibile solo in Esplora — clicca per mostrare nella Home)"
            }
            className={`p-1.5 rounded-lg border transition-colors ${
              isHomeVisible
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                : "bg-white/5 border-white/5 text-muted hover:text-white"
            }`}
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => toggleCustomCatalog(cat.id)}
            title={isEnabled ? t("ui.disableStremio") : t("ui.enableStremio")}
            className={`p-1.5 rounded-lg border transition-colors ${
              isEnabled
                ? "bg-accent-orange/15 border-accent-orange/30 text-accent-orange hover:bg-accent-orange/25"
                : "bg-white/5 border-white/5 text-muted hover:text-white"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => removeCustomCatalog(cat.id)}
            title={t("ui.deleteCatalog")}
            className="p-1.5 rounded-lg border border-white/5 text-muted hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-28 flex items-center justify-center rounded-xl bg-black/20 border border-white/5 text-xs text-muted">
          <div className="w-4 h-4 border-2 border-accent-orange/30 border-t-accent-orange rounded-full animate-spin mr-2" />
          {t("ui.customLoadingTitles")}
        </div>
      ) : items.length === 0 ? (
        <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-xs text-muted">
          {t("ui.customNoTitles")}
        </div>
      ) : isMixed ? (
        <CatalogPair
          movies={movies}
          tv={tv}
          totalMovies={movies.length}
          totalTv={tv.length}
          movieTitle={`${cat.name} — ${t("ui.movie")}`}
          tvTitle={`${cat.name} — ${t("ui.tvSeries")}`}
          movieGridTitle={`${cat.name} — ${t("ui.movie")}`}
          tvGridTitle={`${cat.name} — ${t("ui.tvSeries")}`}
          openGrid={openGrid}
          onItemClick={onItemClick}
          savedKeys={savedKeys}
        />
      ) : isMovie ? (
        <CatalogPair
          movies={movies.length > 0 ? movies : items}
          tv={[]}
          totalMovies={movies.length > 0 ? movies.length : items.length}
          totalTv={0}
          movieTitle={cat.name}
          tvTitle=""
          movieGridTitle={cat.name}
          tvGridTitle=""
          openGrid={openGrid}
          onItemClick={onItemClick}
          savedKeys={savedKeys}
        />
      ) : (
        <CatalogPair
          movies={[]}
          tv={tv.length > 0 ? tv : items}
          totalMovies={0}
          totalTv={tv.length > 0 ? tv.length : items.length}
          movieTitle=""
          tvTitle={cat.name}
          movieGridTitle=""
          tvGridTitle={cat.name}
          openGrid={openGrid}
          onItemClick={onItemClick}
          savedKeys={savedKeys}
        />
      )}
    </div>
  )
}

export function CataloghiView() {
  const mappings = usePSelector((v) => v.mappings)
  const navigateToPoster = usePSelector((v) => v.navigateToPoster)
  const router = usePSelector((v) => v.router)
  const customCatalogs = usePSelector((v) => v.customCatalogs)
  const removeCustomCatalog = usePSelector((v) => v.removeCustomCatalog)
  const toggleCustomCatalog = usePSelector((v) => v.toggleCustomCatalog)
  const homeDisabledCatalogIds = usePSelector((v) => v.homeDisabledCatalogIds)
  const toggleCatalogHome = usePSelector((v) => v.toggleCatalogHome)
  const tmdbKey = usePSelector((v) => v.tmdbKey)
  const mdblistApiKey = usePSelector((v) => v.mdblistApiKey)
  const { t } = useT()
  const typeFilters = useMemo(() => [
    { id: "all", label: t("ui.all") },
    { id: "movie", label: t("ui.movie") },
    { id: "series", label: t("ui.tvSeries") },
    { id: "mixed", label: "Misto" },
  ], [t])
  const [gridItems, setGridItems] = useState<GridViewItem[] | null>(null)
  const [gridTitle, setGridTitle] = useState("")
  const [platformFilter, setPlatformFilter] = useState<string>("all")
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false)
  const [isManagerOpen, setIsManagerOpen] = useState(false)

  const savedKeys = useMemo(
    () => new Set(mappings.map((m) => `${m.mediaType}:${m.tmdbId}`)),
    [mappings],
  )

  const openGrid = (items: GridViewItem[], title: string) => {
    setGridItems(items)
    setGridTitle(title)
  }

  const navigateToItem = (item: SimklCardItem) => {
    const id = item.tmdbId ?? item.id
    if (!id) return
    const mediaType = (item.media_type || item.mediaType) as "movie" | "tv" || "movie"
    const title = item.title ?? item.name ?? ""
    navigateToPoster(toSearchResult({
      id,
      media_type: mediaType,
      title,
      name: title,
      poster_path: item.poster_path ?? item.posterPath,
    }), "cataloghi")
  }

  const SCROLL_KEY = "cataloghi:scroll"

  useEffect(() => {
    // sessionStorage può lanciare (private mode, iframe sandbox): non deve rompere il render
    let saved: string | null = null
    try { saved = sessionStorage.getItem(SCROLL_KEY) } catch { /* storage non disponibile */ }
    if (saved) {
      requestAnimationFrame(() => window.scrollTo(0, Number(saved)))
    }
    return () => {
      try { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)) } catch { /* storage non disponibile */ }
    }
  }, [])

  // Blocca lo scroll del body quando la griglia è aperta
  useEffect(() => {
    if (gridItems) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [gridItems])

  const filteredCustomCatalogs = useMemo(() => {
    if (platformFilter === "all") return customCatalogs
    return customCatalogs.filter((cat) => cat.type === platformFilter)
  }, [customCatalogs, platformFilter])

  return (
    <div className="max-w-6xl mx-auto animate-fade-scale-in">
      <ScrollReveal animation="fade-up-fast">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <button type="button"
              onClick={() => router.push("edit")}
              className="text-xs text-muted hover:text-white transition-colors mb-3 inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              {t("ui.homeBtn")}
            </button>
            <h1 className="text-2xl font-bold text-zinc-50">{t("ui.catalogsTitle")}</h1>
            <p className="text-sm text-muted mt-1">{t("ui.catalogsSubtitle")}</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            {customCatalogs.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsManagerOpen((prev) => !prev)
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface2 border border-white/10 hover:border-white/20 text-zinc-200 text-xs font-semibold hover:text-white active:scale-95 transition-all shadow-sm"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-accent-orange" />
                  <span>{t("ui.priorityNames")}</span>
                </button>
                <CatalogManagerModal isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
              </div>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsAddCustomOpen((prev) => !prev)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold active:scale-95 transition-all shadow-md border border-white/40 cursor-pointer"
              >
                <ListPlus className="w-4 h-4 text-zinc-950" />
                <span className="text-zinc-950 font-bold">{t("ui.addCatalog")}</span>
              </button>
              <CustomCatalogModal isOpen={isAddCustomOpen} onClose={() => setIsAddCustomOpen(false)} />
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Catalog Type Filter Chips */}
      {customCatalogs.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 mb-8">
          {typeFilters.map((f) => (
            <button
              type="button"
              key={f.id}
              onClick={() => setPlatformFilter(f.id)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 active:scale-95 ${
                platformFilter === f.id
                  ? "bg-accent-orange/15 text-accent-orange border border-accent-orange/30 shadow-sm font-semibold"
                  : "bg-surface/80 text-muted hover:text-zinc-200 border border-white/5 hover:border-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Custom Catalogs List */}
      {filteredCustomCatalogs.length > 0 ? (
        <ScrollReveal animation="fade-up" threshold={0.05}>
          <div className="mb-12 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-heading text-xl font-bold">{t("ui.customCatalogs")}</h2>
              <span className="text-xs text-muted">
                {t("ui.activeOnStremio", { count: customCatalogs.filter((c) => c.enabled !== false).length })}
              </span>
            </div>
            <div className="space-y-6">
              {filteredCustomCatalogs.map((cat) => (
                <CustomCatalogEntry
                  key={cat.id}
                  cat={cat}
                  openGrid={openGrid}
                  onItemClick={navigateToItem}
                  savedKeys={savedKeys}
                  toggleCustomCatalog={toggleCustomCatalog}
                  removeCustomCatalog={removeCustomCatalog}
                  homeDisabledCatalogIds={homeDisabledCatalogIds}
                  toggleCatalogHome={toggleCatalogHome}
                  tmdbKey={tmdbKey}
                  mdblistApiKey={mdblistApiKey}
                />
              ))}
            </div>
          </div>
        </ScrollReveal>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl bg-surface/40 border border-white/5 my-6 animate-fade-scale-in">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-zinc-300 shadow-inner">
            <ListPlus className="w-7 h-7 text-zinc-300" />
          </div>
          <h3 className="text-lg font-bold text-zinc-100 mb-1">
            {customCatalogs.length === 0 ? "No Custom Catalogs Added Yet" : "No Catalogs in this Category"}
          </h3>
          <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
            {customCatalogs.length === 0
              ? "Add your own custom catalog lists from Letterboxd, Trakt, TMDb, MDBList, IMDb or TVDB."
              : "Try switching to 'All' or add a new custom catalog."}
          </p>
          <button
            type="button"
            onClick={() => setIsAddCustomOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold transition-all shadow-lg shadow-white/10 border border-white/40 cursor-pointer active:scale-95"
          >
            <ListPlus className="w-4 h-4 text-zinc-950" />
            <span className="text-zinc-950 font-bold">{t("ui.addCatalog")}</span>
          </button>
        </div>
      )}

      {trending.length === 0 && trendingError && (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 animate-fade-scale-in">
          <div className="empty-state-illustration mb-5">
            <svg className="w-10 h-10 text-danger/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-sm text-muted mb-4">{t("ui.catalogsError")}</p>
          <button type="button" onClick={() => { void refreshLists() }} className="btn-ghost px-4 py-2 text-xs">{t("ui.retry")}</button>
        </div>
      )}

      {gridItems && createPortal(
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm overflow-y-auto animate-fade-scale-in" onClick={() => setGridItems(null)}>
          <div className="max-w-7xl mx-auto px-4 py-6 min-h-screen" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-50">{gridTitle}</h2>
              <button type="button"
                onClick={() => setGridItems(null)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface2 hover:bg-zinc-700 text-muted hover:text-zinc-200 transition-all"
                aria-label={t("ui.close")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {gridItems.map((item, idx) => {
                const src = item.posterPath ? posterUrl(item.posterPath, "w342") : ""
                const itemKey = `${item.mediaType}:${item.tmdbId}`
                const isSaved = item.tmdbId ? savedKeys.has(itemKey) : false

                return (
                  <button type="button"
                    key={`${item.mediaType}:${item.tmdbId ?? "item"}-${idx}`}
                    onClick={() => {
                      if (item.tmdbId) {
                        navigateToPoster(toSearchResult({
                          id: item.tmdbId,
                          media_type: item.mediaType,
                          title: item.title,
                          name: item.title,
                          poster_path: item.posterPath,
                        }), "cataloghi")
                      }
                    }}
                    className={`group relative aspect-[2/3] rounded-xl overflow-hidden bg-surface2 transition-all focus:outline-none focus:ring-2 focus:ring-accent ${
                      isSaved
                        ? "ring-2 ring-emerald-500/80 border-emerald-500/80"
                        : "hover:ring-2 hover:ring-accent/50"
                    }`}
                  >
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote TMDB poster tiles (lazy, optimized by CDN)
                      <img
                        src={src}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs p-2 text-center leading-relaxed">
                        {item.title}
                      </div>
                    )}
                    {isSaved && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-500/90 text-white text-[10px] font-semibold flex items-center gap-1 shadow-lg backdrop-blur-sm z-10">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>{t("ui.savedShort")}</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
