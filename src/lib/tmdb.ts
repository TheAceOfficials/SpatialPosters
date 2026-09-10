import { z } from "zod"
import { createLogger } from "@/lib/logger"
import { envWithFallback } from "@/lib/env-compat"

const log = createLogger("tmdb")

// ── Validazione runtime delle risposte TMDB ─────────────────────────────
// TMDB v3 è un contratto stabile ma NON viziato: i cast `data as X` ciechi
// fanno sì che un cambio di forma della risposta propaghi undefined/garbage
// in silenzio. Questi schemi validano SOLO i campi strutturali usati dal
// codice (quelli che, se mancanti/cambiati di tipo, romperebbero la logica)
// e passano attraverso tutto il resto (passthrough): l'intera risposta viene
// preservata, ma un cambio di contratto reale emerge come errore descrittivo
// nei percorsi try/catch già previsti — non più spazzatura silenziosa.
//
// Il catching dei campi è intenzionalmente permissivo: TMDB omette campi
// a seconda del tipo (`title` solo sui film, `name` solo sulle serie, nessun
// `media_type` su /popular e /trending, ecc.). Gli schemi devono accettare
// BOTH la forma reale E quella del mock server e2e (e2e/mock-server.mjs).

const tmdbMediaItemSchema = z.object({
  id: z.number().int().positive(),
  media_type: z.string().optional(),
  title: z.string().optional(),
  name: z.string().optional(),
  poster_path: z.string().nullable().optional(),
  release_date: z.string().nullable().optional(),
  first_air_date: z.string().nullable().optional(),
  // Campi extra presenti nei payload di search/trending/credits (TMDB li
  // omette a seconda dell'endpoint): servono alle righe di catalogo/ricerca
  // (rating, backdrop, trama, generi — vedi catalog-handler).
  vote_average: z.number().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  overview: z.string().nullable().optional(),
  genre_ids: z.array(z.number()).optional(),
}).passthrough()

const tmdbSearchResponseSchema = z.object({
  results: z.array(tmdbMediaItemSchema).default([]),
  page: z.number().optional(),
  total_pages: z.number().optional(),
  total_results: z.number().optional(),
}).passthrough()

const tmdbTrendingResponseSchema = z.object({
  results: z.array(tmdbMediaItemSchema).default([]),
  page: z.number().optional(),
  total_pages: z.number().optional(),
  total_results: z.number().optional(),
}).passthrough()

const tmdbImageSchema = z.object({
  file_path: z.string(),
  aspect_ratio: z.number().optional(),
  height: z.number().optional(),
  width: z.number().optional(),
  iso_639_1: z.string().nullable().optional(),
  vote_average: z.number().optional(),
  vote_count: z.number().optional(),
}).passthrough()

const tmdbImagesResponseSchema = z.object({
  id: z.number().int().positive(),
  backdrops: z.array(tmdbImageSchema).default([]),
  posters: z.array(tmdbImageSchema).default([]),
  logos: z.array(tmdbImageSchema).default([]),
}).passthrough()

const tmdbExternalIdsSchema = z.object({
  id: z.number().int().positive(),
  imdb_id: z.string().nullable().optional(),
  tvdb_id: z.number().nullable().optional(),
}).passthrough()

const tmdbKeywordItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
}).passthrough()

const tmdbKeywordsResponseSchema = z.object({
  id: z.number().int().positive().optional(),
  keywords: z.array(tmdbKeywordItemSchema).default([]),
  results: z.array(tmdbKeywordItemSchema).optional(),
}).passthrough()

const tmdbCompanySchema = z.object({
  id: z.number().int().optional(),
  name: z.string().optional(),
  logo_path: z.string().nullable().optional(),
  origin_country: z.string().optional(),
}).passthrough()

const tmdbGenreSchema = z.object({
  id: z.number().int(),
  name: z.string(),
}).passthrough()

const tmdbGenreListResponseSchema = z.object({
  genres: z.array(tmdbGenreSchema).default([]),
}).passthrough()

