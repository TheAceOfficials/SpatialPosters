import crypto from "node:crypto"
import { NextRequest } from "next/server"
import { APP_VERSION } from "@/generated/app-version"
import { PICTORIUM_CATALOGS, PICTORIUM_PEOPLE_SEARCH_CATALOGS } from "@/lib/catalog-definitions"
import { getOriginFromRequest } from "@/lib/poster-public-url"
import { decodeConfig, type PictoriumUserConfig } from "@/lib/config-token"
import { normalizeCatalogIdKeys, normalizeCatalogIdList } from "@/lib/catalog-definitions"
import { getServerDefaults } from "@/lib/server-defaults"
import { getRegionDef, normalizeRegion, parseRegion, type RegionDef } from "@/lib/regions"

const MOVIE_GENRES = [
  "All", "Action", "Adventure", "Animation", "Comedy", "Crime",
  "Documentary", "Drama", "Family", "Fantasy", "History", "Horror",
  "Music", "Mystery", "Romance", "Sci-Fi", "Thriller", "War", "Western",
]

const SERIES_GENRES = [
  "All", "Action & Adventure", "Animation", "Comedy", "Crime",
  "Documentary", "Drama", "Family", "Kids", "Mystery", "News",
  "Reality", "Sci-Fi & Fantasy", "Soap", "Talk", "War & Politics", "Western",
]

const ANIME_GENRES = [
  "All", "Action", "Action & Adventure", "Adventure", "Animation",
  "Comedy", "Drama", "Fantasy", "Mystery", "Romance", "Sci-Fi", "Sci-Fi & Fantasy", "Thriller",
]

function getCatalogGenreOptions(type: "movie" | "series", catalogId: string): string[] {
  if (catalogId.includes("anime") || catalogId.includes("crunchyroll")) return ANIME_GENRES
  return type === "movie" ? MOVIE_GENRES : SERIES_GENRES
}

/** Name of Top 20 / New Releases JustWatch catalogs in active language/region. */
function regionJwName(id: string, type: "movie" | "series", region: RegionDef): string | null {
  if (id.startsWith("pictorium-jw-new-")) {
    return `${region.flag} New Releases ${region.label} — ${type === "movie" ? "Movies" : "TV Shows"}`
  }
  if (!id.startsWith("pictorium-jw-")) return null
  return `${region.flag} Top 20 ${region.label} — ${type === "movie" ? "Movies" : "TV Shows"}`
}

function safeSuffix(value: string | null | undefined): string | null {
  if (!value) return null
  return crypto.createHash("sha256").update(value).digest("base64url").slice(0, 8)
}

