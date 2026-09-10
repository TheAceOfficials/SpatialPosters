import { describe, it, expect } from "vitest"
import { resolvePosterRenderConfig, type PosterRenderConfigInput } from "@/lib/poster-config"
import { buildStremioPosterSearchParams } from "@/lib/stremio-poster-params"
import { extractOttWatchProviders, type TMDBDetails } from "@/lib/tmdb"

function baseInput(overrides: Partial<PosterRenderConfigInput> = {}): PosterRenderConfigInput {
  return {
    searchParams: new URLSearchParams(),
    mapping: null,
    configOverride: null,
    sd: {},
    hasQuery: true,
    showBadges: true,
    rankingBadges: true,
    animeRank: null,
    rankingResult: null,
    finalRank: null,
    ...overrides,
  }
}

describe("Network Logo Mode & OTT Streaming Provider Logo", () => {
  it("resolves netLogo=0 as off mode", () => {
    const q = new URLSearchParams({ netLogo: "0" })
    const res = resolvePosterRenderConfig(baseInput({ searchParams: q }))
    expect(res.networkLogoMode).toBe("off")
    expect(res.networkLogo).toBe(false)
    expect(res.qNetLogo).toBe("0")
  })

  it("resolves netLogo=1 and netLogo=network as network mode", () => {
    const q1 = new URLSearchParams({ netLogo: "1" })
    const res1 = resolvePosterRenderConfig(baseInput({ searchParams: q1 }))
    expect(res1.networkLogoMode).toBe("network")
    expect(res1.networkLogo).toBe(true)

    const qNet = new URLSearchParams({ netLogo: "network" })
    const resNet = resolvePosterRenderConfig(baseInput({ searchParams: qNet }))
    expect(resNet.networkLogoMode).toBe("network")
    expect(resNet.networkLogo).toBe(true)
  })

  it("resolves netLogo=ott as ott mode", () => {
    const q = new URLSearchParams({ netLogo: "ott" })
    const res = resolvePosterRenderConfig(baseInput({ searchParams: q }))
    expect(res.networkLogoMode).toBe("ott")
    expect(res.networkLogo).toBe(true)
    expect(res.qNetLogo).toBe("ott")
  })

  it("resolves netLogo=auto as auto mode", () => {
    const q = new URLSearchParams({ netLogo: "auto" })
    const res = resolvePosterRenderConfig(baseInput({ searchParams: q }))
    expect(res.networkLogoMode).toBe("auto")
    expect(res.networkLogo).toBe(true)
    expect(res.qNetLogo).toBe("auto")
  })

  it("builds search params correctly for networkLogoMode", () => {
    const paramsOtt = buildStremioPosterSearchParams({ networkLogoMode: "ott" })
    expect(paramsOtt.get("netLogo")).toBe("ott")

    const paramsAuto = buildStremioPosterSearchParams({ networkLogoMode: "auto" })
    expect(paramsAuto.get("netLogo")).toBe("auto")

    const paramsOff = buildStremioPosterSearchParams({ networkLogoMode: "off" })
    expect(paramsOff.get("netLogo")).toBe("0")

    const paramsNetwork = buildStremioPosterSearchParams({ networkLogoMode: "network" })
    expect(paramsNetwork.get("netLogo")).toBeNull() // Default mode is network, netLogo not emitted when default
  })

  it("extracts OTT watch providers for region", () => {
    const mockDetails: Partial<TMDBDetails> = {
      id: 100,
      "watch/providers": {
        results: {
          US: {
            flatrate: [
              { provider_id: 8, provider_name: "Netflix", logo_path: "/nfx.png" },
              { provider_id: 9, provider_name: "Amazon Prime Video", logo_path: "/prv.png" },
            ],
          },
          IN: {
            flatrate: [
              { provider_id: 119, provider_name: "Amazon Prime Video", logo_path: "/prv.png" },
              { provider_id: 122, provider_name: "JioCinema", logo_path: "/jio.png" },
            ],
          },
        },
      },
    }

    const usProviders = extractOttWatchProviders(mockDetails as TMDBDetails, "US")
    expect(usProviders).toHaveLength(2)
    expect(usProviders[0].name).toBe("Netflix")

    const inProviders = extractOttWatchProviders(mockDetails as TMDBDetails, "IN")
    expect(inProviders).toHaveLength(2)
    expect(inProviders[1].name).toBe("JioCinema")
  })
})
