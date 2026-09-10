"use client"

import { useMemo, useRef, type MouseEvent, type KeyboardEvent } from "react"
import { usePSelector } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { toSearchResult, type SearchResult } from "@/lib/types"
import { useSecurePosterUrl } from "@/lib/useSecurePosterUrl"
import { Layers, Sparkles, Globe } from "lucide-react"

interface PodiumSlot {
  key: string
  className: string
  alt: string
  url: string
  item: SearchResult
}

interface FallbackSlot extends Omit<PodiumSlot, "url"> {
  url: (apiKeyParam: string, lang?: string) => string
}

/** M21: `<img>` che recupera il poster con la chiave in header x-api-key
 *  (object URL) invece di incollare api_key nel query string del DOM. */
function SecurePosterImg({ url, loading }: { url: string; loading: "eager" | "lazy" }) {
  const tmdbKey = usePSelector((v) => v.tmdbKey)
  const src = useSecurePosterUrl(url, tmdbKey)
  // eslint-disable-next-line @next/next/no-img-element -- poster dinamico /api/poster
  return <img src={src ?? undefined} alt="" loading={loading} decoding="async" />
}

// Poster statici di riserva (stessi layout del carosello) usati solo finché il
// trending non è caricato o se le classifiche sono vuote. Restano cliccabili:
// aprono l'editor con quel titolo, come le card del carosello.
const FALLBACK_PODIUM: FallbackSlot[] = [
  {
    key: "dark",
    className: "p-frame p-frame-side p-frame-left",
    alt: "Dark",
    item: toSearchResult({ id: 44217, media_type: "tv", title: "Dark", name: "Dark" }),
    url: (k: string, lang: string = "en") =>
      `/api/poster/tv/44217?genreName=Thriller&voteAverage=8.0&rs=netflix&rank=4&label=TV%20Series&ranking=&tl=0&gradHeight=25&blur=30&bf=50&bd=40&logoFit=0&lang=${lang}${k}`,
  },
  {
    key: "shawshank",
    className: "p-frame p-frame-main",
    alt: "The Shawshank Redemption",
    item: toSearchResult({ id: 278, media_type: "movie", title: "The Shawshank Redemption", name: "The Shawshank Redemption" }),
    url: (k: string, lang: string = "en") =>
      `/api/poster/movie/278?genreName=Drama&voteAverage=9.3&bs=vetro&gradHeight=25&blur=30&bf=50&bd=40&tl=0&logoFit=0&lang=${lang}${k}`,
  },
  {
    key: "inception",
    className: "p-frame p-frame-side p-frame-right",
    alt: "Inception",
    item: toSearchResult({ id: 27205, media_type: "movie", title: "Inception", name: "Inception" }),
    url: (k: string, lang: string = "en") =>
      `/api/poster/movie/27205?genreName=Thriller&voteAverage=8.8&bs=bar&tl=0&ac=%23f39c12&gradHeight=30&blur=35&bf=50&bd=45&logoFit=0&lang=${lang}${k}`,
  },
]

// Stile del badge rank per ogni slot del podio: il nastro Netflix identifica la
// classifica giornaliera delle serie (e il primo film), bordo al centro.
const SLOT_RANK_STYLES = ["netflix", "bordo", "netflix"] as const