export async function buildManifestResponse(req: NextRequest, user?: string | null, config?: string | null): Promise<Response> {
  const domain = getOriginFromRequest(req)

  let userConfig: Partial<PictoriumUserConfig> | null = null
  if (config) {
    userConfig = decodeConfig(config)
  }
  if (!userConfig) {
    const serverDefaults = getServerDefaults()
    userConfig = {
      disabledCatalogIds: serverDefaults.disabledCatalogIds,
      homeDisabledCatalogIds: serverDefaults.homeDisabledCatalogIds,
      customCatalogs: serverDefaults.customCatalogs,
      catalogRenames: serverDefaults.catalogRenames,
      catalogOrder: serverDefaults.catalogOrder,
    }
  }

  // Config salvate prima del rename possono contenere ID `posterium-*`:
  // normalizza al canonico `pictorium-*` così esclusioni/ordini/rinomine restano validi.
  if (userConfig) {
    userConfig.disabledCatalogIds = normalizeCatalogIdList(userConfig.disabledCatalogIds)
    userConfig.homeDisabledCatalogIds = normalizeCatalogIdList(userConfig.homeDisabledCatalogIds)
    userConfig.catalogOrder = normalizeCatalogIdList(userConfig.catalogOrder)
    userConfig.catalogRenames = normalizeCatalogIdKeys(userConfig.catalogRenames)
  }
  let catalogs: Array<{ id: string; name: string; type: "movie" | "series"; customBaseId?: string }> = [...PICTORIUM_CATALOGS]
  if (userConfig?.disabledCatalogIds && userConfig.disabledCatalogIds.length > 0) {
    const disabledSet = new Set(userConfig.disabledCatalogIds)
    catalogs = catalogs.filter(c => !disabledSet.has(c.id))
  }
  if (userConfig?.customCatalogs && userConfig.customCatalogs.length > 0) {
    for (const cc of userConfig.customCatalogs) {
      if (cc.enabled !== false) {
        if (cc.type === "mixed") {
          catalogs.push({
            id: `pictorium-custom-movie-${cc.id}`,
            name: `${cc.name} — Film`,
            type: "movie",
            customBaseId: cc.id,
          })
          catalogs.push({
            id: `pictorium-custom-series-${cc.id}`,
            name: `${cc.name} — Serie TV`,
            type: "series",
            customBaseId: cc.id,
          })
        } else {
          catalogs.push({
            id: `pictorium-custom-${cc.type}-${cc.id}`,
            name: cc.name,
            type: cc.type,
            customBaseId: cc.id,
          })
        }
      }
    }
  }

  // Regione manifest: config-token > default server > IT. I cataloghi Top 20
  // JustWatch mostrano bandiera/nome del paese attivo (le rinomine utente vincono).
  const manifestRegion = getRegionDef(parseRegion(userConfig?.region) ?? normalizeRegion(getServerDefaults().region))

  // Applica rinomine personalizzate dei cataloghi + nomi regione per i Top 20 JW
  catalogs = catalogs.map((cat) => {
    const customName = userConfig?.catalogRenames?.[cat.id]
    if (customName && customName.trim()) {
      return { ...cat, name: customName.trim() }
    }
    const jwName = regionJwName(cat.id, cat.type, manifestRegion)
    if (jwName) return { ...cat, name: jwName }
    return cat
  })

  // Applica ordinamento / priorità personalizzata
  if (userConfig?.catalogOrder && userConfig.catalogOrder.length > 0) {
    const orderMap = new Map<string, number>()
    userConfig.catalogOrder.forEach((id: string, idx: number) => orderMap.set(id, idx))
    catalogs.sort((a, b) => {
      const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999
      const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999
      return orderA - orderB
    })
  }

  const rawMode = req.nextUrl.searchParams.get("mode")
  const hubMode: "all" | "catalogs" | "search" = (rawMode === "search" || rawMode === "catalogs" || rawMode === "all")
    ? rawMode
    : (userConfig?.hubMode || "all")

  const safeConfig = safeSuffix(config || user)
  const suffix = safeConfig ? `.${safeConfig}` : ""
  const modeSuffix = hubMode === "all" ? "" : `.${hubMode}`
  const addonId = `org.pictorium${suffix}${modeSuffix}`

  const homeDisabledSet = new Set(userConfig?.homeDisabledCatalogIds || [])

  const contentCatalogs = catalogs.map((c) => {
    const isHomeHidden = homeDisabledSet.has(c.id) || (c.customBaseId ? homeDisabledSet.has(c.customBaseId) : false)
    const genreOptions = getCatalogGenreOptions(c.type, c.id)
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      extra: isHomeHidden
        ? [{ name: "genre", isRequired: true, options: genreOptions }, { name: "skip", isRequired: false }]
        : [{ name: "genre", isRequired: false, options: genreOptions }, { name: "skip", isRequired: false }],
    }
  })

  const searchCatalogs = [
    {
      id: "pictorium-search-movies",
      name: "🔍 SpatialPosters — Search Movies",
      type: "movie" as const,
      extra: [{ name: "search", isRequired: true }, { name: "skip", isRequired: false }],
    },
    {
      id: "pictorium-search-series",
      name: "🔍 SpatialPosters — Search TV Shows",
      type: "series" as const,
      extra: [{ name: "search", isRequired: true }, { name: "skip", isRequired: false }],
    },
  ]

  const peopleSearchCatalogs = PICTORIUM_PEOPLE_SEARCH_CATALOGS.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    extra: [{ name: "search", isRequired: true }, { name: "skip", isRequired: false }] as const,
  }))

  let manifestCatalogs: typeof contentCatalogs = []
  if (hubMode === "search") {
    manifestCatalogs = [...searchCatalogs, ...peopleSearchCatalogs] as typeof contentCatalogs
  } else if (hubMode === "catalogs") {
    manifestCatalogs = contentCatalogs
  } else {
    manifestCatalogs = [...contentCatalogs, ...searchCatalogs, ...peopleSearchCatalogs] as typeof contentCatalogs
  }

  const ID_PREFIXES = [
    "tmdb:",
    "tt",
    "tvdb:",
    "tvdbc:",
    "kitsu:",
    "mal:",
    "anilist:",
    "anidb:",
  ]

  const TYPES = ["movie", "series", "anime.movie", "anime.series", "anime", "Trakt", "collection"]

  let manifestName = safeConfig ? `SpatialPosters (${safeConfig})` : "SpatialPosters"
  if (hubMode === "search") {
    manifestName += " (Search)"
  } else if (hubMode === "catalogs") {
    manifestName += " (Catalogs)"
  }

  return Response.json({
    id: addonId,
    version: APP_VERSION,
    name: manifestName,
    description: "Custom poster manager for Stremio — logos, trend badges, ratings & awards",
    resources: [
      "catalog",
      "poster",
      {
        name: "meta",
        types: TYPES,
        idPrefixes: ID_PREFIXES,
      },
    ],
    types: TYPES,
    idPrefixes: ID_PREFIXES,
    logo: `${domain}/App.png`,
    addonCatalogs: [],
    manifestVersion: 1,
    behaviorHints: {
      adult: false,
      configurable: true,
      configurationRequired: false,
      configurationUrl: user ? `${domain}/u/${encodeURIComponent(user)}/configure` : (config ? `${domain}/c/${encodeURIComponent(config)}/configure` : `${domain}/configure`),
    },
    catalogs: manifestCatalogs,
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache, max-age=0, must-revalidate",
    },
  })
}
