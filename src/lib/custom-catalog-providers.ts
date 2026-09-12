import crypto from "node:crypto"
import { cacheGet, cacheSet } from "@/lib/cache"
import { fetchCustomMDBList, type MDBListEntry } from "@/lib/mdblist"
import { createLogger } from "@/lib/logger"
import { envWithFallback } from "@/lib/env-compat"

const log = createLogger("custom-catalogs")
const CACHE_TTL_MS = 30 * 60 * 1000

export type CatalogProviderType =
  | "letterboxd"
  | "trakt"
  | "tmdb_collection"
  | "tmdb_list"
  | "tvdb"
  | "imdb"
  | "mdblist"

export interface ProviderDetectionResult {
  provider: CatalogProviderType
  nameSuggestion?: string
  defaultType: "movie" | "series" | "mixed"
  identifier?: string
}

/** Item di lista Letterboxd via StremThru (solo i campi che leggiamo). */
interface StremThruListItem {
  title?: string
  name?: string
  year?: string | number
  type?: string
  id_map?: { imdb?: string; tmdb?: string | number }
  imdb_id?: string
  tmdb_id?: string | number
}

/** Item di lista Trakt via StremThru (solo i campi che leggiamo). */
interface TraktListItem {
  type?: string
  id_map?: { imdb?: string; tmdb?: string | number }
  movie?: { ids?: { imdb?: string; tmdb?: number }; title?: string; name?: string; year?: number }
  show?: { ids?: { imdb?: string; tmdb?: number }; title?: string; name?: string; year?: number }
  // Variante "flat" (item senza movie/show, letta direttamente): il branch
  // `it.movie || it.show || it` in fetchTraktList deve poterli leggere anche qui.
  ids?: { imdb?: string; tmdb?: number }
  title?: string
  name?: string
  year?: number
}

/** Film della TMDb Collection / List (solo i campi che leggiamo). */
interface TmdbListPart {
  id?: number
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  media_type?: string
  poster_path?: string | null
}

/**
 * Riconosce il provider e suggerisce nome e tipo in base all'URL inserito.
 */
