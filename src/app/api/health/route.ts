import fsp from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { DATA_DIR } from "@/lib/data-dir"
import { getAll, getStorageMode } from "@/lib/store"
import { checkTmdbEndpoint } from "@/lib/tmdb"
import { getJWRankings } from "@/lib/justwatch"
import { getTop10 } from "@/lib/flixpatrol"
import { getServerDefaults } from "@/lib/server-defaults"

// Fix L15: i campi streaming devono testare DAVVERO JustWatch e FlixPatrol
// (prima testavano due endpoint TMDB, fuorviante). I probe girano solo con
// una chiave TMDB presente: senza, la status page mostra già "chiave mancante"
// e i test restano veloci (niente rete).
const PROBE_TIMEOUT_MS = 4000

async function withTimeout<T>(run: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("probe timeout")), PROBE_TIMEOUT_MS)
  })
  try {
    return await Promise.race([run(), timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function probeJustWatch(): Promise<{ ok: boolean; status: number; time: number }> {
  const start = Date.now()
  try {
    // Cache condivisa 30min: i probe successivi sono istantanei.
    await withTimeout(() => getJWRankings("MOVIE", "IT", 1))
    return { ok: true, status: 200, time: Date.now() - start }
  } catch {
    return { ok: false, status: 0, time: Date.now() - start }
  }
}

async function probeFlixPatrol(): Promise<{ ok: boolean; status: number; time: number }> {
  const start = Date.now()
  try {
    // Cache disco+memoria 4h: i probe successivi non toccano la rete.
    await withTimeout(() => getTop10("netflix", "italy", undefined, { enrich: false }))
    return { ok: true, status: 200, time: Date.now() - start }
  } catch {
    return { ok: false, status: 0, time: Date.now() - start }
  }
}

async function probeCustomAddon(): Promise<{ ok: boolean; status: number; time: number; url: string }> {
  const defaults = getServerDefaults()
  const customUrls = (defaults.streamAddonUrls || []).map((u) => u.trim()).filter(Boolean)
  if (customUrls.length === 0) {
    return { ok: true, status: 0, time: 0, url: "none" }
  }
  
  const url = customUrls[0]
  const start = Date.now()
  try {
    const ext = url.endsWith("/") ? "" : "/"
    // We just need to check if the manifest or a basic stream request succeeds.
    // Testing with a known dummy IMDB ID or just checking manifest.
    const testUrl = `${url}${ext}manifest.json`
    await withTimeout(async () => {
      const res = await fetch(testUrl)
      if (!res.ok) throw new Error("HTTP " + res.status)
      await res.json()
    })
    return { ok: true, status: 200, time: Date.now() - start, url }
  } catch {
    return { ok: false, status: 0, time: Date.now() - start, url }
  }
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await fsp.access(file)
    return true
  } catch {
    return false
  }
}

async function canRead(file: string): Promise<boolean> {
  try {
    await fsp.readFile(file, "utf-8")
    return true
  } catch {
    return false
  }
}

async function canWriteDir(dir: string): Promise<boolean> {
  const probe = path.join(dir, `.pictorium-healthcheck-${Date.now()}`)
  try {
    await fsp.writeFile(probe, "ok")
    await fsp.unlink(probe)
    return true
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  const rl = await rateLimit(rateLimitKey(request), "default")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  // S9: la chiave arriva via header x-api-key (solo richiesta: non esiste più
  // chiave d'istanza), MAI dalla query string: un health-check come
  // `GET /api/health?api_key=<REAL>` registrerebbe la chiave nei log di
  // accesso di proxy/CDN/host. Nell'URL OUTBOUND verso api.themoviedb.org la
  // chiave resta in query perché la v3 TMDB la richiede così (vedi tmdb.ts).
  const apiKey = request.headers.get("x-api-key") || ""

  const [tmdbTrending, tmdbSearch, tmdbPopular, externalIds] = apiKey
    ? await Promise.all([
        checkTmdbEndpoint("/trending/all/week", apiKey),
        checkTmdbEndpoint("/search/multi?query=test", apiKey),
        checkTmdbEndpoint("/movie/popular", apiKey),
        checkTmdbEndpoint("/movie/550/external_ids", apiKey),
      ])
    : [
        { ok: false, status: 401, time: 0 },
        { ok: false, status: 401, time: 0 },
        { ok: false, status: 401, time: 0 },
        { ok: false, status: 401, time: 0 },
      ]

  const justwatch = apiKey
    ? await probeJustWatch()
    : { ok: false, status: 401, time: 0 }
  const flixpatrol = apiKey
    ? await probeFlixPatrol()
    : { ok: false, status: 401, time: 0 }
  const addon = await probeCustomAddon()

  const mappingsFile = path.join(DATA_DIR, "mappings.json")
  const defaultsFile = path.join(DATA_DIR, "defaults.json")

  await fsp.mkdir(DATA_DIR, { recursive: true }).catch(() => {})

  const mappings = await getAll().catch(() => [])
  const lastMappingUpdatedAt = mappings
    .map((m) => m.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null

  const storageMode = getStorageMode()

  const storage = {
    mode: storageMode,
    // dataDir NON esposto: rivelerebbe il path assoluto del filesystem (info leak)
    dataDirExists: storageMode === "file" ? await fileExists(DATA_DIR) : null,
    dataDirWritable: storageMode === "file" ? await canWriteDir(DATA_DIR) : null,
    mappingsFileExists: storageMode === "file" ? await fileExists(mappingsFile) : null,
    dataFileExists: storageMode === "file" ? await fileExists(mappingsFile) : null,
    mappingsReadable: storageMode === "file" ? await canRead(mappingsFile) : null,
    mappingsWritable: storageMode === "file" ? await canWriteDir(DATA_DIR) : null,
    defaultsFileExists: storageMode === "file" ? await fileExists(defaultsFile) : null,
    defaultsReadable: storageMode === "file" ? await canRead(defaultsFile) : null,
    defaultsWritable: storageMode === "file" ? await canWriteDir(DATA_DIR) : null,
    mappingCount: mappings.length,
    mappingsCount: mappings.length,
    lastMappingUpdatedAt,
  }

  const health = {
    status: tmdbTrending.ok && tmdbSearch.ok ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    tmdb: { apiKey: !!apiKey, trending: tmdbTrending, search: tmdbSearch, popular: tmdbPopular, externalIds },
    // Nessun dettaglio di runtime (versioni, platform, NODE_ENV): rivelerli
    // aiuterebbe a bersagliare CVE note. L'endpoint dice solo se l'istanza
    // risponde e se le dipendenze esterne sono raggiungibili.
    streaming: { justwatch, flixpatrol, addon },
    storage,
  }

  const storageOk = storageMode === "kv" || storage.dataDirWritable || storage.mappingCount === 0
  const statusCode = tmdbTrending.ok && tmdbSearch.ok && storageOk ? 200 : 503
  return NextResponse.json(health, { status: statusCode })
}