const tmdbEpisodeSchema = z.object({
  id: z.number().int(),
  episode_number: z.number().optional(),
  season_number: z.number().optional(),
  name: z.string().nullable().optional(),
  overview: z.string().nullable().optional(),
  still_path: z.string().nullable().optional(),
  air_date: z.string().nullable().optional(),
}).passthrough()

const tmdbSeasonDetailsSchema = z.object({
  id: z.number().int().positive(),
  season_number: z.number().optional(),
  name: z.string().optional(),
  overview: z.string().nullable().optional(),
  episodes: z.array(tmdbEpisodeSchema).default([]),
}).passthrough()

const tmdbEpisodeGroupItemSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  order: z.number().optional(),
  description: z.string().optional(),
}).passthrough()

const tmdbEpisodeGroupsResponseSchema = z.object({
  results: z.array(tmdbEpisodeGroupItemSchema).default([]),
}).passthrough()

// I dettagli sono il payload più ricco: la maggior parte dei campi è opzionale
// e varia per tipo di contenuto (film vs serie). `id` resta l'ancora
// obbligatoria; tutto il resto passa attraverso.
const tmdbDetailsSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  overview: z.string().nullable().optional(),
  tagline: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  genres: z.array(tmdbGenreSchema).optional(),
  vote_average: z.number().optional(),
  vote_count: z.number().optional(),
  runtime: z.number().optional(),
  episode_run_time: z.array(z.number()).optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  release_date: z.string().nullable().optional(),
  first_air_date: z.string().nullable().optional(),
  last_air_date: z.string().nullable().optional(),
  original_language: z.string().optional(),
  networks: z.array(tmdbCompanySchema).optional(),
  production_companies: z.array(tmdbCompanySchema).optional(),
}).passthrough()

// Stessa cosa per i gruppi di episodi: struttura annidata, tutto opzionale
// tranne l'ancora `id`.
const tmdbEpisodeGroupDetailsSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  group_count: z.number().optional(),
  groups: z.array(z.object({
    id: z.string(),
    name: z.string().optional(),
    order: z.number().optional(),
    episodes: z.array(tmdbEpisodeSchema).default([]),
  }).passthrough()).default([]),
}).passthrough()

const tmdbFindResponseSchema = z.object({
  movie_results: z.array(z.object({ id: z.number().int().positive() }).passthrough()).default([]),
  tv_results: z.array(z.object({ id: z.number().int().positive() }).passthrough()).default([]),
}).passthrough()

const tmdbPersonSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  popularity: z.number().optional(),
  profile_path: z.string().nullable().optional(),
  known_for: z.array(z.object({
    id: z.number().int().positive(),
    media_type: z.string().optional(),
    vote_count: z.number().optional(),
  }).passthrough()).optional(),
}).passthrough()

const tmdbPersonSearchResponseSchema = z.object({
  results: z.array(tmdbPersonSchema).default([]),
  page: z.number().optional(),
  total_pages: z.number().optional(),
  total_results: z.number().optional(),
}).passthrough()

const tmdbPersonCreditsSchema = z.object({
  id: z.number().int().positive(),
  cast: z.array(tmdbMediaItemSchema).default([]),
  crew: z.array(tmdbMediaItemSchema).default([]),
}).passthrough()

/**
 * Valida una risposta TMDB con lo schema dato. Su successo restituisce la
 * risposta (i campi conosciuti tipizzati, il resto passthrough). Su fallimento
 * logga un warning COL nome dell'endpoint e i path dei problemi (mai dati o
 * chiavi API) e lancia un errore descrittivo: i chiamanti hanno già try/catch
 * o `.catch()` per gli errori TMDB, quindi degradano con grazia — ma il cambio
 * di contratto non passa più inosservato.
 */
function parseTmdb<T>(endpoint: string, schema: z.ZodType<unknown>, data: unknown): T {
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    const problems = parsed.error.issues.slice(0, 5).map((i) => i.path.join(".") || "(root)").join(", ")
    log.warn(`TMDB ${endpoint}: risposta non conforme allo schema — contratto cambiato?`, { problems })
    throw new Error(`TMDB ${endpoint}: risposta inattesa dal provider (${problems})`)
  }
  return parsed.data as T
}

