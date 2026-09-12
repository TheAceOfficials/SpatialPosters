const TEXT_SAFE_PAD = 1.15
const GENRE_TEXT_MAX_RATIO = 0.84
const GENRE_PILL_MAX_RATIO = 0.78
const GENRE_FONT_WEIGHT = 600
const RANKING_FONT_WEIGHT = 700

export function genreBadgeSafePad(fs: number): number {
  return Math.round(fs * TEXT_SAFE_PAD)
}

export function genrePillMaxW(containerW: number): number {
  return Math.min(containerW - 20, Math.round(containerW * GENRE_PILL_MAX_RATIO))
}

export function genreTextMaxW(containerW: number): number {
  return Math.min(containerW - 20, Math.round(containerW * GENRE_TEXT_MAX_RATIO))
}

export function escSvg(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** Ebraico (blocco base + presentation forms). */
const HEBREW_RE = /[\u0590-\u05FF\uFB1D-\uFB4F]/

/**
 * Famiglia da dichiarare per un testo di badge. Inter non ha glifi ebraici:
 * resvg li recupera per-glifo da Rubik (presente nel fontdb, vedi lib/fonts),
 * ma quel fallback ignora il `font-weight` richiesto e ripiega sempre sul
 * regular — un badge in grassetto verrebbe reso sottile. Dichiarando "Rubik"
 * quando il testo contiene ebraico il peso torna corretto.
 *
 * Per i testi latini ritorna "Inter": l'SVG emesso resta byte-identico a
 * prima, quindi gli snapshot visivi non si muovono.
 */
export function fontFamilyFor(text: string): string {
  return HEBREW_RE.test(text) ? "Rubik" : "Inter"
}

function charWidthFactor(char: string): number {
  if (char === " ") return 0.33
  // Rubik: le lettere ebraiche hanno avanzamento ~0.55em, uniforme (niente
  // maiuscole/minuscole). Col default 0.62 la stima sforava del ~12% e
  // `lengthAdjust="spacingAndGlyphs"` allargava visibilmente i glifi.
  if (HEBREW_RE.test(char)) return 0.55
  if ("iIl.,:;!'|`".includes(char)) return 0.28
  if ("-–_".includes(char)) return 0.36
  if ("fjrt".includes(char.toLowerCase())) return 0.45
  if ("mw".includes(char.toLowerCase())) return 0.86
  if ("#%&@".includes(char)) return 0.75
  if (/\d/.test(char)) return 0.58
  if (/[A-Z]/.test(char)) return 0.68
  return 0.62
}

export function estimateTextWidth(text: string, fs: number): number {
  let units = 0
  for (const char of text) units += charWidthFactor(char)
  return Math.round(Math.max(units * fs, fs * 0.35))
}

function textFitAttrs(width: number): string {
  return ` textLength="${Math.max(Math.round(width), 1)}" lengthAdjust="spacingAndGlyphs"`
}

type GenreBadgeText = {
  readonly genreName: string
  readonly voteStr: string
  readonly yearStr: string
}

/**
 * Quali componenti del badge genere/rating mostrare. Default tutti ON:
 * con tutte le parti attive l'output SVG \u00e8 byte-identico al precedente
 * "genere \u2022 \u2605 voto \u2022 anno" (i test di regressione visiva non cambiano).
 */
export interface GenreParts {
  readonly showGenre?: boolean
  readonly showYear?: boolean
  readonly showRating?: boolean
}

function normalizeParts(parts?: GenreParts): Required<GenreParts> {
  return {
    showGenre: parts?.showGenre ?? true,
    showYear: parts?.showYear ?? true,
    showRating: parts?.showRating ?? true,
  }
}

type GenreTextFlowArgs = GenreBadgeText & {
  readonly fs: number
  readonly centerX: number
  readonly y: number
  readonly textColor?: string
  readonly starBase64?: string
  readonly parts?: GenreParts
}

export function genreBadgeSvgDims(fs: number, genreName: string, voteStr: string, yearStr: string, parts?: GenreParts) {
  const opts = normalizeParts(parts)
  const gap = Math.round(fs / 3)
  const gapStar = Math.round(fs / 6)
  const bulletW = Math.round(fs * 0.35)
  const starW = Math.round(fs * 0.85)
  const genreW = (opts.showGenre && genreName) ? estimateTextWidth(genreName, fs) : 0
  const voteW = (opts.showRating && voteStr) ? estimateTextWidth(voteStr, fs) : 0
  const yearW = (opts.showYear && yearStr) ? estimateTextWidth(yearStr, fs) : 0
  const buf = Math.round(fs * 0.25)
  // Segmenti condizionali separati da gap+bullet+gap.
  const segGenre = genreW > 0 ? 1 : 0
  const segRating = voteW > 0 ? 1 : 0
  const segYear = yearW > 0 ? 1 : 0
  const segCount = segGenre + segRating + segYear
  const textContentW = segCount > 0
    ? (genreW + (segRating ? starW + gapStar + voteW : 0) + yearW) + (segCount - 1) * (gap + bulletW + gap)
    : 0
  const totalW = textContentW + buf
  const svgH = Math.max(Math.round(fs * 1.6), 24)
  return { starW, gap, gapStar, totalW, svgH, genreW, voteW, yearW, bulletW, textContentW }
}

function buildGenreTextFlow({ genreName, voteStr, yearStr, fs, centerX, y, textColor = "rgba(255, 255, 255, 0.68)", starBase64, parts }: GenreTextFlowArgs) {
  const opts = normalizeParts(parts)
  const dims = genreBadgeSvgDims(fs, genreName, voteStr, yearStr, opts)
  const starDy = Math.max(2, Math.round(fs * 0.14))
  const hasGenre = opts.showGenre && !!genreName
  const hasRating = opts.showRating && !!voteStr
  const hasYear = opts.showYear && !!yearStr

  if (starBase64) {
    if (!hasGenre && !hasRating && !hasYear) return ""
    const startX = centerX - dims.textContentW / 2
    let curX = startX
    const elements: string[] = []

    if (hasGenre) {
      elements.push(`<text x="${Math.round(curX)}" y="${y}" text-anchor="start" dominant-baseline="central" font-family="${fontFamilyFor(genreName)}" font-weight="${GENRE_FONT_WEIGHT}" font-size="${fs}">${escSvg(genreName)}</text>`)
      curX += dims.genreW
      if (hasRating || hasYear) {
        curX += dims.gap
        elements.push(`<text x="${Math.round(curX)}" y="${y}" text-anchor="start" dominant-baseline="central" font-family="Inter" font-weight="${GENRE_FONT_WEIGHT}" font-size="${fs}" fill-opacity="0.6">•</text>`)
        curX += dims.bulletW + dims.gap
      }
    }

    if (hasRating) {
      const starH = Math.round(fs * 0.85)
      const starY = Math.round(y - starH / 2)
      elements.push(`<image href="data:image/png;base64,${starBase64}" x="${Math.round(curX)}" y="${starY}" width="${dims.starW}" height="${starH}"/>`)
      curX += dims.starW + dims.gapStar

      elements.push(`<text x="${Math.round(curX)}" y="${y}" text-anchor="start" dominant-baseline="central" font-family="${fontFamilyFor(voteStr)}" font-weight="${GENRE_FONT_WEIGHT}" font-size="${fs}">${escSvg(voteStr)}</text>`)
      curX += dims.voteW

      if (hasYear) {
        curX += dims.gap
        elements.push(`<text x="${Math.round(curX)}" y="${y}" text-anchor="start" dominant-baseline="central" font-family="Inter" font-weight="${GENRE_FONT_WEIGHT}" font-size="${fs}" fill-opacity="0.6">•</text>`)
        curX += dims.bulletW + dims.gap
      }
    }

    if (hasYear) {
      elements.push(`<text x="${Math.round(curX)}" y="${y}" text-anchor="start" dominant-baseline="central" font-family="${fontFamilyFor(yearStr)}" font-weight="${GENRE_FONT_WEIGHT}" font-size="${fs}">${escSvg(yearStr)}</text>`)
    }

    return elements.join("")
  }

  const bullet = (dx: number) => `<tspan dx="${dx}" fill-opacity="0.6">${escSvg("\u2022")}</tspan>`
  const tspan: string[] = []
  const starGapDx = hasGenre ? dims.gap : 0
  const yearGapDx = (hasGenre || hasRating) ? dims.gap : 0
  if (hasGenre) {
    tspan.push(`<tspan>${escSvg(genreName)}</tspan>`)
    if (hasRating || hasYear) tspan.push(bullet(dims.gap))
  }
  if (hasRating) {
    tspan.push(`<tspan dx="${starGapDx}" dy="${starDy}" font-family="Noto Sans Symbols 2" font-weight="400" fill="${textColor}">${escSvg("\u2605")}</tspan>`)
    tspan.push(`<tspan dx="${dims.gapStar}" dy="${-starDy}">${escSvg(voteStr)}</tspan>`)
    if (hasYear) tspan.push(bullet(dims.gap))
  }
  if (hasYear) {
    tspan.push(`<tspan dx="${yearGapDx}">${escSvg(yearStr)}</tspan>`)
  }
  const separators = (hasGenre ? 1 : 0) + (hasRating ? 1 : 0) + (hasYear ? 1 : 0) - 1
  const totalDx = separators * dims.gap * 2 + (hasRating ? dims.gapStar : 0)
  const adjustedX = centerX - totalDx / 2
  let t = `<text x="${adjustedX}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="${fontFamilyFor(genreName)}" font-weight="${GENRE_FONT_WEIGHT}" font-size="${fs}"${textFitAttrs(dims.textContentW)}>`
  t += tspan.join("")
  t += "</text>"
  return t
}

export function buildGenreBarSvg(genreName: string, voteStr: string, yearStr: string, pw: number, fs: number, textColor: string, topLight: boolean, textOffsetX = 0, parts?: GenreParts, starBase64?: string) {
  const barPad = Math.round(fs * 0.5)
  const barH = fs + barPad * 2
  const barR = Math.round(fs * 0.7)
  const barShadowOff = Math.max(Math.round(barH * 0.2), 3)
  const barShadowBlur = Math.max(Math.round(barH * 0.5), 8)
  const textParts = buildGenreTextFlow({ genreName, voteStr, yearStr, fs, centerX: pw / 2 + textOffsetX, y: barH / 2, textColor, starBase64, parts })
  const pathD = `M 0,${barH} L 0,${barR} A ${barR},${barR} 0 0,1 ${barR},0 L ${pw - barR},0 A ${barR},${barR} 0 0,1 ${pw},${barR} L ${pw},${barH} Z`
  const defs = `<defs><filter id="sh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="-${barShadowOff}" stdDeviation="${barShadowBlur / 2}" flood-color="rgba(0,0,0,0.3)"/></filter></defs>`
  const textEl = `<g fill="${textColor}">${textParts}</g>`
  const borderLine = `<line x1="0" y1="0" x2="${pw}" y2="0" stroke="rgba(0,0,0,0.10)" stroke-width="1"/>`
  const inner = `<path d="${pathD}" fill="rgba(255,255,255,0.80)" filter="url(#sh)"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${barH}">${defs}${inner}${borderLine}${textEl}</svg>`, w: pw, h: barH }
}

