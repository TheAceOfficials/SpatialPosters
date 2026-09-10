"use client"

import { useCallback } from "react"
import type { SearchResult, TMDBImage, Mapping } from "./types"
import { titleOf } from "./utils"
import { computeTopBadge, type BadgeInput } from "./poster-badge"
import { defaultGradientHeightForPoster } from "./gradient-defaults"
import { logoDefaultScale } from "./logo-selection"
import { t } from "./i18n"
import type { EnrichedAnimeItem } from "./validation"
import { http } from "./http"

interface PosterSaveDeps {
  selected: SearchResult | null
  previewPoster: TMDBImage | null
  selectedLogo: TMDBImage | null
  setSelectedLogo: (logo: TMDBImage | null) => void
  setPreviewPoster: (poster: TMDBImage | null) => void
  setPreviewId: (id: string | null) => void
  posters: TMDBImage[]
  metaInfo: { genres: { id: number; name: string }[]; voteAverage: number; type?: string; status?: string; release_date?: string; first_air_date?: string; last_air_date?: string; number_of_seasons?: number; awards?: string[]; nominations?: string[]; studios?: string[]; director?: string | null; keywords?: string[]; imdb_id?: string | null; networksDetailed?: { name: string; logo_path: string | null; origin_country?: string }[]; productionCompaniesDetailed?: { name: string; logo_path: string | null; origin_country?: string }[] }
  /** IMDb Top 250 membership for the selected content. */
  imdbTop250?: boolean
  trendRank: number | null
  mdblistAnimeList: EnrichedAnimeItem[]
  mappingsMap: Map<string, Mapping>
  loadMappings: () => Promise<void>
  logoScale: number
  logoOffsetX: number
  logoOffsetY: number
  selectedBackdrop: TMDBImage | null
  setSelectedBackdrop: (d: TMDBImage | null) => void
  backdropScale: number
  backdropOffsetX: number
  backdropOffsetY: number
  setBackdropScale: (v: number) => void
  setBackdropOffsetX: (v: number) => void
  setBackdropOffsetY: (v: number) => void
  globalBadges: boolean
  rankingBadges: boolean
  badgeGenre: boolean
  badgeYear: boolean
  badgeRating: boolean
  badgeQuality: boolean
  customBadge: string | null
  badgeStyle: string
  rankingBadgeStyle: string
  defaultBadgeStyle: string
  defaultRankingBadgeStyle: string
  blurEnabled: boolean
  blurIntensity: number
  blurFade: number
  blurDarkness: number
  gradientHeight: number
  setGradientHeight: (v: number) => void
  rotationPosters: string[]
  autoRotateClean: boolean
  defaultAutoRotateClean: boolean
  excludedPosters: string[]
  accentColor: string | null
  logoDisabled: boolean
  setLogoDisabled: (v: boolean) => void
  setLogoScale: (v: number) => void
  setLogoOffsetX: (v: number) => void
  setLogoOffsetY: (v: number) => void
  networkLogo: boolean
  ribbonSide: "left" | "right"
  lang: string
  episodeGroupId?: string | null
}

export interface SaveConfigOverrides {
  excludedPosters?: string[]
  rotationPosters?: string[]
  previewPoster?: TMDBImage
  silent?: boolean
}

