// ---------------------------------------------------------------------------
// Parsing della configurazione di resa (badge/blur/gradiente/logo) della route
// poster da query string + mapping + config token + server defaults.
// Estratto dalla route `/api/poster/[type]/[id]` per renderlo testabile in
// isolamento. Semantica identica all'originale — nessuna logica di rendering.
// ---------------------------------------------------------------------------

import type { PictoriumUserConfig } from "./config-token"
import type { Mapping } from "./types"
import type { ServerDefaults } from "./server-defaults"
import { resolveLabelFor } from "./i18n"
import { SUPPORTED_RATING_SOURCES, DEFAULT_RATING_SOURCES } from "./ratings"
import {
  isBadgeStyle,
  isRankingBadgeStyle,
  DEFAULT_BADGE_STYLE,
  DEFAULT_RANKING_BADGE_STYLE,
  type BadgeStyle,
  type RankingBadgeStyle,
} from "./badge-styles"

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

export interface PosterRenderConfigInput {
  searchParams: URLSearchParams
  mapping: Mapping | null
  configOverride: PictoriumUserConfig | null
  sd: ServerDefaults
  /** true se la richiesta fornisce poster/mapping espliciti (query o mapping salvato) */
  hasQuery: boolean
  showBadges: boolean
  rankingBadges: boolean
  /** segnali di classifica per l'auto-detect default→netflix */
  animeRank: number | null
  rankingResult: number | null
  finalRank: number | null
  /** lingua per la risoluzione delle label prefissate (__badge.*) — fix L32 */
  lang?: string
}

export interface PosterRenderConfig {
  badgeStyle: BadgeStyle
  rankingBadgeStyle: RankingBadgeStyle
  blurEnabled: boolean
  blurHeight: number
  blurIntensity: number
  blurFade: number
  blurDarkness: number
  badgesEnabled: boolean
  rankingEnabled: boolean
  /** Quali componenti del badge genere/rating mostrare (default tutti ON). */
  badgeGenre: boolean
  badgeYear: boolean
  badgeRating: boolean
  badgeQuality: boolean
  ratingSources: string[]
  logoScale: number | null
  logoOffsetX: number | null
  logoOffsetY: number | null
  queryExtra: string | null
  qNetLogo: string | null
  networkLogo: boolean
  ribbonSide: "left" | "right"
}

