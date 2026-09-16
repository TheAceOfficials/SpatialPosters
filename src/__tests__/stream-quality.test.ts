import { describe, expect, it, beforeEach, vi, afterEach } from "vitest"
import {
  parseStreamQualityFromStreams,
  resolveStreamQuality,
  __resetStreamQualityCache,
} from "@/lib/stream-quality"

describe("parseStreamQualityFromStreams", () => {
  it("returns null for empty array or invalid inputs", () => {
    expect(parseStreamQualityFromStreams([])).toBeNull()
  })

  it("identifies 4K / 2160p streams", () => {
    const streams = [
      { name: "Torrentio\n1080p", title: "Movie.1080p.BluRay" },
      { name: "Torrentio\n4k", title: "Movie.2160p.UHD.Remux" },
    ]
    expect(parseStreamQualityFromStreams(streams)).toBe("4K")
  })

  it("identifies 1080p streams when no 4K is present", () => {
    const streams = [
      { name: "Torrentio\n720p", title: "Movie.720p.HD" },
      { name: "Torrentio\n1080p", title: "Movie.1080p.BluRay.x264" },
    ]
    expect(parseStreamQualityFromStreams(streams)).toBe("1080p")
  })

  it("identifies 720p streams", () => {
    const streams = [
      { name: "Torrentio\n720p", title: "Movie.720p.HDTV" },
    ]
    expect(parseStreamQualityFromStreams(streams)).toBe("720p")
  })

  it("identifies SD streams", () => {
    const streams = [
      { name: "Torrentio\nSD", title: "Movie.480p.DVDRip" },
    ]
    expect(parseStreamQualityFromStreams(streams)).toBe("SD")
  })
})

describe("resolveStreamQuality", () => {
  beforeEach(() => {
    __resetStreamQualityCache()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("fetches streams from Torrentio and resolves 4K", async () => {
    const mockStreams = {
      streams: [
        {
          name: "Torrentio\n4k HDR",
          title: "Avatar.2009.2160p.UHD",
          behaviorHints: { filename: "Avatar.2160p.mkv" },
        },
      ],
    }

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockStreams), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    const quality = await resolveStreamQuality("movie", "tt0499549", null, null, undefined, ["https://torrentio.strem.fun"])
    expect(quality).toBe("4K")
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // Caching check
    const cached = await resolveStreamQuality("movie", "tt0499549", null, null, undefined, ["https://torrentio.strem.fun"])
    expect(cached).toBe("4K")
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
