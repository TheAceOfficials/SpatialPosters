/**
 * Shared poster truth for badge computation.
 * Used by both the server route and client hooks, ensuring the same badge
 * logic applies in preview (WYSIWYG) and final poster.
 */
import { computeBadge, computeAbsoluteCinema, type BadgeResult } from "./badge-priority"
import { getAwardBadgeLabel, getNominationBadgeLabel } from "./awards"
import { getUpcomingReleaseLabel } from "./release-badge"
import { getSubGenreLabel } from "./subgenres"

export type BadgeT = (key: string, params?: Record<string, string | number>) => string

export interface BadgeInput {
  mediaType: "movie" | "tv"
  releaseDate: string | null
  firstAirDate: string | null
  /** Ultima messa in onda (serie TV) — per il badge "Nuova stagione". */
  lastAirDate: string | null
  /** Numero di stagioni TMDB — per il suffisso "S2" del badge "Nuova stagione". */
  seasonCount: number | null
  /** Origin country di network + production companies (ISO-3166) — per "K-Drama". */
  originCountries: string[]
  voteAverage: number
  trendRank: number | null
  animeRank: number | null
  awards: string[]
  nominations: string[]
  studios: string[]
  director: string | null
  tvType: string | null | undefined
  tvStatus: string | null | undefined
  networkLogoMatched?: boolean
  keywords?: string[]
  /** IMDb Top 250 badge flag — resolved externally (async fetch). */
  imdbTop250?: boolean
}

export interface ComputedTopBadge {
  readonly badge: BadgeResult | null
  readonly upcomingRelease: string | null
  readonly isNewMovie: boolean
  readonly isNewSeries: boolean
  readonly isNewAnime?: boolean
  readonly newSeason: string | null
  readonly extraFallback: string | null
  readonly awardBadge: string | null
  readonly studioBadge: string | null
  readonly subGenreBadge: string | null
}

export function isNetworkStudio(studioName: string | null): boolean {
  if (!studioName) return false
  const lower = studioName.toLowerCase().trim()
  return !!(
    lower.includes("netflix") ||
    lower.includes("hbo") || lower === "max" ||
    lower.includes("disney") ||
    lower.includes("prime") || lower.includes("amazon") || lower.includes("mgm") || lower.includes("metro-goldwyn") || lower.includes("metro goldwyn") ||
    lower.includes("apple") ||
    lower.includes("paramount") ||
    lower === "rai" || lower.startsWith("rai ") ||
    lower.includes("crunchyroll")
  )
}

/**
 * Check if content is anime based on anime rank, keywords, or tvType.
 */
export function isAnimeContent(input: { animeRank?: number | null; keywords?: string[]; tvType?: string | null }): boolean {
  if (typeof input.animeRank === "number" && Number.isFinite(input.animeRank)) return true
  if (input.keywords?.some((k) => k.toLowerCase().includes("anime"))) return true
  if ((input.tvType || "").toLowerCase().includes("anime")) return true
  return false
}

/**
 * Badge "Nuova stagione": serie TV in corso con ultima messa in onda recente (<14gg)
 * ma prima messa in onda vecchia (altrimenti è "Nuova serie" / "Nuovo anime", non nuova stagione).
 * Restituisce una stringa pulita e minimale "badge.newSeason" (es. "New season").
 */
export function getNewSeasonLabel(input: {
  lastAirDate?: string | null
  firstAirDate?: string | null
  seasonCount?: number | null
  tvStatus?: string | null
  t: BadgeT
}): string | null {
  const sLower = (input.tvStatus || "").toLowerCase()
  if (sLower === "ended" || sLower === "canceled" || sLower === "cancelled" || sLower === "fine" || sLower === "concluso") {
    return null
  }
  const count = input.seasonCount
  if (typeof count === "number" && Number.isFinite(count) && count <= 1) {
    return null
  }
  const now = Date.now()
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000
  const lastTime = input.lastAirDate ? new Date(input.lastAirDate).getTime() : NaN
  if (!Number.isFinite(lastTime)) return null
  if (!(lastTime <= now && (now - lastTime) < TWO_WEEKS_MS)) return null
  const firstTime = input.firstAirDate ? new Date(input.firstAirDate).getTime() : NaN
  if (Number.isFinite(firstTime) && firstTime <= now && (now - firstTime) < TWO_WEEKS_MS) return null
  return input.t("badge.newSeason")
}

