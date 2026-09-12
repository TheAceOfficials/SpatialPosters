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
 * Badge "Nuova stagione": serie TV con ultima messa in onda recente (<14gg)
 * ma prima messa in onda vecchia (altrimenti è "Nuova serie", non nuova stagione).
 * Con seasonCount > 1 usa `badge.newSeasonN`, che include il numero (es.
 * "Nuova stagione S2"). Il numero sta DENTRO la stringa tradotta e non
 * concatenato dopo: in ebraico un " S2" attaccato a un testo RTL produce una
 * stringa a direzione mista, mentre così ogni lingua decide dove metterlo.
 * Formula condivisa con BadgeControls (mai forkare): entrambi importano da qui.
 */
export function getNewSeasonLabel(input: {
  lastAirDate?: string | null
  firstAirDate?: string | null
  seasonCount?: number | null
  t: BadgeT
}): string | null {
  const now = Date.now()
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000
  const lastTime = input.lastAirDate ? new Date(input.lastAirDate).getTime() : NaN
  if (!Number.isFinite(lastTime)) return null
  if (!(lastTime <= now && (now - lastTime) < TWO_WEEKS_MS)) return null
  const firstTime = input.firstAirDate ? new Date(input.firstAirDate).getTime() : NaN
  if (Number.isFinite(firstTime) && firstTime <= now && (now - firstTime) < TWO_WEEKS_MS) return null
  const n = input.seasonCount
  const numbered = typeof n === "number" && Number.isFinite(n) && n > 1
  return numbered ? input.t("badge.newSeasonN", { n: n! }) : input.t("badge.newSeason")
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
  // Date FUTURE bug: con una data di uscita in avanti, (now - date) era negativo
  // e quindi < TWO_WEEKS_MS sempre → badge "nuovo" per tutto il periodo pre-release.
  // Il badge "nuovo" vale SOLO se la data è nel passato e dentro le 2 settimane;
  // le date future sono gestite dal badge "in arrivo" (upcomingRelease).
  const releaseTime = input.releaseDate ? new Date(input.releaseDate).getTime() : NaN
  const isNewMovie = input.mediaType === "movie" && Number.isFinite(releaseTime)
    ? releaseTime <= now && (now - releaseTime) < TWO_WEEKS_MS
    : false
  const firstAirTime = input.firstAirDate ? new Date(input.firstAirDate).getTime() : NaN
  const isNewSeries = input.mediaType === "tv" && Number.isFinite(firstAirTime)
    ? firstAirTime <= now && (now - firstAirTime) < TWO_WEEKS_MS
    : false

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

  const newSeason = input.mediaType === "tv"
    ? getNewSeasonLabel({
        lastAirDate: input.lastAirDate,
        firstAirDate: input.firstAirDate,
        seasonCount: input.seasonCount,
        t,
      })
    : null
  const sLower = (input.tvStatus || "").toLowerCase()
  const isBingeWorthy = input.mediaType === "tv" && (sLower === "ended" || sLower === "canceled" || sLower === "fine" || sLower === "concluso")

  const lastAirTime = input.lastAirDate ? new Date(input.lastAirDate).getTime() : NaN
  const isNewEpisode = input.mediaType === "tv" && Number.isFinite(lastAirTime)
    ? lastAirTime <= now && (now - lastAirTime) < TWO_WEEKS_MS && Number.isFinite(firstAirTime) && (now - firstAirTime) >= TWO_WEEKS_MS
    : false

  const badge = computeBadge({
    mediaType: input.mediaType,
    upcomingRelease,
    isNewMovie,
    isNewSeries,
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
    newSeason,
    extraFallback,
    awardBadge,
    studioBadge,
    subGenreBadge,
  }
}
