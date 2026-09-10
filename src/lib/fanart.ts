import { envWithFallback } from "@/lib/env-compat"
import { createLogger } from "@/lib/logger"

const log = createLogger("fanart")

const FANART_BASE_URL = "https://webservice.fanart.tv/v3"

export interface FanartImageItem {
  id: string
  url: string
  lang?: string
  likes?: string | number
}

export interface FanartMovieResponse {
  name?: string
  tmdb_id?: string
  imdb_id?: string
  movieposter?: FanartImageItem[]
  hdmovielogo?: FanartImageItem[]
  movielogo?: FanartImageItem[]
  moviebackground?: FanartImageItem[]
}

export interface FanartTVResponse {
  name?: string
  tvdb_id?: string
  tvposter?: FanartImageItem[]
  hdtvlogo?: FanartImageItem[]
  clearlogo?: FanartImageItem[]
  showbackground?: FanartImageItem[]
}

export interface NormalizedFanartArtwork {
  file_path: string
  url: string
  vote_average: number
  aspect_ratio: number
  iso_639_1: string | null
  source: "fanart"
  is_textless: boolean
  type: "poster" | "logo" | "backdrop"
}

export function getFanartApiKey(customApiKey?: string): string | undefined {
  return customApiKey || envWithFallback("FANART_KEY")
}

export async function fetchFanartMovieArtwork(
  id: string | number,
  apiKey?: string,
  signal?: AbortSignal
): Promise<NormalizedFanartArtwork[]> {
  const key = getFanartApiKey(apiKey)
  if (!key) return []

  try {
    const res = await fetch(`${FANART_BASE_URL}/movies/${id}?api_key=${encodeURIComponent(key)}`, {
      signal,
      headers: { Accept: "application/json" },
    })

    if (!res.ok) {
      if (res.status !== 404) {
        log.warn("FanArt movie lookup failed", { status: res.status, id: String(id) })
      }
      return []
    }

    const data: FanartMovieResponse = await res.json()
    const results: NormalizedFanartArtwork[] = []

    if (Array.isArray(data.movieposter)) {
      for (const item of data.movieposter) {
        if (!item.url) continue
        const likes = typeof item.likes === "string" ? parseInt(item.likes, 10) : item.likes || 0
        results.push({
          file_path: item.url,
          url: item.url,
          vote_average: Number.isFinite(likes) ? likes : 0,
          aspect_ratio: 0.667,
          iso_639_1: item.lang && item.lang !== "00" ? item.lang : null,
          source: "fanart",
          is_textless: !item.lang || item.lang === "00" || item.lang === "",
          type: "poster",
        })
      }
    }

    const logos = [...(data.hdmovielogo || []), ...(data.movielogo || [])]
    for (const item of logos) {
      if (!item.url) continue
      const likes = typeof item.likes === "string" ? parseInt(item.likes, 10) : item.likes || 0
      results.push({
        file_path: item.url,
        url: item.url,
        vote_average: Number.isFinite(likes) ? likes : 0,
        aspect_ratio: 2.0,
        iso_639_1: item.lang && item.lang !== "00" ? item.lang : null,
        source: "fanart",
        is_textless: true,
        type: "logo",
      })
    }

    return results
  } catch (err) {
    if ((err as Error)?.name !== "AbortError") {
      log.error("Failed to fetch FanArt movie artwork", { error: (err as Error).message })
    }
    return []
  }
}

export async function fetchFanartTVArtwork(
  tvdbOrTmdbId: string | number,
  apiKey?: string,
  signal?: AbortSignal
): Promise<NormalizedFanartArtwork[]> {
  const key = getFanartApiKey(apiKey)
  if (!key) return []

  try {
    const res = await fetch(`${FANART_BASE_URL}/tv/${tvdbOrTmdbId}?api_key=${encodeURIComponent(key)}`, {
      signal,
      headers: { Accept: "application/json" },
    })

    if (!res.ok) {
      if (res.status !== 404) {
        log.warn("FanArt TV lookup failed", { status: res.status, id: String(tvdbOrTmdbId) })
      }
      return []
    }

    const data: FanartTVResponse = await res.json()
    const results: NormalizedFanartArtwork[] = []

    if (Array.isArray(data.tvposter)) {
      for (const item of data.tvposter) {
        if (!item.url) continue
        const likes = typeof item.likes === "string" ? parseInt(item.likes, 10) : item.likes || 0
        results.push({
          file_path: item.url,
          url: item.url,
          vote_average: Number.isFinite(likes) ? likes : 0,
          aspect_ratio: 0.667,
          iso_639_1: item.lang && item.lang !== "00" ? item.lang : null,
          source: "fanart",
          is_textless: !item.lang || item.lang === "00" || item.lang === "",
          type: "poster",
        })
      }
    }

    const logos = [...(data.hdtvlogo || []), ...(data.clearlogo || [])]
    for (const item of logos) {
      if (!item.url) continue
      const likes = typeof item.likes === "string" ? parseInt(item.likes, 10) : item.likes || 0
      results.push({
        file_path: item.url,
        url: item.url,
        vote_average: Number.isFinite(likes) ? likes : 0,
        aspect_ratio: 2.0,
        iso_639_1: item.lang && item.lang !== "00" ? item.lang : null,
        source: "fanart",
        is_textless: true,
        type: "logo",
      })
    }

    return results
  } catch (err) {
    if ((err as Error)?.name !== "AbortError") {
      log.error("Failed to fetch FanArt TV artwork", { error: (err as Error).message })
    }
    return []
  }
}
