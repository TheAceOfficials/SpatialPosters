import { NextRequest } from "next/server"
import { getImages, getExternalIds } from "@/lib/tmdb"
import { fetchFanartMovieArtwork, fetchFanartTVArtwork } from "@/lib/fanart"
import { getTvdbPosters, getTvdbSeriesId } from "@/lib/tvdb"
import { envWithFallback } from "@/lib/env-compat"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { jsonGzip } from "@/lib/json-response"

type RouteParams = { id: string }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = await rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const { id } = await params
  const type = (req.nextUrl.searchParams.get("type") || "movie") as "movie" | "tv"
  const languages = req.nextUrl.searchParams.get("languages") || "en,null"
  const apiKey = req.nextUrl.searchParams.get("api_key") || undefined
  const fanartApiKey = req.nextUrl.searchParams.get("fanart_api_key") || undefined
  const tvdbApiKey = req.nextUrl.searchParams.get("tvdb_api_key") || envWithFallback("TVDB_API_KEY")

  const tmdbId = Number(id)
  const faKeyHash = fanartApiKey ? fanartApiKey.slice(0, 8) : "none"
  const tvKeyHash = tvdbApiKey ? tvdbApiKey.slice(0, 8) : "none"
  const cacheKey = `images:${type}:${tmdbId}:${languages}:fa:${faKeyHash}:tv:${tvKeyHash}`
  const acceptEncoding = req.headers.get("accept-encoding")

  const cached = cacheGet<any>(cacheKey)
  if (cached) return jsonGzip(cached, 200, undefined, acceptEncoding)

  let tmdbData: Awaited<ReturnType<typeof getImages>>
  try {
    tmdbData = await getImages(type, tmdbId, languages, apiKey)
  } catch {
    return jsonGzip({ error: "TMDB images unavailable" }, 502, undefined, acceptEncoding)
  }

  // Tag TMDB items
  const posters: any[] = (tmdbData.posters || []).map((p) => ({
    ...p,
    source: "tmdb",
    is_textless: !p.iso_639_1 || p.iso_639_1 === "" || p.iso_639_1 === "xx",
  }))

  const logos: any[] = (tmdbData.logos || []).map((l) => ({
    ...l,
    source: "tmdb",
    is_textless: true,
  }))

  const backdrops: any[] = (tmdbData.backdrops || []).map((b) => ({
    ...b,
    source: "tmdb",
    is_textless: true,
  }))

  // Parallel fetch FanArt & TVDB
  const fanartPromise = (async () => {
    try {
      if (type === "movie") {
        return await fetchFanartMovieArtwork(tmdbId, fanartApiKey)
      } else {
        return await fetchFanartTVArtwork(tmdbId, fanartApiKey)
      }
    } catch {
      return []
    }
  })()

  const tvdbPromise = (async () => {
    if (type !== "tv" || !tvdbApiKey) return []
    try {
      const ext = await getExternalIds("tv", tmdbId, apiKey).catch(() => null)
      let tvdbId: number | null = ext?.tvdb_id || null
      if (!tvdbId && ext?.imdb_id) {
        tvdbId = await getTvdbSeriesId(ext.imdb_id, tvdbApiKey)
      }
      if (tvdbId && tvdbId > 0) {
        return await getTvdbPosters(tvdbId, tvdbApiKey)
      }
    } catch {}
    return []
  })()

  const [fanartItems, tvdbItems] = await Promise.all([fanartPromise, tvdbPromise])

  for (const item of fanartItems) {
    if (item.type === "poster") {
      posters.push(item)
    } else if (item.type === "logo") {
      logos.push(item)
    } else if (item.type === "backdrop") {
      backdrops.push(item)
    }
  }

  for (const item of tvdbItems) {
    if (item.type === "poster") {
      posters.push(item)
    } else if (item.type === "logo") {
      logos.push(item)
    } else if (item.type === "backdrop") {
      backdrops.push(item)
    }
  }

  const responsePayload = {
    id: tmdbData.id,
    posters,
    logos,
    backdrops,
  }

  cacheSet(cacheKey, responsePayload, ["tmdb", "images"])
  return jsonGzip(responsePayload, 200, undefined, acceptEncoding)
}
