"use client"

import React, { useState, useRef, useEffect } from "react"
import { useT } from "@/lib/contexts/TranslationContext"
import { Search, ArrowRight, AlertCircle, Film, Tv, Star, Clock, X, Loader2 } from "lucide-react"
import { http } from "@/lib/http"
import type { SearchResult } from "@/lib/types"

interface Props {
  tmdbKey: string
  onSearch: (q: string) => void
  onSelectResult?: (result: SearchResult) => void
  large?: boolean
  value?: string
  onChange?: (v: string) => void
  onFocus?: () => void
  onBlur?: () => void
  error?: string | null
  recentSearches?: string[]
  onClearRecentSearches?: () => void
  onRemoveRecentSearch?: (s: string) => void
}

export function SearchBar({
  tmdbKey,
  onSearch,
  onSelectResult,
  large,
  value,
  onChange,
  onFocus,
  onBlur,
  error,
  recentSearches = [],
  onClearRecentSearches,
  onRemoveRecentSearch,
}: Props) {
  const { t, lang } = useT()
  const [text, setText] = useState(value || "")
  const [focused, setFocused] = useState(false)
  const [liveResults, setLiveResults] = useState<SearchResult[]>([])
  const [liveLoading, setLiveLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const h = large ? "h-12" : "h-10"

  useEffect(() => {
    if (value !== undefined) setText((prev) => (prev === value ? prev : value))
  }, [value])

  // Debounced live search autocomplete
  useEffect(() => {
    const trimmed = text.trim()
    if (trimmed.length < 2 || !tmdbKey) {
      setLiveResults([])
      setLiveLoading(false)
      return
    }

    setLiveLoading(true)
    const timer = setTimeout(async () => {
      try {
        const data = await http<{ results: SearchResult[] }>(
          `/api/tmdb/search?q=${encodeURIComponent(trimmed)}&language=${lang}&api_key=${tmdbKey}&page=1`,
          { timeout: 8000 }
        )
        setLiveResults((data.results || []).slice(0, 5))
      } catch {
        setLiveResults([])
      } finally {
        setLiveLoading(false)
      }
    }, 220)

    return () => clearTimeout(timer)
  }, [text, tmdbKey, lang])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    }
  }, [])

  const placeholder = large ? t("ui.searchPlaceholderLarge") : t("ui.searchPlaceholder")
  const trimmedText = text.trim()
  const showLiveDropdown = focused && trimmedText.length >= 2
  const showRecentDropdown = focused && trimmedText.length < 2 && recentSearches.length > 0

  const handleSelect = (item: SearchResult) => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    setFocused(false)
    if (onSelectResult) {
      onSelectResult(item)
    } else {
      onSearch(item.title || item.name || text)
    }
  }

  const handleFullSearch = (queryToSearch?: string) => {
    const q = queryToSearch || text
    if (q.trim().length >= 2 && tmdbKey) {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
      setFocused(false)
      onSearch(q)
    }
  }

  return (
    <div className="relative w-full">
      <div
        role="search"
        className={`search-shell flex items-center ${h} ${
          focused ? "search-shell-active ring-1 ring-white/30" : ""
        } rounded-2xl transition-all duration-300 group ${error ? "ring-1 ring-red-500/50" : ""}`}
      >
        <span
          className="shrink-0 pl-3.5 transition-colors text-zinc-500 group-focus-within:text-zinc-300"
          aria-hidden="true"
        >
          {liveLoading ? (
            <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </span>
        <input
          suppressHydrationWarning
          ref={inputRef}
          value={text}
          enterKeyHint="search"
          aria-label={large ? t("ui.searchAriaLabelLarge") : t("ui.searchAriaLabel")}
          onChange={(e) => {
            setText(e.target.value)
            onChange?.(e.target.value)
          }}
          onFocus={() => {
            if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
            setFocused(true)
            onFocus?.()
          }}
          onBlur={() => {
            blurTimerRef.current = setTimeout(() => {
              setFocused(false)
              onBlur?.()
            }, 200)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && trimmedText.length >= 2 && tmdbKey) {
              handleFullSearch(text)
            } else if (e.key === "Escape") {
              setFocused(false)
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-xs md:text-sm outline-none px-2 h-full transition-colors duration-200 placeholder:text-zinc-500 focus:placeholder:text-muted"
        />

        {!focused && text.length === 0 && (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 mr-3 text-[10px] font-mono font-medium text-zinc-500 bg-white/[0.06] border border-white/10 rounded-md pointer-events-none select-none">
            ⌘K
          </kbd>
        )}
        {error && (
          <span className="shrink-0 pr-1.5" aria-hidden="true">
            <AlertCircle className="w-4 h-4 text-danger" />
          </span>
        )}
        {text.length > 0 && (
          <button
            type="button"
            aria-label={t("ui.searchButton")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleFullSearch(text)}
            disabled={!tmdbKey}
            className="shrink-0 w-8 sm:w-10 h-8 sm:h-10 mr-1.5 flex items-center justify-center text-zinc-950 font-bold rounded-full active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 transition-all duration-200 bg-zinc-100 hover:bg-white hover:shadow-lg hover:shadow-white/20 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Live Search Autocomplete Dropdown */}
      {showLiveDropdown && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-full left-0 right-0 mt-2 bg-zinc-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-2 shadow-2xl shadow-black/80 z-[200] animate-fade-scale-in overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 mb-1">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold">
              <span>Live Results</span>
              {liveLoading && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Press Enter for all</span>
          </div>

          {/* Results list */}
          <div className="space-y-1 max-h-[320px] overflow-y-auto scrollbar-none">
            {liveResults.length === 0 && !liveLoading ? (
              <div className="p-4 text-center text-xs text-zinc-500">
                No instant match found. Press Enter to view full results.
              </div>
            ) : (
              liveResults.map((item) => {
                const title = item.title || item.name || "Untitled"
                const date = item.release_date || item.first_air_date
                const year = date ? date.slice(0, 4) : null
                const posterUrl = item.poster_path
                  ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
                  : null

                return (
                  <button
                    key={`${item.media_type}-${item.id}`}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 text-left transition-all duration-150 group cursor-pointer"
                  >
                    {/* Thumbnail */}
                    <div className="w-9 h-13 rounded-lg bg-zinc-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative">
                      {posterUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={posterUrl} alt={title} className="w-full h-full object-cover" />
                      ) : item.media_type === "tv" ? (
                        <Tv className="w-4 h-4 text-zinc-600" />
                      ) : (
                        <Film className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-100 group-hover:text-white truncate">
                          {title}
                        </span>
                        {year && (
                          <span className="text-[10px] font-medium text-zinc-500">
                            ({year})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400">
                        <span className="uppercase font-semibold tracking-wider px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-zinc-400">
                          {item.media_type === "tv" ? "TV Series" : "Movie"}
                        </span>
                        {item.vote_average && item.vote_average > 0 ? (
                          <span className="flex items-center gap-0.5 text-amber-300 font-semibold">
                            <Star className="w-3 h-3 fill-amber-300" />
                            {item.vote_average.toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                )
              })
            )}
          </div>

          {/* Footer View All Button */}
          <button
            type="button"
            onClick={() => handleFullSearch(text)}
            className="w-full mt-1 pt-2 border-t border-white/10 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:bg-white/10 text-xs font-bold text-zinc-200 transition-all cursor-pointer"
          >
            <span>View all results for &quot;{trimmedText}&quot;</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Recent Searches Dropdown (when input is empty or query < 2) */}
      {showRecentDropdown && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-full left-0 right-0 mt-2 bg-zinc-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-2 shadow-2xl shadow-black/80 z-[200] animate-fade-scale-in"
        >
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 mb-1">
            <p className="text-xs text-zinc-400 font-semibold">{t("ui.recentSearches") || "Recent Searches"}</p>
            {onClearRecentSearches && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onClearRecentSearches()
                }}
                className="text-[11px] text-zinc-400 hover:text-rose-400 font-medium flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-rose-500/10 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>{t("ui.clearRecentSearches") || "Clear All"}</span>
              </button>
            )}
          </div>
          {recentSearches.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => handleFullSearch(s)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-xs text-zinc-300 hover:text-white transition-all duration-150 text-left cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="flex-1 truncate font-medium">{s}</span>
              {onRemoveRecentSearch && (
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveRecentSearch(s)
                  }}
                  aria-label={t("ui.remove")}
                  className="text-zinc-500 hover:text-rose-400 transition-colors text-xs p-1 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