export function buildGenrePillSvg(genreName: string, voteStr: string, yearStr: string, fs: number, bgColor: string, textColor: string, textOffsetX = 0, parts?: GenreParts, starBase64?: string) {
  const pillPad = Math.round(fs * 0.35)
  const safePad = genreBadgeSafePad(fs)
  const pillR = Math.round(fs * 0.8)
  const dims = genreBadgeSvgDims(fs, genreName, voteStr, yearStr, parts)
  const pillW = dims.textContentW + pillPad * 3 + safePad * 2
  const pillH = fs + pillPad * 2
  const textParts = buildGenreTextFlow({ genreName, voteStr, yearStr, fs, centerX: pillW / 2 + textOffsetX, y: pillH / 2, textColor, starBase64, parts })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pillW}" height="${pillH}"><rect width="${pillW}" height="${pillH}" rx="${pillR}" fill="${bgColor}" stroke="rgba(255,255,255,0.18)" stroke-width="1"/><g fill="${textColor}">${textParts}</g></svg>`
  return { svg, w: pillW, h: pillH }
}

export function buildGenreTextSvg(genreName: string, voteStr: string, yearStr: string, fs: number, textColor: string, style: string, textOffsetX = 0, parts?: GenreParts, starBase64?: string) {
  const dims = genreBadgeSvgDims(fs, genreName, voteStr, yearStr, parts)
  const shadowPad = style === "shadow" ? 8 : 0
  const shadowDrop = style === "shadow" ? 5 : 0
  const safePad = genreBadgeSafePad(fs)
  const renderW = dims.totalW + shadowPad * 2 + safePad * 2
  const renderH = dims.svgH + shadowDrop
  const textParts = buildGenreTextFlow({ genreName, voteStr, yearStr, fs, centerX: renderW / 2 + textOffsetX, y: shadowDrop + dims.svgH / 2, textColor, starBase64, parts })
  let defs = ""
  let filterAttr = ""
  if (style === "shadow") {
    defs = `<defs><filter id="sh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="rgba(0,0,0,0.8)"/><feDropShadow dx="0" dy="5" stdDeviation="4.5" flood-color="rgba(0,0,0,0.55)"/></filter></defs>`
    filterAttr = ' filter="url(#sh)"'
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}">${defs}<g fill="${textColor}"${filterAttr}>${textParts}</g></svg>`
  return { svg, w: renderW, h: renderH }
}

