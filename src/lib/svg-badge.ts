import fs from "fs"
import path from "path"
import { textColorForBg } from "./accent-color"
import { FONT_FILES, FONT_INTER_REGULAR, FONT_INTER_BOLD, FONT_INTER_BLACK, FONT_SYMBOLS } from "./fonts"
import { estimateTextWidth, fontFamilyFor, genreBadgeSafePad, genreBadgeSvgDims, genrePillMaxW, buildGenreBarSvg, buildGenrePillSvg, buildGenreTextSvg, buildGenreBorderedSvg, buildGenreGlassSvg, buildRankingBarSvg, buildRankingDefaultSvg, buildRankingPillSvg, buildExtraBarSvg, buildExtraDefaultSvg, buildExtraPillSvg, buildExtraGlassSvg, buildQualityBadgeSvg, escSvg } from "./badge-svg-shared"
import type { GenreParts } from "./badge-svg-shared"
import type { BadgeStyle, RankingBadgeStyle, ExtraBadgeStyle } from "./badge-styles"

const starBase64Cache = new Map<string, string>()

function parseColorToRgb(colorStr: string): { r: number; g: number; b: number; alpha: number } {
  const str = colorStr.trim().toLowerCase()
  if (str.startsWith("rgba(")) {
    const parts = str.slice(5, -1).split(",").map((s) => parseFloat(s.trim()))
    return { r: parts[0] ?? 209, g: parts[1] ?? 213, b: parts[2] ?? 219, alpha: parts[3] ?? 1 }
  }
  if (str.startsWith("rgb(")) {
    const parts = str.slice(4, -1).split(",").map((s) => parseFloat(s.trim()))
    return { r: parts[0] ?? 209, g: parts[1] ?? 213, b: parts[2] ?? 219, alpha: 1 }
  }
  if (str.startsWith("#")) {
    let hex = str.slice(1)
    if (hex.length === 3) {
      hex = hex.split("").map((c) => c + c).join("")
    }
    const num = parseInt(hex, 16)
    if (!isNaN(num)) {
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
        alpha: 1,
      }
    }
  }
  return { r: 209, g: 213, b: 219, alpha: 1 }
}

export async function getRecoloredStarBase64(textColor: string, targetH: number): Promise<string> {
  const cacheKey = `${textColor}:${targetH}`
  const cached = starBase64Cache.get(cacheKey)
  if (cached) return cached

  const starPath = path.join(process.cwd(), "public", "icon", "star.png")
  if (!fs.existsSync(starPath)) return ""

  try {
    const sharp = (await import("sharp")).default
    const starBuffer = await fs.promises.readFile(starPath)
    const colorObj = parseColorToRgb(textColor)

    const resizedStar = await sharp(starBuffer)
      .resize(targetH, targetH, { fit: "contain" })
      .png()
      .toBuffer()

    const meta = await sharp(resizedStar).metadata()
    const w = meta.width || targetH
    const h = meta.height || targetH

    const solid = await sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: colorObj,
      },
    }).png().toBuffer()

    const recolored = await sharp(solid)
      .composite([{ input: resizedStar, blend: "dest-in" }])
      .png()
      .toBuffer()

    const b64 = recolored.toString("base64")
    starBase64Cache.set(cacheKey, b64)
    return b64
  } catch (e) {
    console.warn("[svg-badge] Failed to recolor star icon:", e)
    return ""
  }
}


let _regular: Buffer | null = null
let _bold: Buffer | null = null
let _black: Buffer | null = null
let _symbols: Buffer | null = null
let _b64Regular: string | null = null
let _b64Bold: string | null = null
let _b64Black: string | null = null
let _b64Symbols: string | null = null
let _fontsWarmed = false

export function warmFonts(): void {
  if (_fontsWarmed) return
  try {
    fontRegular(); fontBold(); fontBlack(); fontSymbols()
    fontStyle()
    _fontsWarmed = true
  } catch (e) {
    console.warn("[pictorium] Font warming failed:", e instanceof Error ? e.message : String(e))
  }
}

function fontRegular(): Buffer {
  if (!_regular) _regular = fs.readFileSync(FONT_INTER_REGULAR)
  return _regular
}
function fontBold(): Buffer {
  if (!_bold) _bold = fs.readFileSync(FONT_INTER_BOLD)
  return _bold
}
function fontBlack(): Buffer {
  if (!_black) _black = fs.readFileSync(FONT_INTER_BLACK)
  return _black
}
function fontSymbols(): Buffer {
  if (!_symbols) _symbols = fs.readFileSync(FONT_SYMBOLS)
  return _symbols
}

