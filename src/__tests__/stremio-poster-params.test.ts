import { describe, expect, it } from "vitest"
import { buildStremioPosterSearchParams } from "@/lib/stremio-poster-params"
import { POSTER_URL_VERSION, RENDER_VERSION } from "@/lib/render-version"

describe("buildStremioPosterSearchParams", () => {
  it("builds the exact visual params used by Stremio poster URLs", () => {
    const params = buildStremioPosterSearchParams({
      apiKey: "tmdb-key",
      lang: "it",
      globalBadges: false,
      rankingBadges: false,
      badgeStyle: "pill",
      rankingBadgeStyle: "bar",
      gradientHeight: 42,
      blurIntensity: 6,
      blurFade: 55,
      blurDarkness: 35,
      blurEnabled: false,
    })

    expect(params.get("api_key")).toBe("tmdb-key")
    expect(params.get("lang")).toBe("it")
    expect(params.get("badges")).toBe("0")
    expect(params.get("ranking")).toBe("0")
    expect(params.get("be")).toBe("0")
    expect(params.get("gradHeight")).toBe("42")
    expect(params.get("blur")).toBe("6")
    expect(params.get("bf")).toBe("55")
    expect(params.get("bd")).toBe("35")
    expect(params.get("bs")).toBe("pill")
    expect(params.get("rs")).toBe("bar")
    expect(params.get("rv")).toBe(String(POSTER_URL_VERSION))
  })

  it("uses production defaults when optional settings are missing", () => {
    const params = buildStremioPosterSearchParams({})

    expect(params.get("lang")).toBe("it")
    expect(params.has("badges")).toBe(false)
    expect(params.has("ranking")).toBe(false)
    expect(params.has("be")).toBe(false)
    expect(params.get("gradHeight")).toBe("30")
    expect(params.get("blur")).toBe("5")
    expect(params.get("bf")).toBe("60")
    expect(params.get("bd")).toBe("40")
    expect(params.get("bs")).toBe("shadow")
    expect(params.get("rs")).toBe("default")
  })

  it("serializes ribbonSide left and right explicitly", () => {
    const leftParams = buildStremioPosterSearchParams({ ribbonSide: "left" })
    expect(leftParams.get("side")).toBe("left")

    const rightParams = buildStremioPosterSearchParams({ ribbonSide: "right" })
    expect(rightParams.get("side")).toBe("right")
  })

  it("serializes region when configured and omits it when missing", () => {
    const paramsWithRegion = buildStremioPosterSearchParams({ region: "FR" })
    expect(paramsWithRegion.get("region")).toBe("FR")

    const paramsWithoutRegion = buildStremioPosterSearchParams({})
    expect(paramsWithoutRegion.has("region")).toBe(false)
  })

  it("serializes badge subcomponents and rating sources when configured", () => {
    const params = buildStremioPosterSearchParams({
      badgeGenre: false,
      badgeYear: false,
      badgeRating: false,
      manualQuality: "SD",
      ratingSources: ["tmdb", "imdb"],
    })

    expect(params.get("bg")).toBe("0")
    expect(params.get("by")).toBe("0")
    expect(params.get("br")).toBe("0")
    expect(params.get("mq")).toBe("SD")
    expect(params.get("rsrc")).toBe("tmdb,imdb")
  })

  it("keeps the public Stremio poster URL version in sync with renderer changes", () => {
    expect(POSTER_URL_VERSION).toBe(RENDER_VERSION)
  })
})
