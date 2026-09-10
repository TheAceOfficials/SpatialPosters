import { NextRequest } from "next/server"
import sharp from "sharp"
import { initSharp } from "@/lib/sharp-config"
import { getImages, getDetails, getExternalIds, getKeywords, resolveRequestApiKey, type TMDBImage, type TMDBCompany } from "@/lib/tmdb"
import { getJWRankings } from "@/lib/justwatch"
import { getById } from "@/lib/store"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { getServerDefaults } from "@/lib/server-defaults"
import { getRegionDef, normalizeRegion, parseRegion, defaultRegionForLang } from "@/lib/regions"
import { BEST_FIT_GLOBAL } from "@/lib/best-fit-config"
import { warmFonts } from "@/lib/svg-badge"
import { selectBestLogoFitPosterPath } from "@/lib/poster-auto-fit"
import { fetchAllWikidata, matchTMDBStudios } from "@/lib/awards"
import { createT } from "@/lib/i18n"
import type { EnrichedAnimeItem } from "@/lib/validation"
import { fetchMDBList, type MDBListEntry } from "@/lib/mdblist"
import { fetchAggregatedRating, calculateAverageRating } from "@/lib/ratings"
import { isImdbTop250 } from "@/lib/imdb-top250"
import { getEffectiveRotationState, tryRotatePoster } from "@/lib/poster-rotation"
import { getTMDBSessionCache, setTMDBSessionCache } from "@/lib/tmdb-session-cache"
import { mappingVersionParam } from "@/lib/stremio-poster-url"
import { RENDER_VERSION } from "@/lib/render-version"
import { envWithFallback } from "@/lib/env-compat"
import {
  RENDER_SLOT_WAIT_MS,
  acquirePosterRenderSlot,
  beginPosterRender,
  getPendingPoster,
  isImmutablePosterRequest,
  isPosterRefreshRequest,
  normalizePosterCacheParams,
  posterHeaders,
  posterNotModifiedHeaders,
  posterResponse,
  readCachedPoster,
  readPosterError,
  recordZombieRenderStart,
  schedulePosterRefresh,
  writeCachedPoster,
  writePosterError,
  recordPosterRequest,
  recordPosterError,
  resolveImageFormat,
  type PosterCachePayload,
  type PosterErrorStatus,
} from "@/lib/poster-runtime-cache"
import {
  STD_H,
  STD_W,
  fetchImg,
  hashKey,
  imgSrc,
  isValidHex,
  topLuminance,
} from "@/lib/poster-render-helpers"
import { generatePosterBuffer, type GenerationInput } from "@/lib/poster-service"
import { computeTopBadge } from "@/lib/poster-badge"

import { resolveImdbToTmdb } from "@/lib/imdb-resolver"
import { decodeConfig } from "@/lib/config-token"
import { createLogger } from "@/lib/logger"
import { resolvePosterRenderConfig } from "@/lib/poster-config"
import { selectBestLogo, logoBestLogoFallbackReason } from "@/lib/logo-selection"
import { resolveStreamQuality } from "@/lib/stream-quality"

// Vercel: limite massimo di esecuzione della funzione. Il render poster ha un
// deadline interno di 30s (PICTORIUM_RENDER_TIMEOUT_MS) → 40s copre il caso
// peggiore. Su Hobby Vercel impone comunque 10s; su Pro vale questo valore.
export const maxDuration = 40

const log = createLogger("poster")

// Deadline complessivo del render (F2): limite sull'intera pipeline
// (fetch immagini + TMDB + composizione sharp). Oltre il tempo massimo il
// watchdog abbandona il render e libera slot + inflight map. Lettura a module
// level: un cambio env richiede restart, non hot-reload.
const RENDER_TIMEOUT_MS = (() => {
  const raw = envWithFallback("RENDER_TIMEOUT_MS")
  const n = raw ? parseInt(raw, 10) : 30000
  // Clamp superiore = maxDuration (40s): un timeout interno più lungo del
  // limite della funzione serverless non avrebbe mai tempo di scattare (finding 11).
  return Number.isFinite(n) && n >= 1000 && n <= 40000 ? n : 30000
})()

// Tetto massimo per l'attesa del voto medio TMDB+IMDb (MDBList) prima del
// render: se il fetch è lento, il poster usa il voto TMDB senza bloccarsi.
// Sovrascrivibile via env (PICTORIUM_RATING_WAIT_MS); default ridotto a 1500ms
// per stringere il caso peggiore senza rinunciare all'upgrade del voto. Valore
// condiviso con la route tmdb-details (stesso knob).
const RATING_WAIT_MS = (() => {
  const raw = envWithFallback("RATING_WAIT_MS")
  const n = raw ? parseInt(raw, 10) : 1500
  return Number.isFinite(n) && n >= 300 && n <= 10000 ? n : 1500
})()

type RouteParams = { type: string; id: string }

function corsHeaders(): Record<string, string> {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" }
}