function b64Regular(): string {
  if (!_b64Regular) _b64Regular = fontRegular().toString("base64")
  return _b64Regular
}
function b64Bold(): string {
  if (!_b64Bold) _b64Bold = fontBold().toString("base64")
  return _b64Bold
}
function b64Black(): string {
  if (!_b64Black) _b64Black = fontBlack().toString("base64")
  return _b64Black
}
function b64Symbols(): string {
  if (!_b64Symbols) _b64Symbols = fontSymbols().toString("base64")
  return _b64Symbols
}

let _cachedStyle: string | null = null
function fontStyle(): string {
  if (!_cachedStyle) {
    _cachedStyle = `<style>@font-face{font-family:'Inter';src:url(data:font/ttf;base64,${b64Regular()});font-weight:400;font-style:normal}@font-face{font-family:'Inter';src:url(data:font/ttf;base64,${b64Bold()});font-weight:700;font-style:normal}@font-face{font-family:'Inter';src:url(data:font/ttf;base64,${b64Black()});font-weight:900;font-style:normal}@font-face{font-family:'Noto Sans Symbols 2';src:url(data:font/ttf;base64,${b64Symbols()});font-weight:400;font-style:normal}</style>`
  }
  return _cachedStyle
}

function wrapSvg(svg: string): string {
  if (svg.includes("</defs>")) {
    return svg.replace("</defs>", `${fontStyle()}</defs>`)
  }
  if (svg.includes("</svg>")) {
    return svg.replace("</svg>", `${fontStyle()}</svg>`)
  }
  return svg.replace(/<svg /, `<svg >${fontStyle()}`)
}

let resvgModule: Promise<typeof import("@resvg/resvg-js")> | null = null
function loadResvg(): Promise<typeof import("@resvg/resvg-js")> {
  if (!resvgModule) {
    resvgModule = import("@resvg/resvg-js").catch((e) => {
      resvgModule = null
      throw e
    })
  }
  return resvgModule
}

export async function renderSVG(svgStr: string, w: number): Promise<Buffer> {
  const { Resvg } = await loadResvg()
  const resvg = new Resvg(svgStr, {
    fitTo: { mode: "width", value: w },
    font: {
      fontFiles: [...FONT_FILES],
      loadSystemFonts: false,
    },
  })
  return Buffer.from(resvg.render().asPng())
}

// --- Extra badge (custom text) ---

export async function buildExtraBadgeSVG(
  label: string,
  pw: number,
  topLight?: boolean,
  badgeStyle?: ExtraBadgeStyle,
  accentColor?: string,
): Promise<{ png: Buffer; w: number; h: number } | null> {
  const s = badgeStyle || "default"
  const maxBadgeW = pw - 20
  let finalFs = 16 * pw / 380
  const projectedW = estimateTextWidth(label, finalFs) + Math.round(finalFs * 2) + Math.round(finalFs * 0.6) * 2
  if (projectedW > maxBadgeW) {
    finalFs = Math.max(maxBadgeW / projectedW * finalFs, 10)
  }

  const fs = Math.round(finalFs)
  const isColored = s === "colored"
  const isGlass = s === "vetro"
  const coloredBg = isColored && accentColor && accentColor !== "#555555" ? accentColor : undefined
  const bg = coloredBg || (topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)")
  const fg = isColored
    ? textColorForBg(accentColor || "")
    : isGlass
      ? (topLight ? "rgba(0,0,0,0.80)" : "#ffffff")
      : (topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)")

  let result: { svg: string; w: number; h: number }
  if (s === "bar") {
    result = buildExtraBarSvg(label, pw, fs, fg, bg)
  } else if (s === "pill") {
    result = buildExtraPillSvg(label, fs, fg, bg)
  } else if (isGlass) {
    result = buildExtraGlassSvg(label, fs, fg, bg, !!topLight)
  } else {
    result = buildExtraDefaultSvg(label, fs, fg, bg)
  }
  const png = await renderSVG(wrapSvg(result.svg), result.w)
  return { png, w: result.w, h: result.h }
}

// --- Genre badge ---

