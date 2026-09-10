import type { BadgeStyle, RankingBadgeStyle } from "./badge-styles"

export interface SearchResult {
  id: number
  media_type: "movie" | "tv"
  title?: string
  name?: string
  poster_path: string | null
  release_date?: string
  first_air_date?: string
  vote_average?: number
  imdb_id?: string | null
}

export function toSearchResult(partial: { id?: number | null; media_type?: string; title?: string | null; name?: string | null; poster_path?: string | null; release_date?: string; first_air_date?: string; vote_average?: number; imdb_id?: string | null }): SearchResult {
  return {
    id: partial.id ?? 0,
    media_type: partial.media_type === "tv" ? "tv" : "movie",
    title: partial.title ?? undefined,
    name: partial.name ?? undefined,
    poster_path: partial.poster_path ?? null,
    release_date: partial.release_date,
    first_air_date: partial.first_air_date,
    vote_average: partial.vote_average,
    imdb_id: partial.imdb_id,
  }
}

export interface TMDBImage {
  file_path: string
  iso_639_1: string | null
  vote_average: number
  width: number
  height: number
}

export interface FlixPatrolItem {
  rank: number
  title: string
  days: number
  tmdbId: number | null
  mediaType: "movie" | "tv"
  posterPath: string | null
}

export interface FlixPatrolChart {
  platform: string
  platformName: string
  movies: FlixPatrolItem[]
  tv: FlixPatrolItem[]
}

export interface Mapping {
  tmdbId: number
  mediaType: "movie" | "tv"
  title: string
  posterPath: string
  logoPath: string | null
  originalPosterPath: string | null
  language: string | null
  updatedAt: string
  logoScale?: number | null
  logoOffsetX?: number | null
  logoOffsetY?: number | null
  backdropPath?: string | null
  backdropScale?: number | null
  backdropOffsetX?: number | null
  backdropOffsetY?: number | null
  showBadges?: boolean | null
  genreName?: string | null
  voteAverage?: number | null
  trendRank?: number | null
  trendPeriod?: string | null
  accentColor?: string | null
  tvType?: string | null
  tvStatus?: string | null
  badgeExtra?: string | null
  badgeRank?: number | null
  badgeLabel?: string | null
  animeRank?: number | null
  customBadge?: string | null
  releaseDate?: string | null
  firstAirDate?: string | null
  rankingBadges?: boolean | null
  badgeGenre?: boolean | null
  badgeYear?: boolean | null
  badgeRating?: boolean | null
  badgeQuality?: boolean | null
  badgeStyle?: BadgeStyle | null
  rankingBadgeStyle?: RankingBadgeStyle | null
  blurEnabled?: boolean | null
  blurIntensity?: number | null
  blurFade?: number | null
  blurDarkness?: number | null
  gradientHeight?: number | null
  cleanPosters?: string[] | null
  cleanPosterIndex?: number | null
  cleanPosterUpdatedAt?: string | null
  autoRotateClean?: boolean | null
  networkLogo?: boolean | null
  ribbonSide?: "left" | "right" | null
  /** Logo	path TMDB del network/produttore (es. /8AcaW...png) — usato come fallback quando non c'è SVG locale. */
  networkLogoPath?: string | null
  networkLogoName?: string | null
  excludedPosters?: string[] | null
  defaultBadgeStyle?: BadgeStyle | null
  defaultRankingBadgeStyle?: RankingBadgeStyle | null
  logoDisabled?: boolean | null
  bestFitScore?: number | null
  bestFitReasons?: string[] | null
  episodeGroupId?: string | null
}

export type CustomCatalogType = "movie" | "series" | "mixed"

export interface CustomCatalogConfig {
  id: string
  name: string
  type: CustomCatalogType
  url: string
  enabled?: boolean
}
