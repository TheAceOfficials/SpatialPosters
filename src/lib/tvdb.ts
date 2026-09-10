/**
 * Client TheTVDB (API v4)
 *
 * Utilizzato per il recupero di copertine (still/screencap) e descrizioni
 * degli episodi delle serie TV con trame localizzate in italiano.
 */

import crypto from "node:crypto"
import { createLogger } from "@/lib/logger"

const log = createLogger("tvdb")

const TVDB_BASE = "https://api4.thetvdb.com/v4"
const ARTWORKS_BASE = "https://artworks.thetvdb.com"

// Token cache: JWT valido fino a 25 giorni (TVDB fornisce token da 30 giorni)
const tokenCache = new Map<string, { token: string; expiry: number }>()
const inflightTokens = new Map<string, Promise<string | null>>()

// Remote ID cache: (es. tt6468322 -> tvdbId)
const remoteIdCache = new Map<string, { tvdbId: number; expiry: number }>()

// Episodes cache: (tvdbId:lang:seasonType -> TvdbEpisode[])
const episodesCache = new Map<string, { episodes: TvdbEpisode[]; expiry: number }>()

// SeasonTypes cache: (tvdbId -> TvdbSeasonType[])
const seasonTypesCache = new Map<string, { types: TvdbSeasonType[]; expiry: number }>()

const CACHE_TTL_REMOTE = 24 * 60 * 60 * 1000 // 24 ore
const CACHE_TTL_EPISODES = 6 * 60 * 60 * 1000 // 6 ore
const CACHE_TTL_SEASONTYPES = 24 * 60 * 60 * 1000 // 24 ore

const MAX_TOKEN_ENTRIES = 50
const MAX_REMOTE_ENTRIES = 1000
const MAX_EPISODE_ENTRIES = 200

function setBounded<K, V>(map: Map<K, V>, key: K, value: V, maxEntries: number): void {
  if (map.size >= maxEntries) {
    const oldest = map.keys().next().value
    if (oldest !== undefined) map.delete(oldest)
  }
  map.set(key, value)
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16)
}

/** Pulisce le cache in-memory TVDB (utile per test o reload manuale) */
export function clearTvdbCache(): void {
  tokenCache.clear()
  inflightTokens.clear()
  remoteIdCache.clear()
  episodesCache.clear()
  seasonTypesCache.clear()
}

export interface TvdbSeasonType {
  id: number
  name: string
  type: string
  alternateName?: string | null
}

export interface TvdbEpisode {
  id: number
  name?: string
  overview?: string
  image?: string
  seasonNumber: number
  number: number
  aired?: string
  runtime?: number
}

interface TvdbEpisodeResponse {
  status: string
  data?: {
    series?: { id: number; name: string }
    episodes?: TvdbEpisode[]
  } | TvdbEpisode[]
  links?: {
    next?: string
    page?: number
    total_pages?: number
  }
}

interface TvdbSearchResponse {
  status: string
  data?: Array<{
    id?: number | string
    tvdb_id?: number | string
    objectID?: string
    name?: string
    type?: string
    series?: { id?: number | string }
  }>
}

/**
 * Autentica una chiave API su TheTVDB v4 e restituisce il Bearer token.
 */
export async function getTvdbToken(apiKey: string): Promise<string | null> {
  const cleanKey = apiKey.trim()
  if (!cleanKey) return null
  const tokenKey = hashKey(cleanKey)

  const cached = tokenCache.get(tokenKey)
  if (cached && Date.now() < cached.expiry) {
    return cached.token
  }

  const existingInflight = inflightTokens.get(tokenKey)
  if (existingInflight) return existingInflight

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`${TVDB_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: cleanKey }),
        signal: AbortSignal.timeout(8000),
      })

      if (!res.ok) {
        log.warn("TVDB login failed", { status: res.status })
        return null
      }

      const json = await res.json()
      const token = json?.data?.token
      if (typeof token === "string" && token.length > 0) {
        // Cache per 25 giorni
        setBounded(tokenCache, tokenKey, { token, expiry: Date.now() + 25 * 24 * 60 * 60 * 1000 }, MAX_TOKEN_ENTRIES)
        return token
      }
      return null
    } catch (e) {
      log.error("TVDB login exception", { error: e instanceof Error ? e.message : String(e) })
      return null
    } finally {
      inflightTokens.delete(tokenKey)
    }
  })()

  inflightTokens.set(tokenKey, fetchPromise)
  return fetchPromise
}

/**
 * Trova l'ID numerico TheTVDB di una serie partendo da un IMDb ID (es. "tt6468322") o TMDB ID.
 */
export async function getTvdbSeriesId(remoteId: string, apiKey: string): Promise<number | null> {
  const cleanRemoteId = remoteId.trim()
  if (!cleanRemoteId) return null

  const cached = remoteIdCache.get(cleanRemoteId)
  if (cached && Date.now() < cached.expiry) {
    return cached.tvdbId
  }

  const token = await getTvdbToken(apiKey)
  if (!token) return null

  try {
    const res = await fetch(`${TVDB_BASE}/search/remoteid/${encodeURIComponent(cleanRemoteId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      log.warn("TVDB search by remoteid failed", { status: res.status, remoteId: cleanRemoteId })
      return null
    }

    const json = (await res.json()) as TvdbSearchResponse
    const results = json?.data
    if (!Array.isArray(results) || results.length === 0) return null

    // Estrae il primo ID serie valido
    for (const item of results) {
      const rawId = item?.series?.id ?? item.tvdb_id ?? item.id
      if (rawId) {
        const numId = typeof rawId === "number" ? rawId : parseInt(String(rawId), 10)
        if (Number.isFinite(numId) && numId > 0) {
          setBounded(remoteIdCache, cleanRemoteId, { tvdbId: numId, expiry: Date.now() + CACHE_TTL_REMOTE }, MAX_REMOTE_ENTRIES)
          return numId
        }
      }
    }
    return null
  } catch (e) {
    log.error("TVDB search remoteid exception", { error: e instanceof Error ? e.message : String(e) })
    return null
  }
}

