import { describe, it, expect } from "vitest"
import { computeBadge, computeAbsoluteCinema, getAllBadgeOptions } from "@/lib/badge-priority"
import { computeTopBadge, getNewSeasonLabel, isKDramaOrigin } from "@/lib/poster-badge"
import { getUpcomingReleaseLabel } from "@/lib/release-badge"
import { mappingSchema } from "@/lib/validation"
import { createT } from "@/lib/i18n"

const t = createT("it")

describe("computeBadge", () => {
  const base = {
    mediaType: "movie" as const,
    upcomingRelease: null,
    isNewMovie: false, isNewSeries: false,
    animeRank: null, trendRank: null,
    award: null, nomination: null,
    studio: null, director: null, extra: null,
  }

  it("prioritizes upcoming release over new movie", () => {
    const badge = computeBadge({
      ...base,
      upcomingRelease: "In uscita 18.12.26",
      isNewMovie: true,
    }, t)
    expect(badge).toEqual({ type: "extra", label: "In uscita 18.12.26" })
  })

  it("prioritizes upcoming release over trend", () => {
    const badge = computeBadge({
      ...base,
      upcomingRelease: "In uscita 18.12.26",
      trendRank: 1,
    })
    expect(badge).toEqual({ type: "extra", label: "In uscita 18.12.26" })
  })

  it("prioritizes new movie over everything else", () => {
    expect(computeBadge({ ...base, isNewMovie: true, award: "Vincitore Oscar" }, t)?.label).toBe("Nuovo film")
  })

  it("prioritizes new series over award", () => {
    expect(computeBadge({ ...base, isNewSeries: true, award: "Vincitore Oscar" }, t)?.label).toBe("Nuova serie")
  })

  it("prioritizes anime rank over trend rank", () => {
    expect(computeBadge({ ...base, animeRank: 5, trendRank: 10 }, t)?.type).toBe("rank")
    expect(computeBadge({ ...base, animeRank: 5, trendRank: 10 }, t)?.rank).toBe(5)
    expect(computeBadge({ ...base, animeRank: 5, trendRank: 10 }, t)?.label).toBe("Anime")
  })

  it("prioritizes trend rank over award", () => {
    expect(computeBadge({ ...base, trendRank: 3, award: "Vincitore Oscar" }, t)?.type).toBe("rank")
    expect(computeBadge({ ...base, trendRank: 3 }, t)?.rank).toBe(3)
    // Label del rank per media type: "Film" per i film, "Serie" per le serie
    expect(computeBadge({ ...base, trendRank: 3 }, t)?.label).toBe("Film")
    expect(computeBadge({ ...base, mediaType: "tv", trendRank: 3 }, t)?.label).toBe("Serie")
  })

  it("prioritizes nomination over subgenre", () => {
    expect(computeBadge({ ...base, nomination: "Candidato Oscar", subGenre: "Viaggi nel Tempo" }, t)?.label).toBe("Candidato Oscar")
  })

  it("prioritizes subgenre over director", () => {
    expect(computeBadge({ ...base, subGenre: "Viaggi nel Tempo", director: "Di Christopher Nolan" }, t)?.label).toBe("Viaggi nel Tempo")
  })

  it("prioritizes imdbTop250 before generic extra", () => {
    expect(computeBadge({ ...base, imdbTop250: true, extra: "Da divorare" }, t)?.label).toBe("Absolute Cinema")
  })

  it("award beats imdbTop250 in priority (original hierarchy)", () => {
    expect(computeBadge({ ...base, imdbTop250: true, award: "Vincitore Oscar" }, t)?.label).toBe("Vincitore Oscar")
  })

  it("imdbTop250 beats nomination in priority", () => {
    expect(computeBadge({ ...base, imdbTop250: true, nomination: "Candidato Oscar" }, t)?.label).toBe("Absolute Cinema")
  })

  it("does not show imdbTop250 for TV", () => {
    // The imdbTop250 flag works for both media types, but IMDb chart is movie-only
    const badge = computeBadge({ ...base, imdbTop250: true }, t)
    expect(badge?.label).toBe("Absolute Cinema")
  })

  it("falls back to extra when nothing else matches", () => {
    expect(computeBadge({ ...base, extra: "Da divorare" }, t)?.label).toBe("Da divorare")
  })

  it("returns null when nothing matches", () => {
    expect(computeBadge({ ...base }, t)).toBeNull()
  })

  it("returns key when no t function provided", () => {
    expect(computeBadge({ ...base, isNewMovie: true })?.label).toBe("badge.newMovie")
  })

  it("prioritizes new season over award (dopo nuova serie)", () => {
    expect(computeBadge({ ...base, newSeason: "Nuova stagione", award: "Vincitore Oscar" }, t)?.label).toBe("Nuova stagione")
  })

  it("prioritizes new series over new season", () => {
    expect(computeBadge({ ...base, isNewSeries: true, newSeason: "Nuova stagione" }, t)?.label).toBe("Nuova serie")
  })

  it("prioritizes new anime over new series and new season", () => {
    expect(computeBadge({ ...base, isNewAnime: true, isNewSeries: false, newSeason: "Nuova stagione" }, t)?.label).toBe("Nuovo anime")
  })

  it("prioritizes subgenre over kdrama, kdrama over director and studio", () => {
    expect(computeBadge({ ...base, subGenre: "Giallo", isKDrama: true }, t)?.label).toBe("Giallo")
    expect(computeBadge({ ...base, isKDrama: true, director: "Di Christopher Nolan" }, t)?.label).toBe("K-Drama")
    expect(computeBadge({ ...base, isKDrama: true, studio: "A24" }, t)?.label).toBe("K-Drama")
  })

  it("computes Binge-Worthy badge for ended TV shows", () => {
    expect(computeBadge({ ...base, mediaType: "tv", isBingeWorthy: true }, t)?.label).toBe("Binge-Worthy")
  })

  it("computes New Episode badge for series with recent episode", () => {
    expect(computeBadge({ ...base, mediaType: "tv", isNewEpisode: true }, t)?.label).toBe("Nuovo episodio")
  })
})

