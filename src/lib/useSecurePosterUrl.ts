"use client"

import { useEffect, useState } from "react"

/**
 * M21 — poster fetch sicuro per `<img>` pubblici.
 *
 * Recupera il poster via fetch con la chiave TMDB nel header `x-api-key` e
 * ritorna un object URL da passare a `<img>`. Prima la chiave personale veniva
 * incollata nel query string dell'URL (es. `?api_key=...`): essendo un `<img>`
 * pubblico, la chiave finiva nel DOM e nel sorgente della pagina, estraibile
 * da chiunque. Con l'header la chiave non appare mai né nel DOM né nei log.
 *
 * - Con `apiKey` presente: object URL del blob (revocato al cambio URL o allo smontaggio).
 * - Senza `apiKey`: ritorna l'URL così com'è (non c'è nulla da nascondere).
 * - Su errore: ritorna l'URL diretto come fallback (senza chiave, quindi sicuro).
 */
/** Rimuove api_key dalla URL (senza dipendere da window: SSR-safe). */
function stripApiKey(url: string): string {
  try {
    const u = new URL(url, "http://local.invalid")
    u.searchParams.delete("api_key")
    return u.toString()
  } catch {
    return url
  }
}

function isExternalUrl(url: string): boolean {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    if (origin && url.startsWith(origin)) return false
    return true
  } catch {
    return true
  }
}

export function useSecurePosterUrl(url: string, apiKey: string | null | undefined): string | null {
  // External custom image URLs should not be fetched with x-api-key header (CORS preflight restriction)
  const isExt = url ? isExternalUrl(url) : false
  const [src, setSrc] = useState<string | null>(url ? (apiKey && !isExt ? stripApiKey(url) : url) : null)

  useEffect(() => {
    if (!url) { setSrc(null); return }
    if (!apiKey || isExt) { setSrc(url); return }
    let cancelled = false
    let objectUrl: string | null = null
    const ctrl = new AbortController()
    setSrc(null) // evita di mostrare un vecchio poster mentre ne arriva uno nuovo
    // La chiave va TUTTA nel header: l'URL di fetch non deve contenerla
    // nemmeno per i log dei proxy/CDN intermedi.
    const cleanUrl = (() => {
      const u = new URL(url, window.location.origin)
      u.searchParams.delete("api_key")
      return u.toString()
    })()
    fetch(cleanUrl, { headers: { "x-api-key": apiKey }, signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        // Fallback sicuro: URL senza chiave (nessun leak nel DOM).
        console.warn("[pictorium] Secure poster fetch failed, falling back to direct URL", error)
        setSrc(cleanUrl)
      })
    return () => {
      cancelled = true
      ctrl.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url, apiKey])

  return src
}