export function usePosterSave(deps: PosterSaveDeps) {
  const {
    selected, previewPoster, selectedLogo, setSelectedLogo, setPreviewPoster, setPreviewId,
    posters, metaInfo, imdbTop250, trendRank, mdblistAnimeList, mappingsMap, loadMappings,
    logoScale, logoOffsetX, logoOffsetY,
    selectedBackdrop, setSelectedBackdrop, backdropScale, backdropOffsetX, backdropOffsetY,
    setBackdropScale, setBackdropOffsetX, setBackdropOffsetY,
    globalBadges, rankingBadges, customBadge, badgeStyle, rankingBadgeStyle,
    badgeGenre, badgeYear, badgeRating, badgeQuality,
    defaultBadgeStyle, defaultRankingBadgeStyle,
    blurEnabled, blurIntensity, blurFade, blurDarkness, gradientHeight, setGradientHeight,
    rotationPosters, autoRotateClean, defaultAutoRotateClean, excludedPosters, accentColor, logoDisabled, setLogoDisabled,
    setLogoScale, setLogoOffsetX, setLogoOffsetY, networkLogo, ribbonSide, lang, episodeGroupId,
  } = deps

  const selectPoster = useCallback(async (image: TMDBImage) => {
    if (!selected) return
    setPreviewPoster(image)
    setGradientHeight(defaultGradientHeightForPoster(image))
    setPreviewId(`${selected.media_type}:${selected.id}`)
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps -- setter refs are stable

  const selectLogo = useCallback(async (logo: TMDBImage) => {
    setSelectedLogo(logo)
    setLogoDisabled(false)
    setLogoScale(logoDefaultScale(logo) ?? 75)
    setLogoOffsetX(0)
    setLogoOffsetY(0)
    if (!previewPoster && selected) {
      const existing = mappingsMap.get(`${selected.media_type}:${selected.id}`)
      if (existing) {
        setPreviewPoster({ file_path: existing.posterPath, iso_639_1: existing.language, vote_average: 0, width: 0, height: 0 })
      } else if (posters.length > 0) {
        setPreviewPoster(posters[0])
      }
    }
    if (selected) setPreviewId(`${selected.media_type}:${selected.id}`)
  }, [selected, previewPoster, mappingsMap, posters]) // eslint-disable-line react-hooks/exhaustive-deps -- setter refs are stable

  const removeLogo = useCallback(async () => {
    if (!selected) return
    const key = `${selected.media_type}:${selected.id}`
    const existing = mappingsMap.get(key)
    if (!existing) {
      import("sonner").then(({ toast }) => toast(t("ui.noMappingUpdate")))
      return
    }
    const logoPrecedente = selectedLogo
    try {
      await http(`/api/mappings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: selected.id, mediaType: selected.media_type, title: titleOf(selected),
          posterPath: previewPoster?.file_path || selected.poster_path!, logoPath: null,
          originalPosterPath: selected.poster_path, language: previewPoster?.iso_639_1 || null,
          logoScale, logoOffsetX, logoOffsetY,
          genreName: metaInfo.genres[0]?.name || null,
          voteAverage: metaInfo.voteAverage || null,
          trendRank: trendRank ?? null,
          logoDisabled: true,
        }),
      })
      setSelectedLogo(null)
      import("sonner").then(({ toast }) => toast(t("ui.logoRemoved")))
      loadMappings()
      if (selected) setPreviewId(`${selected.media_type}:${selected.id}`)
    } catch (e) {
      console.error("[pictorium] Remove logo failed:", e)
      // M17: rollback dello stato se il PUT non va a buon fine
      if (logoPrecedente) setSelectedLogo(logoPrecedente)
      import("sonner").then(({ toast }) => toast(t("ui.saveError")))
    }
  }, [selected, selectedLogo, previewPoster, logoScale, logoOffsetX, logoOffsetY, metaInfo, trendRank, mappingsMap, loadMappings]) // eslint-disable-line react-hooks/exhaustive-deps -- setter refs are stable

  const selectBackdrop = useCallback((img: TMDBImage) => {
    setSelectedBackdrop(img)
    setBackdropScale(100)
    setBackdropOffsetX(0)
    setBackdropOffsetY(0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- setter refs are stable

  const removeBackdrop = useCallback(() => {
    setSelectedBackdrop(null)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- setter refs are stable

  const saveConfig = useCallback(async (overrides: SaveConfigOverrides = {}) => {
    const posterToSave = overrides.previewPoster ?? previewPoster
    if (!selected || !posterToSave) return

    // Profilo stateless: il mapping per-titolo non può essere salvato (nessuno
    // storage server). La config di stile viaggia comunque nel link `?config=`.
    // Use shared badge computation — identical to server
    const animeRankData = mdblistAnimeList?.find((a) => a.id === selected.id)
    const badgeInput: BadgeInput = {
      mediaType: selected.media_type === "tv" ? "tv" : "movie",
      releaseDate: metaInfo.release_date ?? null,
      firstAirDate: metaInfo.first_air_date ?? null,
      lastAirDate: metaInfo.last_air_date ?? null,
      seasonCount: metaInfo.number_of_seasons ?? null,
      originCountries: [...(metaInfo.networksDetailed ?? []), ...(metaInfo.productionCompaniesDetailed ?? [])]
        .map((c) => c.origin_country)
        .filter((c): c is string => !!c),
      voteAverage: metaInfo.voteAverage,
      trendRank: trendRank ?? null,
      animeRank: animeRankData?.rank ?? null,
      awards: metaInfo.awards ?? [],
      nominations: metaInfo.nominations ?? [],
      studios: metaInfo.studios ?? [],
      director: metaInfo.director ?? null,
      tvType: selected.media_type === "tv" ? metaInfo.type : null,
      tvStatus: selected.media_type === "tv" ? metaInfo.status : null,
      imdbTop250: !!imdbTop250,
    }
    const computed = computeTopBadge(badgeInput, t, lang)
    const isUpcomingReleaseBadge = !!computed.upcomingRelease && computed.badge?.type === "extra" && computed.badge.label === computed.upcomingRelease
    // Come "In uscita", anche "Nuova stagione" è time-bound: non va congelato
    // nel mapping salvato (resterebbe per sempre), quindi è escluso da badgeExtra.
    const isNewSeasonBadge = !!computed.newSeason && computed.badge?.type === "extra" && computed.badge.label === computed.newSeason
    const badgeExtra = computed.badge?.type === "extra" && !isUpcomingReleaseBadge && !isNewSeasonBadge ? computed.badge.label : undefined
    const badgeRank = (!badgeExtra && rankingBadges) ? (computed.badge?.type === "rank" ? computed.badge.rank : trendRank || undefined) : undefined
    const badgeLabel = (!badgeExtra && animeRankData) ? t("badge.anime") : (!badgeExtra && computed.badge?.type === "rank") ? (computed.badge.rankLabel || t(selected.media_type === "tv" ? "badge.series" : "badge.movie")) : undefined
    const isClean = posterToSave.iso_639_1 === null
    const isNewMapping = !mappingsMap.has(`${selected.media_type}:${selected.id}`)
    const nextExcludedPosters = overrides.excludedPosters ?? excludedPosters
    const nextRotationPosters = overrides.rotationPosters ?? rotationPosters
    const excludedSet = new Set(nextExcludedPosters)
    const baseRotationPosters = nextRotationPosters.length > 0
      ? nextRotationPosters
      : defaultAutoRotateClean && isClean && isNewMapping
        ? posters.filter(p => p.iso_639_1 === null).map(p => p.file_path)
        : []
    const effectiveRotationPosters = baseRotationPosters.filter((path) => !excludedSet.has(path))
    // Risolvi network logo da salvare: SVG first → TMDB fallback, stesso ordine del poster-service
    let networkLogoPath: string | null = null
    let networkLogoName: string | null = null
    {
      const candidates: { name: string; logoPath: string | null }[] = [
        ...(metaInfo.networksDetailed ?? []),
        ...(metaInfo.productionCompaniesDetailed ?? []),
      ].map((c) => ({ name: c.name, logoPath: c.logo_path }))
      // Filtro anime già in getNetworkKey (ma per salvataggio teniamo semplice: prova SVG existence via heuristica locale minima)
      // Per non importare getNetworkKey qui, salva il primo con logo_path non null; il render farà comunque SVG-first.
      for (const cand of candidates) {
        if (cand.logoPath) { networkLogoPath = cand.logoPath; networkLogoName = cand.name; break }
      }
      if (!networkLogoPath && candidates.length) { networkLogoName = candidates[0].name }
    }
    const effectiveLogoPath = isClean && !logoDisabled ? (selectedLogo?.file_path || null) : null
    try {
      await http("/api/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: selected.id,
          mediaType: selected.media_type,
          title: titleOf(selected),
          posterPath: posterToSave.file_path,
          logoPath: effectiveLogoPath,
          originalPosterPath: selected.poster_path,
          language: posterToSave.iso_639_1,
          logoScale, logoOffsetX, logoOffsetY,
          backdropPath: selectedBackdrop?.file_path || null,
          backdropScale, backdropOffsetX, backdropOffsetY,
          genreName: metaInfo.genres[0]?.name || null,
          voteAverage: metaInfo.voteAverage || null,
          trendRank: trendRank ?? undefined,
          trendPeriod: "day",
          accentColor: accentColor !== '#ffffff' ? accentColor : undefined,
          showBadges: globalBadges,
          rankingBadges,
          badgeGenre: badgeGenre === false ? false : undefined,
          badgeYear: badgeYear === false ? false : undefined,
          badgeRating: badgeRating === false ? false : undefined,
          badgeQuality: badgeQuality === false ? false : undefined,
          tvType: metaInfo.type || null,
          tvStatus: metaInfo.status || null,
          releaseDate: metaInfo.release_date || null,
          firstAirDate: metaInfo.first_air_date || null,
          badgeExtra,
          badgeRank,
          badgeLabel,
          animeRank: animeRankData?.rank ?? null,
          customBadge,
          badgeStyle: badgeStyle !== defaultBadgeStyle ? badgeStyle : undefined,
          rankingBadgeStyle: rankingBadgeStyle !== defaultRankingBadgeStyle ? rankingBadgeStyle : undefined,
          defaultBadgeStyle,
          defaultRankingBadgeStyle,
          blurEnabled,
          blurIntensity,
          blurFade,
          blurDarkness,
          gradientHeight,
          cleanPosters: effectiveRotationPosters.length > 0 ? effectiveRotationPosters : undefined,
          cleanPosterIndex: 0,
          cleanPosterUpdatedAt: new Date().toISOString(),
          autoRotateClean: effectiveRotationPosters.length > 1 ? (defaultAutoRotateClean && isClean && isNewMapping ? true : autoRotateClean) : undefined,
          excludedPosters: nextExcludedPosters.length > 0 ? nextExcludedPosters : undefined,
          logoDisabled: logoDisabled || undefined,
          networkLogo: networkLogo !== undefined ? networkLogo : undefined,
          ribbonSide: ribbonSide !== undefined ? ribbonSide : undefined,
          networkLogoPath: networkLogoPath ?? null,
          networkLogoName: networkLogoName ?? null,
          episodeGroupId: episodeGroupId || undefined,
        }),
      })
      setPreviewId(`${selected.media_type}:${selected.id}`)
      if (!overrides.silent) import("sonner").then(({ toast }) => toast(t("ui.saveSuccess")))
      await loadMappings()
    } catch (error) {
      if (!overrides.silent) import("sonner").then(({ toast }) => toast(t("ui.saveError")))
      if (overrides.silent) throw error
    }
  }, [selected, previewPoster, selectedLogo, metaInfo, logoScale, logoOffsetX, logoOffsetY, trendRank, globalBadges, rankingBadges, badgeGenre, badgeYear, badgeRating, badgeQuality, mdblistAnimeList, loadMappings, customBadge, badgeStyle, rankingBadgeStyle, blurEnabled, blurIntensity, blurFade, blurDarkness, gradientHeight, rotationPosters, autoRotateClean, defaultAutoRotateClean, excludedPosters, defaultBadgeStyle, defaultRankingBadgeStyle, posters, mappingsMap, accentColor, backdropOffsetX, backdropOffsetY, backdropScale, selectedBackdrop, networkLogo, ribbonSide, episodeGroupId]) // eslint-disable-line react-hooks/exhaustive-deps -- intentionally complete to save all poster state

  return { selectPoster, selectLogo, removeLogo, selectBackdrop, removeBackdrop, saveConfig }
}
