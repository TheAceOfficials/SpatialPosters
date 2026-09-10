"use client"

import React, { useState, useRef, useEffect } from "react"
import { X, Plus, ListPlus, Film, Tv, Shuffle, Check, AlertCircle } from "lucide-react"
import { usePSelector } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { detectCatalogProvider } from "@/lib/custom-catalog-providers"
import { EmojiPicker } from "@/components/ui"
import type { CustomCatalogType } from "@/lib/types"

interface CustomCatalogModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CustomCatalogModal({ isOpen, onClose }: CustomCatalogModalProps) {
  const { t } = useT()
  const addCustomCatalog = usePSelector((v) => v.addCustomCatalog)
  const tmdbKey = usePSelector((v) => v.tmdbKey)
  const mdblistApiKey = usePSelector((v) => v.mdblistApiKey)
  const [url, setUrl] = useState("")
  const [name, setName] = useState("")
  const [type, setType] = useState<CustomCatalogType>("movie")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewItems, setPreviewItems] = useState<Array<{ title: string; year: number }> | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl)
    const trimmed = newUrl.trim()
    if (trimmed) {
      const detection = detectCatalogProvider(trimmed)
      if (detection) {
        if (!name && detection.nameSuggestion) {
          setName(detection.nameSuggestion)
        }
        if (detection.defaultType) {
          setType(detection.defaultType)
        }
      }
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    const timer = setTimeout(() => {
      window.addEventListener("click", handleClickOutside)
    }, 50)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("click", handleClickOutside)
      clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmedUrl = url.trim()
    const trimmedName = name.trim()

    if (!trimmedUrl) {
      setError(t("ui.customErrUrl"))
      return
    }
    if (!trimmedName) {
      setError(t("ui.customErrName"))
      return
    }

    const detection = detectCatalogProvider(trimmedUrl)
    if (!detection) {
      setError(t("ui.customErrInvalid"))
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        url: trimmedUrl,
        limit: "10",
      })
      if (tmdbKey) params.set("api_key", tmdbKey)
      if (mdblistApiKey) params.set("mdblist_key", mdblistApiKey)

      const res = await fetch(`/api/mdblist/custom?${params.toString()}`, {
        headers: tmdbKey ? { "x-api-key": tmdbKey } : undefined,
        signal: AbortSignal.timeout(8000),
      }).catch(() => null)

      let previewCount = 0
      if (res && res.ok) {
        const data = await res.json()
        if (Array.isArray(data?.items) && data.items.length > 0) {
          previewCount = data.items.length
          setPreviewItems(data.items.slice(0, 3).map((it: { title?: string; name?: string; year?: number }) => ({
            title: it.title || it.name || t("ui.untitled"),
            year: it.year || 0,
          })))
        }
      }

      addCustomCatalog({
        name: trimmedName,
        type,
        url: trimmedUrl,
        enabled: true,
      })

      setTimeout(() => {
        setUrl("")
        setName("")
        setPreviewItems(null)
        setLoading(false)
        onClose()
      }, previewCount > 0 ? 700 : 150)
    } catch {
      addCustomCatalog({
        name: trimmedName,
        type,
        url: trimmedUrl,
        enabled: true,
      })
      setUrl("")
      setName("")
      setLoading(false)
      onClose()
    }
  }

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] z-50 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-surface2/40">
        <div className="flex items-center gap-2">
          <ListPlus className="w-4 h-4 text-accent-orange" />
          <h3 className="text-xs font-bold text-white">{t("ui.newCatalog")}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("ui.close")}
          className="p-1 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <form onSubmit={handleTestAndSave} className="p-4 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-semibold text-zinc-300">
              {t("ui.customUrlLabel")}
            </label>
            <span className="text-[10px] text-zinc-400 font-normal">
              Letterboxd, Trakt, TMDb, MDBList
            </span>
          </div>
          <input
            type="text"
            placeholder={t("ui.customUrlPh")}
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="w-full px-3 py-2 bg-surface2 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-orange transition-colors"
            required
            autoFocus
          />
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">Letterboxd</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">Trakt</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">TMDb Saga</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">TMDb Lista</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">MDBList</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">TheTVDB</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">IMDb</span>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
            {t("ui.customNameLabel")}
          </label>
          <EmojiPicker
            currentName={name}
            onSelectEmoji={(em) => {
              const cleaned = name.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\p{Emoji})\s*/u, "")
              setName(`${em} ${cleaned}`)
            }}
          />
          <input
            type="text"
            placeholder={t("ui.customNamePh")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-surface2 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-orange transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
            {t("ui.contentType")}
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setType("movie")}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                type === "movie"
                  ? "bg-zinc-100 text-zinc-950 border-white/40 shadow-sm"
                  : "bg-surface2/60 border-white/5 text-muted hover:text-white"
              }`}
            >
              <Film className="w-3 h-3" /> {t("ui.movie")}
            </button>
            <button
              type="button"
              onClick={() => setType("series")}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                type === "series"
                  ? "bg-zinc-100 text-zinc-950 border-white/40 shadow-sm"
                  : "bg-surface2/60 border-white/5 text-muted hover:text-white"
              }`}
            >
              <Tv className="w-3 h-3" /> {t("ui.tvSeries")}
            </button>
            <button
              type="button"
              onClick={() => setType("mixed")}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                type === "mixed"
                  ? "bg-zinc-100 text-zinc-950 border-white/40 shadow-sm"
                  : "bg-surface2/60 border-white/5 text-muted hover:text-white"
              }`}
            >
              <Shuffle className="w-3 h-3" /> {t("ui.mixedType")}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {previewItems && previewItems.length > 0 && (
          <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-[11px] text-green-300 space-y-1">
            <div className="flex items-center gap-1 font-semibold text-green-400">
              <Check className="w-3.5 h-3.5" /> {t("ui.verifiedList")}
            </div>
            <p className="text-[10px] text-zinc-300 truncate">
              {previewItems.map((p) => p.title).join(", ")}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-[11px] font-medium text-muted hover:text-white transition-colors"
          >
            {t("ui.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-[11px] font-bold active:scale-95 transition-all shadow-md border border-white/40 disabled:opacity-50 cursor-pointer"
          >
            {loading ? t("ui.saving") : <><Plus className="w-3 h-3 text-zinc-950" /> <span className="text-zinc-950 font-bold">{t("ui.addCatalogBtn")}</span></>}
          </button>
        </div>
      </form>
    </div>
  )
}