export async function buildGenreBadgeSVG(
  genreName: string, voteAverage: number, pw: number,
  year?: string, style?: BadgeStyle, accentColor?: string, topLight?: boolean, parts?: GenreParts,
): Promise<{ png: Buffer; w: number; h: number } | null> {
  const s = style || "shadow"
  const voteStr = voteAverage ? voteAverage.toFixed(1) : ""
  const yearStr = year || ""

  let finalFs = 16.5 * pw / 380
  const aestheticMaxW = Math.round(pw * 0.86)
  let dims = genreBadgeSvgDims(finalFs, genreName, voteStr, yearStr, parts)
  let safePad = genreBadgeSafePad(finalFs)
  const extraShadowPad = style === "shadow" ? 8 : 0
  const estimatedRenderW = dims.totalW + safePad * 2 + extraShadowPad * 2
  if (estimatedRenderW > aestheticMaxW) {
    finalFs = Math.max(aestheticMaxW / estimatedRenderW * finalFs, 10)
    dims = genreBadgeSvgDims(finalFs, genreName, voteStr, yearStr, parts)
    safePad = genreBadgeSafePad(finalFs)
  }

  const isPillStyle = s === "pill" || s === "colored"
  if (isPillStyle) {
    const _pillPad = Math.round(finalFs * 0.35)
    const maxPillW = genrePillMaxW(pw)
    if (dims.textContentW + _pillPad * 3 + safePad * 2 > maxPillW) {
      finalFs = Math.max(maxPillW / (dims.textContentW + _pillPad * 3 + safePad * 2) * finalFs, 10)
      dims = genreBadgeSvgDims(finalFs, genreName, voteStr, yearStr, parts)
    }
  }
  let fs = Math.round(finalFs)
  const isPill = s === "pill" || s === "colored"
  const isBar = s === "bar"

  const textColor = s === "colored"
    ? textColorForBg(accentColor || "")
    : (isPill ? "rgba(0,0,0,0.80)" : "#D1D5DB")
  const bgColor = s === "colored"
    ? (accentColor && accentColor !== "#555555" ? accentColor : "rgba(255,255,255,0.80)")
    : (isPill ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)")

  const opts = parts ? { showGenre: parts.showGenre ?? true, showYear: parts.showYear ?? true, showRating: parts.showRating ?? true } : { showGenre: true, showYear: true, showRating: true }
  const starBase64 = (opts.showRating && voteStr) ? await getRecoloredStarBase64(textColor, Math.max(10, Math.round(fs * 0.85))) : ""

  let result: { svg: string; w: number; h: number }
  if (s === "bordo") {
    result = buildGenreBorderedSvg(genreName, voteStr, yearStr, fs, textColor, topLight ?? false, 0, parts, starBase64)
  } else if (s === "vetro") {
    result = buildGenreGlassSvg(genreName, voteStr, yearStr, fs, textColor, topLight ?? false, 0, parts, starBase64)
  } else if (isBar) {
    result = buildGenreBarSvg(genreName, voteStr, yearStr, pw, fs, "rgba(0,0,0,0.80)", !!topLight, 0, parts, starBase64)
  } else if (isPill) {
    result = buildGenrePillSvg(genreName, voteStr, yearStr, fs, bgColor, textColor, 0, parts, starBase64)
  } else {
    result = buildGenreTextSvg(genreName, voteStr, yearStr, fs, textColor, s, 0, parts, starBase64)
    let attempts = 0
    while (result.w > aestheticMaxW && attempts < 30) {
      const targetFs = Math.max(Math.round(fs * (aestheticMaxW - 16) / result.w), 10)
      if (targetFs >= fs) { fs = 10 } else { fs = targetFs }
      result = buildGenreTextSvg(genreName, voteStr, yearStr, fs, textColor, s, 0, parts, starBase64)
      attempts++
    }
  }
  const png = await renderSVG(wrapSvg(result.svg), result.w)
  return { png, w: result.w, h: result.h }
}

export async function renderGenreBadge(
  genreName: string, voteAverage: number, pw: number,
  year?: string, style?: BadgeStyle, accentColor?: string, topLight?: boolean, parts?: GenreParts,
): Promise<{ png: Buffer; w: number; h: number }> {
  const r = await buildGenreBadgeSVG(genreName, voteAverage, pw, year, style, accentColor, topLight, parts)
  if (r) return r
  throw new Error(`SVG genre badge failed: ${genreName}`)
}

// --- Ranking badge ---

// Testo sotto il numero del nastro Netflix. Per gli anime è l'etichetta fissa
// "anime" (stessa del passato); per film/serie è l'etichetta del rank (es.
// "Oggi", "Today") — stesso sistema del badge anime esteso a tutti i rank.
function netflixSubLabel(isAnime: boolean | undefined, label: string | undefined): string {
  if (label !== undefined && label !== "") return label
  return isAnime ? "anime" : ""
}

