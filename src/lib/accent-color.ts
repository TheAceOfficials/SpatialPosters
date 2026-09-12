import { GENRE_FALLBACK } from "./badges"

export interface AccentResult { r: number; g: number; b: number }

/** sRGB linearization per componente [0,255] → [0,1] */
function linearize(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

/** Luminanza relativa sRGB (WCAG) */
function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/** Rapporto di contrasto WCAG tra due luminanze */
function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Sceglie il colore testo con miglior contrasto WCAG.
 * Valuta colore chiaro (`dark`) e scuro (`light`) contro lo sfondo.
 */
export function textColorForBg(hex: string, dark: string = "#ffffff", light: string = "rgba(0,0,0,0.80)"): string {
  if (!hex || hex === "#555555") return light
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const bgLum = relativeLuminance(r, g, b)

  const best = [dark, light]
    .map((textColor) => {
      const [tr, tg, tb, ta] = parseColor(textColor)
      const effectiveR = ta < 1 ? Math.round(tr * ta + r * (1 - ta)) : tr
      const effectiveG = ta < 1 ? Math.round(tg * ta + g * (1 - ta)) : tg
      const effectiveB = ta < 1 ? Math.round(tb * ta + b * (1 - ta)) : tb
      const textLum = relativeLuminance(effectiveR, effectiveG, effectiveB)
      return { color: textColor, ratio: contrastRatio(textLum, bgLum) }
    })
    .sort((a, b) => b.ratio - a.ratio)[0]

  return best.color
}

/** Parsea "#rrggbb" o "rgba(r,g,b,a)" restituendo [r,g,b,alpha]. Hex: alpha=1 */
function parseColor(color: string): [number, number, number, number] {
  if (color.startsWith("#")) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
        1,
      ]
    }
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
      1,
    ]
  }
  const match = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/)
  if (match) {
    return [
      parseInt(match[1]),
      parseInt(match[2]),
      parseInt(match[3]),
      match[4] !== undefined ? parseFloat(match[4]) : 1,
    ]
  }
  return [0, 0, 0, 1]
}

/** Approssimazione hue veloce da RGB normalizzati [0,1], risultato [0, 360) */
function fastHue(r: number, g: number, b: number, d: number, max: number): number {
  if (d === 0) return 0
  let h: number
  if (max === r) h = 60 * ((g - b) / d)
  else if (max === g) h = 60 * (2 + (b - r) / d)
  else h = 60 * (4 + (r - g) / d)
  return h < 0 ? h + 360 : h
}

/** Convert HSL to RGB (H: 0-360, S: 0-1, L: 0-1) */
function hslToRgb(H: number, S: number, L: number): AccentResult {
  const c = (1 - Math.abs(2 * L - 1)) * S
  const x = c * (1 - Math.abs((H / 60) % 2 - 1))
  const m = L - c / 2
  let r1 = 0, g1 = 0, b1 = 0
  if (H < 60) { r1 = c; g1 = x }
  else if (H < 120) { r1 = x; g1 = c }
  else if (H < 180) { r1 = 0; g1 = c; b1 = x }
  else if (H < 240) { r1 = 0; g1 = x; b1 = c }
  else if (H < 300) { r1 = x; g1 = 0; b1 = c }
  else { r1 = c; g1 = 0; b1 = x }
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  }
}