/**
 * Recupera i seasonTypes disponibili per una serie (es. official, dvd, absolute, alternative).
 * Usato per esporre tutti gli ordinamenti TVDB (La Casa de Papel ne ha 2).
 */
export async function getTvdbSeasonTypes(tvdbSeriesId: number, apiKey: string): Promise<TvdbSeasonType[]> {
  const cacheKey = `st:${tvdbSeriesId}`
  const cached = seasonTypesCache.get(cacheKey)
  if (cached && Date.now() < cached.expiry) return cached.types

  const token = await getTvdbToken(apiKey)
  if (!token) return []

  try {
    const res = await fetch(`${TVDB_BASE}/series/${tvdbSeriesId}/extended`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      log.warn("TVDB series extended failed", { status: res.status, tvdbSeriesId })
      return []
    }
    const json = await res.json()
    const data = json?.data as Record<string, unknown> | undefined
    if (!data) return []

    const typesMap = new Map<string, TvdbSeasonType>()

    // 1. Controlla data.seasonTypes se presente direttamente
    if (Array.isArray(data.seasonTypes)) {
      for (const item of data.seasonTypes) {
        const r = item as Record<string, unknown>
        const id = Number(r.id)
        const typeStr = String(r.type || r.name || "").trim().toLowerCase()
        const name = String(r.name || r.type || "Order").trim()
        if (typeStr && Number.isFinite(id)) {
          typesMap.set(typeStr, {
            id,
            name,
            type: typeStr,
            alternateName: (r.alternateName as string | null) ?? null,
          })
        }
      }
    }

    // 2. Controlla data.seasons per estrarre tutti i tipi di stagione presenti per la serie
    if (Array.isArray(data.seasons)) {
      for (const s of data.seasons) {
        const seasonObj = s as Record<string, unknown>
        if (seasonObj?.type && typeof seasonObj.type === "object") {
          const st = seasonObj.type as Record<string, unknown>
          const id = Number(st.id)
          const typeStr = String(st.type || st.name || "").trim().toLowerCase()
          const name = String(st.name || st.type || "Order").trim()
          if (typeStr && !typesMap.has(typeStr)) {
            typesMap.set(typeStr, {
              id: Number.isFinite(id) ? id : typesMap.size + 1,
              name,
              type: typeStr,
              alternateName: (st.alternateName as string | null) ?? null,
            })
          }
        }
      }
    }

    let list = Array.from(typesMap.values())

    // Se la serie esiste ma non ha seasonTypes espliciti, fallback a Aired Order
    if (list.length === 0 && data.id) {
      list = [
        { id: 1, name: "Aired Order", type: "official", alternateName: null }
      ]
    }

    if (list.length > 0) {
      setBounded(seasonTypesCache, cacheKey, { types: list, expiry: Date.now() + CACHE_TTL_SEASONTYPES }, 100)
    }
    return list
  } catch (e) {
    log.error("TVDB seasonTypes exception", { error: e instanceof Error ? e.message : String(e) })
    return []
  }
}

/**
 * Recupera la lista degli episodi con trame e copertine still da TheTVDB.
 */
