"use client"

import { useState, useEffect, useRef } from "react"
import type { TMDBImage } from "@/lib/types"

interface PosterFitMetrics {
  cleanliness: number
  contrast: number
  lowDetailScore: number
  badgeReadability: number
}

export interface PosterFitEntry {
  posterPath: string
  score: number
  adjustedScore: number
  textPenalty: number
  logoZoneScore: number
  colorConflictPenalty: number
  qualityScore: number
  metrics: PosterFitMetrics
  reasons: readonly string[]
}

export interface UsePosterFitInput {
  enabled: boolean
  selectedLogo: TMDBImage | null
  cleanPosters: TMDBImage[]
  logoScale: number
  logoOffsetX: number
  logoOffsetY: number
  hasBadges: boolean
}

export interface UsePosterFitResult {
  bestFitPath: string | null
  results: PosterFitEntry[]
  loading: boolean
  error: string | null
}

interface PosterFitApiResponse {
  readonly ranked: PosterFitEntry[]
  readonly bestPosterPath: string | null
  /** Vero quando il best-fit è disabilitato globalmente dall'istanza
   *  (PICTORIUM_BEST_FIT_ENABLED=0): la UI non deve mostrare il best-fit. */
  readonly disabled?: boolean
}

const resultCache = new Map<string, PosterFitApiResponse>()
const CACHE_MAX_ENTRIES = 100

function cacheSet(key: string, value: PosterFitApiResponse): void {
  if (resultCache.size >= CACHE_MAX_ENTRIES && !resultCache.has(key)) {
    const firstKey = resultCache.keys().next().value
    if (firstKey) resultCache.delete(firstKey)
  }
  resultCache.set(key, value)
}

function serialise(input: UsePosterFitInput): string | null {
  if (!input.enabled || !input.selectedLogo || input.cleanPosters.length < 2) return null
  // Fix L28: la chiave include anche vote/width/height dei candidati — prima
  // la ometteva e dopo un refresh dei dati TMDB la selezione restava stantia
  // (l'API riceve e usa questi campi).
  return JSON.stringify([
    input.cleanPosters.map((p) => [p.file_path, p.vote_average, p.width, p.height]),
    input.selectedLogo.file_path,
    input.logoScale,
    input.logoOffsetX,
    input.logoOffsetY,
    input.hasBadges,
  ])
}

export function usePosterFit(input: UsePosterFitInput): UsePosterFitResult {
  const [bestFitPath, setBestFitPath] = useState<string | null>(null)
  const [results, setResults] = useState<PosterFitEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef(input)
  inputRef.current = input

  const cacheKey = serialise(input)

  useEffect(() => {
    if (!cacheKey) {
      setBestFitPath(null)
      setResults([])
      setError(null)
      return
    }

    const cached = resultCache.get(cacheKey)
    if (cached) {
      // Fix L28: il cache-hit deve azzerare loading — prima, se un fetch
      // precedente aveva lasciato loading=true, la UI restava sulla finestra
      // "analisi in corso" anche con i risultati già pronti.
      setLoading(false)
      setResults(cached.ranked)
      setBestFitPath(cached.bestPosterPath)
      setError(null)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    if (abortRef.current) abortRef.current.abort()
    setError(null)

    const controller = new AbortController()
    abortRef.current = controller

    timerRef.current = setTimeout(async () => {
      setLoading(true)

      try {
        const inp = inputRef.current
        if (!inp.selectedLogo) return

        const posterPaths = inp.cleanPosters.map((p) => p.file_path)
        const res = await fetch("/api/poster-fit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            posterPaths,
            logoPath: inp.selectedLogo.file_path,
            logoScale: inp.logoScale,
            logoOffsetX: inp.logoOffsetX,
            logoOffsetY: inp.logoOffsetY,
            hasBadges: inp.hasBadges,
            voteAverages: inp.cleanPosters.map((p) => p.vote_average),
            widths: inp.cleanPosters.map((p) => p.width),
            heights: inp.cleanPosters.map((p) => p.height),
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          // 401: la route admin è chiusa in produzione senza
          // PICTORIUM_PUBLIC_INSTANCE=1 (o ADMIN_TOKEN). In locale (dev) le
          // route admin sono aperte, quindi il best-fit funziona solo in dev
          // finché il flag manca — messaggio esplicito invece del silenzio.
          if (res.status === 401) {
            setError("Best-fit not available: instance is not public.")
          } else {
            setError(`Best-fit analysis failed (HTTP ${res.status})`)
          }
          setBestFitPath(null)
          setResults([])
          return
        }

        const data = await res.json() as PosterFitApiResponse

        // Best-fit disabilitato globalmente (PICTORIUM_BEST_FIT_ENABLED=0):
        // nessun risultato, nessun errore — la UI semplicemente non lo mostra.
        if (data.disabled === true) {
          setResults([])
          setBestFitPath(null)
          setError(null)
          return
        }

        cacheSet(cacheKey, data)

        setResults(data.ranked)
        setBestFitPath(data.bestPosterPath)
      } catch (err) {
        if ((err as Error)?.name === "AbortError" || controller.signal.aborted) return
        setError("Network error during best-fit analysis")
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      controller.abort()
    }
  }, [cacheKey])

  return { bestFitPath, results, loading, error }
}