// Base URL sovrascrivibili via env: usate dai test E2E per puntare al mock
// server locale (e2e/mock-server.mjs) senza chiave TMDB reale.
// Esportata (finding 14): imdb-resolver.ts la usa invece di hardcodare la URL.
export const TMDB_BASE_URL = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3"
const TMDB_BASE = TMDB_BASE_URL
const IMG_BASE = process.env.TMDB_IMG_URL || "https://image.tmdb.org/t/p"

const fetchCache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000
const CACHE_MAX = 500

/**
 * Risolve la chiave API TMDB dalla richiesta.
 * Priorità: header x-api-key > query param api_key > env PICTORIUM_TMDB_KEY (legacy: POSTERIUM_TMDB_KEY).
 * L'header evita che la chiave appaia nei log del proxy/CDN.
 *
 * L'env `PICTORIUM_TMDB_KEY` è un FALLBACK d'istanza (opt-in): pensata per le
 * istanze personali (es. deploy Vercel con un solo utente) dove i cataloghi
 * devono funzionare senza che Stremio passi la chiave in ogni richiesta. Per
 * istanze multi-utente pubbliche NON configurarla: la policy storica (nessuna
 * chiave d'istanza) resta valida per quel caso — header/query/profilo bastano.
 */
export function resolveRequestApiKey(req: { headers: Headers | { get: (name: string) => string | null }; nextUrl?: { searchParams: URLSearchParams } }): string | undefined {
  const headerKey = req.headers.get("x-api-key")
  if (headerKey) return headerKey
  const queryKey = req.nextUrl?.searchParams.get("api_key")
  if (queryKey) return queryKey
  const envKey = envWithFallback("TMDB_KEY") || process.env.TMDB_KEY || process.env.TMDB_API_KEY
  if (envKey) return envKey
  return undefined
}

const inflight = new Map<string, Promise<unknown>>()

interface TMDBStats {
  totalCalls: number
  cacheHits: number
  networkCalls: number
  lastCallTime: string | null
}

const tmdbStats: TMDBStats = {
  totalCalls: 0,
  cacheHits: 0,
  networkCalls: 0,
  lastCallTime: null,
}

export function getTMDBStats() {
  const cacheHitRate = tmdbStats.totalCalls > 0
    ? Math.round((tmdbStats.cacheHits / tmdbStats.totalCalls) * 1000) / 10
    : 0
  return {
    totalCalls: tmdbStats.totalCalls,
    cacheHits: tmdbStats.cacheHits,
    networkCalls: tmdbStats.networkCalls,
    cacheHitRate: `${cacheHitRate}%`,
    lastCallTime: tmdbStats.lastCallTime,
  }
}

async function tmdbFetch(path: string, apiKey?: string, signal?: AbortSignal): Promise<unknown> {
  tmdbStats.totalCalls++
  const key = apiKey || (process.env.TMDB_BASE_URL ? "mock-key" : undefined)
  if (!key) throw new Error("TMDB API key is missing")

  // Cache key is the URL WITHOUT the api_key so that:
  //   1. The per-endpoint cache is shared across users (not fragmented by key).
  //   2. API keys never appear in Map keys (memory safety).
  const neutralUrl = new URL(`${TMDB_BASE}${path}`)
  const cacheKey = neutralUrl.toString()

  // In-memory cache (5 min) — promote on hit for LRU eviction
  const cached = fetchCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    tmdbStats.cacheHits++
    // Move to end of Map (= most-recently-used position)
    fetchCache.delete(cacheKey)
    fetchCache.set(cacheKey, cached)
    return cached.data
  }

  // Deduplicate concurrent requests for the same URL
  const existing = inflight.get(cacheKey)
  if (existing) return existing

  // Actual fetch URL includes the api_key (kept separate from cacheKey)
  const fetchUrl = new URL(neutralUrl.toString())
  fetchUrl.searchParams.set("api_key", key)

  // Nota: l'inflight coalescing è condiviso tra richieste concorrenti sulla
  // stessa URL — il signal vale solo per la PRIMA richiesta (quella che esegue
  // il fetch). È corretto: il deadline del render è il bound, non il signal.
  const promise = (async () => {
    tmdbStats.networkCalls++
    tmdbStats.lastCallTime = new Date().toISOString()
    const res = await fetch(fetchUrl.toString(), { signal: signal ?? AbortSignal.timeout(30000) })
    if (!res.ok) throw new Error(`TMDB fetch failed: ${res.status}`)
    const data = await res.json()
    // Evict LRU (first key = least-recently-used) when at capacity
    if (fetchCache.size >= CACHE_MAX) fetchCache.delete(fetchCache.keys().next().value!)
    fetchCache.set(cacheKey, { data, timestamp: Date.now() })
    return data
  })()
    .finally(() => inflight.delete(cacheKey))

  inflight.set(cacheKey, promise)
  return promise
}

