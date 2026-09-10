"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { BadgeStyle, RankingBadgeStyle } from "./badge-styles"
import { normalizeRegion } from "./regions"
import { t } from "./i18n"

export type RibbonSide = "left" | "right"

export interface DefaultsState {
  defaultBadgeStyle: BadgeStyle
  defaultRankingBadgeStyle: RankingBadgeStyle
  defaultBlurEnabled: boolean
  defaultBlurIntensity: number
  defaultBlurFade: number
  defaultBlurDarkness: number
  defaultGradientHeight: number
  defaultGlobalBadges: boolean
  defaultRankingBadges: boolean
  /** Componenti del badge genere/rating di default (default tutti ON). */
  defaultBadgeGenre: boolean
  defaultBadgeYear: boolean
  defaultBadgeRating: boolean
  defaultBadgeQuality: boolean
  defaultRatingSources: string[]
  defaultAutoRotateClean: boolean
  defaultLogoFitEnabled: boolean
  defaultNetworkLogo: boolean
  defaultRibbonSide: RibbonSide
  defaultEpisodeMetadataSource: "tmdb" | "tvdb"
  /** Regione classifiche (codice JW canonico, es. "IT"). */
  defaultRegion: string
  region: string
  globalBadges: boolean
  rankingBadges: boolean
  /** Componenti del badge genere/rating (default tutti ON). */
  badgeGenre: boolean
  badgeYear: boolean
  badgeRating: boolean
  badgeQuality: boolean
  ratingSources: string[]
  networkLogo: boolean
  ribbonSide: RibbonSide
  episodeMetadataSource: "tmdb" | "tvdb"
  gradientHeight: number
  blurIntensity: number
  blurFade: number
  blurDarkness: number
  blurEnabled: boolean
  badgeStyle: BadgeStyle
  rankingBadgeStyle: RankingBadgeStyle
}

const DEFAULTS: DefaultsState = {
  defaultBadgeStyle: "shadow",
  defaultRankingBadgeStyle: "default",
  defaultBlurEnabled: true,
  defaultBlurIntensity: 5,
  defaultBlurFade: 60,
  defaultBlurDarkness: 40,
  defaultGradientHeight: 30,
  defaultGlobalBadges: true,
  defaultRankingBadges: true,
  defaultBadgeGenre: true,
  defaultBadgeYear: true,
  defaultBadgeRating: true,
  defaultBadgeQuality: true,
  defaultRatingSources: ["imdb", "tmdb"],
  defaultAutoRotateClean: false,
  defaultLogoFitEnabled: true,
  defaultNetworkLogo: true,
  defaultRibbonSide: "left",
  defaultEpisodeMetadataSource: "tmdb",
  defaultRegion: "IT",
  region: "IT",
  globalBadges: true,
  rankingBadges: true,
  badgeGenre: true,
  badgeYear: true,
  badgeRating: true,
  badgeQuality: true,
  ratingSources: ["imdb", "tmdb"],
  networkLogo: true,
  ribbonSide: "left",
  episodeMetadataSource: "tmdb",
  gradientHeight: 30,
  blurIntensity: 5,
  blurFade: 60,
  blurDarkness: 40,
  blurEnabled: true,
  badgeStyle: "shadow",
  rankingBadgeStyle: "default",
}

interface StoredDefaults {
  globalBadges?: boolean
  rankingBadges?: boolean
  badgeGenre?: boolean
  badgeYear?: boolean
  badgeRating?: boolean
  badgeQuality?: boolean
  networkLogo?: boolean
  gradientHeight?: number
  blurIntensity?: number
  blurFade?: number
  blurDarkness?: number
  blurEnabled?: boolean
  badgeStyle?: BadgeStyle
  rankingBadgeStyle?: RankingBadgeStyle
  defaultBadgeStyle?: BadgeStyle
  defaultRankingBadgeStyle?: RankingBadgeStyle
  defaultBlurEnabled?: boolean
  defaultBlurIntensity?: number
  defaultBlurFade?: number
  defaultBlurDarkness?: number
  defaultGradientHeight?: number
  defaultGlobalBadges?: boolean
  defaultRankingBadges?: boolean
  defaultBadgeGenre?: boolean
  defaultBadgeYear?: boolean
  defaultBadgeRating?: boolean
  defaultBadgeQuality?: boolean
  defaultRatingSources?: string[]
  ratingSources?: string[]
  defaultAutoRotateClean?: boolean
  defaultLogoFitEnabled?: boolean
  defaultNetworkLogo?: boolean
  defaultRibbonSide?: RibbonSide
  ribbonSide?: RibbonSide
  defaultEpisodeMetadataSource?: "tmdb" | "tvdb"
  episodeMetadataSource?: "tmdb" | "tvdb"
  defaultRegion?: string
  region?: string
  autoRotateClean?: boolean
}

