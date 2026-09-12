"use client"

import React, { useState, useEffect, useRef } from "react"
import { Search, Sparkles, Image, MonitorSmartphone, ChevronRight, ChevronLeft, X } from "lucide-react"
import { useT } from "@/lib/contexts/TranslationContext"

// Fix M20: gli step usano chiavi i18n (STEPS era interamente hardcoded in
// italiano). Le chiavi vivono nei 5 dizionari (ui.onboarding*).
const STEPS = [
  { icon: Search, titleKey: "ui.onboardingSearchTitle", descKey: "ui.onboardingSearchDesc" },
  { icon: Sparkles, titleKey: "ui.onboardingBadgesTitle", descKey: "ui.onboardingBadgesDesc" },
  { icon: Image, titleKey: "ui.onboardingPosterTitle", descKey: "ui.onboardingPosterDesc" },
  { icon: MonitorSmartphone, titleKey: "ui.onboardingSaveTitle", descKey: "ui.onboardingSaveDesc" },
]

const LS_KEY = "spatial_onboarding_done"
const LEGACY_LS_KEY = "pictorium_onboarding_done"

export function OnboardingTour() {
  const { t } = useT()
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const done = localStorage.getItem(LS_KEY) || localStorage.getItem(LEGACY_LS_KEY)
      if (!done) setShow(true)
    } catch {
      setShow(true)
    }
  }, [])

  // Cleanup del timer di chiusura su unmount: evita setState su componente smontato
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const close = () => {
    setLeaving(true)
    closeTimerRef.current = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, "true") } catch {}
      setShow(false)
      setLeaving(false)
      closeTimerRef.current = null
    }, 150)
  }

  if (!show) return null

  const StepIcon = STEPS[step].icon
  const isLast = step === STEPS.length - 1

  return (
    <div
      className={`fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-150 ${
        leaving ? "opacity-0" : "opacity-100 animate-fade-in"
      }`}
    >
      <div
        className={`relative w-full max-w-sm rounded-2xl surface-card overflow-hidden shadow-2xl shadow-black/60 transition-all duration-200 ${
          leaving ? "scale-95 opacity-0" : "scale-100 opacity-100 animate-scale-in"
        }`}
      >
        {/* Close button */}
        <button type="button"
          onClick={close}
          aria-label={t("ui.close")}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:bg-white/10 hover:text-zinc-300 transition-all duration-200 active:scale-90 z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Slide content — key={step} rimonta il blocco a ogni cambio: il
            contenuto nuovo entra da destra invece di scattare */}
        <div key={step} className="px-6 pt-10 pb-4 text-center animate-step-enter">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-accent-orange/10 flex items-center justify-center mx-auto mb-5">
            <StepIcon className="w-7 h-7 text-accent-orange" />
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-white mb-2">
            {t(STEPS[step].titleKey)}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted leading-relaxed">
            {t(STEPS[step].descKey)}
          </p>
        </div>

        {/* Dots + Navigation */}
        <div className="px-6 pb-5">
          {/* Dots */}
          <div className="flex items-center justify-center gap-1 mb-5">
            {STEPS.map((_, i) => (
              <button type="button"
                key={i}
                onClick={() => setStep(i)}
                aria-label={t("ui.slide", { n: i + 1 })}
                aria-current={i === step ? "step" : undefined}
                className="w-8 h-8 rounded-full flex items-center justify-center"
              >
                <span className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${i === step ? "w-6 bg-accent-orange" : "w-1.5 bg-zinc-600 hover:bg-zinc-500"}`} />
              </button>
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3">
            {step > 0 ? (
              <button type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-all duration-150 active:scale-95"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {t("ui.back")}
              </button>
            ) : (
              <div className="flex-1" />
            )}

            {isLast ? (
              <button type="button"
                onClick={close}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-accent-orange text-white hover:brightness-110 transition-all duration-150 active:scale-95 shadow-lg shadow-accent-orange/20"
              >
                {t("ui.onboardingStart")}
              </button>
            ) : (
              <button type="button"
                onClick={() => setStep((s) => s + 1)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-white bg-white/10 hover:bg-white/20 transition-all duration-150 active:scale-95"
              >
                {t("ui.next")}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Skip */}
        <button type="button"
          onClick={close}
          className="w-full py-2.5 text-xs text-zinc-600 hover:text-muted transition-colors duration-150 border-t border-white/5"
        >
          {t("ui.onboardingSkip")}
        </button>
      </div>
    </div>
  )
}