// Risposta di errore coerente per 500/503 con Retry-After esplicito sul 503
// (F5/F8): la CDN/Stremio fa backoff invece di rimbalzare subito sull'endpoint.
// Il body è generico: il 503 copre sia slot esauriti sia deadline/upstream
// lento (fix H3), non solo il busy da render concorrenti.
function posterErrorResponse(status: PosterErrorStatus): Response {
  if (status === 503) {
    return new Response("Poster temporarily unavailable", {
      status: 503,
      headers: { ...corsHeaders(), "Retry-After": String(Math.max(1, Math.round(RENDER_SLOT_WAIT_MS / 1000))) },
    })
  }
  if (status === 404) {
    return new Response("Poster not found", { status: 404, headers: corsHeaders() })
  }
  return new Response("Poster generation failed", { status: 500, headers: corsHeaders() })
}

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const startTime = Date.now()
  initSharp()
  const rl = await rateLimit(rateLimitKey(req), "poster")
  warmFonts()
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const { type, id } = await params
  const mediaType = (["series", "tv", "show", "tvshow"].includes(type?.toLowerCase() || "")) ? "tv" : "movie"

  // Decode optional stateless config token (stile AIOMetadata / RPDB)
  const configToken = req.nextUrl.searchParams.get("config") || req.nextUrl.searchParams.get("c")
  const configOverride = configToken ? decodeConfig(configToken) : null

  let tmdbId = Number(id)
  if (isNaN(tmdbId) || tmdbId <= 0) {
    if (typeof id === "string" && id.startsWith("tt")) {
      const resolved = await resolveImdbToTmdb(id, mediaType, resolveRequestApiKey(req))
      if (resolved) tmdbId = resolved
    }
  }

  if (isNaN(tmdbId) || tmdbId <= 0) {
    return new Response("Invalid ID", { status: 400, headers: corsHeaders() })
  }

  // 1. Get mapping + server defaults (no network)
  let mapping = await getById(mediaType, tmdbId)
  const sd = getServerDefaults()
  const qRegion = parseRegion(req.nextUrl.searchParams.get("region") ?? req.nextUrl.searchParams.get("country"))
  const configRegion = parseRegion(configOverride?.region)
  const langParam = req.nextUrl.searchParams.get("lang") || mapping?.language
  const langRegion = langParam ? (parseRegion(langParam) ?? defaultRegionForLang(langParam)) : null
  const posterRegion = getRegionDef(qRegion ?? configRegion ?? langRegion ?? normalizeRegion(sd.region))

  // Auto-rotate clean poster
  const rotationState = getEffectiveRotationState(mapping)
  const isRotating = rotationState.isRotating
  if (isRotating && mapping) {
    try {
      const rotated = await tryRotatePoster(mapping, rotationState)
      if (rotated) mapping = rotated
    } catch (error) {
      log.warn("Auto-rotate failed", { error: error instanceof Error ? error.message : String(error) })
    }
  }

  // 2. Cache key
  const sdHash = hashKey(JSON.stringify(sd))
  const cacheParams = normalizePosterCacheParams(req.nextUrl.searchParams)
  cacheParams.delete("config")
  cacheParams.delete("c")
  cacheParams.delete("u")
  cacheParams.delete("user")
  // api_key non influisce sul rendering: rimuoverla evita frammentazione della
  // cache per utente e segreti in memoria nelle chiavi.
  cacheParams.delete("api_key")
  if (typeof cacheParams.sort === "function") cacheParams.sort()
  const cachedRank = mapping?.trendRank ?? null
  const rotateKey = isRotating ? `:ci${mapping?.cleanPosterIndex ?? "x"}` : ""
  const mapVersion = mapping?.updatedAt ? `:mu${mapping.updatedAt}` : ""
  const configHash = configOverride ? hashKey(JSON.stringify(configOverride)) : ""
  const outputFormat = resolveImageFormat(req.headers.get("accept"), req.nextUrl.searchParams.get("fmt") || req.nextUrl.searchParams.get("format"))
  const formatKey = outputFormat !== "jpeg" ? `:fmt${outputFormat}` : ""
  const cacheKey = `poster:v${RENDER_VERSION}:${mediaType}:${tmdbId}:reg${posterRegion.code}:r${cachedRank ?? "x"}:sd${sdHash}:${cacheParams.toString()}${rotateKey}${mapVersion}${configHash ? `:cfg${configHash}` : ""}${formatKey}`
  const etagBase = hashKey(`v${RENDER_VERSION}:${mediaType}:${tmdbId}:reg${posterRegion.code}:r${cachedRank ?? "x"}:sd${sdHash}:${cacheParams.toString()}${configHash ? `:${configHash}` : ""}:${outputFormat}`)
  const currentMappingVersion = mappingVersionParam(mapping)
  const immutablePoster = isImmutablePosterRequest(req.nextUrl.searchParams, {
    hasMapping: !!mapping,
    isRotating,
    mappingVersionMatches: !!currentMappingVersion && req.nextUrl.searchParams.get("mv") === currentMappingVersion,
  })
  const refreshRequest = isPosterRefreshRequest(req.nextUrl.searchParams)
  const isPreview = req.nextUrl.searchParams.has("preview")
  // Poster non-mappato (composto al volo con dati dinamici): TTL ridotto (6h)
  // invece delle 24h del path mappato, così rank/IMDb Top 250 non restano
  // stantii per un giorno intero. Il flag non cambia per tutta la richiesta.
  const dynamicPoster = !mapping

  // 3. Memory cache check
  const cachedPoster = readCachedPoster(cacheKey)
  if (cachedPoster.payload) {
    recordPosterRequest(true, outputFormat)
    if (!isPreview && req.headers.get("If-None-Match") === cachedPoster.payload.etag) {
      log.debug("Poster cache: 304", { mediaType, tmdbId, ms: Date.now() - startTime })
      return new Response(null, { status: 304, headers: posterNotModifiedHeaders(cachedPoster.payload.etag, immutablePoster, dynamicPoster) })
    }
    if (!cachedPoster.stale) {
      log.debug("Poster cache: fresh hit", { mediaType, tmdbId, ms: Date.now() - startTime })
      return posterResponse(cachedPoster.payload, immutablePoster, isPreview, dynamicPoster, outputFormat)
    }
    if (!refreshRequest) {
      schedulePosterRefresh(req, isPreview)
      log.debug("Poster cache: stale hit (refresh scheduled)", { mediaType, tmdbId, ms: Date.now() - startTime })
      return posterResponse(cachedPoster.payload, immutablePoster, isPreview, dynamicPoster, outputFormat)
    }
  }

  const pendingPoster = getPendingPoster(cacheKey)
  if (pendingPoster) {
    // F8: il waiter coalesced attende al massimo RENDER_SLOT_WAIT_MS, poi 503
    // con Retry-After invece di tenere la connessione fino all'INFLIGHT_TIMEOUT
    // (60s) del render lento. Fix L3: il timer della race viene cancellato se
    // vince la promise concorrente (prima restava attivo fino alla scadenza).
    let coalesceTimer: ReturnType<typeof setTimeout> | undefined
    const coalesceTimeout = new Promise<PosterCachePayload | null>((resolve) => {
      coalesceTimer = setTimeout(() => resolve(null), RENDER_SLOT_WAIT_MS)
    })
    const payload = await Promise.race([pendingPoster, coalesceTimeout])
    if (coalesceTimer) clearTimeout(coalesceTimer)
    if (payload) {
      log.debug("Poster cache: coalesced with in-flight render", { mediaType, tmdbId, ms: Date.now() - startTime })
      recordPosterRequest(true, outputFormat)
      // Finding 5: il waiter della preview deve ricevere gli header no-store
      // anche quando si coalesce con un render in flight (era hardcoded false).
      return posterResponse(payload, immutablePoster, isPreview, dynamicPoster, outputFormat)
    }
    // Coalesce scaduto: o il render è fallito (negative cache) o è ancora in
    // corso — mai duplicare il render, rispondere 503 con backoff esplicito.
    const negError = readPosterError(cacheKey)
    if (negError) {
      log.debug("Poster negative cache hit", { mediaType, tmdbId, status: negError.status, ms: Date.now() - startTime })
      return posterErrorResponse(negError.status)
    }
    log.debug("Coalesce timeout: render ancora in corso", { mediaType, tmdbId, ms: Date.now() - startTime })
    return posterErrorResponse(503)
  }

  // Negative cache (F3): un 500/503 recente sulla stessa cache key non
  // ri-rende la pipeline per il TTL — risponde subito lo stesso status.
  const negativeError = readPosterError(cacheKey)
  if (negativeError) {
    log.debug("Poster negative cache hit", { mediaType, tmdbId, status: negativeError.status, ms: Date.now() - startTime })
    return posterErrorResponse(negativeError.status)
  }

  const completePosterRender = beginPosterRender(cacheKey)

  // Flag impostato dal watchdog: se la pipeline supera RENDER_TIMEOUT_MS le
  // risposte di errore successive devono essere 503 (upstream lento/assente),
  // MAI 404: un titolo reale non è "non trovato" solo perché il render ha
  // sforato il tempo massimo (prima il ramo !originalBuf rispondeva 404 e
  // scriveva una negative-cache 404, facendo credere inesistente un titolo
  // sano per i 5s di TTL).
  let deadlineFired = false

  // Deadline complessivo del render (F2): se la pipeline non finisce entro
  // RENDER_TIMEOUT_MS (es. sharp appeso o upstream degradato), il watchdog
  // abbandona il render e libera sia la inflight map sia lo slot, così gli
  // altri render non restano in starvation. completePosterRender è idempotente
  // e releaseSlotOnce è guarded: il watchdog può scattare prima del finally.
  const renderAbort = new AbortController()
  let releaseRender: (() => void) | null = null
  let slotReleased = false
  let endZombieRender: (() => void) | null = null
  const releaseSlotOnce = (): void => {
    if (releaseRender && !slotReleased) {
      slotReleased = true
      releaseRender()
    }
  }
  const renderDeadline = setTimeout(() => {
    deadlineFired = true
    renderAbort.abort()
    completePosterRender(null)
    endZombieRender = recordZombieRenderStart()
    releaseSlotOnce()
  }, RENDER_TIMEOUT_MS)
  if (typeof renderDeadline.unref === "function") renderDeadline.unref()

  // 4. Resolve poster/logo/backdrop paths
  let posterPath: string | null = null
  let posterPathBuffer: Buffer | null = null
  // Buffer del logo già scaricato dal best-fit (w500): riusato nel Block A per
  // evitare il re-fetch. Assente su cache hit del best-fit o timeout del logo →
  // Block A fa il fetch normale.
  let logoPathBuffer: Buffer | null = null
  let logoPath: string | null = null
  let backdropPath: string | null = null
  let backdropScale = 100
  let backdropOffsetX = 0
  let backdropOffsetY = 0
  let etag: string
  let genreName: string | null = null
  let voteAverage: number | null = null
  // Il ramo non-mappato ha fallito il fetch automatico dei dati TMDB
  // (errore/outage upstream, non titolo inesistente): le risposte da
  // !posterPath devono essere 503, non 404.
  let autoFetchFailed = false
  // A1: promise del voto medio TMDB+IMDb (MDBList) lanciata nel ramo
  // non-mappato ma attesa SOLO dopo il blocco dati parallelo, con un tetto
  // breve (RATING_WAIT_MS): se MDBList è lenta, il poster usa il voto TMDB
  // senza aspettare il timeout di fetch (8s).
  // AbortController dedicato: passare renderAbort.signal a fetchAggregatedRating
  // bypasserebbe il timeout interno di 8s (ratings.ts usa signal ?? timeout), e
  // renderAbort non viene mai abortito a render riuscito → il controller va
  // abortito subito dopo la race per non lasciare il fetch orfano in background.
  let aggregatedRating: ReturnType<typeof fetchAggregatedRating> | null = null
  let ratingAbort: AbortController | null = null
  let showBadges = true
  let rankingBadges = true
  let releaseDate: string | null = null
  let firstAirDate: string | null = null
  let lastAirDate: string | null = null
  let seasonCount: number | null = null
  let originCountries: string[] = []
  let tvType: string | null = null
  let tvStatus: string | null = null
  let tmdbStudios: string[] = []
  let tmdbNetworks: string[] = []
  let productionCompanies: string[] = []
  let tmdbNetworksDetailed: { name: string; logoPath: string | null }[] = []
  let productionCompaniesDetailed: { name: string; logoPath: string | null }[] = []
  let imdbId: string | null = null

  const queryPoster = req.nextUrl.searchParams.get("poster")
  const queryLogo = req.nextUrl.searchParams.get("logo")
  const queryBackdrop = req.nextUrl.searchParams.get("backdrop")
  const queryGenre = req.nextUrl.searchParams.get("genreName")
  const queryVote = req.nextUrl.searchParams.get("voteAverage")
  const qRsrc = req.nextUrl.searchParams.get("rsrc")
  const reqRatingSources = qRsrc !== null
    ? qRsrc.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : (configOverride?.ratingSources ?? undefined)
  const t = createT(req.nextUrl.searchParams.get("lang") || mapping?.language || "it")

  if (queryPoster) {
    posterPath = queryPoster
    logoPath = queryLogo || null
    backdropPath = queryBackdrop || null
    if (queryBackdrop) {
      backdropScale = Number(req.nextUrl.searchParams.get("bscale") || "100")
      // Bound inferiore + superiore: un valore come 1e-7 produrrebbe resize(0,0) → 500.
      if (!Number.isFinite(backdropScale) || backdropScale < 5 || backdropScale > 500) backdropScale = 100
      backdropOffsetX = Number(req.nextUrl.searchParams.get("box") || "0")
      if (!Number.isFinite(backdropOffsetX)) backdropOffsetX = 0
      backdropOffsetY = Number(req.nextUrl.searchParams.get("boy") || "0")
      if (!Number.isFinite(backdropOffsetY)) backdropOffsetY = 0
    }
    if (queryGenre) genreName = queryGenre
    if (queryVote) {
      voteAverage = Number(queryVote)
      if (!Number.isFinite(voteAverage)) voteAverage = null
      else voteAverage = Math.min(Math.max(voteAverage, 0), 10) // clamp a [0,10]
    }
    // Fix M1: anno della preview (WYSIWYG). Senza, il ramo query non impostava
    // releaseDate/firstAirDate e il badge genere della preview ometteva
    // "• 2024" presente invece sul poster finale.
    const queryYear = req.nextUrl.searchParams.get("year")
    if (queryYear && /^\d{4}$/.test(queryYear.slice(0, 4))) {
      const y = queryYear.slice(0, 4)
      if (mediaType === "tv") firstAirDate = `${y}-01-01`
      else releaseDate = `${y}-01-01`
    }
    imdbId = req.nextUrl.searchParams.get("imdbId") || null
    showBadges = req.nextUrl.searchParams.get("badges") !== "0"
    rankingBadges = req.nextUrl.searchParams.get("ranking") !== "0"
    etag = `"p${etagBase}"`
  } else if (mapping) {
    posterPath = mapping.posterPath
    // Poster non-clean (language !== null) ha già testo incorporato → mai sovrapporre logo
    const isMappingClean = mapping.language === null
    const effectiveMappingLogo = isMappingClean && !mapping.logoDisabled ? mapping.logoPath : null
    logoPath = queryLogo || effectiveMappingLogo
    if (!isMappingClean) logoPath = null
    backdropPath = queryBackdrop || mapping?.backdropPath || null
    backdropScale = mapping?.backdropScale ?? 100
    // Fix M5: clamp difensivo anche sui mapping già salvati (pre-bounds zod):
    // 0/negativi rompono resizeBackdropCached → 500 permanente.
    if (!Number.isFinite(backdropScale) || backdropScale < 5 || backdropScale > 500) backdropScale = 100
    backdropOffsetX = mapping?.backdropOffsetX ?? 0
    backdropOffsetY = mapping?.backdropOffsetY ?? 0
    genreName = mapping.genreName ?? null
    voteAverage = mapping.voteAverage ?? null
    showBadges = mapping.showBadges ?? true
    rankingBadges = mapping.rankingBadges ?? true
    etag = `"m${etagBase}:${mapping.updatedAt}"`
    if (req.headers.get("If-None-Match") === etag) {
      clearTimeout(renderDeadline)
      completePosterRender(null)
      return new Response(null, { status: 304, headers: posterNotModifiedHeaders(etag, immutablePoster, dynamicPoster) })
    }
  } else {
    const preferredLanguage = req.nextUrl.searchParams.get("lang") || "it"
    const apiKey = resolveRequestApiKey(req)
    try {
      // F6: session cache editor — i tick di preview sullo stesso titolo
      // non-mappato riusano details/images/externalIds senza rifare la rete.
      // P1: il primo fetch delle immagini parte in PARALLELO con details e
      // externalIds (non aspetta original_language) usando solo le lingue
      // preferite. original_language servirebbe solo per ritentare quando
      // mancano poster E logo nelle lingue base (tipico: titolo in lingua
      // piccola): aggiungerla sempre a ogni richiesta costerebbe un payload più
      // grande e la stessa RTT, quindi il retry è condizionato e paga l'extra
      // RTT solo nei casi in cui aggiunge davvero qualcosa.
      const sessionData = getTMDBSessionCache(mediaType, tmdbId)
      let details: Awaited<ReturnType<typeof getDetails>>
      let images: Awaited<ReturnType<typeof getImages>>
      let extIds: { imdb_id: string | null }
      if (sessionData?.details && sessionData.images) {
        details = sessionData.details
        images = sessionData.images
        extIds = sessionData.externalIds ?? { imdb_id: null }
      } else {
        const baseLangs = `${preferredLanguage},en,null`
        const [det, ext, imgs] = await Promise.all([
          getDetails(mediaType, tmdbId, preferredLanguage, apiKey, renderAbort.signal),
          getExternalIds(mediaType, tmdbId, apiKey, renderAbort.signal).catch(() => ({ imdb_id: null })),
          getImages(mediaType, tmdbId, baseLangs, apiKey, renderAbort.signal),
        ])
        details = det
        extIds = ext
        const origLang = det.original_language
        const needsOrigLang = origLang && origLang !== preferredLanguage && origLang !== "en"
          && (imgs.posters.length === 0 || imgs.logos.length === 0)
        images = needsOrigLang
          ? await getImages(mediaType, tmdbId, `${baseLangs},${origLang}`, apiKey, renderAbort.signal).catch(() => imgs)
          : imgs
        setTMDBSessionCache(mediaType, tmdbId, { details: det, images, externalIds: ext })
      }
      imdbId = extIds.imdb_id
      // A1: fetch deferito — la media TMDB+IMDb parte subito ma non blocca.
      ratingAbort = imdbId ? new AbortController() : null
      aggregatedRating = imdbId
        ? fetchAggregatedRating(imdbId, req.nextUrl.searchParams.get("mdblist_key") || envWithFallback("MDBLIST_KEY") || undefined, ratingAbort!.signal).catch(() => null)
        : Promise.resolve(null)
      genreName = details.genres[0]?.name || null
      voteAverage = details.vote_average ?? 0
      releaseDate = details.release_date || null
      firstAirDate = details.first_air_date || null
      lastAirDate = details.last_air_date || null
      seasonCount = details.number_of_seasons ?? null
      originCountries = [...(details.networks || []), ...(details.production_companies || [])]
        .map((c) => c.origin_country)
        .filter((c): c is string => !!c)
      tmdbNetworks = (details.networks || []).map((n: TMDBCompany) => n.name)
      tmdbNetworksDetailed = (details.networks || []).map((n: TMDBCompany) => ({ name: n.name, logoPath: n.logo_path }))
      productionCompanies = (details.production_companies || []).map((c: TMDBCompany) => c.name)
      productionCompaniesDetailed = (details.production_companies || []).map((c: TMDBCompany) => ({ name: c.name, logoPath: c.logo_path }))
      tmdbStudios = matchTMDBStudios([...tmdbNetworks, ...productionCompanies])
      tvType = details.type || null
      tvStatus = details.status || null
      // C1: acquisisci lo slot PRIMA del lavoro CPU pesante del ramo non-mappato
      // (logo-fit: fetch + decode dei poster candidati). Prima questi avvenivano
      // fuori dal semaforo → un burst di logo-fit su cache fredda (griglie
      // catalogo) spingeva la memoria senza bound. Lo stesso slot viene riusato
      // dal render sharp sotto; il finally lo rilascia comunque.
      if (!releaseRender) {
        releaseRender = await acquirePosterRenderSlot()
        if (!releaseRender) {
          clearTimeout(renderDeadline)
          completePosterRender(null)
          writePosterError(cacheKey, 503)
          return posterErrorResponse(503)
        }
      }
      const clean = images.posters.find((p: TMDBImage) => p.iso_639_1 === null)
      if (clean) {
        if (queryLogo) {
          const exact = images.logos.find((l: TMDBImage) => l.file_path === queryLogo)
          if (exact) logoPath = exact.file_path
        }
        if (!logoPath) {
          const chosenLogo = selectBestLogo(images.logos, preferredLanguage, details.original_language)
          const reason = logoBestLogoFallbackReason(chosenLogo, preferredLanguage, details.original_language)
          if (reason === "origLang") log.info("Logo fallback to original_language", { lang: details.original_language, mediaType, tmdbId })
          else if (reason === "any") log.info("Logo fallback to any (first available)", { mediaType, tmdbId })
          else if (reason === "none") log.info("No logo available", { mediaType, tmdbId })
          if (chosenLogo) logoPath = chosenLogo.file_path
        }
        const qLogoFit = req.nextUrl.searchParams.get("logoFit")
        // Override globale dell'istanza (PICTORIUM_BEST_FIT_ENABLED): vince su
        // query, config token e server defaults. Utile su Vercel/HF dove il
        // toggle client o i defaults salvati non sempre arrivano al server.
        const logoFitEnabled = BEST_FIT_GLOBAL === "off" ? false
          : BEST_FIT_GLOBAL === "on" ? true
          : qLogoFit !== null ? qLogoFit !== "0" : (configOverride !== null ? (configOverride.logoFitEnabled ?? sd.defaultLogoFitEnabled === true) : sd.defaultLogoFitEnabled === true)
        if (logoPath && logoFitEnabled) {
          try {
            const fitStart = Date.now()
            const bestFit = await selectBestLogoFitPosterPath({
              posters: images.posters, logoPath,
              fetchImage: async (path: string) => {
                const res = await fetch(imgSrc(path), { signal: AbortSignal.timeout(5000) })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return Buffer.from(await res.arrayBuffer())
              },
              fetchCandidateImage: async (path: string) => {
                if (path.startsWith("http") && !path.startsWith("https://image.tmdb.org/t/p/")) {
                  throw new Error("Blocked external URL in fetchCandidateImage")
                }
                const url = path.startsWith("http") ? path : `https://image.tmdb.org/t/p/w342${path}`
                const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return Buffer.from(await res.arrayBuffer())
              },
              hasBadges: true,
            })
            const fitMs = Date.now() - fitStart
            if (bestFit && bestFit.posterPath && bestFit.posterPath !== clean.file_path) {
              log.info("Best-fit: improved poster selected", { mediaType, tmdbId, bestFit: bestFit.posterPath, original: clean.file_path, ms: fitMs })
            } else {
              log.info("Best-fit: first clean already optimal", { mediaType, tmdbId, ms: fitMs })
            }
            posterPath = bestFit?.posterPath ?? clean.file_path
            if (bestFit?.posterBuffer) posterPathBuffer = bestFit.posterBuffer
            if (bestFit?.logoBuffer) logoPathBuffer = bestFit.logoBuffer
          } catch (e) {
            log.error("Best-fit: fallback to first clean", { mediaType, tmdbId, error: e instanceof Error ? e.message : String(e) })
            posterPath = clean.file_path
          }
        } else if (logoPath) {
          // Logo disponibile ma best-fit disabilitato: il clean viene usato
          // comunque (il logo verrà composto sopra).
          log.info("Best-fit: disabled by config", { mediaType, tmdbId })
          posterPath = clean.file_path
        } else {
          // Nessun logo disponibile: il poster clean senza logo è inutile
          // (lo spazio è pensato per il logo). Fallback al poster in lingua:
          // preferita → originale → prima non-clean → clean come ultima spiaggia.
          const langPoster = images.posters.find((p: TMDBImage) => p.iso_639_1 === preferredLanguage)
          const origPoster = details.original_language ? images.posters.find((p: TMDBImage) => p.iso_639_1 === details.original_language) : undefined
          const nonCleanPoster = images.posters.find((p: TMDBImage) => p.iso_639_1 !== null)
          const fallbackPoster = langPoster || origPoster || nonCleanPoster || clean
          log.info("No logo — fallback to language poster", { mediaType, tmdbId, poster: fallbackPoster.file_path })
          posterPath = fallbackPoster.file_path
        }
      } else {
        const langPoster = images.posters.find((p: TMDBImage) => p.iso_639_1 === preferredLanguage)
        const origPoster = details.original_language ? images.posters.find((p: TMDBImage) => p.iso_639_1 === details.original_language) : undefined
        const chosen = langPoster || origPoster || images.posters[0]
        if (chosen) posterPath = chosen.file_path
      }
    } catch (e) {
      autoFetchFailed = true
      log.error("Auto image fetch failed", { error: e instanceof Error ? e.message : String(e) })
    }
    etag = `"a${etagBase}"`
  }

  if (!posterPath) {
    clearTimeout(renderDeadline)
    // C1: il ramo non-mappato può già detenere lo slot (logo-fit) — questo
    // return è fuori dal try/finally, quindi il rilascio va fatto qui.
    releaseSlotOnce()
    // Deadline sforato o fetch upstream fallito: NIENTE 404. Il titolo può
    // semplicemente essere lento/indisponibile upstream; la negative-cache 503
    // (TTL breve) evita la tempesta di ri-render senza marchiare il titolo
    // come inesistente.
    if (deadlineFired || autoFetchFailed) {
      writePosterError(cacheKey, 503)
      completePosterRender(null)
      return posterErrorResponse(503)
    }
    // Nessun poster davvero disponibile per questo titolo: 404 + negative cache.
    writePosterError(cacheKey, 404)
    completePosterRender(null)
    return new Response("Poster not found", { status: 404, headers: corsHeaders() })
  }

  try {
    // Semaforo anti-OOM: limita i render costosi concorrenti (sharp composite,
    // blur, badge SVG→PNG). Se tutti i posti sono occupati per più del timeout,
    // risponde 503 invece di accodarsi e far crescere l'heap senza bound.
    // C1: se il ramo non-mappato ha già acquisito lo slot (logo-fit), lo si
    // riusa — mai doppia acquisizione (releaseRender già valorizzato).
    if (!releaseRender) {
      releaseRender = await acquirePosterRenderSlot()
      if (!releaseRender) {
        completePosterRender(null)
        writePosterError(cacheKey, 503)
        return posterErrorResponse(503)
      }
    }

    const qBadgesEarly = req.nextUrl.searchParams.get("badges")
    const qRankingEarly = req.nextUrl.searchParams.get("ranking")
    const qBqEarly = req.nextUrl.searchParams.get("bq")
    const qQualityParam = req.nextUrl.searchParams.get("quality")
    // hasQuery: true se lo stile è specificato esplicitamente — via poster/mapping
    // espliciti O via config token (`?config=`). Senza, i flag query (ranking=
    // badges= bg/by/br/bq) verrebbero ignorati e il server applicherebbe i default
    // (tutti ON), così un link ?config= con "ranking=0" mostrava comunque il badge
    // trend. Con un config token la personalizzazione è esplicita → i flag off
    // devono valere.
    const hasQueryEarly = !!queryPoster || !!mapping || !!configToken
    const badgesEnabledEarly = hasQueryEarly ? (qBadgesEarly !== null ? qBadgesEarly !== "0" : showBadges) : true
    const rankingEnabledEarly = hasQueryEarly ? (qRankingEarly !== null ? qRankingEarly !== "0" : rankingBadges) : true
    const badgeQualityEarly = qBqEarly !== null ? qBqEarly !== "0" : (mapping?.badgeQuality ?? configOverride?.badgeQuality ?? sd.badgeQuality ?? true)
    // Rank anime inviato dal client nella preview WYSIWYG (override del fetch).
    const qAnimeRankParam = req.nextUrl.searchParams.get("animerank")
    const qAnimeRank = qAnimeRankParam ? Number(qAnimeRankParam) : NaN

    // 5. Fetch all data in parallel: images + rankings + quality + wikidata + keywords + imdbTop250
    //    All dependencies are available before this point — no Block B depends on Block A
    const emptyWikidata = { awards: [], nominations: [], studios: [], director: null }
    const WIKIDATA_TIMEOUT = Number(process.env.WIKIDATA_TIMEOUT) || 2500
    const [
      [originalBuf, logoFetch, backdropFetch, rankingResult, animeRankResult, liveQualityResult],
      [wikidataResult, tmdbKeywords, imdbTop250],
    ] = await Promise.all([
      // Block A: images + ranking data + quality
      Promise.all([
        posterPathBuffer
          ? Promise.resolve(posterPathBuffer)
          : fetchImg(imgSrc(posterPath), renderAbort.signal).catch(() => null),
        logoPathBuffer
          ? Promise.resolve(logoPathBuffer)
          : logoPath ? fetchImg(imgSrc(logoPath), renderAbort.signal).catch(() => null) : Promise.resolve(null),
        backdropPath ? fetchImg(imgSrc(backdropPath), renderAbort.signal).catch(() => null) : Promise.resolve(null),
        rankingEnabledEarly
          ? getJWRankings(mediaType === "movie" ? "MOVIE" : "SHOW", posterRegion.code, 20, undefined, posterRegion.lang)
            .then((r) => r.find((x) => x.tmdbId === tmdbId)?.rank ?? null)
            // Solo il FETCH FALLITO (rete/outage) ripiega sul rank salvato nel
            // mapping (degraded esplicito). La miss genuina (fetch riuscito, il
            // titolo è fuori chart) resta null: MAI resuscitare il rank stantio
            // del save precedente (es. "top 15" di un titolo oggi fuori top 20).
            .catch(() => mapping?.badgeRank ?? mapping?.trendRank ?? null)
          : Promise.resolve(null),
        // Rank anime (media_type=tv): la lista MDBList trending anime senza
        // chiave risponde 503 "Invalid API key" → rank sempre null. Si usa la
        // chiave esplicita della richiesta (mdblist_key) o il fallback
        // d'istanza (PICTORIUM_MDBLIST_KEY). La cache è quella interna di
        // fetchMDBList (keyed per chiave, TTL 30min), quindi niente cache
        // manuale non-keyed.
        // Precedenza: `animerank` (preview/catalogo) > fetch live >
        // mapping.animeRank su fetch FALLITO (badge salvato: funziona anche
        // senza chiavi, come nel WYSIWYG). Miss genuina (titolo fuori chart) →
        // null, mai il rank stantio.
        rankingEnabledEarly
          ? (Number.isFinite(qAnimeRank) && qAnimeRank > 0
              ? Promise.resolve(qAnimeRank)
              : fetchMDBList(
                  mediaType === "movie" ? "mdblistAnimeMovie" : "mdblistAnime",
                  req.nextUrl.searchParams.get("mdblist_key") || envWithFallback("MDBLIST_KEY") || process.env.MDBLIST_KEY || process.env.MDBLIST_API_KEY || undefined
                )
                  .then((entries) => {
                    // Shape inattesa → come failure: fallback al salvato.
                    if (!Array.isArray(entries)) return mapping?.animeRank ?? null
                    const idx = entries.findIndex((e) => {
                      const entry = e as MDBListEntry
                      const animeId = Number(entry.tmdb) || Number((entry as unknown as EnrichedAnimeItem).id)
                      return animeId === tmdbId
                    })
                    return idx >= 0 ? idx + 1 : null
                  })
                  .catch(() => mapping?.animeRank ?? null))
          : Promise.resolve(null),
        (badgesEnabledEarly && badgeQualityEarly)
          ? (qQualityParam
              ? Promise.resolve(qQualityParam)
              : (() => {
                  const sessionTitle = getTMDBSessionCache(mediaType, tmdbId)?.details?.title
                    || getTMDBSessionCache(mediaType, tmdbId)?.details?.name
                    || null
                  const fallbackTitle = mapping?.title || req.nextUrl.searchParams.get("title") || sessionTitle || genreName || null
                  return resolveStreamQuality(
                    mediaType === "movie" ? "movie" : "series",
                    imdbId,
                    tmdbId,
                    fallbackTitle,
                    renderAbort.signal,
                  ).catch(() => null)
                })())
          : Promise.resolve(null),
      ]),
      // Block B: badge data (independent of Block A — runs concurrently)
      Promise.all([
        // Fix L3: il timer della race Wikidata viene cancellato quando vince
        // il fetch (prima restava attivo fino alla scadenza del timeout).
        (async () => {
          let wikidataTimer: ReturnType<typeof setTimeout> | undefined
          const wikidataTimeout = new Promise<typeof emptyWikidata>((r) => {
            wikidataTimer = setTimeout(() => r(emptyWikidata), WIKIDATA_TIMEOUT)
          })
          const result = await Promise.race([
            rankingEnabledEarly
              ? fetchAllWikidata(tmdbId, mediaType, t).catch(() => emptyWikidata)
              : Promise.resolve(emptyWikidata),
            wikidataTimeout,
          ])
          if (wikidataTimer) clearTimeout(wikidataTimer)
          return result
        })(),
        rankingEnabledEarly
          ? getKeywords(mediaType, tmdbId, resolveRequestApiKey(req), renderAbort.signal).catch(() => [])
          : Promise.resolve([]),
        (async () => {
          if (!rankingEnabledEarly) return false
          if (!imdbId) {
            // F6: externalIds già in session cache (ramo non-mappato) → niente rete.
            const extIds = getTMDBSessionCache(mediaType, tmdbId)?.externalIds
              ?? (await getExternalIds(mediaType, tmdbId, resolveRequestApiKey(req), renderAbort.signal).catch(() => null))
            if (extIds?.imdb_id) imdbId = extIds.imdb_id
          }
          if (!imdbId) return false
          return isImdbTop250(imdbId)
        })(),
      ]),
    ])

    // A1: upgrade del voto con la media TMDB+IMDb, ma con tetto breve: oltre
    // RATING_WAIT_MS si usa il voto TMDB già impostato (niente blocco lungo).
    // Dopo la race, se il fetch è ancora in corso viene abortito (no-op se ha
    // già vinto): il risultato è scartato, non ha senso tenerlo in background.
    if (aggregatedRating) {
      // Fix L3: timer della race RATING_WAIT cancellato se vince il fetch.
      let ratingTimer: ReturnType<typeof setTimeout> | undefined
      const ratingTimeout = new Promise<Awaited<ReturnType<typeof fetchAggregatedRating>>>((resolve) => {
        ratingTimer = setTimeout(() => resolve(null), RATING_WAIT_MS)
      })
      const aggregated = await Promise.race([aggregatedRating, ratingTimeout])
      if (ratingTimer) clearTimeout(ratingTimer)
      const avgVote = calculateAverageRating(aggregated, reqRatingSources)
      if (typeof avgVote === "number" && avgVote > 0) voteAverage = avgVote
      ratingAbort?.abort()
    }

    if (!originalBuf) {
      // Deadline sforato → 503 con negative cache: il fetch dell'immagine è
      // stato abortito dal watchdog, non è un titolo inesistente.
      if (deadlineFired) {
        writePosterError(cacheKey, 503)
        completePosterRender(null)
        return posterErrorResponse(503)
      }
      // Immagine davvero non disponibile dal CDN: 404 + negative cache per i
      // waiter coalesced e per le richieste successive.
      writePosterError(cacheKey, 404)
      completePosterRender(null)
      return new Response("Poster image not available", { status: 404, headers: corsHeaders() })
    }

    // rankingResult è autoritativo: il fallback al mapping salvato avviene solo
    // su fetch fallito (nei catch sopra), MAI su miss genuina. Altrimenti un
    // titolo uscito dalla chart mostrerebbe per sempre il rank del save
    // precedente (es. "top 15" di un titolo oggi fuori top 20).
    const rankingRank = rankingResult
    const qRank = req.nextUrl.searchParams.get("rank")
    const qLabel = req.nextUrl.searchParams.get("label")
    const finalRank = qRank !== null ? (parseInt(qRank, 10) >= 0 ? parseInt(qRank, 10) : rankingRank) : rankingRank

    // 6. Resize poster + compute luminance
    const posterBuf = await sharp(originalBuf).resize(STD_W, STD_H, { fit: 'cover', position: 'centre' }).toBuffer()
    const qTopLight = req.nextUrl.searchParams.get("tl")

    // Apply mapping TV metadata (synchronous — no race, no side-effects in parallel closures)
    if (mapping?.tvType) tvType = mapping.tvType
    if (mapping?.tvStatus) tvStatus = mapping.tvStatus
    if (mapping?.releaseDate) releaseDate = mapping.releaseDate
    if (mapping?.firstAirDate) firstAirDate = mapping.firstAirDate

    // Luminance + optional TV details fetch (parallel, independent)
    const [topLum] = await Promise.all([
      (async (): Promise<number | null> => {
        if (qTopLight === "1" || qTopLight === "0" || qTopLight === "true" || qTopLight === "false") return null
        return await topLuminance(posterBuf)
      })(),
      (tmdbNetworks.length === 0 && productionCompanies.length === 0)
        ? (async () => {
            const apiKey = resolveRequestApiKey(req)
            const preferredLang = req.nextUrl.searchParams.get("lang") || mapping?.language || "it"
            // F6: anche il refetch dei dettagli TV riusa la session cache.
            const details = getTMDBSessionCache(mediaType, tmdbId)?.details
              ?? (await getDetails(mediaType, tmdbId, preferredLang, apiKey, renderAbort.signal).catch(() => null))
            if (!details) return
            if (!releaseDate) releaseDate = details.release_date || null
            if (!firstAirDate) firstAirDate = details.first_air_date || null
            if (!lastAirDate) lastAirDate = details.last_air_date || null
            if (seasonCount == null) seasonCount = details.number_of_seasons ?? null
            if (originCountries.length === 0) {
              originCountries = [...(details.networks || []), ...(details.production_companies || [])]
                .map((c) => c.origin_country)
                .filter((c): c is string => !!c)
            }
            if (!tvType) tvType = details.type || null
            if (!tvStatus) tvStatus = details.status || null
            if (details.networks) {
              tmdbNetworks = details.networks.map((n: TMDBCompany) => n.name)
              tmdbNetworksDetailed = details.networks.map((n: TMDBCompany) => ({ name: n.name, logoPath: n.logo_path }))
            }
            if (details.production_companies) {
              productionCompanies = details.production_companies.map((c: TMDBCompany) => c.name)
              productionCompaniesDetailed = details.production_companies.map((c: TMDBCompany) => ({ name: c.name, logoPath: c.logo_path }))
            }
            if (tmdbNetworks.length || productionCompanies.length) tmdbStudios = matchTMDBStudios([...tmdbNetworks, ...productionCompanies])
          })().catch((e: unknown) => { log.error("Details fetch failed", { error: e instanceof Error ? e.message : String(e) }) })
        : Promise.resolve(),
    ])

    const topLight = (qTopLight === "1" || qTopLight === "true") ? true : (qTopLight === "0" || qTopLight === "false") ? false : (topLum ?? 0.5) > 0.60

    // 7. Parse blur / badge / logo config from query
    const renderConfig = resolvePosterRenderConfig({
      searchParams: req.nextUrl.searchParams,
      mapping,
      configOverride,
      sd,
      hasQuery: !!queryPoster || !!mapping || !!configToken,
      showBadges,
      rankingBadges,
      animeRank: animeRankResult,
      rankingResult,
      finalRank,
      // Fix L32: lingua per la risoluzione delle label prefissate (__badge.*).
      lang: req.nextUrl.searchParams.get("lang") || mapping?.language || "it",
    })
    const {
      badgeStyle, rankingBadgeStyle,
      blurEnabled, blurHeight, blurIntensity, blurFade, blurDarkness,
      badgesEnabled, rankingEnabled,
      badgeGenre, badgeYear, badgeRating, badgeQuality,
      logoScale, logoOffsetX, logoOffsetY,
      queryExtra, qNetLogo, networkLogo, ribbonSide,
    } = renderConfig

    const finalQuality = qQualityParam || liveQualityResult || null

    const locale = req.nextUrl.searchParams.get("lang") || mapping?.language || "it"
    const targetCenter = Math.round(30 * STD_H / 570)

    // 8. Pre-resolve accent color override
    const qAc = req.nextUrl.searchParams.get("ac")
    const accentOverride = (qAc && isValidHex(qAc))
      ? { genreColor: qAc, rankColor: qAc }
      : mapping?.accentColor
        ? { genreColor: mapping.accentColor, rankColor: mapping.accentColor }
        : null

    // 9. Debug mode — return JSON with all computed data instead of rendering
    const isDebug = req.nextUrl.searchParams.get("debug") === "1"
    if (isDebug) {
      const badgeInput = {
        mediaType: mediaType as "movie" | "tv",
        releaseDate: releaseDate ?? null,
        firstAirDate: firstAirDate ?? null,
        lastAirDate: lastAirDate ?? null,
        seasonCount: seasonCount ?? null,
        originCountries: [...originCountries],
        voteAverage: voteAverage ?? 0,
        trendRank: finalRank,
        animeRank: animeRankResult,
        awards: wikidataResult.awards,
        nominations: wikidataResult.nominations,
        studios: tmdbStudios.length ? [...tmdbStudios] : [...productionCompanies, ...tmdbNetworks],
        director: wikidataResult.director,
        tvType: tvType ?? null,
        tvStatus,
        keywords: [...tmdbKeywords],
        imdbTop250: !!imdbTop250,
      }
      const badgeComputed = computeTopBadge(badgeInput, t, locale)
      log.info("Debug mode", { mediaType, tmdbId, imdbId, imdbTop250: !!imdbTop250, badge: badgeComputed.badge?.label ?? "null", vote: voteAverage, genre: genreName, quality: finalQuality })
      completePosterRender(null)
      return Response.json({
        meta: {
          tmdbId,
          mediaType,
          locale,
          region: posterRegion.code,
          imdbId,
          imdbTop250: !!imdbTop250,
          renderVersion: RENDER_VERSION,
        },
        images: {
          poster: posterPath,
          logo: logoPath,
          backdrop: backdropPath,
        },
        genre: { name: genreName, year: releaseDate?.slice(0, 4) },
        vote: { average: voteAverage },
        quality: finalQuality,
        rankings: {
          justwatch: rankingResult,
          anime: animeRankResult,
          finalRank,
          qRank: req.nextUrl.searchParams.get("rank") || null,
          qLabel,
        },
        wikidata: {
          awards: wikidataResult.awards,
          nominations: wikidataResult.nominations,
          studios: wikidataResult.studios,
          director: wikidataResult.director,
        },
        keywords: [...tmdbKeywords],
        badge: {
          computed: {
            badge: badgeComputed.badge,
            upcomingRelease: badgeComputed.upcomingRelease,
            awardBadge: badgeComputed.awardBadge,
            studioBadge: badgeComputed.studioBadge,
            subGenreBadge: badgeComputed.subGenreBadge,
            extraFallback: badgeComputed.extraFallback,
          },
          settings: {
            badgesEnabled,
            rankingEnabled,
            badgeStyle,
            rankingBadgeStyle,
            badgeGenre,
            badgeYear,
            badgeRating,
            badgeQuality,
            customBadge: queryExtra,
          },
        },
        appearance: {
          topLight,
          blurEnabled,
          blurHeight,
          blurIntensity,
          blurFade,
          blurDarkness,
          gradientHeight: blurHeight,
          accentColor: accentOverride?.genreColor || null,
        },
        logos: {
          scale: logoScale,
          offsetX: logoOffsetX,
          offsetY: logoOffsetY,
          networkLogo,
        },
      })
    }

    // Fallback mapping network logo per poster salvati (quando non c'è fetch live)
    if (mapping && tmdbNetworksDetailed.length === 0 && productionCompaniesDetailed.length === 0 && (mapping.networkLogoPath || mapping.networkLogoName)) {
      const fallbackName = mapping.networkLogoName || "network"
      const fallbackPath = mapping.networkLogoPath || null
      // Non sappiamo se è network o production: mettiamo in networks per priorità
      tmdbNetworks = [fallbackName]
      tmdbNetworksDetailed = [{ name: fallbackName, logoPath: fallbackPath }]
    }

    // 10. Generate poster buffer
    const genInput: GenerationInput = {
      posterBuf, logoFetch, backdropFetch,
      backdropScale, backdropOffsetX, backdropOffsetY,
      blurEnabled, blurHeight, blurIntensity, blurFade, blurDarkness,
      badgesEnabled, rankingEnabled, genreName, voteAverage, badgeStyle,
      rankingBadgeStyle, badgeGenre, badgeYear, badgeRating, badgeQuality,
      quality: finalQuality,
      topLight, targetCenter, ribbonSide,
      logoScale, logoOffsetX, logoOffsetY,
      mediaType: mediaType as "movie" | "tv",
      finalRank, animeRankResult, rankingResult,
      mapping, tmdbNetworks, productionCompanies, tmdbStudios,
      tmdbNetworksDetailed, productionCompaniesDetailed,
      tvType, tvStatus, releaseDate, firstAirDate,
      lastAirDate, seasonCount, originCountries,
      wikidataResult, tmdbKeywords, locale, t,
      qLabel, queryExtra, qNetLogo, networkLogo, sd,
      accentOverride, imdbTop250,
      posterSrc: posterPath,
      logoSrc: logoPath,
      backdropSrc: backdropPath,
      format: outputFormat,
    }
    if (renderAbort.signal.aborted) {
      throw new Error("Render deadline exceeded before poster compositing")
    }
    const composited = await generatePosterBuffer(genInput)

    // 10. Fix stale auto ETag: include dynamic data (rank, rating) so when it re-renders, the ETag changes
    if (!mapping && !isPreview) {
      etag = `${etag.slice(0, -1)}:${finalRank ?? "X"}:${imdbTop250}:${voteAverage ?? "0"}"`
    }

    // 11. Cache + response
    const payload = { buffer: composited, etag }
    const mappingTag = mapping ? `poster:${mediaType}:${tmdbId}` : undefined
    writeCachedPoster(cacheKey, payload, mappingTag)
    completePosterRender(payload)
    recordPosterRequest(false, outputFormat)
    log.info("Poster rendered", { mediaType, tmdbId, ms: Date.now() - startTime, bytes: composited.byteLength, cached: !!mappingTag, format: outputFormat })
    return new Response(new Uint8Array(composited), { headers: posterHeaders(etag, immutablePoster, isPreview, dynamicPoster, outputFormat) })
  } catch (e) {
    completePosterRender(null)
    recordPosterError()
    // Deadline sforato: il render è stato abbandonato dal watchdog perché
    // troppo lento → 503 (con negative cache) invece di un 500 generico.
    if (deadlineFired) {
      writePosterError(cacheKey, 503)
      log.error("Poster generation failed (render deadline exceeded)", { error: e instanceof Error ? e.message : String(e) })
      return posterErrorResponse(503)
    }
    // F3: negative cache — lo stesso errore non ri-rende la pipeline per il TTL.
    writePosterError(cacheKey, 500)
    log.error("Poster generation failed", { error: e instanceof Error ? e.message : String(e) })
    return posterErrorResponse(500)
  } finally {
    clearTimeout(renderDeadline)
    releaseSlotOnce()
    const cleanupZombie = endZombieRender as (() => void) | null
    if (cleanupZombie) {
      cleanupZombie()
      endZombieRender = null
    }
  }
}
