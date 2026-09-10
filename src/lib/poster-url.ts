import { getDomain } from "./utils"
import { resolveLabel, isRankKey, t as tFn } from "./i18n"
import { getPosterPublicBaseUrl } from "./poster-public-url"
import { buildStremioPosterSearchParams } from "./stremio-poster-params"
import { RENDER_VERSION } from "./render-version"
import { TOP_LIGHT_LUMINANCE } from "./constants"
import type { SearchResult, TMDBImage } from "./types"
import type { EnrichedAnimeItem } from "./validation"
import type { BadgeStyle, RankingBadgeStyle } from "./badge-styles"

interface BadgeParams {
  globalBadges: boolean
  rankingBadges: boolean
  badgeStyle: BadgeStyle
  rankingBadgeStyle: RankingBadgeStyle
  /** Componenti del badge genere/rating: `false` emette `bg/by/br=0`. */
  badgeGenre?: boolean
  badgeYear?: boolean
  badgeRating?: boolean
  badgeQuality?: boolean
  ratingSources?: string[]
  customBadge: string | null
  gradientHeight: number
  blurIntensity: number
  blurFade: number
  blurDarkness: number
  blurEnabled: boolean
  networkLogo?: boolean
  ribbonSide?: "left" | "right"
}

interface PosterState {
  selected: SearchResult | null
  previewPoster: TMDBImage | null
  selectedLogo: TMDBImage | null
  selectedBackdrop: TMDBImage | null
  logoScale: number
  logoOffsetX: number
  logoOffsetY: number
  backdropScale: number
  backdropOffsetX: number
  backdropOffsetY: number
  metaInfo: {
    genres: { id: number; name: string }[]
    voteAverage: number
    release_date?: string
    first_air_date?: string
    awards?: string[]
    nominations?: string[]
    studios?: string[]
    franchise?: string | null
    director?: string | null
    keywords?: string[]
    type?: string
    status?: string
    imdb_id?: string | null
  }
  trendRank: number | null
  mdblistAnimeList: EnrichedAnimeItem[]
  topEdgeColor: string | null
  accentColor?: string | null
  lang: string
  region?: string
  tmdbKey: string
}

export function buildUrlPattern(bp: BadgeParams & { tmdbKey: string; lang: string; mdblistApiKey?: string }): string {
  let url = `${getPosterPublicBaseUrl()}/api/poster/{type}/{imdb_id}`
  const params = buildStremioPosterSearchParams({
    apiKey: bp.tmdbKey,
    mdblistKey: bp.mdblistApiKey,
    lang: bp.lang,
    globalBadges: bp.globalBadges,
    rankingBadges: bp.rankingBadges,
    badgeGenre: bp.badgeGenre,
    badgeYear: bp.badgeYear,
    badgeRating: bp.badgeRating,
    badgeQuality: bp.badgeQuality,
    ratingSources: bp.ratingSources,
    badgeStyle: bp.badgeStyle,
    rankingBadgeStyle: bp.rankingBadgeStyle,
    gradientHeight: bp.gradientHeight,
    blurIntensity: bp.blurIntensity,
    blurFade: bp.blurFade,
    blurDarkness: bp.blurDarkness,
    blurEnabled: bp.blurEnabled,
    networkLogo: bp.networkLogo,
    ribbonSide: bp.ribbonSide,
  })
  const str = params.toString()
  if (str) url += "?" + str
  return url
}

