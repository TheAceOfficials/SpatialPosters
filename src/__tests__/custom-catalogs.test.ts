import { describe, it, expect, vi } from "vitest"
import { parseMDBListTarget, fetchCustomMDBList } from "@/lib/mdblist"
import { buildManifestResponse } from "@/lib/build-manifest"
import { encodeConfig } from "@/lib/config-token"
import { NextRequest } from "next/server"

describe("Custom Catalogs & MDBList Parsing", () => {
  describe("parseMDBListTarget", () => {
    it("parses full URL with username and slug", () => {
      const res = parseMDBListTarget("https://mdblist.com/lists/snoak/sky-now-top10")
      expect(res).toEqual({ user: "snoak", slug: "sky-now-top10" })
    })

    it("parses api.mdblist.com URL", () => {
      const res = parseMDBListTarget("https://api.mdblist.com/lists/john/trending-shows")
      expect(res).toEqual({ user: "john", slug: "trending-shows" })
    })

    it("parses numeric list URL", () => {
      const res = parseMDBListTarget("https://mdblist.com/lists/123456")
      expect(res).toEqual({ id: "123456" })
    })

    it("parses user/slug shorthand", () => {
      const res = parseMDBListTarget("snoak/trending-movies")
      expect(res).toEqual({ user: "snoak", slug: "trending-movies" })
    })

    it("parses URL with trailing slash, /json, or query params", () => {
      expect(parseMDBListTarget("https://mdblist.com/lists/snoak/trending-movies/")).toEqual({ user: "snoak", slug: "trending-movies" })
      expect(parseMDBListTarget("https://mdblist.com/lists/snoak/trending-movies/json")).toEqual({ user: "snoak", slug: "trending-movies" })
      expect(parseMDBListTarget("https://mdblist.com/lists/snoak/trending-movies?sort=rank")).toEqual({ user: "snoak", slug: "trending-movies" })
      expect(parseMDBListTarget("https://api.mdblist.com/lists/snoak/trending-movies/items?apikey=123")).toEqual({ user: "snoak", slug: "trending-movies" })
    })

    it("parses plain numeric ID", () => {
      const res = parseMDBListTarget("98765")
      expect(res).toEqual({ id: "98765" })
    })

    it("fetches and maps items from MDBList correctly", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        Response.json({
          items: [
            { id: 100, title: "The Penguin", year: 2024, imdb_id: "tt15474916" },
            { id: 200, title: "Dune: Part Two", year: 2024, imdb_id: "tt15239678" },
          ],
        }),
      )

      const items = await fetchCustomMDBList("https://mdblist.com/lists/snoak/sky-now")
      expect(items).toHaveLength(2)
      expect(items[0]).toEqual({
        imdb: "tt15474916",
        title: "The Penguin",
        year: 2024,
        tmdb: 100,
      })
      expect(items[1]).toEqual({
        imdb: "tt15239678",
        title: "Dune: Part Two",
        year: 2024,
        tmdb: 200,
      })
    })
  })

  describe("Manifest with Custom Catalogs", () => {
    it("includes custom catalogs when encoded in config token", async () => {
      const token = encodeConfig({
        globalBadges: true,
        rankingBadges: true,
        badgeStyle: "pill",
        rankingBadgeStyle: "default",
        blurEnabled: true,
        blurIntensity: 50,
        blurFade: 30,
        blurDarkness: 40,
        gradientHeight: 35,
        networkLogo: true,
        autoRotateClean: true,
        customCatalogs: [
          {
            id: "sky-now-1",
            name: "Sky & NOW — Top 10",
            type: "movie",
            url: "https://mdblist.com/lists/snoak/sky-now",
            enabled: true,
          },
        ],
        disabledCatalogIds: ["pictorium-jw-movies"],
      })

      const req = new NextRequest(`https://pictorium.test/manifest.json?config=${token}`)
      const res = await buildManifestResponse(req, null, token)
      const data = await res.json()

      expect(data.catalogs).toBeDefined()
      // Should exclude disabled pictorium-jw-movies
      expect(data.catalogs.some((c: { id: string }) => c.id === "pictorium-jw-movies")).toBe(false)
      // Should include custom catalog
      const custom = data.catalogs.find((c: { id: string }) => c.id === "pictorium-custom-movie-sky-now-1")
      expect(custom).toBeDefined()
      expect(custom?.name).toBe("Sky & NOW — Top 10")
      expect(custom?.type).toBe("movie")
    })

    it("normalizes legacy posterium-* IDs in saved configs", async () => {
      // Config salvate prima del rename contengono ID legacy: devono restare efficaci.
      const token = encodeConfig({
        globalBadges: true,
        rankingBadges: true,
        badgeStyle: "pill",
        rankingBadgeStyle: "default",
        blurEnabled: true,
        blurIntensity: 50,
        blurFade: 30,
        blurDarkness: 40,
        gradientHeight: 35,
        networkLogo: true,
        autoRotateClean: true,
        customCatalogs: [],
        disabledCatalogIds: ["posterium-jw-movies"],
        catalogRenames: { "posterium-anime": "Anime Legacy" },
      })

      const req = new NextRequest(`https://pictorium.test/manifest.json?config=${token}`)
      const res = await buildManifestResponse(req, null, token)
      const data = await res.json()

      expect(data.catalogs.some((c: { id: string }) => c.id === "pictorium-jw-movies")).toBe(false)
      const anime = data.catalogs.find((c: { id: string }) => c.id === "pictorium-anime")
      expect(anime?.name).toBe("Anime Legacy")
    })

    it("splits mixed custom catalogs into movie and series catalogs for Stremio", async () => {
      const token = encodeConfig({
        globalBadges: true,
        rankingBadges: true,
        badgeStyle: "pill",
        rankingBadgeStyle: "default",
        blurEnabled: true,
        blurIntensity: 50,
        blurFade: 30,
        blurDarkness: 40,
        gradientHeight: 35,
        networkLogo: true,
        autoRotateClean: true,
        customCatalogs: [
          {
            id: "mixed-watchlist",
            name: "I Miei Preferiti",
            type: "mixed",
            url: "https://mdblist.com/lists/snoak/favorites",
            enabled: true,
          },
        ],
      })

      const req = new NextRequest(`https://pictorium.test/manifest.json?config=${token}`)
      const res = await buildManifestResponse(req, null, token)
      const data = await res.json()

      const movieCat = data.catalogs.find((c: { id: string }) => c.id === "pictorium-custom-movie-mixed-watchlist")
      const seriesCat = data.catalogs.find((c: { id: string }) => c.id === "pictorium-custom-series-mixed-watchlist")

      expect(movieCat).toBeDefined()
      expect(movieCat?.name).toBe("I Miei Preferiti — Film")
      expect(movieCat?.type).toBe("movie")

      expect(seriesCat).toBeDefined()
      expect(seriesCat?.name).toBe("I Miei Preferiti — Serie TV")
      expect(seriesCat?.type).toBe("series")
    })

    it("applies catalog renames and custom priority order in manifest", async () => {
      const token = encodeConfig({
        globalBadges: true,
        rankingBadges: true,
        badgeStyle: "pill",
        rankingBadgeStyle: "default",
        blurEnabled: true,
        blurIntensity: 50,
        blurFade: 30,
        blurDarkness: 40,
        gradientHeight: 35,
        networkLogo: true,
        autoRotateClean: true,
        catalogOrder: [
          "pictorium-anime",
          "pictorium-netflix-movies",
          "pictorium-jw-movies",
        ],
        catalogRenames: {
          "pictorium-netflix-movies": "🔴 Super Netflix Film",
          "pictorium-anime": "⛩️ Anime Popolari",
        },
      })

      const req = new NextRequest(`https://pictorium.test/manifest.json?config=${token}`)
      const res = await buildManifestResponse(req, null, token)
      const data = await res.json()

      // The first catalog in the list should be pictorium-anime
      expect(data.catalogs[0].id).toBe("pictorium-anime")
      expect(data.catalogs[0].name).toBe("⛩️ Anime Popolari")

      // The second catalog should be pictorium-netflix-movies
      expect(data.catalogs[1].id).toBe("pictorium-netflix-movies")
      expect(data.catalogs[1].name).toBe("🔴 Super Netflix Film")

      // The third catalog should be pictorium-jw-movies
      expect(data.catalogs[2].id).toBe("pictorium-jw-movies")
    })

    it("sets extra isRequired: true on catalogs hidden from home", async () => {
      const token = encodeConfig({
        globalBadges: true,
        rankingBadges: true,
        badgeStyle: "pill",
        rankingBadgeStyle: "default",
        blurEnabled: true,
        blurIntensity: 50,
        blurFade: 30,
        blurDarkness: 40,
        gradientHeight: 35,
        networkLogo: true,
        autoRotateClean: true,
        homeDisabledCatalogIds: ["pictorium-netflix-movies"],
      })

      const req = new NextRequest(`https://pictorium.test/manifest.json?config=${token}`)
      const res = await buildManifestResponse(req, null, token)
      const data = await res.json()

      const netflixMovie = data.catalogs.find((c: { id: string }) => c.id === "pictorium-netflix-movies")
      const jwMovie = data.catalogs.find((c: { id: string }) => c.id === "pictorium-jw-movies")

      expect(netflixMovie).toBeDefined()
      const netflixGenre = netflixMovie.extra.find((e: { name: string }) => e.name === "genre")
      expect(netflixGenre).toBeDefined()
      expect(netflixGenre.isRequired).toBe(true)
      expect(netflixGenre.options).toContain("All")
      expect(netflixGenre.options).toContain("Action")

      expect(jwMovie).toBeDefined()
      const jwGenre = jwMovie.extra.find((e: { name: string }) => e.name === "genre")
      expect(jwGenre).toBeDefined()
      expect(jwGenre.isRequired).toBe(false)
      expect(jwGenre.options).toContain("All")
      expect(jwGenre.options).toContain("Azione")
    })
  })
})