export function buildGenreBorderedSvg(genreName: string, voteStr: string, yearStr: string, fs: number, textColor: string, topLight: boolean, textOffsetX = 0, parts?: GenreParts, starBase64?: string) {
  const dims = genreBadgeSvgDims(fs, genreName, voteStr, yearStr, parts)
  const safePad = genreBadgeSafePad(fs)
  const borderPad = Math.max(Math.round(fs * 0.4), 6)
  const borderW = 2
  const renderW = dims.textContentW + borderPad * 2 + safePad * 2
  const rectH = dims.svgH
  const renderH = rectH
  const r = Math.round(fs * 0.55)
  const borderColor = topLight ? "rgba(0,0,0,0.50)" : "rgba(255,255,255,0.60)"
  const bgFill = topLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)"
  const textParts = buildGenreTextFlow({ genreName, voteStr, yearStr, fs, centerX: renderW / 2 + textOffsetX, y: rectH / 2, textColor, starBase64, parts })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}"><rect x="${borderW / 2}" y="${borderW / 2}" width="${renderW - borderW}" height="${rectH - borderW}" rx="${r}" fill="${bgFill}" stroke="${borderColor}" stroke-width="${borderW}"/><g fill="${textColor}">${textParts}</g></svg>`
  return { svg, w: renderW, h: renderH }
}

