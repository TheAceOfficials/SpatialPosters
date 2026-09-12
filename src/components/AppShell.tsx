"use client"

import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react"
import dynamic from "next/dynamic"
import { usePSelector } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { usePosterEditor } from "@/lib/contexts/PosterEditorContext"
import { LANG_FLAGS, LANG_NAMES, UI_LANGUAGES } from "@/lib/utils"
import { LangPicker } from "@/components/LangPicker"
import { ToastProvider } from "@/components/Toast"
import { HomeStatusStrip } from "@/components/HomeStatusStrip"
import { RefreshCw, Settings, Globe, HeartPulse, Sparkles, Check, QrCode, Palette, Layers } from "lucide-react"

function InstagramIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

// Code-splitting: viste/modali pesanti caricate on-demand per ridurre il JS iniziale.
const SettingsPanel = dynamic(() => import("@/components/SettingsPanel").then((m) => m.SettingsPanel), { ssr: false })
const SearchView = dynamic(() => import("@/components/SearchView").then((m) => m.SearchView), { ssr: false })
const MyPostersView = dynamic(() => import("@/components/MyPostersView").then((m) => m.MyPostersView), { ssr: false })
const CataloghiView = dynamic(() => import("@/components/CataloghiView").then((m) => m.CataloghiView), { ssr: false })
const EditView = dynamic(() => import("@/components/EditView"), { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-xs text-zinc-500 animate-pulse">…</div> })
const ProxyModal = dynamic(() => import("@/components/ProxyModal").then((m) => m.ProxyModal), { ssr: false })
const InstallModal = dynamic(() => import("@/components/InstallModal").then((m) => m.InstallModal), { ssr: false })
const OnboardingTour = dynamic(() => import("@/components/OnboardingTour").then((m) => m.OnboardingTour), { ssr: false })
const PinLockModal = dynamic(() => import("@/components/PinLockModal").then((m) => m.PinLockModal), { ssr: false })

export function AppShell() {
  const setLangOpen = usePSelector((v) => v.setLangOpen)
  const setSettingsOpen = usePSelector((v) => v.setSettingsOpen)
  const accentColor = usePSelector((v) => v.accentColor)
  const settingsOpen = usePSelector((v) => v.settingsOpen)
  const serviceErrors = usePSelector((v) => v.serviceErrors)

  const showLangPicker = usePSelector((v) => v.showLangPicker)
  const urlPattern = usePSelector((v) => v.urlPattern)
  const view = usePSelector((v) => v.view)
  const router = usePSelector((v) => v.router)
  const mappings = usePSelector((v) => v.mappings)
  const selected = usePSelector((v) => v.selected)
  const exportData = usePSelector((v) => v.exportData)
  const importData = usePSelector((v) => v.importData)
  const goHome = usePSelector((v) => v.goHome)
  const refreshLists = usePSelector((v) => v.refreshLists)
  const langRef = usePSelector((v) => v.langRef)
  const langOpen = usePSelector((v) => v.langOpen)
  const { t, lang, pickLang } = useT()
  const ed = usePosterEditor()
  const setShowLangPicker = usePSelector((v) => v.setShowLangPicker)
  const [refreshing, setRefreshing] = useState(false)
  const [proxyOpen, setProxyOpen] = useState(false)
  const [closingLang, setClosingLang] = useState(false)
  const [closingSettings, setClosingSettings] = useState(false)
  const closingLangRef = useRef<ReturnType<typeof setTimeout>>(null)
  const closingSettingsRef = useRef<ReturnType<typeof setTimeout>>(null)

  const closeLang = () => {
    setClosingLang(true)
    closingLangRef.current = setTimeout(() => { setLangOpen(false); setClosingLang(false) }, 150)
  }

  const closeSettings = () => {
    setClosingSettings(true)
    closingSettingsRef.current = setTimeout(() => { setSettingsOpen(false); setClosingSettings(false) }, 150)
  }

  const [hasPinConfigured, setHasPinConfigured] = useState<boolean | null>(null)
  const [isUnlocked, setIsUnlocked] = useState(false)

  const checkPinStatus = useCallback(() => {
    fetch("/api/auth/pin")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.hasPin === "boolean") {
          setHasPinConfigured(data.hasPin)
        }
      })
      .catch(() => null)
  }, [])

  useEffect(() => {
    checkPinStatus()
    const handlePinChange = (e: Event) => {
      const custom = e as CustomEvent<{ unlocked?: boolean }>
      if (custom.detail?.unlocked) {
        setIsUnlocked(true)
      }
      checkPinStatus()
    }
    window.addEventListener("spatialposters:pin-change", handlePinChange)
    window.addEventListener("pictorium:pin-change", handlePinChange)
    return () => {
      window.removeEventListener("spatialposters:pin-change", handlePinChange)
      window.removeEventListener("pictorium:pin-change", handlePinChange)
    }
  }, [checkPinStatus])

  const handlePinUnlock = () => {
    setIsUnlocked(true)
  }

  // Il pannello impostazioni completo si chiude con Esc
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setSettingsOpen(false) }
    addEventListener("keydown", fn)
    return () => removeEventListener("keydown", fn)
  }, [setSettingsOpen])

  useEffect(() => {
    return () => {
      if (closingLangRef.current) clearTimeout(closingLangRef.current)
      if (closingSettingsRef.current) clearTimeout(closingSettingsRef.current)
    }
  }, [])

  // Blocca lo scroll del body quando le impostazioni mobili sono aperte
  useEffect(() => {
    if (!settingsOpen) return
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768
    if (!isMobile) return
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [settingsOpen])

  const [installOpen, setInstallOpen] = useState(false)

  const handleInstallCatalog = () => {
    setInstallOpen(true)
  }

  // Toolbar rapida mobile: compatto e raffinato
  const mobileToolbar = (
    <div className="flex md:hidden items-center gap-2 justify-center p-1.5 px-3 rounded-2xl bg-surface/80 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20 relative z-30">
      <div className="relative">
        <button
          type="button"
          aria-label={t("ui.chooseLanguage")}
          onClick={() => setLangOpen((o) => !o)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium text-zinc-300 bg-white/[0.05] border border-white/10 active:scale-95 transition-all"
          title={LANG_NAMES[lang]}
        >
          <span>{LANG_FLAGS[lang] || <Globe className="w-3.5 h-3.5" />}</span>
          <span className="text-[11px] uppercase tracking-wider">{lang}</span>
        </button>
        {langOpen && (
          <div className="absolute left-0 top-full mt-2 bg-black/90 backdrop-blur-2xl border border-white/15 rounded-xl p-1.5 shadow-2xl shadow-black/80 z-50 min-w-40 animate-fade-scale-in">
            {UI_LANGUAGES.map((l) => (
              <button
                type="button"
                key={l.code}
                onClick={() => { pickLang(l.code); setLangOpen(false) }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all text-left hover:bg-zinc-800 cursor-pointer ${l.code === lang ? "bg-accent/15 text-accent-orange font-semibold" : "text-zinc-300"}`}
              >
                <span className="flex items-center gap-2">
                  <span>{l.flag}</span>
                  <span>{l.name}</span>
                </span>
                {l.code === lang && <Check className="w-3.5 h-3.5 text-accent-orange shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label={t("ui.refreshLists")}
        onClick={async () => { setRefreshing(true); await refreshLists(); setRefreshing(false) }}
        disabled={refreshing}
        className="p-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-zinc-300 active:scale-90 transition-all"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
      </button>

      <a
        href="/status"
        aria-label={t("ui.statusTitle")}
        className="p-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-zinc-300 active:scale-90 transition-all"
      >
        <HeartPulse className="w-3.5 h-3.5" />
      </a>

      <button
        type="button"
        aria-label={t("ui.addonProxy")}
        onClick={() => setProxyOpen(true)}
        className="p-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-accent-orange active:scale-90 transition-all"
      >
        <Sparkles className="w-3.5 h-3.5" />
      </button>
    </div>
  )

  return (
    <>
    <ToastProvider>
    <div className="app-shell text-foreground relative overflow-x-hidden" style={{ "--bg-accent": accentColor ?? undefined } as CSSProperties}>
      {serviceErrors.tmdb && (
        <div className="mx-auto max-w-lg mt-2 mb-0 px-4 py-2 bg-red-900/40 border border-red-800/50 rounded-xl text-xs text-red-300 text-center">
          {t("ui.statusTmdbUnavailable")}
        </div>
      )}
      {showLangPicker && (
        <LangPicker
          onPickLang={pickLang}
          onPickRegion={(regionCode) => { ed.setDefaultRegion(regionCode); ed.setRegion(regionCode) }}
          onDone={() => setShowLangPicker(false)}
        />
      )}

      {/* Desktop Toolbar — Floating Island */}
      <div className="hidden md:flex absolute top-4 right-4 z-20">
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-950/70 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/60 relative z-50">
          {/* Installa Pictorium Hub Pill Button */}
          <button
            type="button"
            onClick={handleInstallCatalog}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs shadow-md shadow-white/10 hover:shadow-white/20 hover:scale-[1.02] active:scale-[0.97] transition-all duration-150 border border-white/40 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-zinc-950" />
            <span>{t("ui.installHub")}</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* Cataloghi Button */}
          <button
            type="button"
            onClick={() => { if (view === "cataloghi") { router.push("edit") } else { router.push("cataloghi") } }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.95] cursor-pointer ${
              view === "cataloghi"
                ? "bg-white/15 text-white font-semibold border border-white/20"
                : "text-zinc-300 hover:text-white hover:bg-white/[0.08]"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-zinc-300" />
            <span>{t("ui.catalogs") || "Cataloghi"}</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* I Miei Poster Badge */}
          <button
            type="button"
            aria-label={t("ui.myPostersBtn")}
            title={t("ui.myPostersBtn")}
            onClick={() => { if (view === "myposters") { router.push("edit") } else { router.push("myposters") } }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.95] cursor-pointer ${
              view === "myposters"
                ? "bg-white/15 text-white font-semibold border border-white/20"
                : "text-zinc-300 hover:text-white hover:bg-white/[0.08]"
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-zinc-300" />
            <span>{mappings.length}</span>
          </button>

          {/* Proxy Modal */}
          <button
            type="button"
            aria-label={t("ui.addonProxy")}
            title={t("ui.addonProxy")}
            onClick={() => setProxyOpen(true)}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-90 transition-all duration-150 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Settings Button */}
          <button
            type="button"
            aria-label={t("ui.settings")}
            title={t("ui.settings")}
            onClick={(e) => { e.stopPropagation(); setSettingsOpen((o) => !o) }}
            className={`p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-90 transition-all duration-150 cursor-pointer ${
              settingsOpen ? "bg-white/10 text-white" : ""
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative z-10 max-w-[1680px] mx-auto px-3 sm:px-4 pt-3 sm:pt-5 md:pt-[68px] pb-24 md:pb-6">
        {/* Header globale (logo + tagline + toolbar mobile) */}
        {!(view === "edit" && selected) && (
        <div className="flex flex-col items-center pb-3 sm:pb-4 animate-fade-scale-in relative">
          <>
          {/* eslint-disable-next-line @next/next/no-img-element -- local SVG asset */}
          <img
            onClick={goHome}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goHome() } }}
            role="button"
            tabIndex={0}
            aria-label={t("ui.home")}
            src="/SpatialPosters.png"
            alt="SpatialPosters"
            decoding="async"
            className="header-logo h-10 sm:h-14 md:h-24 w-auto cursor-pointer hover:brightness-110 active:scale-95 transition-all duration-150 mb-1.5 md:mb-2"
          />
          <p className="header-tagline text-center text-[10px] sm:text-xs md:text-sm mb-3.5 sm:mb-5 md:mb-6 max-w-xs sm:max-w-none text-zinc-400 flex items-center justify-center gap-1.5 flex-wrap">
            <span>{t("ui.homeTagline")}</span>
            <span className="text-zinc-500">•</span>
            <span>Created by</span>
            <a
              href="https://instagram.com/TheAceOfficials"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-zinc-200 hover:text-white underline decoration-accent-orange/50 hover:decoration-accent-orange transition-all cursor-pointer"
            >
              <InstagramIcon className="w-3.5 h-3.5 text-accent-orange inline" />
              <span>@TheAceOfficials</span>
            </a>
          </p>
          {mobileToolbar}
          </>
        </div>
        )}

        <ProxyModal isOpen={proxyOpen} onClose={() => setProxyOpen(false)} />
        <InstallModal isOpen={installOpen} onClose={() => setInstallOpen(false)} posterUrlPattern={urlPattern} />
        <div key={view} className="animate-view-enter">
          {view === "search" ? <SearchView /> : view === "myposters" ? <MyPostersView /> : view === "cataloghi" ? <CataloghiView /> : <EditView />}
        </div>
        {/* Strip di stato: presente nelle viste principali, nascosto in editor poster */}
        {!(view === "edit" && selected) && <HomeStatusStrip />}
      </div>

      {/* Desktop Bottom-Right Utility Cluster */}
      <div className="hidden md:block fixed bottom-5 right-5 z-50">
        <div className="flex items-center gap-2 floating-group">
          <button type="button"
            aria-label={t("ui.refreshLists")}
            onClick={async () => { setRefreshing(true); await refreshLists(); setRefreshing(false) }}
            disabled={refreshing}
            title={t("ui.refreshLists")}
            className="h-9 w-9 flex items-center justify-center rounded-lg active:scale-90 transition-all duration-150 text-sm hover:bg-white/[0.08] press-scale"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <a href="/status" aria-label={t("ui.statusTitle")} className="h-9 w-9 flex items-center justify-center rounded-lg active:scale-90 transition-all duration-150 text-sm hover:bg-white/[0.08] press-scale"><HeartPulse className="w-4 h-4" /></a>
          <div ref={langRef} className="relative">
            <button type="button" aria-label={t("ui.chooseLanguage")} onClick={() => setLangOpen((o) => !o)} className={`h-9 w-9 flex items-center justify-center rounded-lg active:scale-90 transition-all duration-150 text-sm press-scale ${langOpen ? "dropdown-open" : "hover:bg-white/[0.08]"}`} title={LANG_NAMES[lang]}>{LANG_FLAGS[lang] || <Globe className="w-4 h-4" />}</button>
            {(langOpen || closingLang) && (
              <div className={`absolute right-0 bottom-full mb-3 bg-black/60 backdrop-blur-xl border border-border/50 rounded-xl p-2 shadow-2xl shadow-black/50 z-50 min-w-40 ${closingLang ? "animate-fade-scale-out" : "animate-fade-scale-in"} dropdown-open`}>
                {UI_LANGUAGES.map((l) => (
                  <button
                    type="button"
                    key={l.code}
                    onClick={() => { pickLang(l.code); closeLang() }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all duration-150 text-left hover:bg-zinc-700/50 active:scale-[0.98] ${l.code === lang ? "bg-accent/10 text-accent font-medium" : "text-zinc-300"}`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{l.flag}</span>
                      <span>{l.name}</span>
                    </span>
                    {l.code === lang && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (iOS / Android Style) */}
      <nav
        aria-label={t("ui.mainNav")}
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/90 backdrop-blur-2xl border-t border-white/[0.08] shadow-[0_-10px_30px_rgba(0,0,0,0.5)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-all duration-200 ${
          view === "edit" && selected ? "translate-y-full pointer-events-none opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <div className="grid grid-cols-4 items-center justify-around max-w-md mx-auto">
          {/* Cataloghi */}
          <button
            type="button"
            onClick={() => router.replace("cataloghi")}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all duration-150 active:scale-90 cursor-pointer ${
              view === "cataloghi"
                ? "text-accent-orange font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] tracking-tight truncate">{t("ui.catalogs") || "Cataloghi"}</span>
          </button>

          {/* Installa Hub (Featured Central Pill) */}
          <button
            type="button"
            onClick={handleInstallCatalog}
            className="flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all duration-150 active:scale-90 cursor-pointer text-zinc-300 hover:text-white"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-orange to-amber-500 flex items-center justify-center text-white shadow-md shadow-accent-orange/30 -mt-2">
              <QrCode className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-white tracking-tight truncate">{t("ui.install")}</span>
          </button>

          {/* I Miei Poster */}
          <button
            type="button"
            onClick={() => router.replace("myposters")}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all duration-150 active:scale-90 cursor-pointer relative ${
              view === "myposters"
                ? "text-accent-orange font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <div className="relative">
              <Palette className="w-5 h-5" />
              {mappings.length > 0 && (
                <span className="absolute -top-1 -right-2 px-1 min-w-3.5 h-3.5 bg-accent-orange text-[9px] font-bold text-white rounded-full flex items-center justify-center leading-none">
                  {mappings.length}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight truncate">{t("ui.myPostersBtn") || "I Miei"}</span>
          </button>

          {/* Impostazioni */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all duration-150 active:scale-90 cursor-pointer ${
              settingsOpen
                ? "text-accent-orange font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] tracking-tight truncate">{t("ui.settingsTitle") || "Opzioni"}</span>
          </button>
        </div>
      </nav>

      {/* Desktop Settings Modal */}
      <div className="hidden md:block">
        {settingsOpen && (
          <SettingsPanel
            setSettingsOpen={setSettingsOpen}
            exportData={exportData}
            importData={importData}
          />
        )}
      </div>

      {(settingsOpen || closingSettings) && (
        <div role="dialog" aria-modal="true" aria-label={t("ui.settingsTitle")} className={`fixed inset-0 z-[70] bg-background md:hidden overflow-y-auto ${closingSettings ? "animate-fade-out" : "animate-fade-scale-in"}`}>
          <div className="fixed inset-0 z-[-1]" onClick={() => closeSettings()} />
          <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-2xl flex items-center justify-between px-4 py-3.5 border-b border-white/10 shadow-lg shadow-black/20">
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Settings className="w-4 h-4 text-accent-orange" />
              <span>{t("ui.settingsTitle")}</span>
            </h2>
            <button
              type="button"
              autoFocus
              aria-label={t("ui.back")}
              onClick={() => closeSettings()}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] border border-white/10 text-xs font-semibold text-zinc-200 hover:text-white active:scale-90 transition-all duration-150 press-scale"
            >
              {t("ui.back")}
            </button>
          </div>
          <div className="p-4 pb-[max(6rem,env(safe-area-inset-bottom)+4rem)] max-w-lg mx-auto">
            <SettingsPanel mobile setSettingsOpen={setSettingsOpen} exportData={exportData} importData={importData} />
          </div>
        </div>
      )}
    </div>
    </ToastProvider>
    {!showLangPicker && <OnboardingTour />}
    {hasPinConfigured && !isUnlocked && !showLangPicker && (
      <PinLockModal onSuccess={handlePinUnlock} />
    )}
    </>
  )
}
