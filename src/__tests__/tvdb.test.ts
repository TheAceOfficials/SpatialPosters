import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  getTvdbToken,
  getTvdbSeriesId,
  getTvdbEpisodes,
  getTvdbSeasonTypes,
  enrichVideosWithTvdb,
  formatTvdbImageUrl,
  clearTvdbCache,
} from "@/lib/tvdb"
import { cacheClear } from "@/lib/cache"
import type { StremioVideo } from "@/lib/meta-handler"

describe("TVDB Integration", () => {
  beforeEach(() => {
    cacheClear()
    clearTvdbCache()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cacheClear()
    clearTvdbCache()
  })

  describe("formatTvdbImageUrl", () => {
    it("returns undefined when url is null or undefined", () => {
      expect(formatTvdbImageUrl(undefined)).toBeUndefined()
    })

    it("keeps absolute urls intact", () => {
      expect(formatTvdbImageUrl("https://artworks.thetvdb.com/banners/v4/episode/123/screencap.jpg")).toBe(
        "https://artworks.thetvdb.com/banners/v4/episode/123/screencap.jpg"
      )
    })

    it("prepends https://artworks.thetvdb.com to relative paths", () => {
      expect(formatTvdbImageUrl("/banners/v4/episode/123/screencap.jpg")).toBe(
        "https://artworks.thetvdb.com/banners/v4/episode/123/screencap.jpg"
      )
      expect(formatTvdbImageUrl("banners/v4/episode/123/screencap.jpg")).toBe(
        "https://artworks.thetvdb.com/banners/v4/episode/123/screencap.jpg"
      )
    })
  })

  describe("getTvdbToken", () => {
    it("returns null if no apiKey is provided", async () => {
      const token = await getTvdbToken("")
      expect(token).toBeNull()
    })

    it("logs in and caches JWT token", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        Response.json({
          status: "success",
          data: { token: "mock-jwt-token-12345" },
        })
      )

      const token1 = await getTvdbToken("test-tvdb-key")
      expect(token1).toBe("mock-jwt-token-12345")
      expect(fetchSpy).toHaveBeenCalledTimes(1)

      // Cached call should not fetch again
      const token2 = await getTvdbToken("test-tvdb-key")
      expect(token2).toBe("mock-jwt-token-12345")
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it("returns null on authentication error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Invalid API key" }), { status: 401 })
      )

      const token = await getTvdbToken("bad-key")
      expect(token).toBeNull()
    })
  })

  describe("getTvdbSeriesId", () => {
    it("finds TVDB series ID by IMDb remote ID", async () => {
      // 1. Auth fetch
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          Response.json({ status: "success", data: { token: "mock-jwt" } })
        )
        // 2. Search remoteid
        .mockResolvedValueOnce(
          Response.json({
            status: "success",
            data: [
              {
                series: { id: 75710, name: "Breaking Bad" },
              },
            ],
          })
        )

      const seriesId = await getTvdbSeriesId("tt0903747", "test-key")
      expect(seriesId).toBe(75710)
    })
  })

  describe("getTvdbEpisodes", () => {
    it("fetches Italian episodes and translates/formats screencaps", async () => {
      vi.spyOn(globalThis, "fetch")
        // 1. Auth fetch
        .mockResolvedValueOnce(
          Response.json({ status: "success", data: { token: "mock-jwt" } })
        )
        // 2. Episodes page 0
        .mockResolvedValueOnce(
          Response.json({
            status: "success",
            data: {
              episodes: [
                {
                  id: 101,
                  seriesId: 75710,
                  name: "Questione di chimica",
                  overview: "Walter White, un professore di chimica...",
                  seasonNumber: 1,
                  number: 1,
                  image: "/banners/episodes/101.jpg",
                },
                {
                  id: 102,
                  seriesId: 75710,
                  name: "Senza ritorno",
                  overview: "Walter e Jesse cercano di ripulire la situazione...",
                  seasonNumber: 1,
                  number: 2,
                  image: "https://artworks.thetvdb.com/banners/episodes/102.jpg",
                },
              ],
            },
            links: { next: null },
          })
        )

      const episodes = await getTvdbEpisodes(75710, "ita", "test-key")
      expect(episodes).toHaveLength(2)
      expect(episodes[0].name).toBe("Questione di chimica")
      expect(episodes[0].overview).toContain("Walter White")
      expect(episodes[0].image).toBe("https://artworks.thetvdb.com/banners/episodes/101.jpg")
      expect(episodes[1].image).toBe("https://artworks.thetvdb.com/banners/episodes/102.jpg")
    })
  })

  describe("enrichVideosWithTvdb", () => {
    it("merges TVDB screencaps and overviews into Stremio videos list", async () => {
      vi.spyOn(globalThis, "fetch")
        // Auth
        .mockResolvedValueOnce(
          Response.json({ status: "success", data: { token: "mock-jwt" } })
        )
        // Search remoteid
        .mockResolvedValueOnce(
          Response.json({
            status: "success",
            data: [{ series: { id: 75710 } }],
          })
        )
        // Episodes
        .mockResolvedValueOnce(
          Response.json({
            status: "success",
            data: {
              episodes: [
                {
                  seasonNumber: 1,
                  number: 1,
                  name: "Questione di chimica",
                  overview: "Trama italiana accurata da TVDB.",
                  image: "/banners/episodes/75710/1.jpg",
                },
              ],
            },
            links: { next: null },
          })
        )

      const videos: StremioVideo[] = [
        {
          id: "tt0903747:1:1",
          name: "Episodio 1",
          season: 1,
          episode: 1,
          overview: "Trama generica TMDB",
          thumbnail: "https://image.tmdb.org/t/p/w500/tmdb-still.jpg",
        },
      ]

      await enrichVideosWithTvdb(videos, "tt0903747", 1396, "test-key", "ita")

      expect(videos[0].name).toBe("Questione di chimica")
      expect(videos[0].overview).toBe("Trama italiana accurata da TVDB.")
      expect(videos[0].thumbnail).toBe("https://artworks.thetvdb.com/banners/episodes/75710/1.jpg")
    })
  })

  describe("getTvdbSeasonTypes", () => {
    it("extracts season types from series extended data", async () => {
      vi.spyOn(globalThis, "fetch")
        // Auth
        .mockResolvedValueOnce(
          Response.json({ status: "success", data: { token: "mock-jwt" } })
        )
        // Series extended
        .mockResolvedValueOnce(
          Response.json({
            status: "success",
            data: {
              id: 327153,
              name: "La Casa de Papel",
              seasonTypes: [
                {
                  id: 1,
                  name: "Aired Order",
                  type: "official",
                  alternateName: null,
                },
                {
                  id: 3,
                  name: "Alternate Order",
                  type: "alternate",
                  alternateName: "Netflix",
                },
              ],
            },
          })
        )

      const types = await getTvdbSeasonTypes(327153, "test-key")
      expect(types).toHaveLength(2)
      expect(types[0]).toEqual({
        id: 1,
        name: "Aired Order",
        type: "official",
        alternateName: null,
      })
      expect(types[1]).toEqual({
        id: 3,
        name: "Alternate Order",
        type: "alternate",
        alternateName: "Netflix",
      })
    })

    it("extracts unique season types from seasons array if seasonTypes is missing", async () => {
      vi.spyOn(globalThis, "fetch")
        // Auth
        .mockResolvedValueOnce(
          Response.json({ status: "success", data: { token: "mock-jwt" } })
        )
        // Series extended with seasons array
        .mockResolvedValueOnce(
          Response.json({
            status: "success",
            data: {
              id: 327153,
              seasons: [
                {
                  id: 101,
                  number: 1,
                  type: { id: 1, name: "Aired Order", type: "official" },
                },
                {
                  id: 102,
                  number: 2,
                  type: { id: 1, name: "Aired Order", type: "official" },
                },
                {
                  id: 201,
                  number: 1,
                  type: { id: 2, name: "DVD Order", type: "dvd" },
                },
              ],
            },
          })
        )

      const types = await getTvdbSeasonTypes(327153, "test-key")
      expect(types).toHaveLength(2)
      expect(types.map((t) => t.type)).toEqual(["official", "dvd"])
    })
  })
})
