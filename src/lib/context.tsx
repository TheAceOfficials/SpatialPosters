"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, useSyncExternalStore } from "react"
import type { SearchResult, TMDBImage, Mapping, CustomCatalogConfig } from "./types"
import { posterUrl, titleOf, yearOf, STREAMING_PLATFORMS } from "./utils"
import { matchTMDBStudios } from "./awards"
import { setLang as setI18nLang, createT } from "./i18n"
import { isSupportedUiLang, getRegionDef, defaultRegionForLang } from "./regions"
import type { EnrichedAnimeItem } from "./validation"
import { http } from "./http"
import { useRootColors } from "./useRootColors"
import { buildUrlPattern, buildPreviewUrl } from "./poster-url"
import { selectBestLogo, autoLogoSelection, logoDefaultScale } from "./logo-selection"
import { useTrending } from "./useTrending"
import { useSearch } from "./useSearch"
import { useNavigation } from "./useNavigation"
import { useMappingsStore } from "./useMappingsStore"
import { usePosterEditor, PosterEditorProvider } from "./contexts/PosterEditorContext"
import { usePosterSave } from "./usePosterSave"
import { defaultGradientHeightForPoster } from "./gradient-defaults"
import { computeLogoOffsetBounds } from "./logo-layout"
import { useOutsideDismiss } from "./useOutsideDismiss"
import { calculateAverageRating, type AggregatedRatings } from "./ratings"
import { SearchProvider } from "./contexts/SearchContext"
import { SettingsProvider } from "./contexts/SettingsContext"
import { TranslationProvider } from "./contexts/TranslationContext"
import { MetaInfoProvider } from "./contexts/MetaInfoContext"
import { MappingsProvider } from "./contexts/MappingsContext"
import { useCustomCatalogs } from "./useCustomCatalogs"
import { migrateLegacyStorage } from "./storage-migration"

export type ViewType = "search" | "myposters" | "edit" | "cataloghi"

export interface MetaInfo {
  genres: { id: number; name: string }[]
  voteAverage: number
  aggregatedRatings?: AggregatedRatings | null
  type?: string
  status?: string
  release_date?: string
  first_air_date?: string
  last_air_date?: string
  next_episode_to_air?: { air_date: string; episode_number: number; season_number: number } | null
  number_of_seasons?: number
  number_of_episodes?: number
  awards?: string[]
  nominations?: string[]
  studios?: string[]
  director?: string | null
  keywords?: string[]
  imdb_id?: string | null
  /** Dettaglio reti/produzioni con logo_path TMDB per fallback network logo (SVG → TMDB). */
  networksDetailed?: { name: string; logo_path: string | null; origin_country?: string }[]
  productionCompaniesDetailed?: { name: string; logo_path: string | null; origin_country?: string }[]
}

export interface PictoriumCtx {
  selected: SearchResult | null
  setSelected: React.Dispatch<React.SetStateAction<SearchResult | null>>
  view: ViewType
  setView: React.Dispatch<React.SetStateAction<ViewType>>
  /** Navigazione centralizzata (push/replace/back). */
  router: { push: (v: ViewType) => void; replace: (v: ViewType) => void; back: () => void }
  posters: TMDBImage[]
  loadingImages: boolean
  previewPoster: TMDBImage | null
  setPreviewPoster: React.Dispatch<React.SetStateAction<TMDBImage | null>>
  selectedLogo: TMDBImage | null
  setSelectedLogo: React.Dispatch<React.SetStateAction<TMDBImage | null>>
  logos: TMDBImage[]
  posterActivePath: string | null
  previewUrl: string
  urlPattern: string
  lang: string
  openSections: Record<string, boolean>
  toggleSection: (k: string) => void
  posterScrollRef: React.RefObject<HTMLDivElement | null>
  posterScrollInfo: { top: number; height: number }
  setPosterScrollInfo: React.Dispatch<React.SetStateAction<{ top: number; height: number }>>
  selectPoster: (img: TMDBImage) => Promise<void>
  selectLogo: (logo: TMDBImage) => Promise<void>
  removeLogo: () => Promise<void>
  logoBounds: { minX: number; maxX: number; minY: number; maxY: number }
  selectBackdrop: (img: TMDBImage) => void
  removeBackdrop: () => void
  trendRank: number | null
  mdblistMatch: { key: string; rank: number } | null
  /** Pre-resolved IMDb Top 250 membership for the current metaInfo. */
  imdbTop250: boolean
  metaInfo: MetaInfo
  previewId: string | null
  setPreviewId: React.Dispatch<React.SetStateAction<string | null>>
  saveConfig: () => Promise<void>
  removeMapping: (m: Mapping) => Promise<void>
  mappingsMap: Map<string, Mapping>
  goHome: () => void
  sourceView: "edit" | "search" | "myposters" | "cataloghi" | null
  navigateToPoster: (item: SearchResult, source?: string) => void
  refreshLists: () => Promise<void>
  tmdbKey: string
  setQuery: React.Dispatch<React.SetStateAction<string>>
  doSearch: (q?: string, page?: number) => Promise<void>
  loadMore: () => Promise<void>
  titleOf: (r: SearchResult) => string
  yearOf: (r: SearchResult) => string
  posterUrl: (path: string, size?: string) => string
  trending: (SearchResult & { rank: number })[]
  trendingError: boolean
  mdblistAnimeList: EnrichedAnimeItem[]
  streamingCharts: Record<string, import("./types").FlixPatrolChart>
  STREAMING_PLATFORMS: typeof STREAMING_PLATFORMS
  loadMappings: () => Promise<void>
  query: string
  results: SearchResult[]
  searching: boolean
  error: string | null
  setError: (v: string | null) => void
  totalResults: number
  totalPages: number
  searchPage: number
  recentSearches: string[]
  removeRecentSearch: (search: string) => void
  clearRecentSearches: () => void
  mappings: Mapping[]
  settingsRef: React.RefObject<HTMLDivElement | null>
  langRef: React.RefObject<HTMLDivElement | null>
  setLangOpen: React.Dispatch<React.SetStateAction<boolean>>
  langOpen: boolean
  pickLang: (l: string) => void
  settingsOpen: boolean
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>
  showLangPicker: boolean
  setShowLangPicker: React.Dispatch<React.SetStateAction<boolean>>
  t: (key: string, params?: Record<string, string | number>) => string
  tmdbKeyInput: string
  setTmdbKeyInput: React.Dispatch<React.SetStateAction<string>>
  showKey: boolean
  setShowKey: React.Dispatch<React.SetStateAction<boolean>>
  setTmdbKey: (v: string) => void
  mdblistApiKey: string
  setMdblistApiKey: (v: string) => void
  tvdbApiKey: string
  setTvdbApiKey: (v: string) => void
  exportData: () => Promise<void>
  importData: () => void
  copyUrl: () => Promise<void>
  copied: boolean
  accentColor: string | null
  autoAccentColor: string | null
  setAccentColor: (v: string | null) => void
  topEdgeColor: string | null
  autoSaveExcludedPosters: (nextExcluded: string[], nextRotationPosters?: string[], nextPreviewPoster?: TMDBImage) => Promise<void>
  theme: "dark" | "light"
  setTheme: React.Dispatch<React.SetStateAction<"dark" | "light">>
  uiAccent: boolean
  setUiAccent: React.Dispatch<React.SetStateAction<boolean>>
  serviceErrors: Record<string, boolean>
  setServiceErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  hasNetflixRank: boolean
  customCatalogs: CustomCatalogConfig[]
  setCustomCatalogs: (catalogs: CustomCatalogConfig[]) => void
  addCustomCatalog: (catalog: Omit<CustomCatalogConfig, "id">) => void
  removeCustomCatalog: (id: string) => void
  toggleCustomCatalog: (id: string) => void
  disabledCatalogIds: string[]
  setDisabledCatalogIds: (ids: string[]) => void
  toggleBuiltinCatalog: (id: string) => void
  homeDisabledCatalogIds: string[]
  setHomeDisabledCatalogIds: (ids: string[]) => void
  toggleCatalogHome: (id: string) => void
  catalogOrder: string[]
  setCatalogOrder: (order: string[]) => void
  moveCatalog: (id: string, direction: "up" | "down") => void
  catalogRenames: Record<string, string>
  setCatalogRenames: (renames: Record<string, string>) => void
  renameCatalog: (id: string, newName: string) => void
  resetCatalogNames: () => void
  resetCatalogOrder: () => void
}

