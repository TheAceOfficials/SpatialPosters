"use client"

import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { usePSelector } from "@/lib/context"
import { useT } from "@/lib/contexts/TranslationContext"
import { usePosterEditor } from "@/lib/contexts/PosterEditorContext"
import { LANG_FLAGS, LANG_NAMES, UI_LANGUAGES } from "@/lib/utils"
import { LangPicker } from "@/components/LangPicker"
import { ToastProvider } from "@/components/Toast"
import { AmbientBackground } from "@/components/AmbientBackground"
import { HomeStatusStrip } from "@/components/HomeStatusStrip"
import { AnimatedSpatialWord } from "@/components/AnimatedSpatialWord"
import { RefreshCw, Settings, Globe, HeartPulse, Sparkles, Check, QrCode, Palette, Layers, Sun, Moon, Home } from "lucide-react"
import { BladeSpinner } from "@/components/ui/BladeSpinner"
import { DesktopSidebar } from "@/components/DesktopSidebar"
import { MobileDock } from "@/components/MobileDock"

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
  const theme = usePSelector((v) => v.theme)
  const setTheme = usePSelector((v) => v.setTheme)
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
          if (typeof data.authenticated === "boolean") {
            setIsUnlocked(data.authenticated)
          }
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
        {refreshing ? <BladeSpinner size="14px" /> : <RefreshCw className="w-3.5 h-3.5" />}
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

  const handleDoneLangPicker = () => {
    setShowLangPicker(false)
    try {
      localStorage.setItem("spatial_setup_completed", "true")
      if (!localStorage.getItem("preferred_lang")) {
        localStorage.setItem("preferred_lang", lang || "en")
      }
    } catch {}
  }

  return (
    <>
    <ToastProvider>
    <div className="app-shell text-foreground relative overflow-x-hidden" style={{ "--bg-accent": accentColor ?? undefined } as CSSProperties}>
      <AmbientBackground />
      {serviceErrors.tmdb && (
        <div className="mx-auto max-w-lg mt-2 mb-0 px-4 py-2 bg-red-900/40 border border-red-800/50 rounded-xl text-xs text-red-300 text-center">
          {t("ui.statusTmdbUnavailable")}
        </div>
      )}
      {showLangPicker && (
        <LangPicker
          onPickLang={pickLang}
          onPickRegion={(regionCode) => { ed.setDefaultRegion(regionCode); ed.setRegion(regionCode) }}
          onDone={handleDoneLangPicker}
        />
      )}

      {/* Desktop Unified Left Sidebar Dock */}
      <DesktopSidebar />

      <div className="relative z-10 max-w-[1680px] mx-auto px-4 sm:px-6 pt-6 sm:pt-10 md:pt-14 lg:pt-16 pb-24 md:pb-8 md:pl-20">
        {/* Header globale (logo + tagline + toolbar mobile) */}
        {!(view === "edit" && selected) && (
        <div className="flex flex-col items-center pb-5 sm:pb-8 md:pb-10 animate-fade-scale-in relative">
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
            className="header-logo h-10 sm:h-14 md:h-24 w-auto cursor-pointer hover:brightness-110 active:scale-95 transition-all duration-150 mb-3 sm:mb-4 md:mb-5"
          />
          <p className="header-tagline text-center text-xs sm:text-sm md:text-base mb-3.5 sm:mb-5 md:mb-6 max-w-xl text-zinc-300 flex items-center justify-center gap-2 flex-wrap font-medium">
            <span>Enhance your Poster Experience with</span>
            <AnimatedSpatialWord />
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

      {/* Mobile Floating Split Liquid Glass Dock */}
      <MobileDock />
    </div>
    </ToastProvider>
    {!showLangPicker && <OnboardingTour />}
    {hasPinConfigured && !isUnlocked && !showLangPicker && (
      <PinLockModal onSuccess={handlePinUnlock} />
    )}
    </>
  )
}
