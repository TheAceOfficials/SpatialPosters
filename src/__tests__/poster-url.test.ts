import { afterEach, describe, it, expect } from "vitest"
import { buildPreviewUrl, buildUrlPattern } from "@/lib/poster-url"
import { POSTER_URL_VERSION } from "@/lib/render-version"

const baseBadgeParams = {
  globalBadges: true,
  rankingBadges: true,
  badgeStyle: "shadow" as const,
  rankingBadgeStyle: "default" as const,
  customBadge: null,
  gradientHeight: 30,
  blurIntensity: 5,
  blurFade: 60,
  blurDarkness: 40,
  blurEnabled: true,
}

const basePosterState = {
  selected: { id: 123, media_type: "movie" as const, title: "Test Movie", poster_path: "/poster.jpg" },
  previewPoster: { file_path: "/poster.jpg", iso_639_1: "it", vote_average: 7.5, width: 500, height: 750 },
  selectedLogo: null,
  selectedBackdrop: null,
  logoScale: 75,
  logoOffsetX: 0,
  logoOffsetY: 0,
  backdropScale: 100,
  backdropOffsetX: 0,
  backdropOffsetY: 0,
  metaInfo: {
    genres: [{ id: 1, name: "Azione" }],
    voteAverage: 7.5,
  },
  trendRank: null,
  mdblistAnimeList: [],
  topEdgeColor: null,
  lang: "it",
  tmdbKey: "test-key",
}

describe("buildUrlPattern", () => {
  const previousPosterCdnUrl = process.env.NEXT_PUBLIC_POSTER_CDN_URL

  afterEach(() => {
    process.env.NEXT_PUBLIC_POSTER_CDN_URL = previousPosterCdnUrl
  })

  it("contains domain and route pattern", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, tmdbKey: "key", lang: "it" })
    expect(url).toContain("/api/poster/{type}/{imdb_id}")
  })

  it("uses poster CDN base URL when configured", () => {
    process.env.NEXT_PUBLIC_POSTER_CDN_URL = "https://cdn.pictorium.example/"

    const url = buildUrlPattern({ ...baseBadgeParams, tmdbKey: "key", lang: "it" })

    expect(url).toContain("https://cdn.pictorium.example/api/poster/{type}/{imdb_id}")
  })

  it("includes api_key param", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, tmdbKey: "abc123", lang: "it" })
    expect(url).toContain("api_key=abc123")
  })

  it("includes mdblist_key param when configured (no profile)", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, tmdbKey: "k", lang: "it", mdblistApiKey: "mdblist-key" })
    expect(url).toContain("mdblist_key=mdblist-key")
  })

  it("omits mdblist_key when no key is configured", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, tmdbKey: "k", lang: "it" })
    expect(url).not.toContain("mdblist_key")
  })

  it("includes badges=0 when globalBadges is false", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, globalBadges: false, tmdbKey: "k", lang: "it" })
    expect(url).toContain("badges=0")
  })

  it("includes ranking=0 when rankingBadges is false", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, rankingBadges: false, tmdbKey: "k", lang: "it" })
    expect(url).toContain("ranking=0")
  })

  it("includes be=0 when blurEnabled is false", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, blurEnabled: false, tmdbKey: "k", lang: "it" })
    expect(url).toContain("be=0")
  })

  it("does not include badges=0 when globalBadges is true", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, globalBadges: true, tmdbKey: "k", lang: "it" })
    expect(url).not.toContain("badges=0")
  })

  it("always includes the shared poster URL version", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, tmdbKey: "k", lang: "it" })
    expect(url).toContain(`rv=${POSTER_URL_VERSION}`)
  })

  it("includes gradientHeight, blur, bf, bd, bs, rs params", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, tmdbKey: "k", lang: "it", gradientHeight: 50, blurIntensity: 8, blurFade: 70, blurDarkness: 50, badgeStyle: "pill", rankingBadgeStyle: "bar" })
    expect(url).toContain("gradHeight=50")
    expect(url).toContain("blur=8")
    expect(url).toContain("bf=70")
    expect(url).toContain("bd=50")
    expect(url).toContain("bs=pill")
    expect(url).toContain("rs=bar")
  })

  it("encodes lang param", () => {
    const url = buildUrlPattern({ ...baseBadgeParams, tmdbKey: "k", lang: "it" })
    expect(url).toContain("lang=it")
  })
})

