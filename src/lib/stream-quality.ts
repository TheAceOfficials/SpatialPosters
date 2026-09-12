import { createLogger } from "./logger"
import { getJWTitleQuality } from "./justwatch"
import { getExternalIds } from "./tmdb"
import { envWithFallback } from "./env-compat"

const log = createLogger("stream-quality")

export type StreamQuality = "4K" | "1080p" | "720p" | "SD"

const TORRENTIO_BASE_URL = (envWithFallback("TORRENTIO_URL") || process.env.TORRENTIO_URL || "https://torrentio.strem.fun").replace(/\/+$/, "")
const STREAM_CACHE_TTL = 30 * 60 * 1000 // 30 minutes
const STREAM_CACHE_TTL_NULL = 2 * 60 * 1000 // 2 minutes for null (evita cache avvelenata su Vercel)
const qualityCache = new Map<string, { quality: StreamQuality | null; timestamp: number }>()

export function parseStreamQualityFromStreams(
  streams: Array<{ name?: string; title?: string; behaviorHints?: { filename?: string; bingeGroup?: string } }>
): StreamQuality | null {
  if (!Array.isArray(streams) || streams.length === 0) return null

  let has1080p = false
  let has720p = false
  let hasSD = false

  for (const s of streams) {
    const text = `${s.name || ""} ${s.title || ""} ${s.behaviorHints?.filename || ""} ${s.behaviorHints?.bingeGroup || ""}`
    if (/\b(4k|2160[pi]?|uhd)\b/i.test(text)) {
      return "4K"
    }
    if (/\b(1080[pi]?|fhd)\b/i.test(text)) {
      has1080p = true
    } else if (/\b(720[pi]?|hd)\b/i.test(text)) {
      has720p = true
    } else if (/\b(480[pi]?|576[pi]?|sd|dvdrip|cam|ts)\b/i.test(text)) {
      hasSD = true
    }
  }

  if (has1080p) return "1080p"
  if (has720p) return "720p"
  if (hasSD) return "SD"
  return null
}

export async function fetchTorrentioQuality(
  type: "movie" | "series",
  imdbId: string,
  signal?: AbortSignal
): Promise<StreamQuality | null> {
  const streamId = type === "movie" ? imdbId : `${imdbId}:1:1`
  const url = `${TORRENTIO_BASE_URL}/stream/${type}/${encodeURIComponent(streamId)}.json`
  try {
    const timeoutSignal = AbortSignal.timeout(6000)
      let combinedSignal: AbortSignal = timeoutSignal
      if (signal) {
        if (typeof (AbortSignal as unknown as { any?: unknown }).any === "function") {
          combinedSignal = (AbortSignal as unknown as { any: (signals: AbortSignal[]) => AbortSignal }).any([signal, timeoutSignal])
        } else {
          // Fallback Node <19: combina manualmente i signal
          const ctrl = new AbortController()
          const onAbort = () => ctrl.abort((signal as unknown as { reason?: unknown })?.reason ?? timeoutSignal.reason)
          if (signal.aborted || timeoutSignal.aborted) ctrl.abort()
          else {
            signal.addEventListener("abort", onAbort, { once: true })
            timeoutSignal.addEventListener("abort", onAbort, { once: true })
          }
          combinedSignal = ctrl.signal
        }
      }

      const res = await fetch(url, {
        headers: { "User-Agent": "SpatialPosters/1.0" },
        signal: combinedSignal,
      })
      if (!res.ok) {
        log.debug("Torrentio non-OK", { imdbId, status: res.status })
        return null
      }
      const data = await res.json()
      const q = parseStreamQualityFromStreams(data?.streams)
      if (q) log.debug("Torrentio quality", { imdbId, quality: q })
      return q
    } catch (err) {
      log.debug("Torrentio stream quality check failed or timed out", { imdbId, error: err instanceof Error ? err.message : String(err) })
      return null
    }
}

export async function resolveStreamQuality(
  type: "movie" | "series",
  imdbId?: string | null,
  tmdbId?: number | null,
  searchTitle?: string | null,
  signal?: AbortSignal
): Promise<StreamQuality | null> {
  const cacheKey = `${type}:${imdbId || tmdbId || searchTitle}`
  const cached = qualityCache.get(cacheKey)
  if (cached) {
    const ttl = cached.quality === null ? STREAM_CACHE_TTL_NULL : STREAM_CACHE_TTL
    if (Date.now() - cached.timestamp < ttl) return cached.quality
  }

  let quality: StreamQuality | null = null

  // 1. Try Torrentio via IMDb ID
  let targetImdbId = imdbId
  if (!targetImdbId && tmdbId) {
    try {
      const ext = await getExternalIds(type === "movie" ? "movie" : "tv", tmdbId)
      if (ext.imdb_id) targetImdbId = ext.imdb_id
    } catch {}
  }

  if (targetImdbId && targetImdbId.startsWith("tt")) {
    quality = await fetchTorrentioQuality(type, targetImdbId, signal)
  }

  // 2. Fallback to JustWatch GraphQL if Torrentio returned nothing and tmdbId is present
  if (!quality && tmdbId) {
    try {
      quality = await getJWTitleQuality(
        tmdbId,
        type === "movie" ? "MOVIE" : "SHOW",
        searchTitle,
        "IT",
        signal
      )
    } catch {}
  }

  qualityCache.set(cacheKey, { quality, timestamp: Date.now() })
  return quality
}

export function __resetStreamQualityCache() {
  qualityCache.clear()
}