export function buildGenreGlassSvg(genreName: string, voteStr: string, yearStr: string, fs: number, textColor: string, topLight: boolean, textOffsetX = 0, parts?: GenreParts, starBase64?: string) {
  const dims = genreBadgeSvgDims(fs, genreName, voteStr, yearStr, parts)
  const safePad = genreBadgeSafePad(fs)
  const glassPad = Math.max(Math.round(fs * 0.45), 8)
  const renderW = dims.textContentW + glassPad * 2 + safePad * 2
  const rectH = dims.svgH
  const renderH = rectH + Math.round(fs * 0.2)
  const r = Math.round(fs * 0.6)
  // iOS liquid glass — multi-stop gradient: bright top edge → frosted body → bottom depth
  const stops = topLight
    ? `<stop offset="0%" stop-color="rgba(255,255,255,0.92)"/><stop offset="12%" stop-color="rgba(255,255,255,0.55)"/><stop offset="50%" stop-color="rgba(255,255,255,0.32)"/><stop offset="100%" stop-color="rgba(0,0,0,0.08)"/>`
    : `<stop offset="0%" stop-color="rgba(255,255,255,0.45)"/><stop offset="10%" stop-color="rgba(255,255,255,0.14)"/><stop offset="50%" stop-color="rgba(255,255,255,0.07)"/><stop offset="100%" stop-color="rgba(0,0,0,0.35)"/>`
  const borderColor = topLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)"
  const textParts = buildGenreTextFlow({ genreName, voteStr, yearStr, fs, centerX: renderW / 2 + textOffsetX, y: rectH / 2, textColor, starBase64, parts })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}"><defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient></defs><rect width="${renderW}" height="${rectH}" rx="${r}" fill="url(#gg)" stroke="${borderColor}" stroke-width="1.5"/><g fill="${textColor}">${textParts}</g></svg>`
  return { svg, w: renderW, h: renderH }
}