export function buildNetflixRankBadgeSVG(rank: number, pw: number, topLight: boolean, side: "left" | "right" = "left", isAnime?: boolean, label?: string) {
  const fs = Math.round(Math.max(23 * pw / 380, 14))
  const w = Math.round(fs * 2.6)
  // Sottotitolo presente (anime o film/serie con etichetta): nastro allungato
  // verso il basso (h × 1.55) per dare spazio alla scritta sotto il numero.
  const subLabel = netflixSubLabel(isAnime, label)
  const hasSub = subLabel.length > 0
  const h = Math.round(w * (hasSub ? 1.55 : 1.35))
  const slant = Math.round(w * 0.12)
  const topFs = Math.round(w * 0.26)
  const isDoubleDigit = rank >= 10
  const rankFs = Math.round(w * (isDoubleDigit ? 0.48 : 0.54))
  const rankLetterSpacing = isDoubleDigit ? "-1" : "0"
  const padRight = Math.round(fs * 0.4)
  const padBottom = Math.round(fs * 0.4)
  const totalW = w + padRight
  const totalH = h + padBottom

  // Sottotitolo sotto il numero: font proporzionale al nastro, auto-fit se
  // l'etichetta è più larga del nastro (es. traduzioni lunghe).
  let subFs = Math.round(w * 0.20)
  if (hasSub) {
    const maxSubW = Math.round(w * 0.90)
    const subW = estimateTextWidth(subLabel, subFs)
    if (subW > maxSubW) subFs = Math.max(Math.round(subFs * maxSubW / subW), 8)
  }
  const subPadBottom = hasSub ? Math.round(subFs * 0.6) : 0
  const totalHSub = totalH + subPadBottom

  // TOP, numero e sottotitolo impilati con la stessa distanza visiva.
  const topY = hasSub ? Math.round(h * 0.22) : Math.round(h * 0.26)
  const textGap = hasSub ? Math.round(Math.min(topFs, subFs) * 0.2) : 0
  const rankY = hasSub
    ? topY + Math.round(topFs / 2) + textGap + Math.round(rankFs / 2)
    : Math.round(h * 0.60)
  const subY = hasSub
    ? rankY + Math.round(rankFs / 2) + textGap + Math.round(subFs / 2)
    : 0

  // Stessa logica adattiva degli altri badge ranking (tlBg/tlFg):
  // top chiaro → nastro scuro con testo chiaro; top scuro → nastro chiaro con testo nero.
  const fill = topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"
  const textColor = topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)"

  const ribbonMidX = w / 2
  const ribbonVNotchY = Math.round(h * 0.88)

  // Nastro top-left (side="left", default): ancorato al bordo sinistro del poster,
  // lato sinistro dritto e destro inclinato. Modalità Stremio (side="right"): nastro
  // specchiato orizzontalmente, ancorato al bordo destro — lato destro dritto e
  // sinistro inclinato, con il pad (ombra) spostato a sinistra e ombra che cade a sinistra.
  const isRight = side === "right"
  const pathD = isRight
    ? `M ${totalW} 0 L ${padRight} 0 L ${padRight + slant} ${h} L ${totalW - ribbonMidX} ${ribbonVNotchY} L ${totalW} ${h} Z`
    : `M 0 0 L ${w} 0 L ${w - slant} ${h} L ${ribbonMidX} ${ribbonVNotchY} L 0 ${h} Z`
  const highlightX1 = isRight ? padRight : 0
  const highlightX2 = isRight ? totalW : w
  const textX = isRight ? totalW - ribbonMidX : ribbonMidX
  const shadowDx = isRight ? -3 : 3

  const subEl = hasSub
    ? `<text x="${textX}" y="${subY}" fill="${textColor}" font-family="${fontFamilyFor(subLabel)}" font-weight="700" font-size="${subFs}" text-anchor="middle" dominant-baseline="central" letter-spacing="0.6" filter="url(#textShadow)">${escSvg(subLabel)}</text>`
    : ""

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalHSub}" viewBox="0 0 ${totalW} ${totalHSub}">
    <defs>
      <filter id="shadow3D" x="-20%" y="-20%" width="180%" height="180%">
        <feDropShadow dx="${shadowDx}" dy="3" stdDeviation="3.5" flood-color="#000000" flood-opacity="0.65"/>
      </filter>
      <filter id="textShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="${shadowDx > 0 ? 0 : -1.5}" dy="1.5" stdDeviation="1" flood-color="#000000" flood-opacity="0.65"/>
      </filter>
    </defs>
    <path d="${pathD}" fill="${fill}" filter="url(#shadow3D)"/>
    <line x1="${highlightX1}" y1="1" x2="${highlightX2}" y2="1" stroke="rgba(255,255,255,0.4)" stroke-width="1.2"/>
    <text x="${textX}" y="${topY}" fill="${textColor}" font-family="Inter" font-weight="800" font-size="${topFs}" text-anchor="middle" dominant-baseline="central" letter-spacing="1" filter="url(#textShadow)">TOP</text>
    <text x="${textX}" y="${rankY}" fill="${textColor}" font-family="Inter" font-weight="900" font-size="${rankFs}" text-anchor="middle" dominant-baseline="central" letter-spacing="${rankLetterSpacing}" filter="url(#textShadow)">${rank}</text>
    ${subEl}
  </svg>`
  return { svg, w: totalW, h: totalHSub }
}

export async function buildRankingBadgeSVG(
  rank: number,
  pw: number,
  label?: string,
  topLight?: boolean,
  badgeStyle?: RankingBadgeStyle,
  accentColor?: string,
  side?: "left" | "right",
  isAnime?: boolean,
): Promise<{ png: Buffer; w: number; h: number } | null> {
  const s = badgeStyle || "default"
  const periodText = label || "Oggi"
  const fullText = `#${rank} ${periodText}`
  const maxBadgeW = pw - 20
  let finalFs = 20 * pw / 380
  const projectedW = estimateTextWidth(fullText, finalFs) + Math.round(finalFs * 2) + Math.round(finalFs * 0.6) * 2
  if (projectedW > maxBadgeW) {
    finalFs = Math.max(maxBadgeW / projectedW * finalFs, 10)
  }

  const fs = Math.round(finalFs)
  const isColored = s === "colored"
  const isNetflix = s === "netflix"
  const coloredBg = isColored && accentColor && accentColor !== "#555555" ? accentColor : undefined
  const bg = coloredBg || (topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)")
  const fg = isColored
    ? textColorForBg(accentColor || "")
    : (topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)")

  let result: { svg: string; w: number; h: number }
  if (isNetflix) {
    // Il nastro mostra l'etichetta sotto il numero: per gli anime è "anime",
    // per film/serie è il periodo del rank (es. "Oggi") — stesso sistema.
    result = buildNetflixRankBadgeSVG(rank, pw, !!topLight, side, isAnime, periodText)
  } else if (s === "bar") {
    result = buildRankingBarSvg(fullText, pw, fs, fg, bg)
  } else if (s === "pill") {
    result = buildRankingPillSvg(fullText, fs, fg, bg)
  } else {
    result = buildRankingDefaultSvg(fullText, fs, fg, bg)
  }
  const png = await renderSVG(wrapSvg(result.svg), result.w)
  return { png, w: result.w, h: result.h }
}

