import { describe, it, expect, vi } from "vitest"
import { useSecurePosterUrl } from "@/lib/useSecurePosterUrl"
import { renderHook } from "@testing-library/react"
import { GET as proxyImageGET } from "@/app/api/proxy-image/route"
import { NextRequest } from "next/server"

describe("useSecurePosterUrl with custom external URLs", () => {
  it("returns external HTTP/HTTPS URL directly without fetching with x-api-key", () => {
    const externalUrl = "https://i.imgur.com/example.jpg"
    const { result } = renderHook(() => useSecurePosterUrl(externalUrl, "test-api-key"))

    expect(result.current).toBe(externalUrl)
  })

  it("strips api_key from query params for TMDB relative/internal paths when apiKey is set", () => {
    const tmdbUrl = "https://image.tmdb.org/t/p/w500/test.jpg?api_key=secret"
    const { result } = renderHook(() => useSecurePosterUrl(tmdbUrl, undefined))

    expect(result.current).toBe(tmdbUrl)
  })
})

describe("/api/proxy-image route handler", () => {
  it("rejects requests missing url query parameter with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/proxy-image")
    const res = await proxyImageGET(req)

    expect(res.status).toBe(400)
    expect(await res.text()).toContain("Missing url")
  })

  it("rejects invalid URL format with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/proxy-image?url=invalid-url")
    const res = await proxyImageGET(req)

    expect(res.status).toBe(400)
    expect(await res.text()).toContain("Invalid url")
  })

  it("rejects non-HTTP/HTTPS protocols with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/proxy-image?url=ftp://example.com/image.png")
    const res = await proxyImageGET(req)

    expect(res.status).toBe(400)
    expect(await res.text()).toContain("Only HTTP/HTTPS URLs supported")
  })

  it("blocks private/internal IP hostnames (SSRF prevention) with 403", async () => {
    const privateUrls = [
      "http://localhost/secret",
      "http://127.0.0.1/admin",
      "http://10.0.0.1/internal",
      "http://192.168.1.1/router",
      "http://172.16.0.1/config",
    ]

    for (const url of privateUrls) {
      const req = new NextRequest(`http://localhost:3000/api/proxy-image?url=${encodeURIComponent(url)}`)
      const res = await proxyImageGET(req)
      expect(res.status).toBe(403)
      expect(await res.text()).toContain("private/internal hosts forbidden")
    }
  })
})