/**
 * Health check verso un path TMDB: restituisce ok/status/time SENZA esporre la
 * chiave nella risposta né nei messaggi d'errore. Usata da /api/health, che non
 * deve conoscere la chiave reale né interpolarla in URL propri (S9). La chiave
 * in query nell'URL outbound è imposta dalla v3 TMDB (vedi commento tmdbFetch).
 */
export async function checkTmdbEndpoint(path: string, apiKey?: string): Promise<{ ok: boolean; status: number; time: number }> {
  const key = apiKey
  if (!key) return { ok: false, status: 401, time: 0 }
  const start = performance.now()
  try {
    const url = new URL(`${TMDB_BASE}${path}`)
    url.searchParams.set("api_key", key)
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    return { ok: res.ok, status: res.status, time: Math.round(performance.now() - start) }
  } catch {
    return { ok: false, status: 0, time: Math.round(performance.now() - start) }
  }
}

export interface TMDBImage {
  aspect_ratio: number
  file_path: string
  height: number
  iso_639_1: string | null
  vote_average: number
  vote_count: number
  width: number
}

export interface TMDBCompany {
  id: number
  name: string
  logo_path: string | null
  origin_country: string
}

export interface TMDBImagesResponse {
  id: number
  backdrops: TMDBImage[]
  posters: TMDBImage[]
  logos: TMDBImage[]
}

export interface TMDBMediaResult {
  id: number
  media_type: "movie" | "tv"
  title?: string
  name?: string
  poster_path: string | null
  release_date?: string
  first_air_date?: string
  vote_average?: number | null
  backdrop_path?: string | null
  overview?: string | null
  genre_ids?: number[]
}

export interface TMDBSearchResponse {
  page: number
  results: TMDBMediaResult[]
  total_pages: number
  total_results: number
}

export async function searchMulti(query: string, language = "it-IT", apiKey?: string, page = 1): Promise<TMDBSearchResponse> {
  const data = await tmdbFetch(`/search/multi?query=${encodeURIComponent(query)}&language=${language}&page=${page}`, apiKey)
  return parseTmdb<TMDBSearchResponse>("search/multi", tmdbSearchResponseSchema, data)
}

export async function searchMovies(query: string, language = "it-IT", apiKey?: string, page = 1): Promise<TMDBSearchResponse> {
  const data = await tmdbFetch(`/search/movie?query=${encodeURIComponent(query)}&language=${language}&page=${page}`, apiKey)
  const res = parseTmdb<TMDBSearchResponse>("search/movie", tmdbSearchResponseSchema, data)
  if (res?.results) {
    res.results = res.results.map((r) => ({ ...r, media_type: "movie" }))
  }
  return res
}

export async function searchTV(query: string, language = "it-IT", apiKey?: string, page = 1): Promise<TMDBSearchResponse> {
  const data = await tmdbFetch(`/search/tv?query=${encodeURIComponent(query)}&language=${language}&page=${page}`, apiKey)
  const res = parseTmdb<TMDBSearchResponse>("search/tv", tmdbSearchResponseSchema, data)
  if (res?.results) {
    res.results = res.results.map((r) => ({ ...r, media_type: "tv" }))
  }
  return res
}