/** Fisher–Yates: copia mescolata deterministica solo per test (Math.random stub). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function HomeHero() {
  const router = usePSelector((v) => v.router)
  const tmdbKey = usePSelector((v) => v.tmdbKey)
  const trending = usePSelector((v) => v.trending)
  const titleOf = usePSelector((v) => v.titleOf)
  const navigateToPoster = usePSelector((v) => v.navigateToPoster)
  const { t, lang } = useT()
  const podiumRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)

  // Due film + una serie estratti a caso a ogni refresh tra i titoli delle
  // classifiche giornaliere (JustWatch DAILY_POPULARITY esposta da
  // /api/tmdb/trending): il podio cambia a ogni visita. Ogni poster mostra il
  // badge rank reale della posizione del titolo in classifica.
  const slots = useMemo<PodiumSlot[]>(() => {
    const movies = trending.filter((i) => i.media_type === "movie").sort((a, b) => a.rank - b.rank)
    const tv = trending.filter((i) => i.media_type === "tv").sort((a, b) => a.rank - b.rank)
    if (movies.length < 2 || tv.length < 1) {
      const key = tmdbKey ? `&api_key=${encodeURIComponent(tmdbKey)}` : ""
      return FALLBACK_PODIUM.map((p) => ({ ...p, url: p.url(key, lang || "en") }))
    }
    const [m1, m2] = shuffle(movies)
    const [s1] = shuffle(tv)
    const picks = [m1, m2, s1]
    const key = tmdbKey ? `&api_key=${encodeURIComponent(tmdbKey)}` : ""
    return picks.map((item, i) => ({
      key: `${item.media_type}-${item.id}`,
      className: ["p-frame p-frame-side p-frame-left", "p-frame p-frame-main", "p-frame p-frame-side p-frame-right"][i],
      alt: titleOf(item),
      item,
      url: `/api/poster/${item.media_type}/${item.id}?ranking=&rank=${item.rank}&rs=${SLOT_RANK_STYLES[i]}&tl=0&gradHeight=25&blur=30&bf=50&bd=40&logoFit=0&lang=${lang || "en"}${key}`,
    }))
  }, [trending, tmdbKey, titleOf, lang])

  // Parallasse attivo solo su dispositivi con hover (desktop); calcolato una
  // volta per non ri-eseguire matchMedia a ogni mousemove.
  const hoverOkRef = useRef<boolean | null>(null)
  const hoverOk = () => {
    if (hoverOkRef.current === null) {
      hoverOkRef.current = typeof window.matchMedia === "function" && window.matchMedia("(hover: hover)").matches
    }
    return hoverOkRef.current
  }

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!hoverOk()) return
    const el = podiumRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = (e.clientX - r.left) / r.width - 0.5
    const dy = (e.clientY - r.top) / r.height - 0.5
    if (innerRef.current) innerRef.current.style.transform = `rotateY(${dx * 8}deg) rotateX(${-dy * 6}deg)`
    // Profondità fissa (14px in scala 0.6) come nel prototipo: i frame laterali
    // si staccano dal piano centrale quando il podio ruota.
    if (leftRef.current) leftRef.current.style.transform = "rotateY(18deg) rotateZ(2.5deg) translateX(14px) translateZ(8.4px)"
    if (rightRef.current) rightRef.current.style.transform = "rotateY(-18deg) rotateZ(-2.5deg) translateX(-14px) translateZ(-8.4px)"
  }

  const onLeave = () => {
    if (innerRef.current) innerRef.current.style.transform = ""
    if (leftRef.current) leftRef.current.style.transform = ""
    if (rightRef.current) rightRef.current.style.transform = ""
  }

  return (
    <section className="home-hero animate-fade-scale-in-hero relative overflow-hidden py-6 md:py-10">
      <div className="home-hero-copy max-w-xl">
        <span className="hero-kicker mb-3 animate-fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-zinc-200 border border-white/15 backdrop-blur-md" style={{ animationDelay: "0ms" }}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
          {t("ui.heroKicker") || "Next-Gen Media Artwork Engine"}
        </span>
        <h1 className="home-hero-title text-3xl sm:text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight animate-fade-up" style={{ animationDelay: "70ms" }}>
          Dynamic Posters for Stremio, <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500">Reimagined.</span>
        </h1>
        <p className="home-hero-sub mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed animate-fade-up" style={{ animationDelay: "140ms" }}>
          Transform your Stremio library with ultra-crisp vector logos, dynamic IMDb & Rotten Tomatoes rating badges, streaming provider ribbons, and instant catalog syncing.
        </p>
        <div className="stat-pills mt-5 flex flex-wrap gap-2 animate-fade-up" style={{ animationDelay: "210ms" }}>
          <span className="stat-pill px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 flex items-center gap-1.5 backdrop-blur-md">
            <Layers className="w-3.5 h-3.5 text-zinc-200" />
            {t("ui.heroPillLogos") || "Vector Logos"}
          </span>
          <span className="stat-pill px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 flex items-center gap-1.5 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-zinc-200" />
            {t("ui.heroPillBestFit") || "Auto Logo Positioning"}
          </span>
          <span className="stat-pill px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 flex items-center gap-1.5 backdrop-blur-md">
            <Globe className="w-3.5 h-3.5 text-zinc-200" />
            {t("ui.heroPillLangs") || "10+ Languages"}
          </span>
        </div>
        <div className="home-hero-cta-row mt-6 flex items-center gap-3 animate-fade-up" style={{ animationDelay: "280ms" }}>
          <button
            type="button"
            onClick={() => router.push("cataloghi")}
            className="px-6 py-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-sm shadow-xl shadow-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            {t("ui.heroCatalogsCta") || "Explore Catalogs"}
          </button>
        </div>
      </div>

      <div className="podium" ref={podiumRef} onMouseMove={onMove} onMouseLeave={onLeave}>
        <div className="podium-glow" aria-hidden="true" />
        <div className="podium-inner" ref={innerRef}>
          {slots.map((p, i) => (
            <div
              key={p.key}
              className={`${p.className} cursor-pointer group transition-all duration-300 hover:scale-[1.04]`}
              ref={i === 0 ? leftRef : i === 2 ? rightRef : undefined}
              role="button"
              tabIndex={0}
              aria-label={p.alt}
              onClick={() => navigateToPoster(p.item)}
              onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  navigateToPoster(p.item)
                }
              }}
            >
              <SecurePosterImg url={p.url} loading={i === 1 ? "eager" : "lazy"} />
            </div>
          ))}
        </div>
        <div className="float-chip fc-ai flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/80 backdrop-blur-xl border border-white/20 text-xs font-semibold text-zinc-200 shadow-2xl" aria-hidden="true">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>IMDb 9.3 • 4K Vector Logo</span>
        </div>
        <div className="float-chip fc-saved flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/80 backdrop-blur-xl border border-white/20 text-xs font-semibold text-zinc-200 shadow-2xl" aria-hidden="true">
          <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Stremio Sync Ready</span>
        </div>
      </div>
    </section>
  )
}
