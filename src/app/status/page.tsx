"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { t, getLang, setLang } from "@/lib/i18n"

interface CheckResult {
  ok: boolean
  status: number
  time: number
  reason?: string
}

interface HealthData {
  status: string
  timestamp: string
  tmdb: {
    apiKey: boolean
    apiKeyLength: number
    trending: CheckResult
    search: CheckResult
    popular: CheckResult
    externalIds: CheckResult
  }
  streaming: {
    justwatch: CheckResult
    flixpatrol: CheckResult
  }
  storage: {
    mode: "kv" | "file"
    mappingsCount: number
    dataFileExists: boolean | null
  }
}

interface CacheTagEntry {
  tag: string
  count: number
}

interface CacheStatusData {
  totalEntries: number
  taggedEntries: CacheTagEntry[]
  untaggedEntries: number
  poster?: {
    requests: number
    hits: number
    renders: number
    errors: number
    hitRate: string
    hitRateNum: number
    formats: {
      jpeg: number
      webp: number
      avif: number
    }
    activeRenders: number
    queuedRenders: number
    maxConcurrent: number
  }
  tmdb?: {
    totalCalls: number
    cacheHits: number
    networkCalls: number
    cacheHitRate: string
    lastCallTime: string | null
  }
  system?: {
    sharp: {
      memory: {
        current: number
        high: number
        max: number
      }
      counters: {
        queue: number
        process: number
      }
      concurrency: number
      simd: boolean
    }
    memory: {
      rssMb: number
      heapUsedMb: number
      heapTotalMb: number
      externalMb: number
    }
    uptimeSeconds: number
  }
}

function StatusBadge({ ok }: { ok: boolean | null }) {
  if (ok === null) {
    return <span className="inline-block w-2.5 h-2.5 rounded-full bg-zinc-500 shadow-[0_0_6px_rgba(113,113,122,0.5)] mr-2 shrink-0" />
  }
  return ok
    ? <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] mr-2 shrink-0" />
    : <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] mr-2 shrink-0" />
}

function StatusRow({ label, ok, extra }: { label: string; ok: boolean | null; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-2 px-3 even:bg-white/[0.03] rounded-lg text-sm">
      <StatusBadge ok={ok} />
      <span className="text-zinc-300">{label}</span>
      {extra && <span className="text-xs text-zinc-400 ml-auto font-medium">{extra}</span>}
    </div>
  )
}