describe("buildPreviewUrl", () => {
  it("returns empty string when no item selected", () => {
    const url = buildPreviewUrl({ ...basePosterState, selected: null }, baseBadgeParams)
    expect(url).toBe("")
  })

  it("contains movie type and id in URL path", () => {
    const url = buildPreviewUrl(basePosterState, baseBadgeParams)
    expect(url).toContain("/api/poster/movie/123")
  })

  it("contains tv type for tv items", () => {
    const url = buildPreviewUrl({ ...basePosterState, selected: { ...basePosterState.selected!, media_type: "tv" } }, baseBadgeParams)
    expect(url).toContain("/api/poster/tv/123")
  })

  it("includes api_key", () => {
    const url = buildPreviewUrl(basePosterState, baseBadgeParams)
    expect(url).toContain("api_key=test-key")
  })

  it("includes poster param from previewPoster", () => {
    const url = buildPreviewUrl(basePosterState, baseBadgeParams)
    expect(url).toContain("poster=%2Fposter.jpg")
  })

  it("includes genreName from metaInfo", () => {
    const url = buildPreviewUrl(basePosterState, baseBadgeParams)
    expect(url).toContain("genreName=Azione")
  })

  it("includes voteAverage when > 0", () => {
    const url = buildPreviewUrl(basePosterState, baseBadgeParams)
    expect(url).toContain("voteAverage=7.5")
  })

  it("does not include voteAverage when 0", () => {
    const url = buildPreviewUrl({ ...basePosterState, metaInfo: { ...basePosterState.metaInfo, voteAverage: 0 } }, baseBadgeParams)
    expect(url).not.toContain("voteAverage=")
  })

  it("includes logo params when logo selected on clean poster", () => {
    const url = buildPreviewUrl({
      ...basePosterState,
      previewPoster: { file_path: "/poster.jpg", iso_639_1: null, vote_average: 7.5, width: 500, height: 750 },
      selectedLogo: { file_path: "/logo.png", iso_639_1: "it", vote_average: 1, width: 200, height: 80 },
      logoScale: 60,
      logoOffsetX: 5,
      logoOffsetY: -3,
    }, baseBadgeParams)
    expect(url).toContain("logo=%2Flogo.png")
    expect(url).toContain("scale=60")
    expect(url).toContain("ox=5")
    expect(url).toContain("oy=-3")
  })

  it("does not include logo params when poster is not clean", () => {
    const url = buildPreviewUrl({
      ...basePosterState,
      selectedLogo: { file_path: "/logo.png", iso_639_1: "it", vote_average: 1, width: 200, height: 80 },
      logoScale: 60,
      logoOffsetX: 5,
      logoOffsetY: -3,
    }, baseBadgeParams)
    expect(url).not.toContain("logo=")
  })

  it("includes backdrop params when backdrop selected", () => {
    const url = buildPreviewUrl({
      ...basePosterState,
      selectedBackdrop: { file_path: "/backdrop.jpg", iso_639_1: null, vote_average: 0, width: 1920, height: 1080 },
      backdropScale: 120,
      backdropOffsetX: 10,
      backdropOffsetY: 20,
    }, baseBadgeParams)
    expect(url).toContain("backdrop=%2Fbackdrop.jpg")
    expect(url).toContain("bscale=120")
    expect(url).toContain("box=10")
    expect(url).toContain("boy=20")
  })

  it("includes lang param", () => {
    const url = buildPreviewUrl(basePosterState, baseBadgeParams)
    expect(url).toContain("lang=it")
  })

  it("includes side=right when ribbonSide is right (Stremio mode)", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, ribbonSide: "right" })
    expect(url).toContain("side=right")
  })

  it("includes side=left when ribbonSide is left (fix M2: desync preview)", () => {
    // Prima la preview emetteva side SOLO per right: il server risolveva dal
    // mapping/config salvati (default right in Stremio mode) e la preview
    // rendeva a destra anche con l'editor su sinistra.
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, ribbonSide: "left" })
    expect(url).toContain("side=left")
  })

  it("includes netLogo=0 when networkLogo is false", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, networkLogo: false })
    expect(url).toContain("netLogo=0")
  })

  it("includes netLogo=1 when networkLogo is true", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, networkLogo: true })
    expect(url).toContain("netLogo=1")
  })

  it("includes gradHeight, blur, bf, bd, bs, rs", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, gradientHeight: 50, blurIntensity: 8, blurFade: 70, blurDarkness: 50, badgeStyle: "pill", rankingBadgeStyle: "bar" })
    expect(url).toContain("gradHeight=50")
    expect(url).toContain("blur=8")
    expect(url).toContain("bf=70")
    expect(url).toContain("bd=50")
    expect(url).toContain("bs=pill")
    expect(url).toContain("rs=bar")
  })

  it("includes be=0 when blurEnabled is false", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, blurEnabled: false })
    expect(url).toContain("be=0")
  })

  it("does not include be=0 when blurEnabled is true", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, blurEnabled: true })
    expect(url).not.toContain("be=0")
  })

  it("omits tl param when topEdgeColor is not computed (server decides, fix M16)", () => {
    // Prima il null forzava tl=1 (testo chiaro) anche quando il server
    // avrebbe calcolato scuro: ora senza colore campionato il parametro è
    // omesso e la decisione spetta al render server.
    const url = buildPreviewUrl({ ...basePosterState, topEdgeColor: null }, { ...baseBadgeParams, rankingBadges: false })
    expect(url).not.toContain("tl=")
  })

  it("includes tl=1 for a light top edge and tl=0 for a dark one", () => {
    const lightUrl = buildPreviewUrl({ ...basePosterState, topEdgeColor: "#f0f0f0" }, { ...baseBadgeParams, rankingBadges: false })
    expect(lightUrl).toContain("tl=1")
    const darkUrl = buildPreviewUrl({ ...basePosterState, topEdgeColor: "#101010" }, { ...baseBadgeParams, rankingBadges: false })
    expect(darkUrl).toContain("tl=0")
  })

  it("includes year param from metaInfo release_date (fix M1)", () => {
    const url = buildPreviewUrl({
      ...basePosterState,
      metaInfo: { ...basePosterState.metaInfo, release_date: "2024-05-17" },
    }, baseBadgeParams)
    expect(url).toContain("year=2024")
  })

  it("uses first_air_date for tv items when release_date is absent (fix M1)", () => {
    const url = buildPreviewUrl({
      ...basePosterState,
      selected: { ...basePosterState.selected!, media_type: "tv" },
      metaInfo: { ...basePosterState.metaInfo, first_air_date: "2017-12-01" },
    }, baseBadgeParams)
    expect(url).toContain("year=2017")
  })

  it("includes ac param when accentColor is set", () => {
    const url = buildPreviewUrl({ ...basePosterState, accentColor: "#ff0000" }, baseBadgeParams)
    expect(url).toContain("ac=%23ff0000")
  })

  it("does not include ac param when accentColor is default", () => {
    const url = buildPreviewUrl({ ...basePosterState, accentColor: null }, baseBadgeParams)
    expect(url).not.toContain("ac=")
  })

  it("includes badges=1 when globalBadges is true", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, globalBadges: true })
    expect(url).toContain("badges=1")
  })

  it("includes badges=0 when globalBadges is false", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, globalBadges: false })
    expect(url).toContain("badges=0")
  })

  it("includes ranking=1 when rankingBadges is true", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, rankingBadges: true })
    expect(url).toContain("ranking=1")
  })

  it("includes ranking=0 when rankingBadges is false", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, rankingBadges: false })
    expect(url).toContain("ranking=0")
  })

  it("includes bg=1/bg=0, by=1/by=0, br=1/br=0, mq for sub-badges", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, badgeGenre: false, badgeYear: true, badgeRating: false, manualQuality: "4K" })
    expect(url).toContain("bg=0")
    expect(url).toContain("by=1")
    expect(url).toContain("br=0")
    expect(url).toContain("mq=4K")
  })

  it("includes rv= render version param", () => {
    const url = buildPreviewUrl(basePosterState, baseBadgeParams)
    // RENDER_VERSION è auto-generato come hash esadecimale (scripts/write-render-version.mjs).
    expect(url).toMatch(/rv=[0-9a-f]+/)
  })

  it("includes customBadge as extra param", () => {
    const url = buildPreviewUrl(basePosterState, { ...baseBadgeParams, customBadge: "Custom Label" })
    expect(url).toContain("extra=Custom%20Label")
  })

  it("includes rsrc param in buildPreviewUrl and buildUrlPattern when ratingSources is set", () => {
    const previewUrl = buildPreviewUrl(basePosterState, {
      ...baseBadgeParams,
      ratingSources: ["imdb", "tomatoes"],
    })
    expect(previewUrl).toContain("rsrc=imdb%2Ctomatoes")

    const patternUrl = buildUrlPattern({
      ...baseBadgeParams,
      tmdbKey: "k",
      lang: "it",
      ratingSources: ["tomatoes", "metacritic"],
    })
    expect(patternUrl).toContain("rsrc=tomatoes%2Cmetacritic")
  })
})
