import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchFanartMovieArtwork, fetchFanartTVArtwork } from "@/lib/fanart"

global.fetch = vi.fn()

describe("FanArt API Integration", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.SPATIALPOSTERS_FANART_KEY = "test_fanart_key"
  })

  it("fetches and normalizes movie posters & HD logos", async () => {
    const mockResponse = {
      name: "Inception",
      tmdb_id: "27205",
      movieposter: [
        { id: "101", url: "https://images.fanart.tv/fanart/inception-poster.jpg", lang: "00", likes: "15" },
      ],
      hdmovielogo: [
        { id: "102", url: "https://images.fanart.tv/fanart/inception-logo.png", lang: "en", likes: "20" },
      ],
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const artwork = await fetchFanartMovieArtwork(27205)

    expect(artwork).toHaveLength(2)
    expect(artwork[0]).toMatchObject({
      url: "https://images.fanart.tv/fanart/inception-poster.jpg",
      source: "fanart",
      type: "poster",
      is_textless: true,
      vote_average: 15,
    })
    expect(artwork[1]).toMatchObject({
      url: "https://images.fanart.tv/fanart/inception-logo.png",
      source: "fanart",
      type: "logo",
      is_textless: true,
      vote_average: 20,
    })
  })

  it("returns empty array if no API key is set", async () => {
    delete process.env.SPATIALPOSTERS_FANART_KEY
    delete process.env.PICTORIUM_FANART_KEY
    delete process.env.POSTERIUM_FANART_KEY

    const artwork = await fetchFanartMovieArtwork(27205)
    expect(artwork).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it("handles 404 response gracefully", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    const artwork = await fetchFanartTVArtwork(12345)
    expect(artwork).toEqual([])
  })
})
