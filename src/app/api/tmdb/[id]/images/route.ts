import { NextRequest } from "next/server"
import { getImages } from "@/lib/tmdb"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { jsonGzip } from "@/lib/json-response"

type RouteParams = { id: string }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = await rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const { id } = await params
  const type = req.nextUrl.searchParams.get("type") || "movie"
  // Il default è solo una rete di sicurezza: ogni chiamante passa `languages`
  // costruito dalla regione. L'italiano che stava qui privilegiava una lingua
  // sola tra le tredici.
  const languages = req.nextUrl.searchParams.get("languages") || "en,null"
  const apiKey = req.nextUrl.searchParams.get("api_key") || undefined
  const cacheKey = `images:${type}:${id}:${languages}`
  const acceptEncoding = req.headers.get("accept-encoding")
  const cached = cacheGet(cacheKey)
  if (cached) return jsonGzip(cached, 200, undefined, acceptEncoding)
  // Niente catch-and-cache: un errore/outage upstream NON deve finire in cache
  // come "lista vuota" per 30 minuti (avvelenerebbe la visuale di ogni titolo
  // durante un down di TMDB). Si risponde 502: il client gestisce il fallo
  // e può riprovare al tick successivo, senza che nessun altro veda dati falsi.
  let data: Awaited<ReturnType<typeof getImages>>
  try {
    data = await getImages(type as "movie" | "tv", Number(id), languages, apiKey)
  } catch {
    return jsonGzip({ error: "TMDB images unavailable" }, 502, undefined, acceptEncoding)
  }
  cacheSet(cacheKey, data, ["tmdb", "images"])
  return jsonGzip(data, 200, undefined, acceptEncoding)
}