describe("computeAbsoluteCinema (replaces old computeExtraFallback)", () => {
  it("returns Absolute Cinema for movies in IMDb Top 250", () => {
    expect(computeAbsoluteCinema({ mediaType: "movie", imdbTop250: true }, t)).toBe("Absolute Cinema")
  })

  it("returns null for movies NOT in IMDb Top 250", () => {
    expect(computeAbsoluteCinema({ mediaType: "movie", imdbTop250: false }, t)).toBeNull()
  })

  it("returns null for TV even if imdbTop250 is true (chart is movie-only)", () => {
    expect(computeAbsoluteCinema({ mediaType: "tv", imdbTop250: true }, t)).toBeNull()
  })

  it("returns key when no t function provided", () => {
    expect(computeAbsoluteCinema({ mediaType: "movie", imdbTop250: true })).toBe("badge.absoluteCinema")
  })
})

describe("mappingSchema", () => {
  it("validates a correct mapping", () => {
    const result = mappingSchema.safeParse({
      tmdbId: 12345,
      mediaType: "movie",
      title: "Test Movie",
      posterPath: "/abc.jpg",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing required fields", () => {
    const result = mappingSchema.safeParse({ tmdbId: 12345 })
    expect(result.success).toBe(false)
  })

  it("rejects invalid mediaType", () => {
    const result = mappingSchema.safeParse({
      tmdbId: 12345,
      mediaType: "invalid",
      title: "Test",
      posterPath: "/abc.jpg",
    })
    expect(result.success).toBe(false)
  })

  it("accepts optional fields", () => {
    const result = mappingSchema.safeParse({
      tmdbId: 12345,
      mediaType: "tv",
      title: "Test Series",
      posterPath: "/def.jpg",
      genreName: "Drama",
      voteAverage: 8.5,
      trendRank: 3,
      logoPath: "/logo.png",
      logoScale: 75,
      badgeExtra: "Vincitore Emmy",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.genreName).toBe("Drama")
      expect(result.data.voteAverage).toBe(8.5)
      expect(result.data.trendRank).toBe(3)
    }
  })
})

describe("getUpcomingReleaseLabel", () => {
  it("returns formatted date for future movie", () => {
    expect(getUpcomingReleaseLabel({
      mediaType: "movie",
      releaseDate: "2099-12-18",
      locale: "it",
    })).toBe("In uscita 18.12.99")
  })

  it("returns null for past release date", () => {
    expect(getUpcomingReleaseLabel({
      mediaType: "movie",
      releaseDate: "2020-01-01",
      locale: "it",
    })).toBeNull()
  })

  it("returns label for TV shows with future firstAirDate", () => {
    expect(getUpcomingReleaseLabel({
      mediaType: "tv",
      releaseDate: "2099-12-18",
      firstAirDate: "2099-12-18",
      locale: "it",
    })).toBe("In uscita 18.12.99")
  })

  it("returns null when no date provided", () => {
    expect(getUpcomingReleaseLabel({
      mediaType: "movie",
      locale: "it",
    })).toBeNull()
  })
})

describe("getNewSeasonLabel", () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const inDays = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  it("returns clean label for recent last air + old first air", () => {
    expect(getNewSeasonLabel({ lastAirDate: daysAgo(3), firstAirDate: daysAgo(400), seasonCount: 2, t })).toBe("Nuova stagione")
  })

  it("returns generic label without season count", () => {
    expect(getNewSeasonLabel({ lastAirDate: daysAgo(3), firstAirDate: daysAgo(400), seasonCount: null, t })).toBe("Nuova stagione")
  })

  it("returns null for ended shows", () => {
    expect(getNewSeasonLabel({ lastAirDate: daysAgo(3), firstAirDate: daysAgo(400), seasonCount: 2, tvStatus: "Ended", t })).toBeNull()
  })

  it("returns null for old last air date", () => {
    expect(getNewSeasonLabel({ lastAirDate: daysAgo(60), firstAirDate: daysAgo(400), seasonCount: 3, t })).toBeNull()
  })

  it("returns null for new series (è Nuova serie, non nuova stagione)", () => {
    expect(getNewSeasonLabel({ lastAirDate: daysAgo(3), firstAirDate: daysAgo(3), seasonCount: 1, t })).toBeNull()
  })

  it("returns null for future last air date", () => {
    expect(getNewSeasonLabel({ lastAirDate: inDays(5), firstAirDate: daysAgo(400), seasonCount: 2, t })).toBeNull()
  })

  it("returns null without last air date", () => {
    expect(getNewSeasonLabel({ lastAirDate: null, firstAirDate: daysAgo(400), seasonCount: 2, t })).toBeNull()
  })
})

describe("isKDramaOrigin", () => {
  it("matches KR case-insensitively", () => {
    expect(isKDramaOrigin(["KR"])).toBe(true)
    expect(isKDramaOrigin(["kr"])).toBe(true)
    expect(isKDramaOrigin(["US", "KR"])).toBe(true)
  })

  it("rejects non-KR origins", () => {
    expect(isKDramaOrigin(["US"])).toBe(false)
    expect(isKDramaOrigin([])).toBe(false)
    expect(isKDramaOrigin(null)).toBe(false)
    expect(isKDramaOrigin(undefined)).toBe(false)
  })
})

describe("computeTopBadge (nuovi badge)", () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const inDays = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const baseInput = {
    mediaType: "tv" as const,
    releaseDate: null,
    firstAirDate: daysAgo(400),
    lastAirDate: null as string | null,
    seasonCount: null as number | null,
    originCountries: [] as string[],
    voteAverage: 8,
    trendRank: null,
    animeRank: null,
    awards: [] as string[],
    nominations: [] as string[],
    studios: [] as string[],
    director: null,
    tvType: null,
    tvStatus: "Returning Series",
    keywords: [] as string[],
    imdbTop250: false,
  }

  it("computes Nuova stagione for returning series with recent last air", () => {
    const c = computeTopBadge({ ...baseInput, lastAirDate: daysAgo(3), seasonCount: 3 }, t, "it")
    expect(c.newSeason).toBe("Nuova stagione")
    expect(c.badge).toEqual({ type: "extra", label: "Nuova stagione" })
  })

  it("computes Binge-Worthy for ended series even with recent last air date", () => {
    const c = computeTopBadge({ ...baseInput, tvStatus: "Ended", lastAirDate: daysAgo(3), seasonCount: 3 }, t, "it")
    expect(c.newSeason).toBeNull()
    expect(c.badge).toEqual({ type: "extra", label: "Binge-Worthy" })
  })

  it("computes Nuovo anime for Season 1 anime premiere", () => {
    const c = computeTopBadge({
      ...baseInput,
      firstAirDate: daysAgo(3),
      lastAirDate: daysAgo(3),
      animeRank: 10,
      keywords: ["anime"],
    }, t, "it")
    expect(c.isNewAnime).toBe(true)
    expect(c.badge).toEqual({ type: "rank", label: "Anime", rank: 10 })
  })

  it("computes K-Drama for KR origin without stronger badges", () => {
    const c = computeTopBadge({ ...baseInput, originCountries: ["KR"] }, t, "it")
    expect(c.badge).toEqual({ type: "extra", label: "K-Drama" })
  })

  it("computes upcoming release for tv with future first air", () => {
    const c = computeTopBadge({ ...baseInput, firstAirDate: inDays(30) }, t, "it")
    expect(c.upcomingRelease).toMatch(/^In uscita /)
    expect(c.badge?.label).toBe(c.upcomingRelease)
  })

  it("upcoming release wins over new season", () => {
    const c = computeTopBadge({ ...baseInput, firstAirDate: inDays(30), lastAirDate: daysAgo(3), seasonCount: 2 }, t, "it")
    expect(c.badge?.label).toBe(c.upcomingRelease)
  })
})

describe("getAllBadgeOptions (nuovi badge)", () => {
  it("includes newSeason key and K-Drama literal", () => {
    const options = getAllBadgeOptions({
      upcomingRelease: null, isNewMovie: false, isNewSeries: false,
      newSeason: "Nuova stagione", animeRank: null, trendRank: null,
      award: null, nomination: null, studio: null, director: null,
      subGenre: null, isKDrama: true, imdbTop250: false, extra: null,
      mediaType: "tv", voteAverage: 8, tvType: null, tvStatus: null,
    })
    expect(options).toContain("__badge.newSeason")
    expect(options).toContain("K-Drama")
  })
})
