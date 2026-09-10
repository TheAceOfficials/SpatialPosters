import { z } from "zod"
import { BADGE_STYLES, RANKING_BADGE_STYLES } from "./badge-styles"

export const mappingSchema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(["movie", "tv"]),
  title: z.string().min(1),
  posterPath: z.string().min(1),
  logoPath: z.string().nullable().optional(),
  originalPosterPath: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  logoScale: z.number().int().min(10).max(200).nullable().optional(),
  logoOffsetX: z.number().int().nullable().optional(),
  logoOffsetY: z.number().int().nullable().optional(),
  showBadges: z.boolean().nullable().optional(),
  rankingBadges: z.boolean().nullable().optional(),
  badgeGenre: z.boolean().nullable().optional(),
  badgeYear: z.boolean().nullable().optional(),
  badgeRating: z.boolean().nullable().optional(),
  genreName: z.string().nullable().optional(),
  voteAverage: z.number().min(0).max(10).nullable().optional(),
  trendRank: z.number().int().min(0).nullable().optional(),
  trendPeriod: z.string().nullable().optional(),
  tvType: z.string().nullable().optional(),
  tvStatus: z.string().nullable().optional(),
  // accentColor deve essere un colore hex valido (#rgb/#rrggbb) per non
  // far arrivare stringhe arbitrarie al rendering SVG dei badge. Allineata
  // a poster-render-helpers.isValidHex (#rgb / #rrggbb) — finding 6.
  accentColor: z.string().regex(/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/).nullable().optional(),
  badgeExtra: z.string().nullable().optional(),
  badgeRank: z.number().int().min(0).nullable().optional(),
  badgeLabel: z.string().nullable().optional(),
  // Rank anime salvato al momento del salvataggio: permette al poster salvato
  // di mostrare il badge Anime anche senza chiave MDBList/profilo lato server.
  animeRank: z.number().int().min(1).nullable().optional(),
  customBadge: z.string().max(40).nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  firstAirDate: z.string().nullable().optional(),
  backdropPath: z.string().nullable().optional(),
  // Stessi bound del ramo query della poster route (bscale): un valore 0 o
  // negativo arrivava a resizeBackdropCached (fit 'fill') → sharp lancia →
  // 500 + negative cache per un titolo permanentemente rotto (fix M5).
  backdropScale: z.number().int().min(5).max(500).nullable().optional(),
  backdropOffsetX: z.number().int().nullable().optional(),
  backdropOffsetY: z.number().int().nullable().optional(),
  blurEnabled: z.boolean().nullable().optional(),
  blurIntensity: z.number().nullable().optional(),
  blurFade: z.number().nullable().optional(),
  blurDarkness: z.number().nullable().optional(),
  gradientHeight: z.number().nullable().optional(),
  badgeStyle: z.enum(BADGE_STYLES).nullable().optional(),
  rankingBadgeStyle: z.enum(RANKING_BADGE_STYLES).nullable().optional(),
  cleanPosters: z.array(z.string()).nullable().optional(),
  cleanPosterIndex: z.number().int().min(0).nullable().optional(),
  cleanPosterUpdatedAt: z.string().nullable().optional(),
  autoRotateClean: z.boolean().nullable().optional(),
  excludedPosters: z.array(z.string()).nullable().optional(),
  logoDisabled: z.boolean().nullable().optional(),
  networkLogo: z.boolean().nullable().optional(),
  ribbonSide: z.enum(["left", "right"]).nullable().optional(),
  networkLogoPath: z.string().nullable().optional(),
  networkLogoName: z.string().nullable().optional(),
  defaultBadgeStyle: z.enum(BADGE_STYLES).nullable().optional(),
  defaultRankingBadgeStyle: z.enum(RANKING_BADGE_STYLES).nullable().optional(),
  episodeGroupId: z.string().max(80).nullable().optional(),
})

export type MappingInput = z.infer<typeof mappingSchema>

export const mappingUpdateSchema = mappingSchema.partial().omit({ tmdbId: true, mediaType: true })

export type MappingUpdate = z.infer<typeof mappingUpdateSchema>

// FlixPatrol catalog entry from scraper
export const flixpatrolEntrySchema = z.object({
  rank: z.number().int().positive(),
  title: z.string(),
  tmdb: z.object({
    id: z.number().int().positive(),
    media_type: z.string(),
    release_date: z.string().optional(),
  }).nullable(),
})

export type FlixPatrolEntry = z.infer<typeof flixpatrolEntrySchema>

// MDBList anime list item
export const mdblistAnimeSchema = z.object({
  tmdb: z.number().int().positive().nullable().optional(),
  id: z.number().int().positive().nullable().optional(),
  imdb: z.string().nullable().optional(),
  title: z.string().optional(),
})

export type MDBListAnimeItem = z.infer<typeof mdblistAnimeSchema>

// Enriched anime item returned by /api/mdblist/anime
export interface EnrichedAnimeItem {
  id: number
  title: string
  poster_path: string
  rank: number
  media_type: string
}

// TMDB search result (partial - what we use)
export const tmdbSearchResultSchema = z.object({
  id: z.number().int().positive(),
  media_type: z.enum(["movie", "tv"]),
  title: z.string().optional(),
  name: z.string().optional(),
  poster_path: z.string().nullable(),
  release_date: z.string().optional(),
  first_air_date: z.string().optional(),
  imdb_id: z.string().nullable().optional(),
})

export type TMDBSearchResult = z.infer<typeof tmdbSearchResultSchema>

// TMDB details (partial)
export const tmdbDetailsSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  name: z.string().optional(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })),
  vote_average: z.number(),
  type: z.string().optional(),
  status: z.string().optional(),
  release_date: z.string().nullable().optional(),
  first_air_date: z.string().nullable().optional(),
  networks: z.array(z.object({ id: z.number(), name: z.string(), logo_path: z.string().nullable(), origin_country: z.string() })).optional(),
  production_companies: z.array(z.object({ id: z.number(), name: z.string(), logo_path: z.string().nullable(), origin_country: z.string() })).optional(),
  original_language: z.string().optional(),
})
