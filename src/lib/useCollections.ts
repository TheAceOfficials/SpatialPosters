"use client"

import { useReducer, useEffect } from "react"

export interface PosterCollection {
  id: string
  name: string
  posterIds: string[]
  createdAt: number
}

const PRIMARY_STORAGE_KEY = "spatial_collections"
const LEGACY_STORAGE_KEY = "pictorium_collections"

// ── localStorage helpers ──────────────────────────────────────────
function load(): PosterCollection[] {
  try {
    if (typeof window === "undefined" || typeof localStorage === "undefined" || !window?.localStorage) return []
    const raw = localStorage.getItem(PRIMARY_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save(cols: PosterCollection[]) {
  try {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined" && window?.localStorage) {
      localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(cols))
    }
  } catch {}
}

// ── Reducer ────────────────────────────────────────────────────────
type Action =
  | { type: "HYDRATE"; payload: PosterCollection[] }
  | { type: "CREATE"; payload: PosterCollection }
  | { type: "DELETE"; payload: string }
  | { type: "RENAME"; payload: { id: string; name: string } }
  | { type: "ADD_TO"; payload: { collectionId: string; posterKey: string } }
  | { type: "REMOVE_FROM"; payload: { collectionId: string; posterKey: string } }

function reducer(state: PosterCollection[], action: Action): PosterCollection[] {
  switch (action.type) {
    case "HYDRATE":
      return action.payload
    case "CREATE":
      return [...state, action.payload]
    case "DELETE":
      return state.filter((c) => c.id !== action.payload)
    case "RENAME":
      return state.map((c) =>
        c.id === action.payload.id ? { ...c, name: action.payload.name.trim() } : c,
      )
    case "ADD_TO":
      return state.map((c) =>
        c.id === action.payload.collectionId && !c.posterIds.includes(action.payload.posterKey)
          ? { ...c, posterIds: [...c.posterIds, action.payload.posterKey] }
          : c,
      )
    case "REMOVE_FROM":
      return state.map((c) =>
        c.id === action.payload.collectionId
          ? { ...c, posterIds: c.posterIds.filter((k) => k !== action.payload.posterKey) }
          : c,
      )
    default:
      return state
  }
}

const INITIAL_STATE: PosterCollection[] = []

// ── Helpers ────────────────────────────────────────────────────────
function uuid(): string {
  // crypto.randomUUID richiede un contesto sicuro (HTTPS/localhost); su
  // HTTP non protetto è assente → fallback con getRandomValues.
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID()
    }
  } catch {}
  const buf = new Uint8Array(16)
  let filled = false
  try {
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      crypto.getRandomValues(buf)
      filled = true
    }
  } catch {}
  if (!filled) {
    for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256)
  }
  buf[6] = (buf[6] & 0x0f) | 0x40
  buf[8] = (buf[8] & 0x3f) | 0x80
  const hex = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// ── Hook ───────────────────────────────────────────────────────────
export function useCollections() {
  const [collections, dispatch] = useReducer(reducer, INITIAL_STATE)

  // Carica da localStorage al mount — DOPO il primo render, così
  // il reducer parte con array vuoto e non sovrascrive mai dati
  useEffect(() => {
    const data = load()
    dispatch({ type: "HYDRATE", payload: data })
  }, [])

  // Ogni volta che lo stato cambia, sincronizza localStorage
  useEffect(() => {
    // Salta il primo render (collections è INITIAL_STATE, non vogliamo
    // scrivere [] se ci sono dati reali in localStorage)
    if (collections === INITIAL_STATE) return
    save(collections)
  }, [collections])

  // ── Mutazioni ──────────────────────────────────────────────────
  function createCollection(name: string) {
    dispatch({
      type: "CREATE",
      payload: {
        id: uuid(),
        name: name.trim(),
        posterIds: [],
        createdAt: Date.now(),
      },
    })
  }

  function deleteCollection(id: string) {
    dispatch({ type: "DELETE", payload: id })
  }

  function renameCollection(id: string, name: string) {
    dispatch({ type: "RENAME", payload: { id, name: name.trim() } })
  }

  function addToCollection(collectionId: string, posterKey: string) {
    dispatch({ type: "ADD_TO", payload: { collectionId, posterKey } })
  }

  function removeFromCollection(collectionId: string, posterKey: string) {
    dispatch({ type: "REMOVE_FROM", payload: { collectionId, posterKey } })
  }

  return {
    collections,
    createCollection,
    deleteCollection,
    renameCollection,
    addToCollection,
    removeFromCollection,
  }
}
