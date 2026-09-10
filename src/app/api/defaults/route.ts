import { NextRequest } from "next/server"
import { getServerDefaults, setServerDefaults, type ServerDefaults } from "@/lib/server-defaults"
import { cacheInvalidatePosterData } from "@/lib/cache"
import { bumpCatalogEpoch } from "@/lib/catalog-epoch"
import { checkAdminToken, isSameOrigin, adminAuthResponse, originMismatchResponse } from "@/lib/auth"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { getWarmupCatalogs } from "@/lib/catalog-definitions"
import { createLogger } from "@/lib/logger"
import { z } from "zod"
import { BADGE_STYLES, RANKING_BADGE_STYLES } from "@/lib/badge-styles"
import { readJsonBody, BodyTooLargeError, DEFAULT_MAX_BODY_BYTES } from "@/lib/read-body"
import { envWithFallback } from "@/lib/env-compat"

const log = createLogger("defaults")

const customCatalogSchema = z.object({
  id: z.string().max(64),
  name: z.string().max(100),
  type: z.enum(["movie", "series", "mixed"]),
  url: z.string().max(500),
  enabled: z.boolean().optional(),
})

const defaultsSchema = z.object({
  badgeStyle: z.enum(BADGE_STYLES).optional(),
  rankingBadgeStyle: z.enum(RANKING_BADGE_STYLES).optional(),
  blurEnabled: z.boolean().optional(),
  blurIntensity: z.number().optional(),
  blurFade: z.number().optional(),
  blurDarkness: z.number().optional(),
  gradientHeight: z.number().optional(),
  globalBadges: z.boolean().optional(),
  rankingBadges: z.boolean().optional(),
  badgeGenre: z.boolean().optional(),
  badgeYear: z.boolean().optional(),
  badgeRating: z.boolean().optional(),
  badgeQuality: z.boolean().optional(),
  ratingSources: z.array(z.string()).optional(),
  autoRotateClean: z.boolean().optional(),
  defaultLogoFitEnabled: z.boolean().optional(),
  networkLogo: z.boolean().optional(),
  ribbonSide: z.enum(["left", "right"]).optional(),
  episodeMetadataSource: z.enum(["tmdb", "tvdb"]).optional(),
  region: z.string().max(32).optional(),
  customCatalogs: z.array(customCatalogSchema).optional(),
  disabledCatalogIds: z.array(z.string().max(80)).optional(),
  homeDisabledCatalogIds: z.array(z.string().max(80)).optional(),
  catalogOrder: z.array(z.string().max(80)).optional(),
  catalogRenames: z.record(z.string().max(80), z.string().max(100)).optional(),
})

export async function GET(req: NextRequest) {
  const d = getServerDefaults()
  if (checkAdminToken(req)) {
    const serverKeys = {
      tmdbKey: envWithFallback("TMDB_KEY") || process.env.TMDB_API_KEY || "",
      mdblistApiKey: envWithFallback("MDBLIST_KEY") || process.env.MDBLIST_API_KEY || "",
      tvdbApiKey: envWithFallback("TVDB_API_KEY") || process.env.TVDB_API_KEY || "",
    }
    return Response.json({ ...d, serverKeys })
  }
  return Response.json({ ...d })
}

export async function PUT(req: NextRequest) {
  const rl = await rateLimit(rateLimitKey(req), "defaults")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  if (!checkAdminToken(req)) return adminAuthResponse()
  if (!isSameOrigin(req)) return originMismatchResponse()
  let body: unknown
  try {
    body = await readJsonBody(req, DEFAULT_MAX_BODY_BYTES)
  } catch (e) {
    if (e instanceof BodyTooLargeError) return Response.json({ error: "Request body too large" }, { status: 413 })
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const parsed = defaultsSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
  }
  try {
    const current = getServerDefaults()
    // Merge invece di replace: un payload parziale NON deve azzerare i default
    // già salvati (altrimenti salvare un solo campo cancellerebbe gli altri).
    const next: Record<string, unknown> = { ...current, ...parsed.data }
    // Await: la 200 arriva solo a persistenza completata (altrimenti una GET
    // successiva può leggere ancora i vecchi default).
    await setServerDefaults(next as ServerDefaults)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ error: `Failed to save: ${message}` }, { status: 500 })
  }
  cacheInvalidatePosterData()
  // Bump epoch cataloghi (F3): il cambio default globali impatta tutti i
  // poster URL (con lo sd-hash nel key come seconda rete di sicurezza).
  await bumpCatalogEpoch()
  // Warm catalog cache — ricostruisci cataloghi principali in background.
  // Usa un origin interno fisso (127.0.0.1) invece dell'origin derivato dall'
  // header Host della richiesta: quest'ultimo è controllabile dal client
  // (host header injection → SSRF). Su Vercel (serverless) il self-fetch non
  // esiste: lo saltiamo per evitare warning ingannevoli.
  if (!process.env.VERCEL) {
    const internalOrigin = `http://127.0.0.1:${process.env.PORT || "3000"}`
    for (const catalog of getWarmupCatalogs()) {
      const catalogUrl = `${internalOrigin}/catalog/${catalog.type}/${catalog.id}.json`
      void fetch(catalogUrl, { signal: AbortSignal.timeout(15000) }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        log.warn(`Catalog warmup failed for ${catalog.id}`, { error: message })
      })
    }
  }
  return Response.json({ ok: true })
}