export interface TMDBGenre {
  id: number
  name: string
}

export interface TMDBGenreListResponse {
  genres: TMDBGenre[]
}

/**
 * Lista generi TMDB localizzata (`/genre/{movie|tv}/list`). Usata per mappare
 * i `genre_ids` delle risposte di ricerca sui nomi — le liste sono stabili e
 * tmdbFetch le cachа in memoria (LRU 5 min) condividendo l'URL tra richieste.
 */
export async function getGenreList(mediaType: "movie" | "tv", language = "it-IT", apiKey?: string): Promise<TMDBGenreListResponse> {
  const data = await tmdbFetch(`/genre/${mediaType}/list?language=${language}`, apiKey)
  return parseTmdb<TMDBGenreListResponse>("genre/list", tmdbGenreListResponseSchema, data)
}

export async function getPopularMovies(page = 1, language = "it-IT", apiKey?: string): Promise<TMDBSearchResponse> {
  const data = await tmdbFetch(`/movie/popular?language=${language}&page=${page}&region=IT`, apiKey)
  return parseTmdb<TMDBSearchResponse>("movie/popular", tmdbSearchResponseSchema, data)
}

export async function getPopularTV(page = 1, language = "it-IT", apiKey?: string): Promise<TMDBSearchResponse> {
  const data = await tmdbFetch(`/tv/popular?language=${language}&page=${page}&region=IT`, apiKey)
  return parseTmdb<TMDBSearchResponse>("tv/popular", tmdbSearchResponseSchema, data)
}

export async function getImages(mediaType: "movie" | "tv", id: number, languages = "en,null", apiKey?: string, signal?: AbortSignal): Promise<TMDBImagesResponse> {
  const data = await tmdbFetch(`/${mediaType}/${id}/images?include_image_language=${encodeURIComponent(languages)}`, apiKey, signal)
  return parseTmdb<TMDBImagesResponse>("images", tmdbImagesResponseSchema, data)
}

export function posterUrl(path: string, size = "w500"): string {
  return `${IMG_BASE}/${size}${path}`
}

export function posterUrlOriginal(path: string): string {
  return `${IMG_BASE}/original${path}`
}

export interface TMDBExternalIds {
  imdb_id: string | null
  tvdb_id?: number | null
}

export async function getExternalIds(mediaType: "movie" | "tv", id: number, apiKey?: string, signal?: AbortSignal): Promise<TMDBExternalIds> {
  const data = await tmdbFetch(`/${mediaType}/${id}/external_ids`, apiKey, signal)
  return parseTmdb<TMDBExternalIds>("external_ids", tmdbExternalIdsSchema, data)
}

export interface TMDBKeywordsResponse {
  id: number
  keywords?: { id: number; name: string }[]
  results?: { id: number; name: string }[]
}

export async function getKeywords(mediaType: "movie" | "tv", id: number, apiKey?: string, signal?: AbortSignal): Promise<string[]> {
  try {
    const data = parseTmdb<TMDBKeywordsResponse>("keywords", tmdbKeywordsResponseSchema, await tmdbFetch(`/${mediaType}/${id}/keywords`, apiKey, signal))
    const list = data.keywords || data.results || []
    return list.map((k) => k.name)
  } catch {
    return []
  }
}

export interface TMDBDetails {
  id: number
  title?: string
  name?: string
  overview?: string
  tagline?: string | null
  backdrop_path?: string | null
  genres: { id: number; name: string }[]
  vote_average: number
  vote_count: number
  runtime?: number
  episode_run_time?: number[]
  type?: string
  status?: string
  release_date?: string
  first_air_date?: string
  last_air_date?: string
  next_episode_to_air?: { air_date: string; episode_number: number; season_number: number } | null
  number_of_seasons?: number
  number_of_episodes?: number
  networks?: { id: number; name: string; logo_path: string | null; origin_country: string }[]
  production_companies?: { id: number; name: string; logo_path: string | null; origin_country: string }[]
  original_language?: string
  poster_path?: string | null
  seasons?: { id: number; season_number: number; name: string; episode_count: number; air_date?: string; poster_path?: string | null }[]
  credits?: {
    cast?: { id: number; name: string; character?: string; profile_path?: string | null }[]
    crew?: { id: number; name: string; job: string; department?: string }[]
  }
  videos?: {
    results?: { id: string; key: string; site: string; type: string; name: string }[]
  }
  external_ids?: {
    imdb_id?: string | null
  }
}

