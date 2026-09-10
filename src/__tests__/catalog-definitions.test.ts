import { describe, expect, it } from "vitest"
import { getWarmupCatalogs, normalizeCatalogId, normalizeCatalogIdKeys, normalizeCatalogIdList, PICTORIUM_CATALOGS, WARMUP_CATALOG_IDS } from "@/lib/catalog-definitions"

describe("catalog definitions", () => {
  it("keeps warmup catalog IDs backed by manifest catalogs", () => {
    const manifestIds: Set<string> = new Set(PICTORIUM_CATALOGS.map((catalog) => catalog.id))

    const warmupCatalogs = getWarmupCatalogs()

    expect(warmupCatalogs.map((catalog) => catalog.id)).toEqual([])
    expect(warmupCatalogs.every((catalog) => manifestIds.has(catalog.id))).toBe(true)
    expect(WARMUP_CATALOG_IDS).toHaveLength(0)
  })

  it("emits only pictorium-* catalog IDs", () => {
    expect(PICTORIUM_CATALOGS.every((catalog) => catalog.id.startsWith("pictorium-"))).toBe(true)
  })

  it("normalizes legacy posterium-* IDs to pictorium-*", () => {
    expect(normalizeCatalogId("posterium-jw-movies")).toBe("pictorium-jw-movies")
    expect(normalizeCatalogId("posterium-custom-movie-x")).toBe("pictorium-custom-movie-x")
    expect(normalizeCatalogId("pictorium-jw-movies")).toBe("pictorium-jw-movies")
    expect(normalizeCatalogIdList(["posterium-jw-movies", "pictorium-anime"])).toEqual([
      "pictorium-jw-movies",
      "pictorium-anime",
    ])
    expect(normalizeCatalogIdList(undefined)).toBeUndefined()
    expect(normalizeCatalogIdKeys({ "posterium-anime": "Anime", other: "x" })).toEqual({
      "pictorium-anime": "Anime",
      other: "x",
    })
  })
})
