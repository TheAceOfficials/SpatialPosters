import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/catalog/[type]/[id]/route"
import { GET as GET_EXTRA } from "@/app/catalog/[type]/[id]/[...extra]/route"
import { cacheClear } from "@/lib/cache"
import { POSTER_URL_VERSION } from "@/lib/render-version"
import { getTop10 } from "@/lib/flixpatrol"
import { getById } from "@/lib/store"
import { __resetJWRankingsCache } from "@/lib/justwatch"
import { encodeConfig } from "@/lib/config-token"
vi.mock("@/lib/flixpatrol", () => ({
  getTop10: vi.fn(),
}))

vi.mock("@/lib/store", () => ({
  getById: vi.fn(),
}))

vi.mock("@/lib/server-defaults", () => ({
  getServerDefaults: vi.fn(() => ({})),
}))

const mockedGetTop10 = vi.mocked(getTop10)
const mockedGetById = vi.mocked(getById)

function justWatchResponse(tmdbId: number, imdbId?: string): Response {
  return Response.json({
    data: {
      streamingCharts: {
        edges: [
          {
            streamingChartInfo: { rank: 1 },
            node: {
              content: {
                externalIds: { tmdbId, imdbId: imdbId ?? null },
              },
            },
          },
        ],
      },
    },
  })
}

function tmdbShowResponse(tmdbId: number): Response {
  return Response.json({
    id: tmdbId,
    name: "House of the Dragon",
    poster_path: "/house-of-the-dragon.jpg",
    first_air_date: "2022-08-21",
  })
}

