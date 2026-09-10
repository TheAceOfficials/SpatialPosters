"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { usePSelector } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { toSearchResult } from "@/lib/types"
import { titleOf } from "@/lib/utils"
import { useSecurePosterUrl } from "@/lib/useSecurePosterUrl"
import { PosterDepthEdge, PosterDepthSheen } from "@/components/PosterDepthGlow"

/** Numero di card del carosello: 20 poster demo scelti a caso tra esempi statici e top. */
const CAROUSEL_SIZE = 20

/** Fisher–Yates: copia mescolata deterministica solo per test (Math.random stub). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface CarouselEntry {
  id: number
  type: "movie" | "tv"
  title: string
  params: string
  desc: string
}

const EXAMPLES: CarouselEntry[] = [
  // --- Movies ---
  { id: 278, type: "movie", title: "The Shawshank Redemption", params: "?genreName=Drama&voteAverage=9.3&bs=vetro&gradHeight=25&blur=30&bf=50&bd=40&tl=0&logoFit=0", desc: "Liquid glass badge effect on dark backdrop" },
  { id: 155, type: "movie", title: "The Dark Knight", params: "?genreName=Action&voteAverage=8.5&bs=bordo&gradHeight=20&blur=20&bf=55&bd=35&tl=1&logoFit=0", desc: "Bordered badge on light theme with subtle blur" },
  { id: 27205, type: "movie", title: "Inception", params: "?genreName=Thriller&voteAverage=8.8&bs=bar&tl=0&ac=%23f39c12&gradHeight=30&blur=35&bf=50&bd=45&logoFit=0", desc: "Bar badge with warm gold accent on dark theme" },
  { id: 157336, type: "movie", title: "Interstellar", params: "?genreName=Sci-Fi&voteAverage=8.7&bs=vetro&be=0&tl=1&gradHeight=15&blur=0&logoFit=0", desc: "Crisp glass badge without extra blur" },
  { id: 299534, type: "movie", title: "Avengers: Endgame", params: "?genreName=Action&voteAverage=8.4&bs=shadow&gradHeight=40&blur=50&bf=70&bd=50&tl=0&logoFit=0", desc: "Deep dark gradient with strong background blur" },
  { id: 238, type: "movie", title: "The Godfather", params: "?genreName=Crime&voteAverage=9.2&bs=bordo&gradHeight=10&tl=0&logoFit=0", desc: "Clean bordered badge with dark cinematic theme" },
  { id: 11, type: "movie", title: "Star Wars", params: "?genreName=Sci-Fi&voteAverage=8.5&bs=colored&tl=1&gradHeight=25&blur=25&bf=45&bd=30&logoFit=0", desc: "Colored Sci-Fi badge with medium backdrop blur" },
  { id: 680, type: "movie", title: "Pulp Fiction", params: "?genreName=Crime&voteAverage=8.9&bs=pill&tl=0&ac=%23e74c3c&gradHeight=15&blur=15&bf=40&bd=25&logoFit=0", desc: "Pill badge with crimson red accent" },
  { id: 597, type: "movie", title: "Titanic", params: "?genreName=Drama&voteAverage=8.4&bs=shadow&gradHeight=20&blur=30&bf=60&bd=40&tl=1&logoFit=0", desc: "Soft shadow badge with smooth gradient" },
  { id: 122, type: "movie", title: "The Return of the King", params: "?genreName=Adventure&voteAverage=8.5&bs=pill&gradHeight=30&blur=40&bf=65&bd=45&tl=0&ac=%23d4a017&logoFit=0", desc: "Golden pill badge on dark backdrop" },
  // --- TV Series ---
  { id: 1396, type: "tv", title: "Breaking Bad", params: "?genreName=Crime&voteAverage=9.5&rs=bordo&rank=1&label=TV%20Series&ranking=&tl=1&gradHeight=20&blur=25&bf=50&bd=30&logoFit=0", desc: "Rank #1 Crime TV Series badge" },
  { id: 66732, type: "tv", title: "Stranger Things", params: "?genreName=Sci-Fi&voteAverage=8.6&bs=colored&tl=1&gradHeight=20&blur=20&bf=45&bd=25&logoFit=0", desc: "Colored Sci-Fi badge with light blur" },
  { id: 1668, type: "tv", title: "Friends", params: "?genreName=Comedy&voteAverage=8.3&bs=bordo&tl=1&gradHeight=10&be=0&logoFit=0", desc: "Clean bordered badge on light theme" },
  { id: 1399, type: "tv", title: "Game of Thrones", params: "?genreName=Drama&voteAverage=8.4&bs=bar&tl=0&ac=%233498db&gradHeight=35&blur=45&bf=70&bd=50&logoFit=0", desc: "Bar badge with sapphire blue accent" },
  { id: 456, type: "tv", title: "The Simpsons", params: "?genreName=Comedy&voteAverage=8.0&bs=vetro&tl=1&gradHeight=10&blur=10&bf=30&bd=15&logoFit=0", desc: "Vibrant glass badge on light theme" },
  { id: 76479, type: "tv", title: "The Boys", params: "?genreName=Action&voteAverage=8.4&bs=shadow&tl=0&gradHeight=25&blur=30&bf=55&bd=40&logoFit=0", desc: "Dark shadow badge with bold contrast" },
  { id: 82883, type: "tv", title: "The Mandalorian", params: "?genreName=Sci-Fi&voteAverage=8.2&bs=bordo&tl=0&gradHeight=20&blur=20&bf=45&bd=30&logoFit=0", desc: "Bordered dark theme Sci-Fi badge" },
  { id: 60574, type: "tv", title: "Peaky Blinders", params: "?genreName=Crime&voteAverage=8.5&bs=pill&tl=0&gradHeight=15&blur=15&bf=40&bd=25&logoFit=0", desc: "Minimalist pill badge" },
  { id: 71912, type: "tv", title: "The Witcher", params: "?genreName=Action&voteAverage=8.2&bs=colored&tl=1&gradHeight=30&blur=35&bf=60&bd=40&ac=%239b59b6&logoFit=0", desc: "Colored badge with amethyst accent" },
  { id: 44217, type: "tv", title: "Dark", params: "?genreName=Thriller&voteAverage=8.0&rs=netflix&rank=4&label=TV%20Series&ranking=&tl=0&gradHeight=25&blur=30&bf=50&bd=40&logoFit=0", desc: "Netflix Top 10 ranking ribbon badge" },
]

const CARD_W_DESKTOP = 240
const CARD_W_MOBILE = 145
const GAP_DESKTOP = 16
const GAP_MOBILE = 10
const SCROLL_SPEED = 0.5 // px per frame

/** M21: `<img>` che porta la chiave nell'header x-api-key (object URL) invece
 *  di esporla nel query string del DOM pubblico. */
