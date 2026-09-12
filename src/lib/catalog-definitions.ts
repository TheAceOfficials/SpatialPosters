export const CATALOG_ID_PREFIX = "spatial-"
export const LEGACY_PICTORIUM_PREFIX = "pictorium-"
export const LEGACY_POSTERIUM_PREFIX = "posterium-"

export type SpatialCatalogType = "movie" | "series"

export type SpatialCatalogDefinition = {
  readonly id: string
  readonly name: string
  readonly type: SpatialCatalogType
}

export const SPATIALPOSTERS_CATALOGS: readonly SpatialCatalogDefinition[] = [
  { id: "pictorium-jw-movies", name: "📈 Top 20 Film", type: "movie" },
  { id: "pictorium-jw-series", name: "📈 Top 20 Serie TV", type: "series" },
  { id: "pictorium-jw-new-movies", name: "🆕 Nuove Uscite Film", type: "movie" },
  { id: "pictorium-jw-new-series", name: "🆕 Nuove Uscite Serie TV", type: "series" },
  { id: "pictorium-netflix-movies", name: "🔴 Netflix — Film", type: "movie" },
  { id: "pictorium-netflix-series", name: "🔴 Netflix — Serie TV", type: "series" },
  { id: "pictorium-prime-movies", name: "📦 Prime Video — Film", type: "movie" },
  { id: "pictorium-prime-series", name: "📦 Prime Video — Serie TV", type: "series" },
  { id: "pictorium-disney-movies", name: "✨ Disney+ — Film", type: "movie" },
  { id: "pictorium-disney-series", name: "✨ Disney+ — Serie TV", type: "series" },
  { id: "pictorium-apple-movies", name: "🍏 Apple TV+ — Film", type: "movie" },
  { id: "pictorium-apple-series", name: "🍏 Apple TV+ — Serie TV", type: "series" },
  { id: "pictorium-hbo-movies", name: "🟣 HBO Max — Film", type: "movie" },
  { id: "pictorium-hbo-series", name: "🟣 HBO Max — Serie TV", type: "series" },
  { id: "pictorium-paramount-movies", name: "🏔️ Paramount+ — Film", type: "movie" },
  { id: "pictorium-paramount-series", name: "🏔️ Paramount+ — Serie TV", type: "series" },
  { id: "pictorium-crunchyroll-series", name: "🍥 Crunchyroll — Anime & Serie", type: "series" },
  { id: "pictorium-crunchyroll-movies", name: "🍥 Crunchyroll — Film Anime", type: "movie" },
  { id: "pictorium-anime-movies", name: "⛩️ Top 20 Film Anime", type: "movie" },
  { id: "pictorium-anime", name: "⛩️ Top 20 Serie Anime", type: "series" },
] as const

export type StremioCatalogExtra = {
  readonly name: string
  readonly isRequired?: boolean
  readonly options?: readonly string[]
}

export type SpatialManifestCatalog = {
  id: string
  name: string
  type: SpatialCatalogType
  extra?: readonly StremioCatalogExtra[]
}

export const SPATIALPOSTERS_SEARCH_CATALOGS = [
  { id: "pictorium-search-movies", name: "🔍 SpatialPosters — Search Movies", type: "movie" },
  { id: "pictorium-search-series", name: "🔍 SpatialPosters — Search TV Shows", type: "series" },
] as const satisfies readonly SpatialCatalogDefinition[]

export const SPATIALPOSTERS_PEOPLE_SEARCH_CATALOGS = [
  { id: "pictorium-search-people-movies", name: "🔍 SpatialPosters — Search by Person (Movies)", type: "movie" },
  { id: "pictorium-search-people-series", name: "🔍 SpatialPosters — Search by Person (TV Shows)", type: "series" },
] as const satisfies readonly SpatialCatalogDefinition[]

export const WARMUP_CATALOG_IDS = [
  "pictorium-jw-movies",
  "pictorium-jw-series",
  "pictorium-netflix-movies",
  "pictorium-netflix-series",
  "pictorium-prime-movies",
  "pictorium-prime-series",
  "pictorium-anime-movies",
  "pictorium-anime",
] as const

const WARMUP_CATALOG_ID_SET: ReadonlySet<string> = new Set(WARMUP_CATALOG_IDS)

export function getWarmupCatalogs(): readonly SpatialCatalogDefinition[] {
  return SPATIALPOSTERS_CATALOGS.filter((catalog) => WARMUP_CATALOG_ID_SET.has(catalog.id))
}

/**
 * Normalizza un ID catalogo: gli ID legacy `posterium-*` / `pictorium-*` (addon già installati,
 * config salvate, localStorage) vengono mappati al formato canonico.
 */
export function normalizeCatalogId(id: string): string {
  if (id.startsWith(LEGACY_POSTERIUM_PREFIX)) {
    return `pictorium-${id.slice(LEGACY_POSTERIUM_PREFIX.length)}`
  }
  return id
}

/** Normalizza una lista di ID catalogo (disabled/order); `undefined` passa invariato. */
export function normalizeCatalogIdList(ids: readonly string[] | undefined): string[] | undefined {
  if (!ids) return undefined
  return ids.map(normalizeCatalogId)
}

/**
 * Normalizza le chiavi di un record indicizzato per ID catalogo (renames);
 * `undefined`/`null` passano invariati.
 */
export function normalizeCatalogIdKeys(record: Record<string, string> | undefined | null): Record<string, string> | undefined {
  if (!record) return undefined
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(record)) out[normalizeCatalogId(k)] = v
  return out
}

// Export aliases for backward compatibility across existing codebase and tests
export type PictoriumCatalogType = SpatialCatalogType
export type PictoriumCatalogDefinition = SpatialCatalogDefinition
export type PictoriumManifestCatalog = SpatialManifestCatalog
export const PICTORIUM_CATALOGS = SPATIALPOSTERS_CATALOGS
export const PICTORIUM_SEARCH_CATALOGS = SPATIALPOSTERS_SEARCH_CATALOGS
export const PICTORIUM_PEOPLE_SEARCH_CATALOGS = SPATIALPOSTERS_PEOPLE_SEARCH_CATALOGS
export const POSTERIUM_CATALOGS = SPATIALPOSTERS_CATALOGS
export const POSTERIUM_SEARCH_CATALOGS = SPATIALPOSTERS_SEARCH_CATALOGS
export const POSTERIUM_PEOPLE_SEARCH_CATALOGS = SPATIALPOSTERS_PEOPLE_SEARCH_CATALOGS
