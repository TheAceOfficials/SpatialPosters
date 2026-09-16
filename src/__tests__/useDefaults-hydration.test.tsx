/**
 * Regressione: "modifico le impostazioni, clicco Salva, al rientro le ritrovo
 * come prima — solo in locale".
 *
 * Causa 1 (questo file, test 1): in dev StrictMode rimonta il provider due
 * volte; l'effect di auto-persist di useDefaults girava nello stesso commit
 * del caricamento con lo stato ancora ai factory e sovrascriveva
 * window.localStorage con i factory. Il secondo mount leggeva lo storage avvelenato
 * e la merge server+local consolidava i factory. In produzione (nessun
 * double-mount) non si manifesta.
 *
 * Causa 2 (test 2): setGradientHeight scriveva anche il default, così aprire
 * un poster (gradiente derivato dal poster) riscriveva il default salvato.
 */
import { StrictMode, type ReactNode } from "react"
import { render, renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useDefaults } from "@/lib/useDefaults"
import { PosterEditorProvider, usePosterEditor, type PosterEditorCtx } from "@/lib/contexts/PosterEditorContext"

// Valori utente salvati (forma del payload scritto da saveDefaults):
// badgeYear OFF, gradientHeight 45, blurIntensity 9 — tutto il resto factory.
// `region` è parte del payload da quando le classifiche sono multi-paese.
const USER_SAVED = {
  badgeStyle: "shadow",
  rankingBadgeStyle: "default",
  blurEnabled: true,
  blurIntensity: 9,
  blurFade: 60,
  blurDarkness: 40,
  gradientHeight: 45,
  globalBadges: true,
  rankingBadges: true,
  badgeGenre: true,
  badgeYear: false,
  badgeRating: true,
  manualQuality: "4K",
  ratingSources: ["imdb", "tmdb"],
  autoRotateClean: false,
  defaultLogoFitEnabled: true,
  networkLogo: true,
  ribbonSide: "left",
  episodeMetadataSource: "tvdb",
  region: "IT",
}

function strictWrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>
}

function createStorageStub() {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v))
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => {
      store.clear()
    },
  }
}

type StorageStub = ReturnType<typeof createStorageStub>

describe("useDefaults hydration", () => {
  let putBodies: unknown[]
  let storage: StorageStub

  beforeEach(() => {
    // jsdom qui non ha localStorage (origin opaca): stub in-memory condiviso
    // sia per `localStorage` bare che per `window.localStorage`.
    storage = createStorageStub()
    vi.stubGlobal("localStorage", storage)
    storage.setItem("badgeDefaults", JSON.stringify(USER_SAVED))
    putBodies = []
    vi.useFakeTimers()
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: unknown, init?: { method?: string; body?: string }) => {
        if (init?.method === "PUT") {
          putBodies.push(JSON.parse(init.body as string))
          return { ok: true, json: async () => ({}) }
        }
        // GET /api/defaults: server senza valori (conta solo il locale)
        return { ok: true, json: async () => ({}) }
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("StrictMode double-mount non sovrascrive i default salvati con i factory", async () => {
    // Modella la latenza reale: la GET /api/defaults si risolve DOPO che il
    // mount si è assestato (in prod/dev la rete è più lenta del render).
    // Sul codice difettoso l'effect di persist scrive i factory in sync al
    // mount e la merge legge lo storage avvelenato, consolidando i factory.
    let resolveGet!: (v: { ok: boolean; json: () => Promise<Record<string, unknown>> }) => void
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: unknown, init?: { method?: string; body?: string }) => {
        if (init?.method === "PUT") {
          putBodies.push(JSON.parse(init.body as string))
          return { ok: true, json: async () => ({}) }
        }
        return new Promise<{ ok: boolean; json: () => Promise<Record<string, unknown>> }>((res) => {
          resolveGet = res
        })
      })
    )
    // Spia sulle scritture PRIMA del mount: nessuna deve contenere i factory.
    // (la crea qui e non nel beforeEach così il seed non viene registrato)
    const writes: string[] = []
    const origSet = storage.setItem.bind(storage)
    storage.setItem = (k: string, v: string) => {
      if (k === "badgeDefaults") writes.push(v)
      origSet(k, v)
    }
    renderHook(() => useDefaults(), { wrapper: strictWrapper })
    // assesta il mount (il codice difettoso avvelena già qui lo storage)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
    })
    // ora risponde il server (vuoto: conta solo il locale)
    await act(async () => {
      resolveGet({ ok: true, json: async () => ({}) })
      await vi.advanceTimersByTimeAsync(1200)
    })
    // MAI una scrittura coi factory: è quella che avvelenava il rientro
    expect(writes.length).toBeGreaterThan(0)
    for (const w of writes) {
      const o = JSON.parse(w) as Record<string, unknown>
      expect(o.badgeYear).toBe(false)
      expect(o.gradientHeight).toBe(45)
    }
    // i valori utente devono sopravvivere al (doppio) mount
    expect(JSON.parse(storage.getItem("badgeDefaults")!)).toEqual(USER_SAVED)
    // e nessun PUT spurio deve partire al mount
    expect(putBodies).toEqual([])
  })

  it("le modifiche utente dopo l'idratazione persistono ancora (no over-gating)", async () => {
    const { result } = renderHook(() => useDefaults())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
    })
    act(() => {
      result.current.update({ defaultBadgeYear: true, badgeYear: true })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
    })
    expect(putBodies.length).toBeGreaterThan(0)
    const last = putBodies[putBodies.length - 1] as Record<string, unknown>
    expect(last.badgeYear).toBe(true)
    expect(last.defaultBadgeYear ?? last.badgeYear).toBe(true)
    expect(JSON.parse(storage.getItem("badgeDefaults")!).badgeYear).toBe(true)
  })

  it("setGradientHeight tocca solo il corrente, il default salvato resta", async () => {
    let latest: PosterEditorCtx | null = null
    function Probe() {
      latest = usePosterEditor()
      return null
    }
    render(
      <StrictMode>
        <PosterEditorProvider>
          <Probe />
        </PosterEditorProvider>
      </StrictMode>
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
    })
    expect(latest!.defaultGradientHeight).toBe(45)
    act(() => {
      latest!.setGradientHeight(50)
    })
    expect(latest!.gradientHeight).toBe(50)
    expect(latest!.defaultGradientHeight).toBe(45)
  })
})
