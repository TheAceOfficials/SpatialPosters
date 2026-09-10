"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { X, Check, Copy, Download, ExternalLink, Tv, Sparkles, Film, Search } from "lucide-react"
import QRCode from "qrcode"
import { useT } from "@/lib/contexts/TranslationContext"

interface InstallModalProps {
  isOpen: boolean
  onClose: () => void
  manifestUrl?: string
  posterUrlPattern?: string
}

export function InstallModal({ isOpen, onClose, manifestUrl: propManifestUrl, posterUrlPattern }: InstallModalProps) {
  const { t } = useT()
  const [hubMode, setHubMode] = useState<"all" | "catalogs" | "search">("all")
  const [copied, setCopied] = useState(false)
  const [copiedPosterUrl, setCopiedPosterUrl] = useState(false)
  const [qrSvg, setQrSvg] = useState<string>("")
  const [baseManifestUrl, setBaseManifestUrl] = useState(propManifestUrl || "")
  const popoverRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const posterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (propManifestUrl) {
      setBaseManifestUrl(propManifestUrl)
      return
    }
    if (typeof window === "undefined") return
    const path = window.location.pathname
    const params = new URLSearchParams(window.location.search)
    const cParam = params.get("config") || params.get("c")
    const uParam = params.get("u") || params.get("user")

    if (path.startsWith("/c/")) {
      const seg = path.split("/")[2]
      if (seg && seg !== "manifest.json" && seg !== "configure") {
        setBaseManifestUrl(`${window.location.origin}/c/${seg}/manifest.json`)
        return
      }
    }
    if (path.startsWith("/u/")) {
      const seg = path.split("/")[2]
      if (seg && seg !== "manifest.json" && seg !== "configure") {
        setBaseManifestUrl(`${window.location.origin}/u/${seg}/manifest.json`)
        return
      }
    }
    if (cParam) {
      setBaseManifestUrl(`${window.location.origin}/c/${cParam}/manifest.json`)
      return
    }
    if (uParam) {
      setBaseManifestUrl(`${window.location.origin}/u/${uParam}/manifest.json`)
      return
    }
    setBaseManifestUrl(`${window.location.origin}/manifest.json`)
  }, [propManifestUrl, isOpen])

  const resolvedManifestUrl = useMemo(() => {
    if (!baseManifestUrl) return ""
    if (hubMode === "all") return baseManifestUrl
    try {
      const urlObj = new URL(baseManifestUrl)
      urlObj.searchParams.set("mode", hubMode)
      return urlObj.toString()
    } catch {
      const sep = baseManifestUrl.includes("?") ? "&" : "?"
      return `${baseManifestUrl}${sep}mode=${hubMode}`
    }
  }, [baseManifestUrl, hubMode])

  const stremioDeepLink = (resolvedManifestUrl || "").replace(/^https?:\/\//, "stremio://")
  const stremioWebLink = `https://web.stremio.com/#/addons?addon=${encodeURIComponent(resolvedManifestUrl || "")}`

  useEffect(() => {
    if (!isOpen || !resolvedManifestUrl) return
    QRCode.toString(resolvedManifestUrl, {
      type: "svg",
      margin: 1,
      width: 170,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((svg) => setQrSvg(svg))
      .catch(() => setQrSvg(""))
  }, [isOpen, resolvedManifestUrl])

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
    const clickTimer = setTimeout(() => {
      window.addEventListener("click", handleClickOutside)
    }, 50)
    return () => {
      clearTimeout(clickTimer)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("click", handleClickOutside)
      if (timerRef.current) clearTimeout(timerRef.current)
      if (posterTimerRef.current) clearTimeout(posterTimerRef.current)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleCopy = async () => {
    await navigator.clipboard.writeText(resolvedManifestUrl)
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyPosterUrl = async () => {
    if (!posterUrlPattern) return
    await navigator.clipboard.writeText(posterUrlPattern)
    setCopiedPosterUrl(true)
    if (posterTimerRef.current) clearTimeout(posterTimerRef.current)
    posterTimerRef.current = setTimeout(() => setCopiedPosterUrl(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        ref={popoverRef}
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-[#141418] border border-white/10 rounded-2xl shadow-2xl flex flex-col animate-fade-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent-orange/20 border border-accent-orange/30 flex items-center justify-center text-accent-orange">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">{t("ui.installHubTitle")}</h2>
              <p className="text-[11px] text-muted">{t("ui.installHubSub")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("ui.close")}
            className="p-1.5 text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5">
          {/* Mode Selector Segmented Control */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-zinc-300">
              {t("ui.installMode")}
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/5 border border-white/5 rounded-xl">
              <button
                type="button"
                onClick={() => setHubMode("all")}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all ${
                  hubMode === "all"
                    ? "bg-zinc-100 text-zinc-950 shadow-md font-bold border border-white/40"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[11px] font-bold leading-tight">{t("ui.modeAll")}</span>
                <span className="text-[9px] opacity-80 leading-tight font-medium">{t("ui.modeAllSub")}</span>
              </button>

              <button
                type="button"
                onClick={() => setHubMode("catalogs")}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all ${
                  hubMode === "catalogs"
                    ? "bg-zinc-100 text-zinc-950 shadow-md font-bold border border-white/40"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Film className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[11px] font-bold leading-tight">{t("ui.modeCatalogs")}</span>
                <span className="text-[9px] opacity-80 leading-tight font-medium">{t("ui.modeCatalogsSub")}</span>
              </button>

              <button
                type="button"
                onClick={() => setHubMode("search")}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all ${
                  hubMode === "search"
                    ? "bg-zinc-100 text-zinc-950 shadow-md font-bold border border-white/40"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Search className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[11px] font-bold leading-tight">{t("ui.modeSearch")}</span>
                <span className="text-[9px] opacity-80 leading-tight font-medium">{t("ui.modeSearchSub")}</span>
              </button>
            </div>
          </div>

          {/* QR Code Card */}
          <div className="flex flex-col items-center justify-center p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2">
            <div className="flex items-center gap-1.5 text-zinc-300 text-[11px] font-medium">
              <Tv className="w-3.5 h-3.5 text-zinc-300" />
              <span>{t("ui.scanQr")}</span>
            </div>
            {qrSvg ? (
              <div
                className="bg-white p-2 rounded-xl shadow-lg"
                role="img"
                aria-label={t("ui.qrAria")}
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="w-[170px] h-[170px] bg-white/10 rounded-xl flex items-center justify-center text-muted text-xs">
                {t("ui.qrGenerating")}
              </div>
            )}
            <p className="text-[10px] text-muted text-center max-w-[240px]">
              {hubMode === "all" && t("ui.hubDescAll")}
              {hubMode === "catalogs" && t("ui.hubDescCatalogs")}
              {hubMode === "search" && t("ui.hubDescSearch")}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Direct App Install */}
            <a
              href={stremioDeepLink}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-white/10 border border-white/40 active:scale-[0.98] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-950" />
              <span className="text-zinc-950 font-bold">{t("ui.installInApp")}</span>
            </a>

            {/* Copy Manifest URL */}
            <button
              type="button"
              onClick={handleCopy}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                copied
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                  : "bg-surface2 hover:bg-surface2/80 text-zinc-200 border-white/10"
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted" />}
              <span>{copied ? t("ui.manifestCopied") : t("ui.copyManifest")}</span>
            </button>

            {/* Open in Web Stremio */}
            <a
              href={stremioWebLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-1 px-3 rounded-xl text-[11px] font-medium text-muted hover:text-zinc-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>{t("ui.openWebStremio")}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* AIOMetadata & External Poster URL */}
          {posterUrlPattern && (
            <div className="pt-3 border-t border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-zinc-300 text-[11px] font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-accent-orange" />
                  <span>{t("ui.aiomLinkTitle") || "Link per AIO e custom URL:"}</span>
                </div>
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Template URL</span>
              </div>

              <p className="text-[10px] text-zinc-400 leading-tight">
                {t("ui.aiomLinkDesc")}
              </p>

              <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl">
                <input
                  type="text"
                  readOnly
                  value={posterUrlPattern}
                  aria-label={t("ui.aiomLinkTitle") || "AIOMetadata URL"}
                  className="w-full bg-transparent px-2 py-1 text-[10px] font-mono text-zinc-300 truncate select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyPosterUrl}
                  className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                    copiedPosterUrl
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                      : "bg-white/10 hover:bg-white/15 text-zinc-200 border border-white/10 active:scale-95"
                  }`}
                >
                  {copiedPosterUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted" />}
                  <span>{copiedPosterUrl ? t("ui.copied") : t("ui.copyUrl")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

