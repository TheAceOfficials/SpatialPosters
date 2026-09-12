import { BADGE_KEY_PREFIX } from "./i18n"

export interface BadgeResult {
  type: "extra" | "rank"
  label: string
  rank?: number
  rankLabel?: string
}

type T = (key: string, params?: Record<string, string | number>) => string

const _idT: T = (k) => k


export function computeBadge(params: {
  mediaType: "movie" | "tv"
  upcomingRelease: string | null
  isNewMovie: boolean
  isNewSeries: boolean
  isNewEpisode?: boolean
  isBingeWorthy?: boolean
  newSeason?: string | null
  animeRank: number | null
  trendRank: number | null
  award: string | null
  nomination: string | null
  studio: string | null
  director: string | null
  subGenre?: string | null
  /** Serie TV prodotta in Corea del Sud (origin country KR). */
  isKDrama?: boolean
  imdbTop250?: boolean
  extra: string | null
}, _t?: T): BadgeResult | null {
  const t = _t || _idT
  if (params.upcomingRelease) return { type: "extra", label: params.upcomingRelease }
  if (params.animeRank) return { type: "rank", label: t("badge.anime"), rank: params.animeRank }
  // Label del rank per media type: "Film" per i film, "Serie tv" per le serie
  // (invece del periodo "Oggi"). qLabel/rankLabel possono comunque sovrascrivere.
  if (params.trendRank) return { type: "rank", label: t(params.mediaType === "movie" ? "badge.movie" : "badge.series"), rank: params.trendRank }
  if (params.isNewMovie) return { type: "extra", label: t("badge.newMovie") }
  if (params.isNewSeries) return { type: "extra", label: t("badge.newSeries") }
  if (params.newSeason) return { type: "extra", label: params.newSeason }
  if (params.isNewEpisode) return { type: "extra", label: t("badge.newEpisode") }
  if (params.isBingeWorthy) return { type: "extra", label: t("badge.bingeWorthy") }
  if (params.award) return { type: "extra", label: params.award }
  if (params.imdbTop250) return { type: "extra", label: t("badge.absoluteCinema") }
  if (params.nomination) return { type: "extra", label: params.nomination }
  if (params.subGenre) return { type: "extra", label: params.subGenre }
  if (params.isKDrama) return { type: "extra", label: "K-Drama" }
  if (params.director) return { type: "extra", label: params.director }
  if (params.studio) return { type: "extra", label: params.studio }
  if (params.extra) return { type: "extra", label: params.extra }
  return null
}

/**
 * Compute the Absolute Cinema badge from IMDb Top 250 membership.
 * Previously used voteAverage >= 8.3; now relies on IMDb Top 250.
 */
export function computeAbsoluteCinema(params: {
  mediaType: "movie" | "tv"
  imdbTop250: boolean
}, _t?: T): string | null {
  const t = _t || _idT
  if (params.mediaType === "movie" && params.imdbTop250) return t("badge.absoluteCinema")
  return null
}

function keyed(key: string): string {
  return `${BADGE_KEY_PREFIX}${key}`
}

export function getAllBadgeOptions(params: {
  upcomingRelease: string | null
  isNewMovie: boolean
  isNewSeries: boolean
  newSeason?: string | null
  animeRank: number | null
  trendRank: number | null
  award: string | null
  nomination: string | null
  studio: string | null
  director: string | null
  subGenre?: string | null
  isKDrama?: boolean
  imdbTop250?: boolean
  extra: string | null
  mediaType: "movie" | "tv"
  voteAverage: number
  tvType: string | null | undefined
  tvStatus: string | null | undefined
}): string[] {
  const options = new Set<string>()
  if (params.upcomingRelease) options.add(params.upcomingRelease)
  if (params.isNewMovie) options.add(keyed("badge.newMovie"))
  if (params.isNewSeries) options.add(keyed("badge.newSeries"))
  if (params.newSeason) options.add(keyed("badge.newSeason"))
  if (params.trendRank) options.add(keyed(params.mediaType === "movie" ? "badge.movie" : "badge.series"))
  if (params.animeRank) options.add(keyed("badge.anime"))
  if (params.award) options.add(params.award)
  if (params.mediaType === "movie" && params.imdbTop250) options.add(keyed("badge.absoluteCinema"))
  if (params.nomination) options.add(params.nomination)
  if (params.subGenre) options.add(params.subGenre)
  if (params.isKDrama) options.add("K-Drama")
  if (params.director) options.add(params.director)
  if (params.studio) options.add(params.studio)
  if (params.mediaType === "tv") {
    const tLower = (params.tvType || "").toLowerCase()
    const sLower = (params.tvStatus || "").toLowerCase()
    if (tLower === "miniseries" || tLower === "miniserie") options.add(keyed("badge.miniseries"))
    if (sLower === "returning series" || sLower === "in corso") options.add(keyed("badge.returning"))
    if (sLower === "ended" || sLower === "canceled" || sLower === "fine" || sLower === "concluso") options.add(keyed("badge.bingeWorthy"))
    options.add(keyed("badge.newEpisode"))
  }
  options.delete("")
  return [...options]
}