export async function getDetails(mediaType: "movie" | "tv", id: number, language = "it-IT", apiKey?: string, signal?: AbortSignal): Promise<TMDBDetails> {
  const data = await tmdbFetch(`/${mediaType}/${id}?language=${language}`, apiKey, signal)
  return parseTmdb<TMDBDetails>("details", tmdbDetailsSchema, data)
}

export async function getFullDetails(mediaType: "movie" | "tv", id: number, language = "it-IT", apiKey?: string, signal?: AbortSignal): Promise<TMDBDetails> {
  const data = await tmdbFetch(`/${mediaType}/${id}?language=${language}&append_to_response=credits,videos,external_ids`, apiKey, signal)
  return parseTmdb<TMDBDetails>("full_details", tmdbDetailsSchema, data)
}

export interface TMDBEpisode {
  id: number
  episode_number: number
  season_number: number
  name: string
  overview: string
  still_path: string | null
  air_date: string
  vote_average?: number
  order?: number
}

export interface TMDBSeasonDetails {
  id: number
  season_number: number
  name: string
  overview: string
  episodes: TMDBEpisode[]
}

export async function getTVSeason(tvId: number, seasonNumber: number, language = "it-IT", apiKey?: string, signal?: AbortSignal): Promise<TMDBSeasonDetails | null> {
  try {
    const data = await tmdbFetch(`/tv/${tvId}/season/${seasonNumber}?language=${language}`, apiKey, signal)
    return parseTmdb<TMDBSeasonDetails>("season", tmdbSeasonDetailsSchema, data)
  } catch {
    return null
  }
}

export interface TMDBEpisodeGroupItem {
  id: string
  name: string
  order?: number
  description?: string
  type?: number
  group_count?: number
  episode_count?: number
}

export interface TMDBEpisodeGroupsResponse {
  results: TMDBEpisodeGroupItem[]
}

export interface TMDBEpisodeGroupDetails {
  id: string
  name: string
  description: string
  group_count: number
  groups: {
    id: string
    name: string
    order: number
    episodes: TMDBEpisode[]
  }[]
}

export async function getTVEpisodeGroups(tvId: number, apiKey?: string, signal?: AbortSignal): Promise<TMDBEpisodeGroupItem[]> {
  try {
    const data = await tmdbFetch(`/tv/${tvId}/episode_groups`, apiKey, signal)
    return parseTmdb<TMDBEpisodeGroupsResponse>("episode_groups", tmdbEpisodeGroupsResponseSchema, data)?.results || []
  } catch {
    return []
  }
}

export async function getTVEpisodeGroup(groupId: string, language = "it-IT", apiKey?: string, signal?: AbortSignal): Promise<TMDBEpisodeGroupDetails | null> {
  try {
    const data = await tmdbFetch(`/tv/episode_group/${groupId}?language=${language}`, apiKey, signal)
    return parseTmdb<TMDBEpisodeGroupDetails>("episode_group", tmdbEpisodeGroupDetailsSchema, data)
  } catch {
    return null
  }
}

export interface TMDBTrendingItem {
  id: number
  media_type: string
  popularity: number
}

export interface TMDBTrendingResponse {
  page: number
  results: TMDBTrendingItem[]
  total_pages: number
  total_results: number
}

export async function getTrending(mediaType: "movie" | "tv", timeWindow: "day" | "week" = "day", apiKey?: string, page = 1): Promise<TMDBTrendingResponse> {
  const data = await tmdbFetch(`/trending/${mediaType}/${timeWindow}?language=it-IT&page=${page}`, apiKey)
  return parseTmdb<TMDBTrendingResponse>("trending", tmdbTrendingResponseSchema, data)
}

