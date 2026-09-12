"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import type { CustomCatalogConfig } from "./types"
import { SPATIALPOSTERS_CATALOGS } from "./catalog-definitions"

function getStoredWithFallback(safeGetItem: (key: string) => string | null, primaryKey: string, legacyKey1: string, legacyKey2?: string): string | null {
  const val = safeGetItem(primaryKey)
  if (val) return val
  const leg1 = safeGetItem(legacyKey1)
  if (leg1) return leg1
  if (legacyKey2) {
    const leg2 = safeGetItem(legacyKey2)
    if (leg2) return leg2
  }
  return null
}

export function useCustomCatalogs(
  safeGetItem: (key: string) => string | null,
  safeSetItem: (key: string, val: string) => void
) {
  const [customCatalogs, setCustomCatalogsState] = useState<CustomCatalogConfig[]>([])
  const [disabledCatalogIds, setDisabledCatalogIdsState] = useState<string[]>([])
  const [homeDisabledCatalogIds, setHomeDisabledCatalogIdsState] = useState<string[]>([])
  const [catalogOrder, setCatalogOrderState] = useState<string[]>([])
  const [catalogRenames, setCatalogRenamesState] = useState<Record<string, string>>({})
  const lastSyncRef = useRef<string>("")

  // Initial load: localStorage + fetch /api/defaults
  useEffect(() => {
    let localCustom: CustomCatalogConfig[] = []
    let localDisabled: string[] = []
    let localHomeDisabled: string[] = []
    let localOrder: string[] = []
    let localRenames: Record<string, string> = {}

    const savedCustomCats = getStoredWithFallback(safeGetItem, "spatial_custom_catalogs", "pictorium_custom_catalogs", "posterium_custom_catalogs")
    if (savedCustomCats) {
      try {
        const parsed = JSON.parse(savedCustomCats)
        if (Array.isArray(parsed)) {
          localCustom = parsed
          setCustomCatalogsState(localCustom)
        }
      } catch {}
    }
    const savedDisabledCats = getStoredWithFallback(safeGetItem, "spatial_disabled_catalogs", "pictorium_disabled_catalogs", "posterium_disabled_catalogs")
    if (savedDisabledCats) {
      try {
        const parsed = JSON.parse(savedDisabledCats)
        if (Array.isArray(parsed)) {
          localDisabled = parsed
          setDisabledCatalogIdsState(localDisabled)
        }
      } catch {}
    }
    const savedHomeDisabledCats = getStoredWithFallback(safeGetItem, "spatial_home_disabled_catalogs", "pictorium_home_disabled_catalogs", "posterium_home_disabled_catalogs")
    if (savedHomeDisabledCats) {
      try {
        const parsed = JSON.parse(savedHomeDisabledCats)
        if (Array.isArray(parsed)) {
          localHomeDisabled = parsed
          setHomeDisabledCatalogIdsState(localHomeDisabled)
        }
      } catch {}
    }
    const savedOrder = getStoredWithFallback(safeGetItem, "spatial_catalog_order", "pictorium_catalog_order", "posterium_catalog_order")
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder)
        if (Array.isArray(parsed)) {
          localOrder = parsed
          setCatalogOrderState(localOrder)
        }
      } catch {}
    }
    const savedRenames = getStoredWithFallback(safeGetItem, "spatial_catalog_renames", "pictorium_catalog_renames", "posterium_catalog_renames")
    if (savedRenames) {
      try {
        const parsed = JSON.parse(savedRenames)
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          localRenames = parsed
          setCatalogRenamesState(localRenames)
        }
      } catch {}
    }

    lastSyncRef.current = JSON.stringify({
      customCatalogs: localCustom,
      disabledCatalogIds: localDisabled,
      homeDisabledCatalogIds: localHomeDisabled,
      catalogOrder: localOrder,
      catalogRenames: localRenames,
    })

    // Hydrate missing or server-configured defaults
    fetch("/api/defaults")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        if (Array.isArray(data.customCatalogs) && (!savedCustomCats || localCustom.length === 0)) {
          setCustomCatalogsState((prev) => {
            if (prev.length === 0) {
              safeSetItem("spatial_custom_catalogs", JSON.stringify(data.customCatalogs))
              return data.customCatalogs
            }
            return prev
          })
        }
        if (Array.isArray(data.disabledCatalogIds) && (!savedDisabledCats || localDisabled.length === 0)) {
          setDisabledCatalogIdsState((prev) => {
            if (prev.length === 0) {
              safeSetItem("spatial_disabled_catalogs", JSON.stringify(data.disabledCatalogIds))
              return data.disabledCatalogIds
            }
            return prev
          })
        }
        if (Array.isArray(data.homeDisabledCatalogIds) && (!savedHomeDisabledCats || localHomeDisabled.length === 0)) {
          setHomeDisabledCatalogIdsState((prev) => {
            if (prev.length === 0) {
              safeSetItem("spatial_home_disabled_catalogs", JSON.stringify(data.homeDisabledCatalogIds))
              return data.homeDisabledCatalogIds
            }
            return prev
          })
        }
        if (Array.isArray(data.catalogOrder) && (!savedOrder || localOrder.length === 0)) {
          setCatalogOrderState((prev) => {
            if (prev.length === 0) {
              safeSetItem("spatial_catalog_order", JSON.stringify(data.catalogOrder))
              return data.catalogOrder
            }
            return prev
          })
        }
        if (data.catalogRenames && typeof data.catalogRenames === "object" && !Array.isArray(data.catalogRenames) && (!savedRenames || Object.keys(localRenames).length === 0)) {
          setCatalogRenamesState((prev) => {
            if (Object.keys(prev).length === 0) {
              safeSetItem("spatial_catalog_renames", JSON.stringify(data.catalogRenames))
              return data.catalogRenames
            }
            return prev
          })
        }
      })
      .catch(() => {})
  }, [safeGetItem, safeSetItem])

  // Auto-persist: sincronizza su server (/api/defaults) ad ogni modifica
  useEffect(() => {
    const payload = {
      customCatalogs,
      disabledCatalogIds,
      homeDisabledCatalogIds,
      catalogOrder,
      catalogRenames,
    }
    const payloadStr = JSON.stringify(payload)
    if (lastSyncRef.current === payloadStr) return
    lastSyncRef.current = payloadStr

    const timer = setTimeout(() => {
      fetch("/api/defaults", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: payloadStr,
      }).catch((e) => {
        lastSyncRef.current = ""
        console.warn("[catalogs] Auto-sync custom catalogs failed:", e)
      })
    }, 400)

    return () => clearTimeout(timer)
  }, [customCatalogs, disabledCatalogIds, homeDisabledCatalogIds, catalogOrder, catalogRenames])

  const setCustomCatalogs = useCallback((catalogs: CustomCatalogConfig[]) => {
    setCustomCatalogsState(catalogs)
    safeSetItem("spatial_custom_catalogs", JSON.stringify(catalogs))
  }, [safeSetItem])

  const addCustomCatalog = useCallback((catalog: Omit<CustomCatalogConfig, "id">) => {
    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    setCustomCatalogsState((prev) => {
      const next = [...prev, { ...catalog, id }]
      safeSetItem("spatial_custom_catalogs", JSON.stringify(next))
      return next
    })
  }, [safeSetItem])

  const removeCustomCatalog = useCallback((id: string) => {
    setCustomCatalogsState((prev) => {
      const next = prev.filter((c) => c.id !== id)
      safeSetItem("spatial_custom_catalogs", JSON.stringify(next))
      return next
    })
  }, [safeSetItem])

  const toggleCustomCatalog = useCallback((id: string) => {
    setCustomCatalogsState((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
      safeSetItem("spatial_custom_catalogs", JSON.stringify(next))
      return next
    })
  }, [safeSetItem])

  const setDisabledCatalogIds = useCallback((ids: string[]) => {
    setDisabledCatalogIdsState(ids)
    safeSetItem("spatial_disabled_catalogs", JSON.stringify(ids))
  }, [safeSetItem])

  const toggleBuiltinCatalog = useCallback((id: string) => {
    setDisabledCatalogIdsState((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      safeSetItem("spatial_disabled_catalogs", JSON.stringify(next))
      return next
    })
  }, [safeSetItem])

  const setHomeDisabledCatalogIds = useCallback((ids: string[]) => {
    setHomeDisabledCatalogIdsState(ids)
    safeSetItem("spatial_home_disabled_catalogs", JSON.stringify(ids))
  }, [safeSetItem])

  const toggleCatalogHome = useCallback((id: string) => {
    setHomeDisabledCatalogIdsState((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      safeSetItem("spatial_home_disabled_catalogs", JSON.stringify(next))
      return next
    })
  }, [safeSetItem])

  const setCatalogOrder = useCallback((order: string[]) => {
    setCatalogOrderState(order)
    safeSetItem("spatial_catalog_order", JSON.stringify(order))
  }, [safeSetItem])

  const moveCatalog = useCallback((id: string, direction: "up" | "down") => {
    setCatalogOrderState((prev) => {
      const allIds: string[] = []
      const existing = new Set<string>()
      prev.forEach((catId) => {
        allIds.push(catId)
        existing.add(catId)
      })
      SPATIALPOSTERS_CATALOGS.forEach((c) => {
        if (!existing.has(c.id)) {
          allIds.push(c.id)
          existing.add(c.id)
        }
      })
      customCatalogs.forEach((c) => {
        if (c.type === "mixed") {
          const mId = `pictorium-custom-movie-${c.id}`
          const sId = `pictorium-custom-series-${c.id}`
          if (!existing.has(mId)) { allIds.push(mId); existing.add(mId) }
          if (!existing.has(sId)) { allIds.push(sId); existing.add(sId) }
        } else {
          const cId = `pictorium-custom-${c.type}-${c.id}`
          if (!existing.has(cId)) { allIds.push(cId); existing.add(cId) }
        }
      })

      const idx = allIds.indexOf(id)
      if (idx === -1) return prev
      const targetIdx = direction === "up" ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= allIds.length) return allIds

      const next = [...allIds]
      const [item] = next.splice(idx, 1)
      next.splice(targetIdx, 0, item)
      safeSetItem("spatial_catalog_order", JSON.stringify(next))
      return next
    })
  }, [customCatalogs, safeSetItem])

  const setCatalogRenames = useCallback((renames: Record<string, string>) => {
    setCatalogRenamesState(renames)
    safeSetItem("spatial_catalog_renames", JSON.stringify(renames))
  }, [safeSetItem])

  const renameCatalog = useCallback((id: string, newName: string) => {
    setCatalogRenamesState((prev) => {
      const next = { ...prev, [id]: newName }
      if (!newName.trim()) delete next[id]
      safeSetItem("spatial_catalog_renames", JSON.stringify(next))
      return next
    })
  }, [safeSetItem])

  const resetCatalogNames = useCallback(() => {
    setCatalogRenamesState({})
    try {
      localStorage.removeItem("spatial_catalog_renames")
      localStorage.removeItem("pictorium_catalog_renames")
    } catch {}
  }, [])

  const resetCatalogOrder = useCallback(() => {
    setCatalogOrderState([])
    try {
      localStorage.removeItem("spatial_catalog_order")
      localStorage.removeItem("pictorium_catalog_order")
    } catch {}
  }, [])

  return {
    customCatalogs,
    setCustomCatalogs,
    addCustomCatalog,
    removeCustomCatalog,
    toggleCustomCatalog,
    disabledCatalogIds,
    setDisabledCatalogIds,
    toggleBuiltinCatalog,
    homeDisabledCatalogIds,
    setHomeDisabledCatalogIds,
    toggleCatalogHome,
    catalogOrder,
    setCatalogOrder,
    moveCatalog,
    catalogRenames,
    setCatalogRenames,
    renameCatalog,
    resetCatalogNames,
    resetCatalogOrder,
  }
}