export function buildRankingBarSvg(fullText: string, pw: number, fs: number, textColor: string, bg: string) {
  const pt = Math.round(fs * 0.35)
  const pb = pt
  const svgH = fs + pt + pb
  const textW = estimateTextWidth(fullText, fs)
  const r = Math.round(fs * 0.7)
  const shadowBlur = Math.round(fs * 0.6)
  const shadowOff = Math.round(fs * 0.2)
  const pathD = `M 0,0 L ${pw},0 L ${pw},${svgH - r} A ${r},${r} 0 0,1 ${pw - r},${svgH} L ${r},${svgH} A ${r},${r} 0 0,1 0,${svgH - r} Z`
  const defs = `<defs><filter id="ds" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="${shadowOff}" stdDeviation="${shadowBlur / 2}" flood-color="rgba(0,0,0,0.3)"/></filter></defs>`
  const textEl = `<text x="${pw / 2}" y="${svgH / 2}" text-anchor="middle" dominant-baseline="central" font-family="${fontFamilyFor(fullText)}" font-weight="${RANKING_FONT_WEIGHT}" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(fullText)}</text>`
  const inner = `<path d="${pathD}" fill="${bg}" filter="url(#ds)"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${svgH}">${defs}${inner}${textEl}</svg>`, w: pw, h: svgH }
}

export function buildRankingDefaultSvg(fullText: string, fs: number, textColor: string, bg: string) {
  const px = Math.round(fs * 1.0)
  const pt = Math.round(fs * 0.5)
  const pb = pt
  const textW = estimateTextWidth(fullText, fs)
  const totalW = textW + px * 2
  const svgH = fs + pt + pb
  const r = Math.round(fs * 0.7)
  const shadowBlur = Math.round(fs * 0.6)
  const shadowOff = Math.round(fs * 0.2)
  const renderW = totalW + shadowBlur * 2
  const renderH = svgH + shadowOff + shadowBlur
  const ox = shadowBlur
  const oy = 0
  const pathD = `M ${ox},${oy} L ${ox + totalW},${oy} L ${ox + totalW},${oy + svgH - r} A ${r},${r} 0 0,1 ${ox + totalW - r},${oy + svgH} L ${ox + r},${oy + svgH} A ${r},${r} 0 0,1 ${ox},${oy + svgH - r} Z`
  const centerX = ox + totalW / 2
  const centerY = oy + svgH / 2
  const defs = `<defs><filter id="ds" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="rgba(0,0,0,0.6)"/><feDropShadow dx="0" dy="${shadowOff}" stdDeviation="${shadowBlur / 2}" flood-color="rgba(0,0,0,0.35)"/></filter></defs>`
  const textEl = `<text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="central" font-family="${fontFamilyFor(fullText)}" font-weight="${RANKING_FONT_WEIGHT}" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(fullText)}</text>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}">${defs}<path d="${pathD}" fill="${bg}" stroke="rgba(255,255,255,0.15)" stroke-width="1" filter="url(#ds)"/>${textEl}</svg>`, w: renderW, h: renderH }
}

