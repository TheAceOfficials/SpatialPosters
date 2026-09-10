"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { usePSelector } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { usePosterEditor } from "@/lib/contexts/PosterEditorContext"
import { ApiError, http } from "@/lib/http"
import { saveDefaults } from "@/lib/save-defaults"
import { SliderRow } from "@/components/SliderRow"
import { Toggle } from "@/components/Toggle"
import { BadgeStyleSelector, MenuItem } from "@/components/ui"
import { UI_RATING_SOURCES } from "@/lib/ratings"
import { REGIONS } from "@/lib/regions"
import { RatingSourceIcon } from "@/components/RatingSourceIcon"
import {
  Star,
  Trophy,
  Palette,
  Ruler,
  Cloud,
  Minus,
  Circle,
  RotateCcw,
  Save,
  Check,
  Upload,
  Download,
  Trash2,
  Sparkles,
  Tv,
  Flame,
  ChevronDown,
  Sliders,
  Database,
  Layers,
  Wand2,
  Globe,
  X,
  Lock,
  KeyRound,
} from "lucide-react"

interface Props {
  setSettingsOpen: (v: boolean) => void
  exportData: () => void
  importData: () => void
  mobile?: boolean
}

export function SettingsPanel({ setSettingsOpen, exportData, importData, mobile }: Props) {
  const accentColor = usePSelector((v) => v.accentColor)
  const uiAccent = usePSelector((v) => v.uiAccent)
  const setUiAccent = usePSelector((v) => v.setUiAccent)
  const selected = usePSelector((v) => v.selected)
  const mappingsMap = usePSelector((v) => v.mappingsMap)
  const setShowLangPicker = usePSelector((v) => v.setShowLangPicker)
  const { t } = useT()
  const ed = usePosterEditor()

  const [activeTab, setActiveTab] = useState<"style" | "prefs" | "data">("style")
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [editVal, setEditVal] = useState<string | null>(null)
  const [editTxt, setEditTxt] = useState("")
  const [saved, setSaved] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const [clearStatus, setClearStatus] = useState<"idle" | "clearing" | "cleared">("idle")
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [cacheCount, setCacheCount] = useState<number | null>(null)

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  useEffect(() => {
    fetch("/api/cache/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.totalEntries === "number") setCacheCount(data.totalEntries)
      })
      .catch(() => null)
  }, [])

  const [pinConfig, setPinConfig] = useState<{ hasPin: boolean } | null>(null)
  const [pinModalMode, setPinModalMode] = useState<"set" | "remove" | null>(null)
  const [curPinInput, setCurPinInput] = useState("")
  const [newPinInput, setNewPinInput] = useState("")
  const [pinBusy, setPinBusy] = useState(false)

  const refreshPin = () => {
    fetch("/api/auth/pin")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.hasPin === "boolean") setPinConfig(data)
      })
      .catch(() => null)
  }

  useEffect(() => {
    refreshPin()
  }, [])

  // Focus trap su mobile
  useEffect(() => {
    if (!mobile) return
    const panel = settingsRef.current
    if (!panel) return
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, input, select, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) return
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    panel.addEventListener("keydown", handleTab)
    first?.focus()
    return () => panel.removeEventListener("keydown", handleTab)
  }, [mobile])

  // Chiusura con tasto Escape su desktop
  useEffect(() => {
    if (mobile) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        setSettingsOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mobile, setSettingsOpen])

  const clearCache = async () => {
    setClearStatus("clearing")
    try {
      await http<{ ok: boolean }>("/api/cache/clear", { method: "POST", retries: 0 })
      setClearStatus("cleared")
      toast.success(t("ui.cleared"))
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
      clearTimerRef.current = setTimeout(() => setClearStatus("idle"), 1500)
    } catch (error) {
      setClearStatus("idle")
      const message =
        error instanceof ApiError && error.status === 401
          ? t("ui.clearCacheUnauthorized")
          : t("ui.clearCacheError")
      toast.error(message)
    }
  }

  const handleSaveDefaults = () => {
    void saveDefaults({ selected, mappingsMap }, ed).then((synced) => {
      if (!synced) toast.warning(t("ui.defaultsSyncFailed"))
    })
    setSaved(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaved(false), 1500)
  }

  // Barra di navigazione delle schede (Tabs)
  const tabsNav = (
    <div
      role="tablist"
      aria-label={t("ui.settingsTitle")}
      className="flex border-b border-white/10 px-3 sm:px-6 bg-white/[0.02] gap-1 shrink-0"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "style"}
        onClick={() => setActiveTab("style")}
        className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
          activeTab === "style"
            ? "border-accent-orange text-accent-orange"
            : "border-transparent text-zinc-400 hover:text-zinc-200"
        }`}
      >
        <Palette className="w-3.5 h-3.5" />
        <span>{t("ui.settingsTabStyle")}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "prefs"}
        onClick={() => setActiveTab("prefs")}
        className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
          activeTab === "prefs"
            ? "border-accent-orange text-accent-orange"
            : "border-transparent text-zinc-400 hover:text-zinc-200"
        }`}
      >
        <Sliders className="w-3.5 h-3.5" />
        <span>{t("ui.settingsTabPrefs")}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "data"}
        onClick={() => setActiveTab("data")}
        className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
          activeTab === "data"
            ? "border-accent-orange text-accent-orange"
            : "border-transparent text-zinc-400 hover:text-zinc-200"
        }`}
      >
        <Database className="w-3.5 h-3.5" />
        <span>{t("ui.settingsTabData")}</span>
      </button>
    </div>
  )

  // Scheda 1: Stile Poster
  const stylePanel = (
    <div
      role="tabpanel"
      aria-label={t("ui.settingsTabStyle")}
      className={`space-y-3.5 text-xs ${activeTab === "style" ? "block" : "hidden"}`}
    >
      {/* Badge & Provider Predefiniti */}
      <div className="bg-surface/50 border border-surface2/60 rounded-xl p-3.5 space-y-3 shadow-sm">
        <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-accent-orange" />
          {t("ui.badgeSection")}
        </span>

        {/* Master Toggle Genere / Rating */}
        <div className="space-y-2">
          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-300 font-medium flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              {t("ui.genreRatingBadge")}
            </span>
            <Toggle
              value={ed.defaultGlobalBadges}
              onChange={(v) => {
                ed.setDefaultGlobalBadges(v)
                ed.setGlobalBadges(v)
              }}
              label={t("ui.genreRatingBadge")}
            />
          </div>

          {/* Sub-controlli Genere / Anno / Voto */}
          {ed.defaultGlobalBadges && (
            <div className="pl-3 py-1 space-y-2 border-l-2 border-surface2 ml-1 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-muted">{t("ui.badgeGenre")}</span>
                <Toggle
                  value={ed.defaultBadgeGenre}
                  onChange={(v) => {
                    ed.setDefaultBadgeGenre(v)
                    ed.setBadgeGenre(v)
                  }}
                  label={t("ui.badgeGenre")}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">{t("ui.badgeYear")}</span>
                <Toggle
                  value={ed.defaultBadgeYear}
                  onChange={(v) => {
                    ed.setDefaultBadgeYear(v)
                    ed.setBadgeYear(v)
                  }}
                  label={t("ui.badgeYear")}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">{t("ui.badgeRating")}</span>
                <Toggle
                  value={ed.defaultBadgeRating}
                  onChange={(v) => {
                    ed.setDefaultBadgeRating(v)
                    ed.setBadgeRating(v)
                  }}
                  label={t("ui.badgeRating")}
                />
              </div>

              {/* Accordion Provider del voto */}
              {ed.defaultBadgeRating && (
                <div className="pt-2 pb-1 space-y-2 border-t border-surface2/50">
                  <button
                    type="button"
                    onClick={() => setSourcesOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface2/70 hover:bg-surface2 text-zinc-200 hover:text-white border border-surface2 transition-all group cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400/30" />
                      <span>{t("ui.ratingSources")}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent-orange/15 text-accent-orange font-semibold border border-accent-orange/30">
                        {(ed.defaultRatingSources ?? ["imdb", "tmdb"]).length}/16
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted group-hover:text-zinc-200 font-medium">
                      <span>{sourcesOpen ? t("ui.close") : t("ui.configure")}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                          sourcesOpen ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                  </button>

                  {sourcesOpen && (
                    <div className="space-y-2 pt-0.5 animate-fade-in">
                      <div className="flex items-center justify-between px-0.5">
                        <span className="text-[10px] text-muted leading-tight">
                          {t("ui.ratingSourcesHint")}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => {
                              const all = UI_RATING_SOURCES.map((s) => s.id)
                              ed.setDefaultRatingSources(all)
                              ed.setRatingSources(all)
                            }}
                            className="text-accent-orange hover:underline font-semibold transition-colors cursor-pointer"
                          >
                            {t("ui.enableAll")}
                          </button>
                          <span className="text-zinc-600">·</span>
                          <button
                            type="button"
                            onClick={() => {
                              const def = ["imdb", "tmdb"]
                              ed.setDefaultRatingSources(def)
                              ed.setRatingSources(def)
                            }}
                            className="text-muted hover:text-zinc-200 transition-colors cursor-pointer"
                          >
                            {t("ui.disableAll")}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                        {UI_RATING_SOURCES.map((s) => {
                          const current = ed.defaultRatingSources ?? ["imdb", "tmdb"]
                          const isSelected = current.includes(s.id)
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  if (current.length > 1) {
                                    const updated = current.filter((x) => x !== s.id)
                                    ed.setDefaultRatingSources(updated)
                                    ed.setRatingSources(updated)
                                  }
                                } else {
                                  const updated = [...current, s.id]
                                  ed.setDefaultRatingSources(updated)
                                  ed.setRatingSources(updated)
                                }
                              }}
                              className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[10.5px] transition-all duration-150 border cursor-pointer ${
                                isSelected
                                  ? "bg-accent-orange/[0.12] border-accent-orange/35 text-zinc-100 font-medium shadow-sm"
                                  : "bg-white/[0.03] border-white/[0.04] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 hover:border-white/[0.08]"
                              }`}
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <RatingSourceIcon id={s.id} className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{t(s.labelKey)}</span>
                              </span>
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ml-1 transition-colors ${
                                  isSelected ? "bg-accent-orange shadow-sm shadow-accent-orange/50" : "bg-zinc-700"
                                }`}
                              />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <hr className="border-surface2/50" />

        {/* Trend & Network logo & Ribbon side */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-zinc-300 font-medium flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              {t("ui.trendBadge")}
            </span>
            <Toggle
              value={ed.defaultRankingBadges}
              onChange={(v) => {
                ed.setDefaultRankingBadges(v)
                ed.setRankingBadges(v)
              }}
              label={t("ui.trendBadge")}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-300 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              {t("ui.badgeQuality")}
            </span>
            <Toggle
              value={ed.defaultBadgeQuality}
              onChange={(v) => {
                ed.setDefaultBadgeQuality(v)
                ed.setBadgeQuality(v)
              }}
              label={t("ui.badgeQuality")}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-300 font-medium flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-sky-400" />
              {t("ui.networkLogo")}
            </span>
            <Toggle
              value={ed.defaultNetworkLogo}
              onChange={(v) => {
                ed.setDefaultNetworkLogo(v)
                ed.setNetworkLogo(v)
              }}
              label={t("ui.networkLogo")}
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-zinc-300 font-medium flex items-center gap-1.5 shrink-0">
              <Layers className="w-3.5 h-3.5 text-accent-orange" />
              {t("ui.badgePosition")}
            </span>
            <div className="flex gap-1 flex-1 max-w-[160px]">
              <button
                type="button"
                onClick={() => {
                  ed.setDefaultRibbonSide("left")
                  ed.setRibbonSide("left")
                }}
                className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer ${
                  ed.defaultRibbonSide === "left"
                    ? "bg-white/20 text-white shadow-sm"
                    : "bg-white/5 text-muted hover:bg-white/10 hover:text-zinc-200"
                }`}
              >
                Nuvio
              </button>
              <button
                type="button"
                onClick={() => {
                  ed.setDefaultRibbonSide("right")
                  ed.setRibbonSide("right")
                }}
                className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer ${
                  ed.defaultRibbonSide === "right"
                    ? "bg-white/20 text-white shadow-sm"
                    : "bg-white/5 text-muted hover:bg-white/10 hover:text-zinc-200"
                }`}
              >
                Stremio
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stili Grafici Predefiniti */}
      <div className="bg-surface/50 border border-surface2/60 rounded-xl p-3.5 space-y-3 shadow-sm">
        <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-accent-orange" />
          {t("ui.styleDefault")}
        </span>

        <div className="space-y-1.5">
          <label className="text-[11px] text-muted font-medium block">
            {t("ui.styleRankingDefault")}
          </label>
          <BadgeStyleSelector
            value={ed.defaultRankingBadgeStyle}
            options={["default", "colored", "pill"]}
            onChange={(v) => {
              ed.setDefaultRankingBadgeStyle(v)
              ed.setRankingBadgeStyle(v)
            }}
            t={t}
            accentColor={accentColor}
          />
        </div>

        <div className="pt-2 border-t border-surface2/50 space-y-1.5">
          <label className="text-[11px] text-muted font-medium block">
            {t("ui.styleGenreBadge")}
          </label>
          <BadgeStyleSelector
            value={ed.defaultBadgeStyle}
            options={["shadow", "pill", "bar", "colored", "bordo", "vetro"]}
            onChange={(v) => {
              ed.setDefaultBadgeStyle(v)
              ed.setBadgeStyle(v)
            }}
            t={t}
          />
        </div>
      </div>

      {/* Sfumatura & Blur Predefiniti */}
      <div className="bg-surface/50 border border-surface2/60 rounded-xl p-3.5 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-zinc-300 font-medium flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-cyan-400" />
            {t("ui.blurDefault")}
          </span>
          <Toggle
            value={ed.defaultBlurEnabled}
            onChange={(v) => {
              ed.setDefaultBlurEnabled(v)
              ed.setBlurEnabled(v)
            }}
            label={t("ui.blurDefault")}
          />
        </div>

        {ed.defaultBlurEnabled && (
          <div className="space-y-1.5 pt-1.5 border-t border-surface2/50 animate-fade-in">
            <SliderRow
              icon={<Ruler className="w-3.5 h-3.5" />}
              label={t("ui.height")}
              value={ed.defaultGradientHeight}
              min={5}
              max={100}
              boundsMin={5}
              boundsMax={100}
              onChange={(v) => {
                ed.setDefaultGradientHeight(v)
                ed.setGradientHeight(v)
              }}
              onDoubleClick={() => {
                ed.setDefaultGradientHeight(30)
                ed.setGradientHeight(30)
              }}
              editingValue={editVal}
              editText={editTxt}
              setEditingValue={setEditVal}
              setEditText={setEditTxt}
              editingKey="gh"
              suffix="%"
            />
            <SliderRow
              icon={<Cloud className="w-3.5 h-3.5" />}
              label={t("ui.intensity")}
              value={ed.defaultBlurIntensity}
              min={1}
              max={50}
              boundsMin={1}
              boundsMax={50}
              onChange={(v) => {
                ed.setDefaultBlurIntensity(v)
                ed.setBlurIntensity(v)
              }}
              onDoubleClick={() => {
                ed.setDefaultBlurIntensity(5)
                ed.setBlurIntensity(5)
              }}
              editingValue={editVal}
              editText={editTxt}
              setEditingValue={setEditVal}
              setEditText={setEditTxt}
              editingKey="bi"
              suffix="px"
            />
            <SliderRow
              icon={<Minus className="w-3.5 h-3.5" />}
              label={t("ui.fade")}
              value={ed.defaultBlurFade}
              min={0}
              max={100}
              boundsMin={0}
              boundsMax={100}
              onChange={(v) => {
                ed.setDefaultBlurFade(v)
                ed.setBlurFade(v)
              }}
              onDoubleClick={() => {
                ed.setDefaultBlurFade(60)
                ed.setBlurFade(60)
              }}
              editingValue={editVal}
              editText={editTxt}
              setEditingValue={setEditVal}
              setEditText={setEditTxt}
              editingKey="bf"
              suffix="%"
            />
            <SliderRow
              icon={<Circle className="w-3.5 h-3.5" />}
              label={t("ui.darkness")}
              value={ed.defaultBlurDarkness}
              min={0}
              max={100}
              boundsMin={0}
              boundsMax={100}
              onChange={(v) => {
                ed.setDefaultBlurDarkness(v)
                ed.setBlurDarkness(v)
              }}
              onDoubleClick={() => {
                ed.setDefaultBlurDarkness(40)
                ed.setBlurDarkness(40)
              }}
              editingValue={editVal}
              editText={editTxt}
              setEditingValue={setEditVal}
              setEditText={setEditTxt}
              editingKey="bd"
              suffix="%"
            />
          </div>
        )}
      </div>
    </div>
  )

  // Scheda 2: Preferenze & Sistema
  const prefsPanel = (
    <div
      role="tabpanel"
      aria-label={t("ui.settingsTabPrefs")}
      className={`space-y-3.5 text-xs ${activeTab === "prefs" ? "block" : "hidden"}`}
    >
      {/* Classifiche & Localizzazione */}
      <div className="bg-surface/50 border border-surface2/60 rounded-xl p-3.5 space-y-2.5 shadow-sm">
        <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-accent-orange" />
          {t("ui.region")}
        </span>
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="text-zinc-300 font-medium">{t("ui.region")}</span>
          <select
            value={ed.defaultRegion}
            onChange={(e) => {
              ed.setDefaultRegion(e.target.value)
              ed.setRegion(e.target.value)
            }}
            aria-label={t("ui.region")}
            className="max-w-[190px] truncate px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/5 text-zinc-100 border border-white/10 hover:bg-white/10 focus:outline-none focus:border-accent-orange/50 cursor-pointer"
          >
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code} className="bg-zinc-900 text-zinc-100">
                {r.flag} {r.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[10px] text-muted leading-tight">{t("ui.regionHint")}</p>
      </div>

      {/* Fonte Metadati Serie & Episodi */}
      <div className="bg-surface/50 border border-surface2/60 rounded-xl p-3.5 space-y-2.5 shadow-sm">
        <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
          <Tv className="w-3.5 h-3.5 text-sky-400" />
          {t("ui.episodeMetadataSource")}
        </span>
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="text-zinc-300 font-medium">{t("ui.episodeMetadataSource")}</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                ed.setDefaultEpisodeMetadataSource("tmdb")
                ed.setEpisodeMetadataSource("tmdb")
              }}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer ${
                ed.episodeMetadataSource === "tmdb"
                  ? "bg-white/20 text-white shadow-sm"
                  : "bg-white/5 text-muted hover:bg-white/10 hover:text-zinc-200"
              }`}
            >
              TMDB
            </button>
            <button
              type="button"
              onClick={() => {
                ed.setDefaultEpisodeMetadataSource("tvdb")
                ed.setEpisodeMetadataSource("tvdb")
              }}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer ${
                ed.episodeMetadataSource === "tvdb"
                  ? "bg-white/20 text-white shadow-sm"
                  : "bg-white/5 text-muted hover:bg-white/10 hover:text-zinc-200"
              }`}
            >
              TVDB
            </button>
          </div>
        </div>
        <p className="text-[10px] text-muted leading-tight">{t("ui.episodeMetadataSourceHint")}</p>
      </div>

      {/* Automazioni & Aspetto */}
      <div className="bg-surface/50 border border-surface2/60 rounded-xl p-3.5 space-y-2.5 shadow-sm">
        <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-accent-orange" />
          {t("ui.settingsAutomationTitle")}
        </span>
        <div className="flex items-center justify-between py-0.5">
          <span className="text-zinc-300 font-medium flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            {t("ui.autoRotateDefault")}
          </span>
          <Toggle
            value={ed.defaultAutoRotateClean}
            onChange={(v) => {
              ed.setDefaultAutoRotateClean(v)
              ed.setAutoRotateClean(v)
            }}
            label={t("ui.autoRotateDefault")}
          />
        </div>
        <div className="flex items-center justify-between py-0.5">
          <span className="text-zinc-300 font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {t("ui.logoFitEnabled")}
          </span>
          <Toggle
            value={ed.defaultLogoFitEnabled}
            onChange={ed.setDefaultLogoFitEnabled}
            label={t("ui.logoFitEnabled")}
          />
        </div>
        <div className="flex items-center justify-between py-0.5">
          <span className="text-zinc-300 font-medium flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-purple-400" />
            {t("ui.uiAccentDynamic")}
          </span>
          <Toggle value={uiAccent} onChange={setUiAccent} label={t("ui.uiAccentDynamic")} />
        </div>
      </div>
    </div>
  )

  // Scheda 3: Dati & Cache
  const dataPanel = (
    <div
      role="tabpanel"
      aria-label={t("ui.settingsTabData")}
      className={`space-y-3.5 text-xs ${activeTab === "data" ? "block" : "hidden"}`}
    >
      {/* Backup & Configurazione */}
      <div className="bg-surface/50 border border-surface2/60 rounded-xl p-3.5 space-y-2.5 shadow-sm">
        <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-accent-orange" />
          {t("ui.settingsTabData")}
        </span>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <MenuItem
            icon={<Download className="w-3.5 h-3.5 text-accent-orange" />}
            label={t("ui.exportJson")}
            onClick={() => {
              exportData()
              setSettingsOpen(false)
            }}
          />
          <MenuItem
            icon={<Upload className="w-3.5 h-3.5 text-blue-400" />}
            label={t("ui.importJson")}
            onClick={() => {
              importData()
              setSettingsOpen(false)
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setSettingsOpen(false)
            setShowLangPicker(true)
          }}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all border border-white/[0.06] cursor-pointer"
        >
          <Wand2 className="w-3.5 h-3.5 text-accent-orange" />
          {t("ui.repeatSetup")}
        </button>
      </div>

      {/* Diagnostica Cache */}
      <div className="bg-surface/50 border border-surface2/60 rounded-xl p-3.5 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-medium text-muted px-0.5">
          <span className="flex items-center gap-1.5 text-zinc-200 font-semibold">
            <Database className="w-3.5 h-3.5 text-amber-400" />
            {t("ui.cacheDiagnostics")}
          </span>
          <span className="text-zinc-400 text-[10px] font-mono tabular-nums bg-white/5 px-2 py-0.5 rounded border border-white/5">
            {cacheCount !== null
              ? `${cacheCount} ${cacheCount === 1 ? t("ui.cacheEntryOne") : t("ui.cacheEntryMany")}`
              : "1-Click"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={async () => {
              try {
                toast.info(t("ui.warmupStarted"))
                await http<{ ok: boolean }>("/api/warmup", { method: "POST", retries: 0 })
                toast.success(t("ui.warmupDone"))
              } catch {
                toast.error(t("ui.warmupError"))
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 active:scale-[0.98] transition-all border border-amber-500/20 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" />
            Warmup
          </button>
          <button
            type="button"
            onClick={clearCache}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 active:scale-[0.98] transition-all border border-rose-500/20 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {clearStatus === "cleared" ? t("ui.cleared") : t("ui.clearCache")}
          </button>
        </div>
      </div>

      {/* Sicurezza & Accesso PIN */}
      <div className="bg-surface/50 border border-surface2/60 rounded-xl p-3.5 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-medium text-muted px-0.5">
          <span className="flex items-center gap-1.5 text-zinc-200 font-semibold">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>{t("ui.pinSecurityTitle")}</span>
          </span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
              pinConfig?.hasPin
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-white/5 text-zinc-400 border-white/5"
            }`}
          >
            {pinConfig?.hasPin ? t("ui.pinActive") : t("ui.pinNotConfigured")}
          </span>
        </div>
        <p className="text-[10px] text-muted leading-tight">
          {t("ui.pinSecurityDesc")}
        </p>

        {pinModalMode === null ? (
          <div className="flex gap-2 pt-1">
            {!pinConfig?.hasPin ? (
              <button
                type="button"
                onClick={() => {
                  setCurPinInput("")
                  setNewPinInput("")
                  setPinModalMode("set")
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 active:scale-[0.98] transition-all border border-amber-500/20 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                {t("ui.pinConfigure")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setCurPinInput("")
                    setNewPinInput("")
                    setPinModalMode("set")
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium bg-white/[0.05] text-zinc-200 hover:bg-white/[0.1] active:scale-[0.98] transition-all border border-white/10 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  {t("ui.pinChange")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurPinInput("")
                    setPinModalMode("remove")
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 active:scale-[0.98] transition-all border border-rose-500/20 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t("ui.pinRemove")}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2 pt-1 border-t border-white/5">
            {pinModalMode === "set" ? (
              <>
                {pinConfig?.hasPin && (
                  <div>
                    <label className="text-[10px] text-muted block mb-1">{t("ui.pinCurrentLabel")}</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      value={curPinInput}
                      onChange={(e) => setCurPinInput(e.target.value.replace(/\D/g, ""))}
                      placeholder="••••"
                      className="w-full text-center text-sm font-mono tracking-widest py-1.5 px-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[10px] text-muted block mb-1">{t("ui.pinNewLabel")}</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="w-full text-center text-sm font-mono tracking-widest py-1.5 px-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPinModalMode(null)}
                    disabled={pinBusy}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-medium bg-white/5 text-zinc-400 hover:text-zinc-200 border border-white/5 cursor-pointer"
                  >
                    {t("ui.cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={newPinInput.length < 4 || (pinConfig?.hasPin && !curPinInput) || pinBusy}
                    onClick={async () => {
                      setPinBusy(true)
                      try {
                        const res = await fetch("/api/auth/pin", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ currentPin: curPinInput, newPin: newPinInput }),
                        })
                        if (res.ok) {
                          if (typeof window !== "undefined") {
                            window.dispatchEvent(new CustomEvent("pictorium:pin-change", { detail: { unlocked: true } }))
                          }
                          toast.success(t("ui.pinSavedSuccess"))
                          setPinModalMode(null)
                          refreshPin()
                        } else {
                          const err = await res.json().catch(() => ({}))
                          toast.error(err.error || t("ui.pinSaveError"))
                        }
                      } catch {
                        toast.error(t("ui.pinConnError"))
                      } finally {
                        setPinBusy(false)
                      }
                    }}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  >
                    {pinBusy ? t("ui.saving") : t("ui.save")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-[10px] text-muted block mb-1">{t("ui.pinRemoveConfirmLabel")}</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={curPinInput}
                    onChange={(e) => setCurPinInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="w-full text-center text-sm font-mono tracking-widest py-1.5 px-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500/50"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPinModalMode(null)}
                    disabled={pinBusy}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-medium bg-white/5 text-zinc-400 hover:text-zinc-200 border border-white/5 cursor-pointer"
                  >
                    {t("ui.cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={!curPinInput || pinBusy}
                    onClick={async () => {
                      setPinBusy(true)
                      try {
                        const res = await fetch("/api/auth/pin", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ currentPin: curPinInput }),
                        })
                        if (res.ok) {
                          if (typeof window !== "undefined") {
                            window.dispatchEvent(new CustomEvent("pictorium:pin-change", { detail: { unlocked: false } }))
                          }
                          toast.success(t("ui.pinRemovedSuccess"))
                          setPinModalMode(null)
                          refreshPin()
                        } else {
                          const err = await res.json().catch(() => ({}))
                          toast.error(err.error || t("ui.pinLockWrong"))
                        }
                      } catch {
                        toast.error(t("ui.pinConnError"))
                      } finally {
                        setPinBusy(false)
                      }
                    }}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  >
                    {pinBusy ? t("ui.loading") : t("ui.pinConfirmRemove")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )

  // Sticky Actions Footer
  const footer = (
    <div className="border-t border-white/10 bg-[#0d0d10]/95 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0">
      <button
        type="button"
        onClick={() => setSettingsOpen(false)}
        className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-zinc-300 hover:text-white transition-all active:scale-95 cursor-pointer"
      >
        {t("ui.close")}
      </button>
      <button
        type="button"
        onClick={handleSaveDefaults}
        className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-accent-orange hover:bg-accent-orange/90 text-white shadow-lg shadow-accent-orange/25 active:scale-95 transition-all cursor-pointer"
      >
        {saved ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>{t("ui.saved")}</span>
          </>
        ) : (
          <>
            <Save className="w-3.5 h-3.5" />
            <span>{t("ui.saveDefaults")}</span>
          </>
        )}
      </button>
    </div>
  )

  // Layout Mobile (innestato nella schermata di AppShell)
  if (mobile) {
    return (
      <div ref={settingsRef} className="space-y-4">
        {tabsNav}
        <div className="pt-2">
          {stylePanel}
          {prefsPanel}
          {dataPanel}
        </div>
        <div className="pt-3">
          {footer}
        </div>
      </div>
    )
  }

  // Layout Desktop: Modal Dialog centrato con backdrop blur
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        ref={settingsRef}
        tabIndex={-1}
        className="relative outline-none w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-white/10 bg-[#121216] shadow-2xl shadow-black/90 select-text animate-modal-panel-in overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 bg-[#141418] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-orange/15 text-accent-orange border border-accent-orange/25">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 id="settings-dialog-title" className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-1.5">
                <span>{t("ui.settingsTitle")}</span>
              </h3>
              <p className="text-[11px] text-muted hidden sm:block">
                {t("ui.settingsSubtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={t("ui.close")}
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-90 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {tabsNav}

        {/* Contenuto scrollabile */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {stylePanel}
          {prefsPanel}
          {dataPanel}
        </div>

        {footer}
      </div>
    </div>
  )
}