const Ctx = createContext<PictoriumCtx | null>(null)

// Store scoped al provider per la subscription ottimizzata (usePSelector):
// ogni PictoriumProvider ha il proprio store, così i test restano isolati e i
// selettori ri-renderizzano SOLO quando lo slice selezionato cambia (Object.is).
interface SelectorStore {
  value: PictoriumCtx | null
  listeners: Set<() => void>
}
const SelectorStoreCtx = createContext<SelectorStore | null>(null)

/**
 * Consuma solo lo slice richiesto del contesto Pictorium. Il componente
 * ri-renderizza SOLO quando il valore selezionato cambia (Object.is), non a
 * ogni aggiornamento di qualsiasi slice. Il selettore DEVE restituire un
 * riferimento stabile (primitiva o campo di stato esistente), mai un oggetto
 * nuovo creato inline, altrimenti il confronto fallisce.
 */
export function usePSelector<T>(selector: (v: PictoriumCtx) => T): T {
  const store = useContext(SelectorStoreCtx)
  if (!store) throw new Error("usePSelector must be inside PictoriumProvider")
  const get = (): T | undefined => (store.value ? selector(store.value) : undefined)
  return useSyncExternalStore(
    (cb) => {
      store.listeners.add(cb)
      return () => { store.listeners.delete(cb) }
    },
    get,
    get,
  ) as T
}

export function useP() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useP must be inside PictoriumProvider")
  return ctx
}

export function PictoriumProvider({ value, children }: { value: PictoriumCtx; children: React.ReactNode }) {
  const storeRef = useRef<SelectorStore | null>(null)
  if (!storeRef.current) storeRef.current = { value: null, listeners: new Set() }
  const store = storeRef.current
  // Aggiorna lo store durante il render per coerenza del getSnapshot
  store.value = value
  useEffect(() => {
    store.listeners.forEach((l) => l())
  }, [value, store])
  return (
    <SelectorStoreCtx.Provider value={store}>
      <TranslationProvider value={value}>
        <SettingsProvider value={value}>
          <SearchProvider value={value}>
            <MetaInfoProvider value={value.metaInfo}>
              <MappingsProvider value={value.mappings} mapValue={value.mappingsMap}>
                <Ctx.Provider value={value}>{children}</Ctx.Provider>
              </MappingsProvider>
            </MetaInfoProvider>
          </SearchProvider>
        </SettingsProvider>
      </TranslationProvider>
    </SelectorStoreCtx.Provider>
  )
}

/**
 * PictoriumRoot — racchiude la creazione dello stato e la catena provider.
 * PosterEditorProvider wrappa l'esterno così usa useDefaults() in autonomia.
 * Il PictoriumProvider interno riceve tutto lo stato (inclusi editor fields
 * per backward compat via useP()).
 */
export function PictoriumRoot({ children }: { children: React.ReactNode }) {
  // Migrazione one-time localStorage posterium_* → pictorium_*: l'initializer
  // di useState gira nel render del parent, quindi PRIMA degli useEffect dei
  // figli che leggono lo storage (hydration da useCustomCatalogs, tema, ...).
  useState(() => {
    migrateLegacyStorage()
    return null
  })
  return (
    <PosterEditorProvider>
      <PictoriumRootInner>{children}</PictoriumRootInner>
    </PosterEditorProvider>
  )
}

function PictoriumRootInner({ children }: { children: React.ReactNode }) {
  const value = usePictorium()
  return <PictoriumProvider value={value}>{children}</PictoriumProvider>
}

