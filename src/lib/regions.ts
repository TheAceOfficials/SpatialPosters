/**
 * Regione paese per le classifiche JustWatch + FlixPatrol.
 *
 * JustWatch GraphQL vuole il `Country` ISO maiuscolo ("IT"), FlixPatrol vuole
 * lo slug minuscolo ("italy"), TMDB vuole il locale ("it-IT" — i titoli seguono
 * la regione: eng → titoli eng, france → titoli franc, ecc.).
 * Questo modulo è l'unica sorgente di verità per il mapping.
 */

export const DEFAULT_REGION = "US" as const

export interface RegionDef {
  /** Codice JustWatch / ISO (usato anche come chiave canonica). */
  readonly code: string
  /** Slug FlixPatrol (`SUPPORTED_COUNTRIES` in flixpatrol.ts). */
  readonly flixSlug: string
  /** Locale TMDB + lingua query JustWatch. */
  readonly lang: string
  /**
   * Lingua UI a 2 lettere (stato `lang` dell'app, `preferred_lang`).
   * Solo it/en/fr/de/es hanno un dizionario UI completo — ja/ko/pt/he
   * ripiegano sull'inglese in `i18n.lookup` per le stringhe `ui.*` (he ha
   * badge/award tradotti), mentre i contenuti TMDB seguono `lang`.
   */
  readonly lang2: string
  /** Nome lingua in lingua nativa (per il selettore lingua). */
  readonly languageName: string
  /** Nome italiano per manifest/UI. */
  readonly label: string
  readonly flag: string
}

export const REGIONS: readonly RegionDef[] = [
  { code: "IT", flixSlug: "italy", lang: "it-IT", lang2: "it", languageName: "Italiano", label: "Italia", flag: "🇮🇹" },
  { code: "US", flixSlug: "united-states", lang: "en-US", lang2: "en", languageName: "English", label: "USA", flag: "🇺🇸" },
  { code: "GB", flixSlug: "united-kingdom", lang: "en-GB", lang2: "en", languageName: "English", label: "Regno Unito", flag: "🇬🇧" },
  { code: "FR", flixSlug: "france", lang: "fr-FR", lang2: "fr", languageName: "Français", label: "Francia", flag: "🇫🇷" },
  { code: "DE", flixSlug: "germany", lang: "de-DE", lang2: "de", languageName: "Deutsch", label: "Germania", flag: "🇩🇪" },
  { code: "ES", flixSlug: "spain", lang: "es-ES", lang2: "es", languageName: "Español", label: "Spagna", flag: "🇪🇸" },
  { code: "MX", flixSlug: "mexico", lang: "es-MX", lang2: "es", languageName: "Español (México)", label: "Messico", flag: "🇲🇽" },
  { code: "IL", flixSlug: "israel", lang: "he-IL", lang2: "he", languageName: "עברית", label: "Israele", flag: "🇮🇱" },
  { code: "JP", flixSlug: "japan", lang: "ja-JP", lang2: "ja", languageName: "日本語", label: "Giappone", flag: "🇯🇵" },
  { code: "KR", flixSlug: "south-korea", lang: "ko-KR", lang2: "ko", languageName: "한국어", label: "Corea del Sud", flag: "🇰🇷" },
  { code: "BR", flixSlug: "brazil", lang: "pt-BR", lang2: "pt", languageName: "Português", label: "Brasile", flag: "🇧🇷" },
  { code: "IN", flixSlug: "india", lang: "en-IN", lang2: "en", languageName: "English", label: "India", flag: "🇮🇳" },
  { code: "CA", flixSlug: "canada", lang: "en-CA", lang2: "en", languageName: "English", label: "Canada", flag: "🇨🇦" },
  { code: "AU", flixSlug: "australia", lang: "en-AU", lang2: "en", languageName: "English", label: "Australia", flag: "🇦🇺" },
] as const

const BY_CODE = new Map(REGIONS.map((r) => [r.code, r]))
const BY_FLIX_SLUG = new Map(REGIONS.map((r) => [r.flixSlug, r]))

/**
 * Parsa un input libero (codice "us"/"US", slug "united-states", con o senza
 * spazi/case) in un codice regione canonico. Ritorna null se sconosciuto
 * (fail-closed: il chiamante ripiega su DEFAULT_REGION, mai su fetch arbitrari).
 */
export function parseRegion(input: string | null | undefined): string | null {
  if (!input) return null
  const t = input.trim()
  if (!t) return null
  const upper = t.toUpperCase()
  if (BY_CODE.has(upper)) return upper
  const lower = t.toLowerCase()
  const bySlug = BY_FLIX_SLUG.get(lower)
  if (bySlug) return bySlug.code
  return null
}

/** Come parseRegion ma non ritorna mai null (fallback DEFAULT_REGION). */
export function normalizeRegion(input: string | null | undefined): string {
  return parseRegion(input) ?? DEFAULT_REGION
}

export function getRegionDef(code: string | null | undefined): RegionDef {
  return BY_CODE.get(normalizeRegion(code))!
}

/** Slug FlixPatrol per un codice regione (canonico, sempre valido). */
export function regionToFlixSlug(code: string | null | undefined): string {
  return getRegionDef(code).flixSlug
}

/** Codice JustWatch (= codice canonico) per uno slug FlixPatrol; null se fuori da quelli supportati. */
export function flixSlugToRegionCode(slug: string): string | null {
  return BY_FLIX_SLUG.get(slug)?.code ?? null
}

export function isSupportedRegionCode(code: string): boolean {
  return BY_CODE.has(code.toUpperCase())
}

/** Lingue UI selezionabili (2 lettere, una per nazionalità del picker). */
export const SUPPORTED_UI_LANGS: readonly string[] = [
  ...new Set(REGIONS.map((r) => r.lang2)),
]

export function isSupportedUiLang(code: string | null | undefined): boolean {
  return !!code && (SUPPORTED_UI_LANGS as readonly string[]).includes(code.toLowerCase())
}

/** Voce del selettore lingua per una regione: bandiera + paese + lingua. */
export function regionLangOption(regionCode: string): { key: string; lang: string; flag: string; name: string; sub: string } {
  const r = getRegionDef(regionCode)
  return { key: r.code, lang: r.lang2, flag: r.flag, name: `${r.label} · ${r.languageName}`, sub: r.lang2.toUpperCase() }
}

/**
 * Restituisce la regione predefinita per una lingua UI (es. "fr" -> "FR", "it" -> "IT", "de" -> "DE").
 * Se `currentRegion` appartiene già alla stessa famiglia linguistica (es. "GB" con lingua "en"), la mantiene.
 */
export function defaultRegionForLang(lang: string | null | undefined, currentRegion?: string | null): string | null {
  if (!lang) return null
  const l = lang.toLowerCase().trim()
  if (currentRegion) {
    const cur = getRegionDef(currentRegion)
    if (cur && cur.lang2 === l) return cur.code
  }
  const found = REGIONS.find((r) => r.lang2 === l)
  return found?.code ?? null
}