export function buildPreviewUrl(ps: PosterState, bp: BadgeParams): string {
  if (!ps.selected) return ""
  const params: string[] = [`rv=${RENDER_VERSION}`]
  if (ps.tmdbKey) params.push(`api_key=${encodeURIComponent(ps.tmdbKey)}`)
  params.push(`badges=${bp.globalBadges ? "1" : "0"}`)
  params.push(`ranking=${bp.rankingBadges ? "1" : "0"}`)
  params.push(`bg=${bp.badgeGenre !== false ? "1" : "0"}`)
  params.push(`by=${bp.badgeYear !== false ? "1" : "0"}`)
  params.push(`br=${bp.badgeRating !== false ? "1" : "0"}`)
  params.push(`bq=${bp.badgeQuality !== false ? "1" : "0"}`)
  if (bp.ratingSources && bp.ratingSources.length > 0) params.push(`rsrc=${encodeURIComponent(bp.ratingSources.join(","))}`)
  if (ps.previewPoster) {
    params.push(`poster=${encodeURIComponent(ps.previewPoster.file_path)}`)
    const genre = ps.metaInfo.genres[0]?.name
    if (genre) params.push(`genreName=${encodeURIComponent(genre)}`)
    if (ps.metaInfo.voteAverage > 0) params.push(`voteAverage=${ps.metaInfo.voteAverage}`)
    // Fix M1: l'anno della preview — senza, il server non imposta
    // releaseDate/firstAirDate nel ramo query e il badge genere della preview
    // omette "• 2024" che compare invece sul poster finale.
    const year = ps.metaInfo.release_date?.slice(0, 4) || ps.metaInfo.first_air_date?.slice(0, 4) || ps.selected?.release_date?.slice(0, 4) || ps.selected?.first_air_date?.slice(0, 4)
    if (year) params.push(`year=${year}`)
    const imdbId = ps.metaInfo.imdb_id || ps.selected.imdb_id
    if (imdbId) params.push(`imdbId=${encodeURIComponent(imdbId)}`)
  }
  if (ps.selectedLogo && ps.previewPoster?.iso_639_1 === null) {
    params.push(`logo=${encodeURIComponent(ps.selectedLogo.file_path)}`)
    params.push(`scale=${ps.logoScale}`)
    params.push(`ox=${ps.logoOffsetX}`)
    params.push(`oy=${ps.logoOffsetY}`)
  }
  if (ps.selectedBackdrop) {
    params.push(`backdrop=${encodeURIComponent(ps.selectedBackdrop.file_path)}`)
    params.push(`bscale=${ps.backdropScale}`)
    params.push(`box=${ps.backdropOffsetX}`)
    params.push(`boy=${ps.backdropOffsetY}`)
  }
  if (ps.lang) params.push(`lang=${ps.lang}`)
  if (ps.region) params.push(`region=${encodeURIComponent(ps.region)}`)
  params.push(`gradHeight=${bp.gradientHeight}`)
  params.push(`blur=${bp.blurIntensity}`)
  params.push(`bf=${bp.blurFade}`)
  params.push(`bd=${bp.blurDarkness}`)
  params.push(`bs=${bp.badgeStyle}`)
  params.push(`rs=${bp.rankingBadgeStyle}`)
  if (!bp.blurEnabled) params.push("be=0")
  params.push(`netLogo=${bp.networkLogo !== false ? "1" : "0"}`)
  // Fix M2: side viene emesso SEMPRE (left|right) — prima soltanto "right";
  // senza il parametro il server risolve dal mapping/config salvati (di
  // default right in modalità Stremio) e la preview rendeva a destra anche
  // quando l'editor mostra lo stato sinistra.
  if (bp.ribbonSide) params.push(`side=${bp.ribbonSide}`)
  if (ps.accentColor) params.push(`ac=${encodeURIComponent(ps.accentColor)}`)
  // Fix M16: tl è inviato SOLO a calcolo completato: con topEdgeColor null
  // (colore non ancora campionato) la preview forzava tl=1 (testo chiaro)
  // anche quando il server avrebbe calcolato scuro — ora il server decide.
  const topLight = computeTopLight(ps.topEdgeColor)
  if (topLight !== null) params.push(`tl=${topLight ? "1" : "0"}`)
  if (bp.rankingBadges) {
    const badgeParams = computeBadgeParams(ps, bp)
    params.push(...badgeParams)
    // WYSIWYG: il client conosce già il rank anime dal suo mdblistAnimeList;
    // senza questo parametro la preview non può calcolarlo (la URL non porta
    // chiavi/profilo) e il badge Anime non comparirebbe nella preview.
    const selected = ps.selected
    const animeRank = selected
      ? (ps.mdblistAnimeList.find((a) => a.id === selected.id)?.rank ?? null)
      : null
    if (animeRank) params.push(`animerank=${animeRank}`)
  } else if (bp.customBadge) {
    const badgeParams = computeBadgeParams(ps, bp)
    params.push(...badgeParams)
  }
  params.push("preview=1")
  const qs = "?" + params.join("&")
  return `${getDomain()}/api/poster/${ps.selected.media_type}/${ps.selected.id}${qs}`
}

/**
 * Top-light della preview. Ritorna `null` quando il colore non è ancora stato
 * campionato (topEdgeColor null): in quel caso il parametro tl viene OMESSO e
 * decide il server (calcolo sull'immagine reale). Formula Rec.709 sugli stessi
 * coefficienti del server (image-utils.luma) e soglia condivisa
 * TOP_LIGHT_LUMINANCE (fix M16): prima i byte sRGB venivano confrontati con
 * una soglia hardcoded e il null diventava true (testo chiaro forzato).
 */
function computeTopLight(hexColor: string | null): boolean | null {
  if (!hexColor || hexColor.length < 7) return null
  const r = parseInt(hexColor.slice(1, 3), 16) / 255
  const g = parseInt(hexColor.slice(3, 5), 16) / 255
  const b = parseInt(hexColor.slice(5, 7), 16) / 255
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > TOP_LIGHT_LUMINANCE
}

function computeBadgeParams(ps: PosterState, bp: BadgeParams): string[] {
  const params: string[] = []
  if (bp.customBadge) {
    const selected = ps.selected
    const animeRank = selected && ps.mdblistAnimeList.length > 0
      ? (ps.mdblistAnimeList.find((a) => a.id === selected.id)?.rank ?? null) : null
    const rankKey = isRankKey(bp.customBadge)
    const rankLabelKey = ps.selected?.media_type === "tv" ? "badge.series" : "badge.movie"
    if ((rankKey === "badge.today" || rankKey === "badge.movie" || rankKey === "badge.series") && ps.trendRank) params.push(`rank=${ps.trendRank}&label=${encodeURIComponent(tFn(rankLabelKey))}`)
    else if (rankKey === "badge.anime" && animeRank) params.push(`rank=${animeRank}&label=${encodeURIComponent(tFn("badge.anime"))}`)
    else params.push(`extra=${encodeURIComponent(resolveLabel(bp.customBadge))}`)
  }
  // For auto badges, let the server compute from its own TMDB data
  return params
}