export default function StatusPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [cacheStatus, setCacheStatus] = useState<CacheStatusData | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  // Fuori dal provider di traduzione: sincronizza la lingua salvata al mount
  // così la pagina non resta mai in italiano dopo un cambio lingua + refresh.
  const [, setLangTick] = useState(0)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("preferred_lang")
      if (saved && saved !== getLang()) {
        setLang(saved)
        setLangTick((n) => n + 1)
      }
    } catch {}
  }, [])

  async function loadCacheStatus() {
    try {
      const res = await fetch("/api/cache/status")
      if (!res.ok) { setCacheStatus(null); return }
      const body = await res.json()
      setCacheStatus(body)
    } catch {
      setCacheStatus(null)
    }
  }

  useEffect(() => {
    // La chiave TMDB è personale (localStorage) e la route /api/health la
    // accetta SOLO via header x-api-key: senza, tutti i check rispondono 401
    // e la pagina mostrerebbe punti rossi anche a servizi sani.
    const key = typeof window !== "undefined" ? (localStorage.getItem("tmdb_key") || "") : ""
    fetch("/api/health", { headers: key ? { "x-api-key": key } : undefined })
      .then((r) => (r.ok || r.status === 503 ? r.json() : Promise.reject("Errore " + r.status)))
      .then((d) => { setData(d); setLoading(false) })
      .catch((e) => { setError(String(e)); setLoading(false) })
    void loadCacheStatus()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-accent transition-colors mb-6">{t("ui.statusBack")}</Link>
        <h1 className="text-2xl font-bold mb-1">{t("ui.statusTitle")}</h1>
        {loading && <p className="text-zinc-400 mt-4">{t("ui.statusLoading")}</p>}
        {error && <p className="text-red-400 mt-4">{t("ui.statusError", { msg: error })}</p>}
        {data && (
          <div className="mt-6 space-y-6">
            <div className="bg-white/[0.03] border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <StatusBadge ok={data.tmdb.apiKey} />
                <h2 className="text-base font-semibold">{t("ui.statusTmdb")}</h2>
                {data.tmdb.apiKey && <span className="text-xs text-zinc-400">{t("ui.statusApiKeyLength", { count: data.tmdb.apiKeyLength })}</span>}
              </div>
              {data.tmdb.apiKey ? (
                <div className="space-y-1">
                  <StatusRow label={t("ui.statusTrending")} ok={data.tmdb.trending.ok} extra={<>{data.tmdb.trending.status} — {data.tmdb.trending.time}ms</>} />
                  <StatusRow label={t("ui.statusSearch")} ok={data.tmdb.search.ok} extra={<>{data.tmdb.search.status} — {data.tmdb.search.time}ms</>} />
                  <StatusRow label={t("ui.statusPopular")} ok={data.tmdb.popular.ok} extra={<>{data.tmdb.popular.status} — {data.tmdb.popular.time}ms</>} />
                  <StatusRow label={t("ui.statusExternalIds")} ok={data.tmdb.externalIds.ok} extra={<>{data.tmdb.externalIds.status} — {data.tmdb.externalIds.time}ms</>} />
                </div>
              ) : (
                <div className="space-y-1">
                  <StatusRow label={t("ui.statusTmdbKeyMissing")} ok={null} />
                </div>
              )}
            </div>

            <div className="bg-white/[0.03] border border-zinc-800 rounded-xl p-4">
              <h2 className="text-base font-semibold mb-3">{t("ui.statusStreaming")}</h2>
              <div className="space-y-1">
                <StatusRow label={t("ui.statusJustwatch")} ok={data.tmdb.apiKey ? data.streaming.justwatch.ok : null} extra={data.tmdb.apiKey ? <>{data.streaming.justwatch.status} — {data.streaming.justwatch.time}ms</> : t("ui.statusTmdbKeyMissing")} />
                <StatusRow label={t("ui.statusFlixpatrol")} ok={data.tmdb.apiKey ? data.streaming.flixpatrol.ok : null} extra={data.tmdb.apiKey ? <>{data.streaming.flixpatrol.status} — {data.streaming.flixpatrol.time}ms</> : t("ui.statusTmdbKeyMissing")} />

              </div>
            </div>

            <div className="bg-white/[0.03] border border-zinc-800 rounded-xl p-4">
              <h2 className="text-base font-semibold mb-3">{t("ui.statusStorage")}</h2>
              <div className="space-y-1">
                {data.storage.mode === "kv"
                  ? <StatusRow label={t("ui.statusStorageMode")} ok extra={t("ui.statusStorageKv")} />
                  : <>
                      <StatusRow label={t("ui.statusStorageMode")} ok={!!data.storage.dataFileExists} extra={t("ui.statusStorageFile")} />
                      <StatusRow label={t("ui.statusDataFile")} ok={!!data.storage.dataFileExists} extra={data.storage.dataFileExists ? t("ui.statusDataFileName") : t("ui.statusNotFound")} />
                    </>
                }
                <StatusRow label={t("ui.statusSavedPosters")} ok={data.storage.mappingsCount > 0 || data.storage.mode === "kv" || !data.storage.dataFileExists} extra={<>{t("ui.statusPosterCount", { count: data.storage.mappingsCount })}</>} />
              </div>
            </div>

            <div className="bg-white/[0.03] border border-zinc-800 rounded-xl p-4">
              <h2 className="text-base font-semibold mb-3">{t("ui.statusSystem")}</h2>
              <div className="space-y-1">
                <StatusRow label={t("ui.statusOverall")} ok={data.tmdb.apiKey ? data.status === "healthy" : null} extra={data.tmdb.apiKey ? (data.status === "healthy" ? t("ui.statusHealthy") : t("ui.statusDegraded")) : t("ui.statusTmdbKeyMissing")} />
              </div>
            </div>

            {/* TMDB Quota & Telemetria */}
            {cacheStatus?.tmdb && (
              <div className="bg-white/[0.03] border border-zinc-800 rounded-xl p-4">
                <h2 className="text-base font-semibold mb-3 flex items-center justify-between">
                  <span>{t("ui.statusTmdbTelemetry")}</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    {t("ui.statusHitRate", { rate: cacheStatus.tmdb.cacheHitRate })}
                  </span>
                </h2>
                <div className="space-y-1">
                  <StatusRow label={t("ui.statusTmdbTotalCalls")} ok extra={cacheStatus.tmdb.totalCalls} />
                  <StatusRow label={t("ui.statusTmdbCacheHits")} ok extra={<>{cacheStatus.tmdb.cacheHits} ({cacheStatus.tmdb.cacheHitRate})</>} />
                  <StatusRow label={t("ui.statusTmdbNetworkCalls")} ok extra={cacheStatus.tmdb.networkCalls} />
                  {cacheStatus.tmdb.lastCallTime && (
                    <StatusRow label={t("ui.statusTmdbLastCall")} ok extra={new Date(cacheStatus.tmdb.lastCallTime).toLocaleTimeString(getLang())} />
                  )}
                </div>
              </div>
            )}

            {/* Poster Cache Hit Rate & Pipeline */}
            {cacheStatus?.poster && (
              <div className="bg-white/[0.03] border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold">{t("ui.statusPosterHitRateTitle")}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-accent-orange/15 text-accent-orange border border-accent-orange/30 font-semibold">
                    {t("ui.statusHitRate", { rate: cacheStatus.poster.hitRate })}
                  </span>
                </div>
                <div className="space-y-1">
                  <StatusRow label={t("ui.statusPosterRequests")} ok extra={cacheStatus.poster.requests} />
                  <StatusRow label={t("ui.statusPosterServedCache")} ok extra={<>{cacheStatus.poster.hits} ({cacheStatus.poster.hitRate})</>} />
                  <StatusRow label={t("ui.statusPosterRendersZero")} ok extra={cacheStatus.poster.renders} />
                  <StatusRow label={t("ui.statusPosterActiveSlots")} ok extra={<>{cacheStatus.poster.activeRenders} / {cacheStatus.poster.maxConcurrent} {t("ui.statusPosterQueued", { count: cacheStatus.poster.queuedRenders })}</>} />
                  
                  {/* Formati erogati */}
                  <div className="pt-2">
                    <span className="text-xs text-zinc-400 block mb-1.5">{t("ui.statusPosterFormatDist")}</span>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                        WebP: <span className="text-accent-orange font-semibold">{cacheStatus.poster.formats.webp}</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                        AVIF: <span className="text-emerald-400 font-semibold">{cacheStatus.poster.formats.avif}</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                        JPEG: <span className="text-zinc-400 font-semibold">{cacheStatus.poster.formats.jpeg}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Memoria & Sharp Engine */}
            {cacheStatus?.system && (
              <div className="bg-white/[0.03] border border-zinc-800 rounded-xl p-4">
                <h2 className="text-base font-semibold mb-3">{t("ui.statusMemoryTitle")}</h2>
                <div className="space-y-1">
                  <StatusRow label={t("ui.statusMemoryRss")} ok extra={`${cacheStatus.system.memory.rssMb} MB`} />
                  <StatusRow label={t("ui.statusMemoryHeap")} ok extra={`${cacheStatus.system.memory.heapUsedMb} / ${cacheStatus.system.memory.heapTotalMb} MB`} />
                  <StatusRow label={t("ui.statusMemoryBuffer")} ok extra={`${(cacheStatus.system.sharp.memory.current / 1024 / 1024).toFixed(1)} MB (${t("ui.statusMemoryBufferMax", { max: `${(cacheStatus.system.sharp.memory.max / 1024 / 1024).toFixed(0)} MB` })})`} />
                  <StatusRow label={t("ui.statusMemorySharpSimd")} ok extra={t("ui.statusSharpSimdThreads", { concurrency: cacheStatus.system.sharp.concurrency, simd: cacheStatus.system.sharp.simd ? t("ui.statusSimdActive") : t("ui.statusSimdInactive") })} />
                  <StatusRow label={t("ui.statusMemoryUptime")} ok extra={t("ui.statusUptimeValue", { min: Math.floor(cacheStatus.system.uptimeSeconds / 60), sec: cacheStatus.system.uptimeSeconds })} />
                </div>
              </div>
            )}

            <div className="bg-white/[0.03] border border-zinc-800 rounded-xl p-4">
              <h2 className="text-base font-semibold mb-3">{t("ui.statusCache")}</h2>
              {cacheStatus ? (
                <div className="space-y-1">
                  <StatusRow label={t("ui.statusCacheTotal")} ok extra={cacheStatus.totalEntries} />
                  <StatusRow label={t("ui.statusCacheUntagged")} ok extra={cacheStatus.untaggedEntries} />
                  {cacheStatus.taggedEntries.length > 0 ? (
                    <div className="pt-2 flex flex-wrap gap-2">
                      {cacheStatus.taggedEntries.map((entry) => (
                        <span key={entry.tag} className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                          {entry.tag}: <span className="text-white font-semibold">{entry.count}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">{t("ui.statusCacheEmpty")}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">{t("ui.statusCacheUnavailable")}</p>
              )}
            </div>

            <p className="text-xs text-zinc-500 text-center">{t("ui.statusUpdated", { time: new Date(data.timestamp).toLocaleString(getLang()) })}</p>
          </div>
        )}
      </div>
    </div>
  )
}
