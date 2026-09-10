import crypto from "node:crypto"
import sharp from "sharp"
import { findAccentColor } from "@/lib/accent-color"
import { GENRE_FALLBACK } from "@/lib/badges"
// Batch B: STD_W/STD_H ora provengono da image-utils.ts (single source of truth)
import { STD_W, STD_H, computeRegionStats } from "@/lib/image-utils"

// Sovrascrivibile via env: nei test E2E punta al mock server locale per
// rendere il rendering determinista senza dipendere da image.tmdb.org.
const IMG_BASE = process.env.TMDB_IMG_URL || "https://image.tmdb.org/t/p"
const MAX_IMG_SIZE = 10 * 1024 * 1024

// Re-export per backward compat — tutti i file che importano STD_W/STD_H
// da poster-render-helpers continuano a funzionare.
export { STD_W, STD_H }
export const OUTPUT_W = 500
export const OUTPUT_H = 750

export type BadgeRender = { png: Buffer; w: number; h: number; isRank?: boolean }
export type PosterComposite = { input: Buffer; top: number; left: number }

export function hashKey(key: string): string {
  return crypto.createHash("md5").update(key).digest("hex").slice(0, 16)
}

export async function fetchImg(url: string, signal?: AbortSignal): Promise<Buffer> {
  // Se il chiamante passa un signal esterno, unirlo al timeout interno invece
  // di sostituirlo: un signal mai abortito (es. renderAbort a render riuscito)
  // lascerebbe il fetch senza tetto in background. Il limite resta 15s.
  const timeoutSignal = AbortSignal.timeout(15000)
  let combined: AbortSignal = timeoutSignal
  if (signal) {
    if (typeof (AbortSignal as unknown as { any?: unknown }).any === "function") {
      combined = (AbortSignal as unknown as { any: (s: AbortSignal[]) => AbortSignal }).any([signal, timeoutSignal])
    } else {
      const ctrl = new AbortController()
      const onAbort = () => ctrl.abort((signal as unknown as { reason?: unknown })?.reason ?? timeoutSignal.reason)
      if (signal.aborted || timeoutSignal.aborted) ctrl.abort()
      else {
        signal.addEventListener("abort", onAbort, { once: true })
        timeoutSignal.addEventListener("abort", onAbort, { once: true })
      }
      combined = ctrl.signal
    }
  }
  const res = await fetch(url, { signal: combined })
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
  const cl = res.headers.get("content-length")
  if (cl && Number(cl) > MAX_IMG_SIZE) throw new Error("image too large")
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > MAX_IMG_SIZE) throw new Error("image too large")
  return buf
}

export function isValidHex(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color)
}

export function imgSrc(path: string): string {
  if (path.startsWith("http")) {
    // SSRF protection: only allow TMDB image CDN
    if (!path.startsWith("https://image.tmdb.org/t/p/")) {
      throw new Error(`Blocked external image URL: ${path.slice(0, 60)}...`)
    }
    return path
  }
  return `${IMG_BASE}/w500${path}`
}

export async function fitBadgeToCanvas<T extends BadgeRender>(badge: T, maxW: number, maxH: number): Promise<T> {
  if (badge.w <= maxW && badge.h <= maxH) return badge
  const scale = Math.min(maxW / badge.w, maxH / badge.h)
  const w = Math.max(Math.floor(badge.w * scale), 1)
  const h = Math.max(Math.floor(badge.h * scale), 1)
  const png = await sharp(badge.png)
    .resize(w, h, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 1 })
    .toBuffer()
  return { ...badge, png, w, h }
}

export async function fitCompositeToCanvas(
  layer: PosterComposite,
  _maxW: number,
  _maxH: number,
): Promise<PosterComposite | null> {
  if (!layer.input || layer.input.length < 100) return null
  const meta = await sharp(layer.input).metadata()
  if ((meta.width || 0) <= 0 || (meta.height || 0) <= 0) return null
  // Sharp's .composite() handles out-of-bounds clipping natively — no sub-extract needed
  return layer
}

/**
 * Compute the luminance of the top strip of the poster (top 8% of STD_H).
 *
 * Batch B: delegates to computeRegionStats() from image-utils.ts, so the pixel
 * loop lives in one place instead of being duplicated here. The region stats
 * pool caches the result; computeTextPenalty() reuses the pool for its own
 * crop. Note: extractBadgeColor() has its own pipeline (accent-color.ts) and
 * does NOT consume this pool.
 *
 * The returned values differ slightly (~0.02) from the old topLuminance:
 * the previous implementation used RGBA stride-4, rounded per-channel means,
 * and skipped alpha removal; computeRegionStats uses RGB stride-3 with
 * unrounded Rec.709 luminance. This is why RENDER_VERSION was bumped.
 */
export async function topLuminance(buf: Buffer): Promise<number> {
  const stripH = Math.max(Math.round(STD_H * 0.08), 3)
  const stats = await computeRegionStats(buf, 0, 0, STD_W, stripH)
  if (!stats) return 0.5 // fallback: medium luminance
  return stats.mean / 255
}

export async function extractBadgeColor(
  posterBuf: Buffer,
  logoBuf?: Buffer | null,
  fallbackGenre?: string | null,
  region?: 'bottom' | 'top',
): Promise<string> {
  async function extractFrom(buf: Buffer, w: number, h: number, genre: string): Promise<string> {
    const pixels = await sharp(buf).ensureAlpha().raw().toBuffer()
    const result = findAccentColor(pixels, w, h, genre)
    return `#${result.r.toString(16).padStart(2, "0")}${result.g.toString(16).padStart(2, "0")}${result.b.toString(16).padStart(2, "0")}`
  }

  const thumbBuf = await sharp(posterBuf).resize(200, 300, { fit: "cover" }).toBuffer()

  // Crop to target region for more focused color extraction
  let posterAnalysisBuf = thumbBuf
  const posterW = 200
  let posterH = 300
  if (region === 'bottom') {
    posterH = 120  // bottom 40%
    posterAnalysisBuf = await sharp(thumbBuf)
      .extract({ left: 0, top: 180, width: 200, height: posterH })
      .toBuffer()
  } else if (region === 'top') {
    posterH = 120  // top 40%
    posterAnalysisBuf = await sharp(thumbBuf)
      .extract({ left: 0, top: 0, width: 200, height: posterH })
      .toBuffer()
  }

  const [posterColor, logoColor] = await Promise.all([
    extractFrom(posterAnalysisBuf, posterW, posterH, fallbackGenre || ""),
    logoBuf ? (async () => {
      const meta = await sharp(logoBuf).metadata()
      return extractFrom(logoBuf, meta.width || 200, meta.height || 100, "")
    })() : Promise.resolve(""),
  ])

  if (posterColor && logoColor) {
    const pr = parseInt(posterColor.slice(1, 3), 16)
    const pg = parseInt(posterColor.slice(3, 5), 16)
    const pb = parseInt(posterColor.slice(5, 7), 16)
    const lr = parseInt(logoColor.slice(1, 3), 16)
    const lg = parseInt(logoColor.slice(3, 5), 16)
    const lb = parseInt(logoColor.slice(5, 7), 16)
    return `#${Math.round((pr + lr) / 2).toString(16).padStart(2, "0")}${Math.round((pg + lg) / 2).toString(16).padStart(2, "0")}${Math.round((pb + lb) / 2).toString(16).padStart(2, "0")}`
  }

  return posterColor || logoColor || (fallbackGenre ? (GENRE_FALLBACK[fallbackGenre] || "#555555") : "#555555")
}