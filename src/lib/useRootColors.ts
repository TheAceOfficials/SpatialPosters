"use client"

// Rilevamento dei colori accent/edge dal poster selezionato (analisi pixel via
// canvas sul client). Estratto da context.tsx: l'effetto è autosufficiente e
// dipende solo dal poster attivo; aggiorna le CSS custom properties su <html>
// e i due stati accentColor/topEdgeColor del contesto.

import { useEffect } from "react"
import type { TMDBImage } from "./types"
import { findAccentColor, topEdgeAverage } from "./accent-color"

interface RootColorsSetters {
  setAccentColor: (v: string | null) => void
  setAutoAccentColor?: (v: string | null) => void
  setTopEdgeColor: (v: string | null) => void
}

export function useRootColors(
  previewPoster: TMDBImage | null,
  genreName: string | undefined,
  posterUrl: (path: string, size?: string) => string,
  { setAccentColor, setAutoAccentColor, setTopEdgeColor }: RootColorsSetters,
): void {
  useEffect(() => {
    const root = document.documentElement
    if (!previewPoster) {
      root.style.setProperty("--color-accent", "#555555")
      root.style.setProperty("--color-accent-r", "85")
      root.style.setProperty("--color-accent-g", "85")
      root.style.setProperty("--color-accent-b", "85")
      root.style.setProperty("--color-edge-r", "85")
      root.style.setProperty("--color-edge-g", "85")
      root.style.setProperty("--color-edge-b", "85")
      setAccentColor(null); setAutoAccentColor?.(null); setTopEdgeColor(null); return
    }
    let cancelled = false
    const isExternal = previewPoster.file_path.startsWith("http://") || previewPoster.file_path.startsWith("https://")
    const rawUrl = posterUrl(previewPoster.file_path, "w342")
    const url = isExternal
      ? `/api/proxy-image?url=${encodeURIComponent(rawUrl)}`
      : rawUrl + `?cb=${Date.now()}`
    const img = new Image()
    img.crossOrigin = "anonymous"
    const setRootColors = (r: number, g: number, b: number, edgeR: number, edgeG: number, edgeB: number) => {
      const c = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      root.style.setProperty("--color-accent", c)
      root.style.setProperty("--color-accent-r", String(r))
      root.style.setProperty("--color-accent-g", String(g))
      root.style.setProperty("--color-accent-b", String(b))
      const edgeC = `#${edgeR.toString(16).padStart(2, '0')}${edgeG.toString(16).padStart(2, '0')}${edgeB.toString(16).padStart(2, '0')}`
      root.style.setProperty("--color-edge", edgeC)
      root.style.setProperty("--color-edge-r", String(edgeR))
      root.style.setProperty("--color-edge-g", String(edgeG))
      root.style.setProperty("--color-edge-b", String(edgeB))
      setAccentColor(c)
      setAutoAccentColor?.(c)
      setTopEdgeColor(edgeC)
    }
    img.onload = () => {
      if (cancelled) return
      try {
        const w = Math.min(img.naturalWidth, 342)
        const h = Math.round(w * img.naturalHeight / img.naturalWidth)
        if (!w || !h) return
        const canvas = document.createElement("canvas")
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext("2d")!
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(img, 0, 0, w, h)
        const pixels = ctx.getImageData(0, 0, w, h).data
        const result = findAccentColor(pixels, w, h, genreName || '')
        const edge = topEdgeAverage(pixels, w, h)

        setRootColors(result.r, result.g, result.b, edge.r, edge.g, edge.b)
      } catch { /* color detection is non-critical */ }
    }
    img.onerror = () => { if (!cancelled) { setRootColors(85, 85, 85, 85, 85, 85) } }
    img.src = url
    return () => { cancelled = true }
    // La semantica dell'effetto originale: gira solo quando cambia il poster
    // (genreName è letto dalla closure, non è una dependency).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewPoster])
}
