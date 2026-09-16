import { buildPosterPublicUrl } from "@/lib/poster-public-url"
import { buildStremioPosterSearchParams } from "@/lib/stremio-poster-params"
import { isRankKey } from "@/lib/i18n"
import type { ServerDefaults } from "@/lib/server-defaults"
import type { Mapping } from "@/lib/types"

export type StremioPosterType = "movie" | "series"

export interface BuildStremioPosterUrlInput {
  readonly origin: string
  readonly type: StremioPosterType
  readonly id: number
  readonly defaults: ServerDefaults
  readonly mapping?: Mapping | null
  readonly apiKey?: string
  readonly mdblistKey?: string
  readonly animerank?: number
  readonly lang?: string | null
  readonly config?: string | null
  readonly user?: string | null
  readonly region?: string | null
}

export function mappingVersionParam(mapping: Mapping | null | undefined): string | null {
  if (!mapping?.updatedAt) return null
  const timestamp = Date.parse(mapping.updatedAt)
  return Number.isFinite(timestamp) ? String(timestamp) : null
}

export function buildStremioPosterUrl(input: BuildStremioPosterUrlInput): URL {
  const url = buildPosterPublicUrl(`/api/poster/${input.type}/${input.id}`, {
    origin: input.origin,
  })

  const mapping = input.mapping ?? null
  // Custom badge testuale salvato per-titolo: emesso come `extra` (il server
  // risolve le label prefissate __badge.* con la lingua della richiesta).
  // Le rank-key (__badge.today/anime/movie/series e label equivalenti) sono
  // ESCLUSE: la preview WYSIWYG le rende come badge rank via rank/label, e il
  // server le riproduce da solo (rank live + fallback mapping.badgeRank/
  // trendRank/animeRank). Emetterle come `extra` duplicherebbe il badge perché
  // queryExtra vince sul badge calcolato (poster-service).
  const customBadge = mapping?.customBadge && !isRankKey(mapping.customBadge)
    ? mapping.customBadge
    : undefined
  const params = buildStremioPosterSearchParams({
    config: input.config,
    apiKey: input.apiKey,
    mdblistKey: input.mdblistKey,
    animerank: input.animerank,
    user: input.user,
    region: input.region ?? input.defaults.region,
    lang: input.lang || "it",
    // Per-titolo vince sui default globali, con emissione ESPLICITA in query:
    // il fallback server (mapping quando il parametro manca) è fragile —
    // con installazioni ?config= il token scavalca il mapping (poster-config:
    // configOverride.globalBadges vince su mapping.showBadges). Il server
    // applica query > mapping > config > defaults, quindi l'esplicito è
    // sempre fedele al mapping senza alterare i titoli senza mapping.
    globalBadges: mapping?.showBadges ?? input.defaults.globalBadges,
    rankingBadges: mapping?.rankingBadges ?? input.defaults.rankingBadges,
    badgeGenre: input.mapping?.badgeGenre ?? input.defaults.badgeGenre,
    badgeYear: input.mapping?.badgeYear ?? input.defaults.badgeYear,
    badgeRating: input.mapping?.badgeRating ?? input.defaults.badgeRating,
    manualQuality: input.mapping?.manualQuality ?? input.defaults.manualQuality,
    ratingSources: input.defaults.ratingSources,
    badgeStyle: mapping?.badgeStyle ?? input.defaults.badgeStyle,
    rankingBadgeStyle: mapping?.rankingBadgeStyle ?? input.defaults.rankingBadgeStyle,
    gradientHeight: mapping?.gradientHeight ?? input.defaults.gradientHeight,
    blurIntensity: mapping?.blurIntensity ?? input.defaults.blurIntensity,
    blurFade: mapping?.blurFade ?? input.defaults.blurFade,
    blurDarkness: mapping?.blurDarkness ?? input.defaults.blurDarkness,
    blurEnabled: mapping?.blurEnabled ?? input.defaults.blurEnabled,
    customBadge,
    networkLogo: (input.defaults.networkLogo !== false) && (mapping?.networkLogo !== false),
    ribbonSide: mapping?.ribbonSide ?? input.defaults.ribbonSide,
  })

  params.forEach((value, key) => url.searchParams.set(key, value))
  const mappingVersion = mappingVersionParam(input.mapping)
  if (mappingVersion) url.searchParams.set("mv", mappingVersion)
  return url
}