export async function getTvdbEpisodes(tvdbSeriesId: number, language = "ita", apiKey: string, seasonType: string = "default"): Promise<TvdbEpisode[]> {
  const normalizedType = seasonType?.trim() || "default"
  const cacheKey = `${tvdbSeriesId}:${language}:${normalizedType}`
  const cached = episodesCache.get(cacheKey)
  if (cached && Date.now() < cached.expiry) {
    return cached.episodes
  }

  const token = await getTvdbToken(apiKey)
  if (!token) return []

  try {
    const allEpisodes: TvdbEpisode[] = []
    let page = 0
    let hasMore = true

    // Fix M5: cap alzato da 10 a 50 pagine (100 ep/page → 5000 ep) per serie
    // long-running (es. One Piece >1000 ep). Il loop termina comunque su
    // total_pages quando disponibile, il cap è solo safety bound.
    while (hasMore && page < 50) {
      const langSegment = language && language !== "default" ? `/${encodeURIComponent(language)}` : ""
      const url = `${TVDB_BASE}/series/${tvdbSeriesId}/episodes/${encodeURIComponent(normalizedType)}${langSegment}?page=${page}`
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) {
        // Se la lingua specifica (es. ita) fallisce o non ha episodi, prova il default
        if (page === 0 && language !== "default") {
          return getTvdbEpisodes(tvdbSeriesId, "default", apiKey, normalizedType)
        }
        break
      }

      const json = (await res.json()) as TvdbEpisodeResponse
      let epList: TvdbEpisode[] = []

      if (Array.isArray(json?.data)) {
        epList = json.data
      } else if (Array.isArray(json?.data?.episodes)) {
        epList = json.data.episodes
      }

      if (epList.length === 0) break

      for (const ep of epList) {
        if (ep.image) {
          ep.image = formatTvdbImageUrl(ep.image)
        }
        allEpisodes.push(ep)
      }

      // Controllo paginazione
      const totalPages = json.links?.total_pages
      if (typeof totalPages === "number") {
        page++
        hasMore = page < totalPages
      } else {
        hasMore = false
      }
    }

    if (allEpisodes.length > 0) {
      setBounded(episodesCache, cacheKey, { episodes: allEpisodes, expiry: Date.now() + CACHE_TTL_EPISODES }, MAX_EPISODE_ENTRIES)
    }

    return allEpisodes
  } catch (e) {
    log.error("TVDB getEpisodes exception", { error: e instanceof Error ? e.message : String(e) })
    return []
  }
}

/** Formatta l'URL immagine TVDB aggiungendo il base URL se necessario. */
export function formatTvdbImageUrl(imagePath?: string | null): string | undefined {
  if (!imagePath || typeof imagePath !== "string") return undefined
  const clean = imagePath.trim()
  if (!clean) return undefined
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean
  return `${ARTWORKS_BASE}${clean.startsWith("/") ? "" : "/"}${clean}`
}

/**
 * Arricchisce i video di Stremio con copertine (screencap) e trame provenienti da TheTVDB.
 */
export async function enrichVideosWithTvdb(
  videos: Array<{
    id: string
    name?: string
    season: number
    episode: number
    overview?: string
    thumbnail?: string
    released?: string
    rating?: string
  }>,
  imdbId: string | null | undefined,
  tmdbId: number | null | undefined,
  apiKey: string,
  language = "ita"
): Promise<void> {
  if (!videos || videos.length === 0 || !apiKey) return

  // Risoluzione ID TheTVDB: prima tenta con IMDb ID, poi fallback con TMDB ID
  let tvdbSeriesId: number | null = null
  if (imdbId) {
    tvdbSeriesId = await getTvdbSeriesId(imdbId, apiKey)
  }
  if (!tvdbSeriesId && tmdbId) {
    try {
      const { getExternalIds } = await import("@/lib/tmdb")
      const ext = await getExternalIds("tv", tmdbId)
      if (ext?.tvdb_id && ext.tvdb_id > 0) {
        tvdbSeriesId = ext.tvdb_id
      } else if (ext?.imdb_id) {
        tvdbSeriesId = await getTvdbSeriesId(ext.imdb_id, apiKey)
      }
    } catch {}
    if (!tvdbSeriesId) {
      tvdbSeriesId = await getTvdbSeriesId(String(tmdbId), apiKey)
    }
  }

  if (!tvdbSeriesId) return

  const tvdbEps = await getTvdbEpisodes(tvdbSeriesId, language, apiKey)
  if (!tvdbEps || tvdbEps.length === 0) return

  // Costruisce mappa season:number -> TvdbEpisode
  const map = new Map<string, TvdbEpisode>()
  for (const ep of tvdbEps) {
    const s = ep.seasonNumber
    const e = ep.number
    if (typeof s === "number" && typeof e === "number") {
      map.set(`${s}:${e}`, ep)
    }
  }

  for (const v of videos) {
    const match = map.get(`${v.season}:${v.episode}`)
    if (match) {
      if (match.image) {
        const fullImg = formatTvdbImageUrl(match.image)
        if (fullImg) v.thumbnail = fullImg
      }
      if (match.overview && match.overview.trim().length > 0) {
        v.overview = match.overview.trim()
      }
      if (match.name && match.name.trim().length > 0) {
        v.name = match.name.trim()
      }
    }
  }
}