export function resolvePosterRenderConfig(input: PosterRenderConfigInput): PosterRenderConfig {
  const { searchParams: q, mapping, configOverride, sd, hasQuery, showBadges, rankingBadges } = input

  // Ranking style — precedenza: query `rs` > mapping salvato > config token > server defaults > default.
  // (Coerente con `badgeStyle` sotto: la query vince sul mapping — M6 WYSIWYG.
  // Il sentinel "default" del mapping è trattato come "nessun override", identico
  // a come "shadow" lo è per badgeStyle.)
  const rawRs =
    q.get("rs") ||
    (mapping?.rankingBadgeStyle && mapping.rankingBadgeStyle !== "default" ? mapping.rankingBadgeStyle : undefined) ||
    configOverride?.rankingBadgeStyle ||
    sd.rankingBadgeStyle
  let rankingBadgeStyle: RankingBadgeStyle = isRankingBadgeStyle(rawRs) ? rawRs : DEFAULT_RANKING_BADGE_STYLE

  const qRankParam = q.get("rank")
  const hasRank = !!(input.animeRank || input.rankingResult || mapping?.badgeRank || mapping?.trendRank || qRankParam || input.finalRank)
  // "default" = auto-detect: mostra il badge stile Netflix se c'è un rank,
  // altrimenti badge standard. Se il sorgente (mapping/query/config) specifica
  // un valore esplicito (bar/pill/colored/netflix), viene rispettato senza override.
  if (hasRank && rankingBadgeStyle === "default") {
    rankingBadgeStyle = "netflix"
  } else if (!hasRank && rankingBadgeStyle === "netflix") {
    rankingBadgeStyle = "default"
  }

  // Fix M3: includere i campi blur salvati nel mapping nella catena di fallback
  // (query > mapping > configOverride > default), come già fatto per badgeGenre/badgeStyle.
  // Prima il mapping salvato con blur custom non veniva mai applicato.
  const blurEnabled = q.get("be") !== null
    ? q.get("be") !== "0"
    : (mapping?.blurEnabled != null ? mapping.blurEnabled : (configOverride !== null ? configOverride.blurEnabled : true))
  // Clamp espliciti: impediscono a valori estremi (query o config) di arrivare a
  // sharp.blur con sigma enormi o gradienti fuori scala (potenziale DoS CPU).
  const rawGradHeight = q.get("gradHeight") ? Number(q.get("gradHeight")) : NaN
  const blurHeight = Number.isFinite(rawGradHeight)
    ? clamp(rawGradHeight, 5, 100)
    : (mapping?.gradientHeight != null && Number.isFinite(mapping.gradientHeight)
        ? clamp(mapping.gradientHeight, 5, 100)
        : (configOverride !== null ? clamp(configOverride.gradientHeight, 5, 100) : 30))
  const rawBlur = q.get("blur") ? Number(q.get("blur")) : NaN
  const blurIntensity = Number.isFinite(rawBlur)
    ? clamp(rawBlur, 1, 100)
    : (mapping?.blurIntensity != null && Number.isFinite(mapping.blurIntensity)
        ? clamp(mapping.blurIntensity, 1, 100)
        : (configOverride !== null ? clamp(configOverride.blurIntensity, 1, 100) : 5))
  const rawBf = q.get("bf") ? Number(q.get("bf")) : NaN
  const blurFade = Number.isFinite(rawBf)
    ? clamp(rawBf, 0, 100)
    : (mapping?.blurFade != null && Number.isFinite(mapping.blurFade)
        ? clamp(mapping.blurFade, 0, 100)
        : (configOverride !== null ? clamp(configOverride.blurFade, 0, 100) : 60))
  const rawBd = q.get("bd") ? Number(q.get("bd")) : NaN
  const blurDarkness = Number.isFinite(rawBd)
    ? clamp(rawBd, 0, 100)
    : (mapping?.blurDarkness != null && Number.isFinite(mapping.blurDarkness)
        ? clamp(mapping.blurDarkness, 0, 100)
        : (configOverride !== null ? clamp(configOverride.blurDarkness, 0, 100) : 40))

  const qBadges = q.get("badges")
  const qRanking = q.get("ranking")
  const badgesEnabled = hasQuery ? (qBadges !== null ? qBadges !== "0" : (configOverride !== null ? configOverride.globalBadges : showBadges)) : true
  const rankingEnabled = hasQuery ? (qRanking !== null ? qRanking !== "0" : (configOverride !== null ? configOverride.rankingBadges : rankingBadges)) : true

  // Componenti badge genere/rating — precedenza: query `bg/by/br` > mapping salvato
  // > config token/profilo > server defaults > true (tutti ON di default).
  const qBg = q.get("bg")
  const qBy = q.get("by")
  const qBr = q.get("br")
  const qBq = q.get("bq")
  const badgeGenre = qBg !== null ? qBg !== "0" : (mapping?.badgeGenre ?? configOverride?.badgeGenre ?? sd.badgeGenre ?? true)
  const badgeYear = qBy !== null ? qBy !== "0" : (mapping?.badgeYear ?? configOverride?.badgeYear ?? sd.badgeYear ?? true)
  const badgeRating = qBr !== null ? qBr !== "0" : (mapping?.badgeRating ?? configOverride?.badgeRating ?? sd.badgeRating ?? true)
  const badgeQuality = qBq !== null ? qBq !== "0" : (mapping?.badgeQuality ?? configOverride?.badgeQuality ?? sd.badgeQuality ?? true)

  const qRsrc = q.get("rsrc")
  const validSources = SUPPORTED_RATING_SOURCES as readonly string[]
  const ratingSources: string[] = qRsrc !== null
    ? qRsrc.split(",").map((s) => s.trim().toLowerCase()).filter((s) => validSources.includes(s))
    : (configOverride?.ratingSources ?? [...DEFAULT_RATING_SOURCES])

  // Badge style — confinamento della query string al union type: valori non validi
  // cadono sul default (il renderer in passato li trattava come "shadow" nel ramo else).
  const rawBs = q.get("bs")
    || (mapping?.badgeStyle && mapping.badgeStyle !== "shadow" ? mapping.badgeStyle : undefined)
    || configOverride?.badgeStyle
    || sd.badgeStyle
  const badgeStyle: BadgeStyle = isBadgeStyle(rawBs) ? rawBs : DEFAULT_BADGE_STYLE

  const qScale = q.get("scale")
  const qOx = q.get("ox")
  const qOy = q.get("oy")
  const logoScale = qScale ? Number(qScale) || null : mapping?.logoScale ?? null
  const logoOffsetX = qOx ? Number(qOx) || null : mapping?.logoOffsetX ?? null
  const logoOffsetY = qOy ? Number(qOy) || null : mapping?.logoOffsetY ?? null

  // Fix L32: le label prefissate (__badge.*) vengono risolte con la lingua
  // della richiesta — prima un customBadge "__badge.anime" dal config token
  // arrivava letterale al renderer (la preview invece la risolveva → desync).
  const rawExtra = q.get("extra") || configOverride?.customBadge || null
  const queryExtra = rawExtra ? resolveLabelFor(rawExtra, input.lang || "it") : null
  const rawNetLogo = q.get("netLogo")
  const networkLogo: boolean = rawNetLogo !== null
    ? rawNetLogo !== "0"
    : (mapping?.networkLogo ?? (configOverride !== null ? configOverride.networkLogo : undefined) ?? sd.networkLogo ?? true)
  const qNetLogo = networkLogo ? (rawNetLogo ?? (configOverride !== null ? (configOverride.networkLogo ? "1" : null) : null)) : "0"
  // Modalità layout nastro Netflix + logo network: query `side=right` (Stremio) o `side=left` (Nuvio), mapping salvato o config/profilo
  const qSide = q.get("side")
  const ribbonSide: "left" | "right" = qSide === "right"
    ? "right"
    : qSide === "left"
      ? "left"
      : (mapping?.ribbonSide === "right" || configOverride?.ribbonSide === "right" ? "right" : "left")

  return {
    badgeStyle,
    rankingBadgeStyle,
    blurEnabled,
    blurHeight,
    blurIntensity,
    blurFade,
    blurDarkness,
    badgesEnabled,
    rankingEnabled,
    badgeGenre,
    badgeYear,
    badgeRating,
    badgeQuality,
    ratingSources,
    logoScale,
    logoOffsetX,
    logoOffsetY,
    queryExtra,
    qNetLogo,
    networkLogo,
    ribbonSide,
  }
}