function SecureCarouselImg({ url, alt, className }: { url: string; alt: string; className: string }) {
  const tmdbKey = usePSelector((v) => v.tmdbKey)
  const src = useSecurePosterUrl(url, tmdbKey)
  // eslint-disable-next-line @next/next/no-img-element -- poster dinamico /api/poster
  return <img src={src ?? undefined} alt={alt} className={className} loading="lazy" />
}

export function PosterCarousel() {
  const navigateToPoster = usePSelector((v) => v.navigateToPoster)
  const tmdbKey = usePSelector((v) => v.tmdbKey)
  const trending = usePSelector((v) => v.trending)
  const { t, lang } = useT()
  const containerRef = useRef<HTMLDivElement>(null)

  // 20 poster demo scelti a caso a ogni refresh tra gli esempi statici e i film/
  // serie di tendenza JustWatch (con rank badge coerente)
  const items = useMemo<CarouselEntry[]>(() => {
    const userLang = lang || "en"
    const rankParams = (rank: number) =>
      `?ranking=&rank=${rank}&rs=netflix&tl=0&gradHeight=25&blur=30&bf=50&bd=40&logoFit=0&lang=${userLang}`
    const top = trending.slice(0, 15).map((i) => ({
      id: i.id,
      type: i.media_type,
      title: titleOf(i),
      params: rankParams(i.rank),
      desc: i.media_type === "movie" ? `Top ${i.rank} ${t("ui.movie")}` : `Top ${i.rank} ${t("ui.tvSeries")}`,
    }))
    const localizedExamples = EXAMPLES.map((e) => ({
      ...e,
      params: `${e.params}&lang=${userLang}`,
    }))
    return shuffle([...localizedExamples, ...top]).slice(0, CAROUSEL_SIZE)
  }, [trending, t, lang])
  // D4: il transform della pista è scritto DIRETTAMENTE sul DOM via ref.
  // Prima setOffset() a ogni frame (60fps) ri-renderizzava tutte le card del
  // carousel via React; ora solo activeIndex/showLeft/showRight restano state
  // (aggiornati ogni 12 frame) e il movimento è puro CSS senza re-render.
  const trackRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const posRef = useRef(0)
  const [isHovering, setIsHovering] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const hoveringRef = useRef(false)
  const tickRef = useRef<() => void>(() => {})
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(true)

  const [cardW, setCardW] = useState(CARD_W_DESKTOP)
  const gap = cardW < 200 ? GAP_MOBILE : GAP_DESKTOP
  const step = cardW + gap
  const totalItems = items.length
  const totalW = totalItems * step

  useEffect(() => {
    const updateSize = () => {
      setCardW(typeof window !== "undefined" && window.innerWidth < 640 ? CARD_W_MOBILE : CARD_W_DESKTOP)
    }
    updateSize()
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [])

  const applyTransform = useCallback((x: number) => {
    if (trackRef.current) trackRef.current.style.transform = `translateX(${x}px)`
  }, [])

  useEffect(() => {
    hoveringRef.current = isHovering
  }, [isHovering])

  useEffect(() => {
    let frameCount = 0
    // jsdom (vitest) non implementa matchMedia: assenza => animazione attiva.
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const tick = () => {
      if (!hoveringRef.current && !reduced) {
        posRef.current += SCROLL_SPEED
        if (posRef.current >= totalW) {
          posRef.current = 0
        }
        applyTransform(-posRef.current)
        frameCount++
        if (frameCount % 12 === 0) {
          const idx = Math.floor(posRef.current / step) % totalItems
          setActiveIndex(idx)
          setShowLeft(posRef.current > 0)
          setShowRight(true)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    tickRef.current = tick
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [totalW, totalItems, step, applyTransform])

  const scrollTo = useCallback((dir: number) => {
    const target = Math.max(0, Math.min(totalW, posRef.current + dir * step))
    const start = posRef.current
    const duration = 200
    const startTime = performance.now()
    const animate = (time: number) => {
      const t = Math.min((time - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      posRef.current = start + (target - start) * ease
      applyTransform(-posRef.current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        rafRef.current = requestAnimationFrame(tickRef.current)
      }
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(animate)
  }, [totalW, step, applyTransform])

  return (
    <div id="poster-examples" className="mt-8 sm:mt-14 max-w-5xl mx-auto px-2 sm:px-8">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="section-heading text-lg sm:text-xl font-bold">
          {t("ui.posterExamples")}
          <span className="demo-tag">{t("ui.demoTag")}</span>
        </h2>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-20 h-1 rounded-full bg-surface2 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-orange transition-all duration-300"
                style={{ width: `${(activeIndex / Math.max(totalItems - 1, 1)) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-500 tabular-nums">{activeIndex + 1}/{totalItems}</span>
          </div>
        </div>
      </div>
      <p className="text-[11px] sm:text-xs text-zinc-500 mb-4 sm:mb-6">
        {t("ui.posterExamplesDesc")}
      </p>

      <div
        className="relative"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {showLeft && (
          <button type="button"
            onClick={() => scrollTo(-1)}
            className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-surface/80 border border-border/50 backdrop-blur-xl flex items-center justify-center text-zinc-300 hover:text-white hover:bg-surface2/80 active:scale-90 transition-all shadow-xl"
            aria-label={t("ui.scrollLeft")}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        <div ref={containerRef} className="carousel-track overflow-hidden px-2 sm:px-4">
          <div
            ref={trackRef}
            className="flex gap-2.5 sm:gap-4 will-change-transform"
          >
            {[...items, ...items].map((ex, i) => {
              // La chiave personale va in query: senza, i titoli non mappati
              // fallirebbero l'auto-fetch TMDB (solo chiavi personali, niente
              // chiave d'istanza). ex.params inizia con "?".
              const posterUrl = `/api/poster/${ex.type}/${ex.id}${ex.params}${tmdbKey ? `&api_key=${encodeURIComponent(tmdbKey)}` : ""}`
              return (
                <div
                  key={i}
                  className="shrink-0 animate-stagger-in"
                  style={{ width: cardW, animationDelay: `${(i % totalItems) * 50}ms` }}
                >
                  <div
                    onClick={() => navigateToPoster(toSearchResult({ id: ex.id, media_type: ex.type, title: ex.title, name: ex.title }))}
                    className="carousel-card group cursor-pointer h-full flex flex-col bg-white/[0.03] border border-white/[0.06]"
                  >
                    <PosterDepthEdge edgeStrength={40} edgeCoverage={10} />
                    <div className="relative z-[1] flex flex-col flex-1">
                    <div className="aspect-[2/3] shrink-0 relative overflow-hidden bg-surface2">
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/20 to-transparent z-10" />
                      {/* M21: la chiave viaggia nell'header x-api-key, mai nel DOM */}
                    <SecureCarouselImg url={posterUrl} alt={ex.title} className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]" />
                    </div>
                    <div className="p-2 sm:p-3 relative z-10 flex-1">
                      <h3 className="text-[11px] sm:text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors duration-200 line-clamp-1">{ex.title}</h3>
                      <p className="text-[9px] sm:text-[10px] text-muted group-hover:text-zinc-200 mt-0.5 sm:mt-1 leading-tight sm:leading-relaxed transition-colors duration-200 line-clamp-2">{ex.desc}</p>
                    </div>
                    </div>
                    <PosterDepthSheen sheenStrength={20} />
                    <span className="car-arrow hidden sm:flex" aria-hidden="true">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {showRight && (
          <button type="button"
            onClick={() => scrollTo(1)}
            className="absolute -right-2 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-surface/80 border border-border/50 backdrop-blur-xl flex items-center justify-center text-zinc-300 hover:text-white hover:bg-surface2/80 active:scale-90 transition-all shadow-xl"
            aria-label={t("ui.scrollRight")}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