function readStoredDefaults(): StoredDefaults | null {
  if (typeof window === "undefined" || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem("badgeDefaults")
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[defaults] Failed to read local defaults: ${message}`)
    return null
  }
}

function safeSetItem(key: string, val: string) {
  try { localStorage.setItem(key, val) } catch { /* localStorage non disponibile */ }
}

function buildFromStored(d: StoredDefaults | null): DefaultsState {
  if (!d) return { ...DEFAULTS }
  return {
    defaultBadgeStyle: d.defaultBadgeStyle ?? d.badgeStyle ?? "shadow",
    defaultRankingBadgeStyle: d.defaultRankingBadgeStyle ?? d.rankingBadgeStyle ?? "default",
    defaultBlurEnabled: d.defaultBlurEnabled ?? d.blurEnabled ?? true,
    defaultBlurIntensity: d.defaultBlurIntensity ?? d.blurIntensity ?? 5,
    defaultBlurFade: d.defaultBlurFade ?? d.blurFade ?? 60,
    defaultBlurDarkness: d.defaultBlurDarkness ?? d.blurDarkness ?? 40,
    defaultGradientHeight: d.defaultGradientHeight ?? d.gradientHeight ?? 30,
    defaultGlobalBadges: d.defaultGlobalBadges ?? d.globalBadges ?? true,
    defaultRankingBadges: d.defaultRankingBadges ?? d.rankingBadges ?? true,
    defaultBadgeGenre: d.defaultBadgeGenre ?? d.badgeGenre ?? true,
    defaultBadgeYear: d.defaultBadgeYear ?? d.badgeYear ?? true,
    defaultBadgeRating: d.defaultBadgeRating ?? d.badgeRating ?? true,
    defaultBadgeQuality: d.defaultBadgeQuality ?? d.badgeQuality ?? true,
    defaultRatingSources: d.defaultRatingSources ?? d.ratingSources ?? ["imdb", "tmdb"],
    defaultAutoRotateClean: d.defaultAutoRotateClean ?? d.autoRotateClean ?? false,
    defaultLogoFitEnabled: d.defaultLogoFitEnabled ?? true,
    defaultNetworkLogo: d.defaultNetworkLogo ?? d.networkLogo ?? true,
    defaultRibbonSide: d.defaultRibbonSide ?? d.ribbonSide ?? "left",
    defaultEpisodeMetadataSource: d.defaultEpisodeMetadataSource ?? d.episodeMetadataSource ?? "tmdb",
    defaultRegion: normalizeRegion(d.defaultRegion ?? d.region),
    region: normalizeRegion(d.region ?? d.defaultRegion),
    globalBadges: d.globalBadges ?? d.defaultGlobalBadges ?? true,
    rankingBadges: d.rankingBadges ?? d.defaultRankingBadges ?? true,
    badgeGenre: d.badgeGenre ?? d.defaultBadgeGenre ?? true,
    badgeYear: d.badgeYear ?? d.defaultBadgeYear ?? true,
    badgeRating: d.badgeRating ?? d.defaultBadgeRating ?? true,
    badgeQuality: d.badgeQuality ?? d.defaultBadgeQuality ?? true,
    ratingSources: d.ratingSources ?? d.defaultRatingSources ?? ["imdb", "tmdb"],
    networkLogo: d.networkLogo ?? d.defaultNetworkLogo ?? true,
    ribbonSide: d.ribbonSide ?? d.defaultRibbonSide ?? "left",
    episodeMetadataSource: d.episodeMetadataSource ?? d.defaultEpisodeMetadataSource ?? "tmdb",
    gradientHeight: d.gradientHeight ?? d.defaultGradientHeight ?? 30,
    blurIntensity: d.blurIntensity ?? d.defaultBlurIntensity ?? 5,
    blurFade: d.blurFade ?? d.defaultBlurFade ?? 60,
    blurDarkness: d.blurDarkness ?? d.defaultBlurDarkness ?? 40,
    blurEnabled: d.blurEnabled ?? d.defaultBlurEnabled ?? true,
    badgeStyle: d.badgeStyle ?? d.defaultBadgeStyle ?? "shadow",
    rankingBadgeStyle: d.rankingBadgeStyle ?? d.defaultRankingBadgeStyle ?? "default",
  }
}

/**
 * Payload dei SOLI default persistiti — allineato allo schema server
 * (`defaultsSchema` in `/api/defaults`) e allo shape scritto da `saveDefaults`.
 * Non include i valori "corrente" (globalBadges, badgeStyle…) che dipendono
 * dal poster in editing.
 */
function defaultsToPayload(d: DefaultsState): Record<string, unknown> {
  return {
    badgeStyle: d.defaultBadgeStyle,
    rankingBadgeStyle: d.defaultRankingBadgeStyle,
    blurEnabled: d.defaultBlurEnabled,
    blurIntensity: d.defaultBlurIntensity,
    blurFade: d.defaultBlurFade,
    blurDarkness: d.defaultBlurDarkness,
    gradientHeight: d.defaultGradientHeight,
    globalBadges: d.defaultGlobalBadges,
    rankingBadges: d.defaultRankingBadges,
    badgeGenre: d.defaultBadgeGenre,
    badgeYear: d.defaultBadgeYear,
    badgeRating: d.defaultBadgeRating,
    badgeQuality: d.defaultBadgeQuality,
    ratingSources: d.defaultRatingSources,
    autoRotateClean: d.defaultAutoRotateClean,
    defaultLogoFitEnabled: d.defaultLogoFitEnabled,
    networkLogo: d.defaultNetworkLogo,
    ribbonSide: d.defaultRibbonSide,
    episodeMetadataSource: d.defaultEpisodeMetadataSource,
    region: d.defaultRegion,
  }
}

export function useDefaults() {
  // Stato iniziale deterministico (DEFAULTS): la lettura di localStorage è rimandata
  // al mount via useEffect. Durante la SSR `window` non esiste (readStoredDefaults
  // torna null) quindi l'HTML server usa i default; leggere lo storage nell'initializer
  // di useState avrebbe prodotto un hydration mismatch con l'HTML renderizzato dal server.
  const [state, setState] = useState<DefaultsState>(() => ({ ...DEFAULTS }))

  // Gate anti-clobber: l'effect di auto-persist sotto gira nello stesso commit
  // del caricamento con `state` ancora ai factory — senza gate sovrascriverebbe
  // localStorage (e poi il server via PUT) con i factory. In dev StrictMode
  // rimonta due volte e il secondo mount leggeva lo storage già avvelenato,
  // consolidando i factory al rientro ("le impostazioni non si salvano").
  // Il gate resta chiuso finché il load non conferma l'idratazione.
  const [hydrated, setHydrated] = useState(false)

  // Ref di dedup per l'auto-persist: primato durante l'hydration con il payload appena
  // caricato, così il primo run dell'effetto di sync trova payload identico e non scrive.
  const lastPersistRef = useRef<string>("")

  useEffect(() => {
    const stored = readStoredDefaults()
    const hydratedState = buildFromStored(stored)
    setState(hydratedState)
    lastPersistRef.current = JSON.stringify(defaultsToPayload(hydratedState))
    setHydrated(true)

    fetch("/api/defaults")
      .then((r) => (r.ok ? r.json() : null))
      .then((serverData) => {
        if (!serverData) return
        const currentStored = readStoredDefaults()
        const merged: StoredDefaults = {
          ...(serverData || {}),
          ...(currentStored || {}),
        }
        if (!currentStored?.episodeMetadataSource && !currentStored?.defaultEpisodeMetadataSource && serverData.episodeMetadataSource) {
          merged.defaultEpisodeMetadataSource = serverData.episodeMetadataSource
          merged.episodeMetadataSource = serverData.episodeMetadataSource
        }
        if (!currentStored?.ratingSources && !currentStored?.defaultRatingSources && Array.isArray(serverData.ratingSources)) {
          merged.defaultRatingSources = serverData.ratingSources
          merged.ratingSources = serverData.ratingSources
        }
        const updated = buildFromStored(merged)
        setState(updated)
        lastPersistRef.current = JSON.stringify(defaultsToPayload(updated))
        safeSetItem("badgeDefaults", JSON.stringify(defaultsToPayload(updated)))
      })
      .catch(() => {})
  }, [])

  // Auto-persist: ogni cambio dei default scrive SUBITO su localStorage
  // e tenta il sync server (/api/defaults). Dedup via payload string — se cambiano
  // solo i valori "corrente" il payload resta identico e non viene riscritta.
  // Il gate `hydrated` blocca il run del primo commit (state ancora factory).
  useEffect(() => {
    if (!hydrated) return
    const payload = defaultsToPayload(state)
    const payloadStr = JSON.stringify(payload)
    if (lastPersistRef.current === payloadStr) return
    lastPersistRef.current = payloadStr

    // Scrittura immediata e sincrona in localStorage ad ogni cambio
    safeSetItem("badgeDefaults", payloadStr)

    const timer = setTimeout(() => {
      fetch("/api/defaults", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: payloadStr,
      })
        .then((res) => {
          if (res.ok) return
          // 401 (admin fail-closed), 403 origin, 5xx persist: il client crede di
          // aver salvato (localStorage) ma i default d'istanza restano vecchi —
          // e su Stremio i poster dei cataloghi usano QUELLI. Segnala il desync.
          lastPersistRef.current = ""
          console.warn(`[defaults] Auto-sync failed: HTTP ${res.status}`)
          void import("sonner").then(({ toast }) =>
            toast.warning(t("ui.defaultsSyncFailed")),
          )
        })
        .catch((error: unknown) => {
          // Se il PUT fallisce (rete, serverless cold start) resetta il ref
          // così un successivo cambio di default riprova invece di considerare "sincronizzato".
          lastPersistRef.current = ""
          const message = error instanceof Error ? error.message : String(error)
          console.warn(`[defaults] Auto-sync failed: ${message}`)
          void import("sonner").then(({ toast }) =>
            toast.warning(t("ui.defaultsSyncFailed")),
          )
        })
    }, 500)

    return () => clearTimeout(timer)
  }, [state, hydrated])

  const update = useCallback((patch: Partial<DefaultsState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const loadDefaultsToState = useCallback(() => {
    const stored = readStoredDefaults()
    setState(buildFromStored(stored))
    lastPersistRef.current = JSON.stringify(defaultsToPayload(buildFromStored(stored)))
  }, [])

  return { ...state, update, loadDefaultsToState }
}