export interface TMDBPerson {
  id: number
  name: string
  popularity?: number
  profile_path: string | null
  known_for?: { id: number; media_type?: string; vote_count?: number }[]
}

export interface TMDBPersonSearchResponse {
  page: number
  results: TMDBPerson[]
  total_pages: number
  total_results: number
}

export interface TMDBPersonCredits {
  id: number
  cast: TMDBMediaResult[]
  crew: TMDBMediaResult[]
}

export async function searchPerson(query: string, language = "it-IT", apiKey?: string, page = 1, signal?: AbortSignal): Promise<TMDBPersonSearchResponse> {
  const data = await tmdbFetch(`/search/person?query=${encodeURIComponent(query)}&language=${language}&page=${page}`, apiKey, signal)
  return parseTmdb<TMDBPersonSearchResponse>("search/person", tmdbPersonSearchResponseSchema, data)
}

export async function personMovieCredits(personId: number, language = "it-IT", apiKey?: string, signal?: AbortSignal): Promise<TMDBPersonCredits> {
  const data = await tmdbFetch(`/person/${personId}/movie_credits?language=${language}`, apiKey, signal)
  return parseTmdb<TMDBPersonCredits>("person/movie_credits", tmdbPersonCreditsSchema, data)
}

export async function personTvCredits(personId: number, language = "it-IT", apiKey?: string, signal?: AbortSignal): Promise<TMDBPersonCredits> {
  const data = await tmdbFetch(`/person/${personId}/tv_credits?language=${language}`, apiKey, signal)
  return parseTmdb<TMDBPersonCredits>("person/tv_credits", tmdbPersonCreditsSchema, data)
}

/** Fix L26: svuota la cache TMDB condivisa (per /api/cache/clear). */
export function __clearTMDBCache(): void {
  fetchCache.clear()
}

/**
 * Risolve un id IMDb (tt...) al corrispondente id TMDB via /find (fix L22).
 * Riusa il layer condiviso (cache 5min a chiave neutra + inflight coalescing)
 * invece di un fetch dedicato come faceva imdb-resolver.
 */
export async function tmdbFindByImdb(imdbId: string, mediaType: "movie" | "tv", apiKey?: string, signal?: AbortSignal): Promise<number | null> {
  const data = await tmdbFetch(`/find/${encodeURIComponent(imdbId)}?external_source=imdb_id`, apiKey, signal)
  return resolveFindId(parseTmdbFind("find/imdb_id", data), mediaType)
}

export async function tmdbFindByTvdb(tvdbId: string | number, mediaType: "movie" | "tv", apiKey?: string, signal?: AbortSignal): Promise<number | null> {
  const data = await tmdbFetch(`/find/${encodeURIComponent(String(tvdbId))}?external_source=tvdb_id`, apiKey, signal)
  return resolveFindId(parseTmdbFind("find/tvdb_id", data), mediaType)
}

// Il find degrada a null (id non risolvibile) anche su un contratto rotto, esattamente
// come farebbe su una risposta di rete vuota: un id "non trovato" non deve mai 500are il meta.
function parseTmdbFind(endpoint: string, data: unknown): { movie_results?: { id?: number }[]; tv_results?: { id?: number }[] } | null {
  try {
    return parseTmdb<{ movie_results?: { id?: number }[]; tv_results?: { id?: number }[] }>(endpoint, tmdbFindResponseSchema, data)
  } catch {
    return null
  }
}

function resolveFindId(data: { movie_results?: { id?: number }[]; tv_results?: { id?: number }[] } | null, mediaType: "movie" | "tv"): number | null {
  if (!data) return null
  const id = mediaType === "movie"
    ? data.movie_results?.[0]?.id
    : (data.tv_results?.[0]?.id ?? data.movie_results?.[0]?.id)
  return typeof id === "number" && id > 0 ? id : null
}
