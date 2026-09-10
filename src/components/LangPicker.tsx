"use client"

import { useState, useRef, useEffect } from "react"
import { PICKER_LANGS } from "@/lib/utils"
import { REGIONS } from "@/lib/regions"
import { useT } from "@/lib/contexts/TranslationContext"
import { ChevronLeft, Lock, ArrowRight, ShieldCheck } from "lucide-react"

interface SetupWizardProps {
  /** Applica la lingua (codice 2 lettere) senza chiudere il wizard. */
  onPickLang: (code: string) => void
  /** Applica la nazionalità delle liste (codice regione, es. "IT"). */
  onPickRegion: (regionCode: string) => void
  /** Chiude il wizard. */
  onDone: () => void
}

/**
 * Configurazione guidata iniziale in 3 passi:
 * 1. lingua dell'interfaccia (12 nazionalità),
 * 2. nazionalità delle liste/classifiche (stesse 12),
 * 3. protezione con PIN (per proteggere l'accesso al pannello).
 */
export function LangPicker({ onPickLang, onPickRegion, onDone }: SetupWizardProps) {
  const { t } = useT()
  const [step, setStep] = useState<"lang" | "region" | "pin">("lang")
  const [pin, setPin] = useState("")
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinLoading, setPinLoading] = useState(false)
  const pinInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === "pin") {
      pinInputRef.current?.focus()
    }
  }, [step])

  const pickLang = (code: string) => {
    onPickLang(code)
    setStep("region")
  }

  const pickRegion = (regionCode: string) => {
    onPickRegion(regionCode)
    setStep("pin")
  }

  const handleSavePin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (pin.length < 4) {
      setPinError(t("ui.setupPinMinDigits"))
      return
    }
    setPinLoading(true)
    setPinError(null)

    try {
      const res = await fetch("/api/auth/pin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPin: pin }),
      })

      if (res.ok) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("pictorium:pin-change", { detail: { unlocked: true } }))
        }
        onDone()
      } else {
        const err = await res.json().catch(() => ({}))
        setPinError(err.error || t("ui.pinSaveError"))
      }
    } catch {
      setPinError(t("ui.pinConnError"))
    } finally {
      setPinLoading(false)
    }
  }

  const handleSkipPin = () => {
    onDone()
  }

  const getTitle = () => {
    if (step === "pin") return t("ui.setupPinTitle")
    if (step === "region") return t("ui.setupRegionTitle")
    return t("ui.welcome")
  }

  const getSubtitle = () => {
    if (step === "pin") return t("ui.setupPinSubtitle")
    if (step === "region") return t("ui.setupRegionSubtitle")
    return t("ui.welcomeSubtitle")
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center animate-fade-in">
      <div className="w-full max-w-lg mx-4">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element -- local SVG asset */}
          <img src="/SpatialPosters.svg" alt="SpatialPosters" loading="eager" decoding="async" className="h-auto w-[min(92vw,430px)] mx-auto mb-4 hover:brightness-110 transition-all duration-150" />
          <h2 className="text-2xl font-bold text-zinc-100">{getTitle()}</h2>
          <p className="text-sm text-muted mt-1.5">{getSubtitle()}</p>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mt-4" aria-hidden="true">
            <span className={`h-1.5 rounded-full transition-all duration-300 ${step === "lang" ? "w-6 bg-accent-orange" : "w-1.5 bg-zinc-600"}`} />
            <span className={`h-1.5 rounded-full transition-all duration-300 ${step === "region" ? "w-6 bg-accent-orange" : "w-1.5 bg-zinc-600"}`} />
            <span className={`h-1.5 rounded-full transition-all duration-300 ${step === "pin" ? "w-6 bg-accent-orange" : "w-1.5 bg-zinc-600"}`} />
          </div>
        </div>

        {step === "lang" && (
          <div key="lang" className="grid grid-cols-2 gap-2 max-h-[52vh] overflow-y-auto pr-0.5 animate-step-enter">
            {PICKER_LANGS.map((l) => (
              <button type="button" key={l.key} onClick={() => pickLang(l.code)} className="surface-card flex items-center gap-2 px-4 py-3.5 rounded-2xl hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 text-left group cursor-pointer">
                <span className="text-2xl shrink-0">{l.flag}</span>
                <div>
                  <p className="text-sm font-medium text-zinc-200 group-hover:text-accent transition-colors">{l.name}</p>
                  <p className="text-xs text-muted uppercase tracking-wider">{l.sub}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === "region" && (
          <div key="region" className="grid grid-cols-2 gap-2 max-h-[52vh] overflow-y-auto pr-0.5 animate-step-enter">
            {REGIONS.map((r) => (
              <button type="button" key={r.code} onClick={() => pickRegion(r.code)} className="surface-card flex items-center gap-2 px-4 py-3.5 rounded-2xl hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 text-left group cursor-pointer">
                <span className="text-2xl shrink-0">{r.flag}</span>
                <div>
                  <p className="text-sm font-medium text-zinc-200 group-hover:text-accent transition-colors">{r.label}</p>
                  <p className="text-xs text-muted uppercase tracking-wider">{r.code}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === "pin" && (
          <div key="pin" className="surface-card p-6 sm:p-8 rounded-3xl animate-step-enter max-w-sm mx-auto flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <Lock className="w-6 h-6" />
            </div>

            <form onSubmit={handleSavePin} className="w-full space-y-4">
              <div>
                <input
                  ref={pinInputRef}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ""))
                    setPinError(null)
                  }}
                  placeholder="••••"
                  className="w-full text-center text-2xl font-mono tracking-[0.3em] py-3 px-4 rounded-2xl bg-black/40 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
                {pinError && (
                  <p className="text-xs text-rose-400 text-center mt-2 font-medium">{pinError}</p>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t("ui.setupPinStremioNotice")}</span>
              </div>

              <button
                type="submit"
                disabled={pin.length < 4 || pinLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold text-xs tracking-wide uppercase hover:opacity-90 active:scale-98 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{pinLoading ? t("ui.setupPinSaving") : t("ui.setupPinSave")}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSkipPin}
                className="w-full py-2 text-center text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                {t("ui.setupPinSkip")}
              </button>
            </form>
          </div>
        )}

        {step !== "lang" && (
          <button
            type="button"
            onClick={() => setStep(step === "pin" ? "region" : "lang")}
            className="mx-auto mt-5 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {t("ui.back")}
          </button>
        )}
      </div>
    </div>
  )
}