export function findAccentColor(pixels: Uint8ClampedArray | Uint8Array | Buffer, width: number, height: number, genre: string): AccentResult {
  const step = 2
  let sumR = 0, sumG = 0, sumB = 0, countLuma = 0

  // 12 hue buckets (30° each)
  const buckets = Array.from({ length: 12 }, () => ({
    count: 0,
    totalSat: 0,
    totalLum: 0,
    hueSin: 0,
    hueCos: 0,
    rSum: 0,
    gSum: 0,
    bSum: 0,
  }))
  let totalVibrantWeight = 0

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      const pr = pixels[i], pg = pixels[i + 1], pb = pixels[i + 2]
      const alpha = pixels[i + 3]
      if (alpha < 128) continue

      sumR += pr; sumG += pg; sumB += pb
      countLuma++

      const r = pr / 255, g = pg / 255, b = pb / 255
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      const l = (max + min) / 2, d = max - min
      const s = d === 0 ? 0 : (l > 0.5 ? d / (2 - max - min) : d / (max + min))

      // Skip non-vibrant monochrome pixels (grays/blacks/whites)
      if (s < 0.12 || l < 0.08 || l > 0.94) continue

      const hue = fastHue(r, g, b, d, max)
      const bucketIdx = Math.floor(hue / 30) % 12
      const bkt = buckets[bucketIdx]

      // Weight favors vibrant colors (title logos, high-saturation highlights)
      const weight = Math.pow(s, 1.5) * (1 - Math.abs(l - 0.5) * 1.2)
      bkt.count += weight
      bkt.totalSat += s * weight
      bkt.totalLum += l * weight
      bkt.hueSin += Math.sin(hue * Math.PI / 180) * weight
      bkt.hueCos += Math.cos(hue * Math.PI / 180) * weight
      bkt.rSum += pr * weight
      bkt.gSum += pg * weight
      bkt.bSum += pb * weight
      totalVibrantWeight += weight
    }
  }

  // Fallback for monochrome / flat posters -> genre fallback color adjusted for contrast
  if (totalVibrantWeight < 0.5) {
    const fb = GENRE_FALLBACK[genre] || '#E0A96D'
    const cr = parseInt(fb.slice(1, 3), 16)
    const cg = parseInt(fb.slice(3, 5), 16)
    const cb = parseInt(fb.slice(5, 7), 16)
    const avgRawLum = countLuma > 0 ? (0.2126 * (sumR / countLuma) + 0.7152 * (sumG / countLuma) + 0.0722 * (sumB / countLuma)) / 255 : 0.5
    return pushContrast({ r: cr, g: cg, b: cb }, avgRawLum)
  }

  // Find most vibrant hue bucket with highest total weight
  let bestBucket = buckets[0]
  for (const bkt of buckets) {
    if (bkt.count > bestBucket.count) bestBucket = bkt
  }

  // Calculate actual dominant hue of poster's vibrant elements
  const posterHue = ((Math.atan2(bestBucket.hueSin, bestBucket.hueCos) * 180 / Math.PI) % 360 + 360) % 360
  const avgSat = bestBucket.totalSat / bestBucket.count
  const avgLum = bestBucket.totalLum / bestBucket.count

  // Keep vivid saturation (0.65 to 0.90) for poppiness
  const vibrantSat = Math.min(0.92, Math.max(0.65, avgSat * 1.2))

  // Calibrate lightness by color family so badges are rich and readable:
  let vibrantLum = avgLum
  if (posterHue >= 35 && posterHue <= 65) {
    // Yellow / Gold (e.g. Avatar logo): keep bright for sharp yellow look
    vibrantLum = Math.max(0.48, Math.min(0.62, avgLum))
  } else if (posterHue >= 80 && posterHue <= 160) {
    // Green (e.g. Ted logo): keep rich emerald / lime tone
    vibrantLum = Math.max(0.42, Math.min(0.55, avgLum))
  } else {
    // Red, Orange, Blue, Violet, Cyan: keep rich pop color
    vibrantLum = Math.max(0.45, Math.min(0.58, avgLum))
  }

  const result = hslToRgb(posterHue, vibrantSat, vibrantLum)
  result.r = Math.max(0, Math.min(255, result.r))
  result.g = Math.max(0, Math.min(255, result.g))
  result.b = Math.max(0, Math.min(255, result.b))
  return result
}

/**
 * Binary-search for the HSL lightness value that achieves the target WCAG
 * contrast ratio against bgRelLum, while staying in a visually pleasant range.
 * - Dark background (bgRelLum < 0.18) → we search for a lighter badge color
 * - Light background (bgRelLum ≥ 0.18) → we search for a darker badge color
 */
function findContrastingLightness(H: number, S: number, bgRelLum: number, targetContrast: number): number {
  const wantLight = bgRelLum < 0.18

  let lo = wantLight ? 0.45 : 0.05
  let hi = wantLight ? 0.95 : 0.50
  let bestL = wantLight ? 0.80 : 0.30

  for (let iter = 0; iter < 18; iter++) {
    const mid = (lo + hi) / 2
    const rgb = hslToRgb(H, S, mid)
    const lum = relativeLuminance(rgb.r, rgb.g, rgb.b)
    const contrast = contrastRatio(lum, bgRelLum)

    if (contrast >= targetContrast) {
      bestL = mid
      // Achieved contrast — try a less extreme value for elegance
      if (wantLight) hi = mid
      else lo = mid
    } else {
      // Need more contrast — push more extreme
      if (wantLight) lo = mid
      else hi = mid
    }
  }

  // Guard: stay off pure white/black
  return Math.max(0.18, Math.min(0.92, bestL))
}

/**
 * Spinge la luminanza del colore nella direzione opposta allo sfondo,
 * in modo che il badge sia ben visibile (fallback per poster monocromatici).
 */
function pushContrast(color: AccentResult, bgLum: number): AccentResult {
  let { r, g, b } = color
  const currentLum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

  // Transizione fluida: da bgLum 0.5 nessuna spinta, a bgLum 0.0/1.0 spinta massima
  const contrastNeeded = (bgLum - 0.5) * 2  // -1 (scuro) a +1 (chiaro)
  const rawTarget = 0.53 - contrastNeeded * 0.35  // 0.88 (sfondo scuro) a 0.18 (sfondo chiaro)
  const targetLum = Math.max(0.15, Math.min(0.88, rawTarget))

  const diff = targetLum - currentLum
  if (Math.abs(diff) < 0.02) return { r, g, b }  // già vicino al target

  const pushStrength = 0.65
  const blendedLum = currentLum + diff * pushStrength
  const scale = Math.max(0.15, Math.min(
    blendedLum / Math.max(currentLum, 0.001),
    255 / Math.max(r, g, b, 1),
  ))

  r = Math.min(255, Math.max(0, Math.round(r * scale)))
  g = Math.min(255, Math.max(0, Math.round(g * scale)))
  b = Math.min(255, Math.max(0, Math.round(b * scale)))

  return { r, g, b }
}

export function topEdgeAverage(pixels: Uint8ClampedArray | Uint8Array | Buffer, width: number, height: number): { r: number; g: number; b: number } {
  const rowCount = Math.max(Math.round(height * 0.08), 3)
  let r = 0, g = 0, b = 0, n = 0
  for (let y = 0; y < rowCount; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]
      n++
    }
  }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
}