export function buildRankingPillSvg(fullText: string, fs: number, textColor: string, bg: string) {
  const px = Math.round(fs * 0.75)
  const pt = Math.round(fs * 0.35)
  const pb = pt
  const textW = Math.max(estimateTextWidth(fullText, fs), fs)
  const totalW = textW + px * 2
  const svgH = fs + pt + pb
  const r = svgH / 2
  const renderW = totalW
  const ox = 0
  const oy = 0
  const textEl = `<text x="${renderW / 2}" y="${svgH / 2}" text-anchor="middle" dominant-baseline="central" font-family="${fontFamilyFor(fullText)}" font-weight="700" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(fullText)}</text>`
  const bgEl = `<rect x="${ox}" y="${oy}" width="${totalW}" height="${svgH}" rx="${r}" fill="${bg}" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${svgH}">${bgEl}${textEl}</svg>`, w: renderW, h: svgH }
}

export function buildRankingGlassSvg(fullText: string, fs: number, textColor: string, _bg: string, topLight: boolean) {
  const px = Math.round(fs * 1.0)
  const pt = Math.round(fs * 0.4)
  const pb = pt
  const textW = Math.max(estimateTextWidth(fullText, fs), fs)
  const totalW = textW + px * 2
  const rectH = fs + pt + pb
  const r = Math.round(fs * 0.6)
  const renderW = totalW
  const renderH = rectH + Math.round(fs * 0.2)
  // iOS liquid glass — multi-stop gradient
  const stops = topLight
    ? `<stop offset="0%" stop-color="rgba(255,255,255,0.92)"/><stop offset="12%" stop-color="rgba(255,255,255,0.55)"/><stop offset="50%" stop-color="rgba(255,255,255,0.32)"/><stop offset="100%" stop-color="rgba(0,0,0,0.08)"/>`
    : `<stop offset="0%" stop-color="rgba(255,255,255,0.45)"/><stop offset="10%" stop-color="rgba(255,255,255,0.14)"/><stop offset="50%" stop-color="rgba(255,255,255,0.07)"/><stop offset="100%" stop-color="rgba(0,0,0,0.35)"/>`
  const borderColor = topLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)"
  const textEl = `<text x="${renderW / 2}" y="${rectH / 2}" text-anchor="middle" dominant-baseline="central" font-family="${fontFamilyFor(fullText)}" font-weight="700" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(fullText)}</text>`
  const defs = `<defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient></defs>`
  const bgEl = `<rect x="0" y="0" width="${totalW}" height="${rectH}" rx="${r}" fill="url(#rg)" stroke="${borderColor}" stroke-width="1.5"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}">${defs}${bgEl}${textEl}</svg>`, w: renderW, h: renderH }
}

export function buildRankingBorderedSvg(fullText: string, fs: number, textColor: string, topLight: boolean) {
  const px = Math.round(fs * 1.0)
  const pt = Math.round(fs * 0.45)
  const pb = pt
  const textW = Math.max(estimateTextWidth(fullText, fs), fs)
  const totalW = textW + px * 2
  const svgH = fs + pt + pb
  const r = Math.round(fs * 0.55)
  const renderW = totalW
  const borderW = 2
  const borderColor = topLight ? "rgba(0,0,0,0.50)" : "rgba(255,255,255,0.60)"
  const bgFill = topLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)"
  const textEl = `<text x="${renderW / 2}" y="${svgH / 2}" text-anchor="middle" dominant-baseline="central" font-family="${fontFamilyFor(fullText)}" font-weight="700" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(fullText)}</text>`
  const bgEl = `<rect x="${borderW / 2}" y="${borderW / 2}" width="${renderW - borderW}" height="${svgH - borderW}" rx="${r}" fill="${bgFill}" stroke="${borderColor}" stroke-width="${borderW}"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${svgH}">${bgEl}${textEl}</svg>`, w: renderW, h: svgH }
}