/**
 * True se almeno un origin country di network/production è KR (K-Drama).
 * Confronto case-insensitive su codici ISO-3166 già normalizzati da TMDB.
 */
export function isKDramaOrigin(originCountries: readonly string[] | undefined | null): boolean {
  return !!originCountries?.some((c) => c?.trim().toUpperCase() === "KR")
}

/**
 * Single entry point for badge computation — shared by server (route.ts)
 * and client (usePosterSave.ts, poster-url.ts).
 * Returns both the final badge and intermediate values so callers can
 * use them for save logic without recomputing.
 */
export function computeTopBadge(input: BadgeInput, t: BadgeT, locale?: string): ComputedTopBadge {
  const now = Date.now()
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000
  const releaseTime = input.releaseDate ? new Date(input.releaseDate).getTime() : NaN
  const isNewMovie = input.mediaType === "movie" && Number.isFinite(releaseTime)
    ? releaseTime <= now && (now - releaseTime) < TWO_WEEKS_MS
    : false

  const sLower = (input.tvStatus || "").toLowerCase()
  const isEndedOrCanceled = input.mediaType === "tv" && (
    sLower === "ended" || sLower === "canceled" || sLower === "cancelled" || sLower === "fine" || sLower === "concluso"
  )
  const isBingeWorthy = isEndedOrCanceled

  const isAnime = isAnimeContent(input)
  const firstAirTime = input.firstAirDate ? new Date(input.firstAirDate).getTime() : NaN
  const isFreshSeries = input.mediaType === "tv" && Number.isFinite(firstAirTime)
    ? firstAirTime <= now && (now - firstAirTime) < TWO_WEEKS_MS
    : false

  const isNewAnime = isFreshSeries && isAnime
  const isNewSeries = isFreshSeries && !isAnime

  const awardBadge = input.awards.length ? getAwardBadgeLabel(input.awards, t) : null
  const nomination = !awardBadge && input.nominations.length
    ? getNominationBadgeLabel(input.nominations, t)
    : null
  const studioBadge = input.studios.length ? input.studios[0] : null
  const isNetStudio = isNetworkStudio(studioBadge)
  const studio = (input.networkLogoMatched || isNetStudio) ? null : studioBadge
  const extraFallback = computeAbsoluteCinema({
    mediaType: input.mediaType,
    imdbTop250: !!input.imdbTop250,
  }, t)

  const upcomingRelease = getUpcomingReleaseLabel({
    mediaType: input.mediaType,
    releaseDate: input.releaseDate,
    firstAirDate: input.firstAirDate,
    locale: locale || "it",
    t,
  })

  const subGenreBadge = getSubGenreLabel(input.keywords || [], locale)

  const newSeason = input.mediaType === "tv" && !isEndedOrCanceled
    ? getNewSeasonLabel({
        lastAirDate: input.lastAirDate,
        firstAirDate: input.firstAirDate,
        seasonCount: input.seasonCount,
        tvStatus: input.tvStatus,
        t,
      })
    : null

  const lastAirTime = input.lastAirDate ? new Date(input.lastAirDate).getTime() : NaN
  const isNewEpisode = input.mediaType === "tv" && !isEndedOrCanceled && !newSeason && Number.isFinite(lastAirTime)
    ? lastAirTime <= now && (now - lastAirTime) < TWO_WEEKS_MS && Number.isFinite(firstAirTime) && (now - firstAirTime) >= TWO_WEEKS_MS
    : false

  const badge = computeBadge({
    mediaType: input.mediaType,
    upcomingRelease,
    isNewMovie,
    isNewSeries,
    isNewAnime,
    isNewEpisode,
    isBingeWorthy,
    newSeason,
    animeRank: input.animeRank,
    trendRank: input.trendRank,
    award: awardBadge,
    nomination,
    studio,
    director: input.director,
    subGenre: subGenreBadge,
    isKDrama: isKDramaOrigin(input.originCountries),
    imdbTop250: !!input.imdbTop250,
    extra: extraFallback,
  }, t)

  return {
    badge,
    upcomingRelease,
    isNewMovie,
    isNewSeries,
    isNewAnime,
    newSeason,
    extraFallback,
    awardBadge,
    studioBadge,
    subGenreBadge,
  }
}