export function detectCatalogProvider(input: string): ProviderDetectionResult | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // 1. Letterboxd
  // es. https://letterboxd.com/arinbicer/list/mcu/ o https://letterboxd.com/user/watchlist/
  const letterboxdMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?letterboxd\.com\/([a-zA-Z0-9_.-]+)\/(?:list\/([a-zA-Z0-9_.-]+)|watchlist)\/?(?:[?#].*)?$/i)
  if (letterboxdMatch) {
    const user = letterboxdMatch[1]
    const slug = letterboxdMatch[2]
    const isWatchlist = trimmed.toLowerCase().includes("/watchlist")
    const rawName = isWatchlist ? `Watchlist di ${user}` : (slug ? slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Letterboxd List")
    return {
      provider: "letterboxd",
      nameSuggestion: rawName,
      defaultType: "mixed",
    }
  }

  // 2. Trakt
  // es. https://trakt.tv/users/donxy/lists/marvel-cinematic-universe o https://trakt.tv/lists/12345
  const traktMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?trakt\.tv\/(?:users\/([a-zA-Z0-9_.-]+)\/(?:lists\/([a-zA-Z0-9_.-]+)|watchlist)|lists\/([a-zA-Z0-9_.-]+))\/?(?:[?#].*)?$/i)
  if (traktMatch) {
    const user = traktMatch[1]
    const slug = traktMatch[2] || traktMatch[3]
    const isWatchlist = trimmed.toLowerCase().includes("/watchlist")
    const rawName = isWatchlist ? `Watchlist Trakt (${user})` : (slug ? slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Trakt List")
    return {
      provider: "trakt",
      nameSuggestion: rawName,
      defaultType: "mixed",
    }
  }

  // 3. TMDb Collection
  // es. https://www.themoviedb.org/collection/86311-the-avengers-collection o tmdb:collection:86311
  const tmdbColMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?themoviedb\.org\/collection\/([0-9]+)(?:-([a-zA-Z0-9_-]+))?\/?(?:[?#].*)?$/i)
    || trimmed.match(/^tmdb:collection:([0-9]+)$/i)
  if (tmdbColMatch) {
    const slug = tmdbColMatch[2]
    return {
      provider: "tmdb_collection",
      identifier: tmdbColMatch[1],
      nameSuggestion: slug ? slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : `TMDb Collezione ${tmdbColMatch[1]}`,
      defaultType: "movie",
    }
  }

  // 4. TMDb List
  // es. https://www.themoviedb.org/list/8249673-marvel-cinematic-universe o https://www.themoviedb.org/list/8249673 o tmdb:list:8249673
  const tmdbListMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?themoviedb\.org\/(?:u\/[^\/]+\/)?list\/([0-9]+)(?:-([a-zA-Z0-9_-]+))?\/?(?:[?#].*)?$/i)
    || trimmed.match(/^tmdb:list:([0-9]+)$/i)
  if (tmdbListMatch) {
    const slug = tmdbListMatch[2]
    return {
      provider: "tmdb_list",
      identifier: tmdbListMatch[1],
      nameSuggestion: slug ? slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : `TMDb Lista ${tmdbListMatch[1]}`,
      defaultType: "movie",
    }
  }

  // 5. TheTVDB List
  // es. https://thetvdb.com/lists/mcu
  const tvdbMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?thetvdb\.com\/lists\/([a-zA-Z0-9_.-]+)\/?(?:[?#].*)?$/i)
  if (tvdbMatch) {
    const slug = tvdbMatch[1]
    return {
      provider: "tvdb",
      identifier: slug,
      nameSuggestion: slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      defaultType: "mixed",
    }
  }

  // 6. IMDb List
  // es. https://www.imdb.com/list/ls000000000/
  const imdbMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?imdb\.com\/list\/(ls[0-9]+)\/?(?:[?#].*)?$/i)
  if (imdbMatch) {
    return {
      provider: "imdb",
      identifier: imdbMatch[1],
      nameSuggestion: `IMDb ${imdbMatch[1]}`,
      defaultType: "movie",
    }
  }

  // 7. MDBList (default fallback per mdblist.com, user/slug o id)
  return {
    provider: "mdblist",
    defaultType: "movie",
  }
}

/**
 * Scarica una lista Letterboxd tramite header HEAD x-letterboxd-identifier + StremThru API.
 */
async function fetchLetterboxdList(url: string, limit: number = 500): Promise<MDBListEntry[]> {
  try {
    const trimmed = url.trim()
    const urlObj = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`)
    if (urlObj.hostname !== "letterboxd.com" && urlObj.hostname !== "www.letterboxd.com") {
      log.warn("Invalid Letterboxd hostname", { hostname: urlObj.hostname })
      return []
    }
    const isWatchlist = urlObj.pathname.includes("/watchlist")
    let requestUrl: string
    if (isWatchlist) {
      const pathParts = urlObj.pathname.split("/").filter(Boolean)
      if (pathParts.length >= 1) {
        requestUrl = `https://letterboxd.com/${pathParts[0]}/`
      } else {
        requestUrl = `https://letterboxd.com${urlObj.pathname}`
      }
    } else {
      requestUrl = `https://letterboxd.com${urlObj.pathname}`
    }
    if (!requestUrl.endsWith("/")) requestUrl += "/"

    // 1. Richiesta HEAD per estrarre l'identificativo Letterboxd univoco
    const headRes = await fetch(requestUrl, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 SpatialPosters",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    }).catch(() => null)

    const identifier = headRes?.headers?.get("x-letterboxd-identifier")
    if (!identifier) {
      log.warn("Letterboxd identifier not found via HEAD request", { url: requestUrl })
      return []
    }

    // 2. Chiamata a StremThru per recuperare gli elementi della lista con mapping ID
    const stremThruUrl = isWatchlist
      ? `https://stremthru.13377001.xyz/v0/meta/letterboxd/users/${identifier}/lists/watchlist`
      : `https://stremthru.13377001.xyz/v0/meta/letterboxd/lists/${identifier}`

    const res = await fetch(stremThruUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 SpatialPosters",
      },
      signal: AbortSignal.timeout(12000),
    }).catch(() => null)

    if (!res || !res.ok) {
      log.warn("StremThru Letterboxd fetch failed", { identifier })
      return []
    }

    const json = await res.json()
    const rawItems: StremThruListItem[] = json?.data?.items || json?.items || []
    const items: MDBListEntry[] = []

    for (const item of rawItems) {
      const idMap = item.id_map || {}
      const imdb = idMap.imdb || (item.imdb_id ? String(item.imdb_id) : "")
      const tmdb = idMap.tmdb ? Number(idMap.tmdb) : (item.tmdb_id ? Number(item.tmdb_id) : undefined)
      const title = item.title || item.name || ""
      const year = Number(item.year) || 0
      const mediatype = item.type === "show" ? "tv" : "movie"

      if (imdb || tmdb || title) {
        items.push({ imdb, tmdb, title, year, mediatype })
      }
      if (items.length >= limit) break
    }

    return items
  } catch (err) {
    log.error("Error fetching Letterboxd list", { error: (err as Error).message })
    return []
  }
}

/**
 * Scarica una lista Trakt tramite Trakt API o StremThru o MDBList proxy.
 */
async function fetchTraktList(url: string, limit: number = 500): Promise<MDBListEntry[]> {
  try {
    const trimmed = url.trim()
    const traktMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?trakt\.tv\/(?:users\/([a-zA-Z0-9_.-]+)\/(?:lists\/([a-zA-Z0-9_.-]+)|watchlist)|lists\/([a-zA-Z0-9_.-]+))\/?(?:[?#].*)?$/i)
    if (!traktMatch) return []

    const user = traktMatch[1]
    const slug = traktMatch[2] || traktMatch[3]

    // Prova prima l'endpoint StremThru se disponibile
    if (user && slug) {
      const stremThruUrl = `https://stremthru.13377001.xyz/v0/meta/trakt/users/${encodeURIComponent(user)}/lists/${encodeURIComponent(slug)}/items`
      const res = await fetch(stremThruUrl, {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 SpatialPosters" },
        signal: AbortSignal.timeout(10000),
      }).catch(() => null)

      if (res && res.ok) {
        const json = await res.json()
        const rawItems: TraktListItem[] = json?.data?.items || json?.items || []
        if (rawItems.length > 0) {
          return rawItems.slice(0, limit).map((it) => {
            const idMap = it.id_map || {}
            const media = it.movie || it.show || it
            return {
              imdb: idMap.imdb || media.ids?.imdb || "",
              tmdb: Number(idMap.tmdb || media.ids?.tmdb) || undefined,
              title: media.title || media.name || "",
              year: Number(media.year) || 0,
              mediatype: (it.type === "show" || Boolean(it.show)) ? "tv" : "movie",
            }
          })
        }
      }
    }

    // Fallback: MDBList sync per liste Trakt pubbliche
    if (user && slug) {
      const mdblistFallback = await fetchCustomMDBList(`https://mdblist.com/lists/${encodeURIComponent(user)}/${encodeURIComponent(slug)}`, undefined, limit)
      if (mdblistFallback.length > 0) return mdblistFallback
    }

    return []
  } catch (err) {
    log.error("Error fetching Trakt list", { error: (err as Error).message })
    return []
  }
}

/**
 * Scarica i film di una TMDb Collection (saga) o TMDb List.
 */
async function fetchTmdbCollectionOrList(
  provider: "tmdb_collection" | "tmdb_list",
  identifier: string,
  apiKey?: string,
  limit: number = 500,
): Promise<MDBListEntry[]> {
  const key = apiKey || envWithFallback("TMDB_KEY") || process.env.TMDB_KEY || process.env.TMDB_API_KEY
  if (!key || !identifier) return []

  try {
    if (provider === "tmdb_collection") {
      const endpoint = `https://api.themoviedb.org/3/collection/${encodeURIComponent(identifier)}?api_key=${encodeURIComponent(key)}&language=it-IT`
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(8000) }).catch(() => null)
      if (!res || !res.ok) return []

      const data = await res.json()
      const rawParts: TmdbListPart[] = data?.parts || []

      return rawParts.slice(0, limit).map((p) => ({
        imdb: "",
        tmdb: Number(p.id) || undefined,
        title: p.title || p.name || "",
        year: Number((p.release_date || p.first_air_date || "").slice(0, 4)) || 0,
        mediatype: "movie",
        poster_path: p.poster_path ?? null,
      }))
    }

    // provider === "tmdb_list"
    // 1. Prova prima endpoint v3: /3/list/{list_id}
    const v3Endpoint = `https://api.themoviedb.org/3/list/${encodeURIComponent(identifier)}?api_key=${encodeURIComponent(key)}&language=it-IT`
    const res = await fetch(v3Endpoint, { signal: AbortSignal.timeout(8000) }).catch(() => null)
    const data = res && res.ok ? await res.json() : null
    let rawParts: TmdbListPart[] = data?.items || data?.parts || []

    if (data?.total_pages && data.total_pages > 1 && rawParts.length < limit) {
      const maxPages = Math.min(data.total_pages, Math.ceil(limit / 20))
      const CHUNK_SIZE = 5
      for (let i = 2; i <= maxPages; i += CHUNK_SIZE) {
        const chunkPromises: Promise<TmdbListPart[]>[] = []
        for (let p = i; p < Math.min(i + CHUNK_SIZE, maxPages + 1); p++) {
          const pageUrl = `https://api.themoviedb.org/3/list/${encodeURIComponent(identifier)}?api_key=${encodeURIComponent(key)}&language=it-IT&page=${p}`
          chunkPromises.push(
            fetch(pageUrl, { signal: AbortSignal.timeout(8000) })
              .then((r) => (r.ok ? r.json() : null))
              .then((d) => (d?.items || d?.parts || []) as TmdbListPart[])
              .catch(() => [] as TmdbListPart[])
          )
        }
        const pageResults = await Promise.all(chunkPromises)
        for (const items of pageResults) {
          rawParts.push(...items)
        }
        if (rawParts.length >= limit) break
      }
    }

    // 2. Se v3 non trova la lista (es. 404 per liste create su TMDB v4) o non ha elementi, tenta endpoint v4: /4/list/{list_id}
    if (rawParts.length === 0) {
      const v4Endpoint = `https://api.themoviedb.org/4/list/${encodeURIComponent(identifier)}?api_key=${encodeURIComponent(key)}&language=it-IT`
      const resV4 = await fetch(v4Endpoint, { signal: AbortSignal.timeout(8000) }).catch(() => null)
      if (resV4 && resV4.ok) {
        const dataV4 = await resV4.json()
        rawParts = dataV4?.results || []
        if (dataV4?.total_pages && dataV4.total_pages > 1 && rawParts.length < limit) {
          const maxPages = Math.min(dataV4.total_pages, Math.ceil(limit / 20))
          const CHUNK_SIZE = 5
          for (let i = 2; i <= maxPages; i += CHUNK_SIZE) {
            const chunkPromises: Promise<TmdbListPart[]>[] = []
            for (let p = i; p < Math.min(i + CHUNK_SIZE, maxPages + 1); p++) {
              const pageUrl = `https://api.themoviedb.org/4/list/${encodeURIComponent(identifier)}?api_key=${encodeURIComponent(key)}&language=it-IT&page=${p}`
              chunkPromises.push(
                fetch(pageUrl, { signal: AbortSignal.timeout(8000) })
                  .then((r) => (r.ok ? r.json() : null))
                  .then((d) => (d?.results || []) as TmdbListPart[])
                  .catch(() => [] as TmdbListPart[])
              )
            }
            const pageResults = await Promise.all(chunkPromises)
            for (const items of pageResults) {
              rawParts.push(...items)
            }
            if (rawParts.length >= limit) break
          }
        }
      }
    }

    return rawParts.slice(0, limit).map((p) => ({
      imdb: "",
      tmdb: Number(p.id) || undefined,
      title: p.title || p.name || "",
      year: Number((p.release_date || p.first_air_date || "").slice(0, 4)) || 0,
      mediatype: p.media_type === "tv" ? "tv" : "movie",
      poster_path: p.poster_path ?? null,
    }))
  } catch (err) {
    log.error("Error fetching TMDb collection or list", { provider, identifier, error: (err as Error).message })
    return []
  }
}


/**
 * Dispatcher universale per recuperare gli elementi di qualsiasi catalogo o lista esterna.
 */
export async function fetchUnifiedCatalogItems(
  urlOrSlug: string,
  options?: { apiKey?: string; mdblistKey?: string; limit?: number },
): Promise<MDBListEntry[]> {
  const trimmed = urlOrSlug.trim()
  if (!trimmed) return []

  const limit = options?.limit ?? 500
  const detection = detectCatalogProvider(trimmed)
  const provider = detection?.provider ?? "mdblist"

  const cacheKey = `custom_cat:${provider}:${crypto.createHash("sha1").update(trimmed).digest("hex").slice(0, 10)}:${limit}`
  const cached = cacheGet<MDBListEntry[]>(cacheKey)
  if (cached) return cached

  let items: MDBListEntry[] = []

  switch (provider) {
    case "letterboxd":
      items = await fetchLetterboxdList(trimmed, limit)
      break
    case "trakt":
      items = await fetchTraktList(trimmed, limit)
      break
    case "tmdb_collection":
    case "tmdb_list":
      if (detection?.identifier) {
        items = await fetchTmdbCollectionOrList(provider, detection.identifier, options?.apiKey, limit)
      }
      break
    case "mdblist":
    default:
      items = await fetchCustomMDBList(trimmed, options?.mdblistKey, limit)
      break
  }

  if (items.length > 0) {
    cacheSet(cacheKey, items, ["custom_catalogs"], CACHE_TTL_MS)
  }

  return items
}