export function buildExtraBarSvg(label: string, pw: number, fs: number, textColor: string, bg: string) {
  const pt = Math.round(fs * 0.35)
  const pb = pt
  const svgH = fs + pt + pb
  const textW = Math.max(estimateTextWidth(label, fs), fs)
  const r = Math.round(fs * 0.7)
  const shadowBlur = Math.round(fs * 0.6)
  const shadowOff = Math.round(fs * 0.2)
  const pathD = `M 0,0 L ${pw},0 L ${pw},${svgH - r} A ${r},${r} 0 0,1 ${pw - r},${svgH} L ${r},${svgH} A ${r},${r} 0 0,1 0,${svgH - r} Z`
  const defs = `<defs><filter id="ds" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="${shadowOff}" stdDeviation="${shadowBlur / 2}" flood-color="rgba(0,0,0,0.3)"/></filter></defs>`
  const textEl = `<text x="${pw / 2}" y="${svgH / 2}" text-anchor="middle" dominant-baseline="central" font-family="${fontFamilyFor(label)}" font-weight="700" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(label)}</text>`
  const inner = `<path d="${pathD}" fill="${bg}" filter="url(#ds)"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${svgH}">${defs}${inner}${textEl}</svg>`, w: pw, h: svgH }
}

export function buildExtraDefaultSvg(label: string, fs: number, textColor: string, bg: string) {
  const px = Math.round(fs * 1.0)
  const pt = Math.round(fs * 0.5)
  const pb = pt
  const textW = Math.max(estimateTextWidth(label, fs), fs)
  const totalW = textW + px * 2
  const svgH = fs + pt + pb
  const r = Math.round(fs * 0.7)
  const shadowBlur = Math.round(fs * 0.6)
  const shadowOff = Math.round(fs * 0.2)
  const renderW = totalW + shadowBlur * 2
  const renderH = svgH + shadowOff + shadowBlur
  const ox = shadowBlur
  const oy = 0
  const pathD = `M ${ox},${oy} L ${ox + totalW},${oy} L ${ox + totalW},${oy + svgH - r} A ${r},${r} 0 0,1 ${ox + totalW - r},${oy + svgH} L ${ox + r},${oy + svgH} A ${r},${r} 0 0,1 ${ox},${oy + svgH - r} Z`
  const centerX = ox + totalW / 2
  const centerY = oy + svgH / 2
  const defs = `<defs><filter id="ds" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="rgba(0,0,0,0.6)"/><feDropShadow dx="0" dy="${shadowOff}" stdDeviation="${shadowBlur / 2}" flood-color="rgba(0,0,0,0.35)"/></filter></defs>`
  const textEl = `<text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="central" font-family="${fontFamilyFor(label)}" font-weight="700" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(label)}</text>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}">${defs}<path d="${pathD}" fill="${bg}" stroke="rgba(255,255,255,0.15)" stroke-width="1" filter="url(#ds)"/>${textEl}</svg>`, w: renderW, h: renderH }
}

export function buildExtraPillSvg(label: string, fs: number, textColor: string, bg: string) {
  const px = Math.round(fs * 1.0)
  const pt = Math.round(fs * 0.4)
  const pb = pt
  const textW = Math.max(estimateTextWidth(label, fs), fs)
  const totalW = textW + px * 2
  const svgH = fs + pt + pb
  const r = svgH / 2
  const renderW = totalW
  const textEl = `<text x="${renderW / 2}" y="${svgH / 2}" text-anchor="middle" dominant-baseline="central" font-family="${fontFamilyFor(label)}" font-weight="700" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(label)}</text>`
  const bgEl = `<rect x="0" y="0" width="${totalW}" height="${svgH}" rx="${r}" fill="${bg}" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${svgH}">${bgEl}${textEl}</svg>`, w: renderW, h: svgH }
}

