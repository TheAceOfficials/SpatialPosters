import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import { buildManifestResponse } from "@/lib/build-manifest"

describe("buildManifestResponse with hubMode options", () => {
  it("defaults to all (both content catalogs and search catalogs)", async () => {
    const req = new NextRequest("http://localhost:3000/manifest.json")
    const res = await buildManifestResponse(req)
    const json = await res.json()

    expect(json.id).toBe("org.pictorium")
    expect(json.name).toBe("SpatialPosters")
    const catalogIds = json.catalogs.map((c: { id: string }) => c.id)
    expect(catalogIds).toContain("pictorium-search-movies")
    expect(catalogIds).toContain("pictorium-search-series")
    expect(catalogIds.length).toBeGreaterThan(2)
  })

  it("handles mode=catalogs (only content catalogs, no search catalogs)", async () => {
    const req = new NextRequest("http://localhost:3000/manifest.json?mode=catalogs")
    const res = await buildManifestResponse(req)
    const json = await res.json()

    expect(json.id).toBe("org.pictorium.catalogs")
    expect(json.name).toContain("(Catalogs)")
    const catalogIds = json.catalogs.map((c: { id: string }) => c.id)
    expect(catalogIds).not.toContain("pictorium-search-movies")
    expect(catalogIds).not.toContain("pictorium-search-series")
    expect(catalogIds.length).toBeGreaterThan(0)
  })

  it("handles mode=search (only search catalogs, no content catalogs)", async () => {
    const req = new NextRequest("http://localhost:3000/manifest.json?mode=search")
    const res = await buildManifestResponse(req)
    const json = await res.json()

    expect(json.id).toBe("org.pictorium.search")
    expect(json.name).toContain("(Search)")
    const catalogIds = json.catalogs.map((c: { id: string }) => c.id)
    expect(catalogIds).toContain("pictorium-search-movies")
    expect(catalogIds).toContain("pictorium-search-series")
    expect(catalogIds).toContain("pictorium-search-people-movies")
    expect(catalogIds).toContain("pictorium-search-people-series")
    expect(catalogIds.length).toBe(4)
  })

  it("generates distinct deterministic addonId for different config tokens", async () => {
    const configA = "eyJnbG9iYWxCYWRnZXMiOnRydWUsInJhbmtpbmdCYWRnZXMiOmZhbHNlLCJibHVySW50ZW5zaXR5IjoxMH0.sigA"
    const configB = "eyJnbG9iYWxCYWRnZXMiOnRydWUsInJhbmtpbmdCYWRnZXMiOnRydWUsImJsdXJJbnRlbnNpdHkiOjk5fQ.sigB"

    const reqA = new NextRequest("http://localhost:3000/manifest.json")
    const resA = await buildManifestResponse(reqA, null, configA)
    const jsonA = await resA.json()

    const reqB = new NextRequest("http://localhost:3000/manifest.json")
    const resB = await buildManifestResponse(reqB, null, configB)
    const jsonB = await resB.json()

    expect(jsonA.id).toMatch(/^org\.pictorium\.[A-Za-z0-9_-]{8}$/)
    expect(jsonB.id).toMatch(/^org\.pictorium\.[A-Za-z0-9_-]{8}$/)
    expect(jsonA.id).not.toBe(jsonB.id)
  })
})