export function usePictorium(): PictoriumCtx {
  // Helper per localStorage: evita crash in Safari ITP / Brave Shield / Firefox Strict
  const safeGetItem = useCallback((key: string): string | null => {
    try { return localStorage.getItem(key) } catch { return null }
  }, [])
  const safeSetItem = useCallback((key: string, val: string): void => {
    try { localStorage.setItem(key, val) } catch { /* localStorage non disponibile */ }
  }, [])

  const [lang, setLang] = useState("it")
  const t = useMemo(() => createT(lang), [lang])
  const [tmdbKey, setTmdbKeyState] = useState("")
  const [mdblistApiKey, setMdblistApiKey] = useState("")
  const [tvdbApiKey, setTvdbApiKey] = useState("")
  const [tmdbKeyInput, setTmdbKeyInput] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  // Lettura differita in useEffect per evitare hydration mismatch client/server
  const [uiAccent, setUiAccent] = useState(false)
  useEffect(() => {
    const saved = safeGetItem("pictorium_ui_accent")
    if (saved === "true") setUiAccent(true)
  }, [safeGetItem])
  useEffect(() => { safeSetItem("pictorium_ui_accent", String(uiAccent)) }, [uiAccent, safeSetItem])
  // Sync uiAccent toggle to <html> class
  useEffect(() => {
    document.documentElement.classList.toggle("ui-accent", uiAccent)
  }, [uiAccent])
  const keyInit = useRef(false)
  const langInit = useRef(false)

  const navigation = useNavigation()
  const editorCtx = usePosterEditor()
  const trending = useTrending(tmdbKey, mdblistApiKey, editorCtx.defaultRegion)
  const tmdbLang = getRegionDef(editorCtx.defaultRegion).lang
  const search = useSearch(tmdbKey, tmdbLang)
  const { mappings, mappingsMap, loadMappings, removeMapping, exportData, importData } = useMappingsStore()
  const {
    // Badges
    globalBadges, setGlobalBadges,
    rankingBadges, setRankingBadges,
    badgeGenre, setBadgeGenre,
    badgeYear, setBadgeYear,
    badgeRating, setBadgeRating,
    badgeQuality, setBadgeQuality,
    ratingSources,
    badgeStyle, setBadgeStyle,
    rankingBadgeStyle, setRankingBadgeStyle,
    customBadge, setCustomBadge,
    networkLogo, setNetworkLogo,
    ribbonSide,
    // Defaults
    defaultBadgeStyle,
    defaultRankingBadgeStyle,
    defaultGlobalBadges,
    defaultRankingBadges,
    defaultBadgeGenre,
    defaultBadgeYear,
    defaultBadgeRating,
    defaultBadgeQuality,
    defaultRibbonSide,
    setRibbonSide,
    defaultBlurEnabled,
    defaultBlurIntensity,
    defaultBlurFade,
    defaultBlurDarkness,
    defaultGradientHeight,
    defaultAutoRotateClean,
    defaultNetworkLogo,
    loadDefaultsToState,
    // Blur
    blurEnabled, setBlurEnabled,
    blurIntensity, setBlurIntensity,
    blurFade, setBlurFade,
    blurDarkness, setBlurDarkness,
    // Gradient
    gradientHeight, setGradientHeight,
    // Logo
    logoScale, setLogoScale,
    logoOffsetX, setLogoOffsetX,
    logoOffsetY, setLogoOffsetY,
    logoDisabled, setLogoDisabled,
    // Backdrop
    setBackdrops,
    selectedBackdrop, setSelectedBackdrop,
    backdropScale, setBackdropScale,
    backdropOffsetX, setBackdropOffsetX,
    backdropOffsetY, setBackdropOffsetY,
    // Editing UI
    // Rotation
    rotationPosters, setRotationPosters,
    autoRotateClean, setAutoRotateClean,
    excludedPosters, setExcludedPosters,
    // Episode Group
    episodeGroupId, setEpisodeGroupId,
  } = editorCtx

  const [urlPattern, setUrlPattern] = useState("")
  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [metaInfo, setMetaInfo] = useState<MetaInfo>({ genres: [], voteAverage: 0 })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [trendRank, setTrendRank] = useState<number | null>(null)
  const [mdblistMatch, setMdblistMatch] = useState<{ key: string; rank: number } | null>(null)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")
  const [imdbTop250, setImdbTop250] = useState(false)
  const [accentColor, setAccentColor] = useState<string | null>(null)
  const [autoAccentColor, setAutoAccentColor] = useState<string | null>(null)
  // Accent adattivo: espone il colore dominante del poster come
  // --color-accent su <html>. Con uiAccent attivo, tutte le regole
  // .ui-accent (glow di pagina, slider, toggle, tab chip, podio)
  // si ritintano col poster in editing. Senza poster: fallback arancione.
  useEffect(() => {
    const root = document.documentElement
    if (uiAccent && accentColor) root.style.setProperty("--color-accent", accentColor)
    else root.style.removeProperty("--color-accent")
  }, [uiAccent, accentColor])
  const [topEdgeColor, setTopEdgeColor] = useState<string | null>(null)
  const [serviceErrors, setServiceErrors] = useState<Record<string, boolean>>({})

  const [loadingImages, setLoadingImages] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)
  const posterScrollRef = useRef<HTMLDivElement>(null)
  const [posterScrollInfo, setPosterScrollInfo] = useState({ top: 0, height: 100 })


  // Appearance state (logo, backdrop, editing — owned by PosterEditorProvider via usePosterEditor())
  // Specchio client di hasGenreBadge (server): il badge è visibile se almeno uno dei
  // 3 componenti (genere/anno/voto) è abilitato E disponibile.
  const metaYear = (metaInfo.release_date || metaInfo.first_air_date || "").slice(0, 4)
  const genreAvailable = metaInfo.genres.length > 0
  const ratingAvailable = metaInfo.voteAverage > 0
  const yearAvailable = !!metaYear
  const hasBadges = globalBadges
    && ((genreAvailable && badgeGenre) || (ratingAvailable && badgeRating) || (yearAvailable && badgeYear))
  const hasNetflixRank = !!(trendRank || (navigation.selected && trending.mdblistAnimeList.some((a: EnrichedAnimeItem) => a.id === navigation.selected!.id)))

  // Auto-resolve IMDb Top 250 membership.
  // Guard di race: se metaInfo.imdb_id cambia mentre una fetch è in flight,
  // la risposta stale per l'id precedente NON deve sovrascrivere lo stato
  // corrente. fetchIdRef traccia quale id è quello "attivo"; l'AbortController
  // cancella fisicamente la richiesta precedente.
  const fetchIdRef = useRef<string | null>(null)
  useEffect(() => {
    const imdbId = metaInfo.imdb_id
    if (!imdbId) { fetchIdRef.current = null; setImdbTop250(false); return }
    fetchIdRef.current = imdbId
    const ac = new AbortController()
    fetch(`/api/imdb-top250?imdbId=${encodeURIComponent(imdbId)}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        if (fetchIdRef.current === imdbId) setImdbTop250(!!d.inTop250)
      })
      .catch(() => {
        if (ac.signal.aborted || fetchIdRef.current !== imdbId) return
        setImdbTop250(false)
      })
    return () => { ac.abort(); if (fetchIdRef.current === imdbId) fetchIdRef.current = null }
  }, [metaInfo.imdb_id])

  // Appearance state

  const logoBounds = useMemo(() => {
    if (!navigation.previewPoster || !navigation.selectedLogo) return { minX: -500, maxX: 500, minY: -500, maxY: 500 }
    return computeLogoOffsetBounds({
      posterW: navigation.previewPoster.width || 1000,
      posterH: navigation.previewPoster.height || 1500,
      logoW: navigation.selectedLogo.width || 1,
      logoH: navigation.selectedLogo.height || 1,
      logoScale,
      hasBadges,
    })
  }, [navigation.previewPoster, navigation.selectedLogo, logoScale, hasBadges])

  // --- Custom Catalogs & Profile Auth Hooks ---
  const {
    customCatalogs,
    setCustomCatalogs,
    addCustomCatalog,
    removeCustomCatalog,
    toggleCustomCatalog,
    disabledCatalogIds,
    setDisabledCatalogIds,
    toggleBuiltinCatalog,
    homeDisabledCatalogIds,
    setHomeDisabledCatalogIds,
    toggleCatalogHome,
    catalogOrder,
    setCatalogOrder,
    moveCatalog,
    catalogRenames,
    setCatalogRenames,
    renameCatalog,
    resetCatalogNames,
    resetCatalogOrder,
  } = useCustomCatalogs(safeGetItem, safeSetItem)

  const setTmdbKey = useCallback((val: string) => {
    setTmdbKeyState(val)
    setTmdbKeyInput(val)
    safeSetItem("tmdb_key", val)
  }, [safeSetItem])

  const setMdblistApiKeyFn = useCallback((val: string) => {
    setMdblistApiKey(val)
    safeSetItem("mdblist_key", val)
  }, [safeSetItem])

  const setTvdbApiKeyFn = useCallback((val: string) => {
    setTvdbApiKey(val)
    safeSetItem("tvdb_key", val)
  }, [safeSetItem])

  useEffect(() => {
    if (keyInit.current) return
    keyInit.current = true
    const savedTmdb = safeGetItem("tmdb_key") || ""
    setTmdbKeyState(savedTmdb)
    setTmdbKeyInput(savedTmdb)
    const savedMdblist = safeGetItem("mdblist_key") || ""
    setMdblistApiKey(savedMdblist)
    const savedTvdb = safeGetItem("tvdb_key") || ""
    setTvdbApiKey(savedTvdb)
    const savedTheme = safeGetItem("pictorium_theme")
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme)

    // Se sul dispositivo corrente alcune chiavi sono vuote, interroga /api/defaults
    // per prelevare le chiavi configurate sul server e pre-popolare il client
    fetch("/api/defaults")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.serverKeys) return
        const { tmdbKey, mdblistApiKey: mdblistKey, tvdbApiKey: tvdbKey } = data.serverKeys
        if (!savedTmdb && tmdbKey) {
          setTmdbKeyState(tmdbKey)
          setTmdbKeyInput(tmdbKey)
          safeSetItem("tmdb_key", tmdbKey)
        }
        if (!savedMdblist && mdblistKey) {
          setMdblistApiKey(mdblistKey)
          safeSetItem("mdblist_key", mdblistKey)
        }
        if (!savedTvdb && tvdbKey) {
          setTvdbApiKey(tvdbKey)
          safeSetItem("tvdb_key", tvdbKey)
        }
      })
      .catch(() => {
        /* ignore network errors on init */
      })
  }, [safeGetItem, safeSetItem])

  useEffect(() => {
    document.documentElement.classList.toggle("light-mode", theme === "light")
    safeSetItem("pictorium_theme", theme)
  }, [theme, safeSetItem])

  useEffect(() => {
    if (langInit.current) return
    langInit.current = true
    const saved = safeGetItem("preferred_lang")
    // Solo le lingue delle 12 nazionalità supportate; un valore legacy
    // (zh/ru/ar/nl del vecchio picker) rimostra la scelta.
    if (saved && isSupportedUiLang(saved)) {
      setLang(saved.toLowerCase())
      setI18nLang(saved.toLowerCase())
    } else {
      setShowLangPicker(true)
    }
  }, [safeGetItem])

  const pickLang = (l: string) => {
    if (!isSupportedUiLang(l)) return
    const code = l.toLowerCase()
    setLang(code)
    setI18nLang(code)
    safeSetItem("preferred_lang", code)
    const matchingRegion = defaultRegionForLang(code, editorCtx.defaultRegion)
    if (matchingRegion) {
      editorCtx.setDefaultRegion(matchingRegion)
      editorCtx.setRegion(matchingRegion)
    }
  }

  // --- Settings panels ---
  const dismissSettings = useCallback(() => setSettingsOpen(false), [])
  const ignoreMobileSettingsDismiss = useCallback(() => window.innerWidth < 768, [])
  const dismissLang = useCallback(() => setLangOpen(false), [])

  useOutsideDismiss({
    active: settingsOpen,
    ref: settingsRef,
    onDismiss: dismissSettings,
    eventName: "mousedown",
    shouldIgnore: ignoreMobileSettingsDismiss,
  })

  useOutsideDismiss({
    active: langOpen,
    ref: langRef,
    onDismiss: dismissLang,
  })

  // --- URL Pattern ---
  useEffect(() => {
    setUrlPattern(buildUrlPattern({
      globalBadges, rankingBadges, badgeStyle, rankingBadgeStyle,
      badgeGenre, badgeYear, badgeRating, badgeQuality, ratingSources,
      customBadge, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, networkLogo, ribbonSide,
      tmdbKey, lang, mdblistApiKey,
    }))
  }, [globalBadges, rankingBadges, badgeGenre, badgeYear, badgeRating, badgeQuality, ratingSources, networkLogo, ribbonSide, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, badgeStyle, rankingBadgeStyle, tmdbKey, lang, mdblistApiKey]) // eslint-disable-line react-hooks/exhaustive-deps -- customBadge intentionally excluded to avoid loop

  // --- Preview URL ---
  const buildPreviewUrlCb = useCallback(() => {
    const url = buildPreviewUrl(
      {
        selected: navigation.selected,
        previewPoster: navigation.previewPoster,
        selectedLogo: navigation.selectedLogo,
        selectedBackdrop,
        logoScale, logoOffsetX, logoOffsetY,
        backdropScale, backdropOffsetX, backdropOffsetY,
        metaInfo, trendRank, mdblistAnimeList: trending.mdblistAnimeList,
        topEdgeColor, accentColor, lang, tmdbKey,
        region: editorCtx.defaultRegion,
      },
      { globalBadges, rankingBadges, badgeStyle, rankingBadgeStyle, badgeGenre, badgeYear, badgeRating, badgeQuality, ratingSources, customBadge, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, networkLogo, ribbonSide }
    )
    setPreviewUrl(url)
  }, [navigation.selected, navigation.previewPoster, navigation.selectedLogo, selectedBackdrop,
    logoScale, logoOffsetX, logoOffsetY, backdropScale, backdropOffsetX, backdropOffsetY,
    metaInfo, trendRank, trending.mdblistAnimeList, topEdgeColor, accentColor, lang, tmdbKey,
    editorCtx.defaultRegion,
    globalBadges, rankingBadges, badgeStyle, rankingBadgeStyle, badgeGenre, badgeYear, badgeRating, badgeQuality, ratingSources, customBadge, gradientHeight, blurIntensity, blurFade, blurDarkness, blurEnabled, networkLogo, ribbonSide])

  useEffect(() => {
    if (!navigation.selected) { setPreviewUrl(""); return }
    buildPreviewUrlCb()
  }, [navigation.selected, buildPreviewUrlCb])

  // --- Color detection ---
  useRootColors(navigation.previewPoster, metaInfo.genres[0]?.name, posterUrl, { setAccentColor, setAutoAccentColor, setTopEdgeColor })

  // --- Caricamento dati item corrente (M16) ---
  // Condiviso tra openPosterBrowser e l'effetto cambio lingua: ricarica
  // dettagli + rank + awards + immagini, aggiornando metaInfo (generi/voto/badge),
  // trendRank, mdblistMatch, posters/logos/backdrops e titolo. La guardia
  // fetchIdRef evita che una risposta stale sovrascriva la selezione corrente.
  async function loadCurrentItemData(item: SearchResult, fetchId: number) {
    const itemId = item.id
    const itemType = item.media_type
    const mdblistParam = mdblistApiKey ? "&mdblist_key=" + encodeURIComponent(mdblistApiKey) : ""
    const rsrcParam = ratingSources && ratingSources.length > 0 ? "&rsrc=" + encodeURIComponent(ratingSources.join(",")) : ""
    const regionLang = getRegionDef(editorCtx.defaultRegion).lang
    const detailsUrl = `/api/tmdb/${itemId}/details?type=${itemType}&language=${regionLang}&api_key=${tmdbKey}${mdblistParam}${rsrcParam}`
    const [details, rankData, awardData] = await Promise.all([
      http<{ genres: { id: number; name: string }[]; voteAverage: number; voteCount: number; status: string | null; type: string | null; release_date: string | null; first_air_date: string | null; last_air_date: string | null; next_episode_to_air: { air_date: string; episode_number: number; season_number: number } | null; number_of_seasons: number | null; number_of_episodes: number | null; title: string | null; name: string | null; imdb_id: string | null; networks: { name: string; logo_path: string | null; origin_country: string }[]; production_companies: { name: string; logo_path: string | null; origin_country: string }[]; original_language: string; aggregatedRatings?: AggregatedRatings | null }>(detailsUrl, { timeout: 30000 }).catch((e) => { console.error("[pictorium] Details fetch failed:", e); setServiceErrors((prev) => ({ ...prev, tmdb: true })); return { genres: [] as { id: number; name: string }[], voteAverage: 0, voteCount: 0, status: null, type: null, release_date: null, first_air_date: null, last_air_date: null, next_episode_to_air: null, number_of_seasons: null, number_of_episodes: null, title: null, name: null, imdb_id: null, networks: [] as { name: string; logo_path: string | null; origin_country: string }[], production_companies: [] as { name: string; logo_path: string | null; origin_country: string }[], original_language: "en", aggregatedRatings: null } }),
      http<{ rank: number | null }>(`/api/trending/rank?type=${itemType}&id=${itemId}&api_key=${encodeURIComponent(tmdbKey)}&region=${encodeURIComponent(editorCtx.defaultRegion)}&lang=${encodeURIComponent(regionLang)}`, { timeout: 15000 }).catch(() => ({ rank: null })),
      http<{ awards: string[]; nominations: string[]; studios: string[]; director: string | null; keywords: string[] }>(`/api/awards/${itemType}/${itemId}?api_key=${encodeURIComponent(tmdbKey)}`, { timeout: 15000 }).catch(() => ({ awards: [] as string[], nominations: [] as string[], studios: [] as string[], director: null, keywords: [] as string[] })),
    ])
    const origLang = details.original_language
    const imageLangs = origLang && origLang !== lang && origLang !== "en" ? `${lang},en,null,${origLang}` : `${lang},en,null`
    const data = await http<{ posters: TMDBImage[]; logos: TMDBImage[]; backdrops: TMDBImage[] }>(`/api/tmdb/${itemId}/images?type=${itemType}&languages=${imageLangs}&api_key=${tmdbKey}`, { timeout: 30000 }).catch(() => ({ posters: [] as TMDBImage[], logos: [] as TMDBImage[], backdrops: [] as TMDBImage[] }))
    if (navigation.fetchIdRef.current !== fetchId) return null
    navigation.setSelected({ ...item, imdb_id: details.imdb_id })
    navigation.setPosters(data.posters || [])
    navigation.setLogos(data.logos || [])
    setBackdrops(data.backdrops || [])
    if (details.title) navigation.setSelected((prev) => ({ ...prev!, title: details.title! }))
    if (details.name) navigation.setSelected((prev) => ({ ...prev!, name: details.name! }))
    const tmdbNetworks = itemType === "tv" ? (details.networks || []).map((n: { name: string }) => n.name) : (details.production_companies || []).map((c: { name: string }) => c.name)
    setMetaInfo({ genres: details.genres || [], voteAverage: details.voteAverage || 0, aggregatedRatings: details.aggregatedRatings ?? null, imdb_id: details.imdb_id ?? undefined, type: details.type ?? undefined, status: details.status ?? undefined, release_date: details.release_date ?? undefined, first_air_date: details.first_air_date ?? undefined, last_air_date: details.last_air_date ?? undefined, next_episode_to_air: details.next_episode_to_air ?? undefined, number_of_seasons: details.number_of_seasons ?? undefined, number_of_episodes: details.number_of_episodes ?? undefined, awards: awardData?.awards || [], nominations: awardData?.nominations || [], studios: matchTMDBStudios(tmdbNetworks).length ? matchTMDBStudios(tmdbNetworks) : (awardData?.studios || []), director: awardData?.director || null, keywords: awardData?.keywords || [], networksDetailed: details.networks || [], productionCompaniesDetailed: details.production_companies || [] })
    setTrendRank(rankData.rank || null)
    const extImdbId = item.imdb_id || details.imdb_id
    if (extImdbId) {
      http<{ match?: { key: string; rank: number } }>(`/api/mdblist?imdb=${extImdbId}&api_key=${mdblistApiKey}`, { timeout: 15000 }).then((d) => {
        if (navigation.fetchIdRef.current === fetchId) {
          setMdblistMatch(d?.match || null)
        }
      }).catch((e) => { console.error("[pictorium] MDBList lookup failed:", e) })
    } else {
      setMdblistMatch(null)
    }
    if (!item.poster_path && data.posters?.length > 0) {
      const first = data.posters.find((p: TMDBImage) => p.iso_639_1) || data.posters[0]
      navigation.setSelected((prev) => ({ ...prev!, poster_path: first.file_path }))
    }
    return { details, data, itemId, itemType }
  }

  // --- Aggiornamento reattivo voto medio quando cambia ratingSources ---
  useEffect(() => {
    if (metaInfo.aggregatedRatings) {
      const calculated = calculateAverageRating(metaInfo.aggregatedRatings, ratingSources)
      if (typeof calculated === "number" && calculated > 0) {
        setMetaInfo((prev) => ({ ...prev, voteAverage: calculated }))
        return
      }
    }
    if (!navigation.selected || !tmdbKey) return
    const itemId = navigation.selected.id
    const itemType = navigation.selected.media_type
    const mdblistParam = mdblistApiKey ? "&mdblist_key=" + encodeURIComponent(mdblistApiKey) : ""
    const rsrcParam = ratingSources && ratingSources.length > 0 ? "&rsrc=" + encodeURIComponent(ratingSources.join(",")) : ""
    const regionLang = getRegionDef(editorCtx.defaultRegion).lang
    const detailsUrl = `/api/tmdb/${itemId}/details?type=${itemType}&language=${regionLang}&api_key=${tmdbKey}${mdblistParam}${rsrcParam}`
    let active = true
    http<{ voteAverage: number; aggregatedRatings?: AggregatedRatings | null }>(detailsUrl, { timeout: 15000 }).then((d) => {
      if (!active) return
      if (typeof d?.voteAverage === "number" && d.voteAverage > 0) {
        setMetaInfo((prev) => ({
          ...prev,
          voteAverage: d.voteAverage,
          aggregatedRatings: d.aggregatedRatings ?? prev.aggregatedRatings,
        }))
      }
    }).catch(() => {})
    return () => {
      active = false
    }
  }, [ratingSources]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Poster image refresh ---
  useEffect(() => {
    if (!navigation.selected || !tmdbKey) return
    const item = navigation.selected
    const fetchId = navigation.incrementFetchId()
    // M16: riusa loadCurrentItemData così al cambio lingua si ricaricano anche
    // dettagli/genere/voto/badge, non solo le immagini.
    loadCurrentItemData(item, fetchId).then((loaded) => {
      if (!loaded) return
      const { data, details } = loaded
      if (navigation.previewPoster) {
        const match = (data.posters || []).find((p: TMDBImage) => p.file_path === navigation.previewPoster!.file_path)
        if (!match) {
          const clean = data.posters?.find((p: TMDBImage) => p.iso_639_1 === null)
          const langPoster = data.posters?.find((p: TMDBImage) => p.iso_639_1 === lang)
          const firstPoster = data.posters?.[0]
          if (clean) {
            const autoLogo = selectBestLogo(data.logos || [], lang, details.original_language)
            if (autoLogo) {
              navigation.setPreviewPoster({ file_path: clean.file_path, iso_639_1: null, vote_average: 0, width: 0, height: 0 })
              setGradientHeight(defaultGradientHeightForPoster(clean))
            } else {
              const enPoster = data.posters?.find((p: TMDBImage) => p.iso_639_1 === "en")
              const nextPoster = langPoster || enPoster || firstPoster || navigation.previewPoster
              navigation.setPreviewPoster(nextPoster)
              setGradientHeight(defaultGradientHeightForPoster(nextPoster))
            }
          } else {
            const nextPoster = langPoster || firstPoster || navigation.previewPoster
            navigation.setPreviewPoster(nextPoster)
            setGradientHeight(defaultGradientHeightForPoster(nextPoster))
          }
        }
      }
      if (navigation.previewPoster?.iso_639_1 === null && navigation.selectedLogo) {
        const match = (data.logos || []).find((l: TMDBImage) => l.file_path === navigation.selectedLogo!.file_path)
        if (!match) {
          const autoLogo = selectBestLogo(data.logos || [], lang, details.original_language)
          navigation.setSelectedLogo(autoLogo || navigation.selectedLogo)
        }
      }
    }).catch((e) => { console.error("[pictorium] Poster image refresh failed:", e) })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only on lang / defaultRegion change; others set inside
  }, [lang, editorCtx.defaultRegion])

  const openPosterBrowser = async (item: SearchResult) => {
    const itemId = item.id
    const itemType = item.media_type
    const fetchId = navigation.incrementFetchId()
    navigation.setSelected(item)
    navigation.setSelectedLogo(null)
    setSelectedBackdrop(null)
    navigation.setPreviewPoster(null)
    setTrendRank(null)
    setMdblistMatch(null)
    setMetaInfo({ genres: [], voteAverage: 0 })
    setLoadingImages(true)
    setOpenSections({})
    navigation.setPreviewId(`${itemType}:${itemId}`)
    navigation.setView("edit")

    // Imposta stili subito (sync) prima delle chiamate async
    // per evitare race condition: se l'utente cambia opzioni mentre
    // i dati sono in caricamento, la vecchia fetch non deve sovrascrivere
    const existing = mappingsMap.get(`${itemType}:${itemId}`)
    if (existing) {
      setBadgeStyle(existing.badgeStyle ?? defaultBadgeStyle)
      setRankingBadgeStyle(existing.rankingBadgeStyle ?? defaultRankingBadgeStyle)
      setGlobalBadges(existing.showBadges ?? defaultGlobalBadges)
      setRankingBadges(existing.rankingBadges ?? defaultRankingBadges)
      setBadgeGenre(existing.badgeGenre ?? defaultBadgeGenre)
      setBadgeYear(existing.badgeYear ?? defaultBadgeYear)
      setBadgeRating(existing.badgeRating ?? defaultBadgeRating)
      setBadgeQuality(existing.badgeQuality ?? defaultBadgeQuality)
      setNetworkLogo(existing.networkLogo ?? defaultNetworkLogo)
      setRibbonSide(existing.ribbonSide ?? defaultRibbonSide)
      setGradientHeight(existing.gradientHeight ?? defaultGradientHeight)
      setBlurIntensity(existing.blurIntensity ?? defaultBlurIntensity)
      setBlurFade(existing.blurFade ?? defaultBlurFade)
      setBlurDarkness(existing.blurDarkness ?? defaultBlurDarkness)
      setBlurEnabled(existing.blurEnabled ?? defaultBlurEnabled)
      setCustomBadge(existing.customBadge ?? null)
      setRotationPosters(existing.cleanPosters || [])
      setAutoRotateClean(existing.autoRotateClean ?? defaultAutoRotateClean)
      setExcludedPosters(existing.excludedPosters || [])
      setLogoDisabled(existing.logoDisabled ?? false)
      setLogoOffsetX(existing.logoOffsetX ?? 0)
      setLogoOffsetY(existing.logoOffsetY ?? 0)
      setBackdropScale(existing.backdropScale ?? 100)
      setBackdropOffsetX(existing.backdropOffsetX ?? 0)
      setBackdropOffsetY(existing.backdropOffsetY ?? 0)
    } else {
      setBadgeStyle(defaultBadgeStyle)
      setRankingBadgeStyle(defaultRankingBadgeStyle)
      setGlobalBadges(defaultGlobalBadges)
      setRankingBadges(defaultRankingBadges)
      setBadgeGenre(defaultBadgeGenre)
      setBadgeYear(defaultBadgeYear)
      setBadgeRating(defaultBadgeRating)
      setBadgeQuality(defaultBadgeQuality)
      setGradientHeight(defaultGradientHeight)
      setBlurIntensity(defaultBlurIntensity)
      setBlurFade(defaultBlurFade)
      setBlurDarkness(defaultBlurDarkness)
      setBlurEnabled(defaultBlurEnabled)
      setNetworkLogo(defaultNetworkLogo)
      setRibbonSide(defaultRibbonSide)
      setCustomBadge(null)
      setRotationPosters([])
      setAutoRotateClean(defaultAutoRotateClean)
      setExcludedPosters([])
      setLogoDisabled(false)
      setLogoOffsetX(0)
      setLogoOffsetY(0)
      setSelectedBackdrop(null)
      setBackdropScale(100)
      setBackdropOffsetX(0)
      setBackdropOffsetY(0)
    }

    try {
      const loaded = await loadCurrentItemData(item, fetchId)
      if (!loaded) return
      const { details, data } = loaded
      const existing = mappingsMap.get(`${itemType}:${itemId}`)
      if (existing) {
        const foundPoster = (data.posters || []).find((p: TMDBImage) => p.file_path === existing.posterPath)
        navigation.setPreviewPoster(foundPoster ? { file_path: foundPoster.file_path, iso_639_1: foundPoster.iso_639_1, vote_average: 0, width: foundPoster.width, height: foundPoster.height } : { file_path: existing.posterPath, iso_639_1: existing.language, vote_average: 0, width: 0, height: 0 })
        let foundLogo: TMDBImage | undefined
        if (existing.logoPath) {
          foundLogo = (data.logos || []).find((l: TMDBImage) => l.file_path === existing.logoPath)
          navigation.setSelectedLogo(foundLogo ? { file_path: foundLogo.file_path, iso_639_1: existing.language, vote_average: 0, width: foundLogo.width, height: foundLogo.height } : { file_path: existing.logoPath, iso_639_1: existing.language, vote_average: 0, width: 0, height: 0 })
        } else if (!existing.logoDisabled) {
          const autoLogo = autoLogoSelection(data.logos || [], lang, details.original_language, `${itemType}/${itemId}`)
          if (autoLogo) {
            navigation.setSelectedLogo({ file_path: autoLogo.file_path, iso_639_1: autoLogo.iso_639_1, vote_average: 0, width: autoLogo.width, height: autoLogo.height })
            const scale = logoDefaultScale(autoLogo)
            if (scale !== null) setLogoScale(scale)
          }
        }
        setLogoScale(existing.logoScale ?? 75)
        if (existing.backdropPath && data.backdrops) {
          const foundBackdrop = data.backdrops.find((b: TMDBImage) => b.file_path === existing.backdropPath)
          setSelectedBackdrop(foundBackdrop || { file_path: existing.backdropPath, iso_639_1: null, vote_average: 0, width: 0, height: 0 })
        }
        setNetworkLogo(existing.networkLogo ?? defaultNetworkLogo)
        setEpisodeGroupId(existing.episodeGroupId ?? null)
      } else {
        setLogoDisabled(false)
        setNetworkLogo(defaultNetworkLogo)
        setEpisodeGroupId(null)
        const clean = data.posters?.find((p: TMDBImage) => p.iso_639_1 === null)
        const langPoster = data.posters?.find((p: TMDBImage) => p.iso_639_1 === lang)
        const firstPoster = data.posters?.[0]
        let chosenPoster: TMDBImage | null = null
        if (clean) {
          const autoLogo = autoLogoSelection(data.logos || [], lang, details.original_language, `${itemType}/${itemId}`)
          if (autoLogo) {
            chosenPoster = clean
            navigation.setPreviewPoster({ file_path: clean.file_path, iso_639_1: null, vote_average: 0, width: 0, height: 0 })
            navigation.setSelectedLogo({ file_path: autoLogo.file_path, iso_639_1: autoLogo.iso_639_1, vote_average: 0, width: autoLogo.width, height: autoLogo.height })
            const scale = logoDefaultScale(autoLogo)
            if (scale !== null) setLogoScale(scale)
          } else {
            const enPoster = data.posters?.find((p: TMDBImage) => p.iso_639_1 === "en")
            const origPoster = details.original_language ? data.posters?.find((p: TMDBImage) => p.iso_639_1 === details.original_language) : undefined
            const fallbackPoster = langPoster || enPoster || origPoster || firstPoster
            if (fallbackPoster) {
              chosenPoster = fallbackPoster
              navigation.setPreviewPoster({ file_path: fallbackPoster.file_path, iso_639_1: fallbackPoster.iso_639_1, vote_average: 0, width: 0, height: 0 })
            }
          }
        } else if (langPoster) {
          chosenPoster = langPoster
          navigation.setPreviewPoster({ file_path: langPoster.file_path, iso_639_1: lang, vote_average: 0, width: 0, height: 0 })
        } else {
          const origPoster = details.original_language ? data.posters?.find((p: TMDBImage) => p.iso_639_1 === details.original_language) : undefined
          const fallbackPoster = origPoster || firstPoster
          if (fallbackPoster) {
            chosenPoster = fallbackPoster
            navigation.setPreviewPoster({ file_path: fallbackPoster.file_path, iso_639_1: fallbackPoster.iso_639_1, vote_average: 0, width: 0, height: 0 })
          }
        }
        loadDefaultsToState()
        if (chosenPoster) setGradientHeight(defaultGradientHeightForPoster(chosenPoster))
      }
    } finally {
      setLoadingImages(false)
    }
  }
  const openPosterBrowserRef = useRef(openPosterBrowser)
  openPosterBrowserRef.current = openPosterBrowser

  const copyUrl = async () => {
    await navigator.clipboard.writeText(urlPattern)
    setCopied(true)
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  const posterActivePath = navigation.previewPoster?.file_path

  const { selectPoster, selectLogo, removeLogo, selectBackdrop, removeBackdrop, saveConfig: savePosterConfig } = usePosterSave({
    selected: navigation.selected, previewPoster: navigation.previewPoster, selectedLogo: navigation.selectedLogo,
    setSelectedLogo: navigation.setSelectedLogo, setPreviewPoster: navigation.setPreviewPoster, setPreviewId: navigation.setPreviewId,
    posters: navigation.posters, metaInfo, trendRank, mdblistAnimeList: trending.mdblistAnimeList,
    mappingsMap, loadMappings, logoScale, logoOffsetX, logoOffsetY,
    selectedBackdrop, setSelectedBackdrop: setSelectedBackdrop, backdropScale, backdropOffsetX, backdropOffsetY,
    setBackdropScale, setBackdropOffsetX, setBackdropOffsetY,
    globalBadges, rankingBadges, customBadge, badgeStyle, rankingBadgeStyle,
    badgeGenre, badgeYear, badgeRating, badgeQuality,
    defaultBadgeStyle, defaultRankingBadgeStyle, blurEnabled, blurIntensity, blurFade, blurDarkness, gradientHeight,
    setGradientHeight,
    rotationPosters, autoRotateClean, defaultAutoRotateClean, excludedPosters, accentColor, logoDisabled, setLogoDisabled,
    setLogoScale, setLogoOffsetX, setLogoOffsetY, networkLogo, ribbonSide, lang, episodeGroupId,
  })

  const saveConfig = useCallback(async () => {
    await savePosterConfig()
  }, [savePosterConfig])

  const autoSaveExcludedPosters = useCallback(async (nextExcluded: string[], nextRotationPosters?: string[], nextPreviewPoster?: TMDBImage) => {
    await savePosterConfig({
      excludedPosters: nextExcluded,
      rotationPosters: nextRotationPosters ?? rotationPosters,
      previewPoster: nextPreviewPoster,
      silent: true,
    })
  }, [savePosterConfig, rotationPosters])

  return useMemo(() => ({
    selected: navigation.selected, setSelected: navigation.setSelected,
    view: navigation.view, setView: navigation.setView as React.Dispatch<React.SetStateAction<ViewType>>,
    router: navigation.router,
    posters: navigation.posters, loadingImages,
    previewPoster: navigation.previewPoster, setPreviewPoster: navigation.setPreviewPoster,
    selectedLogo: navigation.selectedLogo, setSelectedLogo: navigation.setSelectedLogo,
    logos: navigation.logos,
    posterActivePath: posterActivePath ?? null,
    previewUrl, urlPattern, lang,
    openSections, toggleSection: (key: string) => setOpenSections((prev) => ({ ...prev, [key]: !(prev[key] ?? true) })),
    posterScrollRef, posterScrollInfo, setPosterScrollInfo,
    selectPoster, selectLogo, removeLogo,
    logoBounds,
    selectBackdrop, removeBackdrop,
    trendRank,
    mdblistMatch,
    imdbTop250,
    metaInfo,
    previewId: navigation.previewId, setPreviewId: navigation.setPreviewId,
    saveConfig, removeMapping, mappingsMap,
    goHome: navigation.goHome, sourceView: navigation.sourceView, navigateToPoster: (item: SearchResult, source?: string) => { navigation.navigateToPoster(item, source); openPosterBrowserRef.current(item) },
    refreshLists: trending.refreshLists,
    tmdbKey, setQuery: search.setQuery, doSearch: search.doSearch, loadMore: search.loadMore,
    titleOf, yearOf, posterUrl,
    trending: trending.trending, trendingError: trending.trendingError, streamingCharts: trending.streamingCharts, mdblistAnimeList: trending.mdblistAnimeList,
    STREAMING_PLATFORMS, loadMappings,
    query: search.query, results: search.results, searching: search.searching, error: search.error, setError: search.setError, totalResults: search.totalResults, totalPages: search.totalPages, searchPage: search.searchPage, recentSearches: search.recentSearches, mappings,

    settingsRef, langRef,
    setLangOpen, langOpen, pickLang,
    settingsOpen, setSettingsOpen,
    showLangPicker, setShowLangPicker,
    tmdbKeyInput, setTmdbKeyInput,
    showKey, setShowKey, setTmdbKey,
    mdblistApiKey, setMdblistApiKey: setMdblistApiKeyFn,
    tvdbApiKey, setTvdbApiKey: setTvdbApiKeyFn,
    exportData, importData, removeRecentSearch: search.removeRecentSearch, clearRecentSearches: search.clearRecentSearches,
    copyUrl, copied,
    accentColor, autoAccentColor, setAccentColor,
    topEdgeColor,
    autoSaveExcludedPosters,
    theme, setTheme,
    uiAccent, setUiAccent,
    serviceErrors, setServiceErrors,
    hasNetflixRank,
    customCatalogs, setCustomCatalogs, addCustomCatalog, removeCustomCatalog, toggleCustomCatalog,
    disabledCatalogIds, setDisabledCatalogIds, toggleBuiltinCatalog,
    homeDisabledCatalogIds, setHomeDisabledCatalogIds, toggleCatalogHome,
    catalogOrder, setCatalogOrder, moveCatalog,
    catalogRenames, setCatalogRenames, renameCatalog, resetCatalogNames, resetCatalogOrder,
    t,
  // eslint-disable-next-line react-hooks/exhaustive-deps -- context value deps intentionally stable to prevent re-render cascades
  }), [
    navigation.selected, navigation.view, navigation.posters, loadingImages, navigation.previewPoster, navigation.selectedLogo,
    navigation.logos, posterActivePath, previewUrl, urlPattern, lang,
    openSections, posterScrollInfo, logoBounds,
    trendRank, mdblistMatch, imdbTop250, metaInfo, navigation.previewId,
    selectPoster, selectLogo, saveConfig, removeLogo,
    mappingsMap, tmdbKey, search.query, search.results, search.searching, search.totalResults, search.totalPages, search.searchPage, search.recentSearches, search.clearRecentSearches,
    mappings,
    langOpen, settingsOpen, showLangPicker,
    tmdbKeyInput, showKey, copied, mdblistApiKey, tvdbApiKey,
    accentColor, autoAccentColor, setAccentColor,
    topEdgeColor, autoSaveExcludedPosters,
    trending.trending, trending.trendingError, trending.streamingCharts, trending.mdblistAnimeList,
    trending.refreshLists,
    theme, uiAccent, serviceErrors, hasNetflixRank,
    customCatalogs, disabledCatalogIds, homeDisabledCatalogIds, catalogOrder, catalogRenames,
  ])
}