describe("GET /catalog/[type]/[id]", () => {
  beforeEach(() => {
    mockedGetById.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    mockedGetTop10.mockReset()
    mockedGetById.mockReset()
    __resetJWRankingsCache()
    cacheClear()
  })

  it("builds Pictorium series poster URLs for JustWatch series catalogs", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(94997, "tt11198330"))
      .mockResolvedValueOnce(tmdbShowResponse(94997))

    const req = new NextRequest("http://localhost:3000/catalog/series/pictorium-jw-series.json?api_key=settings-key")
    const res = await GET(req, { params: Promise.resolve({ type: "series", id: "pictorium-jw-series.json" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas[0]).toMatchObject({
      id: "tmdb:94997",
      type: "series",
      name: "House of the Dragon",
      poster: expect.stringContaining("/api/poster/series/94997"),
    })
    expect(body.metas[0].poster).toContain(`rv=${POSTER_URL_VERSION}`)
  })

  it("serves legacy posterium-* catalog IDs as aliases of pictorium-*", async () => {
    // Addon Stremio installati prima del rename chiedono ancora gli ID legacy:
    // devono rispondere come i canonici, senza duplicare la logica.
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(94997, "tt11198330"))
      .mockResolvedValueOnce(tmdbShowResponse(94997))

    const req = new NextRequest("http://localhost:3000/catalog/series/posterium-jw-series.json?api_key=settings-key")
    const res = await GET(req, { params: Promise.resolve({ type: "series", id: "posterium-jw-series.json" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas[0]).toMatchObject({
      id: "tmdb:94997",
      type: "series",
      name: "House of the Dragon",
      poster: expect.stringContaining("/api/poster/series/94997"),
    })
  })

  it("embeds the explicit mdblist_key in poster URLs of non-anime series catalogs", async () => {
    // Un titolo anime può comparire nei cataloghi jw/platform: senza mdblist_key
    // nell'URL poster il rank anime non sarebbe risolvibile su Stremio (il fetch
    // MDBList keyless fallisce 503). Come nel catalogo anime, la chiave esplicita
    // della richiesta va nell'URL poster.
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(94997, "tt11198330"))
      .mockResolvedValueOnce(tmdbShowResponse(94997))

    const req = new NextRequest("http://localhost:3000/catalog/series/pictorium-jw-series.json?api_key=settings-key&mdblist_key=mdblist-key")
    const res = await GET(req, { params: Promise.resolve({ type: "series", id: "pictorium-jw-series.json" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas[0].poster).toContain("mdblist_key=mdblist-key")
  })

  it("adds mapping version to catalog poster URLs for saved titles", async () => {
    mockedGetById.mockResolvedValueOnce({
      tmdbId: 94997,
      mediaType: "tv",
      title: "House of the Dragon",
      posterPath: "/saved.jpg",
      logoPath: "/logo.png",
      originalPosterPath: null,
      language: null,
      updatedAt: "2026-07-16T10:15:30.000Z",
    })
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(94997, "tt11198330"))
      .mockResolvedValueOnce(tmdbShowResponse(94997))

    const req = new NextRequest("http://localhost:3000/catalog/series/pictorium-jw-series.json?api_key=settings-key")
    const res = await GET(req, { params: Promise.resolve({ type: "series", id: "pictorium-jw-series.json" }) })
    const body = await res.json()
    const posterUrl = new URL(body.metas[0].poster)

    expect(res.status).toBe(200)
    expect(posterUrl.searchParams.get("mv")).toBe(String(Date.parse("2026-07-16T10:15:30.000Z")))
  })

  it("applies custom styles from config token to catalog poster URLs", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(94997, "tt11198330"))
      .mockResolvedValueOnce(tmdbShowResponse(94997))

    const token = encodeConfig({
      globalBadges: true,
      rankingBadges: true,
      badgeStyle: "pill",
      rankingBadgeStyle: "bar",
      blurEnabled: true,
      blurIntensity: 12,
      blurFade: 45,
      blurDarkness: 55,
      gradientHeight: 50,
      networkLogo: true,
      autoRotateClean: false,
      ribbonSide: "right",
    })

    const req = new NextRequest(`http://localhost:3000/catalog/series/pictorium-jw-series.json?api_key=settings-key&config=${token}`)
    const res = await GET(req, { params: Promise.resolve({ type: "series", id: "pictorium-jw-series.json" }) })
    const body = await res.json()
    const posterUrl = new URL(body.metas[0].poster)

    expect(res.status).toBe(200)
    expect(posterUrl.searchParams.get("bs")).toBe("pill")
    expect(posterUrl.searchParams.get("rs")).toBe("bar")
    expect(posterUrl.searchParams.get("blur")).toBe("12")
    expect(posterUrl.searchParams.get("bf")).toBe("45")
    expect(posterUrl.searchParams.get("bd")).toBe("55")
    expect(posterUrl.searchParams.get("gradHeight")).toBe("50")
    expect(posterUrl.searchParams.get("side")).toBe("right")
    expect(posterUrl.searchParams.get("config")).toBe(token)
  })

  it("normalizes tv catalog routes to Pictorium series poster URLs", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(94997, "tt11198330"))
      .mockResolvedValueOnce(tmdbShowResponse(94997))

    const req = new NextRequest("http://localhost:3000/catalog/tv/pictorium-jw-series.json?api_key=settings-key")
    const res = await GET(req, { params: Promise.resolve({ type: "tv", id: "pictorium-jw-series.json" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas[0]).toMatchObject({
      type: "series",
      name: "House of the Dragon",
      poster: expect.stringContaining("/api/poster/series/94997"),
    })
    expect(body.metas[0].poster).toContain(`rv=${POSTER_URL_VERSION}`)
  })

  it("builds Pictorium poster URLs for platform catalogs even when source posterPath is missing", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ id: 1715492, imdb_id: "tt1715492" }))
      .mockResolvedValueOnce(Response.json({ id: 1715492, title: "Costa Concordia: incubo in mare", release_date: "2026-01-01" }))
    mockedGetTop10.mockResolvedValueOnce({
      platform: "netflix",
      platformName: "Netflix",
      country: "italy",
      movies: [
        {
          rank: 1,
          title: "Costa Concordia: incubo in mare",
          tmdbId: 1715492,
          mediaType: "movie",
          posterPath: null,
          releaseDate: "2026-01-01",
        },
      ],
      tv: [],
    })

    const req = new NextRequest("http://localhost:3000/catalog/movie/pictorium-netflix-movies.json?api_key=settings-key")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "pictorium-netflix-movies.json" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mockedGetTop10).toHaveBeenCalledWith("netflix", "united-states", "settings-key", { enrich: false })
    expect(body.metas[0]).toMatchObject({
      id: "tmdb:1715492",
      type: "movie",
      name: "Costa Concordia: incubo in mare",
      poster: expect.stringContaining("/api/poster/movie/1715492"),
    })
    expect(body.metas[0].poster).toContain(`rv=${POSTER_URL_VERSION}`)
  })

  it("falls back to TMDB external_ids when JustWatch lacks an IMDb id", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(687163))
      .mockResolvedValueOnce(tmdbShowResponse(687163))
      .mockResolvedValueOnce(Response.json({ id: 687163, imdb_id: "tt12042730" }))

    const req = new NextRequest("http://localhost:3000/catalog/movie/pictorium-jw-movies.json?api_key=settings-key")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "pictorium-jw-movies.json" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas).toHaveLength(1)
    expect(body.metas[0]).toMatchObject({
      id: "tmdb:687163",
      type: "movie",
      name: "House of the Dragon",
      poster: expect.stringContaining("/api/poster/movie/687163"),
    })
  })

  it("uses the IMDb id already returned by JustWatch (no extra TMDB call)", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(8282, "tt0848228"))
      .mockResolvedValueOnce(tmdbShowResponse(8282))

    const req = new NextRequest("http://localhost:3000/catalog/movie/pictorium-jw-movies.json?api_key=settings-key")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "pictorium-jw-movies.json" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas).toHaveLength(1)
    expect(body.metas[0]).toMatchObject({
      id: "tmdb:8282",
      type: "movie",
      name: "House of the Dragon",
      poster: expect.stringContaining("/api/poster/movie/8282"),
    })
  })

  it("exposes a tmdb:<id> provider id when no IMDb id is resolvable (AIOMetadata compat)", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(67890))
      .mockResolvedValueOnce(tmdbShowResponse(67890))
      .mockResolvedValueOnce(Response.json({ id: 67890, imdb_id: null }))

    const req = new NextRequest("http://localhost:3000/catalog/movie/pictorium-jw-movies.json?api_key=settings-key")
    const res = await GET(req, { params: Promise.resolve({ type: "movie", id: "pictorium-jw-movies.json" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas).toHaveLength(1)
    expect(body.metas[0]).toMatchObject({
      id: "tmdb:67890",
      type: "movie",
      name: "House of the Dragon",
      poster: expect.stringContaining("/api/poster/movie/67890"),
    })
  })

  it("handles Stremio search query in movie search catalog", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({
        page: 1,
        results: [
          { id: 550, title: "Fight Club", release_date: "1999-10-15" },
        ],
        total_pages: 1,
        total_results: 1,
      }))
      .mockResolvedValueOnce(Response.json({ id: 550, imdb_id: "tt0137523" }))

    const req = new NextRequest("http://localhost:3000/catalog/movie/pictorium-search-movies/search=fight%20club.json?api_key=settings-key")
    const res = await GET_EXTRA(req, {
      params: Promise.resolve({
        type: "movie",
        id: "pictorium-search-movies",
        extra: ["search=fight%20club.json"],
      }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas).toHaveLength(1)
    expect(body.metas[0]).toMatchObject({
      id: "tmdb:550",
      type: "movie",
      name: "Fight Club",
      releaseInfo: "1999",
      poster: expect.stringContaining("/api/poster/movie/550"),
    })
  })

  it("returns empty metas when dedicated search catalog is called without a search query", async () => {
    const req = new NextRequest("http://localhost:3000/catalog/movie/pictorium-search-movies.json?api_key=settings-key")
    const res = await GET(req, {
      params: Promise.resolve({
        type: "movie",
        id: "pictorium-search-movies.json",
      }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas).toEqual([])
  })

  it("handles pictorium-anime-movies and builds movie poster URLs even without an explicit MDBList key", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({
        items: [
          { imdb: "tt32820897", title: "Demon Slayer: Kimetsu no Yaiba Infinity Castle", year: 2025, tmdb: 1311031 },
        ],
      }))
      .mockResolvedValueOnce(Response.json({
        id: 1311031,
        title: "Demon Slayer: Il castello dell'Infinito",
        release_date: "2025-07-01",
      }))

    const req = new NextRequest("http://localhost:3000/catalog/movie/pictorium-anime-movies.json?api_key=settings-key")
    const res = await GET(req, {
      params: Promise.resolve({
        type: "movie",
        id: "pictorium-anime-movies.json",
      }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas).toHaveLength(1)
    expect(body.metas[0]).toMatchObject({
      id: "tmdb:1311031",
      type: "movie",
      name: "Demon Slayer: Il castello dell'Infinito",
      releaseInfo: "2025",
      poster: expect.stringContaining("/api/poster/movie/1311031"),
    })
  })

  it("uses JustWatch with platform packages for Netflix movie catalog and deduplicates items", async () => {
    // JustWatch edge con duplicate tmdbId (simula risposte grezze con stagioni o duplicati)
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({
        data: {
          streamingCharts: {
            edges: [
              {
                streamingChartInfo: { rank: 1 },
                node: { content: { externalIds: { tmdbId: 866398, imdbId: "tt15314262" } } },
              },
              {
                streamingChartInfo: { rank: 2 },
                node: { content: { externalIds: { tmdbId: 866398, imdbId: "tt15314262" } } },
              },
              {
                streamingChartInfo: { rank: 3 },
                node: { content: { externalIds: { tmdbId: 1588838, imdbId: "tt31234567" } } },
              },
            ],
          },
        },
      }))
      .mockResolvedValueOnce(Response.json({ id: 866398, title: "The Beekeeper", release_date: "2024-01-08" }))
      .mockResolvedValueOnce(Response.json({ id: 1588838, title: "To the Max", release_date: "2026-02-06" }))

    const req = new NextRequest("http://localhost:3000/catalog/movie/pictorium-netflix-movies.json?api_key=settings-key")
    const res = await GET(req, {
      params: Promise.resolve({
        type: "movie",
        id: "pictorium-netflix-movies.json",
      }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    // Solo i 2 unici devono essere presenti, il duplicato 866398 al rank 2 è scartato
    expect(body.metas).toHaveLength(2)
    expect(body.metas[0].id).toBe("tmdb:866398")
    expect(body.metas[1].id).toBe("tmdb:1588838")
  })

  it("serves catalog from /c/[config]/catalog/[type]/[id] route", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(justWatchResponse(999, "tt0999999"))
      .mockResolvedValueOnce(tmdbShowResponse(999))

    const { GET: cGET } = await import("@/app/c/[config]/catalog/[type]/[id]/route")
    const req = new NextRequest("http://localhost:3000/c/testcfg/catalog/movie/pictorium-jw-movies.json?api_key=settings-key")
    const res = await cGET(req, {
      params: Promise.resolve({
        config: "testcfg",
        type: "movie",
        id: "pictorium-jw-movies.json",
      }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metas).toHaveLength(1)
  })
})