export function buildExtraGlassSvg(label: string, fs: number, textColor: string, _bg: string, topLight: boolean) {
  const px = Math.round(fs * 1.0)
  const pt = Math.round(fs * 0.4)
  const pb = pt
  const textW = Math.max(estimateTextWidth(label, fs), fs)
  const totalW = textW + px * 2
  const rectH = fs + pt + pb
  const r = Math.round(fs * 0.6)
  const renderW = totalW
  const renderH = rectH + Math.round(fs * 0.2)
  // iOS liquid glass — multi-stop gradient
  const stops = topLight
    ? `<stop offset="0%" stop-color="rgba(255,255,255,0.92)"/><stop offset="12%" stop-color="rgba(255,255,255,0.55)"/><stop offset="50%" stop-color="rgba(255,255,255,0.32)"/><stop offset="100%" stop-color="rgba(0,0,0,0.08)"/>`
    : `<stop offset="0%" stop-color="rgba(255,255,255,0.45)"/><stop offset="10%" stop-color="rgba(255,255,255,0.14)"/><stop offset="50%" stop-color="rgba(255,255,255,0.07)"/><stop offset="100%" stop-color="rgba(0,0,0,0.35)"/>`
  const borderColor = topLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)"
  const textEl = `<text x="${renderW / 2}" y="${rectH / 2}" text-anchor="middle" dominant-baseline="central" font-family="${fontFamilyFor(label)}" font-weight="700" font-size="${fs}" fill="${textColor}"${textFitAttrs(textW)}>${escSvg(label)}</text>`
  const defs = `<defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient></defs>`
  const bgEl = `<rect x="0" y="0" width="${totalW}" height="${rectH}" rx="${r}" fill="url(#eg)" stroke="${borderColor}" stroke-width="1.5"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${renderW}" height="${renderH}">${defs}${bgEl}${textEl}</svg>`, w: renderW, h: renderH }
}

export function buildNetflixRankSvg(rank: number, pw: number) {
  const fs = Math.round(Math.max(23 * pw / 380, 14))
  const w = Math.round(fs * 2.4)
  const h = Math.round(fs * 2.0)
  const cut = Math.round(fs * 0.35)
  const topFs = Math.round(fs * 0.5)
  const rankFs = Math.round(fs * 1.0)
  const pathD = `M ${cut},0 L ${w},0 L ${w},${h} L 0,${h} L 0,${cut} Z`
  const textEl = `<text x="${w / 2}" y="${Math.round(h * 0.38)}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="${topFs}" fill="#ffffff">TOP</text><text x="${w / 2}" y="${Math.round(h * 0.72)}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="900" font-size="${rankFs}" fill="#ffffff">${rank}</text>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><clipPath id="nf"><path d="${pathD}"/></clipPath></defs><g clip-path="url(#nf)"><rect width="${w}" height="${h}" rx="2" fill="#E50914"/></g>${textEl}</svg>`
  return { svg, w, h }
}

export function buildQualityBadgeSvg(quality: string, fs: number, _textColor: string, _bg: string, topLight: boolean = false) {
  // Pill con funzionamento identico al badge grande: bianco→testo nero, nero→testo bianco
  const px = Math.round(fs * 0.75)
  const pt = Math.round(fs * 0.35)
  const textW = Math.max(estimateTextWidth(quality, fs), fs)
  const totalW = textW + px * 2
  const svgH = fs + pt * 2
  const r = Math.round(svgH / 2)
  const bg = topLight ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.80)"
  const stroke = topLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.20)"
  const fg = topLight ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.88)"
  const textEl = `<text x="${totalW / 2}" y="${svgH / 2}" text-anchor="middle" dominant-baseline="central" font-family="${fontFamilyFor(quality)}" font-weight="700" font-size="${fs}" fill="${fg}"${textFitAttrs(textW)}>${escSvg(quality)}</text>`
  const bgEl = `<rect width="${totalW}" height="${svgH}" rx="${r}" fill="${bg}" stroke="${stroke}" stroke-width="1"/>`
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${svgH}">${bgEl}${textEl}</svg>`, w: totalW, h: svgH }
}