export async function renderRankingBadge(
  rank: number, pw: number, label?: string,
  topLight?: boolean, badgeStyle?: RankingBadgeStyle, accentColor?: string, side?: "left" | "right", isAnime?: boolean,
): Promise<{ png: Buffer; w: number; h: number }> {
  const r = await buildRankingBadgeSVG(rank, pw, label, topLight, badgeStyle, accentColor, side, isAnime)
  if (r) return r
  throw new Error(`SVG ranking badge failed: rank=${rank}`)
}

export async function renderExtraBadge(
  label: string, pw: number, topLight?: boolean,
  badgeStyle?: ExtraBadgeStyle, accentColor?: string,
): Promise<{ png: Buffer; w: number; h: number }> {
  const r = await buildExtraBadgeSVG(label, pw, topLight, badgeStyle, accentColor)
  if (r) return r
  throw new Error(`SVG extra badge failed: ${label}`)
}

export async function renderQualityBadge(
  quality: string,
  pw: number,
  topLight?: boolean,
): Promise<{ png: Buffer; w: number; h: number }> {
  const fs = Math.round(Math.max(16 * pw / 380, 11))
  const bg = topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"
  const fg = topLight ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.80)"
  const result = buildQualityBadgeSvg(quality, fs, fg, bg, !!topLight)
  const png = await renderSVG(wrapSvg(result.svg), result.w)
  return { png, w: result.w, h: result.h }
}

